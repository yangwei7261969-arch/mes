import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 外发管理强化API
 * 
 * 核心功能：
 * • 供应商评分体系
 * • 延误统计分析
 * • 成本对比
 * • 质量追踪
 * • 付款管理
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'suppliers':
        return await getSuppliers(client, searchParams);
      case 'supplier-detail':
        return await getSupplierDetail(client, searchParams.get('id'));
      case 'orders':
        return await getOutsourceOrders(client, searchParams);
      case 'statistics':
        return await getStatistics(client, searchParams);
      case 'delay-analysis':
        return await getDelayAnalysis(client);
      case 'cost-comparison':
        return await getCostComparison(client, searchParams);
      case 'quality-tracking':
        return await getQualityTracking(client, searchParams);
      default:
        return await getOutsourceOrders(client, searchParams);
    }
  } catch (error) {
    console.error('Outsource management error:', error);
    return NextResponse.json({ success: false, error: '获取外发数据失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { action, data } = body;

    switch (action) {
      case 'create-supplier':
        return await createSupplier(client, data);
      case 'update-supplier':
        return await updateSupplier(client, data);
      case 'rate-supplier':
        return await rateSupplier(client, data);
      case 'create-order':
        return await createOutsourceOrder(client, data);
      case 'update-order':
        return await updateOutsourceOrder(client, data);
      case 'confirm-return':
        return await confirmReturn(client, data);
      case 'record-delay':
        return await recordDelay(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Outsource operation error:', error);
    return NextResponse.json({ success: false, error: '外发操作失败' }, { status: 500 });
  }
}

/**
 * 获取供应商列表（含评分）
 */
async function getSuppliers(client: any, searchParams: URLSearchParams) {
  const status = searchParams.get('status') || 'active';
  const category = searchParams.get('category');

  let query = client
    .from('suppliers')
    .select(`
      id,
      code,
      name,
      category,
      contact_person,
      contact_phone,
      status,
      rating,
      total_orders,
      delayed_orders,
      quality_score,
      delivery_score,
      price_score,
      created_at
    `)
    .order('rating', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data: suppliers, error } = await query;

  if (error) throw error;

  // 计算综合评分
  const suppliersWithScores = (suppliers || []).map((supplier: any) => {
    const delayRate = supplier.total_orders > 0 
      ? Math.round(supplier.delayed_orders / supplier.total_orders * 100) 
      : 0;

    const compositeScore = calculateCompositeScore(supplier);

    return {
      ...supplier,
      delayRate,
      compositeScore,
      level: getSupplierLevel(compositeScore)
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      suppliers: suppliersWithScores,
      summary: {
        total: suppliersWithScores.length,
        excellent: suppliersWithScores.filter((s: any) => s.level === 'A').length,
        good: suppliersWithScores.filter((s: any) => s.level === 'B').length,
        average: suppliersWithScores.filter((s: any) => s.level === 'C').length,
        poor: suppliersWithScores.filter((s: any) => s.level === 'D').length
      }
    }
  });
}

/**
 * 获取供应商详情
 */
async function getSupplierDetail(client: any, supplierId: string | null) {
  if (!supplierId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少供应商ID' 
    }, { status: 400 });
  }

  const { data: supplier, error } = await client
    .from('suppliers')
    .select(`
      *,
      supplier_certifications (
        certification_type,
        certification_number,
        valid_until,
        status
      ),
      supplier_contracts (
        id,
        contract_code,
        start_date,
        end_date,
        status,
        terms
      ),
      supplier_payments (
        id,
        amount,
        due_date,
        paid_date,
        status
      )
    `)
    .eq('id', supplierId)
    .single();

  if (error) throw error;

  // 获取历史订单统计
  const { data: orderStats } = await client
    .from('outsource_orders')
    .select('status, total_amount, quality_check_result')
    .eq('supplier_id', supplierId);

  const stats = {
    totalOrders: orderStats?.length || 0,
    completedOrders: orderStats?.filter((o: any) => o.status === 'completed').length || 0,
    inProgressOrders: orderStats?.filter((o: any) => o.status === 'in_progress').length || 0,
    totalAmount: orderStats?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0,
    qualityPassRate: calculateQualityPassRate(orderStats)
  };

  // 获取最近延误记录
  const { data: recentDelays } = await client
    .from('outsource_delays')
    .select(`
      id,
      delay_days,
      reason,
      compensation_amount,
      created_at,
      outsource_orders (
        order_code,
        production_orders (order_code)
      )
    `)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
    .limit(5);

  // 获取评分历史
  const { data: ratingHistory } = await client
    .from('supplier_ratings')
    .select(`
      id,
      quality_score,
      delivery_score,
      price_score,
      service_score,
      overall_score,
      comment,
      created_at,
      outsource_orders (order_code)
    `)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    success: true,
    data: {
      supplier,
      stats,
      recentDelays,
      ratingHistory,
      scoreTrend: calculateScoreTrend(ratingHistory)
    }
  });
}

