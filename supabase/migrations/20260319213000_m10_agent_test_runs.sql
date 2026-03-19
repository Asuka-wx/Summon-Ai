CREATE TABLE agent_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) NOT NULL,
  agent_id UUID REFERENCES agents(id) NOT NULL,
  task_id UUID REFERENCES tasks(id) NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  self_eval BOOLEAN NOT NULL DEFAULT false,
  streaming BOOLEAN NOT NULL DEFAULT false,
  done_signal BOOLEAN NOT NULL DEFAULT false,
  heartbeat BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_test_runs_owner ON agent_test_runs(owner_id, created_at DESC);
CREATE INDEX idx_agent_test_runs_agent ON agent_test_runs(agent_id, created_at DESC);
