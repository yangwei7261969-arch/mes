-- ===========================================
-- 客户订单系统相关表
-- ===========================================

-- 款式表
CREATE TABLE IF NOT EXISTS styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_no VARCHAR(50) UNIQUE NOT NULL,
  style_name VARCHAR(100),
  category VARCHAR(50),
  season VARCHAR(50),
  year INTEGER,
  color VARCHAR(50),
  size_range TEXT[],
  retail_price DECIMAL(10,2) DEFAULT 0,
  wholesale_price DECIMAL(10,2) DEFAULT 0,
  cost_price DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'CNY',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 款式图片表
CREATE TABLE IF NOT EXISTS style_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
  url TEXT,
  image_type VARCHAR(20) DEFAULT 'main',
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 款式颜色表
CREATE TABLE IF NOT EXISTS style_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
  color_code VARCHAR(20),
  color_name VARCHAR(50),
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 款式尺码表
CREATE TABLE IF NOT EXISTS style_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
  size_code VARCHAR(20),
  size_name VARCHAR(50),
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 款式BOM表
CREATE TABLE IF NOT EXISTS style_bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
  material_name VARCHAR(100),
  material_code VARCHAR(50),
  unit VARCHAR(20),
  usage_per_piece DECIMAL(10,4),
  wastage_rate DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 款式MOQ表
CREATE TABLE IF NOT EXISTS style_moq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER,
  price_tier VARCHAR(20),
  discount_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 款式库存表
CREATE TABLE IF NOT EXISTS style_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
  color_id UUID REFERENCES style_colors(id),
  size_id UUID REFERENCES style_sizes(id),
  quantity INTEGER DEFAULT 0,
  location VARCHAR(100),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 客户专属价格表
CREATE TABLE IF NOT EXISTS customer_style_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
  price DECIMAL(10,2),
  price_tier VARCHAR(20),
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, style_id)
);

-- 客户折扣表
CREATE TABLE IF NOT EXISTS customer_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  discount_type VARCHAR(20) DEFAULT 'percentage',
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 客户订单表
CREATE TABLE IF NOT EXISTS customer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  production_order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  shipping_fee DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  payment_method VARCHAR(50),
  shipping_address JSONB,
  billing_address JSONB,
  tracking_code VARCHAR(50),
  estimated_delivery DATE,
  notes TEXT,
  cancel_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 客户订单明细表
CREATE TABLE IF NOT EXISTS customer_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES customer_orders(id) ON DELETE CASCADE,
  style_id UUID REFERENCES styles(id) ON DELETE SET NULL,
  color_id UUID REFERENCES style_colors(id) ON DELETE SET NULL,
  size_id UUID REFERENCES style_sizes(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 购物车表
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  cart_id VARCHAR(50),
  style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
  color_id UUID REFERENCES style_colors(id) ON DELETE SET NULL,
  size_id UUID REFERENCES style_sizes(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 订单支付记录
CREATE TABLE IF NOT EXISTS order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES customer_orders(id) ON DELETE CASCADE,
  payment_method VARCHAR(50),
  amount DECIMAL(12,2),
  transaction_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 订单发货信息
CREATE TABLE IF NOT EXISTS order_shipping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES customer_orders(id) ON DELETE CASCADE,
  carrier VARCHAR(100),
  tracking_number VARCHAR(100),
  shipping_method VARCHAR(50),
  shipped_at TIMESTAMP WITH TIME ZONE,
  estimated_arrival DATE,
  actual_arrival TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 退款表
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES customer_orders(id) ON DELETE CASCADE,
  amount DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'pending',
  reason TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 折扣码表
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) DEFAULT 'percentage',
  discount_value DECIMAL(10,2),
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- 插入一些测试数据
-- ===========================================

-- 插入测试款式
INSERT INTO styles (style_no, style_name, category, season, year, color, retail_price, wholesale_price, cost_price)
VALUES
  ('S2026001', '经典圆领T恤', 'tshirt', 'SS2026', 2026, '白色', 99, 59, 35),
  ('S2026002', '休闲运动裤', 'pants', 'SS2026', 2026, '黑色', 159, 89, 52),
  ('S2026003', '时尚连衣裙', 'dress', 'SS2026', 2026, '蓝色', 269, 159, 95),
  ('S2026004', '商务西装外套', 'jacket', 'FW2026', 2026, '深灰', 599, 359, 215),
  ('S2026005', '纯棉衬衫', 'shirt', 'SS2026', 2026, '白色', 189, 109, 65)
ON CONFLICT (style_no) DO NOTHING;

-- 为款式插入颜色
INSERT INTO style_colors (style_id, color_code, color_name)
SELECT id, 'WHT', '白色' FROM styles WHERE style_no = 'S2026001'
UNION ALL
SELECT id, 'BLK', '黑色' FROM styles WHERE style_no = 'S2026002'
UNION ALL
SELECT id, 'BLU', '蓝色' FROM styles WHERE style_no = 'S2026003'
UNION ALL
SELECT id, 'GRY', '深灰' FROM styles WHERE style_no = 'S2026004'
UNION ALL
SELECT id, 'WHT', '白色' FROM styles WHERE style_no = 'S2026005';

-- 为款式插入尺码
INSERT INTO style_sizes (style_id, size_code, size_name)
SELECT s.id, sz.code, sz.name
FROM styles s
CROSS JOIN (VALUES ('S', 'S码'), ('M', 'M码'), ('L', 'L码'), ('XL', 'XL码'), ('XXL', 'XXL码')) AS sz(code, name)
WHERE s.style_no IN ('S2026001', 'S2026002', 'S2026005');

INSERT INTO style_sizes (style_id, size_code, size_name)
SELECT s.id, sz.code, sz.name
FROM styles s
CROSS JOIN (VALUES ('XS', 'XS码'), ('S', 'S码'), ('M', 'M码'), ('L', 'L码')) AS sz(code, name)
WHERE s.style_no IN ('S2026003', 'S2026004');

-- 插入折扣码
INSERT INTO discount_codes (code, discount_type, discount_value, min_order_amount, valid_from, valid_until, is_active)
VALUES
  ('NEW2026', 'percentage', 10, 100, NOW(), NOW() + INTERVAL '365 days', true),
  ('VIP50', 'fixed', 50, 300, NOW(), NOW() + INTERVAL '365 days', true)
ON CONFLICT (code) DO NOTHING;
