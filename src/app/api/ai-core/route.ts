import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * AI智能核心API
 * 
 * 功能：
 * • AI工艺流程生成
 * • 延误预测分析
 * • 利润分析
 * • 智能报价
 * • 用料优化建议
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'overview';

    switch (action) {
      case 'generate-process':
        return await generateProcessFlow(client, searchParams);
      case 'delay-prediction':
        return await predictDelay(client, searchParams);
      case 'profit-analysis':
        return await analyzeProfit(client, searchParams);
      case 'smart-quote':
        return await smartQuote(client, searchParams);
      case 'material-optimization':
        return await optimizeMaterial(client, searchParams);
      case 'efficiency-ranking':
        return await getEfficiencyRanking(client, searchParams);
      case 'risk-assessment':
        return await assessRisk(client, searchParams);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json({ success: false, error: 'AI分析失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'generate-process':
        return await generateProcessFlowFromStyle(client, data);
      case 'train-model':
        return await trainModel(client, data);
      case 'feedback':
        return await recordFeedback(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('AI operation error:', error);
    return NextResponse.json({ success: false, error: 'AI操作失败' }, { status: 500 });
  }
}

/**
 * AI生成工艺流程
 * 基于款式类型、面料、结构自动生成工艺流程
 */
async function generateProcessFlow(client: any, searchParams: URLSearchParams) {
  const styleId = searchParams.get('style_id');
  const category = searchParams.get('category'); // tshirt, pants, dress, jacket
  const fabric = searchParams.get('fabric'); // knit, woven, denim

  if (!category) {
    return NextResponse.json({ 
      success: false, 
      error: '请提供款式类别' 
    }, { status: 400 });
  }

  // 工艺流程知识库（实际应用中可以从数据库或AI模型获取）
  const processKnowledgeBase: Record<string, any> = {
    tshirt: {
      knit: [
        { process: '验布', sequence: 1, standardTime: 30, machine: '验布机', skill: '初级' },
        { process: '裁剪', sequence: 2, standardTime: 45, machine: '裁床', skill: '中级' },
        { process: '衣身缝合', sequence: 3, standardTime: 60, machine: '平车', skill: '中级' },
        { process: '肩缝', sequence: 4, standardTime: 30, machine: '平车', skill: '中级' },
        { process: '领口包边', sequence: 5, standardTime: 45, machine: '坎车', skill: '高级' },
        { process: '袖口包边', sequence: 6, standardTime: 40, machine: '坎车', skill: '中级' },
        { process: '下摆包边', sequence: 7, standardTime: 35, machine: '坎车', skill: '中级' },
        { process: '整烫', sequence: 8, standardTime: 25, machine: '烫台', skill: '初级' },
        { process: '质检', sequence: 9, standardTime: 20, machine: '无', skill: '中级' },
        { process: '包装', sequence: 10, standardTime: 15, machine: '无', skill: '初级' }
      ]
    },
    pants: {
      woven: [
        { process: '验布', sequence: 1, standardTime: 35, machine: '验布机', skill: '初级' },
        { process: '裁剪', sequence: 2, standardTime: 60, machine: '裁床', skill: '高级' },
        { process: '打省', sequence: 3, standardTime: 25, machine: '平车', skill: '中级' },
        { process: '侧缝', sequence: 4, standardTime: 50, machine: '平车', skill: '中级' },
        { process: '内档缝', sequence: 5, standardTime: 40, machine: '平车', skill: '中级' },
        { process: '腰头', sequence: 6, standardTime: 55, machine: '平车', skill: '高级' },
        { process: '门襟拉链', sequence: 7, standardTime: 45, machine: '平车', skill: '高级' },
        { process: '口袋', sequence: 8, standardTime: 40, machine: '平车', skill: '中级' },
        { process: '裤脚', sequence: 9, standardTime: 30, machine: '坎车', skill: '中级' },
        { process: '整烫', sequence: 10, standardTime: 35, machine: '烫台', skill: '中级' },
        { process: '质检', sequence: 11, standardTime: 25, machine: '无', skill: '中级' },
        { process: '包装', sequence: 12, standardTime: 15, machine: '无', skill: '初级' }
      ]
    },
    dress: {
      woven: [
        { process: '验布', sequence: 1, standardTime: 35, machine: '验布机', skill: '初级' },
        { process: '裁剪', sequence: 2, standardTime: 70, machine: '裁床', skill: '高级' },
        { process: '衣身缝合', sequence: 3, standardTime: 80, machine: '平车', skill: '高级' },
        { process: '领口', sequence: 4, standardTime: 50, machine: '平车', skill: '高级' },
        { process: '袖子', sequence: 5, standardTime: 60, machine: '平车', skill: '高级' },
        { process: '侧缝', sequence: 6, standardTime: 45, machine: '平车', skill: '中级' },
        { process: '下摆', sequence: 7, standardTime: 35, machine: '坎车', skill: '中级' },
        { process: '拉链/扣子', sequence: 8, standardTime: 40, machine: '平车', skill: '高级' },
        { process: '整烫', sequence: 9, standardTime: 40, machine: '烫台', skill: '中级' },
        { process: '质检', sequence: 10, standardTime: 30, machine: '无', skill: '高级' },
        { process: '包装', sequence: 11, standardTime: 20, machine: '无', skill: '初级' }
      ]
    },
    jacket: {
      woven: [
        { process: '验布', sequence: 1, standardTime: 40, machine: '验布机', skill: '初级' },
        { process: '裁剪', sequence: 2, standardTime: 90, machine: '裁床', skill: '高级' },
        { process: '挂面', sequence: 3, standardTime: 50, machine: '平车', skill: '高级' },
        { process: '领子制作', sequence: 4, standardTime: 70, machine: '平车', skill: '高级' },
        { process: '袖子制作', sequence: 5, standardTime: 80, machine: '平车', skill: '高级' },
        { process: '衣身缝合', sequence: 6, standardTime: 90, machine: '平车', skill: '高级' },
        { process: '里布', sequence: 7, standardTime: 70, machine: '平车', skill: '高级' },
        { process: '袖口', sequence: 8, standardTime: 40, machine: '平车', skill: '中级' },
        { process: '扣眼/扣子', sequence: 9, standardTime: 35, machine: '锁眼机', skill: '中级' },
        { process: '整烫', sequence: 10, standardTime: 50, machine: '烫台', skill: '高级' },
        { process: '质检', sequence: 11, standardTime: 40, machine: '无', skill: '高级' },
        { process: '包装', sequence: 12, standardTime: 25, machine: '无', skill: '初级' }
      ]
    }
  };

  // 获取工艺流程
  const categoryProcesses = processKnowledgeBase[category];
  if (!categoryProcesses) {
    return NextResponse.json({ 
      success: false, 
      error: '暂不支持该款式类别' 
    }, { status: 400 });
  }

  const processes = categoryProcesses[fabric || 'knit'] || categoryProcesses[Object.keys(categoryProcesses)[0]];

  // 如果有款式ID，获取款式详情优化工艺
  let optimizedProcesses = processes;
  if (styleId) {
    const { data: style } = await client
      .from('styles')
      .select('*')
      .eq('id', styleId)
      .single();

    if (style) {
      optimizedProcesses = optimizeProcessesByStyle(processes, style);
    }
  }

  // 计算总标准时间
  const totalSMV = optimizedProcesses.reduce((sum: number, p: any) => sum + p.standardTime, 0);

  // 估算产线配置
  const lineConfig = suggestLineConfig(optimizedProcesses);

  return NextResponse.json({
    success: true,
    data: {
      processes: optimizedProcesses,
      summary: {
        totalProcesses: optimizedProcesses.length,
        totalSMV,
        estimatedCycleTime: Math.ceil(totalSMV / optimizedProcesses.length),
        skillRequirements: analyzeSkillRequirements(optimizedProcesses)
      },
      lineConfig
    }
  });
}

/**
 * 从款式自动生成工艺流程
 */
async function generateProcessFlowFromStyle(client: any, data: any) {
  const { styleId, styleData, createdBy } = data;

  // 获取款式信息
  let style = styleData;
  if (styleId && !styleData) {
    const { data: s } = await client
      .from('styles')
      .select('*')
      .eq('id', styleId)
      .single();
    style = s;
  }

  if (!style) {
    return NextResponse.json({ 
      success: false, 
      error: '款式不存在' 
    }, { status: 404 });
  }

  // 分析款式特征
  const features = analyzeStyleFeatures(style);

  // 生成工艺流程
  const processes = generateProcessesByFeatures(features);

  // 保存到数据库
  const processRecords = processes.map((p: any, index: number) => ({
    style_id: styleId || style.id,
    process_name: p.process,
    sequence: index + 1,
    standard_time: p.standardTime,
    machine_type: p.machine,
    skill_level: p.skill,
    created_at: new Date().toISOString()
  }));

  const { data: saved, error } = await client
    .from('style_processes')
    .insert(processRecords)
    .select();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: {
      processes: saved,
      features,
      message: '工艺流程已生成并保存'
    }
  });
}

