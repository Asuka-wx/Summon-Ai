ALTER TABLE users ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_code_id UUID;

CREATE INDEX IF NOT EXISTS idx_users_activated ON users(is_activated);

CREATE TABLE invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  batch_name TEXT,
  max_uses INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  note TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX idx_invitation_codes_batch ON invitation_codes(batch_name);
CREATE INDEX idx_invitation_codes_active ON invitation_codes(is_active) WHERE is_active = true;

CREATE TABLE invitation_code_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES invitation_codes(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(code_id, user_id)
);

CREATE INDEX idx_code_usages_user ON invitation_code_usages(user_id);
CREATE INDEX idx_code_usages_code ON invitation_code_usages(code_id);

ALTER TABLE users
  ADD CONSTRAINT users_invitation_code_id_fkey
  FOREIGN KEY (invitation_code_id) REFERENCES invitation_codes(id);

CREATE OR REPLACE FUNCTION redeem_invitation_code(
  p_user_id UUID,
  p_code TEXT
) RETURNS JSONB AS $$
DECLARE
  v_code RECORD;
  v_user RECORD;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id;
  IF v_user.is_activated THEN
    RETURN jsonb_build_object('status', 'already_activated');
  END IF;

  SELECT * INTO v_code FROM invitation_codes
    WHERE code = UPPER(TRIM(p_code))
    FOR UPDATE;

  IF v_code IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'CODE_NOT_FOUND',
      'message', 'Invalid invitation code');
  END IF;

  IF NOT v_code.is_active THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'CODE_DEACTIVATED',
      'message', 'This code has been deactivated');
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'CODE_EXPIRED',
      'message', 'This code has expired');
  END IF;

  IF v_code.use_count >= v_code.max_uses THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'CODE_EXHAUSTED',
      'message', 'This code has reached its usage limit');
  END IF;

  IF EXISTS (
    SELECT 1 FROM invitation_code_usages
    WHERE code_id = v_code.id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'ALREADY_USED',
      'message', 'You have already used this code');
  END IF;

  UPDATE users SET
    is_activated = true,
    activated_at = now(),
    invitation_code_id = v_code.id
  WHERE id = p_user_id;

  INSERT INTO invitation_code_usages (code_id, user_id)
  VALUES (v_code.id, p_user_id);

  UPDATE invitation_codes SET
    use_count = use_count + 1
  WHERE id = v_code.id;

  RETURN jsonb_build_object(
    'status', 'activated',
    'code_id', v_code.id,
    'batch_name', v_code.batch_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_invitation_codes(
  p_admin_id UUID,
  p_count INTEGER,
  p_batch_name TEXT DEFAULT NULL,
  p_max_uses INTEGER DEFAULT 1,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_note TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_codes TEXT[] := '{}';
  v_code TEXT;
  v_i INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_admin_id AND role = 'admin') THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'UNAUTHORIZED');
  END IF;

  IF p_count < 1 OR p_count > 500 THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'INVALID_COUNT',
      'message', 'Count must be between 1 and 500');
  END IF;

  FOR v_i IN 1..p_count LOOP
    v_code := 'SA-' || UPPER(SUBSTRING(md5(gen_random_uuid()::TEXT) FOR 8));

    WHILE EXISTS (SELECT 1 FROM invitation_codes WHERE code = v_code) LOOP
      v_code := 'SA-' || UPPER(SUBSTRING(md5(gen_random_uuid()::TEXT) FOR 8));
    END LOOP;

    INSERT INTO invitation_codes (code, batch_name, max_uses, expires_at, note, created_by)
    VALUES (v_code, p_batch_name, p_max_uses, p_expires_at, p_note, p_admin_id);

    v_codes := array_append(v_codes, v_code);
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'created',
    'count', p_count,
    'batch_name', p_batch_name,
    'codes', to_jsonb(v_codes)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

INSERT INTO platform_config (key, value, updated_at)
VALUES ('invitation_code_enabled', 'true', now())
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION toggle_invitation_code_system(
  p_admin_id UUID,
  p_enabled BOOLEAN
) RETURNS JSONB AS $$
DECLARE
  v_affected INTEGER := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_admin_id AND role = 'admin') THEN
    RETURN jsonb_build_object('status', 'error', 'code', 'UNAUTHORIZED');
  END IF;

  INSERT INTO platform_config (key, value, updated_at)
  VALUES ('invitation_code_enabled', p_enabled::TEXT, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  IF NOT p_enabled THEN
    UPDATE users SET is_activated = true, activated_at = now()
    WHERE is_activated = false;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
  END IF;

  INSERT INTO audit_logs (event_type, user_id, amount, metadata)
  VALUES (
    'invitation_code_system_toggled',
    p_admin_id,
    0,
    jsonb_build_object('enabled', p_enabled, 'bulk_activated_count', v_affected)
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'enabled', p_enabled,
    'bulk_activated_users', v_affected
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_user_activation()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM platform_config
    WHERE key = 'invitation_code_enabled'
    AND value = 'false'
  ) THEN
    NEW.is_activated := true;
    NEW.activated_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_activate_user ON users;

CREATE TRIGGER trg_auto_activate_user
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_activation();

CREATE OR REPLACE FUNCTION public.is_user_activated()
RETURNS BOOLEAN AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM platform_config
    WHERE key = 'invitation_code_enabled'
    AND value = 'false'
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND is_activated = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_code_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on invitation_codes"
  ON invitation_codes FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin full access on code_usages"
  ON invitation_code_usages FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users read own code_usages"
  ON invitation_code_usages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "activated_users_only_broadcasts"
  ON broadcasts AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_user_activated())
  WITH CHECK (public.is_user_activated());

CREATE POLICY "activated_users_only_bids"
  ON bids AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_user_activated())
  WITH CHECK (public.is_user_activated());

CREATE POLICY "activated_users_only_tasks"
  ON tasks AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_user_activated())
  WITH CHECK (public.is_user_activated());

CREATE POLICY "activated_users_only_task_messages"
  ON task_messages AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_user_activated())
  WITH CHECK (public.is_user_activated());

CREATE POLICY "activated_users_only_ratings"
  ON ratings AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_user_activated())
  WITH CHECK (public.is_user_activated());

CREATE POLICY "activated_users_only_payments"
  ON payments AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_user_activated())
  WITH CHECK (public.is_user_activated());

CREATE POLICY "activated_users_only_withdrawals"
  ON withdrawals AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_user_activated())
  WITH CHECK (public.is_user_activated());

CREATE POLICY "activated_users_only_reports"
  ON reports AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_user_activated())
  WITH CHECK (public.is_user_activated());

CREATE POLICY "activated_users_only_follows"
  ON follows AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_user_activated())
  WITH CHECK (public.is_user_activated());

CREATE POLICY "activated_users_only_notifications"
  ON notifications AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_user_activated())
  WITH CHECK (public.is_user_activated());

CREATE POLICY "activated_users_only_seed_usage"
  ON seed_usage AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_user_activated())
  WITH CHECK (public.is_user_activated());

CREATE POLICY "activated_users_only_user_balances"
  ON user_balances AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_user_activated())
  WITH CHECK (public.is_user_activated());

CREATE POLICY "activated_users_only_user_agent_usage"
  ON user_agent_usage AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_user_activated())
  WITH CHECK (public.is_user_activated());

CREATE POLICY "activated_users_only_feedback"
  ON feedback AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_user_activated())
  WITH CHECK (public.is_user_activated());
