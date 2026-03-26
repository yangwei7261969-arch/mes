-- =====================================================
-- 服装生产管理系统 - 数据库初始化脚本
-- =====================================================

-- 1. 用户与角色表
-- =====================================================

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(50),
  role_id VARCHAR(50) REFERENCES roles(id),
  department VARCHAR(100),
  position VARCHAR(100),
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 客户与供应商表
-- =====================================================

-- 客户表
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE,
  contact_person VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  country VARCHAR(100) DEFAULT '中国',
  credit_level VARCHAR(20) DEFAULT 'normal', -- excellent, good, normal, poor
  payment_terms VARCHAR(100),
  bank_name VARCHAR(100),
  bank_account VARCHAR(100),
  tax_number VARCHAR(100),
  remark TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 供应商表
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE,
  type VARCHAR(50), -- material, outsource, both
  contact_person VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  credit_level VARCHAR(20) DEFAULT 'normal',
  payment_terms VARCHAR(100),
  bank_name VARCHAR(100),
  bank_account VARCHAR(100),
  bank_branch VARCHAR(100),
  account_name VARCHAR(100),
  tax_number VARCHAR(100),
  lead_time_days INTEGER DEFAULT 7,
  min_order_amount DECIMAL(12,2) DEFAULT 0,
  remark TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  rating DECIMAL(3,2) DEFAULT 5.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 物料与库存表
-- =====================================================

-- 物料分类表
CREATE TABLE IF NOT EXISTS material_categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE,
  parent_id VARCHAR(50) REFERENCES material_categories(id),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 物料表（面料、辅料等）
CREATE TABLE IF NOT EXISTS materials (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE,
  category_id VARCHAR(50) REFERENCES material_categories(id),
  type VARCHAR(50), -- fabric, accessory, packaging
  unit VARCHAR(20) DEFAULT '米',
  color VARCHAR(50),
  specification VARCHAR(200),
  width DECIMAL(10,2), -- 幅宽
  weight DECIMAL(10,2), -- 克重
  composition VARCHAR(200), -- 成分
  supplier_id VARCHAR(50) REFERENCES suppliers(id),
  unit_price DECIMAL(12,2) DEFAULT 0,
  safety_stock DECIMAL(12,2) DEFAULT 0,
  max_stock DECIMAL(12,2),
  min_order_qty DECIMAL(12,2) DEFAULT 0,
  lead_time_days INTEGER DEFAULT 7,
  current_stock DECIMAL(12,2) DEFAULT 0,
  locked_stock DECIMAL(12,2) DEFAULT 0,
  warehouse_location VARCHAR(100),
  image_url VARCHAR(500),
  remark TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 库存表
CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(50) PRIMARY KEY,
  material_id VARCHAR(50) REFERENCES materials(id),
  warehouse VARCHAR(100) DEFAULT '主仓库',
  location VARCHAR(100),
  batch_number VARCHAR(100),
  quantity DECIMAL(12,2) DEFAULT 0,
  locked_quantity DECIMAL(12,2) DEFAULT 0,
  unit VARCHAR(20),
  status VARCHAR(20) DEFAULT 'normal', -- normal, locked, damaged
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(material_id, warehouse, batch_number)
);

-- 库存出入记录
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id VARCHAR(50) PRIMARY KEY,
  transaction_no VARCHAR(100) UNIQUE,
  material_id VARCHAR(50) REFERENCES materials(id),
  type VARCHAR(20) NOT NULL, -- in, out, transfer, adjust
  quantity DECIMAL(12,2) NOT NULL,
  before_quantity DECIMAL(12,2),
  after_quantity DECIMAL(12,2),
  unit VARCHAR(20),
  unit_price DECIMAL(12,2),
  total_amount DECIMAL(12,2),
  warehouse VARCHAR(100),
  batch_number VARCHAR(100),
  related_order VARCHAR(100),
  related_type VARCHAR(50), -- purchase, production, shipment, adjustment
  operator VARCHAR(100),
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 产品与款式表
-- =====================================================

