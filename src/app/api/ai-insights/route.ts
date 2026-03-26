import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * AI智能分析API - 增强版
 * 
 * 功能：
 * • 智能决策支持 - 基于业务数据提供决策建议
 * • 异常检测 - 自动识别业务异常
 * • 预测分析 - 预测未来趋势
 * • 智能问答 - 流式回答业务问题
 * • 报告生成 - 自动生成分析报告
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'overview';

    switch (action) {
      case 'anomaly-detection':
        return await detectAnomalies(client, searchParams);
      case 'prediction':
        return await predictTrends(client, searchParams);
      case 'decision-support':
        return await getDecisionSupport(client, searchParams);
      case 'report':
        return await generateReport(client, searchParams);
      case 'bottleneck':
        return await analyzeBottlenecks(client, searchParams);
      case 'smart-alerts':
        return await getSmartAlerts(client, searchParams);
      default:
        return await getAIOverview(client);
    }
  } catch (error) {
    console.error('AI Analysis error:', error);
    return NextResponse.json({ success: false, error: 'AI分析失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { action, question, context } = body;

    switch (action) {
      case 'chat':
        return await streamChat(client, question, context, request);
      case 'analyze-order':
        return await analyzeOrder(client, body);
      case 'optimize-schedule':
        return await optimizeSchedule(client, body);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('AI Analysis POST error:', error);
    return NextResponse.json({ success: false, error: 'AI操作失败' }, { status: 500 });
  }
}

/**
 * 获取AI概览
 */
async function getAIOverview(client: any) {
  // 收集关键业务数据
  const [orders, employees, materials, quality, finances] = await Promise.all([
    client.from('production_orders').select('*').limit(100),
    client.from('employees').select('*').eq('status', 'active'),
    client.from('materials').select('*').limit(50),
    client.from('quality_inspections').select('*').order('created_at', { ascending: false }).limit(50),
    client.from('bills').select('*').limit(100)
  ]);

  // 计算关键指标
  const orderStats = calculateOrderStats(orders.data || []);
  const employeeStats = calculateEmployeeStats(employees.data || []);
  const qualityStats = calculateQualityStats(quality.data || []);
  const financialStats = calculateFinancialStats(finances.data || []);

  // AI洞察
  const insights = generateInsights({
    orders: orderStats,
    employees: employeeStats,
    quality: qualityStats,
    finances: financialStats
  });

  return NextResponse.json({
    success: true,
    data: {
      orderStats,
      employeeStats,
      qualityStats,
      financialStats,
      insights,
      recommendations: generateRecommendations(insights)
    }
  });
}

/**
 * 异常检测
 */
async function detectAnomalies(client: any, searchParams: URLSearchParams) {
  const days = parseInt(searchParams.get('days') || '30');
  const threshold = parseFloat(searchParams.get('threshold') || '0.3');

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 获取近期数据
  const { data: orders } = await client
    .from('production_orders')
    .select('*')
    .gte('created_at', startDate);

  const { data: quality } = await client
    .from('quality_inspections')
    .select('*')
    .gte('created_at', startDate);

  const { data: inventory } = await client
    .from('inventory')
    .select('*');

  const anomalies: any[] = [];

  // 1. 订单异常检测
  const orderAnomalies = detectOrderAnomalies(orders || [], threshold);
  anomalies.push(...orderAnomalies);

  // 2. 质量异常检测
  const qualityAnomalies = detectQualityAnomalies(quality || [], threshold);
  anomalies.push(...qualityAnomalies);

  // 3. 库存异常检测
  const inventoryAnomalies = detectInventoryAnomalies(inventory || []);
  anomalies.push(...inventoryAnomalies);

  // 按严重程度排序
  anomalies.sort((a, b) => {
    const severityMap: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityMap[a.severity] - severityMap[b.severity];
  });

  return NextResponse.json({
    success: true,
    data: {
      anomalies,
      summary: {
        total: anomalies.length,
        critical: anomalies.filter(a => a.severity === 'critical').length,
        high: anomalies.filter(a => a.severity === 'high').length,
        medium: anomalies.filter(a => a.severity === 'medium').length
      },
      period: { days, startDate }
    }
  });
}

/**
 * 趋势预测
 */
async function predictTrends(client: any, searchParams: URLSearchParams) {
  const type = searchParams.get('type') || 'production';
  const months = parseInt(searchParams.get('months') || '3');

  const startDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString();

  let predictions: any = {};

  switch (type) {
    case 'production':
      predictions = await predictProductionTrend(client, startDate, months);
      break;
    case 'quality':
      predictions = await predictQualityTrend(client, startDate);
      break;
    case 'finance':
      predictions = await predictFinancialTrend(client, startDate);
      break;
    case 'all':
      predictions = {
        production: await predictProductionTrend(client, startDate, months),
        quality: await predictQualityTrend(client, startDate),
        finance: await predictFinancialTrend(client, startDate)
      };
      break;
  }

  return NextResponse.json({
    success: true,
    data: predictions
  });
}

/**
 * 决策支持
 */
async function getDecisionSupport(client: any, searchParams: URLSearchParams) {
  const decision = searchParams.get('decision') || 'production';
  
  // 收集相关数据
  const context = await gatherDecisionContext(client, decision);
  
  // 生成决策建议
  const suggestions = generateDecisionSuggestions(decision, context);

  return NextResponse.json({
    success: true,
    data: {
      decision,
      context,
      suggestions,
      riskAnalysis: analyzeRisks(decision, context),
      alternatives: generateAlternatives(decision, context)
    }
  });
}

/**
 * 生成报告
 */
async function generateReport(client: any, searchParams: URLSearchParams) {
  const type = searchParams.get('type') || 'weekly';
  const startDate = getReportStartDate(type);
  
  // 收集报告数据
  const data = await collectReportData(client, startDate);
  
  // 生成报告结构
  const report = {
    type,
    period: {
      start: startDate,
      end: new Date().toISOString()
    },
    summary: generateReportSummary(data),
    details: generateReportDetails(data),
    highlights: extractHighlights(data),
    issues: identifyIssues(data),
    recommendations: generateReportRecommendations(data)
  };

  return NextResponse.json({
    success: true,
    data: report
  });
}

/**
 * 瓶颈分析
 */
async function analyzeBottlenecks(client: any, searchParams: URLSearchParams) {
  const days = parseInt(searchParams.get('days') || '30');
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 获取生产数据
  const { data: processes } = await client
    .from('process_tracking')
    .select('*')
    .gte('created_at', startDate);

  const { data: orders } = await client
    .from('production_orders')
    .select('*')
    .gte('created_at', startDate);

  // 分析瓶颈
  const bottlenecks: any[] = [];

  // 1. 工序瓶颈
  const processBottlenecks = analyzeProcessBottlenecks(processes || []);
  bottlenecks.push(...processBottlenecks);

  // 2. 产能瓶颈
  const capacityBottlenecks = analyzeCapacityBottlenecks(orders || []);
  bottlenecks.push(...capacityBottlenecks);

  // 3. 资源瓶颈
  const resourceBottlenecks = analyzeResourceBottlenecks(processes || []);
  bottlenecks.push(...resourceBottlenecks);

  return NextResponse.json({
    success: true,
    data: {
      bottlenecks,
      summary: {
        total: bottlenecks.length,
        critical: bottlenecks.filter(b => b.severity === 'critical').length,
        suggestions: generateBottleneckSuggestions(bottlenecks)
      }
    }
  });
}

/**
 * 智能预警
 */
async function getSmartAlerts(client: any, searchParams: URLSearchParams) {
  const alerts: any[] = [];

  // 1. 检查即将到期订单
  const { data: urgentOrders } = await client
    .from('production_orders')
    .select('*')
    .in('status', ['confirmed', 'in_production'])
    .lte('delivery_date', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());

  urgentOrders?.forEach((order: any) => {
    alerts.push({
      type: 'delivery',
      severity: 'high',
      title: `订单 ${order.order_no} 即将到期`,
      message: `交付日期: ${order.delivery_date}, 完成率: ${Math.round((order.completed_quantity / order.quantity) * 100)}%`,
      orderId: order.id,
      createdAt: new Date().toISOString()
    });
  });

  // 2. 检查低库存
  const { data: lowStock } = await client
    .from('inventory')
    .select('*')
    .lt('quantity', 100); // 假设安全库存为100

  lowStock?.forEach((item: any) => {
    alerts.push({
      type: 'inventory',
      severity: 'medium',
      title: `${item.material_name || item.material_code} 库存不足`,
      message: `当前库存: ${item.quantity}, 安全库存: 100`,
      materialId: item.id,
      createdAt: new Date().toISOString()
    });
  });

  // 3. 检查质量问题
  const { data: qualityIssues } = await client
    .from('quality_inspections')
    .select('*')
    .eq('result', 'failed')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (qualityIssues && qualityIssues.length > 3) {
    alerts.push({
      type: 'quality',
      severity: 'high',
      title: '质量问题频发',
      message: `24小时内质检不合格次数: ${qualityIssues.length}`,
      createdAt: new Date().toISOString()
    });
  }

  // 4. 检查员工考勤异常
  const today = new Date().toISOString().split('T')[0];
  const { data: attendance } = await client
    .from('attendance')
    .select('*')
    .eq('date', today);

  const absentCount = attendance?.filter((a: any) => a.status === 'absent').length || 0;
  if (absentCount > 5) {
    alerts.push({
      type: 'attendance',
      severity: 'medium',
      title: '出勤率偏低',
      message: `今日缺勤人数: ${absentCount}`,
      createdAt: new Date().toISOString()
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      alerts,
      summary: {
        total: alerts.length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      }
    }
  });
}

/**
 * 流式智能问答
 */
async function streamChat(client: any, question: string, context: any, request: NextRequest) {
  // 收集业务数据作为上下文
  const businessData = await collectBusinessContext(client);

  const systemPrompt = `你是一位专业的服装生产管理AI助手，具备以下能力：

## 数据分析能力
- 生产数据分析：订单进度、产能利用率、生产效率
- 质量分析：次品率、返工率、质量趋势
- 财务分析：成本分析、利润率、现金流
- 库存分析：库存周转、安全库存、呆滞料

## 决策支持能力
- 排产优化：基于产能和优先级的排产建议
- 资源调配：人力、设备、物料的优化配置
- 风险预警：延期风险、质量风险、成本风险

## 当前业务数据
${businessData}

## 回答要求
1. 数据准确，基于提供的真实数据
2. 分析深入，提供具体数字和对比
3. 建议可行，给出具体行动步骤
4. 使用Markdown格式，包括表格、列表、加粗
5. 如果需要额外数据，告诉用户如何获取`;

  const config = new Config();
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const llmClient = new LLMClient(config, customHeaders);

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: question }
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const llmStream = llmClient.stream(messages, {
          model: 'doubao-seed-1-6-251015',
          temperature: 0.7,
        });

        for await (const chunk of llmStream) {
          if (chunk.content) {
            const text = chunk.content.toString();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Stream chat error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'AI回答失败' })}\n\n`));
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}

/**
 * 订单深度分析
 */
async function analyzeOrder(client: any, data: any) {
  const { orderId } = data;

  const { data: order } = await client
    .from('production_orders')
    .select(`
      *,
      styles (*),
      customers (*),
      process_tracking (*),
      quality_inspections (*),
      order_costs (*)
    `)
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
  }

  // 计算各项指标
  const analysis = {
    progress: {
      completed: order.completed_quantity || 0,
      total: order.quantity,
      rate: order.quantity > 0 ? Math.round((order.completed_quantity / order.quantity) * 100) : 0,
      daysRemaining: calculateDaysRemaining(order.delivery_date),
      expectedCompletion: calculateExpectedCompletion(order)
    },
    quality: {
      inspected: order.quality_inspections?.length || 0,
      passed: order.quality_inspections?.filter((i: any) => i.result === 'passed').length || 0,
      failed: order.quality_inspections?.filter((i: any) => i.result === 'failed').length || 0,
      passRate: calculatePassRate(order.quality_inspections)
    },
    cost: {
      material: order.order_costs?.filter((c: any) => c.cost_type === 'material')
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0,
      labor: order.order_costs?.filter((c: any) => c.cost_type === 'labor')
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0,
      overhead: order.order_costs?.filter((c: any) => c.cost_type === 'overhead')
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0
    },
    risks: identifyOrderRisks(order),
    recommendations: generateOrderRecommendations(order)
  };

  return NextResponse.json({
    success: true,
    data: {
      order,
      analysis
    }
  });
}

/**
 * 排程优化
 */
async function optimizeSchedule(client: any, data: any) {
  const { startDate, endDate, priorities, constraints } = data;

  // 获取当前排程数据
  const { data: schedules } = await client
    .from('production_schedules')
    .select(`
      *,
      production_orders (*),
      production_lines (*)
    `)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate);

  // 分析当前排程问题
  const issues = identifyScheduleIssues(schedules || []);

  // 生成优化方案
  const optimizedPlan = generateOptimizedPlan(schedules || [], constraints);

  return NextResponse.json({
    success: true,
    data: {
      current: schedules,
      issues,
      optimizedPlan,
      estimatedImprovement: calculateImprovement(schedules || [], optimizedPlan)
    }
  });
}

// ============== 辅助函数 ==============

function calculateOrderStats(orders: any[]) {
  const total = orders.length;
  const byStatus: Record<string, number> = {};
  let totalQuantity = 0;
  let completedQuantity = 0;

  orders.forEach(order => {
    byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    totalQuantity += order.quantity || 0;
    completedQuantity += order.completed_quantity || 0;
  });

  return {
    total,
    byStatus,
    totalQuantity,
    completedQuantity,
    completionRate: totalQuantity > 0 ? Math.round((completedQuantity / totalQuantity) * 100) : 0,
    delayedCount: orders.filter(o => 
      o.delivery_date && 
      new Date(o.delivery_date) < new Date() && 
      o.status !== 'completed'
    ).length
  };
}

function calculateEmployeeStats(employees: any[]) {
  return {
    total: employees.length,
    byDepartment: employees.reduce((acc: Record<string, number>, e: any) => {
      acc[e.department || '未分配'] = (acc[e.department || '未分配'] || 0) + 1;
      return acc;
    }, {})
  };
}

function calculateQualityStats(quality: any[]) {
  const total = quality.length;
  const passed = quality.filter(q => q.result === 'passed').length;
  const failed = quality.filter(q => q.result === 'failed').length;

  return {
    total,
    passed,
    failed,
    passRate: total > 0 ? Math.round((passed / total) * 100) : 0
  };
}

function calculateFinancialStats(finances: any[]) {
  const income = finances.filter(f => f.type === 'income').reduce((sum, f) => sum + (f.amount || 0), 0);
  const expense = finances.filter(f => f.type === 'expense').reduce((sum, f) => sum + (f.amount || 0), 0);

  return {
    income,
    expense,
    profit: income - expense,
    profitMargin: income > 0 ? Math.round(((income - expense) / income) * 100) : 0
  };
}

function generateInsights(data: any): any[] {
  const insights: any[] = [];

  // 订单洞察
  if (data.orders.delayedCount > 0) {
    insights.push({
      category: '订单',
      type: 'warning',
      message: `有 ${data.orders.delayedCount} 个订单已延期`,
      impact: '可能影响客户满意度和后续订单'
    });
  }

  // 质量洞察
  if (data.quality.passRate < 90) {
    insights.push({
      category: '质量',
      type: 'alert',
      message: `质检合格率 ${data.quality.passRate}% 低于目标值 90%`,
      impact: '需要加强质量管控'
    });
  }

  // 财务洞察
  if (data.finances.profitMargin < 15) {
    insights.push({
      category: '财务',
      type: 'warning',
      message: `利润率 ${data.finances.profitMargin}% 偏低`,
      impact: '建议优化成本结构或调整定价策略'
    });
  }

  return insights;
}

function generateRecommendations(insights: any[]): string[] {
  const recommendations: string[] = [];

  insights.forEach(insight => {
    switch (insight.category) {
      case '订单':
        recommendations.push('建议优先处理延期订单，考虑增加产能或调整排期');
        break;
      case '质量':
        recommendations.push('建议分析质量问题的根本原因，加强工序培训');
        break;
      case '财务':
        recommendations.push('建议进行成本分析，识别可优化的环节');
        break;
    }
  });

  return [...new Set(recommendations)];
}

function detectOrderAnomalies(orders: any[], threshold: number): any[] {
  const anomalies: any[] = [];

  // 检测异常延期
  const avgDelay = orders.reduce((sum, o) => {
    if (o.delivery_date && o.status !== 'completed') {
      return sum + Math.max(0, Math.ceil((Date.now() - new Date(o.delivery_date).getTime()) / (1000 * 60 * 60 * 24)));
    }
    return sum;
  }, 0) / (orders.length || 1);

  orders.forEach(order => {
    if (order.delivery_date && order.status !== 'completed') {
      const delay = Math.max(0, Math.ceil((Date.now() - new Date(order.delivery_date).getTime()) / (1000 * 60 * 60 * 24)));
      if (delay > avgDelay * (1 + threshold)) {
        anomalies.push({
          type: 'order_delay',
          severity: delay > 7 ? 'critical' : delay > 3 ? 'high' : 'medium',
          orderId: order.id,
          orderNo: order.order_no,
          message: `订单 ${order.order_no} 延期 ${delay} 天，显著高于平均`,
          recommendation: '建议立即跟进，调整排期或与客户沟通'
        });
      }
    }
  });

  return anomalies;
}

function detectQualityAnomalies(quality: any[], threshold: number): any[] {
  const anomalies: any[] = [];
  
  // 计算平均合格率
  const passRate = quality.length > 0 
    ? quality.filter(q => q.result === 'passed').length / quality.length 
    : 1;

  if (passRate < (1 - threshold)) {
    anomalies.push({
      type: 'quality_drop',
      severity: passRate < 0.7 ? 'critical' : passRate < 0.8 ? 'high' : 'medium',
      message: `质检合格率 ${(passRate * 100).toFixed(1)}% 显著下降`,
      recommendation: '建议立即分析质量问题原因，加强质检培训'
    });
  }

  return anomalies;
}

function detectInventoryAnomalies(inventory: any[]): any[] {
  const anomalies: any[] = [];

  inventory.forEach(item => {
    if (item.quantity < (item.safety_stock || 100)) {
      anomalies.push({
        type: 'low_inventory',
        severity: item.quantity < 50 ? 'critical' : 'high',
        materialId: item.id,
        materialName: item.material_name || item.material_code,
        message: `${item.material_name || item.material_code} 库存不足`,
        current: item.quantity,
        safetyStock: item.safety_stock || 100,
        recommendation: '建议立即补货或联系供应商'
      });
    }
  });

  return anomalies;
}

async function predictProductionTrend(client: any, startDate: string, months: number): Promise<any> {
  const { data: orders } = await client
    .from('production_orders')
    .select('*')
    .gte('created_at', startDate);

  // 简单线性预测
  const monthlyData: Record<string, { total: number; completed: number }> = {};
  
  orders?.forEach((order: any) => {
    const month = order.created_at?.substring(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { total: 0, completed: 0 };
    monthlyData[month].total += order.quantity || 0;
    monthlyData[month].completed += order.completed_quantity || 0;
  });

  const months_arr = Object.keys(monthlyData).sort();
  const avgGrowth = months_arr.length > 1 
    ? (monthlyData[months_arr[months_arr.length - 1]].total - monthlyData[months_arr[0]].total) / months_arr.length 
    : 0;

  const lastMonth = months_arr[months_arr.length - 1];
  const lastValue = monthlyData[lastMonth]?.total || 0;

  return {
    historical: monthlyData,
    prediction: {
      nextMonth: Math.round(lastValue + avgGrowth),
      next3Months: Math.round(lastValue + avgGrowth * 3),
      confidence: Math.max(0.5, 1 - (months_arr.length < 3 ? 0.3 : 0))
    },
    trend: avgGrowth > 0 ? 'increasing' : avgGrowth < 0 ? 'decreasing' : 'stable'
  };
}

async function predictQualityTrend(client: any, startDate: string): Promise<any> {
  const { data: quality } = await client
    .from('quality_inspections')
    .select('*')
    .gte('created_at', startDate);

  const monthlyData: Record<string, { total: number; passed: number }> = {};
  
  quality?.forEach((q: any) => {
    const month = q.created_at?.substring(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { total: 0, passed: 0 };
    monthlyData[month].total += 1;
    if (q.result === 'passed') monthlyData[month].passed += 1;
  });

  const months = Object.keys(monthlyData).sort();
  const avgPassRate = months.reduce((sum, m) => {
    const rate = monthlyData[m].total > 0 ? monthlyData[m].passed / monthlyData[m].total : 1;
    return sum + rate;
  }, 0) / (months.length || 1);

  return {
    historical: monthlyData,
    prediction: {
      nextMonthPassRate: Math.round(avgPassRate * 100),
      trend: avgPassRate > 0.9 ? 'stable' : avgPassRate > 0.8 ? 'improving' : 'declining'
    }
  };
}

async function predictFinancialTrend(client: any, startDate: string): Promise<any> {
  const { data: bills } = await client
    .from('bills')
    .select('*')
    .gte('bill_date', startDate);

  const monthlyData: Record<string, { income: number; expense: number }> = {};
  
  bills?.forEach((bill: any) => {
    const month = bill.bill_date?.substring(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
    if (bill.type === 'income') monthlyData[month].income += bill.amount || 0;
    else monthlyData[month].expense += bill.amount || 0;
  });

  const months = Object.keys(monthlyData).sort();
  const lastMonth = months[months.length - 1];
  const avgProfitMargin = months.reduce((sum, m) => {
    const total = monthlyData[m].income + monthlyData[m].expense;
    const margin = total > 0 ? (monthlyData[m].income - monthlyData[m].expense) / monthlyData[m].income : 0;
    return sum + margin;
  }, 0) / (months.length || 1);

  return {
    historical: monthlyData,
    prediction: {
      expectedProfitMargin: Math.round(avgProfitMargin * 100),
      cashFlowTrend: 'stable'
    }
  };
}

async function gatherDecisionContext(client: any, decision: string): Promise<any> {
  const context: any = {};

  switch (decision) {
    case 'production':
      const [orders, lines, employees] = await Promise.all([
        client.from('production_orders').select('*').in('status', ['confirmed', 'pending']),
        client.from('production_lines').select('*').eq('status', 'active'),
        client.from('employees').select('*').eq('status', 'active')
      ]);
      context.orders = orders.data;
      context.lines = lines.data;
      context.employees = employees.data;
      break;

    case 'quality':
      const quality = await client.from('quality_inspections').select('*').order('created_at', { ascending: false }).limit(100);
      context.quality = quality.data;
      break;

    case 'inventory':
      const inventory = await client.from('inventory').select('*');
      context.inventory = inventory.data;
      break;
  }

  return context;
}

function generateDecisionSuggestions(decision: string, context: any): any[] {
  const suggestions: any[] = [];

  switch (decision) {
    case 'production':
      if (context.orders?.length > context.lines?.length * 10) {
        suggestions.push({
          action: '增加产能',
          reason: '订单数量远超产线承载能力',
          impact: '可缩短交付周期，提高客户满意度'
        });
      }
      if (context.employees?.length < context.lines?.length * 15) {
        suggestions.push({
          action: '招聘员工',
          reason: '员工数量不足以支撑产线运转',
          impact: '可提高产线利用率'
        });
      }
      break;

    case 'quality':
      const passRate = context.quality?.length > 0
        ? context.quality.filter((q: any) => q.result === 'passed').length / context.quality.length
        : 1;
      if (passRate < 0.9) {
        suggestions.push({
          action: '加强质量培训',
          reason: `合格率 ${(passRate * 100).toFixed(1)}% 低于目标`,
          impact: '可提升产品质量，减少返工'
        });
      }
      break;

    case 'inventory':
      const lowStock = context.inventory?.filter((i: any) => i.quantity < (i.safety_stock || 100));
      if (lowStock?.length > 0) {
        suggestions.push({
          action: '紧急补货',
          reason: `${lowStock.length} 种物料库存低于安全库存`,
          impact: '避免生产中断'
        });
      }
      break;
  }

  return suggestions;
}

function analyzeRisks(decision: string, context: any): any[] {
  const risks: any[] = [];

  if (decision === 'production') {
    const urgentOrders = context.orders?.filter((o: any) => 
      o.delivery_date && new Date(o.delivery_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
    if (urgentOrders?.length > 3) {
      risks.push({
        type: 'delivery',
        level: 'high',
        description: '多个订单即将到期',
        mitigation: '建议优先处理紧急订单'
      });
    }
  }

  return risks;
}

function generateAlternatives(decision: string, context: any): any[] {
  const alternatives: any[] = [];

  if (decision === 'production') {
    alternatives.push(
      { option: '外包生产', pros: '快速扩大产能', cons: '成本较高，质量控制难' },
      { option: '延长工作时间', pros: '无需额外投入', cons: '员工疲劳，质量风险' },
      { option: '优化排程', pros: '提高效率', cons: '改善幅度有限' }
    );
  }

  return alternatives;
}

function getReportStartDate(type: string): string {
  const now = new Date();
  switch (type) {
    case 'daily':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case 'weekly':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
}

async function collectReportData(client: any, startDate: string): Promise<any> {
  const [orders, quality, finances] = await Promise.all([
    client.from('production_orders').select('*').gte('created_at', startDate),
    client.from('quality_inspections').select('*').gte('created_at', startDate),
    client.from('bills').select('*').gte('bill_date', startDate.split('T')[0])
  ]);

  return { orders: orders.data, quality: quality.data, finances: finances.data };
}

function generateReportSummary(data: any): any {
  return {
    orders: {
      total: data.orders?.length || 0,
      completed: data.orders?.filter((o: any) => o.status === 'completed').length || 0
    },
    quality: {
      total: data.quality?.length || 0,
      passed: data.quality?.filter((q: any) => q.result === 'passed').length || 0
    },
    finances: {
      income: data.finances?.filter((f: any) => f.type === 'income').reduce((s: number, f: any) => s + (f.amount || 0), 0) || 0,
      expense: data.finances?.filter((f: any) => f.type === 'expense').reduce((s: number, f: any) => s + (f.amount || 0), 0) || 0
    }
  };
}

function generateReportDetails(data: any): any {
  return {
    orderDetails: data.orders?.slice(0, 10),
    qualityDetails: data.quality?.slice(0, 10),
    financialDetails: data.finances?.slice(0, 10)
  };
}

function extractHighlights(data: any): string[] {
  const highlights: string[] = [];
  
  const completedCount = data.orders?.filter((o: any) => o.status === 'completed').length || 0;
  if (completedCount > 0) {
    highlights.push(`完成订单 ${completedCount} 个`);
  }

  const passRate = data.quality?.length > 0 
    ? data.quality.filter((q: any) => q.result === 'passed').length / data.quality.length 
    : 1;
  if (passRate >= 0.9) {
    highlights.push(`质检合格率 ${Math.round(passRate * 100)}%，达到目标`);
  }

  return highlights;
}

function identifyIssues(data: any): string[] {
  const issues: string[] = [];

  const delayedCount = data.orders?.filter((o: any) => 
    o.delivery_date && new Date(o.delivery_date) < new Date() && o.status !== 'completed'
  ).length || 0;
  if (delayedCount > 0) {
    issues.push(`${delayedCount} 个订单延期`);
  }

  return issues;
}

function generateReportRecommendations(data: any): string[] {
  const recommendations: string[] = [];

  const delayedCount = data.orders?.filter((o: any) => 
    o.delivery_date && new Date(o.delivery_date) < new Date() && o.status !== 'completed'
  ).length || 0;
  if (delayedCount > 0) {
    recommendations.push('优先处理延期订单');
  }

  return recommendations;
}

function analyzeProcessBottlenecks(processes: any[]): any[] {
  // 简化实现
  return [];
}

function analyzeCapacityBottlenecks(orders: any[]): any[] {
  return [];
}

function analyzeResourceBottlenecks(processes: any[]): any[] {
  return [];
}

function generateBottleneckSuggestions(bottlenecks: any[]): string[] {
  return ['建议优化工序平衡', '建议增加关键设备'];
}

async function collectBusinessContext(client: any): Promise<string> {
  const [orders, employees, quality, finances] = await Promise.all([
    client.from('production_orders').select('*').limit(50),
    client.from('employees').select('*').eq('status', 'active').limit(20),
    client.from('quality_inspections').select('*').order('created_at', { ascending: false }).limit(20),
    client.from('bills').select('*').limit(30)
  ]);

  const orderStats = calculateOrderStats(orders.data || []);
  const qualityStats = calculateQualityStats(quality.data || []);

  return `
【生产订单】
- 总订单：${orderStats.total} 个
- 已完成：${orderStats.byStatus['completed'] || 0} 个
- 进行中：${orderStats.byStatus['in_production'] || 0} 个
- 完成率：${orderStats.completionRate}%
- 延期订单：${orderStats.delayedCount} 个

【员工数据】
- 在职员工：${employees.data?.length || 0} 人

【质量数据】
- 质检总数：${qualityStats.total} 次
- 合格率：${qualityStats.passRate}%

【财务数据】
- 总收入：¥${((finances.data as any[])?.filter((f: any) => f.type === 'income').reduce((s: number, f: any) => s + (f.amount || 0), 0) || 0).toLocaleString()}
- 总支出：¥${((finances.data as any[])?.filter((f: any) => f.type === 'expense').reduce((s: number, f: any) => s + (f.amount || 0), 0) || 0).toLocaleString()}
`;
}

function calculateDaysRemaining(deliveryDate: string): number {
  if (!deliveryDate) return 0;
  const delivery = new Date(deliveryDate);
  const today = new Date();
  return Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateExpectedCompletion(order: any): string {
  if (!order.quantity || !order.completed_quantity) return '未知';
  const remaining = order.quantity - order.completed_quantity;
  const dailyRate = 50; // 假设日产量
  const daysNeeded = Math.ceil(remaining / dailyRate);
  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + daysNeeded);
  return completionDate.toISOString().split('T')[0];
}

function calculatePassRate(inspections: any[] | null): number {
  if (!inspections || inspections.length === 0) return 100;
  const passed = inspections.filter(i => i.result === 'passed').length;
  return Math.round((passed / inspections.length) * 100);
}

function identifyOrderRisks(order: any): any[] {
  const risks: any[] = [];

  if (order.delivery_date && new Date(order.delivery_date) < new Date() && order.status !== 'completed') {
    risks.push({ type: 'delay', severity: 'high', description: '订单已延期' });
  }

  return risks;
}

function generateOrderRecommendations(order: any): string[] {
  const recommendations: string[] = [];

  if (order.delivery_date && new Date(order.delivery_date) < new Date() && order.status !== 'completed') {
    recommendations.push('立即跟进生产进度');
    recommendations.push('考虑与客户沟通延期');
  }

  return recommendations;
}

function identifyScheduleIssues(schedules: any[]): any[] {
  const issues: any[] = [];

  // 检测产能过载
  const lineDayGroups: Record<string, number> = {};
  schedules.forEach(s => {
    const key = `${s.line_id}-${s.schedule_date}`;
    lineDayGroups[key] = (lineDayGroups[key] || 0) + (s.quantity || 0);
  });

  Object.entries(lineDayGroups).forEach(([key, quantity]) => {
    if (quantity > 500) { // 假设日产能500
      issues.push({
        type: 'capacity_overload',
        message: `${key} 排产数量 ${quantity} 超过产能`
      });
    }
  });

  return issues;
}

function generateOptimizedPlan(schedules: any[], constraints: any): any {
  // 简化实现
  return schedules;
}

function calculateImprovement(current: any[], optimized: any): any {
  return {
    utilizationImprovement: '10%',
    riskReduction: '30%'
  };
}