/**
 * 延误预测
 * 基于历史数据和当前状态预测订单延误风险
 */
async function predictDelay(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');
  const days = parseInt(searchParams.get('days') || '30');

  if (orderId) {
    return await predictOrderDelay(client, orderId);
  }

  // 批量预测所有在产订单
  const { data: orders } = await client
    .from('production_orders')
    .select(`
      id, order_no, style_no, quantity, completed_quantity,
      delivery_date, status, created_at,
      styles (style_name, category)
    `)
    .in('status', ['confirmed', 'in_production']);

  const predictions: any[] = [];

  for (const order of orders || []) {
    const prediction = await calculateDelayRisk(client, order);
    predictions.push(prediction);
  }

  // 按风险排序
  predictions.sort((a, b) => b.riskScore - a.riskScore);

  // 高风险订单
  const highRisk = predictions.filter(p => p.riskLevel === 'high');
  const mediumRisk = predictions.filter(p => p.riskLevel === 'medium');

  return NextResponse.json({
    success: true,
    data: {
      predictions,
      summary: {
        total: predictions.length,
        highRisk: highRisk.length,
        mediumRisk: mediumRisk.length,
        lowRisk: predictions.length - highRisk.length - mediumRisk.length
      },
      highRiskOrders: highRisk.slice(0, 10)
    }
  });
}

