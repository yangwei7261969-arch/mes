import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 返工/重做系统API
 * 
 * 核心功能：
 * • 返工单创建与管理
 * • 返工原因追踪
 * • 返工成本计算
 * • 返工工资处理（扣钱或重算）
 * • 与质量系统打通
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await getReworkList(client, searchParams);
      case 'detail':
        return await getReworkDetail(client, searchParams.get('id'));
      case 'statistics':
        return await getReworkStatistics(client, searchParams);
      case 'cost-analysis':
        return await getCostAnalysis(client, searchParams);
      case 'by-reason':
        return await getReworkByReason(client, searchParams);
      case 'by-process':
        return await getReworkByProcess(client, searchParams);
      case 'by-employee':
        return await getReworkByEmployee(client, searchParams);
      case 'dashboard':
        return await getReworkDashboard(client);
      default:
        return await getReworkList(client, searchParams);
    }
  } catch (error) {
    console.error('Rework system error:', error);
    return NextResponse.json({ success: false, error: '获取返工数据失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { action, data } = body;

    switch (action) {
      case 'create':
        return await createRework(client, data);
      case 'update':
        return await updateRework(client, data);
      case 'start':
        return await startRework(client, data);
      case 'complete':
        return await completeRework(client, data);
      case 'verify':
        return await verifyRework(client, data);
      case 'calculate-cost':
        return await calculateReworkCost(client, data);
      case 'adjust-wage':
        return await adjustWage(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Rework operation error:', error);
    return NextResponse.json({ success: false, error: '返工操作失败' }, { status: 500 });
  }
}

/**
 * 获取返工列表
 */
async function getReworkList(client: any, searchParams: URLSearchParams) {
  const status = searchParams.get('status') || 'all';
  const orderId = searchParams.get('order_id');
  const processId = searchParams.get('process_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '20');

  let query = client
    .from('rework_orders')
    .select(`
      id,
      rework_no,
      rework_type,
      quantity,
      status,
      rework_reason,
      estimated_cost,
      actual_cost,
      created_at,
      started_at,
      completed_at,
      production_orders (
        id,
        order_code,
        customers (name)
      ),
      processes (
        id,
        process_code,
        process_name
      ),
      original_employee:employees!rework_orders_original_employee_id (
        id,
        name,
        employee_code
      ),
      rework_employee:employees!rework_orders_rework_employee_id (
        id,
        name,
        employee_code
      )
    `)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (orderId) {
    query = query.eq('order_id', orderId);
  }

  if (processId) {
    query = query.eq('process_id', processId);
  }

  if (startDate) {
    query = query.gte('created_at', `${startDate}T00:00:00Z`);
  }

  if (endDate) {
    query = query.lte('created_at', `${endDate}T23:59:59Z`);
  }

  const { data: reworks, error, count } = await query;

  // 如果表不存在，返回空数据
  if (error) {
    if (error.message?.includes('Could not find') || error.code === '42P01') {
      return NextResponse.json({
        success: true,
        data: {
          reworks: [],
          pagination: {
            page,
            pageSize,
            total: 0
          }
        }
      });
    }
    throw error;
  }

  return NextResponse.json({
    success: true,
    data: {
      reworks,
      pagination: {
        page,
        pageSize,
        total: count || 0
      }
    }
  });
}

/**
 * 获取返工详情
 */
async function getReworkDetail(client: any, reworkId: string | null) {
  if (!reworkId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少返工ID' 
    }, { status: 400 });
  }

  const { data: rework, error } = await client
    .from('rework_orders')
    .select(`
      *,
      production_orders (
        id,
        order_code,
        total_quantity,
        customers (name)
      ),
      processes (
        id,
        process_code,
        process_name,
        standard_time
      ),
      original_employee:employees!rework_orders_original_employee_id (
        id,
        name,
        employee_code,
        hourly_rate
      ),
      rework_employee:employees!rework_orders_rework_employee_id (
        id,
        name,
        employee_code,
        hourly_rate
      ),
      quality_defects (
        id,
        defect_type,
        defect_description,
        quantity,
        severity
      ),
      rework_operations (
        id,
        operation_type,
        start_time,
        end_time,
        quantity_completed,
        notes,
        employees (name)
      )
    `)
    .eq('id', reworkId)
    .single();

  if (error) throw error;

  if (!rework) {
    return NextResponse.json({ 
      success: false, 
      error: '返工记录不存在' 
    }, { status: 404 });
  }

  // 计算成本明细
  const costBreakdown = calculateCostBreakdown(rework);

  return NextResponse.json({
    success: true,
    data: {
      rework,
      costBreakdown
    }
  });
}

/**
 * 创建返工单
 */
async function createRework(client: any, data: any) {
  const {
    orderId,
    processId,
    defectId,
    reworkType,
    quantity,
    reason,
    reasonCategory,
    originalEmployeeId,
    notes,
    createdBy
  } = data;

  // 生成返工单号
  const reworkNo = `RW${Date.now().toString(36).toUpperCase()}`;

  // 计算预估成本
  const estimatedCost = await estimateReworkCost(client, processId, quantity, reworkType);

  const { data: rework, error } = await client
    .from('rework_orders')
    .insert({
      rework_no: reworkNo,
      order_id: orderId,
      process_id: processId,
      defect_id: defectId,
      rework_type: reworkType,
      quantity,
      rework_reason: reason,
      reason_category: reasonCategory,
      original_employee_id: originalEmployeeId,
      status: 'pending',
      estimated_cost: estimatedCost,
      notes,
      created_by: createdBy,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // 如果关联了缺陷，更新缺陷状态
  if (defectId) {
    await client
      .from('quality_defects')
      .update({
        status: 'rework',
        rework_id: rework.id
      })
      .eq('id', defectId);
  }

  // 记录审计日志
  await client
    .from('audit_logs')
    .insert({
      action: 'create_rework',
      entity_type: 'rework_order',
      entity_id: rework.id,
      details: { reworkNo, orderId, processId, quantity, reason }
    });

  return NextResponse.json({
    success: true,
    data: rework,
    message: '返工单已创建'
  });
}

/**
 * 开始返工
 */
async function startRework(client: any, data: any) {
  const { reworkId, reworkEmployeeId, startedBy } = data;

  const { data: rework, error } = await client
    .from('rework_orders')
    .update({
      status: 'in_progress',
      rework_employee_id: reworkEmployeeId,
      started_at: new Date().toISOString(),
      started_by: startedBy
    })
    .eq('id', reworkId)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: rework,
    message: '返工已开始'
  });
}

/**
 * 完成返工
 */
async function completeRework(client: any, data: any) {
  const { reworkId, completedQuantity, failedQuantity, completedBy, notes } = data;

  // 计算实际成本
  const { data: reworkInfo } = await client
    .from('rework_orders')
    .select(`
      *,
      processes (standard_time),
      rework_employee:employees!rework_orders_rework_employee_id (hourly_rate)
    `)
    .eq('id', reworkId)
    .single();

  const actualCost = calculateActualCost(reworkInfo, completedQuantity);

  const { data: rework, error } = await client
    .from('rework_orders')
    .update({
      status: 'completed',
      completed_quantity: completedQuantity,
      failed_quantity: failedQuantity || 0,
      actual_cost: actualCost,
      completed_at: new Date().toISOString(),
      completed_by: completedBy,
      completion_notes: notes
    })
    .eq('id', reworkId)
    .select()
    .single();

  if (error) throw error;

  // 处理工资调整
  await handleWageAdjustment(client, rework);

  // 如果还有失败数量，可能需要再次返工
  if (failedQuantity && failedQuantity > 0) {
    await client
      .from('alerts')
      .insert({
        type: 'quality',
        level: 'risk',
        title: `返工后仍有不良: ${rework.rework_no}`,
        message: `返工完成 ${completedQuantity} 件，仍有 ${failedQuantity} 件不良`,
        source_type: 'rework',
        source_id: reworkId
      });
  }

  return NextResponse.json({
    success: true,
    data: rework,
    message: '返工已完成'
  });
}

/**
 * 验证返工
 */
async function verifyRework(client: any, data: any) {
  const { reworkId, verifiedBy, result, notes } = data;

  const { data: rework, error } = await client
    .from('rework_orders')
    .update({
      status: result === 'pass' ? 'verified' : 'rejected',
      verified_at: new Date().toISOString(),
      verified_by: verifiedBy,
      verify_result: result,
      verify_notes: notes
    })
    .eq('id', reworkId)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: rework,
    message: result === 'pass' ? '返工已验证通过' : '返工验证不通过'
  });
}

