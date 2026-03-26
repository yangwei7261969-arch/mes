-- =====================================================
-- 权限系统初始化数据
-- =====================================================

-- 1. 更新角色表，添加display_name等字段
-- =====================================================
INSERT INTO roles (id, name, display_name, description, level, is_system) VALUES
('boss', 'boss', '总经理', '系统最高权限，可查看所有数据和报表', 1, true),
('manager', 'manager', '生产经理', '管理生产订单、生产排程、人员调度', 2, true),
('production_manager', 'production_manager', '生产主管', '管理生产线、工序跟踪、质量控制', 3, true),
('warehouse', 'warehouse', '仓库管理员', '管理物料入库、出库、盘点', 3, true),
('qc', 'qc', '质检员', '负责质量检验、缺陷记录', 3, true),
('accountant', 'accountant', '财务', '管理财务账单、付款、工资', 2, true),
('operator', 'operator', '操作员', '负责扫码报工、工序操作', 5, true),
('viewer', 'viewer', '访客', '只能查看部分数据', 9, true),
('cutting_manager', 'cutting_manager', '裁床主管', '管理裁床排程、分扎', 3, true),
('hr', 'hr', '人事', '管理员工档案、考勤、工资', 2, true),
('finance', 'finance', '财务主管', '管理财务、账单、成本', 2, true),
('purchase', 'purchase', '采购', '管理采购订单、供应商', 3, true),
('craft', 'craft', '工艺员', '管理二次工艺', 4, true),
('finishing', 'finishing', '后整主管', '管理整烫、包装', 4, true),
('admin', 'admin', '系统管理员', '系统配置、权限管理', 1, true),
('factory_admin', 'factory_admin', '工厂管理员', '工厂级别管理', 2, true),
('worker', 'worker', '工人', '扫码报工', 6, true)
ON CONFLICT (id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_system = EXCLUDED.is_system;

-- 2. 插入权限点
-- =====================================================
INSERT INTO permissions (id, module, action, name, description, sort_order) VALUES
-- 数据概览
('perm_dashboard_view', 'dashboard', 'view', '查看数据大屏', '查看首页数据大屏', 1),
('perm_dashboard_export', 'dashboard', 'export', '导出数据报表', '导出首页数据报表', 2),
('perm_mes_view', 'mes', 'view', '查看MES看板', '查看MES实时看板', 3),
('perm_alert_view', 'alert', 'view', '查看预警系统', '查看预警信息', 4),
('perm_alert_handle', 'alert', 'handle', '处理预警', '处理预警信息', 5),

-- 生产管理
('perm_production_view', 'production', 'view', '查看生产订单', '查看生产订单列表和详情', 10),
('perm_production_create', 'production', 'create', '创建生产订单', '创建新的生产订单', 11),
('perm_production_edit', 'production', 'edit', '编辑生产订单', '编辑生产订单信息', 12),
('perm_production_delete', 'production', 'delete', '删除生产订单', '删除生产订单', 13),
('perm_production_approve', 'production', 'approve', '审批生产订单', '审批生产订单', 14),

-- 生产准备
('perm_prep_view', 'prep', 'view', '查看生产准备', '查看生产准备状态', 20),
('perm_prep_edit', 'prep', 'edit', '编辑生产准备', '编辑生产准备', 21),

-- 裁床管理
('perm_cutting_view', 'cutting', 'view', '查看裁床管理', '查看裁床单', 30),
('perm_cutting_create', 'cutting', 'create', '创建裁床单', '创建新的裁床单', 31),
('perm_cutting_edit', 'cutting', 'edit', '编辑裁床单', '编辑裁床单信息', 32),

-- 裁床分扎
('perm_bundle_view', 'bundle', 'view', '查看裁床分扎', '查看分扎信息', 40),
('perm_bundle_create', 'bundle', 'create', '创建分扎', '创建新的分扎', 41),
('perm_bundle_edit', 'bundle', 'edit', '编辑分扎', '编辑分扎信息', 42),

-- 工序扫码
('perm_scan_view', 'scan', 'view', '查看扫码记录', '查看扫码记录', 50),
('perm_scan_execute', 'scan', 'execute', '执行扫码报工', '执行扫码报工操作', 51),

-- 工序追溯
('perm_tracking_view', 'tracking', 'view', '查看工序追溯', '查看工序追溯', 60),
('perm_tracking_export', 'tracking', 'export', '导出追溯数据', '导出工序追溯数据', 61),

-- 二次工艺
('perm_craft_view', 'craft', 'view', '查看二次工艺', '查看二次工艺', 70),
('perm_craft_create', 'craft', 'create', '创建二次工艺单', '创建二次工艺单', 71),
('perm_craft_edit', 'craft', 'edit', '编辑二次工艺', '编辑二次工艺', 72),

-- 工序配置
('perm_process_view', 'process', 'view', '查看工序配置', '查看工序配置', 80),
('perm_process_create', 'process', 'create', '创建工序', '创建新工序', 81),
('perm_process_edit', 'process', 'edit', '编辑工序', '编辑工序信息', 82),
('perm_process_delete', 'process', 'delete', '删除工序', '删除工序', 83),

-- 款式工序
('perm_style_process_view', 'style_process', 'view', '查看款式工序', '查看款式工序', 90),
('perm_style_process_edit', 'style_process', 'edit', '编辑款式工序', '编辑款式工序', 91),

-- 质量管理
('perm_quality_view', 'quality', 'view', '查看质量管理', '查看质检记录', 100),
('perm_quality_create', 'quality', 'create', '创建质检记录', '创建质检记录', 101),
('perm_quality_edit', 'quality', 'edit', '编辑质检记录', '编辑质检记录', 102),
('perm_quality_approve', 'quality', 'approve', '审批质检结果', '审批质检结果', 103),

-- 成本核算
('perm_cost_view', 'cost', 'view', '查看成本分析', '查看成本分析', 110),
('perm_cost_export', 'cost', 'export', '导出成本报表', '导出成本报表', 111),

-- 库存管理
('perm_inventory_view', 'inventory', 'view', '查看物料库存', '查看物料库存', 120),
('perm_inventory_in', 'inventory', 'in', '物料入库', '物料入库操作', 121),
('perm_inventory_out', 'inventory', 'out', '物料出库', '物料出库操作', 122),
('perm_inventory_adjust', 'inventory', 'adjust', '库存调整', '库存调整操作', 123),

-- 成衣库存
('perm_finished_view', 'finished', 'view', '查看成衣库存', '查看成衣库存', 130),
('perm_finished_in', 'finished', 'in', '成衣入库', '成衣入库操作', 131),
('perm_finished_out', 'finished', 'out', '成衣出库', '成衣出库操作', 132),

-- 装箱管理
('perm_packing_view', 'packing', 'view', '查看装箱管理', '查看装箱管理', 140),
('perm_packing_create', 'packing', 'create', '创建装箱单', '创建装箱单', 141),

-- 出货管理
('perm_shipping_view', 'shipping', 'view', '查看出货管理', '查看出货信息', 150),
('perm_shipping_create', 'shipping', 'create', '创建发货任务', '创建发货任务', 151),
('perm_shipping_edit', 'shipping', 'edit', '编辑发货信息', '编辑发货信息', 152),

-- 外发管理
('perm_outsource_view', 'outsource', 'view', '查看外发订单', '查看外发订单', 160),
('perm_outsource_create', 'outsource', 'create', '创建外发订单', '创建外发订单', 161),
('perm_outsource_edit', 'outsource', 'edit', '编辑外发订单', '编辑外发订单', 162),

-- 供应商管理
('perm_supplier_view', 'supplier', 'view', '查看供应商', '查看供应商列表', 170),
('perm_supplier_create', 'supplier', 'create', '创建供应商', '创建新供应商', 171),
('perm_supplier_edit', 'supplier', 'edit', '编辑供应商', '编辑供应商信息', 172),
('perm_supplier_audit', 'supplier', 'audit', '审核供应商', '审核供应商资质', 173),

-- 供应商付款
('perm_payment_view', 'payment', 'view', '查看付款记录', '查看付款记录', 180),
('perm_payment_create', 'payment', 'create', '创建付款记录', '创建付款记录', 181),
('perm_payment_approve', 'payment', 'approve', '审批付款', '审批付款', 182),

-- 人事管理
('perm_employee_view', 'employee', 'view', '查看员工列表', '查看员工列表', 190),
('perm_employee_create', 'employee', 'create', '创建员工', '创建新员工', 191),
('perm_employee_edit', 'employee', 'edit', '编辑员工', '编辑员工信息', 192),
('perm_employee_delete', 'employee', 'delete', '删除员工', '删除员工', 193),

-- 计件工资
('perm_wage_view', 'wage', 'view', '查看计件工资', '查看计件工资', 200),
('perm_wage_export', 'wage', 'export', '导出工资数据', '导出工资数据', 201),

-- 工资管理
('perm_salary_view', 'salary', 'view', '查看工资管理', '查看工资管理', 210),
('perm_salary_create', 'salary', 'create', '生成工资单', '生成工资单', 211),
('perm_salary_approve', 'salary', 'approve', '审批工资', '审批工资', 212),

-- 财务管理
('perm_finance_view', 'finance', 'view', '查看财务中心', '查看财务中心', 220),
('perm_finance_create', 'finance', 'create', '创建账单', '创建账单', 221),
('perm_finance_edit', 'finance', 'edit', '编辑账单', '编辑账单', 222),

-- 采购管理
('perm_purchase_view', 'purchase', 'view', '查看采购管理', '查看采购管理', 230),
('perm_purchase_create', 'purchase', 'create', '创建采购单', '创建采购单', 231),
('perm_purchase_approve', 'purchase', 'approve', '审批采购单', '审批采购单', 232),

-- 客户管理
('perm_customer_view', 'customer', 'view', '查看客户管理', '查看客户列表', 240),
('perm_customer_create', 'customer', 'create', '创建客户', '创建新客户', 241),
('perm_customer_edit', 'customer', 'edit', '编辑客户', '编辑客户信息', 242),
('perm_customer_delete', 'customer', 'delete', '删除客户', '删除客户', 243),

-- 系统设置
('perm_system_view', 'system', 'view', '查看系统设置', '查看系统设置', 250),
('perm_system_edit', 'system', 'edit', '编辑系统设置', '编辑系统设置', 251),

-- 权限管理
('perm_permission_view', 'permission', 'view', '查看权限管理', '查看权限管理', 260),
('perm_permission_edit', 'permission', 'edit', '编辑权限', '编辑权限配置', 261),

-- 用户管理
('perm_user_view', 'user', 'view', '查看用户列表', '查看用户列表', 270),
('perm_user_create', 'user', 'create', '创建用户', '创建新用户', 271),
('perm_user_edit', 'user', 'edit', '编辑用户', '编辑用户信息', 272),
('perm_user_delete', 'user', 'delete', '删除用户', '删除用户', 273),

-- 通知管理
('perm_notification_view', 'notification', 'view', '查看通知管理', '查看通知管理', 280),
('perm_notification_send', 'notification', 'send', '发送通知', '发送系统通知', 281),

-- AI助手
('perm_ai_view', 'ai', 'view', '使用AI助手', '使用AI助手功能', 290)
ON CONFLICT (module, action) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- 3. 插入角色权限关联
-- =====================================================

-- 总经理 (boss) - 所有权限
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_boss_' || id, 'boss', id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 生产经理 (manager)
INSERT INTO role_permissions (id, role_id, permission_id) VALUES
('rp_manager_1', 'manager', 'perm_dashboard_view'),
('rp_manager_2', 'manager', 'perm_dashboard_export'),
('rp_manager_3', 'manager', 'perm_mes_view'),
('rp_manager_4', 'manager', 'perm_alert_view'),
('rp_manager_5', 'manager', 'perm_alert_handle'),
('rp_manager_6', 'manager', 'perm_production_view'),
('rp_manager_7', 'manager', 'perm_production_create'),
('rp_manager_8', 'manager', 'perm_production_edit'),
('rp_manager_9', 'manager', 'perm_production_approve'),
('rp_manager_10', 'manager', 'perm_prep_view'),
('rp_manager_11', 'manager', 'perm_prep_edit'),
('rp_manager_12', 'manager', 'perm_cutting_view'),
('rp_manager_13', 'manager', 'perm_cutting_create'),
('rp_manager_14', 'manager', 'perm_cutting_edit'),
('rp_manager_15', 'manager', 'perm_bundle_view'),
('rp_manager_16', 'manager', 'perm_tracking_view'),
('rp_manager_17', 'manager', 'perm_tracking_export'),
('rp_manager_18', 'manager', 'perm_process_view'),
('rp_manager_19', 'manager', 'perm_process_create'),
('rp_manager_20', 'manager', 'perm_process_edit'),
('rp_manager_21', 'manager', 'perm_quality_view'),
('rp_manager_22', 'manager', 'perm_cost_view'),
('rp_manager_23', 'manager', 'perm_inventory_view'),
('rp_manager_24', 'manager', 'perm_employee_view'),
('rp_manager_25', 'manager', 'perm_customer_view'),
('rp_manager_26', 'manager', 'perm_supplier_view'),
('rp_manager_27', 'manager', 'perm_outsource_view'),
('rp_manager_28', 'manager', 'perm_outsource_create'),
('rp_manager_29', 'manager', 'perm_shipping_view'),
('rp_manager_30', 'manager', 'perm_ai_view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 生产主管 (production_manager)
INSERT INTO role_permissions (id, role_id, permission_id) VALUES
('rp_pm_1', 'production_manager', 'perm_dashboard_view'),
('rp_pm_2', 'production_manager', 'perm_mes_view'),
('rp_pm_3', 'production_manager', 'perm_alert_view'),
('rp_pm_4', 'production_manager', 'perm_production_view'),
('rp_pm_5', 'production_manager', 'perm_production_create'),
('rp_pm_6', 'production_manager', 'perm_production_edit'),
('rp_pm_7', 'production_manager', 'perm_prep_view'),
('rp_pm_8', 'production_manager', 'perm_prep_edit'),
('rp_pm_9', 'production_manager', 'perm_cutting_view'),
('rp_pm_10', 'production_manager', 'perm_cutting_create'),
('rp_pm_11', 'production_manager', 'perm_cutting_edit'),
('rp_pm_12', 'production_manager', 'perm_bundle_view'),
('rp_pm_13', 'production_manager', 'perm_tracking_view'),
('rp_pm_14', 'production_manager', 'perm_tracking_export'),
('rp_pm_15', 'production_manager', 'perm_process_view'),
('rp_pm_16', 'production_manager', 'perm_process_edit'),
('rp_pm_17', 'production_manager', 'perm_quality_view'),
('rp_pm_18', 'production_manager', 'perm_quality_create'),
('rp_pm_19', 'production_manager', 'perm_quality_edit'),
('rp_pm_20', 'production_manager', 'perm_outsource_view'),
('rp_pm_21', 'production_manager', 'perm_outsource_create'),
('rp_pm_22', 'production_manager', 'perm_outsource_edit'),
('rp_pm_23', 'production_manager', 'perm_wage_view'),
('rp_pm_24', 'production_manager', 'perm_ai_view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 仓库管理员 (warehouse)
INSERT INTO role_permissions (id, role_id, permission_id) VALUES
('rp_wh_1', 'warehouse', 'perm_dashboard_view'),
('rp_wh_2', 'warehouse', 'perm_inventory_view'),
('rp_wh_3', 'warehouse', 'perm_inventory_in'),
('rp_wh_4', 'warehouse', 'perm_inventory_out'),
('rp_wh_5', 'warehouse', 'perm_inventory_adjust'),
('rp_wh_6', 'warehouse', 'perm_finished_view'),
('rp_wh_7', 'warehouse', 'perm_finished_in'),
('rp_wh_8', 'warehouse', 'perm_finished_out'),
('rp_wh_9', 'warehouse', 'perm_packing_view'),
('rp_wh_10', 'warehouse', 'perm_packing_create'),
('rp_wh_11', 'warehouse', 'perm_shipping_view'),
('rp_wh_12', 'warehouse', 'perm_shipping_create'),
('rp_wh_13', 'warehouse', 'perm_shipping_edit')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 质检员 (qc)
INSERT INTO role_permissions (id, role_id, permission_id) VALUES
('rp_qc_1', 'qc', 'perm_dashboard_view'),
('rp_qc_2', 'qc', 'perm_quality_view'),
('rp_qc_3', 'qc', 'perm_quality_create'),
('rp_qc_4', 'qc', 'perm_quality_edit'),
('rp_qc_5', 'qc', 'perm_tracking_view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 财务 (accountant/finance)
INSERT INTO role_permissions (id, role_id, permission_id) VALUES
('rp_fin_1', 'accountant', 'perm_dashboard_view'),
('rp_fin_2', 'accountant', 'perm_finance_view'),
('rp_fin_3', 'accountant', 'perm_finance_create'),
('rp_fin_4', 'accountant', 'perm_finance_edit'),
('rp_fin_5', 'accountant', 'perm_payment_view'),
('rp_fin_6', 'accountant', 'perm_payment_create'),
('rp_fin_7', 'accountant', 'perm_salary_view'),
('rp_fin_8', 'accountant', 'perm_salary_create'),
('rp_fin_9', 'accountant', 'perm_cost_view'),
('rp_fin_10', 'accountant', 'perm_cost_export'),
('rp_fin_11', 'accountant', 'perm_wage_view'),
('rp_fin_12', 'accountant', 'perm_wage_export')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 人事 (hr)
INSERT INTO role_permissions (id, role_id, permission_id) VALUES
('rp_hr_1', 'hr', 'perm_dashboard_view'),
('rp_hr_2', 'hr', 'perm_employee_view'),
('rp_hr_3', 'hr', 'perm_employee_create'),
('rp_hr_4', 'hr', 'perm_employee_edit'),
('rp_hr_5', 'hr', 'perm_employee_delete'),
('rp_hr_6', 'hr', 'perm_salary_view'),
('rp_hr_7', 'hr', 'perm_salary_create'),
('rp_hr_8', 'hr', 'perm_wage_view'),
('rp_hr_9', 'hr', 'perm_wage_export')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 操作员/工人 (operator/worker)
INSERT INTO role_permissions (id, role_id, permission_id) VALUES
('rp_op_1', 'operator', 'perm_scan_view'),
('rp_op_2', 'operator', 'perm_scan_execute'),
('rp_op_3', 'operator', 'perm_wage_view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (id, role_id, permission_id) VALUES
('rp_wk_1', 'worker', 'perm_scan_view'),
('rp_wk_2', 'worker', 'perm_scan_execute'),
('rp_wk_3', 'worker', 'perm_wage_view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 访客 (viewer)
INSERT INTO role_permissions (id, role_id, permission_id) VALUES
('rp_vw_1', 'viewer', 'perm_dashboard_view'),
('rp_vw_2', 'viewer', 'perm_production_view'),
('rp_vw_3', 'viewer', 'perm_inventory_view'),
('rp_vw_4', 'viewer', 'perm_ai_view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 裁床主管 (cutting_manager)
INSERT INTO role_permissions (id, role_id, permission_id) VALUES
('rp_cm_1', 'cutting_manager', 'perm_dashboard_view'),
('rp_cm_2', 'cutting_manager', 'perm_cutting_view'),
('rp_cm_3', 'cutting_manager', 'perm_cutting_create'),
('rp_cm_4', 'cutting_manager', 'perm_cutting_edit'),
('rp_cm_5', 'cutting_manager', 'perm_bundle_view'),
('rp_cm_6', 'cutting_manager', 'perm_bundle_create'),
('rp_cm_7', 'cutting_manager', 'perm_bundle_edit')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 采购 (purchase)
INSERT INTO role_permissions (id, role_id, permission_id) VALUES
('rp_pu_1', 'purchase', 'perm_dashboard_view'),
('rp_pu_2', 'purchase', 'perm_purchase_view'),
('rp_pu_3', 'purchase', 'perm_purchase_create'),
('rp_pu_4', 'purchase', 'perm_supplier_view'),
('rp_pu_5', 'purchase', 'perm_inventory_view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 工艺员 (craft)
INSERT INTO role_permissions (id, role_id, permission_id) VALUES
('rp_craft_1', 'craft', 'perm_dashboard_view'),
('rp_craft_2', 'craft', 'perm_craft_view'),
('rp_craft_3', 'craft', 'perm_craft_create'),
('rp_craft_4', 'craft', 'perm_craft_edit'),
('rp_craft_5', 'craft', 'perm_outsource_view'),
('rp_craft_6', 'craft', 'perm_outsource_create')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 后整主管 (finishing)
INSERT INTO role_permissions (id, role_id, permission_id) VALUES
('rp_fi_1', 'finishing', 'perm_dashboard_view'),
('rp_fi_2', 'finishing', 'perm_finished_view'),
('rp_fi_3', 'finishing', 'perm_finished_in'),
('rp_fi_4', 'finishing', 'perm_packing_view'),
('rp_fi_5', 'finishing', 'perm_packing_create'),
('rp_fi_6', 'finishing', 'perm_quality_view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 系统管理员 (admin)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_admin_' || id, 'admin', id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 工厂管理员 (factory_admin)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_fa_' || id, 'factory_admin', id FROM permissions
WHERE module NOT IN ('permission', 'user', 'system')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. 创建默认管理员用户
-- =====================================================
-- 注意: 开发环境使用明文密码，生产环境请使用bcrypt加密
INSERT INTO users (id, username, password, name, email, role_id, is_active, created_at, updated_at) VALUES
('user_admin_001', 'admin', 'admin123', '系统管理员', 'admin@company.com', 'admin', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role_id = EXCLUDED.role_id,
  is_active = EXCLUDED.is_active;

-- 6. 为管理员分配角色
-- =====================================================
INSERT INTO user_roles (id, user_id, role_id, is_primary, created_at) VALUES
('ur_admin_001', 'user_admin_001', 'admin', true, NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;
