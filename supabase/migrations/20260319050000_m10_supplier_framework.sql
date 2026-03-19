INSERT INTO platform_config (key, value, description, updated_at)
VALUES
(
  'quality_control',
  '{
    "downgrade_weeks": 3,
    "downgrade_min_tasks": 10,
    "downgrade_health_threshold": 60,
    "upgrade_weeks_hidden_to_demoted": 2,
    "upgrade_weeks_demoted_to_warned": 2,
    "upgrade_weeks_warned_to_normal": 1,
    "upgrade_min_tasks": 5,
    "upgrade_health_threshold": 80,
    "auto_pause_health_threshold": 60,
    "newbie_protection_tasks": 5,
    "small_sample_base_score": 80,
    "small_sample_min_tasks": 5,
    "failure_rate_threshold": 0.20
  }'::jsonb,
  'Quality control thresholds for supplier framework.',
  now()
),
(
  'display_thresholds',
  '{
    "showcase_min_agents_per_section": 3,
    "showcase_hot_min_completed_tasks": 1,
    "showcase_top_min_ratings": 5,
    "showcase_rising_min_ratings": 5,
    "leaderboard_min_entries": 3,
    "leaderboard_overall_min_tasks": 5,
    "leaderboard_category_min_tasks": 3,
    "leaderboard_rookie_max_days": 30
  }'::jsonb,
  'Display thresholds for showcase and leaderboard sections.',
  now()
),
(
  'maintenance_mode',
  '{"enabled": false}'::jsonb,
  'Supplier platform maintenance mode toggle.',
  now()
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO badges (code, name, description, icon, category)
VALUES
  ('pioneer', '先驱者', '前 50 名上架的供给方。', 'flag', 'supplier'),
  ('rising_star', '新星崛起', '上架 7 天内完成 10 个任务。', 'sparkles', 'supplier'),
  ('well_rated', '好评如潮', '评分达到 4.5 且评价数不少于 20。', 'star', 'supplier'),
  ('zero_fault', '零故障', '连续 50 个任务无故障。', 'shield-check', 'supplier'),
  ('ironman', '铁人', '连续 30 天每天在线不少于 8 小时。', 'dumbbell', 'supplier'),
  ('precise_match', '精准匹配', '确认转付费转化率达到 80%。', 'target', 'supplier'),
  ('repeat_king', '回头客之王', '直达任务占比达到 50%。', 'repeat', 'supplier'),
  ('evolving', '持续进化', '连续 4 周健康度上升。', 'trending-up', 'supplier'),
  ('hot_creator', '热门创作者', '单月任务量进入平台 Top 10。', 'flame', 'supplier'),
  ('thousand_club', '千元户', '累计收入达到 $1,000。', 'wallet', 'supplier'),
  ('versatile', '多面手', '3 个以上类别评分稳定在 4.0 以上。', 'layers', 'supplier'),
  ('diamond', '钻石 Agent', '评分、任务数与健康度均达到顶级标准。', 'gem', 'supplier'),
  ('top_regular', '榜首常客', '累计 4 次进入周榜 Top 3。', 'crown', 'supplier'),
  ('ten_thousand_club', '万元户', '累计收入达到 $10,000。', 'trophy', 'supplier'),
  ('first_task', '新人报到', '完成首次任务。', 'rocket', 'demand'),
  ('veteran', '老司机', '累计完成 20 个任务。', 'medal', 'demand'),
  ('quality_reviewer', '优质评价者', '提交 10 条带文字评价。', 'message-square', 'demand'),
  ('scout', '伯乐', '完成 5 次种子任务带文字评价。', 'search', 'demand'),
  ('big_spender', '土豪', '累计充值达到 $100。', 'coins', 'demand'),
  ('tipper', '慰问大使', '累计打赏达到 10 次。', 'gift', 'demand')
ON CONFLICT (code) DO NOTHING;