/**
 * 返工统计
 */
async function getReworkStatistics(client: any, searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'month';
  const dateRange = getDateRange(period);

  const { data: reworks } = await client
    .from('rework_orders')
    .select(`
      id,
      rework_type,
      quantity,
      status,
      estimated_cost,
      actual_cost,
      reason_category,
      created_at,
      completed_at,
      processes (process_name)
    `)
    .gte('created_at', `${dateRange.start}T00:00:00Z`);

  const total = reworks?.length || 0;
  const totalQuantity = reworks?.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0) || 0;
  const totalCost = reworks?.reduce((sum: number, r: any) => sum + (r.actual_cost || r.estimated_cost || 0), 0) || 0;

  // 按状态统计
  const byStatus = {
    pending: reworks?.filter((r: any) => r.status === 'pending').length || 0,
    inProgress: reworks?.filter((r: any) => r.status === 'in_progress').length || 0,
    completed: reworks?.filter((r: any) => r.status === 'completed').length || 0,
    verified: reworks?.filter((r: any) => r.status === 'verified').length || 0
  };

  // 按类型统计
  const byType: Record<string, number> = {};
  reworks?.forEach((r: any) => {
    const type = r.rework_type || 'unknown';
    byType[type] = (byType[type] || 0) + 1;
  });

  // 按原因统计
  const byReason: Record<string, number> = {};
  reworks?.forEach((r: any) => {
    const reason = r.reason_category || 'other';
    byReason[reason] = (byReason[reason] || 0) + 1;
  });

  return NextResponse.json({
    success: true,
    data: {
      period,
      dateRange,
      total,
      totalQuantity,
      totalCost,
      byStatus,
      byType,
      byReason
    }
  });
}

