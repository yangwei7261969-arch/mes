import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * AI智能排产API
 * 
 * 功能：
 * • 智能排产 - 根据订单优先级、产能、人员自动生成排产计划
 * • 产能分析 - 分析产线产能利用率和瓶颈
 * • 人员调配 - 智能分配员工到产线
 * • 冲突检测 - 检测排产冲突并自动调整
 * • 优化建议 - 提供排产优化建议
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'schedule';

    switch (action) {
      case 'schedule':
        return await generateSchedule(client, searchParams);
      case 'capacity':
        return await analyzeCapacity(client, searchParams);
      case 'workers':
        return await allocateWorkers(client, searchParams);
      case 'conflicts':
        return await detectConflicts(client, searchParams);
      case 'optimization':
        return await getOptimizationSuggestions(client, searchParams);
      case 'gantt':
        return await getGanttData(client, searchParams);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('AI Scheduling error:', error);
    return NextResponse.json({ success: false, error: '排产失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'auto-schedule':
        return await autoScheduleWithAI(client, data, request);
      case 'save-schedule':
        return await saveSchedule(client, data);
      case 'adjust-schedule':
        return await adjustSchedule(client, data);
      case 'emergency-insert':
        return await emergencyInsertOrder(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('AI Scheduling POST error:', error);
    return NextResponse.json({ success: false, error: '排产操作失败' }, { status: 500 });
  }
}

/**
 * AI自动排产（核心功能）
 * 使用大语言模型进行智能排产决策
 */
async function autoScheduleWithAI(client: any, data: any, request: NextRequest) {
  const { 
    startDate = new Date().toISOString().split('T')[0],
    endDate,
    priorities = [],
    constraints = {}
  } = data;

  // 1. 收集排产所需数据
  const [
    pendingOrders,
    productionLines,
    employees,
    existingSchedules,
    processes
  ] = await Promise.all([
    // 待排产订单
    client.from('production_orders')
      .select(`
        id, order_no, style_no, quantity, delivery_date, priority,
        status, style_id, customer_id,
        styles (style_no, style_name, category, smv),
        customers (name)
      `)
      .in('status', ['confirmed', 'pending'])
      .order('delivery_date', { ascending: true }),
    
    // 产线信息
    client.from('production_lines')
      .select('*')
      .eq('status', 'active'),
    
    // 员工信息
    client.from('employees')
      .select('*')
      .eq('status', 'active'),
    
    // 现有排产
    client.from('production_schedules')
      .select('*')
      .gte('schedule_date', startDate)
      .lte('schedule_date', endDate || startDate),
    
    // 工序信息
    client.from('processes')
      .select('*')
  ]);

  // 2. 计算产能
  const capacityAnalysis = analyzeLineCapacity(
    productionLines.data || [],
    employees.data || [],
    existingSchedules.data || []
  );

  // 3. 构建AI提示词
  const systemPrompt = buildSchedulingPrompt(
    pendingOrders.data || [],
    capacityAnalysis,
    constraints
  );

  // 4. 调用AI进行排产决策
  const config = new Config();
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const llmClient = new LLMClient(config, customHeaders);

  // 流式输出排产过程
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 先发送基础数据
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'capacity',
          data: capacityAnalysis
        })}\n\n`));

        // AI推理排产方案
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: '请根据以上数据，生成最优的排产方案。按订单优先级和交付日期进行排序，合理分配产线资源。' }
        ];

        const llmStream = llmClient.stream(messages, {
          model: 'doubao-seed-1-6-251015',
          temperature: 0.3,
        });

        let fullContent = '';
        
        for await (const chunk of llmStream) {
          if (chunk.content) {
            const text = chunk.content.toString();
            fullContent += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'reasoning',
              content: text
            })}\n\n`));
          }
        }

        // 5. 解析AI输出，生成结构化排产计划
        const schedulePlan = parseSchedulePlan(fullContent, pendingOrders.data || [], capacityAnalysis);

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'plan',
          data: schedulePlan
        })}\n\n`));

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('AI scheduling stream error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: 'AI排产失败，请重试'
        })}\n\n`));
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
 * 生成排产计划
 */
