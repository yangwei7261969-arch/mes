-- =====================================================
-- 多租户迁移脚本 - 为核心业务表添加 tenant_id 字段
-- 执行说明: 在 Supabase SQL Editor 中执行此脚本
-- =====================================================

-- 1. 客户表
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);

-- 2. 供应商表
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers(tenant_id);

-- 3. 生产订单表
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_production_orders_tenant_id ON production_orders(tenant_id);

-- 4. 订单明细表
ALTER TABLE order_details ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_order_details_tenant_id ON order_details(tenant_id);

-- 5. 裁床订单表
ALTER TABLE cutting_orders ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_cutting_orders_tenant_id ON cutting_orders(tenant_id);

-- 6. 裁床记录表
ALTER TABLE cutting_records ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_cutting_records_tenant_id ON cutting_records(tenant_id);

-- 7. 裁床扎包表
ALTER TABLE cutting_bundles ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_cutting_bundles_tenant_id ON cutting_bundles(tenant_id);

-- 8. 库存表
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_id ON inventory(tenant_id);

-- 9. 库存交易表
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant_id ON inventory_transactions(tenant_id);

-- 10. 成品库存表
ALTER TABLE finished_inventory ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_finished_inventory_tenant_id ON finished_inventory(tenant_id);

-- 11. 员工表
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees(tenant_id);

-- 12. 物料表
ALTER TABLE materials ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_materials_tenant_id ON materials(tenant_id);

-- 13. 物料库存表
ALTER TABLE material_inventory ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_material_inventory_tenant_id ON material_inventory(tenant_id);

-- 14. 采购订单表
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_id ON purchase_orders(tenant_id);

-- 15. 发票表
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);

-- 16. 付款表
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);

-- 17. 出货表
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_shipments_tenant_id ON shipments(tenant_id);

-- 18. 质量缺陷表
ALTER TABLE quality_defects ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_quality_defects_tenant_id ON quality_defects(tenant_id);

-- 19. 外发订单表
ALTER TABLE outsource_orders ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_outsource_orders_tenant_id ON outsource_orders(tenant_id);

-- 20. 工序表
ALTER TABLE processes ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_processes_tenant_id ON processes(tenant_id);

-- 21. 工序追踪表
ALTER TABLE process_tracking ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_process_tracking_tenant_id ON process_tracking(tenant_id);

-- 22. 公告表
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_announcements_tenant_id ON announcements(tenant_id);

-- 23. 通知表
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);

-- 24. 用户表也添加租户ID
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- 25. 警报配置表
ALTER TABLE alert_configs ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_alert_configs_tenant_id ON alert_configs(tenant_id);

-- 26. 扫码记录表
ALTER TABLE scan_records ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'tenant_default';
CREATE INDEX IF NOT EXISTS idx_scan_records_tenant_id ON scan_records(tenant_id);

-- =====================================================
-- 数据迁移：将现有数据的 tenant_id 设置为默认租户
-- =====================================================

-- 更新所有现有数据的 tenant_id
UPDATE customers SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE suppliers SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE production_orders SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE order_details SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE cutting_orders SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE cutting_records SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE cutting_bundles SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE inventory SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE inventory_transactions SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE finished_inventory SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE employees SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE materials SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE material_inventory SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE purchase_orders SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE invoices SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE payments SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE shipments SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE quality_defects SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE outsource_orders SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE processes SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE process_tracking SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE announcements SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE notifications SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE users SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE alert_configs SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;
UPDATE scan_records SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;

-- =====================================================
-- 创建默认租户
-- =====================================================

INSERT INTO tenants (id, name, code, plan, status, features)
VALUES (
  'tenant_default',
  '默认租户',
  'DEFAULT',
  'enterprise',
  'active',
  '{"ai": true, "cad": true, "mes": true, "advanced": true}'
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 验证迁移结果
-- =====================================================

-- 查询每个表的租户字段情况
SELECT 
  'customers' as table_name, 
  COUNT(*) as total, 
  COUNT(tenant_id) as with_tenant_id 
FROM customers
UNION ALL
SELECT 'suppliers', COUNT(*), COUNT(tenant_id) FROM suppliers
UNION ALL
SELECT 'production_orders', COUNT(*), COUNT(tenant_id) FROM production_orders
UNION ALL
SELECT 'inventory', COUNT(*), COUNT(tenant_id) FROM inventory
UNION ALL
SELECT 'employees', COUNT(*), COUNT(tenant_id) FROM employees
UNION ALL
SELECT 'users', COUNT(*), COUNT(tenant_id) FROM users;
