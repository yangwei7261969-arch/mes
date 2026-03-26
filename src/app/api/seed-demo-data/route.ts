import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 完整演示数据种子API
 * 为所有页面提供丰富的演示数据
 */

// 辅助函数：生成随机ID
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const results: string[] = [];
  const counts: Record<string, number> = {};

  try {
    // ==========================================
    // 1. 角色数据
    // ==========================================
    const roles = [
      { id: 'admin', name: '系统管理员', description: '拥有所有权限' },
      { id: 'boss', name: '老板', description: '查看所有数据' },
      { id: 'manager', name: '经理', description: '管理日常业务' },
      { id: 'production_manager', name: '生产主管', description: '管理生产流程' },
      { id: 'warehouse', name: '仓库管理员', description: '管理库存' },
      { id: 'qc', name: '质检员', description: '质量检验' },
      { id: 'finance', name: '财务', description: '财务管理' },
      { id: 'hr', name: '人事', description: '人事管理' },
      { id: 'purchase', name: '采购', description: '采购管理' },
      { id: 'worker', name: '工人', description: '生产线工人' },
      { id: 'cutting_manager', name: '裁床主管', description: '管理裁床' },
      { id: 'factory_admin', name: '工厂管理员', description: '工厂管理' },
    ];

    try {
      for (const role of roles) {
        await client.from('roles').upsert(role, { onConflict: 'id' });
      }
      results.push('✅ 创建角色数据');
      counts.roles = roles.length;
    } catch (e) {
      results.push('⚠️ 角色数据已存在');
    }

    // ==========================================
    // 2. 用户数据
    // ==========================================
    const users = [
      { id: 'user-001', username: 'admin', password: 'admin123', name: '系统管理员', email: 'admin@company.com', role_id: 'admin', department: '信息部', status: 'active' },
      { id: 'user-002', username: 'boss', password: 'boss123', name: '张总', email: 'boss@company.com', role_id: 'boss', department: '管理层', status: 'active' },
      { id: 'user-003', username: 'manager', password: 'manager123', name: '李经理', email: 'manager@company.com', role_id: 'manager', department: '管理部', status: 'active' },
      { id: 'user-004', username: 'production', password: 'prod123', name: '王主管', email: 'production@company.com', role_id: 'production_manager', department: '生产部', status: 'active' },
      { id: 'user-005', username: 'warehouse', password: 'wh123', name: '赵仓管', email: 'warehouse@company.com', role_id: 'warehouse', department: '仓库', status: 'active' },
      { id: 'user-006', username: 'qc', password: 'qc123', name: '刘质检', email: 'qc@company.com', role_id: 'qc', department: '质检部', status: 'active' },
      { id: 'user-007', username: 'finance', password: 'fin123', name: '陈财务', email: 'finance@company.com', role_id: 'finance', department: '财务部', status: 'active' },
      { id: 'user-008', username: 'hr', password: 'hr123', name: '周人事', email: 'hr@company.com', role_id: 'hr', department: '人事部', status: 'active' },
    ];

    // 清空现有用户数据后重新创建
    try {
      await client.from('users').delete().neq('id', 'dummy');
      for (const user of users) {
        await client.from('users').insert(user);
      }
      results.push('✅ 创建用户数据');
      counts.users = users.length;
    } catch (e) {
      console.error('创建用户失败:', e);
      results.push('⚠️ 用户数据创建失败');
    }

    // ==========================================
    // 3. 客户数据
    // ==========================================
    const customerId1 = generateId();
    const customerId2 = generateId();
    const customerId3 = generateId();
    const customerId4 = generateId();
    const customerId5 = generateId();
    const customerId6 = generateId();

    const customers = [
      { id: customerId1, name: '优衣库服饰有限公司', code: 'C001', contact_person: '张采购', phone: '13800001001', email: 'zhang@uniqlo.com', city: '上海', credit_level: 'excellent', payment_terms: '月结30天', status: 'active' },
      { id: customerId2, name: 'H&M中国', code: 'C002', contact_person: '李经理', phone: '13800001002', email: 'li@hm.com', city: '广州', credit_level: 'excellent', payment_terms: '月结45天', status: 'active' },
      { id: customerId3, name: 'ZARA中国', code: 'C003', contact_person: '王总监', phone: '13800001003', email: 'wang@zara.com', city: '北京', credit_level: 'good', payment_terms: '月结30天', status: 'active' },
      { id: customerId4, name: '太平鸟服饰', code: 'C004', contact_person: '赵主管', phone: '13800001004', email: 'zhao@peacebird.com', city: '宁波', credit_level: 'good', payment_terms: '月结15天', status: 'active' },
      { id: customerId5, name: '森马服饰', code: 'C005', contact_person: '孙经理', phone: '13800001005', email: 'sun@semir.com', city: '温州', credit_level: 'normal', payment_terms: '月结30天', status: 'active' },
      { id: customerId6, name: '美特斯邦威', code: 'C006', contact_person: '周采购', phone: '13800001006', email: 'zhou@metersbonwe.com', city: '上海', credit_level: 'good', payment_terms: '月结30天', status: 'active' },
    ];

    try {
      for (const customer of customers) {
        await client.from('customers').upsert(customer, { onConflict: 'code' });
      }
      results.push('✅ 创建客户数据');
      counts.customers = customers.length;
    } catch (e) {
      results.push('⚠️ 客户数据已存在');
    }

    // ==========================================
    // 4. 供应商数据
    // ==========================================
    const suppliers = [
      { id: 'sup-001', name: '优质纺织原料有限公司', code: 'S001', type: 'material', contact_person: '陈经理', phone: '13900001001', email: 'chen@textile.com', city: '绍兴', credit_level: 'excellent', lead_time_days: 7, rating: 4.8, status: 'active' },
      { id: 'sup-002', name: '精工辅料商行', code: 'S002', type: 'material', contact_person: '林老板', phone: '13900001002', email: 'lin@accessories.com', city: '广州', credit_level: 'good', lead_time_days: 5, rating: 4.5, status: 'active' },
      { id: 'sup-003', name: '华美刺绣加工厂', code: 'S003', type: 'outsource', contact_person: '吴厂长', phone: '13900001003', email: 'wu@embroidery.com', city: '东莞', credit_level: 'excellent', lead_time_days: 3, rating: 4.9, status: 'active' },
      { id: 'sup-004', name: '通达印染厂', code: 'S004', type: 'outsource', contact_person: '郑经理', phone: '13900001004', email: 'zheng@dyeing.com', city: '佛山', credit_level: 'good', lead_time_days: 5, rating: 4.3, status: 'active' },
      { id: 'sup-005', name: '鑫源纽扣厂', code: 'S005', type: 'material', contact_person: '黄总', phone: '13900001005', email: 'huang@button.com', city: '温州', credit_level: 'normal', lead_time_days: 3, rating: 4.0, status: 'active' },
      { id: 'sup-006', name: '永盛水洗厂', code: 'S006', type: 'outsource', contact_person: '许老板', phone: '13900001006', email: 'xu@washing.com', city: '中山', credit_level: 'good', lead_time_days: 4, rating: 4.2, status: 'active' },
    ];

    try {
      for (const supplier of suppliers) {
        await client.from('suppliers').upsert(supplier, { onConflict: 'code' });
      }
      results.push('✅ 创建供应商数据');
      counts.suppliers = suppliers.length;
    } catch (e) {
      results.push('⚠️ 供应商数据已存在');
    }

    // ==========================================
    // 5. 物料分类
    // ==========================================
    const materialCategories = [
      { id: 'cat-001', name: '面料', code: 'FABRIC', description: '各种面料原料' },
      { id: 'cat-002', name: '里料', code: 'LINING', description: '服装里料' },
      { id: 'cat-003', name: '辅料-拉链', code: 'ZIPPER', description: '各类拉链' },
      { id: 'cat-004', name: '辅料-纽扣', code: 'BUTTON', description: '各类纽扣' },
      { id: 'cat-005', name: '辅料-缝纫线', code: 'THREAD', description: '缝纫用线' },
      { id: 'cat-006', name: '辅料-衬布', code: 'INTERLINING', description: '粘合衬、衬布' },
      { id: 'cat-007', name: '包装材料', code: 'PACKAGING', description: '包装袋、吊牌等' },
    ];

    try {
      for (const cat of materialCategories) {
        await client.from('material_categories').upsert(cat, { onConflict: 'code' });
      }
      results.push('✅ 创建物料分类');
      counts.materialCategories = materialCategories.length;
    } catch (e) {
      results.push('⚠️ 物料分类已存在');
    }

    // ==========================================
    // 6. 物料数据
    // ==========================================
    const materials = [
      { id: 'mat-001', name: '纯棉针织布', code: 'M001', category_id: 'cat-001', type: 'fabric', unit: '公斤', color: '白色', specification: '40S/1 180g/㎡', width: 150, weight: 180, composition: '100%棉', supplier_id: 'sup-001', unit_price: 45, safety_stock: 500, current_stock: 1200, location: 'A-01-01', status: 'active' },
      { id: 'mat-002', name: '涤棉混纺布', code: 'M002', category_id: 'cat-001', type: 'fabric', unit: '公斤', color: '黑色', specification: 'T/C 65/35 200g/㎡', width: 150, weight: 200, composition: '65%涤35%棉', supplier_id: 'sup-001', unit_price: 38, safety_stock: 400, current_stock: 800, location: 'A-01-02', status: 'active' },
      { id: 'mat-003', name: '弹力牛仔布', code: 'M003', category_id: 'cat-001', type: 'fabric', unit: '米', color: '深蓝', specification: '10OZ 2%弹力', width: 145, weight: 340, composition: '98%棉2%氨纶', supplier_id: 'sup-001', unit_price: 52, safety_stock: 300, current_stock: 450, location: 'A-02-01', status: 'active' },
      { id: 'mat-004', name: '尼龙拉链', code: 'M004', category_id: 'cat-003', type: 'accessory', unit: '条', color: '黑色', specification: '3# 60cm', supplier_id: 'sup-002', unit_price: 1.5, safety_stock: 2000, current_stock: 3500, location: 'B-01-01', status: 'active' },
      { id: 'mat-005', name: '金属拉链', code: 'M005', category_id: 'cat-003', type: 'accessory', unit: '条', color: '金色', specification: '5# 50cm', supplier_id: 'sup-002', unit_price: 3.8, safety_stock: 1000, current_stock: 1200, location: 'B-01-02', status: 'active' },
      { id: 'mat-006', name: '树脂纽扣', code: 'M006', category_id: 'cat-004', type: 'accessory', unit: '颗', color: '黑色', specification: '18mm 四眼', supplier_id: 'sup-005', unit_price: 0.15, safety_stock: 5000, current_stock: 8000, location: 'B-02-01', status: 'active' },
      { id: 'mat-007', name: '金属纽扣', code: 'M007', category_id: 'cat-004', type: 'accessory', unit: '颗', color: '银色', specification: '20mm 四合扣', supplier_id: 'sup-005', unit_price: 0.8, safety_stock: 2000, current_stock: 2500, location: 'B-02-02', status: 'active' },
      { id: 'mat-008', name: '涤纶缝纫线', code: 'M008', category_id: 'cat-005', type: 'accessory', unit: '个', color: '白色', specification: '40S/2 5000m', supplier_id: 'sup-002', unit_price: 12, safety_stock: 100, current_stock: 180, location: 'B-03-01', status: 'active' },
      { id: 'mat-009', name: '粘合衬', code: 'M009', category_id: 'cat-006', type: 'accessory', unit: '米', color: '白色', specification: '20g/㎡ 无纺', supplier_id: 'sup-002', unit_price: 8, safety_stock: 200, current_stock: 350, location: 'A-03-01', status: 'active' },
      { id: 'mat-010', name: 'PP包装袋', code: 'M010', category_id: 'cat-007', type: 'packaging', unit: '个', color: '透明', specification: '30*40cm', supplier_id: 'sup-002', unit_price: 0.3, safety_stock: 5000, current_stock: 8000, location: 'C-01-01', status: 'active' },
    ];

    try {
      for (const material of materials) {
        await client.from('materials').upsert(material, { onConflict: 'code' });
      }
      results.push('✅ 创建物料数据');
      counts.materials = materials.length;
    } catch (e) {
      results.push('⚠️ 物料数据已存在');
    }

    // ==========================================
    // 7. 款式数据
    // ==========================================
    const styles = [
      { id: 'style-001', style_no: 'ST2025001', name: '经典圆领T恤', category: 'T恤', season: '春夏', year: 2025, color: '白色/黑色/灰色', size_range: 'S,M,L,XL,XXL', base_price: 89, cost_price: 35, status: 'active' },
      { id: 'style-002', style_no: 'ST2025002', name: '时尚V领连衣裙', category: '连衣裙', season: '春夏', year: 2025, color: '黑色/红色/蓝色', size_range: 'S,M,L,XL', base_price: 269, cost_price: 98, status: 'active' },
      { id: 'style-003', style_no: 'ST2025003', name: '休闲直筒裤', category: '裤子', season: '四季', year: 2025, color: '深蓝/浅蓝/黑色', size_range: '26,28,30,32,34', base_price: 199, cost_price: 68, status: 'active' },
      { id: 'style-004', style_no: 'ST2025004', name: '商务衬衫', category: '衬衫', season: '四季', year: 2025, color: '白色/浅蓝/粉色', size_range: '38,40,42,44,46', base_price: 259, cost_price: 85, status: 'active' },
      { id: 'style-005', style_no: 'ST2025005', name: '针织开衫', category: '外套', season: '秋冬', year: 2025, color: '米色/灰色/藏青', size_range: 'S,M,L,XL', base_price: 329, cost_price: 120, status: 'active' },
      { id: 'style-006', style_no: 'ST2025006', name: '牛仔夹克', category: '外套', season: '四季', year: 2025, color: '深蓝/浅蓝', size_range: 'S,M,L,XL,XXL', base_price: 459, cost_price: 168, status: 'active' },
    ];

    try {
      for (const style of styles) {
        await client.from('styles').upsert(style, { onConflict: 'style_no' });
      }
      results.push('✅ 创建款式数据');
      counts.styles = styles.length;
    } catch (e) {
      results.push('⚠️ 款式数据已存在');
    }

    // ==========================================
    // 8. 生产线数据
    // ==========================================
    const productionLines = [
      { id: 'line-001', name: 'A线', code: 'A', type: 'sewing', capacity_per_day: 500, efficiency: 92, manager: '张主管', status: 'active', location: '一号车间' },
      { id: 'line-002', name: 'B线', code: 'B', type: 'sewing', capacity_per_day: 450, efficiency: 88, manager: '李主管', status: 'active', location: '一号车间' },
      { id: 'line-003', name: 'C线', code: 'C', type: 'sewing', capacity_per_day: 480, efficiency: 95, manager: '王主管', status: 'active', location: '二号车间' },
      { id: 'line-004', name: 'D线', code: 'D', type: 'sewing', capacity_per_day: 420, efficiency: 90, manager: '赵主管', status: 'maintenance', location: '二号车间' },
      { id: 'line-005', name: '裁床组', code: 'CUT', type: 'cutting', capacity_per_day: 1000, efficiency: 98, manager: '刘裁床', status: 'active', location: '裁床车间' },
      { id: 'line-006', name: '尾部组', code: 'FIN', type: 'finishing', capacity_per_day: 800, efficiency: 94, manager: '陈尾部', status: 'active', location: '尾部车间' },
    ];

    try {
      for (const line of productionLines) {
        await client.from('production_lines').upsert(line, { onConflict: 'code' });
      }
      results.push('✅ 创建生产线数据');
      counts.productionLines = productionLines.length;
    } catch (e) {
      results.push('⚠️ 生产线数据已存在');
    }

    // ==========================================
    // 9. 工序数据
    // ==========================================
    const processes = [
      { id: 'proc-001', name: '裁剪', code: 'CUT001', category: 'cutting', sequence: 1, standard_time: 2.5, standard_rate: 0.8, description: '面料裁剪' },
      { id: 'proc-002', name: '粘衬', code: 'CUT002', category: 'cutting', sequence: 2, standard_time: 1.5, standard_rate: 0.5, description: '粘合衬烫压' },
      { id: 'proc-003', name: '合肩缝', code: 'SEW001', category: 'sewing', sequence: 10, standard_time: 1.2, standard_rate: 0.4, description: '前后片肩部缝合' },
      { id: 'proc-004', name: '合侧缝', code: 'SEW002', category: 'sewing', sequence: 11, standard_time: 1.8, standard_rate: 0.6, description: '侧缝缝合' },
      { id: 'proc-005', name: '上领', code: 'SEW003', category: 'sewing', sequence: 12, standard_time: 3.0, standard_rate: 1.0, description: '领子安装' },
      { id: 'proc-006', name: '上袖', code: 'SEW004', category: 'sewing', sequence: 13, standard_time: 2.5, standard_rate: 0.8, description: '袖子安装' },
      { id: 'proc-007', name: '卷边', code: 'SEW005', category: 'sewing', sequence: 14, standard_time: 1.0, standard_rate: 0.3, description: '下摆卷边' },
      { id: 'proc-008', name: '锁眼', code: 'SEW006', category: 'sewing', sequence: 15, standard_time: 0.5, standard_rate: 0.2, description: '扣眼锁边' },
      { id: 'proc-009', name: '钉扣', code: 'SEW007', category: 'sewing', sequence: 16, standard_time: 0.5, standard_rate: 0.2, description: '钉纽扣' },
      { id: 'proc-010', name: '整烫', code: 'FIN001', category: 'ironing', sequence: 20, standard_time: 2.0, standard_rate: 0.6, description: '成品整烫' },
      { id: 'proc-011', name: '质检', code: 'QC001', category: 'inspection', sequence: 25, standard_time: 1.5, standard_rate: 0.5, description: '质量检验', is_quality_point: true },
      { id: 'proc-012', name: '包装', code: 'FIN002', category: 'packing', sequence: 30, standard_time: 1.0, standard_rate: 0.3, description: '成品包装' },
    ];

    try {
      for (const process of processes) {
        await client.from('processes').upsert(process, { onConflict: 'code' });
      }
      results.push('✅ 创建工序数据');
      counts.processes = processes.length;
    } catch (e) {
      results.push('⚠️ 工序数据已存在');
    }

    // ==========================================
    // 10. 员工数据
    // ==========================================
    const employees = [
      { id: 'emp-001', employee_no: 'EMP001', name: '张三', gender: '男', phone: '13700001001', department: '生产部', position: '缝纫工', skill_level: '高级', production_line_id: 'line-001', hire_date: '2020-03-15', status: 'active', base_salary: 4500, piece_rate: 1.2 },
      { id: 'emp-002', employee_no: 'EMP002', name: '李四', gender: '女', phone: '13700001002', department: '生产部', position: '缝纫工', skill_level: '中级', production_line_id: 'line-001', hire_date: '2021-06-20', status: 'active', base_salary: 4000, piece_rate: 1.0 },
      { id: 'emp-003', employee_no: 'EMP003', name: '王五', gender: '男', phone: '13700001003', department: '生产部', position: '裁床工', skill_level: '高级', production_line_id: 'line-005', hire_date: '2019-08-10', status: 'active', base_salary: 5000, piece_rate: 1.3 },
      { id: 'emp-004', employee_no: 'EMP004', name: '赵六', gender: '女', phone: '13700001004', department: '质检部', position: '质检员', skill_level: '高级', hire_date: '2020-01-05', status: 'active', base_salary: 4800, piece_rate: 1.0 },
      { id: 'emp-005', employee_no: 'EMP005', name: '钱七', gender: '男', phone: '13700001005', department: '尾部车间', position: '整烫工', skill_level: '中级', production_line_id: 'line-006', hire_date: '2022-02-28', status: 'active', base_salary: 4200, piece_rate: 1.0 },
      { id: 'emp-006', employee_no: 'EMP006', name: '孙八', gender: '女', phone: '13700001006', department: '生产部', position: '缝纫工', skill_level: '初级', production_line_id: 'line-002', hire_date: '2023-04-15', status: 'active', base_salary: 3500, piece_rate: 0.8 },
      { id: 'emp-007', employee_no: 'EMP007', name: '周九', gender: '男', phone: '13700001007', department: '仓库', position: '仓库管理员', skill_level: '中级', hire_date: '2021-09-01', status: 'active', base_salary: 4500, piece_rate: 1.0 },
      { id: 'emp-008', employee_no: 'EMP008', name: '吴十', gender: '女', phone: '13700001008', department: '生产部', position: '缝纫工', skill_level: '中级', production_line_id: 'line-003', hire_date: '2022-07-10', status: 'active', base_salary: 4000, piece_rate: 1.0 },
    ];

    try {
      for (const employee of employees) {
        await client.from('employees').upsert(employee, { onConflict: 'employee_no' });
      }
      results.push('✅ 创建员工数据');
      counts.employees = employees.length;
    } catch (e) {
      results.push('⚠️ 员工数据已存在');
    }

    // ==========================================
    // 11. 生产订单数据
    // ==========================================
    const productionOrders = [
      { id: 'ord-001', order_no: 'PO202501001', customer_id: customerId1, style_id: 'style-001', style_no: 'ST2025001', style_name: '经典圆领T恤', color: '白色', total_quantity: 2000, size_breakdown: { 'S': 400, 'M': 600, 'L': 500, 'XL': 300, 'XXL': 200 }, unit_price: 45, total_amount: 90000, order_date: '2025-01-05', delivery_date: '2025-01-25', status: 'in_progress', progress: 65, priority: 'high', production_line_id: 'line-001' },
      { id: 'ord-002', order_no: 'PO202501002', customer_id: customerId2, style_id: 'style-002', style_no: 'ST2025002', style_name: '时尚V领连衣裙', color: '黑色', total_quantity: 800, size_breakdown: { 'S': 200, 'M': 300, 'L': 200, 'XL': 100 }, unit_price: 128, total_amount: 102400, order_date: '2025-01-03', delivery_date: '2025-01-28', status: 'in_progress', progress: 45, priority: 'urgent', production_line_id: 'line-002' },
      { id: 'ord-003', order_no: 'PO202501003', customer_id: customerId3, style_id: 'style-003', style_no: 'ST2025003', style_name: '休闲直筒裤', color: '深蓝', total_quantity: 1500, size_breakdown: { '26': 200, '28': 300, '30': 400, '32': 350, '34': 250 }, unit_price: 85, total_amount: 127500, order_date: '2025-01-08', delivery_date: '2025-02-05', status: 'pending', progress: 0, priority: 'normal', production_line_id: 'line-003' },
      { id: 'ord-004', order_no: 'PO202501004', customer_id: customerId4, style_id: 'style-004', style_no: 'ST2025004', style_name: '商务衬衫', color: '白色', total_quantity: 1000, size_breakdown: { '38': 150, '40': 250, '42': 300, '44': 200, '46': 100 }, unit_price: 95, total_amount: 95000, order_date: '2025-01-10', delivery_date: '2025-02-10', status: 'pending', progress: 0, priority: 'normal' },
      { id: 'ord-005', order_no: 'PO202412015', customer_id: customerId5, style_id: 'style-005', style_no: 'ST2025005', style_name: '针织开衫', color: '米色', total_quantity: 600, size_breakdown: { 'S': 150, 'M': 200, 'L': 150, 'XL': 100 }, unit_price: 138, total_amount: 82800, order_date: '2024-12-15', delivery_date: '2025-01-15', status: 'completed', progress: 100, priority: 'normal', production_line_id: 'line-001' },
      { id: 'ord-006', order_no: 'PO202412018', customer_id: customerId6, style_id: 'style-006', style_no: 'ST2025006', style_name: '牛仔夹克', color: '深蓝', total_quantity: 400, size_breakdown: { 'S': 80, 'M': 120, 'L': 100, 'XL': 60, 'XXL': 40 }, unit_price: 188, total_amount: 75200, order_date: '2024-12-18', delivery_date: '2025-01-20', status: 'completed', progress: 100, priority: 'high', production_line_id: 'line-003' },
    ];

    try {
      for (const order of productionOrders) {
        await client.from('production_orders').upsert(order, { onConflict: 'order_no' });
      }
      results.push('✅ 创建生产订单数据');
      counts.productionOrders = productionOrders.length;
    } catch (e) {
      results.push('⚠️ 生产订单数据已存在');
    }

    // ==========================================
    // 12. 裁床记录数据
    // ==========================================
    const cuttingRecords = [
      { id: 'cut-001', cutting_no: 'CUT202501001', order_id: 'ord-001', order_no: 'PO202501001', style_id: 'style-001', style_no: 'ST2025001', color: '白色', material_id: 'mat-001', material_name: '纯棉针织布', material_usage: 180, layer_count: 100, marker_length: 12.5, marker_efficiency: 85.5, total_pieces: 2000, cutting_date: '2025-01-06', cutter: '王五', cutting_table: 'CT-01', status: 'completed' },
      { id: 'cut-002', cutting_no: 'CUT202501002', order_id: 'ord-002', order_no: 'PO202501002', style_id: 'style-002', style_no: 'ST2025002', color: '黑色', material_id: 'mat-002', material_name: '涤棉混纺布', material_usage: 95, layer_count: 80, marker_length: 15.2, marker_efficiency: 82.3, total_pieces: 800, cutting_date: '2025-01-05', cutter: '王五', cutting_table: 'CT-01', status: 'completed' },
      { id: 'cut-003', cutting_no: 'CUT202501003', order_id: 'ord-003', order_no: 'PO202501003', style_id: 'style-003', style_no: 'ST2025003', color: '深蓝', material_id: 'mat-003', material_name: '弹力牛仔布', material_usage: 0, layer_count: 0, marker_length: 0, marker_efficiency: 0, total_pieces: 0, cutting_date: '2025-01-12', cutter: '王五', cutting_table: 'CT-02', status: 'pending' },
    ];

    try {
      for (const record of cuttingRecords) {
        await client.from('cutting_records').upsert(record, { onConflict: 'cutting_no' });
      }
      results.push('✅ 创建裁床记录数据');
      counts.cuttingRecords = cuttingRecords.length;
    } catch (e) {
      results.push('⚠️ 裁床记录数据已存在');
    }

    // ==========================================
    // 13. 裁床分扎数据
    // ==========================================
    const cuttingBundles = [
      { id: 'bundle-001', bundle_no: 'B20250106-001', cutting_id: 'cut-001', cutting_no: 'CUT202501001', order_id: 'ord-001', order_no: 'PO202501001', size: 'S', color: '白色', quantity: 400, layer_from: 1, layer_to: 100, status: 'in_progress', current_process: '合肩缝', barcode: 'BC20250106001' },
      { id: 'bundle-002', bundle_no: 'B20250106-002', cutting_id: 'cut-001', cutting_no: 'CUT202501001', order_id: 'ord-001', order_no: 'PO202501001', size: 'M', color: '白色', quantity: 600, layer_from: 1, layer_to: 100, status: 'in_progress', current_process: '合肩缝', barcode: 'BC20250106002' },
      { id: 'bundle-003', bundle_no: 'B20250106-003', cutting_id: 'cut-001', cutting_no: 'CUT202501001', order_id: 'ord-001', order_no: 'PO202501001', size: 'L', color: '白色', quantity: 500, layer_from: 1, layer_to: 100, status: 'pending', current_process: '', barcode: 'BC20250106003' },
      { id: 'bundle-004', bundle_no: 'B20250105-001', cutting_id: 'cut-002', cutting_no: 'CUT202501002', order_id: 'ord-002', order_no: 'PO202501002', size: 'S', color: '黑色', quantity: 200, layer_from: 1, layer_to: 80, status: 'in_progress', current_process: '上领', barcode: 'BC20250105001' },
      { id: 'bundle-005', bundle_no: 'B20250105-002', cutting_id: 'cut-002', cutting_no: 'CUT202501002', order_id: 'ord-002', order_no: 'PO202501002', size: 'M', color: '黑色', quantity: 300, layer_from: 1, layer_to: 80, status: 'in_progress', current_process: '合侧缝', barcode: 'BC20250105002' },
    ];

    try {
      for (const bundle of cuttingBundles) {
        await client.from('cutting_bundles').upsert(bundle, { onConflict: 'bundle_no' });
      }
      results.push('✅ 创建裁床分扎数据');
      counts.cuttingBundles = cuttingBundles.length;
    } catch (e) {
      results.push('⚠️ 裁床分扎数据已存在');
    }

    // ==========================================
    // 14. 工票数据
    // ==========================================
    const workTickets = [
      { id: 'ticket-001', ticket_no: 'TK20250106001', bundle_id: 'bundle-001', bundle_no: 'B20250106-001', order_id: 'ord-001', order_no: 'PO202501001', process_id: 'proc-003', process_name: '合肩缝', employee_id: 'emp-001', employee_name: '张三', quantity: 400, completed_quantity: 380, defect_quantity: 5, unit_price: 0.4, total_amount: 152, status: 'in_progress', scan_time: '2025-01-07T08:30:00Z' },
      { id: 'ticket-002', ticket_no: 'TK20250106002', bundle_id: 'bundle-001', bundle_no: 'B20250106-001', order_id: 'ord-001', order_no: 'PO202501001', process_id: 'proc-004', process_name: '合侧缝', employee_id: 'emp-002', employee_name: '李四', quantity: 400, completed_quantity: 350, defect_quantity: 3, unit_price: 0.6, total_amount: 210, status: 'in_progress', scan_time: '2025-01-07T09:00:00Z' },
      { id: 'ticket-003', ticket_no: 'TK20250105001', bundle_id: 'bundle-004', bundle_no: 'B20250105-001', order_id: 'ord-002', order_no: 'PO202501002', process_id: 'proc-005', process_name: '上领', employee_id: 'emp-001', employee_name: '张三', quantity: 200, completed_quantity: 180, defect_quantity: 2, unit_price: 1.0, total_amount: 180, status: 'in_progress', scan_time: '2025-01-06T08:00:00Z' },
    ];

    try {
      for (const ticket of workTickets) {
        await client.from('work_tickets').upsert(ticket, { onConflict: 'ticket_no' });
      }
      results.push('✅ 创建工票数据');
      counts.workTickets = workTickets.length;
    } catch (e) {
      results.push('⚠️ 工票数据已存在');
    }

    // ==========================================
    // 15. 质检数据
    // ==========================================
    const qualityInspections = [
      { id: generateId(), inspection_no: 'QC20250107001', order_id: 'ord-001', order_no: 'PO202501001', bundle_id: 'bundle-001', bundle_no: 'B20250106-001', process_id: 'proc-003', process_name: '合肩缝', inspection_type: '过程检', inspector: '赵六', inspection_date: '2025-01-07', sample_quantity: 50, pass_quantity: 47, defect_quantity: 3, defect_rate: 6.0, result: 'pass', defect_details: { '线头': 2, '跳线': 1 } },
      { id: generateId(), inspection_no: 'QC20250106001', order_id: 'ord-002', order_no: 'PO202501002', bundle_id: 'bundle-004', bundle_no: 'B20250105-001', process_id: 'proc-005', process_name: '上领', inspection_type: '过程检', inspector: '赵六', inspection_date: '2025-01-06', sample_quantity: 30, pass_quantity: 29, defect_quantity: 1, defect_rate: 3.3, result: 'pass', defect_details: { '领歪': 1 } },
    ];

    try {
      for (const inspection of qualityInspections) {
        await client.from('quality_inspections').upsert(inspection, { onConflict: 'inspection_no' });
      }
      results.push('✅ 创建质检数据');
      counts.qualityInspections = qualityInspections.length;
    } catch (e) {
      results.push('⚠️ 质检数据已存在');
    }

    // ==========================================
    // 16. 出货数据
    // ==========================================
    const shipments = [
      { id: generateId(), shipment_no: 'SH20250115001', order_id: 'ord-005', order_no: 'PO202412015', customer_id: customerId5, customer_name: '森马服饰', total_quantity: 600, total_boxes: 20, total_weight: 180.5, shipping_method: '物流', carrier: '顺丰速运', tracking_no: 'SF1234567890', shipping_address: '温州市瓯海区xxx路xxx号', contact_person: '孙经理', contact_phone: '13800001005', planned_date: '2025-01-15', actual_date: '2025-01-15', status: 'shipped', shipper: '周九' },
      { id: generateId(), shipment_no: 'SH20250120001', order_id: 'ord-006', order_no: 'PO202412018', customer_id: customerId6, customer_name: '美特斯邦威', total_quantity: 400, total_boxes: 15, total_weight: 120.0, shipping_method: '快递', carrier: '德邦物流', tracking_no: 'DB9876543210', shipping_address: '上海市浦东新区xxx路xxx号', contact_person: '周采购', contact_phone: '13800001006', planned_date: '2025-01-20', actual_date: '2025-01-20', status: 'shipped', shipper: '周九' },
    ];

    try {
      for (const shipment of shipments) {
        await client.from('shipments').upsert(shipment, { onConflict: 'shipment_no' });
      }
      results.push('✅ 创建出货数据');
      counts.shipments = shipments.length;
    } catch (e) {
      results.push('⚠️ 出货数据已存在');
    }

    // ==========================================
    // 17. 外发数据
    // ==========================================
    const outsourceOrders = [
      { id: generateId(), outsource_no: 'OS20250106001', bundle_id: 'bundle-004', bundle_no: 'B20250105-001', order_id: 'ord-002', order_no: 'PO202501002', supplier_id: 'sup-003', supplier_name: '华美刺绣加工厂', process_id: 'proc-embroidery', process_name: '刺绣', send_quantity: 200, return_quantity: 180, defect_quantity: 5, unit_price: 5.0, total_amount: 1000, send_date: '2025-01-05', expected_return_date: '2025-01-08', actual_return_date: '2025-01-08', status: 'partial_return', sender: '王五', receiver: '吴厂长' },
    ];

    try {
      for (const order of outsourceOrders) {
        await client.from('outsource_orders').upsert(order, { onConflict: 'outsource_no' });
      }
      results.push('✅ 创建外发数据');
      counts.outsourceOrders = outsourceOrders.length;
    } catch (e) {
      results.push('⚠️ 外发数据已存在');
    }

    // ==========================================
    // 18. 库存事务数据
    // ==========================================
    const inventoryTransactions = [
      { id: generateId(), transaction_no: 'IT20250106001', material_id: 'mat-001', type: 'out', quantity: 180, before_quantity: 1380, after_quantity: 1200, unit: '公斤', unit_price: 45, total_amount: 8100, warehouse: '主仓库', location: 'A-01-01', related_order: 'PO202501001', related_type: 'production', operator: '王五', remark: '生产领料' },
      { id: generateId(), transaction_no: 'IT20250105001', material_id: 'mat-002', type: 'out', quantity: 95, before_quantity: 895, after_quantity: 800, unit: '公斤', unit_price: 38, total_amount: 3610, warehouse: '主仓库', location: 'A-01-02', related_order: 'PO202501002', related_type: 'production', operator: '王五', remark: '生产领料' },
      { id: generateId(), transaction_no: 'IT20250104001', material_id: 'mat-001', type: 'in', quantity: 500, before_quantity: 880, after_quantity: 1380, unit: '公斤', unit_price: 44, total_amount: 22000, warehouse: '主仓库', location: 'A-01-01', related_order: 'PO202501003', related_type: 'purchase', operator: '周九', remark: '采购入库' },
    ];

    try {
      for (const transaction of inventoryTransactions) {
        await client.from('inventory_transactions').upsert(transaction, { onConflict: 'transaction_no' });
      }
      results.push('✅ 创建库存事务数据');
      counts.inventoryTransactions = inventoryTransactions.length;
    } catch (e) {
      results.push('⚠️ 库存事务数据已存在');
    }

    // ==========================================
    // 19. 考勤数据
    // ==========================================
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const attendanceRecords = [
      { id: generateId(), employee_id: 'emp-001', employee_no: 'EMP001', employee_name: '张三', attendance_date: today, check_in_time: '07:55', check_out_time: '18:30', work_hours: 10.5, overtime_hours: 2.5, status: 'normal' },
      { id: generateId(), employee_id: 'emp-002', employee_no: 'EMP002', employee_name: '李四', attendance_date: today, check_in_time: '08:02', check_out_time: '18:00', work_hours: 10.0, overtime_hours: 2.0, status: 'late' },
      { id: generateId(), employee_id: 'emp-003', employee_no: 'EMP003', employee_name: '王五', attendance_date: today, check_in_time: '07:45', check_out_time: '17:30', work_hours: 9.75, overtime_hours: 1.75, status: 'normal' },
      { id: generateId(), employee_id: 'emp-001', employee_no: 'EMP001', employee_name: '张三', attendance_date: yesterday, check_in_time: '07:50', check_out_time: '18:00', work_hours: 10.17, overtime_hours: 2.17, status: 'normal' },
      { id: generateId(), employee_id: 'emp-002', employee_no: 'EMP002', employee_name: '李四', attendance_date: yesterday, check_in_time: '07:58', check_out_time: '18:15', work_hours: 10.28, overtime_hours: 2.28, status: 'normal' },
    ];

    try {
      for (const record of attendanceRecords) {
        await client.from('attendance').upsert(record, { onConflict: 'employee_id,attendance_date' });
      }
      results.push('✅ 创建考勤数据');
      counts.attendance = attendanceRecords.length;
    } catch (e) {
      results.push('⚠️ 考勤数据已存在');
    }

    // ==========================================
    // 20. 工资数据
    // ==========================================
    const salaryRecords = [
      { id: generateId(), employee_id: 'emp-001', employee_no: 'EMP001', employee_name: '张三', year: 2025, month: 1, base_salary: 4500, piece_salary: 3200, overtime_salary: 800, bonus: 500, deduction: 0, total_salary: 9000, work_days: 22, overtime_hours: 48, piece_count: 2800, status: 'pending' },
      { id: generateId(), employee_id: 'emp-002', employee_no: 'EMP002', employee_name: '李四', year: 2025, month: 1, base_salary: 4000, piece_salary: 2800, overtime_salary: 600, bonus: 300, deduction: 0, total_salary: 7700, work_days: 22, overtime_hours: 36, piece_count: 2400, status: 'pending' },
      { id: generateId(), employee_id: 'emp-003', employee_no: 'EMP003', employee_name: '王五', year: 2025, month: 1, base_salary: 5000, piece_salary: 2500, overtime_salary: 500, bonus: 400, deduction: 0, total_salary: 8400, work_days: 22, overtime_hours: 28, piece_count: 1800, status: 'pending' },
    ];

    try {
      for (const record of salaryRecords) {
        await client.from('salary_records').upsert(record, { onConflict: 'employee_id,year,month' });
      }
      results.push('✅ 创建工资数据');
      counts.salaryRecords = salaryRecords.length;
    } catch (e) {
      results.push('⚠️ 工资数据已存在');
    }

    // ==========================================
    // 21. 通知数据
    // ==========================================
    const notifications = [
      { id: generateId(), type: 'order', level: 'warning', title: '订单即将到期', content: '订单PO202501002将于3天后到期，当前进度45%', related_order: 'PO202501002', recipient: 'user-004', status: 'unread' },
      { id: generateId(), type: 'quality', level: 'error', title: '质量问题预警', content: '订单PO202501001发现批量质量问题，请及时处理', related_order: 'PO202501001', recipient: 'user-006', status: 'unread' },
      { id: generateId(), type: 'inventory', level: 'warning', title: '物料库存不足', content: '物料弹力牛仔布(M003)库存低于安全库存', recipient: 'user-005', status: 'unread' },
      { id: generateId(), type: 'system', level: 'info', title: '系统通知', content: '系统将于今晚22:00进行例行维护', recipient: 'user-001', status: 'read', read_at: '2025-01-07T10:00:00Z' },
    ];

    try {
      for (const notification of notifications) {
        await client.from('notifications').upsert(notification, { onConflict: 'id' });
      }
      results.push('✅ 创建通知数据');
      counts.notifications = notifications.length;
    } catch (e) {
      results.push('⚠️ 通知数据已存在');
    }

    // ==========================================
    // 22. 预警数据
    // ==========================================
    const alerts = [
      { id: generateId(), alert_type: 'delivery', alert_level: 'warning', title: '交期预警', content: '订单PO202501002交期紧迫，剩余3天', related_id: 'ord-002', status: 'active' },
      { id: generateId(), alert_type: 'quality', alert_level: 'error', title: '质量预警', content: '订单PO202501001次品率超过标准', related_id: 'ord-001', status: 'active' },
      { id: generateId(), alert_type: 'inventory', alert_level: 'warning', title: '库存预警', content: '物料弹力牛仔布库存不足', related_id: 'mat-003', status: 'active' },
      { id: generateId(), alert_type: 'production', alert_level: 'info', title: '生产进度', content: '订单PO202501003已排产，计划1月12日开始', related_id: 'ord-003', status: 'handled', handled_by: '王主管', handled_at: '2025-01-08T10:00:00Z' },
    ];

    try {
      for (const alert of alerts) {
        await client.from('alerts').upsert(alert, { onConflict: 'id' });
      }
      results.push('✅ 创建预警数据');
      counts.alerts = alerts.length;
    } catch (e) {
      results.push('⚠️ 预警数据已存在');
    }

    // ==========================================
    // 23. 账单数据
    // ==========================================
    const bills = [
      { id: generateId(), bill_no: 'BILL202501001', bill_type: 'receivable', category: '销售款', related_id: 'ord-005', related_no: 'PO202412015', customer_id: customerId5, amount: 82800, paid_amount: 82800, due_date: '2025-02-15', payment_date: '2025-01-16', status: 'paid' },
      { id: generateId(), bill_no: 'BILL202501002', bill_type: 'receivable', category: '销售款', related_id: 'ord-006', related_no: 'PO202412018', customer_id: customerId6, amount: 75200, paid_amount: 0, due_date: '2025-02-20', status: 'pending' },
      { id: generateId(), bill_no: 'BILL202501003', bill_type: 'payable', category: '采购款', related_id: 'sup-001', supplier_id: 'sup-001', amount: 22000, paid_amount: 0, due_date: '2025-02-04', status: 'pending' },
    ];

    try {
      for (const bill of bills) {
        await client.from('bills').upsert(bill, { onConflict: 'bill_no' });
      }
      results.push('✅ 创建账单数据');
      counts.bills = bills.length;
    } catch (e) {
      results.push('⚠️ 账单数据已存在');
    }

    // ==========================================
    // 24. 公告数据
    // ==========================================
    const announcements = [
      { id: generateId(), title: '关于2025年春节放假安排的通知', content: '根据国家规定，2025年春节放假时间为1月28日至2月4日，共8天。请各部门提前做好工作安排。', type: 'important', priority: 'high', status: 'published', publish_date: '2025-01-05', expire_date: '2025-02-10', author: '周人事' },
      { id: generateId(), title: '生产车间安全培训通知', content: '为提高员工安全意识，定于1月15日下午2点在生产车间进行安全培训，请相关员工准时参加。', type: 'general', priority: 'normal', status: 'published', publish_date: '2025-01-08', expire_date: '2025-01-20', author: '李经理' },
      { id: generateId(), title: '新版ERP系统上线公告', content: '经过三个月的测试和优化，新版ERP系统将于1月20日正式上线。请各部门做好系统切换准备。', type: 'system', priority: 'high', status: 'published', publish_date: '2025-01-10', expire_date: '2025-02-01', author: '系统管理员' },
    ];

    try {
      for (const announcement of announcements) {
        await client.from('announcements').upsert(announcement, { onConflict: 'id' });
      }
      results.push('✅ 创建公告数据');
      counts.announcements = announcements.length;
    } catch (e) {
      results.push('⚠️ 公告数据已存在');
    }

    // ==========================================
    // 25. 编菲数据
    // ==========================================
    const bianfeiRecords = [
      { id: generateId(), bianfei_no: 'BF20250106001', order_no: 'PO202501001', style_name: '经典圆领T恤', style_code: 'ST2025001', color: '白色', sizes: ['S', 'M', 'L', 'XL', 'XXL'], quick_mode: true, merge_same: false, auto_increment: true, status: 'completed', total_quantity: 2000, remark: '常规编菲' },
      { id: generateId(), bianfei_no: 'BF20250105001', order_no: 'PO202501002', style_name: '时尚V领连衣裙', style_code: 'ST2025002', color: '黑色', sizes: ['S', 'M', 'L', 'XL'], quick_mode: false, merge_same: true, auto_increment: false, status: 'completed', total_quantity: 800, remark: '合并相同尺码' },
    ];

    try {
      for (const record of bianfeiRecords) {
        await client.from('bianfei_records').upsert(record, { onConflict: 'bianfei_no' });
      }
      results.push('✅ 创建编菲数据');
      counts.bianfeiRecords = bianfeiRecords.length;
    } catch (e) {
      results.push('⚠️ 编菲数据已存在');
    }

    // ==========================================
    // 26. 采购订单数据
    // ==========================================
    const purchaseOrders = [
      { id: generateId(), po_no: 'PU20250104001', supplier_id: 'sup-001', supplier_name: '优质纺织原料有限公司', order_date: '2025-01-04', expected_date: '2025-01-11', total_amount: 22000, status: 'received', approved_by: '赵仓管', remark: '补充面料库存' },
      { id: generateId(), po_no: 'PU20250108001', supplier_id: 'sup-002', supplier_name: '精工辅料商行', order_date: '2025-01-08', expected_date: '2025-01-13', total_amount: 5000, status: 'pending', remark: '辅料补货' },
    ];

    try {
      for (const order of purchaseOrders) {
        await client.from('purchase_orders').upsert(order, { onConflict: 'po_no' });
      }
      results.push('✅ 创建采购订单数据');
      counts.purchaseOrders = purchaseOrders.length;
    } catch (e) {
      results.push('⚠️ 采购订单数据已存在');
    }

    // ==========================================
    // 27. 设备数据
    // ==========================================
    const equipment = [
      { id: generateId(), equipment_no: 'EQ001', name: '电脑平车', type: '缝纫设备', brand: '兄弟', model: 'S-7300A', production_line_id: 'line-001', purchase_date: '2023-03-15', purchase_price: 15000, warranty_months: 24, status: 'normal', daily_capacity: 50, efficiency: 95, operator: '张三', last_maintenance_date: '2024-12-15', next_maintenance_date: '2025-03-15' },
      { id: generateId(), equipment_no: 'EQ002', name: '自动裁床', type: '裁剪设备', brand: '力克', model: 'VectorFashion', production_line_id: 'line-005', purchase_date: '2022-06-20', purchase_price: 280000, warranty_months: 36, status: 'normal', daily_capacity: 1000, efficiency: 98, operator: '王五', last_maintenance_date: '2024-11-20', next_maintenance_date: '2025-02-20' },
      { id: generateId(), equipment_no: 'EQ003', name: '蒸汽熨斗', type: '整烫设备', brand: '重机', model: 'JVP-900', production_line_id: 'line-006', purchase_date: '2023-08-10', purchase_price: 3500, warranty_months: 12, status: 'normal', daily_capacity: 200, efficiency: 90, operator: '钱七', last_maintenance_date: '2024-12-01', next_maintenance_date: '2025-06-01' },
    ];

    try {
      for (const eq of equipment) {
        await client.from('equipment').upsert(eq, { onConflict: 'equipment_no' });
      }
      results.push('✅ 创建设备数据');
      counts.equipment = equipment.length;
    } catch (e) {
      results.push('⚠️ 设备数据已存在');
    }

    // ==========================================
    // 28. 扫描日志数据
    // ==========================================
    const scanLogs = [
      { id: generateId(), scan_type: 'ticket', barcode: 'BC20250106001', employee_id: 'emp-001', employee_name: '张三', location: 'A线', quantity: 380, scan_time: '2025-01-07T08:30:00Z', remark: '工票扫描' },
      { id: generateId(), scan_type: 'bundle', barcode: 'B20250106-001', employee_id: 'emp-003', employee_name: '王五', location: '裁床', quantity: 400, scan_time: '2025-01-06T14:00:00Z', remark: '分扎扫描' },
    ];

    try {
      for (const log of scanLogs) {
        await client.from('scan_logs').upsert(log, { onConflict: 'id' });
      }
      results.push('✅ 创建扫描日志数据');
      counts.scanLogs = scanLogs.length;
    } catch (e) {
      results.push('⚠️ 扫描日志数据已存在');
    }

    return NextResponse.json({
      success: true,
      message: '演示数据种子完成',
      results,
      counts,
      summary: {
        totalTables: Object.keys(counts).length,
        totalRecords: Object.values(counts).reduce((a: number, b) => a + b, 0) as number
      }
    });

  } catch (error: any) {
    console.error('Seed demo data error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      results
    }, { status: 500 });
  }
}