/**
 * 获取外发订单列表
 */
async function getOutsourceOrders(client: any, searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const supplierId = searchParams.get('supplier_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let query = client
    .from('outsource_orders')
    .select(`
      id,
      order_code,
      status,
      total_quantity,
      completed_quantity,
      unit_price,
      total_amount,
      send_date,
      expected_return_date,
      actual_return_date,
      quality_check_result,
      suppliers (
        id,
        name,
        rating
      ),
      production_orders (
        id,
        order_code,
        delivery_date,
        customers (name)
      ),
      outsource_processes (
        process_id,
        quantity,
        processes (name, code)
      )
    `)
    .order('send_date', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (supplierId) {
    query = query.eq('supplier_id', supplierId);
  }

  if (startDate) {
    query = query.gte('send_date', startDate);
  }

  if (endDate) {
    query = query.lte('send_date', endDate);
  }

  const { data: orders, error } = await query;

  if (error) throw error;

  // 计算状态统计
  const statusCounts = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    delayed: 0
  };

  orders?.forEach((order: any) => {
    if (order.status in statusCounts) {
      statusCounts[order.status as keyof typeof statusCounts]++;
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      orders,
      statusCounts
    }
  });
}

/**
 * 获取统计分析
 */
async function getStatistics(client: any, searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'month';

  const dateRange = getDateRange(period);
  const startDate = dateRange.start;
  const endDate = dateRange.end;

  // 外发总金额
  const { data: amountData } = await client
    .from('outsource_orders')
    .select('total_amount')
    .gte('send_date', startDate)
    .lte('send_date', endDate);

  const totalAmount = amountData?.reduce((sum: number, o: any) => 
    sum + (o.total_amount || 0), 0) || 0;

  // 订单数量统计
  const { data: orderData } = await client
    .from('outsource_orders')
    .select('status')
    .gte('send_date', startDate)
    .lte('send_date', endDate);

  const orderCounts = {
    total: orderData?.length || 0,
    completed: orderData?.filter((o: any) => o.status === 'completed').length || 0,
    inProgress: orderData?.filter((o: any) => o.status === 'in_progress').length || 0,
    delayed: orderData?.filter((o: any) => o.status === 'delayed').length || 0
  };

  // 按供应商统计
  const { data: bySupplier } = await client
    .from('outsource_orders')
    .select(`
      total_amount,
      suppliers (id, name)
    `)
    .gte('send_date', startDate)
    .lte('send_date', endDate);

  const supplierStats: Record<string, { name: string; amount: number; count: number }> = {};
  bySupplier?.forEach((item: any) => {
    const supplierId = item.suppliers?.id;
    if (supplierId) {
      if (!supplierStats[supplierId]) {
        supplierStats[supplierId] = {
          name: item.suppliers?.name,
          amount: 0,
          count: 0
        };
      }
      supplierStats[supplierId].amount += item.total_amount || 0;
      supplierStats[supplierId].count++;
    }
  });

  // 质量统计
  const { data: qualityData } = await client
    .from('outsource_orders')
    .select('quality_check_result')
    .eq('status', 'completed')
    .gte('actual_return_date', startDate)
    .lte('actual_return_date', endDate);

  const qualityStats = {
    total: qualityData?.length || 0,
    passed: qualityData?.filter((q: any) => q.quality_check_result === 'pass').length || 0,
    failed: qualityData?.filter((q: any) => q.quality_check_result === 'fail').length || 0
  };

  const passRate = qualityStats.total > 0 
    ? Math.round(qualityStats.passed / qualityStats.total * 100)
    : 0;

  return NextResponse.json({
    success: true,
    data: {
      period,
      dateRange: { start: startDate, end: endDate },
      totalAmount,
      orders: orderCounts,
      bySupplier: Object.entries(supplierStats).map(([id, stats]) => ({
        id,
        ...stats
      })).sort((a, b) => b.amount - a.amount),
      quality: qualityStats
    }
  });
}

/**
 * 延误分析
 */
async function getDelayAnalysis(client: any) {
  // 获取所有延误记录
  const { data: delays } = await client
    .from('outsource_delays')
    .select(`
      id,
      delay_days,
      reason,
      compensation_amount,
      created_at,
      suppliers (
        id,
        name,
        rating
      ),
      outsource_orders (
        order_code,
        production_orders (
          order_code,
          delivery_date
        )
      )
    `)
    .order('created_at', { ascending: false });

  // 按供应商统计延误
  const supplierDelayStats: Record<string, {
    supplierId: string;
    supplierName: string;
    delayCount: number;
    totalDelayDays: number;
    avgDelayDays: number;
    totalCompensation: number;
  }> = {};

  delays?.forEach((delay: any) => {
    const supplierId = delay.suppliers?.id;
    if (supplierId) {
      if (!supplierDelayStats[supplierId]) {
        supplierDelayStats[supplierId] = {
          supplierId,
          supplierName: delay.suppliers?.name,
          delayCount: 0,
          totalDelayDays: 0,
          avgDelayDays: 0,
          totalCompensation: 0
        };
      }
      supplierDelayStats[supplierId].delayCount++;
      supplierDelayStats[supplierId].totalDelayDays += delay.delay_days || 0;
      supplierDelayStats[supplierId].totalCompensation += delay.compensation_amount || 0;
    }
  });

  // 计算平均延误天数
  Object.values(supplierDelayStats).forEach(stats => {
    stats.avgDelayDays = stats.delayCount > 0 
      ? Math.round(stats.totalDelayDays / stats.delayCount * 10) / 10 
      : 0;
  });

  // 按原因分类统计
  const reasonStats: Record<string, number> = {};
  delays?.forEach((delay: any) => {
    const reason = delay.reason || '未知';
    reasonStats[reason] = (reasonStats[reason] || 0) + 1;
  });

  // 月度趋势
  const monthlyTrend: Record<string, { count: number; totalDays: number }> = {};
  delays?.forEach((delay: any) => {
    const month = delay.created_at.substring(0, 7);
    if (!monthlyTrend[month]) {
      monthlyTrend[month] = { count: 0, totalDays: 0 };
    }
    monthlyTrend[month].count++;
    monthlyTrend[month].totalDays += delay.delay_days || 0;
  });

  return NextResponse.json({
    success: true,
    data: {
      totalDelays: delays?.length || 0,
      totalDelayDays: delays?.reduce((sum: number, d: any) => sum + (d.delay_days || 0), 0) || 0,
      totalCompensation: delays?.reduce((sum: number, d: any) => sum + (d.compensation_amount || 0), 0) || 0,
      bySupplier: Object.values(supplierDelayStats).sort((a, b) => b.delayCount - a.delayCount),
      byReason: Object.entries(reasonStats)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
      monthlyTrend: Object.entries(monthlyTrend)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      recentDelays: delays?.slice(0, 10) || []
    }
  });
}

/**
 * 成本对比（外发 vs 自产）
 */
async function getCostComparison(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少订单ID' 
    }, { status: 400 });
  }

  // 获取外发成本
  const { data: outsourceCosts } = await client
    .from('outsource_orders')
    .select(`
      total_amount,
      unit_price,
      total_quantity,
      shipping_cost,
      quality_check_cost,
      outsource_processes (
        process_id,
        unit_price,
        quantity,
        processes (name)
      )
    `)
    .eq('production_order_id', orderId);

  // 获取自产成本估算
  const { data: selfProductionCost } = await client
    .from('process_costs')
    .select(`
      process_id,
      labor_cost_per_unit,
      material_cost_per_unit,
      overhead_cost_per_unit,
      processes (name)
    `)
    .eq('production_order_id', orderId);

  // 构建对比数据
  const comparison: any[] = [];
  const outsourceProcesses = new Map();
  const selfProcesses = new Map();

  outsourceCosts?.forEach((o: any) => {
    o.outsource_processes?.forEach((p: any) => {
      outsourceProcesses.set(p.process_id, {
        processId: p.process_id,
        processName: p.processes?.name,
        unitPrice: p.unit_price,
        quantity: p.quantity,
        total: p.unit_price * p.quantity
      });
    });
  });

  selfProductionCost?.forEach((c: any) => {
    const totalPerUnit = (c.labor_cost_per_unit || 0) + 
                         (c.material_cost_per_unit || 0) + 
                         (c.overhead_cost_per_unit || 0);
    selfProcesses.set(c.process_id, {
      processId: c.process_id,
      processName: c.processes?.name,
      laborCost: c.labor_cost_per_unit,
      materialCost: c.material_cost_per_unit,
      overheadCost: c.overhead_cost_per_unit,
      totalPerUnit
    });
  });

  // 合并对比
  const allProcessIds = new Set([...outsourceProcesses.keys(), ...selfProcesses.keys()]);
  allProcessIds.forEach(processId => {
    const outsource = outsourceProcesses.get(processId);
    const self = selfProcesses.get(processId);

    comparison.push({
      processId,
      processName: outsource?.processName || self?.processName,
      outsourceCost: outsource?.total || 0,
      selfCost: self?.totalPerUnit * (outsource?.quantity || 1) || 0,
      saving: (outsource?.total || 0) - (self?.totalPerUnit * (outsource?.quantity || 1) || 0)
    });
  });

  const totalOutsourceCost = comparison.reduce((sum, c) => sum + c.outsourceCost, 0);
  const totalSelfCost = comparison.reduce((sum, c) => sum + c.selfCost, 0);

  return NextResponse.json({
    success: true,
    data: {
      orderId,
      comparison,
      summary: {
        totalOutsourceCost,
        totalSelfCost,
        saving: totalOutsourceCost - totalSelfCost,
        savingRate: totalSelfCost > 0 
          ? Math.round((totalOutsourceCost - totalSelfCost) / totalSelfCost * 100) 
          : 0,
        recommendation: totalOutsourceCost < totalSelfCost ? 'outsource' : 'self'
      }
    }
  });
}