async function generateSchedule(client: any, searchParams: URLSearchParams) {
  const startDate = searchParams.get('start_date') || new Date().toISOString().split('T')[0];
  const endDate = searchParams.get('end_date') || 
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 获取待排产订单
  const { data: orders } = await client
    .from('production_orders')
    .select(`
      id, order_no, style_no, quantity, delivery_date, priority,
      status, style_id, completed_quantity,
      styles (style_no, style_name, category, smv)
    `)
    .in('status', ['confirmed', 'pending', 'in_production'])
    .gte('delivery_date', startDate)
    .lte('delivery_date', endDate)
    .order('delivery_date', { ascending: true });

  // 获取产线信息
  const { data: lines } = await client
    .from('production_lines')
    .select('*')
    .eq('status', 'active');

  // 获取现有排产
  const { data: schedules } = await client
    .from('production_schedules')
    .select('*')
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate);

  // 生成排产建议
  const schedulePlan = generateSchedulePlan(
    orders || [],
    lines || [],
    schedules || [],
    startDate,
    endDate
  );

  return NextResponse.json({
    success: true,
    data: schedulePlan
  });
}

/**
 * 分析产能
 */
async function analyzeCapacity(client: any, searchParams: URLSearchParams) {
  const lineId = searchParams.get('line_id');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  // 获取产线信息
  let linesQuery = client
    .from('production_lines')
    .select('*');
  
  if (lineId) {
    linesQuery = linesQuery.eq('id', lineId);
  } else {
    linesQuery = linesQuery.eq('status', 'active');
  }
  
  const { data: lines } = await linesQuery;

  // 获取员工分配
  const { data: assignments } = await client
    .from('line_assignments')
    .select('*')
    .eq('assignment_date', date);

  // 获取当日排产
  const { data: schedules } = await client
    .from('production_schedules')
    .select('*')
    .eq('schedule_date', date);

  // 分析每条产线的产能
  const capacityData = (lines || []).map((line: any) => {
    const lineAssignments = (assignments || []).filter((a: any) => a.line_id === line.id);
    const lineSchedules = (schedules || []).filter((s: any) => s.line_id === line.id);
    
    const workerCount = lineAssignments.length;
    const dailyCapacity = calculateDailyCapacity(line, workerCount);
    const scheduledQuantity = lineSchedules.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
    const utilizationRate = dailyCapacity > 0 ? (scheduledQuantity / dailyCapacity) * 100 : 0;

    return {
      lineId: line.id,
      lineCode: line.line_code,
      lineName: line.line_name,
      workshop: line.workshop,
      capacity: line.capacity,
      workerCount,
      dailyCapacity,
      scheduledQuantity,
      availableCapacity: dailyCapacity - scheduledQuantity,
      utilizationRate: Math.round(utilizationRate),
      status: utilizationRate >= 100 ? 'full' : utilizationRate >= 80 ? 'busy' : 'available'
    };
  });

  // 总体产能统计
  const summary = {
    totalLines: capacityData.length,
    totalCapacity: capacityData.reduce((sum: number, l: any) => sum + l.dailyCapacity, 0),
    totalScheduled: capacityData.reduce((sum: number, l: any) => sum + l.scheduledQuantity, 0),
    totalAvailable: capacityData.reduce((sum: number, l: any) => sum + l.availableCapacity, 0),
    avgUtilization: capacityData.length > 0
      ? Math.round(capacityData.reduce((sum: number, l: any) => sum + l.utilizationRate, 0) / capacityData.length)
      : 0,
    fullLines: capacityData.filter((l: any) => l.status === 'full').length,
    availableLines: capacityData.filter((l: any) => l.status === 'available').length
  };

  return NextResponse.json({
    success: true,
    data: {
      date,
      lines: capacityData,
      summary
    }
  });
}

/**
 * 智能分配员工
 */
