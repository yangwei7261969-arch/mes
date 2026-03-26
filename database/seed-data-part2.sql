-- =====================================================
-- 服装生产管理系统 - 测试数据初始化脚本 (续)
-- =====================================================

-- 11. 裁床记录数据
-- =====================================================
INSERT INTO cutting_records (id, cutting_no, order_id, order_no, style_id, style_no, color, material_id, material_name, material_usage, layer_count, marker_length, marker_efficiency, total_pieces, cutting_date, cutter, cutting_table, status) VALUES
('CR001', 'CT-2024-001', 'PO001', 'PO-2024-001', 'ST001', 'T001', '白色', 'M001', '全棉平纹布', 450, 50, 18.5, 92, 3000, '2024-01-03', '张三', 'A裁床', 'completed'),
('CR002', 'CT-2024-002', 'PO002', 'PO-2024-002', 'ST002', 'T002', '黑色', 'M002', '全棉平纹布', 380, 50, 18.5, 91, 2500, '2024-01-04', '张三', 'A裁床', 'completed'),
('CR003', 'CT-2024-003', 'PO003', 'PO-2024-003', 'ST004', 'S001', '白色', 'M001', '全棉平纹布', 350, 40, 20.0, 89, 1500, '2024-01-05', '李四', 'B裁床', 'completed'),
('CR004', 'CT-2024-004', 'PO004', 'PO-2024-004', 'ST005', 'S002', '蓝色', 'M004', '涤棉斜纹布', 280, 35, 19.5, 90, 1200, '2024-01-06', '李四', 'B裁床', 'completed'),
('CR005', 'CT-2024-005', 'PO009', 'PO-2024-009', 'ST010', 'D002', '纯色', 'M001', '全棉平纹布', 150, 30, 22.0, 88, 600, '2024-01-10', '张三', 'A裁床', 'completed');

-- 12. 裁床分扎数据
-- =====================================================
INSERT INTO cutting_bundles (id, bundle_no, cutting_id, cutting_no, order_id, order_no, size, color, quantity, layer_from, layer_to, status, current_process, current_location, barcode, qrcode) VALUES
('CB001', 'BN-2024-001-01', 'CR001', 'CT-2024-001', 'PO001', 'PO-2024-001', 'S', '白色', 50, 1, 50, 'in_production', '缝制', '缝制线A', 'BN001S', 'QRBN001S'),
('CB002', 'BN-2024-001-02', 'CR001', 'CT-2024-001', 'PO001', 'PO-2024-001', 'M', '白色', 50, 1, 50, 'in_production', '缝制', '缝制线A', 'BN001M', 'QRBN001M'),
('CB003', 'BN-2024-001-03', 'CR001', 'CT-2024-001', 'PO001', 'PO-2024-001', 'L', '白色', 50, 1, 50, 'in_production', '质检', '后整车间', 'BN001L', 'QRBN001L'),
('CB004', 'BN-2024-002-01', 'CR002', 'CT-2024-002', 'PO002', 'PO-2024-002', 'S', '黑色', 40, 1, 40, 'in_production', '缝制', '缝制线A', 'BN002S', 'QRBN002S'),
('CB005', 'BN-2024-002-02', 'CR002', 'CT-2024-002', 'PO002', 'PO-2024-002', 'M', '黑色', 50, 1, 50, 'in_production', '缝制', '缝制线A', 'BN002M', 'QRBN002M'),
('CB006', 'BN-2024-003-01', 'CR003', 'CT-2024-003', 'PO003', 'PO-2024-003', 'S', '白色', 30, 1, 30, 'in_production', '质检', '后整车间', 'BN003S', 'QRBN003S'),
('CB007', 'BN-2024-003-02', 'CR003', 'CT-2024-003', 'PO003', 'PO-2024-003', 'M', '白色', 40, 1, 40, 'in_production', '整烫', '后整车间', 'BN003M', 'QRBN003M'),
('CB008', 'BN-2024-003-03', 'CR003', 'CT-2024-003', 'PO003', 'PO-2024-003', 'L', '白色', 50, 1, 50, 'in_production', '缝制', '缝制线B', 'BN003L', 'QRBN003L'),
('CB009', 'BN-2024-004-01', 'CR004', 'CT-2024-004', 'PO004', 'PO-2024-004', 'S', '蓝色', 25, 1, 25, 'in_production', '缝制', '缝制线B', 'BN004S', 'QRBN004S'),
('CB010', 'BN-2024-004-02', 'CR004', 'CT-2024-004', 'PO004', 'PO-2024-004', 'M', '蓝色', 35, 1, 35, 'in_production', '缝制', '缝制线B', 'BN004M', 'QRBN004M'),
('CB011', 'BN-2024-005-01', 'CR005', 'CT-2024-005', 'PO009', 'PO-2024-009', 'S', '纯色', 20, 1, 20, 'completed', '包装', '包装车间', 'BN005S', 'QRBN005S'),
('CB012', 'BN-2024-005-02', 'CR005', 'CT-2024-005', 'PO009', 'PO-2024-009', 'M', '纯色', 25, 1, 25, 'completed', '包装', '包装车间', 'BN005M', 'QRBN005M');