-- 产品款式表
CREATE TABLE IF NOT EXISTS styles (
  id VARCHAR(50) PRIMARY KEY,
  style_no VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  season VARCHAR(50),
  year INTEGER,
  color VARCHAR(100),
  size_range VARCHAR(200), -- S,M,L,XL,XXL
  description TEXT,
  image_url VARCHAR(500),
  sketch_url VARCHAR(500),
  base_price DECIMAL(12,2) DEFAULT 0,
  cost_price DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 产品BOM表
CREATE TABLE IF NOT EXISTS style_boms (
  id VARCHAR(50) PRIMARY KEY,
  style_id VARCHAR(50) REFERENCES styles(id),
  material_id VARCHAR(50) REFERENCES materials(id),
  usage_per_piece DECIMAL(10,4) NOT NULL,
  unit VARCHAR(20),
  waste_rate DECIMAL(5,2) DEFAULT 0,
  position VARCHAR(100),
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 生产订单表
-- =====================================================

-- 生产订单主表
CREATE TABLE IF NOT EXISTS production_orders (
  id VARCHAR(50) PRIMARY KEY,
  order_no VARCHAR(100) UNIQUE NOT NULL,
  customer_id VARCHAR(50) REFERENCES customers(id),
  style_id VARCHAR(50) REFERENCES styles(id),
  style_no VARCHAR(100),
  style_name VARCHAR(200),
  color VARCHAR(100),
  total_quantity INTEGER NOT NULL,
  size_breakdown JSONB, -- {"S": 100, "M": 200, "L": 100}
  unit_price DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  order_date DATE,
  delivery_date DATE,
  actual_delivery_date DATE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, in_progress, completed, cancelled, delayed
  progress DECIMAL(5,2) DEFAULT 0,
  priority VARCHAR(20) DEFAULT 'normal', -- urgent, high, normal, low
  production_line_id VARCHAR(50),
  remark TEXT,
  created_by VARCHAR(100),
  confirmed_by VARCHAR(100),
  confirmed_at TIMESTAMP,
  completed_by VARCHAR(100),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单明细表
CREATE TABLE IF NOT EXISTS order_details (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) REFERENCES production_orders(id),
  size VARCHAR(20),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2),
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 生产线与工序表
-- =====================================================

-- 生产线表
CREATE TABLE IF NOT EXISTS production_lines (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE,
  type VARCHAR(50), -- cutting, sewing, ironing, packing
  capacity_per_day INTEGER DEFAULT 0,
  efficiency DECIMAL(5,2) DEFAULT 100,
  manager VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active', -- active, maintenance, inactive
  location VARCHAR(100),
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 工序定义表
CREATE TABLE IF NOT EXISTS processes (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE,
  category VARCHAR(50), -- cutting, sewing, ironing, packing, inspection
  sequence INTEGER DEFAULT 0,
  standard_time DECIMAL(10,2), -- 标准工时（分钟）
  standard_rate DECIMAL(12,2) DEFAULT 0, -- 标准单价
  description TEXT,
  equipment_required VARCHAR(200),
  skill_level VARCHAR(20), -- junior, middle, senior
  is_quality_point BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 工序流程表（产品工艺路线）
CREATE TABLE IF NOT EXISTS style_processes (
  id VARCHAR(50) PRIMARY KEY,
  style_id VARCHAR(50) REFERENCES styles(id),
  process_id VARCHAR(50) REFERENCES processes(id),
  sequence INTEGER DEFAULT 0,
  standard_time DECIMAL(10,2),
  standard_rate DECIMAL(12,2),
  is_required BOOLEAN DEFAULT TRUE,
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(style_id, process_id)
);

-- 7. 裁床管理表
-- =====================================================

-- 裁床记录表
CREATE TABLE IF NOT EXISTS cutting_records (
  id VARCHAR(50) PRIMARY KEY,
  cutting_no VARCHAR(100) UNIQUE NOT NULL,
  order_id VARCHAR(50) REFERENCES production_orders(id),
  order_no VARCHAR(100),
  style_id VARCHAR(50) REFERENCES styles(id),
  style_no VARCHAR(100),
  color VARCHAR(100),
  material_id VARCHAR(50) REFERENCES materials(id),
  material_name VARCHAR(200),
  material_usage DECIMAL(12,2),
  layer_count INTEGER DEFAULT 0,
  marker_length DECIMAL(10,2),
  marker_efficiency DECIMAL(5,2),
  total_pieces INTEGER DEFAULT 0,
  cutting_date DATE,
  cutter VARCHAR(100),
  cutting_table VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending', -- pending, cutting, completed
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 裁床分扎表
CREATE TABLE IF NOT EXISTS cutting_bundles (
  id VARCHAR(50) PRIMARY KEY,
  bundle_no VARCHAR(100) UNIQUE NOT NULL,
  cutting_id VARCHAR(50) REFERENCES cutting_records(id),
  cutting_no VARCHAR(100),
  order_id VARCHAR(50) REFERENCES production_orders(id),
  order_no VARCHAR(100),
  size VARCHAR(20),
  color VARCHAR(100),
  quantity INTEGER NOT NULL,
  layer_from INTEGER,
  layer_to INTEGER,
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_production, completed
  current_process VARCHAR(100),
  current_location VARCHAR(100),
  barcode VARCHAR(100),
  qrcode VARCHAR(500),
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. 工序追踪表
-- =====================================================

-- 工票表
CREATE TABLE IF NOT EXISTS work_tickets (
  id VARCHAR(50) PRIMARY KEY,
  ticket_no VARCHAR(100) UNIQUE NOT NULL,
  bundle_id VARCHAR(50) REFERENCES cutting_bundles(id),
  bundle_no VARCHAR(100),
  order_id VARCHAR(50) REFERENCES production_orders(id),
  order_no VARCHAR(100),
  process_id VARCHAR(50) REFERENCES processes(id),
  process_name VARCHAR(100),
  employee_id VARCHAR(50),
  employee_name VARCHAR(100),
  quantity INTEGER NOT NULL,
  completed_quantity INTEGER DEFAULT 0,
  defect_quantity INTEGER DEFAULT 0,
  unit_price DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  barcode VARCHAR(100),
  qrcode VARCHAR(500),
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 工序追踪记录表
CREATE TABLE IF NOT EXISTS process_tracking (
  id VARCHAR(50) PRIMARY KEY,
  tracking_no VARCHAR(100) UNIQUE,
  bundle_id VARCHAR(50) REFERENCES cutting_bundles(id),
  bundle_no VARCHAR(100),
  order_id VARCHAR(50) REFERENCES production_orders(id),
  order_no VARCHAR(100),
  process_id VARCHAR(50) REFERENCES processes(id),
  process_name VARCHAR(100),
  employee_id VARCHAR(50),
  employee_name VARCHAR(100),
  production_line_id VARCHAR(50),
  input_quantity INTEGER,
  output_quantity INTEGER DEFAULT 0,
  defect_quantity INTEGER DEFAULT 0,
  rework_quantity INTEGER DEFAULT 0,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  work_hours DECIMAL(10,2),
  efficiency DECIMAL(5,2),
  status VARCHAR(20) DEFAULT 'pending',
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. 外发管理表
-- =====================================================

-- 外发供应商表
CREATE TABLE IF NOT EXISTS outsource_suppliers (
  id VARCHAR(50) PRIMARY KEY,
  supplier_id VARCHAR(50) REFERENCES suppliers(id),
  process_types JSONB, -- 可外发的工序类型
  lead_time_days INTEGER DEFAULT 7,
  quality_rate DECIMAL(5,2) DEFAULT 98,
  on_time_rate DECIMAL(5,2) DEFAULT 95,
  rating DECIMAL(3,2) DEFAULT 5.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 外发记录表
CREATE TABLE IF NOT EXISTS bundle_outsource (
  id VARCHAR(50) PRIMARY KEY,
  outsource_no VARCHAR(100) UNIQUE NOT NULL,
  bundle_id VARCHAR(50) REFERENCES cutting_bundles(id),
  bundle_no VARCHAR(100),
  order_id VARCHAR(50) REFERENCES production_orders(id),
  order_no VARCHAR(100),
  supplier_id VARCHAR(50) REFERENCES suppliers(id),
  supplier_name VARCHAR(200),
  process_id VARCHAR(50) REFERENCES processes(id),
  process_name VARCHAR(100),
  send_quantity INTEGER NOT NULL,
  return_quantity INTEGER DEFAULT 0,
  defect_quantity INTEGER DEFAULT 0,
  unit_price DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  send_date DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, partial_returned, returned
  sender VARCHAR(100),
  receiver VARCHAR(100),
  quality_status VARCHAR(20), -- qualified, partial_qualified, unqualified
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. 质量管理表
-- =====================================================

-- 质检标准表
CREATE TABLE IF NOT EXISTS quality_standards (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50), -- fabric, cutting, sewing, ironing, packing, final
  process_id VARCHAR(50) REFERENCES processes(id),
  inspection_items JSONB, -- 检验项目
  acceptance_criteria TEXT,
  sample_size INTEGER,
  aql_level VARCHAR(20), -- AQL水平
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 质检记录表
CREATE TABLE IF NOT EXISTS quality_inspections (
  id VARCHAR(50) PRIMARY KEY,
  inspection_no VARCHAR(100) UNIQUE NOT NULL,
  order_id VARCHAR(50) REFERENCES production_orders(id),
  order_no VARCHAR(100),
  bundle_id VARCHAR(50) REFERENCES cutting_bundles(id),
  bundle_no VARCHAR(100),
  process_id VARCHAR(50) REFERENCES processes(id),
  process_name VARCHAR(100),
  inspection_type VARCHAR(50), -- first_piece, in_process, final, random
  inspector VARCHAR(100),
  inspection_date DATE,
  sample_quantity INTEGER,
  pass_quantity INTEGER DEFAULT 0,
  defect_quantity INTEGER DEFAULT 0,
  defect_rate DECIMAL(5,2) DEFAULT 0,
  result VARCHAR(20), -- pass, fail, conditional_pass
  defect_details JSONB,
  rectification_method TEXT,
  rectification_status VARCHAR(20), -- pending, in_progress, completed
  rectifier VARCHAR(100),
  rectified_at TIMESTAMP,
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 缺陷记录表
CREATE TABLE IF NOT EXISTS quality_defects (
  id VARCHAR(50) PRIMARY KEY,
  inspection_id VARCHAR(50) REFERENCES quality_inspections(id),
  defect_type VARCHAR(100),
  defect_position VARCHAR(100),
  quantity INTEGER DEFAULT 1,
  severity VARCHAR(20), -- critical, major, minor
  cause VARCHAR(200),
  solution TEXT,
  status VARCHAR(20) DEFAULT 'open', -- open, fixed, closed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. 发货管理表
-- =====================================================

-- 发货记录表
CREATE TABLE IF NOT EXISTS shipments (
  id VARCHAR(50) PRIMARY KEY,
  shipment_no VARCHAR(100) UNIQUE NOT NULL,
  order_id VARCHAR(50) REFERENCES production_orders(id),
  order_no VARCHAR(100),
  customer_id VARCHAR(50) REFERENCES customers(id),
  customer_name VARCHAR(200),
  total_quantity INTEGER NOT NULL,
  total_boxes INTEGER DEFAULT 0,
  total_weight DECIMAL(12,2),
  shipping_method VARCHAR(50),
  carrier VARCHAR(100),
  tracking_no VARCHAR(100),
  shipping_address TEXT,
  contact_person VARCHAR(100),
  contact_phone VARCHAR(50),
  planned_date DATE,
  actual_date DATE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, packed, shipped, delivered
  shipper VARCHAR(100),
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 发货明细表
CREATE TABLE IF NOT EXISTS shipment_details (
  id VARCHAR(50) PRIMARY KEY,
  shipment_id VARCHAR(50) REFERENCES shipments(id),
  order_id VARCHAR(50) REFERENCES production_orders(id),
  style_no VARCHAR(100),
  color VARCHAR(100),
  size VARCHAR(20),
  quantity INTEGER NOT NULL,
  box_count INTEGER DEFAULT 0,
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. 设备管理表
-- =====================================================

-- 设备表
CREATE TABLE IF NOT EXISTS equipment (
  id VARCHAR(50) PRIMARY KEY,
  equipment_no VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50), -- sewing_machine, cutting_machine, iron, etc.
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  production_line_id VARCHAR(50) REFERENCES production_lines(id),
  purchase_date DATE,
  purchase_price DECIMAL(12,2),
  warranty_months INTEGER,
  status VARCHAR(20) DEFAULT 'normal', -- normal, maintenance, repair, scrapped
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  daily_capacity INTEGER,
  efficiency DECIMAL(5,2) DEFAULT 100,
  operator VARCHAR(100),
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 设备维护记录表
CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id VARCHAR(50) PRIMARY KEY,
  equipment_id VARCHAR(50) REFERENCES equipment(id),
  maintenance_type VARCHAR(50), -- routine, repair, upgrade
  maintenance_date DATE,
  description TEXT,
  parts_replaced TEXT,
  cost DECIMAL(12,2) DEFAULT 0,
  technician VARCHAR(100),
  next_maintenance_date DATE,
  status VARCHAR(20) DEFAULT 'completed',
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. 员工管理表
-- =====================================================

-- 员工表
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(50) PRIMARY KEY,
  employee_no VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  gender VARCHAR(10),
  birth_date DATE,
  id_card VARCHAR(20),
  phone VARCHAR(50),
  email VARCHAR(100),
  department VARCHAR(100),
  position VARCHAR(100),
  skill_level VARCHAR(20),
  skill_types JSONB, -- 技能类型
  production_line_id VARCHAR(50) REFERENCES production_lines(id),
  hire_date DATE,
  leave_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- active, leave, resigned
  base_salary DECIMAL(12,2) DEFAULT 0,
  piece_rate DECIMAL(12,2) DEFAULT 0,
  bank_name VARCHAR(100),
  bank_account VARCHAR(100),
  address TEXT,
  emergency_contact VARCHAR(100),
  emergency_phone VARCHAR(50),
  photo_url VARCHAR(500),
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 考勤记录表
CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) REFERENCES employees(id),
  employee_no VARCHAR(100),
  employee_name VARCHAR(100),
  attendance_date DATE,
  check_in_time TIME,
  check_out_time TIME,
  work_hours DECIMAL(10,2),
  overtime_hours DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'normal', -- normal, late, early_leave, absent, leave
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, attendance_date)
);

-- 工资记录表
CREATE TABLE IF NOT EXISTS salary_records (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) REFERENCES employees(id),
  employee_no VARCHAR(100),
  employee_name VARCHAR(100),
  year INTEGER,
  month INTEGER,
  base_salary DECIMAL(12,2) DEFAULT 0,
  piece_salary DECIMAL(12,2) DEFAULT 0,
  overtime_salary DECIMAL(12,2) DEFAULT 0,
  bonus DECIMAL(12,2) DEFAULT 0,
  deduction DECIMAL(12,2) DEFAULT 0,
  total_salary DECIMAL(12,2) DEFAULT 0,
  work_days INTEGER DEFAULT 0,
  overtime_hours DECIMAL(10,2) DEFAULT 0,
  piece_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, paid
  paid_date DATE,
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, year, month)
);

-- 14. 财务管理表
-- =====================================================

-- 账单表
CREATE TABLE IF NOT EXISTS bills (
  id VARCHAR(50) PRIMARY KEY,
  bill_no VARCHAR(100) UNIQUE NOT NULL,
  bill_type VARCHAR(50) NOT NULL, -- receivable, payable
  category VARCHAR(50), -- order, material, salary, other
  related_id VARCHAR(100),
  related_no VARCHAR(100),
  customer_id VARCHAR(50) REFERENCES customers(id),
  supplier_id VARCHAR(50) REFERENCES suppliers(id),
  amount DECIMAL(14,2) NOT NULL,
  paid_amount DECIMAL(14,2) DEFAULT 0,
  due_date DATE,
  payment_date DATE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, partial, paid, overdue
  payment_method VARCHAR(50),
  invoice_no VARCHAR(100),
  remark TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 付款记录表
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(50) PRIMARY KEY,
  payment_no VARCHAR(100) UNIQUE NOT NULL,
  bill_id VARCHAR(50) REFERENCES bills(id),
  bill_no VARCHAR(100),
  amount DECIMAL(14,2) NOT NULL,
  payment_date DATE,
  payment_method VARCHAR(50),
  bank_account VARCHAR(100),
  payer VARCHAR(100),
  receiver VARCHAR(100),
  voucher_no VARCHAR(100),
  remark TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. 二次工艺表
-- =====================================================

-- 二次工艺类型表
CREATE TABLE IF NOT EXISTS secondary_processes (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE,
  category VARCHAR(50), -- embroidery, printing, washing, coating, etc.
  description TEXT,
  unit VARCHAR(20),
  unit_price DECIMAL(12,2) DEFAULT 0,
  lead_time_days INTEGER DEFAULT 3,
  is_outsource BOOLEAN DEFAULT FALSE,
  supplier_id VARCHAR(50) REFERENCES suppliers(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 二次工艺加工单
CREATE TABLE IF NOT EXISTS secondary_process_orders (
  id VARCHAR(50) PRIMARY KEY,
  order_no VARCHAR(100) UNIQUE NOT NULL,
  order_id VARCHAR(50) REFERENCES production_orders(id),
  process_id VARCHAR(50) REFERENCES secondary_processes(id),
  process_name VARCHAR(100),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  supplier_id VARCHAR(50) REFERENCES suppliers(id),
  supplier_name VARCHAR(200),
  send_date DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, completed
  quality_status VARCHAR(20),
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. 通知系统表
-- =====================================================

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  type VARCHAR(50) NOT NULL, -- shipping, overdue, inventory, quality, production, payment, system
  level VARCHAR(20) DEFAULT 'info', -- critical, warning, info
  title VARCHAR(200) NOT NULL,
  content TEXT,
  detail TEXT,
  related_order VARCHAR(100),
  related_page VARCHAR(200),
  is_read BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'unread', -- unread, read, handled
  handled_at TIMESTAMP,
  handled_by VARCHAR(100),
  action VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 通知规则表
CREATE TABLE IF NOT EXISTS notification_rules (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  condition VARCHAR(200),
  threshold DECIMAL(10,2),
  unit VARCHAR(20),
  notify_methods JSONB, -- ['system', 'email', 'sms']
  recipients JSONB, -- ['采购部', '生产主管']
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. 系统配置表
-- =====================================================

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
  id VARCHAR(50) PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  category VARCHAR(50),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  user_name VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100),
  target_type VARCHAR(100),
  target_id VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. 索引创建
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_orders_customer ON production_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_delivery_date ON production_orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_cutting_bundles_order ON cutting_bundles(order_id);
CREATE INDEX IF NOT EXISTS idx_cutting_bundles_status ON cutting_bundles(status);
CREATE INDEX IF NOT EXISTS idx_process_tracking_order ON process_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_bundle_outsource_status ON bundle_outsource(status);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_order ON quality_inspections(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_material ON inventory_transactions(material_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 19. 视图创建
-- =====================================================

-- 订单进度视图
CREATE OR REPLACE VIEW v_order_progress AS
SELECT 
  po.id,
  po.order_no,
  po.customer_id,
  c.name as customer_name,
  po.style_no,
  po.style_name,
  po.total_quantity,
  po.delivery_date,
  po.status,
  po.progress,
  COUNT(DISTINCT cb.id) as bundle_count,
  SUM(cb.quantity) as total_cut_quantity,
  COUNT(DISTINCT pt.id) as process_count,
  SUM(pt.output_quantity) as total_output
FROM production_orders po
LEFT JOIN customers c ON po.customer_id = c.id
LEFT JOIN cutting_bundles cb ON po.id = cb.order_id
LEFT JOIN process_tracking pt ON po.id = pt.order_id
GROUP BY po.id, po.order_no, po.customer_id, c.name, po.style_no, po.style_name, 
         po.total_quantity, po.delivery_date, po.status, po.progress;

-- 库存预警视图
CREATE OR REPLACE VIEW v_inventory_alert AS
SELECT 
  m.id,
  m.code,
  m.name,
  m.current_stock,
  m.safety_stock,
  m.unit,
  m.supplier_id,
  s.name as supplier_name,
  CASE 
    WHEN m.current_stock <= 0 THEN 'out_of_stock'
    WHEN m.current_stock < m.safety_stock * 0.5 THEN 'critical'
    WHEN m.current_stock < m.safety_stock THEN 'warning'
    ELSE 'normal'
  END as alert_level
FROM materials m
LEFT JOIN suppliers s ON m.supplier_id = s.id
WHERE m.current_stock < m.safety_stock;

-- 生产效率视图
CREATE OR REPLACE VIEW v_production_efficiency AS
SELECT 
  pl.id,
  pl.name as line_name,
  DATE(pt.created_at) as work_date,
  COUNT(DISTINCT pt.id) as tracking_count,
  SUM(pt.output_quantity) as total_output,
  SUM(pt.defect_quantity) as total_defect,
  AVG(pt.efficiency) as avg_efficiency
FROM production_lines pl
LEFT JOIN process_tracking pt ON pl.id = pt.production_line_id
GROUP BY pl.id, pl.name, DATE(pt.created_at);

COMMIT;