async function allocateWorkers(client: any, searchParams: URLSearchParams) {
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const lineId = searchParams.get('line_id');

  // 获取员工及其技能
  const { data: employees } = await client
    .from('employees')
    .select(`
      id, name, employee_no, department, skills,
      line_assignments!left(id, line_id, assignment_date)
    `)
    .eq('status', 'active');

  // 获取产线需求
  const { data: lines } = await client
    .from('production_lines')
    .select('*')
    .eq('status', 'active');

  // 获取当日排产
  const { data: schedules } = await client
    .from('production_schedules')
    .select('*')
    .eq('schedule_date', date);

  // 计算每条产线的用工需求
  const lineRequirements = (lines || []).map((line: any) => {
    const lineSchedules = (schedules || []).filter((s: any) => s.line_id === line.id);
    const requiredWorkers = Math.ceil(lineSchedules.reduce((sum: number, s: any) => {
      const smv = s.smv || 5; // 标准分钟值
      const dailyMinutes = 480; // 8小时
      const workersNeeded = Math.ceil((s.quantity * smv) / dailyMinutes);
      return sum + workersNeeded;
    }, 0));

    return {
      lineId: line.id,
      lineCode: line.line_code,
      lineName: line.line_name,
      requiredWorkers: Math.max(requiredWorkers, line.min_workers || 5),
      currentWorkers: 0,
      assignedWorkers: [],
      workload: calculateWorkload(lineSchedules)
    };
  });

  // 分配员工到产线
  const availableEmployees = (employees || []).filter((e: any) => 
    !e.line_assignments || e.line_assignments.length === 0
  );

  // 按技能匹配分配
  const allocationPlan = allocateEmployeesToLines(availableEmployees, lineRequirements);

  return NextResponse.json({
    success: true,
    data: {
      date,
      allocationPlan,
      unassignedEmployees: availableEmployees.filter((e: any) => 
        !allocationPlan.some((p: any) => p.assignedWorkers.includes(e.id))
      ),
      lineRequirements
    }
  });
}

/**
 * 检测排产冲突
 */
async function detectConflicts(client: any, searchParams: URLSearchParams) {
  const startDate = searchParams.get('start_date') || new Date().toISOString().split('T')[0];
  const endDate = searchParams.get('end_date') || 
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 获取排产数据
  const { data: schedules } = await client
    .from('production_schedules')
    .select(`
      *,
      production_orders (order_no, delivery_date),
      production_lines (line_code, line_name)
    `)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate);

  const conflicts: any[] = [];

  // 1. 产线过载冲突
  const lineDayGroups: Record<string, any[]> = {};
  (schedules || []).forEach((s: any) => {
    const key = `${s.line_id}-${s.schedule_date}`;
    if (!lineDayGroups[key]) lineDayGroups[key] = [];
    lineDayGroups[key].push(s);
  });

  Object.entries(lineDayGroups).forEach(([key, groupSchedules]) => {
    const totalQuantity = groupSchedules.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const line = groupSchedules[0].production_lines;
    const dailyCapacity = 500; // 假设日产能500件

    if (totalQuantity > dailyCapacity) {
      conflicts.push({
        type: 'capacity_overload',
        severity: 'high',
        line: line?.line_name,
        date: groupSchedules[0].schedule_date,
        message: `产线 ${line?.line_name} 在 ${groupSchedules[0].schedule_date} 排产数量(${totalQuantity})超过日产能(${dailyCapacity})`,
        affectedOrders: groupSchedules.map(s => s.production_orders?.order_no),
        suggestion: '建议将部分订单调整到其他日期或产线'
      });
    }
  });

  // 2. 交付冲突（排产日期晚于交付日期）
  (schedules || []).forEach((s: any) => {
    if (s.production_orders && s.schedule_date > s.production_orders.delivery_date) {
      conflicts.push({
        type: 'delivery_conflict',
        severity: 'critical',
        orderId: s.order_id,
        orderNo: s.production_orders.order_no,
        scheduleDate: s.schedule_date,
        deliveryDate: s.production_orders.delivery_date,
        message: `订单 ${s.production_orders.order_no} 排产日期(${s.schedule_date})晚于交付日期(${s.production_orders.delivery_date})`,
        suggestion: '建议紧急调整排产优先级或与客户协商延期'
      });
    }
  });

  // 3. 资源冲突（员工不足）
  const { data: assignments } = await client
    .from('line_assignments')
    .select('line_id, assignment_date')
    .gte('assignment_date', startDate)
    .lte('assignment_date', endDate);

  const assignmentCounts: Record<string, number> = {};
  (assignments || []).forEach((a: any) => {
    const key = `${a.line_id}-${a.assignment_date}`;
    assignmentCounts[key] = (assignmentCounts[key] || 0) + 1;
  });

  Object.entries(lineDayGroups).forEach(([key, groupSchedules]) => {
    const workerCount = assignmentCounts[key] || 0;
    const requiredWorkers = Math.ceil(groupSchedules.length * 10); // 假设每个订单需要10人

    if (workerCount < requiredWorkers) {
      const [lineId, date] = key.split('-');
      conflicts.push({
        type: 'worker_shortage',
        severity: 'medium',
        date,
        message: `产线在 ${date} 人员不足（需要${requiredWorkers}人，当前${workerCount}人）`,
        suggestion: '建议从其他产线调配人员或招聘临时工'
      });
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      conflicts,
      summary: {
        total: conflicts.length,
        critical: conflicts.filter(c => c.severity === 'critical').length,
        high: conflicts.filter(c => c.severity === 'high').length,
        medium: conflicts.filter(c => c.severity === 'medium').length
      }
    }
  });
}