/**
 * 质量追踪
 */
async function getQualityTracking(client: any, searchParams: URLSearchParams) {
  const supplierId = searchParams.get('supplier_id');

  let query = client
    .from('outsource_quality_checks')
    .select(`
      id,
      check_date,
      check_type,
      result,
      defect_quantity,
      defect_type,
      notes,
      outsource_orders (
        order_code,
        total_quantity,
        suppliers (id, name)
      ),
      quality_checkers (name)
    `)
    .order('check_date', { ascending: false });

  if (supplierId) {
    // 需要关联查询
    query = query.eq('outsource_orders.supplier_id', supplierId);
  }

  const { data: checks, error } = await query;

  if (error) throw error;

  // 统计分析
  const totalChecks = checks?.length || 0;
  const passedChecks = checks?.filter((c: any) => c.result === 'pass').length || 0;
  const failedChecks = checks?.filter((c: any) => c.result === 'fail').length || 0;
  const conditionalChecks = checks?.filter((c: any) => c.result === 'conditional').length || 0;

  // 缺陷类型统计
  const defectTypes: Record<string, number> = {};
  checks?.forEach((check: any) => {
    if (check.defect_type) {
      defectTypes[check.defect_type] = (defectTypes[check.defect_type] || 0) + (check.defect_quantity || 1);
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      checks,
      summary: {
        total: totalChecks,
        passed: passedChecks,
        failed: failedChecks,
        conditional: conditionalChecks,
        passRate: totalChecks > 0 ? Math.round(passedChecks / totalChecks * 100) : 0
      },
      defectTypes: Object.entries(defectTypes)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    }
  });
}