-- 13. 外发记录数据
-- =====================================================
INSERT INTO bundle_outsource (id, outsource_no, bundle_id, bundle_no, order_id, order_no, supplier_id, supplier_name, process_id, process_name, send_quantity, return_quantity, defect_quantity, unit_price, total_amount, send_date, expected_return_date, actual_return_date, status, sender, quality_status) VALUES
('BO001', 'OS-2024-001', 'CB003', 'BN-2024-001-03', 'PO001', 'PO-2024-001', 'S006', '东莞某某绣花厂', 'P014', '刺绣', 50, 50, 2, 1.50, 75.00, '2024-01-05', '2024-01-08', '2024-01-08', 'returned', '张三', 'qualified'),
('BO002', 'OS-2024-002', 'CB006', 'BN-2024-003-01', 'PO003', 'PO-2024-003', 'S005', '福建某某印花厂', 'P015', '印花', 30, 28, 2, 1.00, 30.00, '2024-01-07', '2024-01-10', '2024-01-10', 'returned', '李四', 'partial_qualified');

-- 14. 质检记录数据
-- =====================================================
INSERT INTO quality_inspections (id, inspection_no, order_id, order_no, bundle_id, bundle_no, process_id, process_name, inspection_type, inspector, inspection_date, sample_quantity, pass_quantity, defect_quantity, defect_rate, result, defect_details, status) VALUES
('QI001', 'QC-2024-001', 'PO001', 'PO-2024-001', 'CB001', 'BN-2024-001-01', 'P012', '质检', 'in_process', '赵六', '2024-01-10', 50, 48, 2, 4.0, 'pass', '{"跳线": 1, "线头": 1}', 'completed'),
('QI002', 'QC-2024-002', 'PO001', 'PO-2024-001', 'CB002', 'BN-2024-001-02', 'P012', '质检', 'in_process', '赵六', '2024-01-10', 50, 50, 0, 0, 'pass', '{}', 'completed'),
('QI003', 'QC-2024-003', 'PO003', 'PO-2024-003', 'CB006', 'BN-2024-003-01', 'P012', '质检', 'in_process', '赵六', '2024-01-11', 30, 28, 2, 6.7, 'pass', '{"印花偏移": 2}', 'completed'),
('QI004', 'QC-2024-004', 'PO009', 'PO-2024-009', 'CB011', 'BN-2024-005-01', 'P012', '质检', 'final', '赵六', '2024-01-15', 20, 20, 0, 0, 'pass', '{}', 'completed'),
('QI005', 'QC-2024-005', 'PO009', 'PO-2024-009', 'CB012', 'BN-2024-005-02', 'P012', '质检', 'final', '赵六', '2024-01-15', 25, 24, 1, 4.0, 'pass', '{"轻微污渍": 1}', 'completed');

-- 15. 发货记录数据
-- =====================================================
INSERT INTO shipments (id, shipment_no, order_id, order_no, customer_id, customer_name, total_quantity, total_boxes, total_weight, shipping_method, carrier, tracking_no, shipping_address, contact_person, contact_phone, planned_date, actual_date, status, shipper) VALUES
('SH001', 'SH-2024-001', 'PO009', 'PO-2024-009', 'C005', '阿迪达斯体育（中国）有限公司', 600, 15, 180.5, 'express', '顺丰速运', 'SF1234567890', '上海市静安区南京西路580号', '孙采购', '13900000005', '2024-01-16', '2024-01-16', 'delivered', '周八'),
('SH002', 'SH-2024-002', 'PO001', 'PO-2024-001', 'C001', '优衣库（中国）有限公司', 1000, 25, 300.2, 'logistics', '德邦物流', 'DB9876543210', '上海市长宁区虹桥路1438号', '张经理', '13900000001', '2024-01-20', NULL, 'pending', '周八');

