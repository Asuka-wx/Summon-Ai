-- ============================
-- 1. 用户表（不区分买家/卖家）
-- ============================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT UNIQUE,
  google_id TEXT UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  email TEXT,
  bio TEXT,
  wallet_address TEXT,
  payout_wallet TEXT,
  payout_chain TEXT DEFAULT 'base',
  wallet_change_requested_at TIMESTAMPTZ,
  twitter_handle TEXT,
  twitter_verified_at TIMESTAMPTZ,
  twitter_unbind_count INTEGER DEFAULT 0,
  twitter_unbound_at TIMESTAMPTZ,
  github_handle TEXT,
  github_verified_at TIMESTAMPTZ,
  github_unbind_count INTEGER DEFAULT 0,
  github_unbound_at TIMESTAMPTZ,
  is_frozen BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user',
  totp_secret TEXT,
  totp_enabled_at TIMESTAMPTZ,
  locale TEXT DEFAULT 'en',
  notification_preferences JSONB DEFAULT '{"email":true,"in_app":true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 2. Agent 注册表
-- ============================
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  categories TEXT[] NOT NULL,
  supported_languages TEXT[] DEFAULT '{en}',
  price_per_call DECIMAL(10,4) NOT NULL,
  typical_rounds_min INTEGER,
  typical_rounds_max INTEGER,
  api_key_hash TEXT NOT NULL,
  sdk_last_heartbeat TIMESTAMPTZ,
  sdk_version TEXT,
  concurrency_level INTEGER DEFAULT 1,
  max_concurrent INTEGER DEFAULT 1,
  active_tasks INTEGER DEFAULT 0,
  concurrency_upgraded_at TIMESTAMPTZ,
  is_seed BOOLEAN DEFAULT true,
  seed_free_remaining INTEGER DEFAULT 5,
  seed_max_rounds INTEGER DEFAULT 15,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online','offline','busy','retiring','archived')),
  health_score DECIMAL(5,2) DEFAULT 100,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  cancel_rate DECIMAL(5,2) DEFAULT 0,
  fault_rate DECIMAL(5,2) DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,4) DEFAULT 0,
  total_tips DECIMAL(10,4) DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  quality_status TEXT DEFAULT 'normal',
  quality_status_changed_at TIMESTAMPTZ,
  quality_tasks_since_change INTEGER DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 3. Demo 对话表
-- ============================
CREATE TABLE agent_demos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  title TEXT NOT NULL,
  messages JSONB NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- messages JSONB Schema (DemoMessage[]):
-- [{ "role": "user"|"agent", "content": "string (支持 Markdown)" }, ...]
-- 建议每个 Demo 不超过 10 轮

-- ============================
-- 4. 需求广播表
-- ============================
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  prompt TEXT NOT NULL,
  categories TEXT[],
  status TEXT DEFAULT 'bidding' CHECK (status IN ('bidding','selected','expired','no_response','cancelled')),
  selected_agent_id UUID REFERENCES agents(id),
  bid_window_end TIMESTAMPTZ,
  selection_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 5. 竞标表
-- ============================
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID REFERENCES broadcasts(id) NOT NULL,
  agent_id UUID REFERENCES agents(id) NOT NULL,
  confidence TEXT NOT NULL,
  pitch TEXT NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(broadcast_id, agent_id)
);

-- ============================
-- 6. 任务表
-- ============================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID REFERENCES broadcasts(id),
  user_id UUID REFERENCES users(id) NOT NULL,
  agent_id UUID REFERENCES agents(id) NOT NULL,
  session_id TEXT NOT NULL DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'confirming' CHECK (status IN ('confirming','active','paused','completed','cancelled')),
  phase TEXT DEFAULT 'confirmation' CHECK (phase IN ('confirmation','paid','seed')),
  is_seed_task BOOLEAN DEFAULT false,
  is_direct BOOLEAN DEFAULT false,
  is_test BOOLEAN DEFAULT false,
  round_count INTEGER DEFAULT 0,
  free_rounds INTEGER DEFAULT 3,
  paid_rounds INTEGER DEFAULT 0,
  total_charge DECIMAL(10,4) DEFAULT 0,
  platform_fee DECIMAL(10,4) DEFAULT 0,
  locked_price_per_call DECIMAL(18,6),
  seed_max_rounds INTEGER,
  pause_reason TEXT CHECK (pause_reason IN ('idle','disconnect_await','insufficient_balance','await_user')),
  pause_expires_at TIMESTAMPTZ,
  end_reason TEXT CHECK (end_reason IN (
    'user_ended', 'disconnect_ended', 'pause_ended', 'balance_ended',
    'confirmation_cancelled', 'confirmation_disconnect',
    'user_cancelled_before_paid', 'user_cancelled_after_paid', 'agent_offline_24h',
    'balance_expired', 'confirmation_timeout', 'pause_expired', 'agent_retired',
    'user_deleted', 'user_banned', 'consecutive_timeout', 'seed_limit_reached'
  )),
  cancel_reason TEXT CHECK (cancel_reason IN ('ability_mismatch','too_slow','need_changed','other')),
  cancel_reason_text TEXT,
  paused_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  has_report BOOLEAN DEFAULT false,
  consecutive_timeout_count INTEGER DEFAULT 0,
  deletion_warned BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================