/**
 * 成本分析
 */
async function getCostAnalysis(client: any, searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'month';
  const dateRange = getDateRange(period);

  const { data: reworks } = await client
    .from('rework_orders')
    .select(`
      id,
      quantity,
      estimated_cost,
      actual_cost,
      rework_type,
      reason_category,
      processes (process_name),
      production_orders (order_code)
    `)
    .gte('created_at', `${dateRange.start}T00:00:00Z`)
    .not('actual_cost', 'is', null);

  // 成本构成
  let laborCost = 0;
  let materialCost = 0;
  let opportunityCost = 0;

  reworks?.forEach((r: any) => {
    laborCost += (r.actual_cost || 0) * 0.6; // 假设60%是人工成本
    materialCost += (r.actual_cost || 0) * 0.3; // 30%是材料成本
    opportunityCost += (r.actual_cost || 0) * 0.1; // 10%是机会成本
  });

  // 按工序统计成本
  const costByProcess: Record<string, { process: string; cost: number; count: number }> = {};
  reworks?.forEach((r: any) => {
    const processName = r.processes?.process_name || '未知工序';
    if (!costByProcess[processName]) {
      costByProcess[processName] = { process: processName, cost: 0, count: 0 };
    }
    costByProcess[processName].cost += r.actual_cost || 0;
    costByProcess[processName].count++;
  });

  // 按原因统计成本
  const costByReason: Record<string, { reason: string; cost: number; count: number }> = {};
  reworks?.forEach((r: any) => {
    const reason = r.reason_category || '其他';
    if (!costByReason[reason]) {
      costByReason[reason] = { reason, cost: 0, count: 0 };
    }
    costByReason[reason].cost += r.actual_cost || 0;
    costByReason[reason].count++;
  });

  return NextResponse.json({
    success: true,
    data: {
      totalCost: reworks?.reduce((sum: number, r: any) => sum + (r.actual_cost || 0), 0) || 0,
      costBreakdown: {
        labor: laborCost,
        material: materialCost,
        opportunity: opportunityCost
      },
      costByProcess: Object.values(costByProcess).sort((a, b) => b.cost - a.cost),
      costByReason: Object.values(costByReason).sort((a, b) => b.cost - a.cost)
    }
  });
}

/**
 * 按原因统计
 */
