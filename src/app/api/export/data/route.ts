import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 导出数据
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // all, orders, inventory, finance, suppliers

    let data: any = {};

    if (type === 'all' || type === 'orders') {
      const { data: orders } = await client
        .from('production_orders')
        .select('*')
        .order('created_at', { ascending: false });
      data.orders = orders || [];
    }

    if (type === 'all' || type === 'inventory') {
      const { data: materials } = await client
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });
      data.materials = materials || [];
    }

    if (type === 'all' || type === 'finance') {
      const { data: bills } = await client
        .from('bills')
        .select('*')
        .order('bill_date', { ascending: false });
      data.bills = bills || [];
    }

    if (type === 'all' || type === 'suppliers') {
      const { data: suppliers } = await client
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });
      data.suppliers = suppliers || [];
    }

    if (type === 'all' || type === 'employees') {
      const { data: employees } = await client
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      data.employees = employees || [];
    }

    if (type === 'all' || type === 'outsource') {
      const { data: outsource } = await client
        .from('bundle_outsource')
        .select(`
          *,
          suppliers(name),
          cutting_bundles(bundle_no)
        `)
        .order('created_at', { ascending: false });
      data.outsource = outsource || [];
    }

    // 转换为CSV格式
    const csvData = convertToCSV(data, type);

    // 返回CSV文件
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="export_${type}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, error: '导出失败' },
      { status: 500 }
    );
  }
}

function convertToCSV(data: any, type: string): string {
  let csv = '';

  // 添加BOM以支持中文
  csv = '\uFEFF';

  if (data.orders && data.orders.length > 0) {
    csv += '\n===== 生产订单 =====\n';
    csv += '订单号,款号,款名,颜色,总数量,已完成数量,状态,计划开始,计划结束,创建时间\n';
    data.orders.forEach((o: any) => {
      csv += `${o.order_no},${o.style_no},${o.style_name},${o.color},${o.total_quantity},${o.completed_quantity},${o.status},${o.plan_start_date || ''},${o.plan_end_date || ''},${o.created_at}\n`;
    });
  }

  if (data.materials && data.materials.length > 0) {
    csv += '\n===== 物料库存 =====\n';
    csv += '物料编码,物料名称,规格,颜色,数量,单位,安全库存,单价,库位\n';
    data.materials.forEach((m: any) => {
      csv += `${m.code},${m.name},${m.spec || ''},${m.color || ''},${m.quantity},${m.unit},${m.safety_stock || ''},${m.unit_price || ''},${m.location || ''}\n`;
    });
  }

  if (data.bills && data.bills.length > 0) {
    csv += '\n===== 财务账单 =====\n';
    csv += '单号,类型,金额,付款方,收款方,账单日期,状态,备注\n';
    data.bills.forEach((b: any) => {
      csv += `${b.bill_no},${b.type === 'income' ? '收入' : '支出'},${b.amount},${b.payer || ''},${b.payee || ''},${b.bill_date},${b.status},${b.remark || ''}\n`;
    });
  }

  if (data.suppliers && data.suppliers.length > 0) {
    csv += '\n===== 供应商 =====\n';
    csv += '编码,名称,类型,等级,联系人,电话,邮箱,状态,评级\n';
    data.suppliers.forEach((s: any) => {
      csv += `${s.code},${s.name},${s.type || ''},${s.level || 1}级,${s.contact || ''},${s.phone || ''},${s.email || ''},${s.status},${s.rating}\n`;
    });
  }

  if (data.employees && data.employees.length > 0) {
    csv += '\n===== 员工 =====\n';
    csv += '工号,姓名,部门,职位,状态,入职日期\n';
    data.employees.forEach((e: any) => {
      csv += `${e.employee_no},${e.name},${e.department || ''},${e.position || ''},${e.status},${e.hire_date || ''}\n`;
    });
  }

  if (data.outsource && data.outsource.length > 0) {
    csv += '\n===== 外发记录 =====\n';
    csv += '外发单号,扎号,供应商,工序,数量,单价,总价,状态,发送日期,预计回货\n';
    data.outsource.forEach((o: any) => {
      csv += `${o.outsource_no},${o.cutting_bundles?.bundle_no || ''},${o.suppliers?.name || ''},${o.process_name},${o.quantity},${o.unit_price},${o.total_price},${o.status},${o.send_date},${o.expected_return_date || ''}\n`;
    });
  }

  return csv;
}
