CREATE OR REPLACE FUNCTION increment_agent_total_tasks(p_agent_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE agents
  SET total_tasks = total_tasks + 1,
      quality_tasks_since_change = quality_tasks_since_change + 1
  WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
