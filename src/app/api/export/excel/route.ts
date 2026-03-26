import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import * as XLSX from 'xlsx';

// 数据导出API
export async function POST(request: NextRequest) {
  try {
    const { dataType, filters } = await request.json();
    const client = getSupabaseClient();

    let data: any[] = [];
    let headers: string[] = [];
    let filename = 'export';

    switch (dataType) {
      case 'production_orders':
        // 生产订单导出
        const { data: orders } = await client
          .from('production_orders')
          .select(`
            id, order_no, style_no, style_name, customer_id, 
            total_quantity, completed_quantity, status,
            plan_start_date, plan_end_date, created_at,
            customers(name)
          `)
          .order('created_at', { ascending: false });
        
        data = (orders || []).map(o => {
          const customer = Array.isArray(o.customers) ? o.customers[0] : o.customers;
          return {
            '订单编号': o.order_no,
            '款号': o.style_no,
            '款名': o.style_name,
            '客户': customer?.name || '-',
            '总数量': o.total_quantity,
            '已完成': o.completed_quantity || 0,
            '状态': getStatusText(o.status),
            '计划开始': o.plan_start_date || '-',
            '计划结束': o.plan_end_date || '-',
            '创建时间': formatDate(o.created_at),
          };
        });
        filename = `生产订单_${formatDate(new Date())}`;
        break;

      case 'cutting_bundles':
        // 裁床分扎导出
        const { data: bundles } = await client
          .from('cutting_bundles')
          .select(`
            id, bundle_no, size, color, quantity, status,
            created_at, cutting_order_id,
            cutting_orders(order_no, style_no, bed_number, total_beds)
          `)
          .order('created_at', { ascending: false });
        
        data = (bundles || []).map(b => {
          const cuttingOrder = Array.isArray(b.cutting_orders) ? b.cutting_orders[0] : b.cutting_orders;
          return {
            '扎号': b.bundle_no,
            '裁床单号': cuttingOrder?.order_no || '-',
            '款号': cuttingOrder?.style_no || '-',
            '床次': cuttingOrder?.bed_number 
              ? `${cuttingOrder.bed_number}/${cuttingOrder.total_beds || '?'}` 
              : '-',
            '颜色': b.color,
            '尺码': b.size,
            '数量': b.quantity,
            '状态': getStatusText(b.status),
            '创建时间': formatDate(b.created_at),
          };
        });
        filename = `裁床分扎_${formatDate(new Date())}`;
        break;

      case 'craft_processes':
        // 二次工艺导出
        const { data: crafts } = await client
          .from('craft_processes')
          .select(`
            id, process_name, process_type, quantity, completed_qty,
            unit_price, total_cost, status, notes, 
            start_time, end_time, created_at,
            production_orders(order_no, style_no),
            suppliers(name)
          `)
          .order('created_at', { ascending: false });
        
        data = (crafts || []).map(c => {
          const productionOrder = Array.isArray(c.production_orders) ? c.production_orders[0] : c.production_orders;
          const supplier = Array.isArray(c.suppliers) ? c.suppliers[0] : c.suppliers;
          return {
            '订单号': productionOrder?.order_no || '-',
            '款号': productionOrder?.style_no || '-',
            '工艺名称': c.process_name,
            '工艺类型': getProcessTypeText(c.process_type),
            '数量': c.quantity,
            '已完成': c.completed_qty || 0,
            '单价': c.unit_price || 0,
            '总金额': c.total_cost || 0,
            '供应商': supplier?.name || '-',
            '状态': getStatusText(c.status),
            '开始时间': formatDate(c.start_time),
            '结束时间': formatDate(c.end_time),
            '备注': c.notes || '-',
          };
        });
        filename = `二次工艺_${formatDate(new Date())}`;
        break;

      case 'outsource_tracking':
        // 外发跟踪导出
        const { data: outsources } = await client
          .from('cut_piece_outsources')
          .select(`
            id, bundle_no, style_no, size, color, quantity,
            process_type, unit_price, total_price, status,
            send_date, expected_return_date, actual_return_date,
            notes, created_at,
            suppliers(name)
          `)
          .order('created_at', { ascending: false });
        
        data = (outsources || []).map(o => {
          const supplier = Array.isArray(o.suppliers) ? o.suppliers[0] : o.suppliers;
          return {
            '扎号': o.bundle_no,
            '款号': o.style_no,
            '颜色': o.color,
            '尺码': o.size,
            '数量': o.quantity,
            '工序': getProcessTypeText(o.process_type),
            '供应商': supplier?.name || '-',
            '单价': o.unit_price || 0,
            '总金额': o.total_price || 0,
            '状态': getOutsourceStatusText(o.status),
            '发送日期': o.send_date || '-',
            '预计回货': o.expected_return_date || '-',
            '实际回货': o.actual_return_date || '-',
            '备注': o.notes || '-',
          };
        });
        filename = `外发跟踪_${formatDate(new Date())}`;
        break;

      case 'suppliers':
        // 供应商导出
        const { data: suppliersData } = await client
          .from('suppliers')
          .select('*')
          .order('created_at', { ascending: false });
        
        data = (suppliersData || []).map(s => ({
          '供应商编号': s.code || '-',
          '供应商名称': s.name,
          '类型': s.type || '-',
          '等级': `${s.supplier_level || 1}级`,
          '联系人': s.contact || '-',
          '电话': s.phone || '-',
          '地址': s.address || '-',
          '状态': s.status === 'approved' ? '已审核' : '待审核',
          '创建时间': formatDate(s.created_at),
        }));
        filename = `供应商_${formatDate(new Date())}`;
        break;

      case 'inventory':
        // 库存导出
        const { data: materials } = await client
          .from('materials')
          .select('*')
          .order('created_at', { ascending: false });
        
        data = (materials || []).map(m => ({
          '物料编号': m.code || '-',
          '物料名称': m.name,
          '规格': m.spec || '-',
          '单位': m.unit || '-',
          '数量': m.quantity || 0,
          '安全库存': m.safety_stock || 0,
          '单价': m.unit_price || 0,
          '库存金额': (m.quantity || 0) * (m.unit_price || 0),
          '状态': (m.quantity || 0) <= (m.safety_stock || 0) ? '库存不足' : '正常',
          '更新时间': formatDate(m.updated_at || m.created_at),
        }));
        filename = `库存明细_${formatDate(new Date())}`;
        break;

      case 'employees':
        // 员工导出
        const { data: employees } = await client
          .from('employees')
          .select('*')
          .order('created_at', { ascending: false });
        
        data = (employees || []).map(e => ({
          '工号': e.employee_no || '-',
          '姓名': e.name,
          '部门': e.department || '-',
          '职位': e.position || '-',
          '电话': e.phone || '-',
          '状态': e.status === 'active' ? '在职' : '离职',
          '入职日期': e.hire_date || '-',
          '创建时间': formatDate(e.created_at),
        }));
        filename = `员工列表_${formatDate(new Date())}`;
        break;

      case 'salaries':
        // 工资明细导出
        const monthFilter = filters?.month;
        const salaryQuery = client
          .from('salaries')
          .select(`
            id, employee_id, year, month, base_salary, overtime_pay, 
            bonus, deduction, total_amount, status, paid_date, created_at,
            employees(name, employee_no, department, position, bank_name, bank_account)
          `)
          .order('created_at', { ascending: false });
        
        if (monthFilter) {
          const [year, month] = monthFilter.split('-').map(Number);
          const { data: salaryData } = await salaryQuery.eq('year', year).eq('month', month);
          var salaries = salaryData;
        } else {
          const { data: salaryData } = await salaryQuery;
          var salaries = salaryData;
        }
        
        data = (salaries || []).map(s => {
          const emp = Array.isArray(s.employees) ? s.employees[0] : s.employees;
          return {
            '工号': emp?.employee_no || '-',
            '姓名': emp?.name || '-',
            '部门': emp?.department || '-',
            '职位': emp?.position || '-',
            '年份': s.year,
            '月份': s.month,
            '基本工资': s.base_salary || 0,
            '加班费': s.overtime_pay || 0,
            '奖金': s.bonus || 0,
            '扣款': s.deduction || 0,
            '实发工资': s.total_amount || 0,
            '开户银行': emp?.bank_name || '-',
            '银行账号': emp?.bank_account || '-',
            '状态': getSalaryStatusText(s.status),
            '发放日期': formatDate(s.paid_date),
          };
        });
        filename = `工资明细_${monthFilter || formatDate(new Date())}`;
        break;

      case 'order_details':
        // 订单明细导出
        const { data: orderDetails } = await client
          .from('production_orders')
          .select(`
            id, order_no, style_no, style_name, total_quantity, completed_quantity,
            plan_start_date, plan_end_date, status, created_at,
            customers(name),
            cutting_orders(id, order_no, cutting_qty, status),
            craft_processes(id, process_name, quantity, status, total_cost)
          `)
          .order('created_at', { ascending: false });
        
        data = [];
        (orderDetails || []).forEach(order => {
          const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
          const cuttingOrders = order.cutting_orders || [];
          const crafts = order.craft_processes || [];
          
          // 主订单行
          data.push({
            '订单编号': order.order_no,
            '款号': order.style_no,
            '款名': order.style_name,
            '客户': customer?.name || '-',
            '总数量': order.total_quantity,
            '已完成': order.completed_quantity || 0,
            '完成率': `${Math.round((order.completed_quantity || 0) / order.total_quantity * 100)}%`,
            '状态': getStatusText(order.status),
            '计划开始': order.plan_start_date || '-',
            '计划结束': order.plan_end_date || '-',
            '裁床情况': cuttingOrders.length > 0 ? `${cuttingOrders.length}床` : '未裁床',
            '工艺情况': crafts.length > 0 ? `${crafts.length}道` : '无',
            '工艺成本': crafts.reduce((sum: number, c: any) => sum + (c.total_cost || 0), 0),
            '创建时间': formatDate(order.created_at),
          });
        });
        filename = `订单明细_${formatDate(new Date())}`;
        break;

      case 'finance_summary':
        // 财务明细导出
        const [supplierPayments, craftCosts, salaryPayments] = await Promise.all([
          client.from('supplier_payments').select('*, suppliers(name)').order('created_at', { ascending: false }),
          client.from('craft_processes').select('*, suppliers(name), production_orders(order_no)').order('created_at', { ascending: false }),
          client.from('salaries').select('*, employees(name)').eq('status', 'paid').order('created_at', { ascending: false }),
        ]);
        
        data = [];
        
        // 供应商付款
        (supplierPayments.data || []).forEach(p => {
          const supplier = Array.isArray(p.suppliers) ? p.suppliers[0] : p.suppliers;
          data.push({
            '类型': '供应商付款',
            '编号': p.payment_no || '-',
            '关联方': supplier?.name || '-',
            '金额': p.amount || 0,
            '付款方式': p.payment_method || '-',
            '付款日期': formatDate(p.payment_date),
            '状态': p.status === 'completed' ? '已完成' : '处理中',
            '备注': p.notes || '-',
          });
        });
        
        // 工艺成本
        (craftCosts.data || []).forEach(c => {
          const supplier = Array.isArray(c.suppliers) ? c.suppliers[0] : c.suppliers;
          const order = Array.isArray(c.production_orders) ? c.production_orders[0] : c.production_orders;
          data.push({
            '类型': '工艺成本',
            '编号': order?.order_no || '-',
            '关联方': supplier?.name || '-',
            '金额': c.total_cost || 0,
            '付款方式': '-',
            '付款日期': formatDate(c.end_time || c.created_at),
            '状态': getStatusText(c.status),
            '备注': c.process_name || '-',
          });
        });
        
        // 工资发放
        (salaryPayments.data || []).forEach(s => {
          const emp = Array.isArray(s.employees) ? s.employees[0] : s.employees;
          data.push({
            '类型': '工资发放',
            '编号': `${s.year}-${String(s.month).padStart(2, '0')}`,
            '关联方': emp?.name || '-',
            '金额': s.total_amount || 0,
            '付款方式': '银行转账',
            '付款日期': formatDate(s.paid_date),
            '状态': '已发放',
            '备注': `${s.year}年${s.month}月工资`,
          });
        });
        
        filename = `财务明细_${formatDate(new Date())}`;
        break;

      default:
        return NextResponse.json({ error: '不支持的数据类型' }, { status: 400 });
    }

    if (data.length === 0) {
      return NextResponse.json({ error: '没有数据可导出' }, { status: 400 });
    }

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // 设置列宽
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(key.length * 2, 15)
    }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, '数据');

    // 生成Excel文件
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}

// 辅助函数
function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN');
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待处理',
    confirmed: '已确认',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
    outsourced: '外发中',
  };
  return statusMap[status] || status;
}

function getProcessTypeText(type: string): string {
  const typeMap: Record<string, string> = {
    sewing: '缝制',
    embroidery: '刺绣',
    printing: '印花',
    washing: '水洗',
    cutting: '裁剪',
    other: '其他',
  };
  return typeMap[type] || type;
}

function getOutsourceStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待发送',
    sent: '已发送',
    in_production: '生产中',
    completed: '已完成',
    returned: '已回货',
  };
  return statusMap[status] || status;
}

function getSalaryStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    paid: '已发放',
  };
  return statusMap[status] || status;
}