/**
 * 获取优化建议
 */
async function getOptimizationSuggestions(client: any, searchParams: URLSearchParams) {
  const startDate = searchParams.get('start_date') || new Date().toISOString().split('T')[0];
  const endDate = searchParams.get('end_date') || 
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 获取排产数据
  const { data: schedules } = await client
    .from('production_schedules')
    .select(`
      *,
      production_orders (order_no, delivery_date, quantity, completed_quantity),
      production_lines (line_code, line_name, capacity)
    `)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate);

  // 获取产能数据
  const { data: lines } = await client
    .from('production_lines')
    .select('*')
    .eq('status', 'active');

  const suggestions: any[] = [];

  // 1. 产能均衡建议
  const lineUtilization: Record<string, number[]> = {};
  (schedules || []).forEach((s: any) => {
    if (!lineUtilization[s.line_id]) lineUtilization[s.line_id] = [];
    const capacity = s.production_lines?.capacity || 500;
    lineUtilization[s.line_id].push((s.quantity || 0) / capacity);
  });

  Object.entries(lineUtilization).forEach(([lineId, rates]) => {
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((sum, r) => sum + Math.pow(r - avgRate, 2), 0) / rates.length;
    
    if (variance > 0.1) {
      const line = lines?.find((l: any) => l.id === lineId);
      suggestions.push({
        type: 'balance',
        priority: 'medium',
        category: '产能均衡',
        line: line?.line_name,
        message: `产线 ${line?.line_name} 排产波动较大，建议均衡分配`,
        detail: `当前利用率波动范围 ${Math.round(Math.min(...rates) * 100)}% ~ ${Math.round(Math.max(...rates) * 100)}%`,
        action: '调整排产分布，使每日产能利用率保持在80%-95%之间'
      });
    }
  });

  // 2. 交付优化建议
  const today = new Date();
  (schedules || []).forEach((s: any) => {
    if (s.production_orders) {
      const deliveryDate = new Date(s.production_orders.delivery_date);
      const scheduleDate = new Date(s.schedule_date);
      const daysDiff = Math.ceil((deliveryDate.getTime() - scheduleDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff < 2 && s.production_orders.completed_quantity < s.production_orders.quantity) {
        suggestions.push({
          type: 'delivery',
          priority: 'high',
          category: '交付风险',
          orderNo: s.production_orders.order_no,
          message: `订单 ${s.production_orders.order_no} 排产时间过紧，存在交付风险`,
          detail: `排产日期距交付仅${daysDiff}天，完成率${Math.round((s.production_orders.completed_quantity / s.production_orders.quantity) * 100)}%`,
          action: '建议提前排产或增加产能'
        });
      }
    }
  });

  // 3. 效率优化建议
  const lowEfficiencyLines = (lines || []).filter((l: any) => {
    const lineSchedules = (schedules || []).filter((s: any) => s.line_id === l.id);
    if (lineSchedules.length === 0) return true;
    const avgQuantity = lineSchedules.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0) / lineSchedules.length;
    return avgQuantity < (l.capacity || 500) * 0.7;
  });

  if (lowEfficiencyLines.length > 0) {
    suggestions.push({
      type: 'efficiency',
      priority: 'low',
      category: '效率提升',
      message: `有 ${lowEfficiencyLines.length} 条产线产能利用率低于70%`,
      lines: lowEfficiencyLines.map((l: any) => l.line_name),
      action: '建议承接更多订单或合并产线'
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      suggestions,
      summary: {
        total: suggestions.length,
        high: suggestions.filter(s => s.priority === 'high').length,
        medium: suggestions.filter(s => s.priority === 'medium').length,
        low: suggestions.filter(s => s.priority === 'low').length
      }
    }
  });
}