/**
 * 预测单个订单延误风险
 */
async function predictOrderDelay(client: any, orderId: string) {
  const { data: order } = await client
    .from('production_orders')
    .select(`
      *,
      styles (*),
      process_tracking (*),
      quality_inspections (*)
    `)
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ 
      success: false, 
      error: '订单不存在' 
    }, { status: 404 });
    }

  const prediction = await calculateDelayRisk(client, order);

  return NextResponse.json({
    success: true,
    data: prediction
  });
}

/**
 * 计算延误风险分数
 */
async function calculateDelayRisk(client: any, order: any): Promise<any> {
  const today = new Date();
  const deliveryDate = new Date(order.delivery_date);
  const daysUntilDue = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let riskScore = 0;
  const riskFactors: string[] = [];

  // 1. 进度风险
  const progressRate = order.quantity > 0 ? (order.completed_quantity || 0) / order.quantity : 0;
  const expectedProgress = Math.max(0, 1 - (daysUntilDue / 30)); // 假设30天周期

  if (progressRate < expectedProgress - 0.2) {
    riskScore += 30;
    riskFactors.push('进度落后预期');
  } else if (progressRate < expectedProgress - 0.1) {
    riskScore += 15;
    riskFactors.push('进度略慢');
  }

  // 2. 时间风险
  if (daysUntilDue <= 0) {
    riskScore += 50;
    riskFactors.push('已逾期');
  } else if (daysUntilDue <= 3) {
    riskScore += 40;
    riskFactors.push('即将到期');
  } else if (daysUntilDue <= 7) {
    riskScore += 20;
    riskFactors.push('临近交付');
  }

  // 3. 质量风险
  if (order.quality_inspections && order.quality_inspections.length > 0) {
    const failedInspections = order.quality_inspections.filter(
      (i: any) => i.result === 'failed'
    ).length;
    if (failedInspections > 0) {
      riskScore += failedInspections * 10;
      riskFactors.push(`有${failedInspections}次质检不通过`);
    }
  }

  // 4. 齐套风险
  const { data: completeSet } = await client
    .from('complete_set_checks')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (completeSet && completeSet.length > 0) {
    if (!completeSet[0].ready_to_produce) {
      riskScore += 25;
      riskFactors.push('物料未齐套');
    }
  }

  // 5. 返工风险
  const { data: rework } = await client
    .from('rework_orders')
    .select('quantity')
    .eq('order_id', order.id)
    .neq('status', 'completed');

  if (rework && rework.length > 0) {
    const reworkQty = rework.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0);
    riskScore += Math.min(30, reworkQty * 2);
    riskFactors.push(`有${reworkQty}件待返工`);
  }

  // 确定风险等级
  let riskLevel: 'low' | 'medium' | 'high';
  if (riskScore >= 60) {
    riskLevel = 'high';
  } else if (riskScore >= 30) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  // 预测延期天数
  let estimatedDelay = 0;
  if (riskScore > 0 && progressRate < 1) {
    const remainingQty = order.quantity - (order.completed_quantity || 0);
    const dailyRate = remainingQty > 0 ? 50 : 100; // 假设日产能
    const estimatedDays = Math.ceil(remainingQty / dailyRate);
    estimatedDelay = Math.max(0, estimatedDays - daysUntilDue);
  }

  return {
    orderId: order.id,
    orderNo: order.order_no,
    styleName: order.styles?.style_name,
    quantity: order.quantity,
    completedQuantity: order.completed_quantity,
    progressRate: Math.round(progressRate * 100),
    deliveryDate: order.delivery_date,
    daysUntilDue,
    riskScore: Math.min(100, riskScore),
    riskLevel,
    riskFactors,
    estimatedDelay,
    recommendations: generateRecommendations(riskScore, riskFactors)
  };
}

