-- =====================================================
-- 利润系统数据库表
-- 核心功能：订单成本核算、利润分析、客户利润统计
-- =====================================================

BEGIN;

-- 1. 订单成本明细表
-- =====================================================
CREATE TABLE IF NOT EXISTS order_costs (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL REFERENCES production_orders(id),
  
  -- 收入
  order_amount DECIMAL(12,2) DEFAULT 0,        -- 订单总金额
  
  -- 材料成本
  material_cost DECIMAL(12,2) DEFAULT 0,       -- 面料成本
  accessory_cost DECIMAL(12,2) DEFAULT 0,      -- 辅料成本
  material_loss_cost DECIMAL(12,2) DEFAULT 0,  -- 材料损耗成本
  
  -- 人工成本
  labor_cost DECIMAL(12,2) DEFAULT 0,          -- 直接人工
  indirect_labor_cost DECIMAL(12,2) DEFAULT 0, -- 间接人工（管理分摊）
  
  -- 外发成本
  outsource_cost DECIMAL(12,2) DEFAULT 0,      -- 外发加工费
  craft_cost DECIMAL(12,2) DEFAULT 0,          -- 二次工艺费
  
  -- 其他成本
  shipping_cost DECIMAL(12,2) DEFAULT 0,       -- 运输费
  packaging_cost DECIMAL(12,2) DEFAULT 0,      -- 包装费
  other_cost DECIMAL(12,2) DEFAULT 0,          -- 其他费用
  overhead_cost DECIMAL(12,2) DEFAULT 0,       -- 制造费用分摊
  
  -- 汇总
  total_cost DECIMAL(12,2) DEFAULT 0,          -- 总成本
  gross_profit DECIMAL(12,2) DEFAULT 0,        -- 毛利润
  profit_rate DECIMAL(5,2) DEFAULT 0,          -- 利润率(%)
  
  -- 数量
  quantity INT DEFAULT 0,                      -- 订单数量
  unit_cost DECIMAL(10,2) DEFAULT 0,           -- 单件成本
  unit_profit DECIMAL(10,2) DEFAULT 0,         -- 单件利润
  
  -- 状态
  cost_status VARCHAR(20) DEFAULT 'draft',     -- draft/calculated/confirmed
  calculated_at TIMESTAMP,                     -- 核算时间
  confirmed_at TIMESTAMP,                      -- 确认时间
  confirmed_by VARCHAR(50),                    -- 确认人
  
  -- 备注
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(order_id)
);

