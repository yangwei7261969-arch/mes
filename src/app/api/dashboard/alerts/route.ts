import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取生产预警信息
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const alerts: any[] = [];

    // 1. 检查延期风险订单（预计完成时间已过但未完成）
    const { data: delayedOrders } = await client
      .from('production_orders')
      .select('id, order_no, style_no, expected_completion_date, status')
      .lt('expected_completion_date', new Date().toISOString())
      .not('status', 'eq', 'completed');

    if (delayedOrders && delayedOrders.length > 0) {
      delayedOrders.forEach(order => {
        alerts.push({
          id: `delay-${order.id}`,
          type: 'error',
          message: `订单 ${order.order_no} (${order.style_no}) 已延期`,
          time: new Date().toLocaleString('zh-CN'),
        });
      });
    }

    // 2. 检查外发超期未回
    const { data: overdueOutsources } = await client
      .from('cut_piece_outsources')
      .select('id, bundle_no, supplier_id, expected_return_date')
      .lt('expected_return_date', new Date().toISOString())
      .eq('status', 'sent');

    if (overdueOutsources && overdueOutsources.length > 0) {
      // 获取供应商信息
      const supplierIds = overdueOutsources.map(o => o.supplier_id).filter(Boolean);
      const { data: suppliersData } = await client
        .from('suppliers')
        .select('id, name')
        .in('id', supplierIds);
      
      const supplierMap = new Map(suppliersData?.map(s => [s.id, s.name]) || []);

      overdueOutsources.forEach(out => {
        alerts.push({
          id: `outsorce-${out.id}`,
          type: 'warning',
          message: `外发单 ${out.bundle_no} 超期未回（供应商：${supplierMap.get(out.supplier_id) || '未知'}）`,
          time: new Date().toLocaleString('zh-CN'),
        });
      });
    }

    // 3. 检查二次工艺超期
    const { data: overdueCrafts } = await client
      .from('craft_processes')
      .select('id, process_name, start_time, created_at')
      .eq('status', 'in_progress');

    // 如果有超过3天未完成的工艺
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    if (overdueCrafts && overdueCrafts.length > 0) {
      const longRunning = overdueCrafts.filter(c => {
        const start = new Date(c.start_time || c.created_at || '');
        return start < threeDaysAgo;
      });

      longRunning.slice(0, 3).forEach(craft => {
        alerts.push({
          id: `craft-${craft.id}`,
          type: 'warning',
          message: `二次工艺 "${craft.process_name}" 已进行超过3天`,
          time: new Date().toLocaleString('zh-CN'),
        });
      });
    }

    // 4. 库存预警（可选）
    const { data: lowInventory } = await client
      .from('materials')
      .select('id, name, quantity')
      .lt('quantity', 10) // 简化：数量小于10的物料
      .limit(5);

    if (lowInventory && lowInventory.length > 0) {
      alerts.push({
        id: 'inventory-low',
        type: 'info',
        message: `${lowInventory.length} 种物料库存不足，请及时补充`,
        time: new Date().toLocaleString('zh-CN'),
      });
    }

    return NextResponse.json({
      success: true,
      data: alerts.slice(0, 10), // 最多返回10条预警
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    return NextResponse.json({ error: '获取预警信息失败' }, { status: 500 });
  }
}