-- 16. 员工数据
-- =====================================================
INSERT INTO employees (id, employee_no, name, gender, birth_date, phone, department, position, skill_level, skill_types, production_line_id, hire_date, status, base_salary, piece_rate, bank_name, bank_account) VALUES
('E001', 'EMP001', '张三', '男', '1985-03-15', '13800000011', '裁床车间', '裁床工', 'senior', '["裁剪", "打号"]', 'PL004', '2018-01-01', 'active', 5000, 0.50, '工商银行', '6222021234567890001'),
('E002', 'EMP002', '李四', '男', '1988-06-20', '13800000012', '生产部', '生产主管', 'senior', '["缝制", "管理"]', 'PL002', '2019-03-15', 'active', 6000, 0.80, '建设银行', '6227001234567890002'),
('E003', 'EMP003', '王五', '男', '1990-01-10', '13800000013', '生产部', '缝纫工', 'middle', '["缝制"]', 'PL001', '2020-05-20', 'active', 4000, 0.70, '农业银行', '6228481234567890003'),
('E004', 'EMP004', '赵六', '女', '1992-08-25', '13800000014', '质检部', '质检员', 'senior', '["质检"]', NULL, '2019-08-10', 'active', 5000, 0.30, '工商银行', '6222021234567890004'),
('E005', 'EMP005', '孙七', '男', '1995-12-05', '13800000015', '后整车间', '整烫工', 'middle', '["整烫"]', 'PL005', '2021-03-01', 'active', 4200, 0.40, '建设银行', '6227001234567890005'),
('E006', 'EMP006', '周八', '女', '1993-04-18', '13800000016', '包装车间', '包装工', 'junior', '["包装"]', 'PL006', '2020-09-15', 'active', 3800, 0.20, '农业银行', '6228481234567890006'),
('E007', 'EMP007', '吴九', '男', '1987-07-30', '13800000017', '生产部', '缝纫工', 'senior', '["缝制", "装领"]', 'PL001', '2018-06-20', 'active', 4500, 0.90, '工商银行', '6222021234567890007'),
('E008', 'EMP008', '郑十', '女', '1991-11-12', '13800000018', '生产部', '缝纫工', 'middle', '["缝制"]', 'PL002', '2019-11-01', 'active', 4100, 0.70, '建设银行', '6227001234567890008');

-- 17. 考勤数据
-- =====================================================
INSERT INTO attendance (id, employee_id, employee_no, employee_name, attendance_date, check_in_time, check_out_time, work_hours, overtime_hours, status) VALUES
('AT001', 'E001', 'EMP001', '张三', '2024-01-15', '08:00:00', '17:30:00', 9.5, 0, 'normal'),
('AT002', 'E002', 'EMP002', '李四', '2024-01-15', '08:05:00', '17:30:00', 9.42, 0, 'normal'),
('AT003', 'E003', 'EMP003', '王五', '2024-01-15', '08:00:00', '20:00:00', 12, 2.5, 'normal'),
('AT004', 'E004', 'EMP004', '赵六', '2024-01-15', '08:10:00', '17:30:00', 9.33, 0, 'late'),
('AT005', 'E005', 'EMP005', '孙七', '2024-01-15', '08:00:00', '17:30:00', 9.5, 0, 'normal'),
('AT006', 'E006', 'EMP006', '周八', '2024-01-15', '08:00:00', '17:30:00', 9.5, 0, 'normal'),
('AT007', 'E007', 'EMP007', '吴九', '2024-01-15', '08:00:00', '19:00:00', 11, 1.5, 'normal'),
('AT008', 'E008', 'EMP008', '郑十', '2024-01-15', '08:00:00', '17:30:00', 9.5, 0, 'normal');

-- 18. 账单数据
-- =====================================================
INSERT INTO bills (id, bill_no, bill_type, category, related_id, related_no, customer_id, supplier_id, amount, paid_amount, due_date, status, payment_method) VALUES
('B001', 'BI-2024-001', 'receivable', 'order', 'PO009', 'PO-2024-009', 'C005', NULL, 137400.00, 137400.00, '2024-02-15', 'paid', 'bank_transfer'),
('B002', 'BI-2024-002', 'receivable', 'order', 'PO001', 'PO-2024-001', 'C001', NULL, 177000.00, 50000.00, '2024-02-20', 'partial', 'bank_transfer'),
('B003', 'BI-2024-003', 'receivable', 'order', 'PO002', 'PO-2024-002', 'C001', NULL, 147500.00, 0, '2024-02-22', 'pending', NULL),
('B004', 'BI-2024-004', 'payable', 'material', NULL, 'PO-MAT-001', NULL, 'S001', 87500.00, 50000.00, '2024-02-01', 'partial', 'bank_transfer'),
('B005', 'BI-2024-005', 'payable', 'material', NULL, 'PO-MAT-002', NULL, 'S002', 117600.00, 0, '2024-02-05', 'pending', NULL);

