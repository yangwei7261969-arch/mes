-- =====================================================
-- 异常闭环系统数据库表
-- 核心逻辑：异常 → 责任人 → 处理 → 记录 → 分析
-- =====================================================

BEGIN;

-- 1. 异常类型配置表
-- =====================================================
CREATE TABLE IF NOT EXISTS exception_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,                -- 异常名称
  code VARCHAR(50) UNIQUE NOT NULL,          -- 异常编码
  category VARCHAR(50) NOT NULL,             -- 分类：production/quality/material/equipment/outsource
  severity VARCHAR(20) DEFAULT 'warning',    -- 严重程度：info/warning/critical/emergency
  description TEXT,
  
  -- 自动生成规则
  auto_generate BOOLEAN DEFAULT FALSE,       -- 是否自动生成
  trigger_condition JSONB,                   -- 触发条件配置
  
  -- 处理配置
  default_handler_type VARCHAR(50),          -- 默认处理人类型：role/department/employee
  default_handler_id VARCHAR(50),            -- 默认处理人ID
  required_fields JSONB,                     -- 必填字段
  deadline_hours INT DEFAULT 24,             -- 处理时限（小时）
  
  -- 升级规则
  escalation_enabled BOOLEAN DEFAULT FALSE,  -- 是否启用升级
  escalation_hours INT,                      -- 升级时限
  escalation_handler_id VARCHAR(50),         -- 升级处理人
  
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 异常处理人配置表
-- =====================================================
CREATE TABLE IF NOT EXISTS exception_handlers (
  id VARCHAR(50) PRIMARY KEY,
  exception_type_id VARCHAR(50) REFERENCES exception_types(id),
  handler_type VARCHAR(50) NOT NULL,         -- role/department/employee
  handler_id VARCHAR(50) NOT NULL,           -- 对应ID
  handler_name VARCHAR(100),                 -- 处理人名称
  
  -- 处理权限
  can_acknowledge BOOLEAN DEFAULT TRUE,      -- 可以确认
  can_resolve BOOLEAN DEFAULT TRUE,          -- 可以解决
  can_escalate BOOLEAN DEFAULT TRUE,         -- 可以升级
  can_close BOOLEAN DEFAULT FALSE,           -- 可以关闭
  
  -- 通知配置
  notify_email BOOLEAN DEFAULT TRUE,
  notify_sms BOOLEAN DEFAULT FALSE,
  notify_wechat BOOLEAN DEFAULT TRUE,
  
  is_primary BOOLEAN DEFAULT FALSE,          -- 主要处理人
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 异常单主表
-- =====================================================
CREATE TABLE IF NOT EXISTS exceptions (
  id VARCHAR(50) PRIMARY KEY,
  exception_no VARCHAR(50) UNIQUE NOT NULL,  -- 异常单号
  exception_type_id VARCHAR(50) REFERENCES exception_types(id),
  exception_type_code VARCHAR(50),
  exception_type_name VARCHAR(100),
  
  -- 严重程度
  severity VARCHAR(20) DEFAULT 'warning',
  priority INT DEFAULT 0,                    -- 优先级（数值越大越优先）
  
  -- 关联对象
  order_id VARCHAR(50),                      -- 关联订单
  style_id VARCHAR(50),                      -- 关联款式
  process_id VARCHAR(50),                    -- 关联工序
  bundle_id VARCHAR(50),                     -- 关联分扎
  employee_id VARCHAR(50),                   -- 关联员工
  equipment_id VARCHAR(50),                  -- 关联设备
  
  -- 异常内容
  title VARCHAR(200) NOT NULL,               -- 异常标题
  description TEXT,                          -- 异常描述
  source VARCHAR(50),                        -- 来源：auto/manual/system
  
  -- 数值信息
  actual_value DECIMAL(12,2),                -- 实际值
  expected_value DECIMAL(12,2),              -- 期望值
  deviation_value DECIMAL(12,2),             -- 偏差值
  deviation_rate DECIMAL(5,2),               -- 偏差率(%)
  
  -- 处理状态
  status VARCHAR(20) DEFAULT 'open',         -- open/acknowledged/in_progress/resolved/closed/cancelled
  
  -- 处理人
  handler_type VARCHAR(50),
  handler_id VARCHAR(50),
  handler_name VARCHAR(100),
  assigned_at TIMESTAMP,
  
  -- 确认信息
  acknowledged_by VARCHAR(50),
  acknowledged_at TIMESTAMP,
  
  -- 解决信息
  resolved_by VARCHAR(50),
  resolved_at TIMESTAMP,
  resolution TEXT,                           -- 解决方案
  root_cause TEXT,                           -- 根本原因
  preventive_action TEXT,                    -- 预防措施
  
  -- 关闭信息
  closed_by VARCHAR(50),
  closed_at TIMESTAMP,
  close_note TEXT,
  
  -- 时限
  deadline TIMESTAMP,                        -- 处理截止时间
  is_overdue BOOLEAN DEFAULT FALSE,          -- 是否超时
  overdue_hours INT DEFAULT 0,               -- 超时小时数
  
  -- 升级
  escalation_level INT DEFAULT 0,            -- 升级层级
  escalated_at TIMESTAMP,
  escalated_to VARCHAR(50),
  
  -- 评价
  satisfaction_rating INT,                   -- 满意度评分 1-5
  feedback TEXT,
  
  -- 统计
  handle_duration INT,                       -- 处理时长（分钟）
  
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 异常处理记录表（处理过程跟踪）
-- =====================================================
CREATE TABLE IF NOT EXISTS exception_records (
  id VARCHAR(50) PRIMARY KEY,
  exception_id VARCHAR(50) NOT NULL REFERENCES exceptions(id),
  
  -- 操作信息
  action VARCHAR(50) NOT NULL,               -- create/acknowledge/assign/resolve/close/reopen/escalate/comment
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  
  -- 操作人
  operator_id VARCHAR(50),
  operator_name VARCHAR(100),
  
  -- 操作内容
  content TEXT,                              -- 操作说明
  attachments JSONB,                         -- 附件列表
  
  -- 时间
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 异常自动生成规则表
-- =====================================================
CREATE TABLE IF NOT EXISTS exception_rules (
  id VARCHAR(50) PRIMARY KEY,
  rule_name VARCHAR(100) NOT NULL,
  exception_type_id VARCHAR(50) REFERENCES exception_types(id),
  
  -- 触发条件
  trigger_event VARCHAR(50) NOT NULL,        -- 触发事件：scan_timeout/quality_fail/delay/cost_overrun
  condition_field VARCHAR(100),              -- 条件字段
  condition_operator VARCHAR(20),            -- 条件操作符：> < >= <= = != contains
  condition_value VARCHAR(200),              -- 条件值
  
  -- 执行配置
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0,
  
  -- 通知配置
  notify_handler BOOLEAN DEFAULT TRUE,
  notify_creator BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 异常统计汇总表
-- =====================================================
CREATE TABLE IF NOT EXISTS exception_statistics (
  id VARCHAR(50) PRIMARY KEY,
  period_type VARCHAR(20) NOT NULL,          -- daily/weekly/monthly
  period_value VARCHAR(20) NOT NULL,         -- 2024-01, 2024-W01, 2024-01-01
  
  -- 分类统计
  category VARCHAR(50),                      -- 异常分类
  exception_type_id VARCHAR(50),             -- 异常类型
  
  -- 数量统计
  total_count INT DEFAULT 0,                 -- 总数
  open_count INT DEFAULT 0,                  -- 待处理
  in_progress_count INT DEFAULT 0,           -- 处理中
  resolved_count INT DEFAULT 0,              -- 已解决
  closed_count INT DEFAULT 0,                -- 已关闭
  overdue_count INT DEFAULT 0,               -- 超时数
  
  -- 时间统计
  avg_handle_time INT DEFAULT 0,             -- 平均处理时长（分钟）
  max_handle_time INT,                       -- 最长处理时长
  min_handle_time INT,                       -- 最短处理时长
  
  -- 处理人统计
  handler_id VARCHAR(50),
  handler_name VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(period_type, period_value, category, exception_type_id, handler_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_exceptions_type ON exceptions(exception_type_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exceptions(status);
CREATE INDEX IF NOT EXISTS idx_exceptions_order ON exceptions(order_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_handler ON exceptions(handler_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_deadline ON exceptions(deadline);
CREATE INDEX IF NOT EXISTS idx_exceptions_created ON exceptions(created_at);
CREATE INDEX IF NOT EXISTS idx_exception_records_exception ON exception_records(exception_id);
CREATE INDEX IF NOT EXISTS idx_exception_statistics_period ON exception_statistics(period_type, period_value);

-- 插入默认异常类型
INSERT INTO exception_types (id, code, name, category, severity, auto_generate, deadline_hours, description, sort_order) VALUES
-- 生产异常
('et_process_timeout', 'PROCESS_TIMEOUT', '工序超时', 'production', 'warning', true, 4, '工序未在规定时间内完成', 1),
('et_process_skip', 'PROCESS_SKIP', '工序跳过', 'production', 'critical', true, 2, '未按顺序完成工序', 2),
('et_rework', 'REWORK', '返工', 'production', 'warning', false, 8, '产品需要返工', 3),
('et_output_low', 'OUTPUT_LOW', '产量异常', 'production', 'warning', true, 8, '实际产量远低于计划', 4),

-- 质量异常
('et_quality_fail', 'QUALITY_FAIL', '质检不合格', 'quality', 'critical', true, 2, '质检发现严重质量问题', 10),
('et_defect_high', 'DEFECT_HIGH', '次品率高', 'quality', 'warning', true, 4, '次品率超过阈值', 11),
('et_customer_complaint', 'CUSTOMER_COMPLAINT', '客户投诉', 'quality', 'emergency', false, 1, '客户投诉质量问题', 12),

-- 材料异常
('et_material_shortage', 'MATERIAL_SHORTAGE', '材料短缺', 'material', 'critical', true, 2, '生产材料不足', 20),
('et_material_defect', 'MATERIAL_DEFECT', '材料缺陷', 'material', 'warning', false, 4, '材料存在质量问题', 21),
('et_material_wrong', 'MATERIAL_WRONG', '材料错发', 'material', 'critical', false, 2, '领用材料错误', 22),

-- 设备异常
('et_equipment_fault', 'EQUIPMENT_FAULT', '设备故障', 'equipment', 'critical', true, 1, '设备出现故障', 30),
('et_equipment_maintenance', 'EQUIPMENT_MAINTENANCE', '设备保养到期', 'equipment', 'info', true, 24, '设备需要保养', 31),

-- 外发异常
('et_outsource_delay', 'OUTSOURCE_DELAY', '外发延期', 'outsource', 'warning', true, 8, '外发加工延期', 40),
('et_outsource_quality', 'OUTSOURCE_QUALITY', '外发质量问题', 'outsource', 'critical', false, 4, '外发产品质量问题', 41),

-- 扫码异常
('et_scan_duplicate', 'SCAN_DUPLICATE', '重复扫码', 'production', 'warning', true, 2, '同一扎重复扫码', 50),
('et_scan_wrong_process', 'SCAN_WRONG_PROCESS', '工序错误', 'production', 'critical', true, 2, '扫描了错误的工序', 51),
('et_scan_unauthorized', 'SCAN_UNAUTHORIZED', '未授权扫码', 'production', 'warning', false, 2, '无权限进行此工序', 52)
ON CONFLICT (id) DO NOTHING;

-- 插入默认处理规则
INSERT INTO exception_rules (id, rule_name, exception_type_id, trigger_event, condition_field, condition_operator, condition_value) VALUES
('er_timeout_1', '工序超时检测', 'et_process_timeout', 'process_timeout', 'duration_hours', '>', '4'),
('er_quality_1', '次品率检测', 'et_defect_high', 'quality_check', 'defect_rate', '>', '5'),
('er_output_1', '产量异常检测', 'et_output_low', 'daily_output', 'actual_vs_plan', '<', '70'),
('er_delay_1', '外发延期检测', 'et_outsource_delay', 'outsource_delay', 'delay_days', '>', '0'),
('er_scan_1', '重复扫码检测', 'et_scan_duplicate', 'scan_duplicate', 'scan_count', '>', '1')
ON CONFLICT (id) DO NOTHING;

COMMIT;