/**
 * 利润分析
 */
async function analyzeProfit(client: any, searchParams: URLSearchParams) {
  const type = searchParams.get('type') || 'overview';
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get('month') || '0');

  if (type === 'customer') {
    return await analyzeProfitByCustomer(client, year, month);
  } else if (type === 'style') {
    return await analyzeProfitByStyle(client, year, month);
  } else if (type === 'order') {
    return await analyzeProfitByOrder(client, searchParams);
  }

  // 总体利润分析
  const startDate = month > 0 
    ? `${year}-${month.toString().padStart(2, '0')}-01`
    : `${year}-01-01`;
  const endDate = month > 0 
    ? `${year}-${(month + 1).toString().padStart(2, '0')}-01`
    : `${year + 1}-01-01`;

  // 获取订单数据
  const { data: orders } = await client
    .from('production_orders')
    .select(`
      id, order_no, quantity, unit_price, total_amount,
      completed_quantity, status, delivery_date,
      customers (id, name),
      styles (id, style_no, style_name)
    `)
    .gte('delivery_date', startDate)
    .lt('delivery_date', endDate)
    .eq('status', 'completed');

  // 获取成本数据
  const { data: costs } = await client
    .from('order_costs')
    .select('*')
    .gte('created_at', startDate)
    .lt('created_at', endDate);

  // 计算利润
  const revenue = orders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;
  const materialCost = costs?.filter((c: any) => c.cost_type === 'material')
    .reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;
  const laborCost = costs?.filter((c: any) => c.cost_type === 'labor')
    .reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;
  const overheadCost = costs?.filter((c: any) => c.cost_type === 'overhead')
    .reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;

  const totalCost = materialCost + laborCost + overheadCost;
  const grossProfit = revenue - totalCost;
  const profitMargin = revenue > 0 ? (grossProfit / revenue * 100) : 0;

  return NextResponse.json({
    success: true,
    data: {
      revenue,
      costs: {
        material: materialCost,
        labor: laborCost,
        overhead: overheadCost,
        total: totalCost
      },
      grossProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      ordersCount: orders?.length || 0,
      period: { year, month }
    }
  });
}

/**
 * 按客户分析利润
 */