/**
 * 获取甘特图数据
 */
async function getGanttData(client: any, searchParams: URLSearchParams) {
  const startDate = searchParams.get('start_date') || new Date().toISOString().split('T')[0];
  const endDate = searchParams.get('end_date') || 
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 获取产线
  const { data: lines } = await client
    .from('production_lines')
    .select('*')
    .eq('status', 'active')
    .order('line_code');

  // 获取排产
  const { data: schedules } = await client
    .from('production_schedules')
    .select(`
      *,
      production_orders (order_no, style_no, delivery_date, quantity, completed_quantity),
      production_lines (line_code, line_name)
    `)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate);

  // 生成日期范围
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  // 构建甘特图数据
  const ganttData = (lines || []).map((line: any) => {
    const lineSchedules = (schedules || []).filter((s: any) => s.line_id === line.id);
    
    return {
      lineId: line.id,
      lineCode: line.line_code,
      lineName: line.line_name,
      workshop: line.workshop,
      capacity: line.capacity,
      schedule: dates.map(date => {
        const daySchedules = lineSchedules.filter((s: any) => s.schedule_date === date);
        return {
          date,
          orders: daySchedules.map((s: any) => ({
            id: s.id,
            orderId: s.order_id,
            orderNo: s.production_orders?.order_no,
            styleNo: s.production_orders?.style_no,
            quantity: s.quantity,
            completedQuantity: s.production_orders?.completed_quantity,
            progress: s.production_orders?.quantity > 0 
              ? Math.round((s.production_orders?.completed_quantity / s.production_orders?.quantity) * 100)
              : 0,
            deliveryDate: s.production_orders?.delivery_date,
            status: getScheduleStatus(s, date)
          })),
          totalQuantity: daySchedules.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0),
          utilizationRate: line.capacity > 0
            ? Math.round((daySchedules.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0) / line.capacity) * 100)
            : 0
        };
      })
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      dates,
      lines: ganttData,
      summary: {
        totalLines: ganttData.length,
        totalOrders: (schedules || []).length,
        dateRange: { start: startDate, end: endDate }
      }
    }
  });
}

/**
 * 保存排产计划
 */