/**
 * 创建供应商
 */
async function createSupplier(client: any, data: any) {
  const {
    code,
    name,
    category,
    contactPerson,
    contactPhone,
    address,
    bankName,
    bankAccount,
    notes
  } = data;

  const { data: supplier, error } = await client
    .from('suppliers')
    .insert({
      code,
      name,
      category,
      contact_person: contactPerson,
      contact_phone: contactPhone,
      address,
      bank_name: bankName,
      bank_account: bankAccount,
      notes,
      status: 'active',
      rating: 0,
      total_orders: 0,
      delayed_orders: 0,
      quality_score: 0,
      delivery_score: 0,
      price_score: 0
    })
    .select()
    .single();

  if (error) throw error;

  // 记录审计日志
  await client
    .from('audit_logs')
    .insert({
      action: 'create_supplier',
      entity_type: 'supplier',
      entity_id: supplier.id,
      details: { name, category }
    });

  return NextResponse.json({
    success: true,
    data: supplier
  });
}

/**
 * 更新供应商
 */
async function updateSupplier(client: any, data: any) {
  const { supplierId, updates } = data;

  const { data: supplier, error } = await client
    .from('suppliers')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', supplierId)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: supplier
  });
}

/**
 * 供应商评分
 */
async function rateSupplier(client: any, data: any) {
  const {
    supplierId,
    orderId,
    qualityScore,
    deliveryScore,
    priceScore,
    serviceScore,
    comment
  } = data;

  // 计算综合评分
  const overallScore = (
    qualityScore * 0.4 +
    deliveryScore * 0.3 +
    priceScore * 0.2 +
    serviceScore * 0.1
  );

  // 创建评分记录
  const { error: ratingError } = await client
    .from('supplier_ratings')
    .insert({
      supplier_id: supplierId,
      outsource_order_id: orderId,
      quality_score: qualityScore,
      delivery_score: deliveryScore,
      price_score: priceScore,
      service_score: serviceScore,
      overall_score: overallScore,
      comment
    });

  if (ratingError) throw ratingError;

  // 更新供应商平均评分
  const { data: avgScores } = await client
    .from('supplier_ratings')
    .select('quality_score, delivery_score, price_score, overall_score')
    .eq('supplier_id', supplierId);

  const count = avgScores?.length || 0;
  const avgQuality = avgScores?.reduce((sum: number, r: any) => sum + r.quality_score, 0) / count || 0;
  const avgDelivery = avgScores?.reduce((sum: number, r: any) => sum + r.delivery_score, 0) / count || 0;
  const avgPrice = avgScores?.reduce((sum: number, r: any) => sum + r.price_score, 0) / count || 0;
  const avgOverall = avgScores?.reduce((sum: number, r: any) => sum + r.overall_score, 0) / count || 0;

  await client
    .from('suppliers')
    .update({
      quality_score: Math.round(avgQuality * 10) / 10,
      delivery_score: Math.round(avgDelivery * 10) / 10,
      price_score: Math.round(avgPrice * 10) / 10,
      rating: Math.round(avgOverall * 10) / 10,
      updated_at: new Date().toISOString()
    })
    .eq('id', supplierId);

  return NextResponse.json({
    success: true,
    data: {
      overallScore: Math.round(overallScore * 10) / 10,
      supplierAvg: Math.round(avgOverall * 10) / 10
    }
  });
}