-- 7. 对话消息表
-- ============================
CREATE TABLE task_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) NOT NULL,
  round_number INTEGER NOT NULL,
  role TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  content TEXT NOT NULL,
  is_free BOOLEAN DEFAULT false,
  is_fault BOOLEAN DEFAULT false,
  is_round_start BOOLEAN DEFAULT false,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 8. 评价表
-- ============================
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) NOT NULL,
  agent_id UUID REFERENCES agents(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  tip_amount DECIMAL(10,4) DEFAULT 0 CHECK (tip_amount >= 0 AND tip_amount <= 50.00),
  cancel_reason TEXT,
  is_seed_task BOOLEAN DEFAULT false,
  user_weight DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 9. 支付记录表
-- ============================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  round_number INTEGER,
  from_user_id UUID REFERENCES users(id) NOT NULL,
  to_user_id UUID REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL,
  amount DECIMAL(10,4) NOT NULL,
  platform_fee DECIMAL(10,4) DEFAULT 0,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 10. 提现表
-- ============================
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  amount DECIMAL(10,4) NOT NULL,
  fee DECIMAL(10,4) NOT NULL DEFAULT 0.10,
  net_amount DECIMAL(10,4) NOT NULL,
  wallet_address TEXT NOT NULL,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing','completed','failed','stuck')),
  tx_hash TEXT,
  stuck_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- ============================
-- 11. 举报表（双向举报）
-- ============================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) NOT NULL,
  direction TEXT NOT NULL DEFAULT 'demand_to_agent',
  agent_id UUID REFERENCES agents(id),
  reported_user_id UUID REFERENCES users(id),
  task_id UUID REFERENCES tasks(id) NOT NULL,
  message_id UUID REFERENCES task_messages(id),
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved_action','resolved_dismissed')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (
    (direction = 'demand_to_agent' AND agent_id IS NOT NULL) OR
    (direction = 'supplier_to_demand')
  )
);

-- ============================
-- 12. 关注表
-- ============================
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  target_agent_id UUID REFERENCES agents(id),
  target_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_agent_id),
  UNIQUE(user_id, target_user_id),
  CHECK (
    (target_agent_id IS NOT NULL AND target_user_id IS NULL) OR
    (target_agent_id IS NULL AND target_user_id IS NOT NULL)
  )
);

-- ============================
-- 13. 徽章定义表
-- ============================
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL
);

-- ============================
-- 14. 用户-徽章关联表
-- ============================
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  badge_id UUID REFERENCES badges(id) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- ============================
-- 15. 通知表
-- ============================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 16. 种子任务防刷表
-- ============================
CREATE TABLE seed_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  agent_id UUID REFERENCES agents(id) NOT NULL,
  task_id UUID REFERENCES tasks(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, agent_id)
);

-- ============================
-- 17. 用户余额表
-- ============================
CREATE TABLE user_balances (
  user_id UUID REFERENCES users(id) NOT NULL,
  chain TEXT NOT NULL DEFAULT 'base',
  balance DECIMAL(18,6) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, chain)
);

-- ============================
-- 18. 任务加密密钥表
-- ============================
CREATE TABLE task_encryption_keys (
  task_id UUID REFERENCES tasks(id) PRIMARY KEY,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- 19. 用户数据删除请求表
-- ============================
CREATE TABLE data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================
-- 20. 审计日志表
-- ============================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id),
  user_id UUID REFERENCES users(id),
  agent_id UUID REFERENCES agents(id),
  round_number INTEGER,
  amount DECIMAL(18,6) NOT NULL,
  balance_before DECIMAL(18,6),
  balance_after DECIMAL(18,6),
  platform_fee DECIMAL(10,4) DEFAULT 0,
  tx_hash TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 21. 平台配置表