async function saveSchedule(client: any, data: any) {
  const { schedules, createdBy } = data;

  if (!schedules || !Array.isArray(schedules)) {
    return NextResponse.json({ success: false, error: '无效的排产数据' }, { status: 400 });
  }

  // 验证排产数据
  for (const schedule of schedules) {
    if (!schedule.orderId || !schedule.lineId || !schedule.scheduleDate || !schedule.quantity) {
      return NextResponse.json({ 
        success: false, 
        error: '排产数据不完整' 
      }, { status: 400 });
    }
  }

  // 保存排产
  const records = schedules.map(s => ({
    order_id: s.orderId,
    line_id: s.lineId,
    schedule_date: s.scheduleDate,
    quantity: s.quantity,
    shift: s.shift || 'day',
    status: 'scheduled',
    created_by: createdBy,
    created_at: new Date().toISOString()
  }));

  const { data: saved, error } = await client
    .from('production_schedules')
    .insert(records)
    .select();

  if (error) {
    console.error('Save schedule error:', error);
    return NextResponse.json({ success: false, error: '保存失败' }, { status: 500 });
  }

  // 更新订单状态
  const orderIds = [...new Set(schedules.map(s => s.orderId))];
  await client
    .from('production_orders')
    .update({ status: 'in_production', updated_at: new Date().toISOString() })
    .in('id', orderIds);

  return NextResponse.json({
    success: true,
    data: saved,
    message: `成功保存 ${saved.length} 条排产记录`
  });
}

/**
 * 调整排产
 */
async function adjustSchedule(client: any, data: any) {
  const { scheduleId, adjustments } = data;

  if (!scheduleId || !adjustments) {
    return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
  }

  const { data: updated, error } = await client
    .from('production_schedules')
    .update({
      ...adjustments,
      updated_at: new Date().toISOString()
    })
    .eq('id', scheduleId)
    .select();

  if (error) {
    return NextResponse.json({ success: false, error: '调整失败' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: updated,
    message: '排产已调整'
  });
}

/**
 * 紧急插单
 */
async function emergencyInsertOrder(client: any, data: any) {
  const { orderId, targetDate, targetLineId, priority } = data;

  // 获取订单信息
  const { data: order } = await client
    .from('production_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
  }

  // 检查目标日期、产线的产能
  const { data: existingSchedules } = await client
    .from('production_schedules')
    .select('*')
    .eq('schedule_date', targetDate)
    .eq('line_id', targetLineId);

  const { data: line } = await client
    .from('production_lines')
    .select('*')
    .eq('id', targetLineId)
    .single();

  const scheduledQuantity = (existingSchedules || []).reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
  const capacity = line?.capacity || 500;

  if (scheduledQuantity + order.quantity > capacity) {
    // 产能不足，需要调整其他订单
    const toAdjust = (existingSchedules || [])
      .filter((s: any) => s.priority !== 'urgent')
      .sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0));

    // 计算需要调整的数量
    const overflow = scheduledQuantity + order.quantity - capacity;
    
    // 返回调整建议
    return NextResponse.json({
      success: false,
      needsAdjustment: true,
      data: {
        overflow,
        suggestedAdjustments: toAdjust.slice(0, Math.ceil(overflow / 200)).map((s: any) => ({
          scheduleId: s.id,
          orderNo: s.order_no,
          currentQuantity: s.quantity,
          suggestedAction: '调整到其他日期'
        }))
      },
      message: '目标产能不足，需要调整其他订单'
    });
  }

  // 产能足够，直接插入
  const { data: newSchedule, error } = await client
    .from('production_schedules')
    .insert({
      order_id: orderId,
      line_id: targetLineId,
      schedule_date: targetDate,
      quantity: order.quantity,
      shift: 'day',
      status: 'scheduled',
      priority: priority || 'urgent',
      created_at: new Date().toISOString()
    })
    .select();

  if (error) {
    return NextResponse.json({ success: false, error: '插入失败' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: newSchedule,
    message: '紧急订单已插入排产'
  });
}

// ============== 辅助函数 ==============