async function analyzeProfitByCustomer(client: any, year: number, month: number) {
  const startDate = month > 0 
    ? `${year}-${month.toString().padStart(2, '0')}-01`
    : `${year}-01-01`;
  const endDate = month > 0 
    ? `${year}-${(month + 1).toString().padStart(2, '0')}-01`
    : `${year + 1}-01-01`;

  const { data: orders } = await client
    .from('production_orders')
    .select(`
      id, total_amount, customer_id,
      customers (id, name),
      order_costs (amount, cost_type)
    `)
    .gte('delivery_date', startDate)
    .lt('delivery_date', endDate)
    .eq('status', 'completed');

  // 按客户分组
  const customerProfits: Record<string, any> = {};

  orders?.forEach((order: any) => {
    const customerId = order.customer_id;
    if (!customerProfits[customerId]) {
      customerProfits[customerId] = {
        customerId,
        customerName: order.customers?.name,
        revenue: 0,
        cost: 0,
        orders: 0
      };
    }

    customerProfits[customerId].revenue += order.total_amount || 0;
    customerProfits[customerId].orders += 1;

    if (order.order_costs) {
      customerProfits[customerId].cost += order.order_costs.reduce(
        (sum: number, c: any) => sum + (c.amount || 0), 0
      );
    }
  });

  // 计算利润并排序
  const results = Object.values(customerProfits)
    .map((cp: any) => ({
      ...cp,
      profit: cp.revenue - cp.cost,
      profitMargin: cp.revenue > 0 ? ((cp.revenue - cp.cost) / cp.revenue * 100) : 0
    }))
    .sort((a: any, b: any) => b.profit - a.profit);

  // 标记最赚钱和最坑客户
  const topCustomers = results.slice(0, 5);
  const bottomCustomers = results.slice(-5).reverse();

  return NextResponse.json({
    success: true,
    data: {
      all: results,
      topCustomers,
      bottomCustomers,
      summary: {
        totalCustomers: results.length,
        totalProfit: results.reduce((sum: number, r: any) => sum + r.profit, 0),
        avgProfitMargin: results.length > 0 
          ? results.reduce((sum: number, r: any) => sum + r.profitMargin, 0) / results.length 
          : 0
      }
    }
  });
}

/**
 * 按款式分析利润
 */
async function analyzeProfitByStyle(client: any, year: number, month: number) {
  const startDate = month > 0 
    ? `${year}-${month.toString().padStart(2, '0')}-01`
    : `${year}-01-01`;
  const endDate = month > 0 
    ? `${year}-${(month + 1).toString().padStart(2, '0')}-01`
    : `${year + 1}-01-01`;

  const { data: orders } = await client
    .from('production_orders')
    .select(`
      id, total_amount, style_id, quantity,
      styles (id, style_no, style_name, category),
      order_costs (amount, cost_type)
    `)
    .gte('delivery_date', startDate)
    .lt('delivery_date', endDate)
    .eq('status', 'completed');

  // 按款式分组
  const styleProfits: Record<string, any> = {};

  orders?.forEach((order: any) => {
    const styleId = order.style_id;
    if (!styleProfits[styleId]) {
      styleProfits[styleId] = {
        styleId,
        styleNo: order.styles?.style_no,
        styleName: order.styles?.style_name,
        category: order.styles?.category,
        revenue: 0,
        cost: 0,
        quantity: 0,
        orders: 0
      };
    }

    styleProfits[styleId].revenue += order.total_amount || 0;
    styleProfits[styleId].quantity += order.quantity || 0;
    styleProfits[styleId].orders += 1;

    if (order.order_costs) {
      styleProfits[styleId].cost += order.order_costs.reduce(
        (sum: number, c: any) => sum + (c.amount || 0), 0
      );
    }
  });

  const results = Object.values(styleProfits)
    .map((sp: any) => ({
      ...sp,
      profit: sp.revenue - sp.cost,
      profitPerUnit: sp.quantity > 0 ? (sp.revenue - sp.cost) / sp.quantity : 0,
      profitMargin: sp.revenue > 0 ? ((sp.revenue - sp.cost) / sp.revenue * 100) : 0
    }))
    .sort((a: any, b: any) => b.profit - a.profit);

  return NextResponse.json({
    success: true,
    data: {
      all: results,
      topStyles: results.slice(0, 10),
      byCategory: groupByCategory(results)
    }
  });
}

/**
 * 智能报价
 */