-- ============================
CREATE TABLE platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 22. 管理员告警表
-- ============================
CREATE TABLE admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  payload JSONB,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- ============================
-- 23. 用户-Agent 使用追踪表
-- ============================
CREATE TABLE user_agent_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  agent_id UUID REFERENCES agents(id) NOT NULL,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  use_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, agent_id)
);

-- ============================
-- 24. Cron Job 心跳监控表
-- ============================
CREATE TABLE cron_heartbeats (
  job_name TEXT PRIMARY KEY,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  expected_interval INTERVAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 25. Agent 每日统计表
-- ============================
CREATE TABLE agent_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  online_seconds INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  avg_rating_today DECIMAL(3,2),
  health_score_snapshot DECIMAL(5,2),
  revenue_today DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, stat_date)
);

-- ============================
-- 26. 排行榜快照表
-- ============================
CREATE TABLE ranking_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  board_type TEXT NOT NULL,
  category TEXT,
  rankings JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(period, period_start, board_type, category)
);

-- ============================
-- 27. 用户反馈表
-- ============================
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('bug','feature','other')),
  description TEXT NOT NULL,
  screenshot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO platform_config (key, value, description) VALUES
('agent_categories',
 '["加密/DeFi","链上分析","智能合约","Web3 开发","量化交易","Meme 研究","内容创作","数据分析","编程辅助","翻译/语言","通用助手","其他"]',
 'Agent 注册可选类别，管理员可通过 Admin 后台增删'),
('platform_fee_rate',
 '{"rate": 0.00}',
 'MVP 免佣金（rate=0），settle_task RPC 读取此值计算平台抽成'),
('min_withdrawal_amount',
 '{"amount": 5.00}',
 '最低提现金额 5 USDC'),
('withdrawal_fee',
 '{"amount": 0.10}',
 '提现手续费 (USDC)');

-- agents 索引
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_categories ON agents USING GIN(categories);
CREATE INDEX idx_agents_owner ON agents(owner_id);
CREATE INDEX idx_agents_health ON agents(health_score);
CREATE INDEX idx_agents_seed ON agents(is_seed);
CREATE INDEX idx_agents_avg_rating ON agents(avg_rating DESC);