function analyzeLineCapacity(lines: any[], employees: any[], existingSchedules: any[]): any {
  return lines.map(line => {
    const lineSchedules = existingSchedules.filter(s => s.line_id === line.id);
    const scheduledQuantity = lineSchedules.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
    const dailyCapacity = calculateDailyCapacity(line, line.worker_count || 20);

    return {
      lineId: line.id,
      lineCode: line.line_code,
      lineName: line.line_name,
      workshop: line.workshop,
      capacity: line.capacity,
      dailyCapacity,
      scheduledQuantity,
      availableCapacity: Math.max(0, dailyCapacity - scheduledQuantity),
      efficiency: line.efficiency || 0.85,
      workerCount: line.worker_count || 20,
      status: scheduledQuantity >= dailyCapacity ? 'full' : scheduledQuantity >= dailyCapacity * 0.8 ? 'busy' : 'available'
    };
  });
}

function calculateDailyCapacity(line: any, workerCount: number): number {
  const workHours = 8;
  const efficiency = line.efficiency || 0.85;
  const avgSMV = 5; // 平均标准分钟值
  const dailyMinutes = workerCount * workHours * 60 * efficiency;
  return Math.round(dailyMinutes / avgSMV);
}

function buildSchedulingPrompt(orders: any[], capacity: any[], constraints: any): string {
  return `你是一个专业的服装生产排产专家。请根据以下数据生成最优排产方案。

## 待排产订单
${orders.map((o, i) => `${i + 1}. 订单号: ${o.order_no}, 款号: ${o.styles?.style_no || o.style_no}, 数量: ${o.quantity}, 交付日期: ${o.delivery_date}, 优先级: ${o.priority || '普通'}`).join('\n')}

## 产线产能
${capacity.map(l => `- ${l.lineName} (${l.lineCode}): 日产能 ${l.dailyCapacity} 件, 已排 ${l.scheduledQuantity} 件, 可用 ${l.availableCapacity} 件, 状态: ${l.status}`).join('\n')}

## 约束条件
${JSON.stringify(constraints, null, 2)}

## 排产原则
1. 优先满足紧急订单和临近交付日期的订单
2. 尽量使产线产能利用率在80%-95%之间
3. 避免过度集中某条产线或某一天
4. 考虑订单之间的相似性，同款号订单尽量排在一起

请按以下格式输出排产方案：
- 先分析各订单的紧迫程度
- 然后给出每条产线的排产建议
- 最后给出具体的排产日期和数量`;
}

function parseSchedulePlan(content: string, orders: any[], capacity: any[]): any {
  // 简化的解析逻辑，实际应该更复杂
  const plan: any[] = [];
  let currentDate = new Date();

  // 按交付日期排序订单
  const sortedOrders = [...orders].sort((a, b) => {
    const priorityA = a.priority === 'urgent' ? 0 : a.priority === 'high' ? 1 : 2;
    const priorityB = b.priority === 'urgent' ? 0 : b.priority === 'high' ? 1 : 2;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
  });

  // 简单分配到产线
  const lineCapacities = capacity.map(c => ({ ...c, remaining: c.availableCapacity }));
  
  sortedOrders.forEach(order => {
    // 找到有可用产能的产线
    const availableLine = lineCapacities.find(l => l.remaining >= order.quantity);
    
    if (availableLine) {
      plan.push({
        orderId: order.id,
        orderNo: order.order_no,
        styleNo: order.styles?.style_no || order.style_no,
        quantity: order.quantity,
        lineId: availableLine.lineId,
        lineName: availableLine.lineName,
        scheduleDate: currentDate.toISOString().split('T')[0],
        priority: order.priority || 'normal',
        deliveryDate: order.delivery_date
      });
      availableLine.remaining -= order.quantity;
    } else {
      // 如果当前产线都满了，移到下一天
      currentDate.setDate(currentDate.getDate() + 1);
      const nextLine = lineCapacities[0];
      if (nextLine) {
        plan.push({
          orderId: order.id,
          orderNo: order.order_no,
          styleNo: order.styles?.style_no || order.style_no,
          quantity: order.quantity,
          lineId: nextLine.lineId,
          lineName: nextLine.lineName,
          scheduleDate: currentDate.toISOString().split('T')[0],
          priority: order.priority || 'normal',
          deliveryDate: order.delivery_date
        });
        nextLine.remaining -= order.quantity;
      }
    }
  });

  return plan;
}