-- 2. 成本明细流水表（记录每一笔成本）
-- =====================================================
CREATE TABLE IF NOT EXISTS cost_transactions (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL REFERENCES production_orders(id),
  cost_type VARCHAR(50) NOT NULL,              -- material/labor/outsource/shipping/other
  cost_category VARCHAR(100),                  -- 分类名称
  amount DECIMAL(12,2) NOT NULL,               -- 金额
  quantity DECIMAL(10,2),                      -- 数量
  unit_price DECIMAL(10,2),                    -- 单价
  
  -- 关联信息
  reference_type VARCHAR(50),                  -- 关联类型：material_out/work_ticket/outsource/shipping
  reference_id VARCHAR(50),                    -- 关联ID
  
  -- 时间和来源
  transaction_date DATE NOT NULL,              -- 发生日期
  source VARCHAR(100),                         -- 来源说明
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 款式成本标准表（标准成本模板）
-- =====================================================
CREATE TABLE IF NOT EXISTS style_cost_standards (
  id VARCHAR(50) PRIMARY KEY,
  style_id VARCHAR(50) NOT NULL REFERENCES styles(id),
  
  -- 标准材料成本
  standard_material_cost DECIMAL(10,2) DEFAULT 0,   -- 标准材料成本/件
  standard_material_usage DECIMAL(10,4) DEFAULT 0,  -- 标准用量
  
  -- 标准工时
  standard_labor_hours DECIMAL(8,2) DEFAULT 0,      -- 标准工时/件
  standard_labor_cost DECIMAL(10,2) DEFAULT 0,      -- 标准人工成本/件
  
  -- 标准外发成本
  standard_outsource_cost DECIMAL(10,2) DEFAULT 0,  -- 标准外发成本/件
  
  -- 标准其他成本
  standard_other_cost DECIMAL(10,2) DEFAULT 0,      -- 标准其他成本/件
  
  -- 总标准成本
  standard_total_cost DECIMAL(10,2) DEFAULT 0,      -- 标准总成本/件
  standard_profit_margin DECIMAL(5,2) DEFAULT 30,   -- 目标利润率(%)
  suggested_price DECIMAL(10,2) DEFAULT 0,          -- 建议售价
  
  -- 版本管理
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  effective_date DATE,
  expiry_date DATE,
  
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(style_id, version)
);

-- 4. 客户利润汇总表
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_profit_summary (
  id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL REFERENCES customers(id),
  period_type VARCHAR(20) NOT NULL,            -- daily/weekly/monthly/yearly
  period_value VARCHAR(20) NOT NULL,           -- 2024-01, 2024-W01, 2024-01-01
  
  -- 订单统计
  total_orders INT DEFAULT 0,                  -- 总订单数
  completed_orders INT DEFAULT 0,              -- 完成订单数
  total_quantity INT DEFAULT 0,                -- 总数量
  
  -- 金额统计
  total_revenue DECIMAL(14,2) DEFAULT 0,       -- 总收入
  total_cost DECIMAL(14,2) DEFAULT 0,          -- 总成本
  total_profit DECIMAL(14,2) DEFAULT 0,        -- 总利润
  avg_profit_rate DECIMAL(5,2) DEFAULT 0,      -- 平均利润率
  
  -- 成本明细
  total_material_cost DECIMAL(14,2) DEFAULT 0,
  total_labor_cost DECIMAL(14,2) DEFAULT 0,
  total_outsource_cost DECIMAL(14,2) DEFAULT 0,
  total_other_cost DECIMAL(14,2) DEFAULT 0,
  
  -- 质量指标
  avg_quality_rate DECIMAL(5,2) DEFAULT 0,     -- 平均合格率
  total_defect_quantity INT DEFAULT 0,         -- 总次品数
  
  -- 交付指标
  on_time_rate DECIMAL(5,2) DEFAULT 0,         -- 准时交付率
  avg_delay_days DECIMAL(5,2) DEFAULT 0,       -- 平均延期天数
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(customer_id, period_type, period_value)
);

-- 5. 款式利润汇总表
-- =====================================================
CREATE TABLE IF NOT EXISTS style_profit_summary (
  id VARCHAR(50) PRIMARY KEY,
  style_id VARCHAR(50) NOT NULL REFERENCES styles(id),
  period_type VARCHAR(20) NOT NULL,
  period_value VARCHAR(20) NOT NULL,
  
  -- 订单统计
  total_orders INT DEFAULT 0,
  total_quantity INT DEFAULT 0,
  
  -- 金额统计
  total_revenue DECIMAL(14,2) DEFAULT 0,
  total_cost DECIMAL(14,2) DEFAULT 0,
  total_profit DECIMAL(14,2) DEFAULT 0,
  avg_profit_rate DECIMAL(5,2) DEFAULT 0,
  
  -- 成本明细
  avg_unit_cost DECIMAL(10,2) DEFAULT 0,
  avg_unit_profit DECIMAL(10,2) DEFAULT 0,
  
  -- 对比标准
  cost_variance DECIMAL(10,2) DEFAULT 0,       -- 成本差异
  cost_variance_rate DECIMAL(5,2) DEFAULT 0,   -- 成本差异率
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(style_id, period_type, period_value)
);

-- 6. 利润预警表
-- =====================================================
CREATE TABLE IF NOT EXISTS profit_alerts (
  id VARCHAR(50) PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,             -- low_profit/cost_overrun/loss_order
  severity VARCHAR(20) DEFAULT 'warning',      -- info/warning/critical
  
  -- 关联对象
  order_id VARCHAR(50) REFERENCES production_orders(id),
  style_id VARCHAR(50) REFERENCES styles(id),
  customer_id VARCHAR(50) REFERENCES customers(id),
  
  -- 预警内容
  title VARCHAR(200) NOT NULL,
  message TEXT,
  
  -- 数值
  actual_value DECIMAL(12,2),
  threshold_value DECIMAL(12,2),
  variance_value DECIMAL(12,2),
  variance_rate DECIMAL(5,2),
  
  -- 状态
  status VARCHAR(20) DEFAULT 'active',         -- active/acknowledged/resolved/ignored
  acknowledged_by VARCHAR(50),
  acknowledged_at TIMESTAMP,
  resolved_by VARCHAR(50),
  resolved_at TIMESTAMP,
  resolution_note TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_order_costs_order ON order_costs(order_id);
CREATE INDEX IF NOT EXISTS idx_cost_transactions_order ON cost_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_cost_transactions_type ON cost_transactions(cost_type);
CREATE INDEX IF NOT EXISTS idx_cost_transactions_date ON cost_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_customer_profit_customer ON customer_profit_summary(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_profit_period ON customer_profit_summary(period_type, period_value);
CREATE INDEX IF NOT EXISTS idx_style_profit_style ON style_profit_summary(style_id);
CREATE INDEX IF NOT EXISTS idx_style_profit_period ON style_profit_summary(period_type, period_value);
CREATE INDEX IF NOT EXISTS idx_profit_alerts_status ON profit_alerts(status);
CREATE INDEX IF NOT EXISTS idx_profit_alerts_type ON profit_alerts(alert_type);

COMMIT;