/**
 * 创建外发订单
 */
async function createOutsourceOrder(client: any, data: any) {
  const {
    productionOrderId,
    supplierId,
    processes,
    totalQuantity,
    unitPrice,
    sendDate,
    expectedReturnDate,
    notes
  } = data;

  const totalAmount = totalQuantity * unitPrice;

  // 生成订单编号
  const orderCode = `OS${Date.now().toString(36).toUpperCase()}`;

  // 创建外发订单
  const { data: order, error } = await client
    .from('outsource_orders')
    .insert({
      order_code: orderCode,
      production_order_id: productionOrderId,
      supplier_id: supplierId,
      total_quantity: totalQuantity,
      unit_price: unitPrice,
      total_amount: totalAmount,
      send_date: sendDate,
      expected_return_date: expectedReturnDate,
      status: 'pending',
      notes
    })
    .select()
    .single();

  if (error) throw error;

  // 创建工序明细
  if (processes && processes.length > 0) {
    await client
      .from('outsource_processes')
      .insert(processes.map((p: any) => ({
        outsource_order_id: order.id,
        process_id: p.processId,
        quantity: p.quantity,
        unit_price: p.unitPrice
      })));
  }

  // 更新供应商订单数
  await client
    .from('suppliers')
    .update({
      total_orders: client.rpc('increment', { x: 1 })
    })
    .eq('id', supplierId);

  return NextResponse.json({
    success: true,
    data: order
  });
}

/**
 * 更新外发订单
 */
async function updateOutsourceOrder(client: any, data: any) {
  const { orderId, updates } = data;

  const { data: order, error } = await client
    .from('outsource_orders')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: order
  });
}

/**
 * 确认回厂
 */