-- 19. 通知数据
-- =====================================================
INSERT INTO notifications (id, user_id, type, level, title, content, related_order, is_read, status, created_at) VALUES
('N001', 'U002', 'production', 'info', '新订单创建', '客户优衣库创建了新订单 PO-2024-011', 'PO-2024-011', false, 'unread', NOW() - INTERVAL '2 hours'),
('N002', 'U002', 'overdue', 'critical', '订单即将超期', '订单 PO-2024-001 距离交货日期仅剩3天', 'PO-2024-001', false, 'unread', NOW() - INTERVAL '1 hour'),
('N003', 'U004', 'inventory', 'warning', '库存预警', '物料「全棉平纹布-红色」库存不足，当前库存150米', NULL, true, 'read', NOW() - INTERVAL '1 day'),
('N004', 'U005', 'quality', 'warning', '质检异常', '订单 PO-2024-003 发现质量问题，请及时处理', 'PO-2024-003', false, 'unread', NOW() - INTERVAL '30 minutes'),
('N005', 'U006', 'payment', 'info', '付款提醒', '供应商绍兴某某纺织有限公司的付款将于3天后到期', NULL, false, 'unread', NOW() - INTERVAL '3 hours'),
('N006', NULL, 'shipping', 'info', '发货通知', '订单 PO-2024-009 已发货，物流单号：SF1234567890', 'PO-2024-009', false, 'unread', NOW() - INTERVAL '6 hours'),
('N007', 'U002', 'system', 'info', '系统维护通知', '系统将于今晚22:00-23:00进行维护，届时系统将暂停服务', NULL, false, 'unread', NOW() - INTERVAL '4 hours');

-- 20. 系统配置数据
-- =====================================================
INSERT INTO system_config (id, key, value, description, category, is_public) VALUES
('CFG001', 'company_name', '某某服装有限公司', '公司名称', 'basic', true),
('CFG002', 'company_address', '浙江省杭州市滨江区某某路123号', '公司地址', 'basic', true),
('CFG003', 'company_phone', '0571-12345678', '公司电话', 'basic', true),
('CFG004', 'default_payment_terms', '月结30天', '默认付款条件', 'business', false),
('CFG005', 'inventory_alert_threshold', '0.8', '库存预警阈值（相对于安全库存的比例）', 'inventory', false),
('CFG006', 'quality_aql_level', '2.5', '默认AQL水平', 'quality', false),
('CFG007', 'production_report_time', '17:30', '生产日报生成时间', 'system', false),
('CFG008', 'backup_schedule', '0 2 * * *', '数据库备份时间（cron表达式）', 'system', false);

-- 21. 设备数据
-- =====================================================
INSERT INTO equipment (id, equipment_no, name, type, brand, model, serial_number, production_line_id, purchase_date, purchase_price, warranty_months, status, last_maintenance_date, next_maintenance_date, daily_capacity, efficiency) VALUES
('EQ001', 'EQ-001', '裁床机1号', 'cutting_machine', '力克', 'Vector', 'LEC001', 'PL004', '2020-01-15', 280000, 36, 'normal', '2023-12-01', '2024-03-01', 800, 95),
('EQ002', 'EQ-002', '平缝机1号', 'sewing_machine', '重机', 'DDL-9000', 'JUK001', 'PL001', '2021-03-20', 12000, 24, 'normal', '2024-01-05', '2024-04-05', 150, 92),
('EQ003', 'EQ-003', '平缝机2号', 'sewing_machine', '重机', 'DDL-9000', 'JUK002', 'PL001', '2021-03-20', 12000, 24, 'maintenance', '2024-01-10', '2024-04-10', 150, 88),
('EQ004', 'EQ-004', '双针机1号', 'sewing_machine', '兄弟', 'LT2-B845', 'BRO001', 'PL001', '2022-05-10', 18000, 24, 'normal', '2024-01-08', '2024-04-08', 120, 90),
('EQ005', 'EQ-005', '锁眼机1号', 'sewing_machine', '重机', 'LBH-1790', 'JUK003', 'PL002', '2021-06-15', 25000, 24, 'normal', '2024-01-06', '2024-04-06', 200, 93),
('EQ006', 'EQ-006', '钉扣机1号', 'sewing_machine', '重机', 'MB-1800', 'JUK004', 'PL002', '2021-06-15', 22000, 24, 'normal', '2024-01-06', '2024-04-06', 250, 94),
('EQ007', 'EQ-007', '蒸汽熨斗1号', 'iron', '佳友', 'YS-308', 'JIA001', 'PL005', '2020-08-20', 3500, 12, 'normal', '2024-01-02', '2024-02-02', 200, 96),
('EQ008', 'EQ-008', '自动包装机1号', 'packing_machine', '永创', 'YP-300', 'YON001', 'PL006', '2022-10-10', 45000, 24, 'normal', '2023-12-15', '2024-03-15', 500, 95);

COMMIT;