async function smartQuote(client: any, searchParams: URLSearchParams) {
  const styleId = searchParams.get('style_id');
  const quantity = parseInt(searchParams.get('quantity') || '1000');

  if (!styleId) {
    return NextResponse.json({ 
      success: false, 
      error: '请提供款式ID' 
    }, { status: 400 });
  }

  // 获取款式信息
  const { data: style } = await client
    .from('styles')
    .select('*')
    .eq('id', styleId)
    .single();

  if (!style) {
    return NextResponse.json({ 
      success: false, 
      error: '款式不存在' 
    }, { status: 404 });
  }

  // 获取BOM
  const { data: bomItems } = await client
    .from('style_bom')
    .select(`
      *,
      materials (code, name, unit, unit_price)
    `)
    .eq('style_id', styleId);

  // 获取工序
  const { data: processes } = await client
    .from('style_processes')
    .select('*')
    .eq('style_id', styleId);

  // 计算成本
  const materialCost = bomItems?.reduce((sum: number, item: any) => {
    const price = item.materials?.unit_price || item.estimated_unit_price || 0;
    return sum + (item.quantity || 0) * price;
  }, 0) || 0;

  const laborCost = processes?.reduce((sum: number, p: any) => {
    const hourlyRate = 25; // 假设时薪25元
    const hours = (p.standard_time || 0) / 3600;
    return sum + hours * hourlyRate;
  }, 0) || 0;

  // 制造费用（按人工成本的30%）
  const overheadCost = laborCost * 0.3;

  // 总成本
  const totalCost = materialCost + laborCost + overheadCost;

  // 建议报价（按成本加成）
  const profitMargins = [0.15, 0.25, 0.35]; // 15%, 25%, 35%
  const quotes = profitMargins.map(margin => ({
    margin: `${Math.round(margin * 100)}%`,
    unitPrice: Math.ceil((totalCost * (1 + margin)) * 100) / 100,
    totalPrice: Math.ceil(totalCost * (1 + margin) * quantity * 100) / 100
  }));

  // 数量折扣
  const volumeDiscount = quantity >= 5000 ? 0.05 : quantity >= 2000 ? 0.03 : 0;

  return NextResponse.json({
    success: true,
    data: {
      style: {
        id: style.id,
        styleNo: style.style_no,
        styleName: style.style_name
      },
      quantity,
      costs: {
        material: Math.round(materialCost * 100) / 100,
        labor: Math.round(laborCost * 100) / 100,
        overhead: Math.round(overheadCost * 100) / 100,
        total: Math.round(totalCost * 100) / 100
      },
      quotes,
      volumeDiscount: volumeDiscount > 0 ? `${Math.round(volumeDiscount * 100)}%` : '无',
      recommendedQuote: quotes[1] // 推荐中间档
    }
  });
}

/**
 * 效率排行榜
 */
async function getEfficiencyRanking(client: any, searchParams: URLSearchParams) {
  const type = searchParams.get('type') || 'worker';
  const period = searchParams.get('period') || 'month';

  const today = new Date();
  let startDate: string;

  switch (period) {
    case 'week':
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case 'month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      break;
    case 'year':
      startDate = new Date(today.getFullYear(), 0, 1).toISOString();
      break;
    default:
      startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  }

  if (type === 'worker') {
    const { data: timings } = await client
      .from('process_timing')
      .select(`
        employee_id,
        quantity_completed,
        total_time_seconds,
        employees (id, name, department)
      `)
      .gte('created_at', startDate);

    // 按工人统计
    const workerStats: Record<string, any> = {};
    timings?.forEach((t: any) => {
      const empId = t.employee_id;
      if (!workerStats[empId]) {
        workerStats[empId] = {
          employeeId: empId,
          employeeName: t.employees?.name,
          department: t.employees?.department,
          totalOutput: 0,
          totalSeconds: 0,
          records: 0
        };
      }
      workerStats[empId].totalOutput += t.quantity_completed || 0;
      workerStats[empId].totalSeconds += t.total_time_seconds || 0;
      workerStats[empId].records += 1;
    });

    const ranking = Object.values(workerStats)
      .map((w: any) => ({
        ...w,
        avgTakt: w.totalOutput > 0 ? w.totalSeconds / w.totalOutput : 0,
        efficiency: w.totalSeconds > 0 ? w.totalOutput / (w.totalSeconds / 3600) : 0
      }))
      .sort((a: any, b: any) => b.totalOutput - a.totalOutput);

    return NextResponse.json({
      success: true,
      data: {
        type: 'worker',
        period,
        ranking: ranking.slice(0, 20),
        total: ranking.length
      }
    });
  }

  // 工厂排行
  if (type === 'factory' || type === 'line') {
    const { data: lines } = await client
      .from('production_lines')
      .select('*')
      .eq('status', 'active');

    const lineStats = await Promise.all(
      (lines || []).map(async (line: any) => {
        const { data: output } = await client
          .from('process_tracking')
          .select('quantity_completed')
          .eq('line_id', line.id)
          .gte('created_at', startDate);

        const totalOutput = output?.reduce((sum: number, o: any) => sum + (o.quantity_completed || 0), 0) || 0;

        return {
          lineId: line.id,
          lineCode: line.line_code,
          lineName: line.line_name,
          workshop: line.workshop,
          totalOutput,
          capacity: line.capacity,
          utilizationRate: line.capacity > 0 ? Math.round((totalOutput / line.capacity) * 100) : 0
        };
      })
    );

    lineStats.sort((a: any, b: any) => b.totalOutput - a.totalOutput);

    return NextResponse.json({
      success: true,
      data: {
        type: 'line',
        period,
        ranking: lineStats
      }
    });
  }

  return NextResponse.json({ success: false, error: '未知排行类型' }, { status: 400 });
}

