import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取仪表盘统计数据
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // month, quarter, year

    // 计算时间范围
    const now = new Date();
    let startDate: string;
    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else if (period === 'quarter') {
      startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().split('T')[0];
    } else {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    }

    // 1. 生产订单统计
    const { data: orders } = await client
      .from('production_orders')
      .select('id, status, quantity, completed_quantity, plan_end_date, created_at');

    const orderStats = {
      total: orders?.length || 0,
      pending: orders?.filter(o => o.status === 'pending').length || 0,
      in_progress: orders?.filter(o => ['confirmed', 'in_progress'].includes(o.status)).length || 0,
      completed: orders?.filter(o => o.status === 'completed').length || 0,
      cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
    };

    // 2. 生产进度统计
    const progressStats = {
      total_quantity: orders?.reduce((sum, o) => sum + (o.quantity || 0), 0) || 0,
      completed_quantity: orders?.reduce((sum, o) => sum + (o.completed_quantity || 0), 0) || 0,
    };

    // 3. 外发统计
    const { data: outsource } = await client
      .from('bundle_outsource')
      .select('id, status, quantity, total_price');

    const outsourceStats = {
      total: outsource?.length || 0,
      pending: outsource?.filter(o => o.status === 'pending').length || 0,
      in_progress: outsource?.filter(o => ['shipped', 'in_production'].includes(o.status)).length || 0,
      completed: outsource?.filter(o => o.status === 'completed').length || 0,
      total_amount: outsource?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0,
    };

    // 4. 库存统计
    const { data: inventory } = await client
      .from('inventory')
      .select('id, quantity, safety_stock, unit_price');

    const inventoryStats = {
      total_types: inventory?.length || 0,
      low_stock: inventory?.filter(m => m.quantity <= (m.safety_stock || 0)).length || 0,
      total_value: inventory?.reduce((sum, m) => sum + (m.quantity || 0) * (m.unit_price || 0), 0) || 0,
    };

    // 5. 财务统计
    const { data: bills } = await client
      .from('bills')
      .select('id, type, amount, bill_date')
      .gte('bill_date', startDate);

    const financeStats = {
      income: bills?.filter(b => b.type === 'income').reduce((sum, b) => sum + (b.amount || 0), 0) || 0,
      expense: bills?.filter(b => b.type === 'expense').reduce((sum, b) => sum + (b.amount || 0), 0) || 0,
      profit: 0,
    };
    financeStats.profit = financeStats.income - financeStats.expense;

    // 6. 出货统计
    const { data: shipments } = await client
      .from('shipments')
      .select('id, status, shipment_date')
      .gte('shipment_date', startDate);

    const shipmentStats = {
      total: shipments?.length || 0,
      pending: shipments?.filter(s => s.status === 'pending').length || 0,
      shipped: shipments?.filter(s => s.status === 'shipped').length || 0,
    };

    // 7. 员工统计
    const { data: employees } = await client
      .from('employees')
      .select('id, status');

    const employeeStats = {
      total: employees?.length || 0,
      active: employees?.filter(e => e.status === 'active').length || 0,
    };

    // 8. 月度趋势（最近6个月）
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthOrders = orders?.filter(o => 
        new Date(o.created_at) >= monthStart && new Date(o.created_at) <= monthEnd
      ).length || 0;

      const monthIncome = bills?.filter(b => 
        b.type === 'income' &&
        new Date(b.bill_date) >= monthStart && 
        new Date(b.bill_date) <= monthEnd
      ).reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

      const monthExpense = bills?.filter(b => 
        b.type === 'expense' &&
        new Date(b.bill_date) >= monthStart && 
        new Date(b.bill_date) <= monthEnd
      ).reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

      monthlyTrend.push({
        month: `${monthStart.getMonth() + 1}月`,
        orders: monthOrders,
        income: monthIncome,
        expense: monthExpense,
        profit: monthIncome - monthExpense,
      });
    }

    // 9. 即将到期订单
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const urgentOrders = orders?.filter(o => 
      o.plan_end_date && 
      o.plan_end_date <= threeDaysLater && 
      !['completed', 'cancelled'].includes(o.status)
    ).slice(0, 5) || [];

    // 10. 低库存预警
    const lowStockMaterials = inventory?.filter(m => 
      m.quantity <= (m.safety_stock || 10)
    ).slice(0, 5) || [];

    return NextResponse.json({
      success: true,
      data: {
        // 前端看板需要的格式
        totalOrders: orderStats.total,
        completedOrders: orderStats.completed,
        inProgressOrders: orderStats.in_progress,
        pendingOrders: orderStats.pending,
        todayOutput: progressStats.completed_quantity,
        weekOutput: progressStats.completed_quantity,
        defectRate: 1.2, // TODO: 计算实际次品率
        onTimeRate: orderStats.total > 0 
          ? Math.round((orderStats.completed / orderStats.total) * 100) 
          : 0,
        // 详细统计
        orderStats,
        progressStats,
        outsourceStats,
        inventoryStats,
        financeStats,
        shipmentStats,
        employeeStats,
        monthlyTrend,
        urgentOrders,
        lowStockMaterials,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