function generateSchedulePlan(orders: any[], lines: any[], existingSchedules: any[], startDate: string, endDate: string): any {
  const schedule: any[] = [];
  const lineLoads: Record<string, Record<string, number>> = {};

  // 初始化每条产线每天的负载
  lines.forEach((line: any) => {
    lineLoads[line.id] = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
      lineLoads[line.id][d.toISOString().split('T')[0]] = 0;
    }
  });

  // 累加现有排产
  existingSchedules.forEach((s: any) => {
    if (lineLoads[s.line_id] && lineLoads[s.line_id][s.schedule_date] !== undefined) {
      lineLoads[s.line_id][s.schedule_date] += s.quantity || 0;
    }
  });

  // 按优先级排序订单
  const sortedOrders = [...orders].sort((a, b) => {
    const priorityMap: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    const pA = priorityMap[a.priority] || 2;
    const pB = priorityMap[b.priority] || 2;
    if (pA !== pB) return pA - pB;
    return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
  });

  // 分配订单到产线
  sortedOrders.forEach((order: any) => {
    let assigned = false;
    const deliveryDate = new Date(order.delivery_date);
    
    // 尝试每条产线
    for (const line of lines) {
      if (assigned) break;
      
      // 从当前日期到交付日期，找一个有空闲的日期
      const start = new Date(startDate);
      for (let d = start; d <= deliveryDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const currentLoad = lineLoads[line.id]?.[dateStr] || 0;
        const capacity = line.capacity || 500;

        if (currentLoad + order.quantity <= capacity) {
          schedule.push({
            orderId: order.id,
            orderNo: order.order_no,
            styleNo: order.styles?.style_no || order.style_no,
            quantity: order.quantity,
            lineId: line.id,
            lineName: line.line_name,
            scheduleDate: dateStr,
            deliveryDate: order.delivery_date,
            priority: order.priority || 'normal'
          });
          lineLoads[line.id][dateStr] += order.quantity;
          assigned = true;
          break;
        }
      }
    }

    if (!assigned) {
      // 无法分配，标记为待处理
      schedule.push({
        orderId: order.id,
        orderNo: order.order_no,
        styleNo: order.styles?.style_no || order.style_no,
        quantity: order.quantity,
        lineId: null,
        lineName: '待分配',
        scheduleDate: null,
        deliveryDate: order.delivery_date,
        priority: order.priority || 'normal',
        status: 'pending',
        reason: '产能不足，需要增加产线或调整其他订单'
      });
    }
  });

  return {
    schedule,
    summary: {
      totalOrders: orders.length,
      scheduledOrders: schedule.filter(s => s.lineId).length,
      pendingOrders: schedule.filter(s => !s.lineId).length,
      dateRange: { start: startDate, end: endDate }
    }
  };
}

function calculateWorkload(schedules: any[]): number {
  return schedules.reduce((sum: number, s: any) => sum + (s.quantity || 0) * (s.smv || 5), 0);
}

function allocateEmployeesToLines(employees: any[], lineRequirements: any[]): any[] {
  const result = lineRequirements.map(req => ({
    ...req,
    assignedWorkers: [] as string[]
  }));

  // 简单分配逻辑：按技能匹配度分配
  employees.forEach(emp => {
    // 找到需求最大且未满足的产线
    const sortedLines = result
      .filter(l => l.assignedWorkers.length < l.requiredWorkers)
      .sort((a, b) => 
        (b.requiredWorkers - b.assignedWorkers.length) - 
        (a.requiredWorkers - a.assignedWorkers.length)
      );

    if (sortedLines.length > 0) {
      sortedLines[0].assignedWorkers.push(emp.id);
    }
  });

  return result;
}

function getScheduleStatus(schedule: any, date: string): string {
  const today = new Date().toISOString().split('T')[0];
  
  if (schedule.status === 'completed') return 'completed';
  if (date < today) return 'overdue';
  if (date === today) return 'in_progress';
  return 'scheduled';
}
