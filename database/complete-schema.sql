-- =====================================================
-- 完整数据库表结构补充
-- 包含所有API需要的表
-- =====================================================

-- ==========================================
-- 1. 用户与权限相关表
-- ==========================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  avatar VARCHAR(255),
  department VARCHAR(100),
  role_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id VARCHAR(50) NOT NULL,
  role_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- 权限表
CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(module, action)
);

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  role_id VARCHAR(50) NOT NULL,
  permission_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- 用户权限表
CREATE TABLE IF NOT EXISTS user_permissions (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id VARCHAR(50) NOT NULL,
  permission_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- 用户部门表
CREATE TABLE IF NOT EXISTS user_departments (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id VARCHAR(50) NOT NULL,
  department_id VARCHAR(50) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 用户数据权限表
CREATE TABLE IF NOT EXISTS user_data_permissions (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id VARCHAR(50) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  data_id VARCHAR(50) NOT NULL,
  permission_level VARCHAR(20) DEFAULT 'read',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 2. 客户与供应商相关表
-- ==========================================

-- 客户表
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT '中国',
  credit_level VARCHAR(20) DEFAULT 'normal',
  payment_terms VARCHAR(100),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 供应商表
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT '中国',
  credit_level VARCHAR(20) DEFAULT 'normal',
  lead_time_days INTEGER DEFAULT 7,
  rating DECIMAL(3,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 供应商评分表
CREATE TABLE IF NOT EXISTS supplier_ratings (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  supplier_id VARCHAR(50) NOT NULL,
  rating_date DATE NOT NULL,
  quality_score DECIMAL(3,2),
  delivery_score DECIMAL(3,2),
  price_score DECIMAL(3,2),
  service_score DECIMAL(3,2),
  overall_score DECIMAL(3,2),
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 供应商付款记录
CREATE TABLE IF NOT EXISTS supplier_payments (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  supplier_id VARCHAR(50) NOT NULL,
  payment_no VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  related_order VARCHAR(50),
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 3. 物料相关表
-- ==========================================

-- 物料分类表
CREATE TABLE IF NOT EXISTS material_categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  parent_id VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 物料表
CREATE TABLE IF NOT EXISTS materials (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  category_id VARCHAR(50),
  type VARCHAR(50) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  color VARCHAR(50),
  specification VARCHAR(200),
  width DECIMAL(10,2),
  weight DECIMAL(10,2),
  composition VARCHAR(200),
  supplier_id VARCHAR(50),
  unit_price DECIMAL(10,2) DEFAULT 0,
  safety_stock INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  location VARCHAR(100),
  image VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 物料库存日志
CREATE TABLE IF NOT EXISTS material_stock_logs (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  material_id VARCHAR(50) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  before_quantity INTEGER,
  after_quantity INTEGER,
  unit_price DECIMAL(10,2),
  related_order VARCHAR(50),
  operator VARCHAR(100),
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 4. 款式相关表
-- ==========================================

-- 款式表
CREATE TABLE IF NOT EXISTS styles (
  id VARCHAR(50) PRIMARY KEY,
  style_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  season VARCHAR(20),
  year INTEGER,
  color VARCHAR(200),
  size_range VARCHAR(100),
  base_price DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  description TEXT,
  image VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 款式BOM表
CREATE TABLE IF NOT EXISTS style_bom (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  style_id VARCHAR(50) NOT NULL,
  material_id VARCHAR(50) NOT NULL,
  material_name VARCHAR(200),
  unit VARCHAR(20),
  quantity_per_piece DECIMAL(10,4),
  wastage_rate DECIMAL(5,2) DEFAULT 0,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 款式工序表
CREATE TABLE IF NOT EXISTS style_processes (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  style_id VARCHAR(50) NOT NULL,
  process_id VARCHAR(50) NOT NULL,
  process_name VARCHAR(100),
  sequence INTEGER,
  standard_time DECIMAL(5,2),
  standard_rate DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 款式成本标准
CREATE TABLE IF NOT EXISTS style_cost_standards (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  style_id VARCHAR(50) NOT NULL,
  cost_type VARCHAR(50) NOT NULL,
  cost_amount DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'CNY',
  effective_date DATE,
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 款式起订量
CREATE TABLE IF NOT EXISTS style_moq (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  style_id VARCHAR(50) NOT NULL,
  color VARCHAR(50),
  min_quantity INTEGER NOT NULL,
  max_quantity INTEGER,
  unit_price DECIMAL(10,2),
  effective_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 款式库存
CREATE TABLE IF NOT EXISTS style_stock (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  style_id VARCHAR(50) NOT NULL,
  color VARCHAR(50) NOT NULL,
  size VARCHAR(20) NOT NULL,
  quantity INTEGER DEFAULT 0,
  warehouse VARCHAR(100),
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 款式尺码表
CREATE TABLE IF NOT EXISTS order_size_chart (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  style_id VARCHAR(50),
  size VARCHAR(20),
  chest DECIMAL(10,2),
  length DECIMAL(10,2),
  shoulder DECIMAL(10,2),
  sleeve DECIMAL(10,2),
  waist DECIMAL(10,2),
  hip DECIMAL(10,2),
  inseam DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 5. 生产订单相关表
-- ==========================================

-- 生产订单表
CREATE TABLE IF NOT EXISTS production_orders (
  id VARCHAR(50) PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  customer_id VARCHAR(50),
  style_id VARCHAR(50),
  style_no VARCHAR(50),
  style_name VARCHAR(200),
  color VARCHAR(50),
  total_quantity INTEGER NOT NULL,
  size_breakdown JSONB,
  unit_price DECIMAL(10,2),
  total_amount DECIMAL(12,2),
  order_date DATE,
  delivery_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  priority VARCHAR(20) DEFAULT 'normal',
  production_line_id VARCHAR(50),
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 子订单表
CREATE TABLE IF NOT EXISTS sub_orders (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  parent_order_id VARCHAR(50) NOT NULL,
  sub_order_no VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(50),
  size VARCHAR(20),
  quantity INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 订单状态历史
CREATE TABLE IF NOT EXISTS order_status_history (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id VARCHAR(50) NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by VARCHAR(100),
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 订单成本
CREATE TABLE IF NOT EXISTS order_costs (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id VARCHAR(50) NOT NULL,
  cost_type VARCHAR(50) NOT NULL,
  planned_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2),
  variance DECIMAL(12,2),
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 订单付款
CREATE TABLE IF NOT EXISTS order_payments (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id VARCHAR(50) NOT NULL,
  payment_no VARCHAR(50) UNIQUE NOT NULL,
  payment_type VARCHAR(20) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 订单发货信息
CREATE TABLE IF NOT EXISTS order_shipping (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id VARCHAR(50) NOT NULL,
  shipping_method VARCHAR(50),
  carrier VARCHAR(100),
  tracking_no VARCHAR(100),
  shipping_address TEXT,
  contact_person VARCHAR(100),
  contact_phone VARCHAR(20),
  planned_date DATE,
  actual_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 订单合并组
CREATE TABLE IF NOT EXISTS order_merge_groups (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  group_name VARCHAR(100) NOT NULL,
  merge_type VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 订单合并项
CREATE TABLE IF NOT EXISTS order_merge_items (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  group_id VARCHAR(50) NOT NULL,
  order_id VARCHAR(50) NOT NULL,
  merge_quantity INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 订单拆分历史
CREATE TABLE IF NOT EXISTS order_split_history (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  original_order_id VARCHAR(50) NOT NULL,
  new_order_id VARCHAR(50) NOT NULL,
  split_reason TEXT,
  split_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 订单工序进度
CREATE TABLE IF NOT EXISTS order_process_progress (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id VARCHAR(50) NOT NULL,
  process_id VARCHAR(50) NOT NULL,
  process_name VARCHAR(100),
  planned_quantity INTEGER,
  completed_quantity INTEGER DEFAULT 0,
  defect_quantity INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 订单工序
CREATE TABLE IF NOT EXISTS order_processes (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id VARCHAR(50) NOT NULL,
  process_id VARCHAR(50) NOT NULL,
  process_name VARCHAR(100),
  sequence INTEGER,
  standard_time DECIMAL(5,2),
  standard_rate DECIMAL(10,4),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 6. 生产相关表
-- ==========================================

-- 生产线表
CREATE TABLE IF NOT EXISTS production_lines (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  capacity_per_day INTEGER DEFAULT 0,
  efficiency DECIMAL(5,2) DEFAULT 0,
  manager VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 工序表
CREATE TABLE IF NOT EXISTS processes (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  sequence INTEGER DEFAULT 0,
  standard_time DECIMAL(5,2),
  standard_rate DECIMAL(10,4),
  description TEXT,
  is_quality_point BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 工序模板
CREATE TABLE IF NOT EXISTS process_templates (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  processes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 工序成本
CREATE TABLE IF NOT EXISTS process_costs (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  process_id VARCHAR(50) NOT NULL,
  cost_type VARCHAR(50) NOT NULL,
  cost_amount DECIMAL(10,2),
  effective_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 工序跟踪
CREATE TABLE IF NOT EXISTS process_tracking (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id VARCHAR(50) NOT NULL,
  process_id VARCHAR(50) NOT NULL,
  bundle_id VARCHAR(50),
  employee_id VARCHAR(50),
  quantity INTEGER NOT NULL,
  defect_quantity INTEGER DEFAULT 0,
  tracking_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 工作站
CREATE TABLE IF NOT EXISTS work_stations (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  production_line_id VARCHAR(50),
  process_id VARCHAR(50),
  equipment VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 生产需求
CREATE TABLE IF NOT EXISTS production_demand (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id VARCHAR(50) NOT NULL,
  material_id VARCHAR(50),
  demand_type VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  fulfilled_quantity INTEGER DEFAULT 0,
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 生产进度
CREATE TABLE IF NOT EXISTS production_progress (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id VARCHAR(50) NOT NULL,
  production_line_id VARCHAR(50),
  progress_date DATE NOT NULL,
  planned_quantity INTEGER DEFAULT 0,
  actual_quantity INTEGER DEFAULT 0,
  defect_quantity INTEGER DEFAULT 0,
  efficiency DECIMAL(5,2),
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 7. 裁床相关表
-- ==========================================

-- 裁床记录表
CREATE TABLE IF NOT EXISTS cutting_records (
  id VARCHAR(50) PRIMARY KEY,
  cutting_no VARCHAR(50) UNIQUE NOT NULL,
  order_id VARCHAR(50),
  order_no VARCHAR(50),
  style_id VARCHAR(50),
  style_no VARCHAR(50),
  color VARCHAR(50),
  material_id VARCHAR(50),
  material_name VARCHAR(200),
  material_usage DECIMAL(10,2),
  layer_count INTEGER,
  marker_length DECIMAL(10,2),
  marker_efficiency DECIMAL(5,2),
  total_pieces INTEGER,
  cutting_date DATE,
  cutter VARCHAR(100),
  cutting_table VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 裁床分扎表
CREATE TABLE IF NOT EXISTS cutting_bundles (
  id VARCHAR(50) PRIMARY KEY,
  bundle_no VARCHAR(50) UNIQUE NOT NULL,
  cutting_id VARCHAR(50) NOT NULL,
  cutting_no VARCHAR(50),
  order_id VARCHAR(50),
  order_no VARCHAR(50),
  size VARCHAR(20) NOT NULL,
  color VARCHAR(50),
  quantity INTEGER NOT NULL,
  layer_from INTEGER,
  layer_to INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  current_process VARCHAR(100),
  barcode VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 编菲记录表
CREATE TABLE IF NOT EXISTS bianfei_records (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  bianfei_no VARCHAR(50) UNIQUE NOT NULL,
  order_no VARCHAR(50),
  style_name VARCHAR(200),
  style_code VARCHAR(50),
  color VARCHAR(50),
  sizes JSONB,
  quick_mode BOOLEAN DEFAULT FALSE,
  merge_same BOOLEAN DEFAULT FALSE,
  auto_increment BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending',
  total_quantity INTEGER DEFAULT 0,
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 编菲明细表
CREATE TABLE IF NOT EXISTS bianfei_items (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  bianfei_id VARCHAR(50) NOT NULL,
  item_no INTEGER,
  item_name VARCHAR(200),
  quantities JSONB,
  total INTEGER DEFAULT 0,
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 床次计划
CREATE TABLE IF NOT EXISTS bed_plans (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  plan_no VARCHAR(50) UNIQUE NOT NULL,
  order_id VARCHAR(50),
  style_id VARCHAR(50),
  bed_no INTEGER,
  planned_quantity INTEGER,
  actual_quantity INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 床次明细
CREATE TABLE IF NOT EXISTS bed_plan_items (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  bed_plan_id VARCHAR(50) NOT NULL,
  size VARCHAR(20) NOT NULL,
  color VARCHAR(50),
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 8. 工票相关表
-- ==========================================

-- 工票表
CREATE TABLE IF NOT EXISTS work_tickets (
  id VARCHAR(50) PRIMARY KEY,
  ticket_no VARCHAR(50) UNIQUE NOT NULL,
  bundle_id VARCHAR(50),
  bundle_no VARCHAR(50),
  order_id VARCHAR(50),
  order_no VARCHAR(50),
  process_id VARCHAR(50),
  process_name VARCHAR(100),
  employee_id VARCHAR(50),
  employee_name VARCHAR(100),
  quantity INTEGER NOT NULL,
  completed_quantity INTEGER DEFAULT 0,
  defect_quantity INTEGER DEFAULT 0,
  unit_price DECIMAL(10,4),
  total_amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending',
  scan_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 扫描日志
CREATE TABLE IF NOT EXISTS scan_logs (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  scan_type VARCHAR(20) NOT NULL,
  barcode VARCHAR(100) NOT NULL,
  employee_id VARCHAR(50),
  employee_name VARCHAR(100),
  location VARCHAR(100),
  quantity INTEGER,
  scan_time TIMESTAMP DEFAULT NOW(),
  remark TEXT
);

-- ==========================================
-- 9. 质检相关表
-- ==========================================

-- 质检记录表
CREATE TABLE IF NOT EXISTS quality_inspections (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  inspection_no VARCHAR(50) UNIQUE NOT NULL,
  order_id VARCHAR(50),
  order_no VARCHAR(50),
  bundle_id VARCHAR(50),
  bundle_no VARCHAR(50),
  process_id VARCHAR(50),
  process_name VARCHAR(100),
  inspection_type VARCHAR(50) NOT NULL,
  inspector VARCHAR(100),
  inspection_date DATE,
  sample_quantity INTEGER,
  pass_quantity INTEGER,
  defect_quantity INTEGER,
  defect_rate DECIMAL(5,2),
  result VARCHAR(20),
  defect_details JSONB,
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 出货检验
CREATE TABLE IF NOT EXISTS outgoing_inspections (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  inspection_no VARCHAR(50) UNIQUE NOT NULL,
  shipment_id VARCHAR(50),
  order_id VARCHAR(50),
  inspector VARCHAR(100),
  inspection_date DATE,
  sample_quantity INTEGER,
  pass_quantity INTEGER,
  defect_quantity INTEGER,
  result VARCHAR(20),
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 质量知识库
CREATE TABLE IF NOT EXISTS quality_knowledge_base (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  content TEXT,
  attachments JSONB,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 10. 员工与人事相关表
-- ==========================================

-- 员工表
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(50) PRIMARY KEY,
  employee_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  gender VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(100),
  id_card VARCHAR(20),
  department VARCHAR(100),
  position VARCHAR(100),
  skill_level VARCHAR(20),
  skill_types JSONB,
  production_line_id VARCHAR(50),
  hire_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  base_salary DECIMAL(10,2) DEFAULT 0,
  piece_rate DECIMAL(5,2) DEFAULT 1,
  bank_account VARCHAR(50),
  bank_name VARCHAR(100),
  emergency_contact VARCHAR(100),
  emergency_phone VARCHAR(20),
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 考勤表
CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  employee_id VARCHAR(50) NOT NULL,
  employee_no VARCHAR(50),
  employee_name VARCHAR(100),
  attendance_date DATE NOT NULL,
  check_in_time VARCHAR(10),
  check_out_time VARCHAR(10),
  work_hours DECIMAL(5,2) DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'normal',
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, attendance_date)
);

-- 工资记录表
CREATE TABLE IF NOT EXISTS salary_records (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  employee_id VARCHAR(50) NOT NULL,
  employee_no VARCHAR(50),
  employee_name VARCHAR(100),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  base_salary DECIMAL(10,2) DEFAULT 0,
  piece_salary DECIMAL(10,2) DEFAULT 0,
  overtime_salary DECIMAL(10,2) DEFAULT 0,
  bonus DECIMAL(10,2) DEFAULT 0,
  deduction DECIMAL(10,2) DEFAULT 0,
  total_salary DECIMAL(10,2) DEFAULT 0,
  work_days INTEGER DEFAULT 22,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  piece_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, year, month)
);

-- 工资表(汇总)
CREATE TABLE IF NOT EXISTS salaries (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  department VARCHAR(100),
  total_amount DECIMAL(12,2) DEFAULT 0,
  employee_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 工资调整
CREATE TABLE IF NOT EXISTS wage_adjustments (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  employee_id VARCHAR(50) NOT NULL,
  adjustment_type VARCHAR(20) NOT NULL,
  old_value DECIMAL(10,2),
  new_value DECIMAL(10,2),
  effective_date DATE,
  reason TEXT,
  approved_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 11. 库存相关表
-- ==========================================

-- 库存事务表
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  transaction_no VARCHAR(50) UNIQUE NOT NULL,
  material_id VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  before_quantity INTEGER,
  after_quantity INTEGER,
  unit VARCHAR(20),
  unit_price DECIMAL(10,2),
  total_amount DECIMAL(12,2),
  warehouse VARCHAR(100),
  location VARCHAR(100),
  related_order VARCHAR(50),
  related_type VARCHAR(20),
  operator VARCHAR(100),
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 仓库库位表
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  warehouse VARCHAR(100) NOT NULL,
  zone VARCHAR(50),
  shelf VARCHAR(50),
  location_code VARCHAR(50) UNIQUE NOT NULL,
  capacity INTEGER DEFAULT 0,
  current_usage INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 12. 采购相关表
-- ==========================================

-- 采购申请表
CREATE TABLE IF NOT EXISTS purchase_requests (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  request_no VARCHAR(50) UNIQUE NOT NULL,
  request_type VARCHAR(20) NOT NULL,
  requester VARCHAR(100),
  department VARCHAR(100),
  request_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by VARCHAR(100),
  approved_date DATE,
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 采购订单表
CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  po_no VARCHAR(50) UNIQUE NOT NULL,
  supplier_id VARCHAR(50) NOT NULL,
  supplier_name VARCHAR(200),
  order_date DATE,
  expected_date DATE,
  total_amount DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by VARCHAR(100),
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 采购明细表
CREATE TABLE IF NOT EXISTS purchase_items (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  po_id VARCHAR(50) NOT NULL,
  material_id VARCHAR(50) NOT NULL,
  material_name VARCHAR(200),
  unit VARCHAR(20),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(12,2),
  received_quantity INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 13. 出货相关表
-- ==========================================

-- 出货表
CREATE TABLE IF NOT EXISTS shipments (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  shipment_no VARCHAR(50) UNIQUE NOT NULL,
  order_id VARCHAR(50),
  order_no VARCHAR(50),
  customer_id VARCHAR(50),
  customer_name VARCHAR(200),
  total_quantity INTEGER NOT NULL,
  total_boxes INTEGER,
  total_weight DECIMAL(10,2),
  shipping_method VARCHAR(50),
  carrier VARCHAR(100),
  tracking_no VARCHAR(100),
  shipping_address TEXT,
  contact_person VARCHAR(100),
  contact_phone VARCHAR(20),
  planned_date DATE,
  actual_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  shipper VARCHAR(100),
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 出货明细表
CREATE TABLE IF NOT EXISTS shipment_items (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  shipment_id VARCHAR(50) NOT NULL,
  order_id VARCHAR(50),
  style_id VARCHAR(50),
  color VARCHAR(50),
  size VARCHAR(20),
  quantity INTEGER NOT NULL,
  box_no VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 出货详情表
CREATE TABLE IF NOT EXISTS shipment_details (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  shipment_id VARCHAR(50) NOT NULL,
  order_id VARCHAR(50),
  product_name VARCHAR(200),
  color VARCHAR(50),
  size VARCHAR(20),
  quantity INTEGER NOT NULL,
  carton_count INTEGER,
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 发货任务
CREATE TABLE IF NOT EXISTS shipping_tasks (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  shipment_id VARCHAR(50) NOT NULL,
  task_type VARCHAR(20) NOT NULL,
  assignee VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  completed_at TIMESTAMP,
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 14. 外发相关表
-- ==========================================

-- 外发订单表
CREATE TABLE IF NOT EXISTS outsource_orders (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  outsource_no VARCHAR(50) UNIQUE NOT NULL,
  bundle_id VARCHAR(50),
  bundle_no VARCHAR(50),
  order_id VARCHAR(50),
  order_no VARCHAR(50),
  supplier_id VARCHAR(50) NOT NULL,
  supplier_name VARCHAR(200),
  process_id VARCHAR(50),
  process_name VARCHAR(100),
  send_quantity INTEGER NOT NULL,
  return_quantity INTEGER DEFAULT 0,
  defect_quantity INTEGER DEFAULT 0,
  unit_price DECIMAL(10,2),
  total_amount DECIMAL(12,2),
  send_date DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  sender VARCHAR(100),
  receiver VARCHAR(100),
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 外发工序表
CREATE TABLE IF NOT EXISTS outsource_processes (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  outsource_order_id VARCHAR(50) NOT NULL,
  process_id VARCHAR(50) NOT NULL,
  process_name VARCHAR(100),
  quantity INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 外发进度表
CREATE TABLE IF NOT EXISTS outsource_progress (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  outsource_order_id VARCHAR(50) NOT NULL,
  progress_date DATE NOT NULL,
  completed_quantity INTEGER DEFAULT 0,
  defect_quantity INTEGER DEFAULT 0,
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 外发质量检验
CREATE TABLE IF NOT EXISTS outsource_quality_checks (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  outsource_order_id VARCHAR(50) NOT NULL,
  check_date DATE NOT NULL,
  inspector VARCHAR(100),
  sample_quantity INTEGER,
  pass_quantity INTEGER,
  defect_quantity INTEGER,
  result VARCHAR(20),
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 外发延误
CREATE TABLE IF NOT EXISTS outsource_delays (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  outsource_order_id VARCHAR(50) NOT NULL,
  delay_days INTEGER NOT NULL,
  delay_reason TEXT,
  compensation_amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 二次工序订单
CREATE TABLE IF NOT EXISTS secondary_process_orders (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  bundle_id VARCHAR(50),
  process_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  supplier_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 15. 财务相关表
-- ==========================================

-- 账单表
CREATE TABLE IF NOT EXISTS bills (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  bill_no VARCHAR(50) UNIQUE NOT NULL,
  bill_type VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  related_id VARCHAR(50),
  related_no VARCHAR(50),
  customer_id VARCHAR(50),
  supplier_id VARCHAR(50),
  amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  due_date DATE,
  payment_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 付款记录
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  payment_no VARCHAR(50) UNIQUE NOT NULL,
  payment_type VARCHAR(20) NOT NULL,
  related_id VARCHAR(50),
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_date DATE,
  payee VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending',
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 退款记录
CREATE TABLE IF NOT EXISTS refunds (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  refund_no VARCHAR(50) UNIQUE NOT NULL,
  original_payment_id VARCHAR(50),
  amount DECIMAL(12,2) NOT NULL,
  refund_reason TEXT,
  refund_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 结算记录
CREATE TABLE IF NOT EXISTS settlements (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  settlement_no VARCHAR(50) UNIQUE NOT NULL,
  settlement_type VARCHAR(20) NOT NULL,
  related_ids JSONB,
  total_amount DECIMAL(12,2) NOT NULL,
  settlement_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 交易记录
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  transaction_no VARCHAR(50) UNIQUE NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  balance_before DECIMAL(12,2),
  balance_after DECIMAL(12,2),
  related_id VARCHAR(50),
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 利润预警
CREATE TABLE IF NOT EXISTS profit_alerts (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id VARCHAR(50),
  alert_type VARCHAR(20) NOT NULL,
  threshold_value DECIMAL(12,2),
  actual_value DECIMAL(12,2),
  alert_level VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 利润分配
CREATE TABLE IF NOT EXISTS profit_distributions (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  total_profit DECIMAL(12,2),
  distributed_amount DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 16. 通知与预警相关表
-- ==========================================

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  type VARCHAR(20) NOT NULL,
  level VARCHAR(20) DEFAULT 'info',
  title VARCHAR(200) NOT NULL,
  content TEXT,
  related_order VARCHAR(50),
  related_type VARCHAR(50),
  recipient VARCHAR(50),
  status VARCHAR(20) DEFAULT 'unread',
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 预警规则
CREATE TABLE IF NOT EXISTS alert_rules (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  condition_type VARCHAR(20) NOT NULL,
  threshold_value DECIMAL(12,2),
  comparison_operator VARCHAR(10),
  notify_method VARCHAR(50),
  notify_targets JSONB,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 预警记录
CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  alert_rule_id VARCHAR(50),
  alert_type VARCHAR(20) NOT NULL,
  alert_level VARCHAR(20) DEFAULT 'warning',
  title VARCHAR(200) NOT NULL,
  content TEXT,
  related_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  handled_by VARCHAR(100),
  handled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 17. 设备相关表
-- ==========================================

-- 设备表
CREATE TABLE IF NOT EXISTS equipment (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  equipment_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  production_line_id VARCHAR(50),
  purchase_date DATE,
  purchase_price DECIMAL(12,2),
  warranty_months INTEGER,
  status VARCHAR(20) DEFAULT 'normal',
  daily_capacity INTEGER DEFAULT 0,
  efficiency DECIMAL(5,2) DEFAULT 0,
  operator VARCHAR(100),
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 设备维护记录
CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  equipment_id VARCHAR(50) NOT NULL,
  maintenance_type VARCHAR(20) NOT NULL,
  maintenance_date DATE,
  cost DECIMAL(10,2),
  technician VARCHAR(100),
  description TEXT,
  next_maintenance_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 18. 公告与文件相关表
-- ==========================================

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'general',
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'draft',
  publish_date DATE,
  expire_date DATE,
  author VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 文件上传记录
CREATE TABLE IF NOT EXISTS file_uploads (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(50),
  related_type VARCHAR(50),
  related_id VARCHAR(50),
  uploader VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 图案上传
CREATE TABLE IF NOT EXISTS pattern_uploads (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  pattern_name VARCHAR(200) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  style_id VARCHAR(50),
  width DECIMAL(10,2),
  height DECIMAL(10,2),
  colors VARCHAR(100),
  uploader VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 图案片
CREATE TABLE IF NOT EXISTS pattern_pieces (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  pattern_id VARCHAR(50) NOT NULL,
  piece_name VARCHAR(100) NOT NULL,
  piece_code VARCHAR(50),
  width DECIMAL(10,2),
  height DECIMAL(10,2),
  quantity INTEGER DEFAULT 1,
  grain_direction VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 19. 租户与订阅相关表 (SaaS功能)
-- ==========================================

-- 租户表
CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  contact_person VARCHAR(100),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(100),
  plan_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 计划表
CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  billing_cycle VARCHAR(20),
  features JSONB,
  limits JSONB,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 订阅表
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(50) NOT NULL,
  plan_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 订阅变更
CREATE TABLE IF NOT EXISTS subscription_changes (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  subscription_id VARCHAR(50) NOT NULL,
  old_plan_id VARCHAR(50),
  new_plan_id VARCHAR(50),
  change_type VARCHAR(20) NOT NULL,
  effective_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 待处理的计划变更
CREATE TABLE IF NOT EXISTS pending_plan_changes (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(50) NOT NULL,
  current_plan_id VARCHAR(50),
  new_plan_id VARCHAR(50),
  scheduled_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 租户发票
CREATE TABLE IF NOT EXISTS tenant_invoices (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(50) NOT NULL,
  invoice_no VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  due_date DATE,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 租户付款
CREATE TABLE IF NOT EXISTS tenant_payments (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(50) NOT NULL,
  invoice_id VARCHAR(50),
  payment_no VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 租户使用量
CREATE TABLE IF NOT EXISTS tenant_usage (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(50) NOT NULL,
  usage_type VARCHAR(50) NOT NULL,
  usage_date DATE NOT NULL,
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 存储使用量
CREATE TABLE IF NOT EXISTS storage_usage (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(50) NOT NULL,
  storage_type VARCHAR(20) NOT NULL,
  used_bytes BIGINT DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 20. 跟踪与日志相关表
-- ==========================================

-- 跟踪事件
CREATE TABLE IF NOT EXISTS tracking_events (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  event_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50) NOT NULL,
  event_data JSONB,
  user_id VARCHAR(50),
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 跟踪项目
CREATE TABLE IF NOT EXISTS tracking_items (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tracking_type VARCHAR(50) NOT NULL,
  tracking_id VARCHAR(50) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 21. 其他辅助表
-- ==========================================

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  config_type VARCHAR(20) DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id VARCHAR(50),
  user_name VARCHAR(100),
  operation VARCHAR(100) NOT NULL,
  module VARCHAR(50),
  target_type VARCHAR(50),
  target_id VARCHAR(50),
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 班次表
CREATE TABLE IF NOT EXISTS shifts (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(50) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  break_start VARCHAR(10),
  break_end VARCHAR(10),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 假期表
CREATE TABLE IF NOT EXISTS holidays (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(100) NOT NULL,
  holiday_date DATE NOT NULL,
  holiday_type VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 部门表
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  parent_id VARCHAR(50),
  manager VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);
