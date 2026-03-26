-- =====================================================
-- KPI绩效系统数据库表
-- 核心功能：员工效率排行、工序瓶颈分析、产能统计、合格率
-- =====================================================

BEGIN;

-- 1. KPI指标定义表
-- =====================================================
CREATE TABLE IF NOT EXISTS kpi_definitions (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,             -- efficiency/quality/output/cost/delivery
  description TEXT,
  
  -- 计算配置
  calculation_type VARCHAR(50),              -- sum/avg/rate/percentage
  formula TEXT,                              -- 计算公式描述
  data_source VARCHAR(100),                  -- 数据来源表
  
  -- 目标配置
  target_value DECIMAL(10,2),                -- 目标值
  warning_threshold DECIMAL(10,2),           -- 预警阈值
  excellent_threshold DECIMAL(10,2),         -- 优秀阈值
  
  -- 权重配置
  weight DECIMAL(5,2) DEFAULT 1,             -- 权重（用于综合评分）
  
  -- 单位
  unit VARCHAR(20),                          -- %/件/小时/元
  higher_is_better BOOLEAN DEFAULT TRUE,     -- 数值越高越好
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 员工KPI日统计表
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_kpi_daily (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL REFERENCES employees(id),
  date DATE NOT NULL,
  
  -- 产出指标
  total_quantity INT DEFAULT 0,              -- 总完成数量
  qualified_quantity INT DEFAULT 0,          -- 合格数量
  defect_quantity INT DEFAULT 0,             -- 次品数量
  rework_quantity INT DEFAULT 0,             -- 返工数量
  
  -- 时间指标
  work_hours DECIMAL(4,1) DEFAULT 0,         -- 工作小时数
  standard_hours DECIMAL(6,2) DEFAULT 0,     -- 标准工时
  actual_hours DECIMAL(6,2) DEFAULT 0,       -- 实际工时
  overtime_hours DECIMAL(4,1) DEFAULT 0,     -- 加班小时数
  
  -- 效率指标
  efficiency_rate DECIMAL(5,2) DEFAULT 0,    -- 效率% (标准工时/实际工时*100)
  utilization_rate DECIMAL(5,2) DEFAULT 0,   -- 利用率% (实际工时/工作小时*100)
  output_per_hour DECIMAL(6,2) DEFAULT 0,    -- 时均产量
  
  -- 质量指标
  quality_rate DECIMAL(5,2) DEFAULT 0,       -- 合格率%
  defect_rate DECIMAL(5,2) DEFAULT 0,        -- 次品率%
  first_pass_rate DECIMAL(5,2) DEFAULT 0,    -- 一次通过率%
  
  -- 收入指标
  total_earnings DECIMAL(10,2) DEFAULT 0,    -- 当日收入
  
  -- 综合评分
  performance_score DECIMAL(5,2) DEFAULT 0,  -- 综合绩效分
  rank_in_department INT,                    -- 部门排名
  rank_in_factory INT,                       -- 工厂排名
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(employee_id, date)
);

-- 3. 员工KPI月统计表
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_kpi_monthly (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL REFERENCES employees(id),
  year INT NOT NULL,
  month INT NOT NULL,
  
  -- 出勤统计
  work_days INT DEFAULT 0,                   -- 工作天数
  absent_days INT DEFAULT 0,                 -- 缺勤天数
  late_days INT DEFAULT 0,                   -- 迟到天数
  early_leave_days INT DEFAULT 0,            -- 早退天数
  
  -- 产出汇总
  total_quantity INT DEFAULT 0,
  qualified_quantity INT DEFAULT 0,
  defect_quantity INT DEFAULT 0,
  avg_daily_quantity DECIMAL(8,2) DEFAULT 0, -- 日均产量
  
  -- 时间汇总
  total_work_hours DECIMAL(6,1) DEFAULT 0,
  total_overtime_hours DECIMAL(5,1) DEFAULT 0,
  
  -- 效率汇总
  avg_efficiency_rate DECIMAL(5,2) DEFAULT 0,
  avg_quality_rate DECIMAL(5,2) DEFAULT 0,
  avg_output_per_hour DECIMAL(6,2) DEFAULT 0,
  
  -- 对比目标
  target_completion_rate DECIMAL(5,2) DEFAULT 0, -- 目标完成率%
  
  -- 收入汇总
  total_earnings DECIMAL(12,2) DEFAULT 0,
  base_salary DECIMAL(10,2) DEFAULT 0,
  piece_salary DECIMAL(10,2) DEFAULT 0,
  overtime_salary DECIMAL(10,2) DEFAULT 0,
  bonus DECIMAL(10,2) DEFAULT 0,
  deduction DECIMAL(10,2) DEFAULT 0,
  
  -- 综合评分
  performance_score DECIMAL(5,2) DEFAULT 0,
  efficiency_score DECIMAL(5,2) DEFAULT 0,
  quality_score DECIMAL(5,2) DEFAULT 0,
  attendance_score DECIMAL(5,2) DEFAULT 0,
  
  -- 排名
  rank_in_department INT,
  rank_in_factory INT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(employee_id, year, month)
);

-- 4. 产线KPI统计表
-- =====================================================
CREATE TABLE IF NOT EXISTS production_line_kpi (
  id VARCHAR(50) PRIMARY KEY,
  line_id VARCHAR(50) NOT NULL REFERENCES production_lines(id),
  date DATE NOT NULL,
  
  -- 产出指标
  plan_quantity INT DEFAULT 0,               -- 计划产量
  actual_quantity INT DEFAULT 0,             -- 实际产量
  completion_rate DECIMAL(5,2) DEFAULT 0,    -- 完成率%
  
  -- 效率指标
  plan_efficiency DECIMAL(5,2) DEFAULT 0,    -- 计划效率
  actual_efficiency DECIMAL(5,2) DEFAULT 0,  -- 实际效率
  oee DECIMAL(5,2) DEFAULT 0,                -- 设备综合效率
  
  -- 质量指标
  quality_rate DECIMAL(5,2) DEFAULT 0,
  defect_rate DECIMAL(5,2) DEFAULT 0,
  
  -- 人员指标
  total_workers INT DEFAULT 0,               -- 总人数
  avg_efficiency DECIMAL(5,2) DEFAULT 0,     -- 平均效率
  
  -- 时间指标
  work_hours DECIMAL(5,1) DEFAULT 0,         -- 工作时长
  downtime_hours DECIMAL(4,1) DEFAULT 0,     -- 停机时长
  utilization_rate DECIMAL(5,2) DEFAULT 0,   -- 利用率
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(line_id, date)
);

-- 5. 工序瓶颈分析表
-- =====================================================
CREATE TABLE IF NOT EXISTS process_bottleneck (
  id VARCHAR(50) PRIMARY KEY,
  process_id VARCHAR(50) NOT NULL REFERENCES processes(id),
  date DATE NOT NULL,
  
  -- 工序信息
  process_name VARCHAR(100),
  line_id VARCHAR(50),
  
  -- 负载指标
  total_workload DECIMAL(10,2) DEFAULT 0,    -- 总工作量（小时）
  capacity DECIMAL(10,2) DEFAULT 0,          -- 产能（小时）
  utilization_rate DECIMAL(5,2) DEFAULT 0,   -- 利用率%
  
  -- 瓶颈判定
  is_bottleneck BOOLEAN DEFAULT FALSE,       -- 是否瓶颈
  bottleneck_score DECIMAL(5,2) DEFAULT 0,   -- 瓶颈分数
  
  -- 等待时间
  avg_waiting_time DECIMAL(6,2) DEFAULT 0,   -- 平均等待时间（小时）
  max_waiting_time DECIMAL(6,2) DEFAULT 0,   -- 最大等待时间
  
  -- 员工分布
  worker_count INT DEFAULT 0,
  avg_worker_efficiency DECIMAL(5,2) DEFAULT 0,
  
  -- 建议
  recommendation TEXT,                        -- 优化建议
  priority INT DEFAULT 0,                     -- 优先级
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(process_id, date)
);

-- 6. KPI排行榜快照表（用于历史对比）
-- =====================================================
CREATE TABLE IF NOT EXISTS kpi_leaderboard (
  id VARCHAR(50) PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  category VARCHAR(50) NOT NULL,             -- efficiency/quality/output/comprehensive
  period VARCHAR(20) NOT NULL,               -- daily/weekly/monthly
  
  -- 排行数据
  rankings JSONB NOT NULL,                   -- 排行榜数据 [{employee_id, name, score, rank, ...}]
  
  -- 统计信息
  participant_count INT DEFAULT 0,
  avg_score DECIMAL(5,2) DEFAULT 0,
  max_score DECIMAL(5,2) DEFAULT 0,
  min_score DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(snapshot_date, category, period)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_employee_kpi_daily_employee ON employee_kpi_daily(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_kpi_daily_date ON employee_kpi_daily(date);
CREATE INDEX IF NOT EXISTS idx_employee_kpi_monthly_employee ON employee_kpi_monthly(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_kpi_monthly_period ON employee_kpi_monthly(year, month);
CREATE INDEX IF NOT EXISTS idx_production_line_kpi_line ON production_line_kpi(line_id);
CREATE INDEX IF NOT EXISTS idx_production_line_kpi_date ON production_line_kpi(date);
CREATE INDEX IF NOT EXISTS idx_process_bottleneck_process ON process_bottleneck(process_id);
CREATE INDEX IF NOT EXISTS idx_process_bottleneck_date ON process_bottleneck(date);
CREATE INDEX IF NOT EXISTS idx_kpi_leaderboard_date ON kpi_leaderboard(snapshot_date);

-- 插入默认KPI指标定义
INSERT INTO kpi_definitions (id, code, name, category, calculation_type, target_value, warning_threshold, excellent_threshold, weight, unit, higher_is_better) VALUES
('kpi_efficiency', 'EFFICIENCY', '工作效率', 'efficiency', 'percentage', 100, 80, 120, 30, '%', true),
('kpi_quality', 'QUALITY', '产品合格率', 'quality', 'percentage', 98, 95, 99.5, 25, '%', true),
('kpi_output', 'OUTPUT', '日产量', 'output', 'sum', 100, 80, 150, 20, '件', true),
('kpi_attendance', 'ATTENDANCE', '出勤率', 'efficiency', 'percentage', 95, 90, 100, 10, '%', true),
('kpi_overtime', 'OVERTIME', '加班时长', 'efficiency', 'sum', 0, 2, 0, 5, '小时', false),
('kpi_defect', 'DEFECT', '次品率', 'quality', 'percentage', 2, 5, 0.5, 10, '%', false)
ON CONFLICT (id) DO NOTHING;

COMMIT;