// 辅助函数
function optimizeProcessesByStyle(processes: any[], style: any): any[] {
  let optimized = [...processes];

  // 如果有特殊工艺要求，添加工序
  if (style.has_embroidery) {
    optimized.splice(4, 0, { process: '刺绣', sequence: 5, standardTime: 60, machine: '绣花机', skill: '高级' });
  }

  if (style.has_printing) {
    optimized.splice(4, 0, { process: '印花', sequence: 5, standardTime: 45, machine: '印花机', skill: '中级' });
  }

  if (style.has_washing) {
    optimized.push({ process: '水洗', sequence: optimized.length + 1, standardTime: 40, machine: '水洗机', skill: '中级' });
  }

  // 重新编号
  return optimized.map((p, i) => ({ ...p, sequence: i + 1 }));
}

function suggestLineConfig(processes: any[]): any {
  const totalSMV = processes.reduce((sum, p) => sum + p.standardTime, 0);
  const targetTakt = 60; // 目标节拍60秒

  const stationCount = Math.ceil(totalSMV / targetTakt);
  const stations: any[] = [];

  let currentStation: any = { processes: [], totalSMV: 0 };
  
  processes.forEach(p => {
    if (currentStation.totalSMV + p.standardTime > targetTakt * 1.2) {
      stations.push(currentStation);
      currentStation = { processes: [p], totalSMV: p.standardTime };
    } else {
      currentStation.processes.push(p);
      currentStation.totalSMV += p.standardTime;
    }
  });

  if (currentStation.processes.length > 0) {
    stations.push(currentStation);
  }

  return {
    recommendedStations: stations.length,
    targetTakt,
    stations: stations.map((s, i) => ({
      stationNo: i + 1,
      processes: s.processes.map((p: any) => p.process),
      totalSMV: s.totalSMV
    }))
  };
}

function analyzeSkillRequirements(processes: any[]): any {
  const skills: Record<string, number> = {};
  processes.forEach(p => {
    const skill = p.skill || '中级';
    skills[skill] = (skills[skill] || 0) + 1;
  });
  return skills;
}

function analyzeStyleFeatures(style: any): any {
  return {
    category: style.category || 'tshirt',
    fabric: style.fabric_type || 'knit',
    hasEmbroidery: style.has_embroidery || false,
    hasPrinting: style.has_printing || false,
    hasWashing: style.has_washing || false,
    hasLining: style.has_lining || false,
    pocketCount: style.pocket_count || 0,
    buttonCount: style.button_count || 0,
    zipperCount: style.zipper_count || 0
  };
}

function generateProcessesByFeatures(features: any): any[] {
  // 基础工序
  const baseProcesses: Record<string, any[]> = {
    tshirt: [
      { process: '验布', standardTime: 30, machine: '验布机', skill: '初级' },
      { process: '裁剪', standardTime: 45, machine: '裁床', skill: '中级' },
      { process: '衣身缝合', standardTime: 60, machine: '平车', skill: '中级' },
      { process: '整烫', standardTime: 25, machine: '烫台', skill: '初级' },
      { process: '质检', standardTime: 20, machine: '无', skill: '中级' }
    ]
  };

  let processes = [...(baseProcesses[features.category] || baseProcesses.tshirt)];

  // 添加特殊工序
  if (features.hasEmbroidery) {
    processes.splice(2, 0, { process: '刺绣', standardTime: 60, machine: '绣花机', skill: '高级' });
  }

  if (features.hasPrinting) {
    processes.splice(2, 0, { process: '印花', standardTime: 45, machine: '印花机', skill: '中级' });
  }

  return processes;
}

