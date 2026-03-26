import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取出货日历数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const client = getSupabaseClient();

    // 获取生产订单（按交期分组）
    let orderQuery = client
      .from('production_orders')
      .select('id, order_no, style_no, style_name, color, size, quantity, completed_quantity, status, plan_end_date, customer_id')
      .in('status', ['pending', 'confirmed', 'in_production'])
      .not('plan_end_date', 'is', null);

    if (startDate) {
      orderQuery = orderQuery.gte('plan_end_date', startDate);
    }
    if (endDate) {
      orderQuery = orderQuery.lte('plan_end_date', endDate);
    }

    const { data: orders, error: orderError } = await orderQuery.order('plan_end_date');

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // 获取发货任务（按发货日期分组）
    let shipQuery = client
      .from('shipping_tasks')
      .select('id, task_no, style_no, quantity, status, ship_date, is_return, receiver, receiver_phone, customer_id, outsource_order_id, production_order_id')
      .not('ship_date', 'is', null);

    if (startDate) {
      shipQuery = shipQuery.gte('ship_date', startDate);
    }
    if (endDate) {
      shipQuery = shipQuery.lte('ship_date', endDate);
    }

    const { data: shipments, error: shipError } = await shipQuery.order('ship_date');

    if (shipError) {
      return NextResponse.json({ error: shipError.message }, { status: 500 });
    }

    // 获取客户信息
    const customerIds = [...new Set([
      ...(orders?.map((o: any) => o.customer_id).filter(Boolean) || []),
      ...(shipments?.map((s: any) => s.customer_id).filter(Boolean) || []),
    ])];

    let customersMap: Record<string, any> = {};
    if (customerIds.length > 0) {
      const { data: customers } = await client
        .from('customers')
        .select('id, name, code, contact, phone')
        .in('id', customerIds);
      
      if (customers) {
        customersMap = customers.reduce((acc: any, c: any) => {
          acc[c.id] = c;
          return acc;
        }, {});
      }
    }

    // 按日期分组
    const calendar: Record<string, {
      orders: any[];
      shipments: any[];
      hasReturn: boolean;
      totalQty: number;
    }> = {};

    const addDate = (date: string) => {
      if (!calendar[date]) {
        calendar[date] = { orders: [], shipments: [], hasReturn: false, totalQty: 0 };
      }
    };

    // 处理订单（待交货）
    orders?.forEach((order: any) => {
      const date = order.plan_end_date;
      addDate(date);
      calendar[date].orders.push({
        ...order,
        customer: customersMap[order.customer_id] || null,
        isOverdue: new Date(date) < new Date() && order.status !== 'completed',
      });
      calendar[date].totalQty += order.quantity;
    });

    // 处理发货任务
    shipments?.forEach((ship: any) => {
      const date = ship.ship_date;
      addDate(date);
      calendar[date].shipments.push({
        ...ship,
        customer: customersMap[ship.customer_id] || null,
      });
      if (ship.is_return) {
        calendar[date].hasReturn = true;
      }
    });

    // 计算今日和明日提醒
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const reminders = {
      overdue: orders?.filter((o: any) => o.plan_end_date < today && o.status !== 'completed') || [],
      today: orders?.filter((o: any) => o.plan_end_date === today) || [],
      tomorrow: orders?.filter((o: any) => o.plan_end_date === tomorrow) || [],
    };

    return NextResponse.json({ 
      success: true, 
      data: {
        calendar,
        reminders,
        orders: orders || [],
        shipments: shipments || [],
      }
    });
  } catch (error) {
    console.error('Get shipping calendar error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}
