-- 扫码日志表
CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode VARCHAR(100) NOT NULL,
  employee_id VARCHAR(50),
  station_id VARCHAR(50),
  validation_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_scan_logs_barcode (barcode),
  INDEX idx_scan_logs_employee (employee_id),
  INDEX idx_scan_logs_created (created_at)
);

-- 工票表（如果不存在）
CREATE TABLE IF NOT EXISTS work_tickets (
  id VARCHAR(100) PRIMARY KEY,
  bundle_id VARCHAR(50) NOT NULL,
  process_id VARCHAR(50) NOT NULL,
  sequence INT NOT NULL,
  barcode VARCHAR(100) UNIQUE,
  employee_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_work_tickets_bundle (bundle_id),
  INDEX idx_work_tickets_barcode (barcode),
  INDEX idx_work_tickets_status (status)
);

-- 给扎包表添加唯一条码字段
ALTER TABLE cutting_bundles ADD COLUMN IF NOT EXISTS unique_code VARCHAR(50) UNIQUE;
ALTER TABLE cutting_bundles ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) UNIQUE;

-- 工序跟踪表添加更多字段
ALTER TABLE process_tracking ADD COLUMN IF NOT EXISTS duration_minutes INT;
ALTER TABLE process_tracking ADD COLUMN IF NOT EXISTS quantity_completed INT DEFAULT 0;
ALTER TABLE process_tracking ADD COLUMN IF NOT EXISTS defects INT DEFAULT 0;

COMMENT ON TABLE scan_logs IS '扫码日志表';
COMMENT ON TABLE work_tickets IS '工票表';