async function getReworkByReason(client: any, searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'month';
  const dateRange = getDateRange(period);

  const { data: reworks } = await client
    .from('rework_orders')
    .select('reason_category, rework_reason, quantity')
    .gte('created_at', `${dateRange.start}T00:00:00Z`);

  const byReason: Record<string, { count: number; quantity: number; examples: string[] }> = {};

  reworks?.forEach((r: any) => {
    const category = r.reason_category || '其他';
    if (!byReason[category]) {
      byReason[category] = { count: 0, quantity: 0, examples: [] };
    }
    byReason[category].count++;
    byReason[category].quantity += r.quantity || 0;
    if (byReason[category].examples.length < 5 && r.rework_reason) {
      byReason[category].examples.push(r.rework_reason);
    }
  });

  return NextResponse.json({
    success: true,
    data: Object.entries(byReason)
      .map(([reason, data]) => ({ reason, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
  });
}

/**
 * 按工序统计
 */
async function getReworkByProcess(client: any, searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'month';
  const dateRange = getDateRange(period);

  const { data: reworks } = await client
    .from('rework_orders')
    .select(`
      quantity,
      actual_cost,
      process_id,
      processes (process_code, process_name)
    `)
    .gte('created_at', `${dateRange.start}T00:00:00Z`);

  const byProcess: Record<string, {
    processId: string;
    processCode: string;
    processName: string;
    count: number;
    totalQuantity: number;
    totalCost: number;
  }> = {};

  reworks?.forEach((r: any) => {
    const processId = r.process_id;
    if (!processId) return;

    if (!byProcess[processId]) {
      byProcess[processId] = {
        processId,
        processCode: r.processes?.process_code,
        processName: r.processes?.process_name,
        count: 0,
        totalQuantity: 0,
        totalCost: 0
      };
    }
    byProcess[processId].count++;
    byProcess[processId].totalQuantity += r.quantity || 0;
    byProcess[processId].totalCost += r.actual_cost || 0;
  });

  return NextResponse.json({
    success: true,
    data: Object.values(byProcess)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 20)
  });
}

/**
 * 按员工统计
 */
async function getReworkByEmployee(client: any, searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'month';
  const dateRange = getDateRange(period);

  const { data: reworks } = await client
    .from('rework_orders')
    .select(`
      quantity,
      actual_cost,
      wage_deduction,
      original_employee_id,
      original_employee:employees!rework_orders_original_employee_id (
        id,
        name,
        employee_code
      )
    `)
    .gte('created_at', `${dateRange.start}T00:00:00Z`);

  const byEmployee: Record<string, {
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    reworkCount: number;
    totalQuantity: number;
    totalCost: number;
    totalDeduction: number;
  }> = {};

  reworks?.forEach((r: any) => {
    const employeeId = r.original_employee_id;
    if (!employeeId) return;

    if (!byEmployee[employeeId]) {
      byEmployee[employeeId] = {
        employeeId,
        employeeCode: r.original_employee?.employee_code,
        employeeName: r.original_employee?.name,
        reworkCount: 0,
        totalQuantity: 0,
        totalCost: 0,
        totalDeduction: 0
      };
    }
    byEmployee[employeeId].reworkCount++;
    byEmployee[employeeId].totalQuantity += r.quantity || 0;
    byEmployee[employeeId].totalCost += r.actual_cost || 0;
    byEmployee[employeeId].totalDeduction += r.wage_deduction || 0;
  });

  return NextResponse.json({
    success: true,
    data: Object.values(byEmployee)
      .sort((a, b) => b.reworkCount - a.reworkCount)
      .slice(0, 20)
  });
}

/**
 * 返工仪表盘
 */
async function getReworkDashboard(client: any) {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.substring(0, 7) + '-01';

  // 今日返工
  const { data: todayReworks } = await client
    .from('rework_orders')
    .select('id, status, quantity')
    .gte('created_at', `${today}T00:00:00Z`);

  // 本月返工
  const { data: monthReworks } = await client
    .from('rework_orders')
    .select('id, status, quantity, actual_cost')
    .gte('created_at', `${monthStart}T00:00:00Z`);

  // 待处理
  const { count: pendingCount } = await client
    .from('rework_orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: inProgressCount } = await client
    .from('rework_orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'in_progress');

  // 返工率（本月返工数量 / 本月产量）
  const { data: monthProduction } = await client
    .from('process_tracking')
    .select('quantity_completed')
    .gte('end_time', `${monthStart}T00:00:00Z`)
    .eq('status', 'completed');

  const totalProduction = monthProduction?.reduce((sum: number, p: any) => 
    sum + (p.quantity_completed || 0), 0) || 0;
  const totalRework = monthReworks?.reduce((sum: number, r: any) => 
    sum + (r.quantity || 0), 0) || 0;
  const reworkRate = totalProduction > 0 ? Math.round(totalRework / totalProduction * 10000) / 100 : 0;

  return NextResponse.json({
    success: true,
    data: {
      today: {
        total: todayReworks?.length || 0,
        quantity: todayReworks?.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0) || 0
      },
      month: {
        total: monthReworks?.length || 0,
        quantity: totalRework,
        cost: monthReworks?.reduce((sum: number, r: any) => sum + (r.actual_cost || 0), 0) || 0
      },
      pending: {
        total: (pendingCount || 0) + (inProgressCount || 0),
        pending: pendingCount || 0,
        inProgress: inProgressCount || 0
      },
      reworkRate
    }
  });
}

// 辅助函数
async function estimateReworkCost(client: any, processId: string, quantity: number, reworkType: string) {
  // 获取工序标准时间
  const { data: process } = await client
    .from('processes')
    .select('standard_time')
    .eq('id', processId)
    .single();

  const standardTime = process?.standard_time || 60; // 默认60秒
  const hourlyRate = 30; // 假设时薪30元
  const laborCost = (standardTime * quantity / 3600) * hourlyRate;

  // 返工类型影响成本
  const typeMultiplier = reworkType === 'major' ? 1.5 : reworkType === 'minor' ? 1.0 : 2.0;

  return Math.round(laborCost * typeMultiplier * 100) / 100;
}

function calculateActualCost(rework: any, completedQuantity: number): number {
  const standardTime = rework.processes?.standard_time || 60;
  const hourlyRate = rework.rework_employee?.hourly_rate || 30;
  const laborCost = (standardTime * completedQuantity / 3600) * hourlyRate;
  const materialCost = completedQuantity * 2; // 假设材料成本每件2元
  return Math.round((laborCost + materialCost) * 100) / 100;
}

function calculateCostBreakdown(rework: any) {
  const actualCost = rework.actual_cost || rework.estimated_cost || 0;
  return {
    labor: actualCost * 0.6,
    material: actualCost * 0.3,
    overhead: actualCost * 0.1
  };
}

async function handleWageAdjustment(client: any, rework: any) {
  // 如果有原责任人，进行工资调整
  if (rework.original_employee_id) {
    // 计算扣款金额（返工成本的30%由责任人承担）
    const deduction = Math.round((rework.actual_cost || 0) * 0.3 * 100) / 100;

    await client
      .from('rework_orders')
      .update({ wage_deduction: deduction })
      .eq('id', rework.id);

    // 记录工资调整
    await client
      .from('wage_adjustments')
      .insert({
        employee_id: rework.original_employee_id,
        adjustment_type: 'rework_deduction',
        amount: -deduction,
        reason: `返工扣款: ${rework.rework_no}`,
        reference_id: rework.id,
        reference_type: 'rework_order',
        created_at: new Date().toISOString()
      });
  }

  // 如果有返工员工，记录返工工资
  if (rework.rework_employee_id && rework.completed_quantity) {
    const standardTime = rework.processes?.standard_time || 60;
    const hourlyRate = rework.rework_employee?.hourly_rate || 30;
    const reworkWage = Math.round((standardTime * rework.completed_quantity / 3600) * hourlyRate * 100) / 100;

    await client
      .from('wage_adjustments')
      .insert({
        employee_id: rework.rework_employee_id,
        adjustment_type: 'rework_payment',
        amount: reworkWage,
        reason: `返工工资: ${rework.rework_no}`,
        reference_id: rework.id,
        reference_type: 'rework_order',
        created_at: new Date().toISOString()
      });
  }
}

async function calculateReworkCost(client: any, data: any) {
  const { processId, quantity, reworkType } = data;
  const cost = await estimateReworkCost(client, processId, quantity, reworkType);

  return NextResponse.json({
    success: true,
    data: {
      estimatedCost: cost,
      breakdown: {
        labor: cost * 0.6,
        material: cost * 0.3,
        overhead: cost * 0.1
      }
    }
  });
}

async function adjustWage(client: any, data: any) {
  const { reworkId, adjustmentType, amount, reason, adjustedBy } = data;

  const { data: rework } = await client
    .from('rework_orders')
    .select('original_employee_id')
    .eq('id', reworkId)
    .single();

  if (!rework) {
    return NextResponse.json({ 
      success: false, 
      error: '返工记录不存在' 
    }, { status: 404 });
  }

  await client
    .from('wage_adjustments')
    .insert({
      employee_id: rework.original_employee_id,
      adjustment_type: adjustmentType,
      amount,
      reason,
      reference_id: reworkId,
      reference_type: 'rework_order',
      created_by: adjustedBy,
      created_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    message: '工资调整已记录'
  });
}

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
      start = end.substring(0, 7) + '-01';
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start = `${now.getFullYear()}-${(quarter * 3 + 1).toString().padStart(2, '0')}-01`;
      break;
    default:
      now.setDate(now.getDate() - 30);
      start = now.toISOString().split('T')[0];
  }

  return { start, end };
}

async function updateRework(client: any, data: any) {
  const { reworkId, updates } = data;

  const { data: rework, error } = await client
    .from('rework_orders')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', reworkId)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: rework
  });
}