-- tasks 索引
CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_agent ON tasks(agent_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_completed_at ON tasks(completed_at);

-- task_messages 索引
CREATE INDEX idx_messages_task ON task_messages(task_id);
CREATE INDEX idx_messages_round ON task_messages(task_id, round_number);

-- ratings / payments / withdrawals 索引
CREATE INDEX idx_ratings_agent ON ratings(agent_id);
CREATE INDEX idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE UNIQUE INDEX idx_payments_task_settlement ON payments(task_id) WHERE type = 'task_payment';
CREATE UNIQUE INDEX idx_payments_task_tip ON payments(task_id) WHERE type = 'tip';
CREATE UNIQUE INDEX idx_payments_tx_hash ON payments(tx_hash) WHERE tx_hash IS NOT NULL;

-- follows / notifications / seed_usage 索引
CREATE INDEX idx_follows_user ON follows(user_id);
CREATE INDEX idx_follows_agent ON follows(target_agent_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_seed_usage ON seed_usage(user_id, agent_id);

-- agent_demos 索引
CREATE INDEX idx_demos_agent ON agent_demos(agent_id);

-- users 部分唯一索引
CREATE UNIQUE INDEX idx_users_twitter ON users(twitter_handle) WHERE twitter_handle IS NOT NULL;
CREATE UNIQUE INDEX idx_users_github_handle ON users(github_handle) WHERE github_handle IS NOT NULL;

-- broadcasts 索引
CREATE INDEX idx_broadcasts_status ON broadcasts(status);

-- user_balances 索引
CREATE INDEX idx_user_balances_chain ON user_balances(chain);

-- audit_logs 索引
CREATE INDEX idx_audit_logs_task ON audit_logs(task_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- user_agent_usage 索引
CREATE INDEX idx_usage_user ON user_agent_usage(user_id);
CREATE INDEX idx_usage_agent ON user_agent_usage(agent_id);

-- admin_alerts 索引
CREATE INDEX idx_admin_alerts_type ON admin_alerts(alert_type);
CREATE INDEX idx_admin_alerts_status ON admin_alerts(status);
CREATE INDEX idx_admin_alerts_created ON admin_alerts(created_at);

-- agent_daily_stats 索引
CREATE INDEX idx_daily_stats_agent ON agent_daily_stats(agent_id);
CREATE INDEX idx_daily_stats_date ON agent_daily_stats(stat_date);

-- feedback 索引
CREATE INDEX idx_feedback_type ON feedback(type);
CREATE INDEX idx_feedback_created ON feedback(created_at);

-- 文本搜索索引（展厅/排行榜模糊搜索用）
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_agents_name_trgm ON agents USING GIN(name gin_trgm_ops);
CREATE INDEX idx_agents_tagline_trgm ON agents USING GIN(tagline gin_trgm_ops);

CREATE OR REPLACE FUNCTION record_round(
  p_task_id UUID,
  p_round_number INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_task RECORD; v_amount DECIMAL(18,6); v_balance DECIMAL(18,6);
  v_new_total DECIMAL(18,6); v_remaining INTEGER;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;

  -- 幂等：已记录的回合不重复处理
  IF v_task.round_count >= p_round_number THEN
    RETURN '{"status":"already_recorded"}'::jsonb;
  END IF;

  -- 金额计算（种子任务 or 免费 Agent → 0）
  IF v_task.is_seed_task OR v_task.locked_price_per_call = 0 THEN
    v_amount := 0;
  ELSE
    v_amount := v_task.locked_price_per_call;
  END IF;

  v_new_total := v_task.total_charge + v_amount;

  -- 更新任务统计（仅记录，不扣费）
  UPDATE tasks SET
    round_count = p_round_number,
    paid_rounds = paid_rounds + (CASE WHEN v_amount > 0 THEN 1 ELSE 0 END),
    total_charge = v_new_total,
    last_activity_at = now()
  WHERE id = p_task_id;

  -- 确认阶段信号：免费轮次用完 → 通知前端渲染确认卡片
  IF v_task.phase = 'confirmation' AND p_round_number >= v_task.free_rounds THEN
    RETURN jsonb_build_object(
      'status', 'confirmation_needed',
      'round_count', p_round_number,
      'free_rounds', v_task.free_rounds
    );
  END IF;

  -- 种子任务轮次上限信号
  IF v_task.is_seed_task AND p_round_number >= COALESCE(v_task.seed_max_rounds, 15) THEN
    RETURN jsonb_build_object(
      'status', 'seed_limit_reached',
      'round_count', p_round_number,
      'seed_max_rounds', COALESCE(v_task.seed_max_rounds, 15)
    );
  END IF;

  -- 余额充足性预检（不扣费，仅预判下一回合）
  IF v_amount > 0 THEN
    SELECT COALESCE(balance, 0) INTO v_balance FROM user_balances
      WHERE user_id = v_task.user_id AND chain = 'base';
    v_remaining := FLOOR((v_balance - v_new_total) / v_task.locked_price_per_call);

    IF v_balance < v_new_total + v_task.locked_price_per_call THEN
      UPDATE tasks SET
        status = 'paused',
        pause_reason = 'insufficient_balance',
        paused_at = now(),
        pause_expires_at = now() + INTERVAL '10 minutes'
      WHERE id = p_task_id AND status = 'active';

      RETURN jsonb_build_object(
        'status', 'recorded_insufficient',
        'amount', v_amount, 'total_charge', v_new_total,
        'balance', v_balance, 'rounds_remaining', GREATEST(v_remaining, 0));
    END IF;

    RETURN jsonb_build_object(
      'status', 'recorded', 'amount', v_amount,
      'total_charge', v_new_total, 'balance', v_balance,
      'rounds_remaining', v_remaining);
  END IF;

  RETURN jsonb_build_object('status', 'recorded', 'amount', 0, 'total_charge', v_new_total);
END;
$$ LANGUAGE plpgsql;

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
BEGIN
  -- 1. 锁定任务行
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id FOR UPDATE;

  -- 2. 幂等：已结算则跳过
  IF EXISTS (SELECT 1 FROM payments
    WHERE task_id = p_task_id AND type = 'task_payment'
  ) THEN RETURN '{"status":"already_settled"}'::jsonb; END IF;

  -- 3. 总费用 = record_round 累计的 total_charge
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

  -- 4. 需求方余额扣减（支持部分结算）
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

  -- 5. 供给方收入入账
  IF v_supplier_income > 0 THEN
    INSERT INTO user_balances (user_id, chain, balance)
    VALUES (v_owner_id, 'base', v_supplier_income)
    ON CONFLICT (user_id, chain)
    DO UPDATE SET balance = user_balances.balance + v_supplier_income, updated_at = now();
    UPDATE agents SET total_earnings = total_earnings + v_supplier_income
      WHERE id = v_task.agent_id;
  END IF;

  -- 6. 写 payments（一条 = 整个任务结算）
  INSERT INTO payments (task_id, from_user_id, to_user_id, type, amount, platform_fee, status)
  VALUES (p_task_id, v_task.user_id, v_owner_id,
    'task_payment', v_total, v_fee, 'completed');

  -- 7. 更新任务佣金
  UPDATE tasks SET platform_fee = v_fee WHERE id = p_task_id;

  -- 8. 审计日志
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

  RETURN jsonb_build_object(
    'status', CASE WHEN v_is_partial THEN 'settled_partial' ELSE 'settled' END,
    'total', v_total, 'fee', v_fee,
    'supplier_income', v_supplier_income, 'balance_after', v_bal_after,
    'is_partial', v_is_partial,
    'original_total', v_original_total,
    'shortfall', CASE WHEN v_is_partial THEN v_original_total - v_total ELSE 0 END);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_tip(
  p_task_id UUID,
  p_user_id UUID,
  p_tip_amount DECIMAL(10,4)
) RETURNS JSONB AS $$
DECLARE
  v_task RECORD; v_owner_id UUID;
  v_bal_before DECIMAL(18,6); v_bal_after DECIMAL(18,6);
BEGIN
  -- 1. 参数校验
  IF p_tip_amount <= 0 OR p_tip_amount > 50.00 THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'INVALID_TIP_AMOUNT');
  END IF;

  -- 2. 幂等：每任务仅可打赏一次
  IF EXISTS (SELECT 1 FROM payments WHERE task_id = p_task_id AND type = 'tip') THEN
    RETURN '{"status":"already_tipped"}'::jsonb;
  END IF;

  -- 3. 获取任务信息 + Agent owner
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF v_task IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'TASK_NOT_FOUND');
  END IF;
  SELECT owner_id INTO v_owner_id FROM agents WHERE id = v_task.agent_id;

  -- 4. 需求方余额扣减
  SELECT balance INTO v_bal_before FROM user_balances
    WHERE user_id = p_user_id AND chain = 'base' FOR UPDATE;
  IF v_bal_before IS NULL OR v_bal_before < p_tip_amount THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'INSUFFICIENT_BALANCE');
  END IF;
  UPDATE user_balances SET balance = balance - p_tip_amount, updated_at = now()
    WHERE user_id = p_user_id AND chain = 'base';
  v_bal_after := v_bal_before - p_tip_amount;

  -- 5. 供给方打赏入账（100% 归供给方，无平台抽成）
  INSERT INTO user_balances (user_id, chain, balance)
  VALUES (v_owner_id, 'base', p_tip_amount)
  ON CONFLICT (user_id, chain)
  DO UPDATE SET balance = user_balances.balance + p_tip_amount, updated_at = now();
  UPDATE agents SET total_tips = total_tips + p_tip_amount WHERE id = v_task.agent_id;

  -- 6. 写 payments 记录
  INSERT INTO payments (task_id, from_user_id, to_user_id, type, amount, platform_fee, status)
  VALUES (p_task_id, p_user_id, v_owner_id, 'tip', p_tip_amount, 0, 'completed');

  -- 7. 更新 ratings 冗余字段
  UPDATE ratings SET tip_amount = p_tip_amount WHERE task_id = p_task_id;

  -- 8. 审计日志
  INSERT INTO audit_logs (event_type, task_id, user_id, agent_id,
    amount, balance_before, balance_after, metadata)
  VALUES ('tip_sent', p_task_id, p_user_id, v_task.agent_id,
    p_tip_amount, v_bal_before, v_bal_after,
    jsonb_build_object('tip_amount', p_tip_amount, 'agent_owner', v_owner_id));

  RETURN jsonb_build_object(
    'status', 'tipped', 'tip_amount', p_tip_amount,
    'balance_after', v_bal_after);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION upsert_online_seconds(
  p_agent_id UUID, p_stat_date DATE, p_seconds INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO agent_daily_stats (agent_id, stat_date, online_seconds)
  VALUES (p_agent_id, p_stat_date, p_seconds)
  ON CONFLICT (agent_id, stat_date)
  DO UPDATE SET online_seconds = agent_daily_stats.online_seconds + p_seconds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
