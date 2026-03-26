-- ===========================================
-- 服装ERP系统 - 补充创建缺失的数据库表
-- ===========================================

-- 订单明细表
CREATE TABLE IF NOT EXISTS order_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES production_orders(id) ON DELETE CASCADE,
  size VARCHAR(20),
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 订单状态历史
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by VARCHAR(50),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- 裁床记录
CREATE TABLE IF NOT EXISTS cutting_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cutting_order_id UUID REFERENCES cutting_orders(id) ON DELETE CASCADE,
  size VARCHAR(20),
  quantity INTEGER,
  bundle_no VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 尾部处理记录
CREATE TABLE IF NOT EXISTS finishing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  style_no VARCHAR(50),
  quantity INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  process_type VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 库存调整记录
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID,
  adjustment_type VARCHAR(20),
  quantity INTEGER,
  reason TEXT,
  adjusted_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 库存交易记录
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type VARCHAR(20),
  item_id UUID,
  quantity INTEGER,
  from_location VARCHAR(100),
  to_location VARCHAR(100),
  reference_no VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 物料库存
CREATE TABLE IF NOT EXISTS material_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID,
  location VARCHAR(100),
  quantity DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR(20),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 物料分类
CREATE TABLE IF NOT EXISTS material_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  parent_id UUID,
  code VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 预警配置
CREATE TABLE IF NOT EXISTS alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  alert_type VARCHAR(50),
  threshold_value DECIMAL(10,2),
  threshold_unit VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  notify_emails TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 预警记录
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50),
  severity VARCHAR(20),
  title VARCHAR(200),
  message TEXT,
  reference_type VARCHAR(50),
  reference_id UUID,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(50)
);

-- 技术包表
CREATE TABLE IF NOT EXISTS tech_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_pack_no VARCHAR(50) UNIQUE,
  style_no VARCHAR(50),
  style_name VARCHAR(100),
  customer_id UUID,
  season VARCHAR(50),
  category VARCHAR(50),
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  created_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 技术包图片
CREATE TABLE IF NOT EXISTS tech_pack_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_pack_id UUID REFERENCES tech_packs(id) ON DELETE CASCADE,
  image_type VARCHAR(50),
  image_url TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 技术包尺码表
CREATE TABLE IF NOT EXISTS tech_pack_size_chart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_pack_id UUID REFERENCES tech_packs(id) ON DELETE CASCADE,
  size VARCHAR(20),
  measurements JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 技术包BOM
CREATE TABLE IF NOT EXISTS tech_pack_bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_pack_id UUID REFERENCES tech_packs(id) ON DELETE CASCADE,
  material_name VARCHAR(100),
  material_code VARCHAR(50),
  unit VARCHAR(20),
  usage_per_piece DECIMAL(10,4),
  wastage_rate DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 技术包工序
CREATE TABLE IF NOT EXISTS tech_pack_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_pack_id UUID REFERENCES tech_packs(id) ON DELETE CASCADE,
  process_name VARCHAR(100),
  process_code VARCHAR(50),
  department VARCHAR(50),
  standard_time DECIMAL(10,2),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 生产准备任务
CREATE TABLE IF NOT EXISTS production_prep_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID REFERENCES production_orders(id) ON DELETE CASCADE,
  task_type VARCHAR(50),
  task_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  assigned_to VARCHAR(50),
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 二次工艺订单
CREATE TABLE IF NOT EXISTS secondary_process_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(50) UNIQUE,
  production_order_id UUID,
  process_type VARCHAR(50),
  quantity INTEGER,
  unit_price DECIMAL(10,2),
  total_amount DECIMAL(12,2),
  supplier_id UUID,
  status VARCHAR(20) DEFAULT 'pending',
  start_date DATE,
  expected_completion DATE,
  actual_completion DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 设备管理
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_code VARCHAR(50) UNIQUE,
  equipment_name VARCHAR(100),
  equipment_type VARCHAR(50),
  brand VARCHAR(50),
  model VARCHAR(50),
  purchase_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  location VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 质量检查记录
CREATE TABLE IF NOT EXISTS quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_no VARCHAR(50) UNIQUE,
  inspection_type VARCHAR(50),
  reference_type VARCHAR(50),
  reference_id UUID,
  inspector VARCHAR(50),
  inspection_date DATE,
  total_quantity INTEGER,
  pass_quantity INTEGER,
  fail_quantity INTEGER,
  pass_rate DECIMAL(5,2),
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 质量缺陷记录
CREATE TABLE IF NOT EXISTS quality_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES quality_inspections(id) ON DELETE CASCADE,
  defect_type VARCHAR(50),
  defect_location VARCHAR(100),
  quantity INTEGER,
  severity VARCHAR(20),
  cause TEXT,
  solution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 外发加工进度
CREATE TABLE IF NOT EXISTS outsource_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outsource_order_id UUID REFERENCES outsource_orders(id) ON DELETE CASCADE,
  process_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  quantity INTEGER,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 外发质量检查
CREATE TABLE IF NOT EXISTS outsource_quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outsource_order_id UUID REFERENCES outsource_orders(id) ON DELETE CASCADE,
  check_date DATE,
  total_quantity INTEGER,
  pass_quantity INTEGER,
  fail_quantity INTEGER,
  checker VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 工票
CREATE TABLE IF NOT EXISTS work_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no VARCHAR(50) UNIQUE,
  bundle_id UUID REFERENCES cutting_bundles(id),
  process_id UUID,
  worker_id UUID,
  quantity INTEGER,
  wage DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending',
  scan_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 生产排程
CREATE TABLE IF NOT EXISTS production_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_no VARCHAR(50) UNIQUE,
  production_order_id UUID REFERENCES production_orders(id),
  line_id UUID,
  start_date DATE,
  end_date DATE,
  daily_target INTEGER,
  status VARCHAR(20) DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 生产进度追踪
CREATE TABLE IF NOT EXISTS production_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES production_schedules(id),
  tracking_date DATE,
  planned_quantity INTEGER,
  actual_quantity INTEGER,
  defect_quantity INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_order_details_order ON order_details(order_id);
CREATE INDEX IF NOT EXISTS idx_cutting_records_order ON cutting_records(cutting_order_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_tech_packs_style ON tech_packs(style_no);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_type ON quality_inspections(inspection_type);
CREATE INDEX IF NOT EXISTS idx_work_tickets_bundle ON work_tickets(bundle_id);
CREATE INDEX IF NOT EXISTS idx_production_schedules_order ON production_schedules(production_order_id);
