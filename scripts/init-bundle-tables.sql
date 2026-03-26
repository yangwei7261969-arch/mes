-- 裁床分扎表
CREATE TABLE IF NOT EXISTS cutting_bundles (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  cutting_order_id VARCHAR(36),
  bundle_no VARCHAR(50) NOT NULL UNIQUE,
  size VARCHAR(50) NOT NULL,
  color VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  qr_code VARCHAR(100),
  current_process_id VARCHAR(36),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS cutting_bundles_order_idx ON cutting_bundles(cutting_order_id);
CREATE INDEX IF NOT EXISTS cutting_bundles_bundle_no_idx ON cutting_bundles(bundle_no);

-- 工序追溯表
CREATE TABLE IF NOT EXISTS process_tracking (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id VARCHAR(36) NOT NULL,
  process_id VARCHAR(36) NOT NULL,
  worker_id VARCHAR(36) NOT NULL,
  quantity INTEGER NOT NULL,
  wage NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS process_tracking_bundle_idx ON process_tracking(bundle_id);
CREATE INDEX IF NOT EXISTS process_tracking_process_idx ON process_tracking(process_id);
CREATE INDEX IF NOT EXISTS process_tracking_worker_idx ON process_tracking(worker_id);
CREATE INDEX IF NOT EXISTS process_tracking_created_idx ON process_tracking(created_at);

-- 为cutting_orders添加分床相关字段
ALTER TABLE cutting_orders ADD COLUMN IF NOT EXISTS bed_number INTEGER;
ALTER TABLE cutting_orders ADD COLUMN IF NOT EXISTS total_beds INTEGER;
ALTER TABLE cutting_orders ADD COLUMN IF NOT EXISTS size_breakdown JSONB;

-- 为production_orders添加尺码明细字段
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS size_breakdown JSONB;

-- 为production_progress添加缺失的字段
ALTER TABLE production_progress ADD COLUMN IF NOT EXISTS notes TEXT;

-- 添加示例数据（可选）
-- 示例：为订单添加尺码明细
-- UPDATE production_orders 
-- SET size_breakdown = '{"S": 50, "M": 100, "L": 100, "XL": 50}'::jsonb
-- WHERE size_breakdown IS NULL AND quantity > 0;
