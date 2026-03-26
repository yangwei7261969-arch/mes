-- =====================================================
-- 多租户数据库架构
-- 实现数据隔离：每个租户只能访问自己的数据
-- =====================================================

-- ==========================================
-- 1. 租户管理表
-- ==========================================

-- 租户表（公司/工厂）
CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  logo VARCHAR(500),
  
  -- 联系信息
  contact_person VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(200),
  address TEXT,
  
  -- 租户配置
  plan VARCHAR(50) DEFAULT 'standard', -- free, standard, premium, enterprise
  max_users INTEGER DEFAULT 50,
  max_orders INTEGER DEFAULT 1000,
  
  -- 功能开关
  features JSONB DEFAULT '{}', -- {"ai": true, "cad": false, ...}
  
  -- 状态
  status VARCHAR(20) DEFAULT 'active', -- active, suspended, trial, cancelled
  trial_ends_at TIMESTAMP,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 元数据
  metadata JSONB DEFAULT '{}'
);

-- 租户用户关联表（用户可以属于多个租户）
CREATE TABLE IF NOT EXISTS tenant_users (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL,
  role VARCHAR(50) DEFAULT 'member', -- owner, admin, member, viewer
  department VARCHAR(100),
  
  -- 权限
  permissions JSONB DEFAULT '[]',
  
  -- 状态
  status VARCHAR(20) DEFAULT 'active',
  invited_by VARCHAR(50),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, user_id)
);

-- 工厂表（一个租户可以有多个工厂）
CREATE TABLE IF NOT EXISTS factories (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) NOT NULL,
  
  -- 工厂信息
  location VARCHAR(500),
  capacity INTEGER, -- 日产能
  production_lines INTEGER DEFAULT 1,
  
  -- 联系信息
  manager_id VARCHAR(50),
  phone VARCHAR(50),
  
  -- 状态
  status VARCHAR(20) DEFAULT 'active',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, code)
);

-- 租户订阅/计费记录
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- 订阅信息
  plan VARCHAR(50) NOT NULL,
  billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
  
  -- 费用
  amount DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'CNY',
  
  -- 时间
  started_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  cancelled_at TIMESTAMP,
  
  -- 状态
  status VARCHAR(20) DEFAULT 'active', -- active, cancelled, expired
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 2. 为现有表添加 tenant_id 字段
-- ==========================================

-- 核心业务表列表
DO $$
DECLARE
  table_name TEXT;
  tables TEXT[] := ARRAY[
    'users', 'roles', 'user_roles', 'permissions', 'role_permissions', 'user_permissions',
    'customers', 'suppliers', 
    'production_orders', 'order_details', 'production_progress', 'production_tracking',
    'cutting_orders', 'cutting_records', 'cutting_bundles',
    'processes', 'process_tracking', 'process_templates',
    'inventory', 'inventory_transactions', 'inventory_adjustments',
    'finished_goods', 'finished_inventory',
    'quality_defects', 'quality_inspections',
    'outsource_orders', 'outsource_progress',
    'employees', 'departments',
    'materials', 'material_categories', 'material_inventory',
    'purchase_orders', 'purchase_items',
    'invoices', 'payments', 'bills',
    'shipments', 'shipment_items',
    'alerts', 'notifications', 'announcements',
    'style_processes', 'craft_processes',
    'ai_logs', 'operation_logs',
    'equipment', 'pattern_files',
    'billing_records'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    -- 检查表是否存在
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
      -- 检查字段是否已存在
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = table_name 
        AND column_name = 'tenant_id'
      ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id VARCHAR(50)', table_name);
        RAISE NOTICE 'Added tenant_id to table: %', table_name;
      END IF;
    END IF;
  END LOOP;
END $$;

-- 添加外键约束（可选，根据需要启用）
-- ALTER TABLE users ADD CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- ==========================================
-- 3. 创建索引优化查询性能
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_tenants_code ON tenants(code);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_factories_tenant_id ON factories(tenant_id);

-- 为业务表创建租户索引
DO $$
DECLARE
  table_name TEXT;
  tables TEXT[] := ARRAY[
    'users', 'customers', 'suppliers', 'production_orders', 'inventory',
    'employees', 'materials', 'purchase_orders', 'invoices', 'shipments'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = table_name 
      AND column_name = 'tenant_id'
    ) THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_tenant_id ON public.%I(tenant_id)', table_name, table_name);
    END IF;
  END LOOP;
END $$;

-- ==========================================
-- 4. 创建行级安全策略 (RLS)
-- ==========================================

-- 启用 RLS 扩展
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- 创建获取当前租户ID的函数
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS VARCHAR(50) AS $$
BEGIN
  -- 从会话变量获取租户ID
  RETURN current_setting('app.current_tenant', true);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 设置租户ID的函数
CREATE OR REPLACE FUNCTION set_tenant_id(tenant_id VARCHAR(50))
RETURNS VOID AS $$
BEGIN
  EXECUTE format('SET app.current_tenant = %L', tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 为关键表启用 RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略示例（customers 表）
CREATE POLICY tenant_isolation_policy ON customers
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ==========================================
-- 5. 插入默认租户
-- ==========================================

INSERT INTO tenants (id, name, code, plan, status, features) VALUES
('tenant_default', '默认租户', 'DEFAULT', 'enterprise', 'active', '{"ai": true, "cad": true, "mes": true}')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ==========================================
-- 6. 更新现有数据的租户ID
-- ==========================================

DO $$
DECLARE
  table_name TEXT;
  tables TEXT[] := ARRAY[
    'customers', 'suppliers', 'production_orders', 'inventory',
    'employees', 'materials', 'purchase_orders'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = table_name 
      AND column_name = 'tenant_id'
    ) THEN
      EXECUTE format('UPDATE public.%I SET tenant_id = ''tenant_default'' WHERE tenant_id IS NULL', table_name);
      RAISE NOTICE 'Updated tenant_id for table: %', table_name;
    END IF;
  END LOOP;
END $$;

-- ==========================================
-- 7. 添加非空约束
-- ==========================================

DO $$
DECLARE
  table_name TEXT;
  tables TEXT[] := ARRAY[
    'customers', 'suppliers', 'production_orders', 'inventory', 'employees'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = table_name 
      AND column_name = 'tenant_id'
    ) THEN
      BEGIN
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', table_name);
        RAISE NOTICE 'Set NOT NULL for tenant_id in table: %', table_name;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set NOT NULL for table %: %', table_name, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;

-- 完成提示
SELECT 'Multi-tenant schema created successfully!' AS status;
