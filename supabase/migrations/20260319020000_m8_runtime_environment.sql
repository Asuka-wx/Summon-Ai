CREATE OR REPLACE FUNCTION settle_task(
  p_task_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_task RECORD; v_total DECIMAL(18,6); v_fee DECIMAL(18,6);
  v_supplier_income DECIMAL(18,6);
  v_bal_before DECIMAL(18,6); v_bal_after DECIMAL(18,6);
  v_owner_id UUID;
  v_original_total DECIMAL(18,6);
  v_is_partial BOOLEAN := false;
  v_level INTEGER;
  v_total_completed INTEGER;
  v_health DECIMAL(5,2);
  v_fault DECIMAL(5,2);
  v_next_threshold INTEGER;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;

  IF EXISTS (SELECT 1 FROM payments
    WHERE task_id = p_task_id AND type = 'task_payment'
  ) THEN RETURN '{"status":"already_settled"}'::jsonb; END IF;

  v_total := v_task.total_charge;
  IF v_task.is_seed_task OR v_task.locked_price_per_call = 0 OR v_total = 0 THEN
    v_total := 0; v_fee := 0; v_supplier_income := 0;
  ELSE
    v_fee := ROUND(v_total * COALESCE(
      (SELECT (value->>'rate')::DECIMAL FROM platform_config WHERE key = 'platform_fee_rate'), 0
    ), 6);
    v_supplier_income := v_total - v_fee;
  END IF;

  SELECT owner_id INTO v_owner_id FROM agents WHERE id = v_task.agent_id;

  v_original_total := v_total;
  IF v_total > 0 THEN
    SELECT balance INTO v_bal_before FROM user_balances
      WHERE user_id = v_task.user_id AND chain = 'base' FOR UPDATE;
    IF v_bal_before < v_total THEN
      v_is_partial := true;
      v_total := v_bal_before;
      v_fee := ROUND(v_total * COALESCE(
        (SELECT (value->>'rate')::DECIMAL FROM platform_config WHERE key = 'platform_fee_rate'), 0
      ), 6);
      v_supplier_income := v_total - v_fee;
    END IF;
    UPDATE user_balances SET balance = balance - v_total, updated_at = now()
      WHERE user_id = v_task.user_id AND chain = 'base';
    v_bal_after := v_bal_before - v_total;
  ELSE
    v_bal_before := 0; v_bal_after := 0; v_supplier_income := 0;
  END IF;

  IF v_supplier_income > 0 THEN
    INSERT INTO user_balances (user_id, chain, balance)
    VALUES (v_owner_id, 'base', v_supplier_income)
    ON CONFLICT (user_id, chain)
    DO UPDATE SET balance = user_balances.balance + v_supplier_income, updated_at = now();
    UPDATE agents SET total_earnings = total_earnings + v_supplier_income
      WHERE id = v_task.agent_id;
  END IF;

  INSERT INTO payments (task_id, from_user_id, to_user_id, type, amount, platform_fee, status)
  VALUES (p_task_id, v_task.user_id, v_owner_id,
    'task_payment', v_total, v_fee, 'completed');

  UPDATE tasks SET platform_fee = v_fee WHERE id = p_task_id;

  INSERT INTO audit_logs (event_type, task_id, user_id, agent_id,
    amount, balance_before, balance_after, platform_fee, metadata)
  VALUES ('settle_task', p_task_id, v_task.user_id, v_task.agent_id,
    v_total, v_bal_before, v_bal_after, v_fee,
    jsonb_build_object(
      'paid_rounds', v_task.paid_rounds,
      'supplier_income', v_supplier_income,
      'is_partial', v_is_partial,
      'original_total', v_original_total,
      'shortfall', CASE WHEN v_is_partial THEN v_original_total - v_total ELSE 0 END
    ));

  SELECT concurrency_level, health_score, fault_rate
    INTO v_level, v_health, v_fault
    FROM agents WHERE id = v_task.agent_id;

  SELECT COUNT(*) INTO v_total_completed
    FROM tasks
    WHERE agent_id = v_task.agent_id
      AND status = 'completed';

  v_next_threshold := CASE v_level
    WHEN 1 THEN 5  WHEN 2 THEN 15
    WHEN 3 THEN 30 WHEN 4 THEN 50
    ELSE NULL END;

  IF v_next_threshold IS NOT NULL
     AND v_total_completed >= v_next_threshold
     AND v_health >= 80
     AND v_fault  < 0.10
  THEN
    UPDATE agents
      SET concurrency_level = v_level + 1,
          concurrency_upgraded_at = now()
      WHERE id = v_task.agent_id;

    INSERT INTO notifications (user_id, type, title, metadata)
      SELECT owner_id, 'concurrency_upgraded',
             'Concurrency upgraded to Level ' || (v_level + 1),
             jsonb_build_object('agent_id', v_task.agent_id, 'new_level', v_level + 1)
      FROM agents WHERE id = v_task.agent_id;
  END IF;

  RETURN jsonb_build_object(
    'status', CASE WHEN v_is_partial THEN 'settled_partial' ELSE 'settled' END,
    'total', v_total, 'fee', v_fee,
    'supplier_income', v_supplier_income, 'balance_after', v_bal_after,
    'is_partial', v_is_partial,
    'original_total', v_original_total,
    'shortfall', CASE WHEN v_is_partial THEN v_original_total - v_total ELSE 0 END);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_retiring_reactivation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'retiring' AND NEW.status IN ('online', 'offline', 'busy') THEN
    RAISE EXCEPTION 'retiring agents cannot return to active states';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_retiring_reactivation ON agents;

CREATE TRIGGER trg_prevent_retiring_reactivation
BEFORE UPDATE ON agents
FOR EACH ROW
EXECUTE FUNCTION prevent_retiring_reactivation();