async function confirmReturn(client: any, data: any) {
  const { orderId, actualReturnDate, completedQuantity, qualityCheckResult, checkedBy } = data;

  const { data: order, error } = await client
    .from('outsource_orders')
    .update({
      status: 'completed',
      actual_return_date: actualReturnDate || new Date().toISOString(),
      completed_quantity: completedQuantity,
      quality_check_result: qualityCheckResult,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;

  // 检查是否延误
  if (new Date(order.actual_return_date) > new Date(order.expected_return_date)) {
    const delayDays = Math.ceil(
      (new Date(order.actual_return_date).getTime() - 
       new Date(order.expected_return_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    await client
      .from('outsource_delays')
      .insert({
        outsource_order_id: orderId,
        supplier_id: order.supplier_id,
        delay_days: delayDays,
        reason: '回厂延期'
      });

    // 更新供应商延误次数
    await client
      .from('suppliers')
      .update({
        delayed_orders: client.rpc('increment', { x: 1 })
      })
      .eq('id', order.supplier_id);
  }

  return NextResponse.json({
    success: true,
    data: order
  });
}

/**
 * 记录延误
 */
async function recordDelay(client: any, data: any) {
  const { orderId, delayDays, reason, compensationAmount } = data;

  const { data: order } = await client
    .from('outsource_orders')
    .select('supplier_id')
    .eq('id', orderId)
    .single();

  const { data: delay, error } = await client
    .from('outsource_delays')
    .insert({
      outsource_order_id: orderId,
      supplier_id: order?.supplier_id,
      delay_days: delayDays,
      reason,
      compensation_amount: compensationAmount
    })
    .select()
    .single();

  if (error) throw error;

  // 更新订单状态
  await client
    .from('outsource_orders')
    .update({ status: 'delayed' })
    .eq('id', orderId);

  return NextResponse.json({
    success: true,
    data: delay
  });
}

/**
 * 计算综合评分
 */
function calculateCompositeScore(supplier: any): number {
  const weights = {
    quality: 0.4,
    delivery: 0.3,
    price: 0.2,
    delayRate: 0.1
  };

  const qualityScore = supplier.quality_score || 0;
  const deliveryScore = supplier.delivery_score || 0;
  const priceScore = supplier.price_score || 0;
  const delayRate = supplier.total_orders > 0 
    ? supplier.delayed_orders / supplier.total_orders 
    : 0;
  const delayScore = Math.max(0, 10 - delayRate * 10);

  return (
    qualityScore * weights.quality +
    deliveryScore * weights.delivery +
    priceScore * weights.price +
    delayScore * weights.delayRate
  );
}

/**
 * 获取供应商等级
 */
function getSupplierLevel(score: number): string {
  if (score >= 8.5) return 'A';
  if (score >= 7) return 'B';
  if (score >= 5.5) return 'C';
  return 'D';
}

/**
 * 计算质量通过率
 */
function calculateQualityPassRate(orders: any[]): number {
  const checked = orders?.filter((o: any) => o.quality_check_result) || [];
  if (checked.length === 0) return 0;
  
  const passed = checked.filter((o: any) => o.quality_check_result === 'pass').length;
  return Math.round(passed / checked.length * 100);
}

/**
 * 计算评分趋势
 */
function calculateScoreTrend(ratingHistory: any[]): { trend: string; change: number } {
  if (!ratingHistory || ratingHistory.length < 2) {
    return { trend: 'stable', change: 0 };
  }

  const recent = ratingHistory.slice(0, 3);
  const older = ratingHistory.slice(3, 6);

  const recentAvg = recent.reduce((sum, r) => sum + r.overall_score, 0) / recent.length;
  const olderAvg = older.length > 0 
    ? older.reduce((sum, r) => sum + r.overall_score, 0) / older.length 
    : recentAvg;

  const change = recentAvg - olderAvg;

  return {
    trend: change > 0.5 ? 'improving' : change < -0.5 ? 'declining' : 'stable',
    change: Math.round(change * 10) / 10
  };
}

/**
 * 获取日期范围
 */
function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start: string;

  switch (period) {
    case 'week':
      now.setDate(now.getDate() - 7);
      start = now.toISOString().split('T')[0];
      break;
    case 'month':
      now.setMonth(now.getMonth() - 1);
      start = now.toISOString().split('T')[0];
      break;
    case 'quarter':
      now.setMonth(now.getMonth() - 3);
      start = now.toISOString().split('T')[0];
      break;
    case 'year':
      now.setFullYear(now.getFullYear() - 1);
      start = now.toISOString().split('T')[0];
      break;
    default:
      now.setMonth(now.getMonth() - 1);
      start = now.toISOString().split('T')[0];
  }

  return { start, end };
}