function generateRecommendations(riskScore: number, factors: string[]): string[] {
  const recommendations: string[] = [];

  if (factors.includes('进度落后预期')) {
    recommendations.push('建议增加人力或延长工作时间');
  }

  if (factors.includes('物料未齐套')) {
    recommendations.push('催促采购部门加快物料到位');
  }

  if (factors.includes('即将到期') || factors.includes('临近交付')) {
    recommendations.push('优先安排生产资源');
  }

  if (factors.some(f => f.includes('质检不通过'))) {
    recommendations.push('加强质量管理，排查质量问题');
  }

  if (riskScore >= 60) {
    recommendations.push('建议立即召开紧急会议，制定应对方案');
    recommendations.push('考虑与客户沟通延迟交付');
  }

  return recommendations;
}

function groupByCategory(styles: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  styles.forEach(s => {
    const cat = s.category || '其他';
    if (!grouped[cat]) {
      grouped[cat] = [];
    }
    grouped[cat].push(s);
  });
  return grouped;
}

async function analyzeProfitByOrder(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.json({ success: false, error: '缺少订单ID' }, { status: 400 });
  }

  const { data: order } = await client
    .from('production_orders')
    .select(`
      *,
      customers (name),
      styles (style_no, style_name),
      order_costs (*)
    `)
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
  }

  const revenue = order.total_amount || 0;
  const costs = order.order_costs || [];
  const totalCost = costs.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

  return NextResponse.json({
    success: true,
    data: {
      order,
      revenue,
      costs: {
        material: costs.filter((c: any) => c.cost_type === 'material').reduce((s: number, c: any) => s + c.amount, 0),
        labor: costs.filter((c: any) => c.cost_type === 'labor').reduce((s: number, c: any) => s + c.amount, 0),
        overhead: costs.filter((c: any) => c.cost_type === 'overhead').reduce((s: number, c: any) => s + c.amount, 0),
        total: totalCost
      },
      profit: revenue - totalCost,
      profitMargin: revenue > 0 ? ((revenue - totalCost) / revenue * 100) : 0
    }
  });
}

async function optimizeMaterial(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.json({ success: false, error: '缺少订单ID' }, { status: 400 });
  }

  // 获取订单和BOM信息
  const { data: order } = await client
    .from('production_orders')
    .select('*, styles (*)')
    .eq('id', orderId)
    .single();

  const { data: bom } = await client
    .from('order_bom')
    .select('*')
    .eq('order_id', orderId);

  // 分析优化建议
  const suggestions: any[] = [];

  if (bom) {
    // 检查利用率
    const fabricItems = bom.filter((b: any) => b.material_type === '面料');
    fabricItems.forEach((item: any) => {
      if (item.utilization_rate < 0.85) {
        suggestions.push({
          type: 'fabric',
          material: item.material_name,
          currentRate: item.utilization_rate,
          potentialSaving: `可节省${Math.round((0.9 - item.utilization_rate) * 100)}%面料`,
          recommendation: '优化排料方案，考虑混码排版'
        });
      }
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      order,
      suggestions,
      potentialSaving: suggestions.length * 3 // 估计节省百分比
    }
  });
}

async function assessRisk(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.json({ success: false, error: '缺少订单ID' }, { status: 400 });
  }

  const prediction = await predictOrderDelay(client, orderId);
  return prediction;
}

async function trainModel(client: any, data: any) {
  // 模型训练逻辑（实际应用中连接ML服务）
  return NextResponse.json({
    success: true,
    message: '模型训练任务已提交',
    data: { taskId: `TRAIN${Date.now()}` }
  });
}

async function recordFeedback(client: any, data: any) {
  const { orderId, predictionId, actualResult, feedback } = data;

  await client
    .from('ai_feedback')
    .insert({
      order_id: orderId,
      prediction_id: predictionId,
      actual_result: actualResult,
      feedback,
      created_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    message: '反馈已记录，将用于模型优化'
  });
}
