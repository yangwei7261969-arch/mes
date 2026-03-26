import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取KPI数据
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'leaderboard'; // leaderboard/bottleneck/line/process
    const period = searchParams.get('period') || 'daily'; // daily/weekly/monthly
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const departmentId = searchParams.get('department_id');
    const lineId = searchParams.get('line_id');

    switch (type) {
      case 'leaderboard':
        return await getLeaderboard(client, { period, date, departmentId });
      case 'bottleneck':
        return await getBottleneckAnalysis(client, { date, lineId });
      case 'line':
        return await getLineKPI(client, { date, lineId });
      case 'employee':
        return await getEmployeeKPI(client, { period, date, employeeId: searchParams.get('employee_id') });
      case 'summary':
        return await getKPISummary(client, { date });
      default:
        return NextResponse.json({ success: false, error: '无效的类型' }, { status: 400 });
    }
  } catch (error) {
    console.error('Get KPI error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '获取数据失败',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}

// 计算员工KPI
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { employee_id, date, force_recalculate = false } = body;

    if (!employee_id || !date) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    // 检查是否已计算
    if (!force_recalculate) {
      const { data: existing } = await client
        .from('employee_kpi_daily')
        .select('*')
        .eq('employee_id', employee_id)
        .eq('date', date)
        .single();

      if (existing) {
        return NextResponse.json({ success: true, data: existing, message: 'KPI已计算' });
      }
    }

    // 获取员工信息
    const { data: employee } = await client
      .from('employees')
      .select('id, name, daily_target, standard_hours')
      .eq('id', employee_id)
      .single();

    if (!employee) {
      return NextResponse.json({ success: false, error: '员工不存在' }, { status: 404 });
    }

    // 1. 计算产出指标
    const outputStats = await calculateOutputStats(client, employee_id, date);

    // 2. 计算时间指标
    const timeStats = await calculateTimeStats(client, employee_id, date);

    // 3. 计算质量指标
    const qualityStats = await calculateQualityStats(client, employee_id, date);

    // 4. 计算收入
    const earnings = await calculateEarnings(client, employee_id, date);

    // 5. 计算综合评分
    const performanceScore = calculatePerformanceScore({
      efficiency: timeStats.efficiency_rate,
      quality: qualityStats.quality_rate,
      output: outputStats.total_quantity,
      target: employee.daily_target || 100,
    });

    // 保存KPI记录
    const kpiRecord = {
      id: `kpi_${employee_id}_${date.replace(/-/g, '')}`,
      employee_id,
      date,
      ...outputStats,
      ...timeStats,
      ...qualityStats,
      total_earnings: earnings,
      performance_score: performanceScore,
    };

    const { error: upsertError } = await client
      .from('employee_kpi_daily')
      .upsert(kpiRecord);

    if (upsertError) {
      console.error('Save KPI error:', upsertError);
      return NextResponse.json({ success: false, error: '保存失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: kpiRecord,
      message: 'KPI计算完成',
    });
  } catch (error) {
    console.error('Calculate KPI error:', error);
    return NextResponse.json({ success: false, error: '计算失败' }, { status: 500 });
  }
}

// 计算产出统计
async function calculateOutputStats(client: any, employeeId: string, date: string) {
  const { data: tracking } = await client
    .from('process_tracking')
    .select('quantity, is_qualified')
    .eq('employee_id', employeeId)
    .gte('completed_at', `${date}T00:00:00`)
    .lte('completed_at', `${date}T23:59:59`);

  let total_quantity = 0;
  let qualified_quantity = 0;
  let defect_quantity = 0;
  let rework_quantity = 0;

  if (tracking) {
    for (const t of tracking) {
      total_quantity += t.quantity || 0;
      if (t.is_qualified !== false) {
        qualified_quantity += t.quantity || 0;
      } else {
        defect_quantity += t.quantity || 0;
      }
    }
  }

  return { total_quantity, qualified_quantity, defect_quantity, rework_quantity };
}

// 计算时间统计
async function calculateTimeStats(client: any, employeeId: string, date: string) {
  // 从考勤记录获取工作时长
  const { data: attendance } = await client
    .from('attendance')
    .select('check_in, check_out, work_hours')
    .eq('employee_id', employeeId)
    .eq('date', date)
    .single();

  const work_hours = attendance?.work_hours || 8;

  // 从工序跟踪计算标准工时和实际工时
  const { data: tracking } = await client
    .from('process_tracking')
    .select(`
      quantity, start_time, completed_at,
      processes(standard_time)
    `)
    .eq('employee_id', employeeId)
    .gte('completed_at', `${date}T00:00:00`)
    .lte('completed_at', `${date}T23:59:59`);

  let standard_hours = 0;
  let actual_hours = 0;

  if (tracking) {
    for (const t of tracking) {
      const stdTime = t.processes?.standard_time || 0;
      standard_hours += (stdTime / 60) * (t.quantity || 0); // 标准工时（小时）

      if (t.start_time && t.completed_at) {
        const duration = (new Date(t.completed_at).getTime() - new Date(t.start_time).getTime()) / (1000 * 60 * 60);
        actual_hours += duration;
      }
    }
  }

  // 如果没有实际工时数据，用工作时长估算
  if (actual_hours === 0) {
    actual_hours = work_hours * 0.85; // 假设85%的时间在有效工作
  }

  const efficiency_rate = actual_hours > 0 ? (standard_hours / actual_hours * 100) : 0;
  const utilization_rate = work_hours > 0 ? (actual_hours / work_hours * 100) : 0;
  const output_per_hour = actual_hours > 0 ? (await calculateOutputStats(client, employeeId, date)).total_quantity / actual_hours : 0;

  return {
    work_hours,
    standard_hours,
    actual_hours,
    efficiency_rate: Math.round(efficiency_rate * 100) / 100,
    utilization_rate: Math.round(utilization_rate * 100) / 100,
    output_per_hour: Math.round(output_per_hour * 100) / 100,
    overtime_hours: Math.max(0, work_hours - 8),
  };
}

// 计算质量统计
async function calculateQualityStats(client: any, employeeId: string, date: string) {
  const { data: inspections } = await client
    .from('quality_inspections')
    .select('pass_quantity, fail_quantity, total_quantity')
    .eq('inspector_id', employeeId)
    .gte('created_at', `${date}T00:00:00`)
    .lte('created_at', `${date}T23:59:59`);

  let total = 0;
  let passed = 0;

  if (inspections) {
    for (const i of inspections) {
      total += i.total_quantity || 0;
      passed += i.pass_quantity || 0;
    }
  }

  // 如果没有质检记录，从产出统计估算
  if (total === 0) {
    const outputStats = await calculateOutputStats(client, employeeId, date);
    total = outputStats.total_quantity;
    passed = outputStats.qualified_quantity;
  }

  const quality_rate = total > 0 ? (passed / total * 100) : 100;
  const defect_rate = total > 0 ? ((total - passed) / total * 100) : 0;

  return {
    quality_rate: Math.round(quality_rate * 100) / 100,
    defect_rate: Math.round(defect_rate * 100) / 100,
    first_pass_rate: Math.round(quality_rate * 100) / 100,
  };
}

// 计算收入
async function calculateEarnings(client: any, employeeId: string, date: string) {
  // 从工序跟踪获取计件收入
  const { data: tracking } = await client
    .from('process_tracking')
    .select(`
      quantity,
      processes(price)
    `)
    .eq('employee_id', employeeId)
    .gte('completed_at', `${date}T00:00:00`)
    .lte('completed_at', `${date}T23:59:59`);

  let earnings = 0;

  if (tracking) {
    for (const t of tracking) {
      const price = t.processes?.price || 0;
      earnings += price * (t.quantity || 0);
    }
  }

  return earnings;
}

// 计算综合评分
function calculatePerformanceScore(params: {
  efficiency: number;
  quality: number;
  output: number;
  target: number;
}): number {
  const { efficiency, quality, output, target } = params;

  // 效率分数 (30分)
  const efficiencyScore = Math.min(30, (efficiency / 100) * 30);

  // 质量分数 (30分)
  const qualityScore = Math.min(30, (quality / 100) * 30);

  // 产量分数 (40分)
  const outputScore = Math.min(40, (output / target) * 40);

  return Math.round((efficiencyScore + qualityScore + outputScore) * 100) / 100;
}

// 获取排行榜
async function getLeaderboard(
  client: any,
  params: { period: string; date: string; departmentId?: string | null }
) {
  const { period, date, departmentId } = params;

  // 计算日期范围
  let startDate = date;
  let endDate = date;

  if (period === 'weekly') {
    const d = new Date(date);
    const day = d.getDay();
    startDate = new Date(d.setDate(d.getDate() - day)).toISOString().split('T')[0];
    endDate = new Date(d.setDate(d.getDate() + 6)).toISOString().split('T')[0];
  } else if (period === 'monthly') {
    const d = new Date(date);
    startDate = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  }

  // 查询员工KPI
  let query = client
    .from('employee_kpi_daily')
    .select(`
      employee_id,
      total_quantity,
      efficiency_rate,
      quality_rate,
      performance_score,
      employees(id, name, code, department_id, departments(name))
    `)
    .gte('date', startDate)
    .lte('date', endDate);

  const { data: kpiData, error } = await query;

  // 如果表不存在，返回空数据
  if (error) {
    if (error.message?.includes('Could not find') || error.code === '42P01') {
      return NextResponse.json({
        success: true,
        data: {
          leaderboard: [],
          period,
          dateRange: { start: startDate, end: endDate }
        }
      });
    }
    console.error('Query leaderboard error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '查询失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }

  // 按员工汇总
  const employeeMap = new Map();

  for (const kpi of kpiData || []) {
    const empId = kpi.employee_id;

    // 部门过滤
    if (departmentId && kpi.employees?.department_id !== departmentId) continue;

    if (!employeeMap.has(empId)) {
      employeeMap.set(empId, {
        employee_id: empId,
        employee_name: kpi.employees?.name,
        employee_code: kpi.employees?.code,
        department_name: kpi.employees?.departments?.name,
        total_quantity: 0,
        avg_efficiency: 0,
        avg_quality: 0,
        performance_score: 0,
        days: 0,
        efficiency_sum: 0,
        quality_sum: 0,
        score_sum: 0,
      });
    }

    const emp = employeeMap.get(empId);
    emp.total_quantity += kpi.total_quantity || 0;
    emp.efficiency_sum += kpi.efficiency_rate || 0;
    emp.quality_sum += kpi.quality_rate || 0;
    emp.score_sum += kpi.performance_score || 0;
    emp.days += 1;
  }

  // 计算平均值并生成排行
  const rankings = Array.from(employeeMap.values())
    .map((emp) => ({
      ...emp,
      avg_efficiency: emp.days > 0 ? emp.efficiency_sum / emp.days : 0,
      avg_quality: emp.days > 0 ? emp.quality_sum / emp.days : 0,
      performance_score: emp.days > 0 ? emp.score_sum / emp.days : 0,
    }))
    .sort((a, b) => b.performance_score - a.performance_score)
    .map((emp, index) => ({
      ...emp,
      rank: index + 1,
    }));

  return NextResponse.json({
    success: true,
    data: {
      period,
      start_date: startDate,
      end_date: endDate,
      rankings: rankings.slice(0, 50), // 取前50名
      total_participants: rankings.length,
    },
  });
}

// 获取瓶颈分析
async function getBottleneckAnalysis(
  client: any,
  params: { date: string; lineId?: string | null }
) {
  const { date, lineId } = params;

  // 计算各工序的负载和产能
  const { data: processTracking } = await client
    .from('process_tracking')
    .select(`
      process_id, quantity, start_time, completed_at,
      processes(id, name, standard_time),
      production_lines(id, name)
    `)
    .gte('completed_at', `${date}T00:00:00`)
    .lte('completed_at', `${date}T23:59:59`);

  // 按工序汇总
  const processMap = new Map();

  for (const t of processTracking || []) {
    const processId = t.process_id;
    if (!processId) continue;

    // 产线过滤
    if (lineId && t.production_lines?.id !== lineId) continue;

    if (!processMap.has(processId)) {
      processMap.set(processId, {
        process_id: processId,
        process_name: t.processes?.name,
        line_id: t.production_lines?.id,
        line_name: t.production_lines?.name,
        total_quantity: 0,
        total_time: 0,
        worker_count: new Set(),
        standard_time: t.processes?.standard_time || 0,
      });
    }

    const proc = processMap.get(processId);
    proc.total_quantity += t.quantity || 0;
    proc.worker_count.add(t.employee_id);

    if (t.start_time && t.completed_at) {
      const duration = (new Date(t.completed_at).getTime() - new Date(t.start_time).getTime()) / (1000 * 60 * 60);
      proc.total_time += duration;
    }
  }

  // 计算瓶颈分数
  const bottlenecks = Array.from(processMap.values())
    .map((proc) => {
      // 产能 = 工人数量 * 8小时 / 标准工时
      const capacity = proc.worker_count.size * 8 / (proc.standard_time / 60 || 0.1);
      const workload = proc.total_time;
      const utilization = capacity > 0 ? (workload / capacity * 100) : 0;

      // 瓶颈分数 = 利用率 * (1 + 等待时间因子)
      const bottleneck_score = Math.min(100, utilization * 1.2);
      const is_bottleneck = bottleneck_score > 80;

      return {
        process_id: proc.process_id,
        process_name: proc.process_name,
        line_id: proc.line_id,
        line_name: proc.line_name,
        total_workload: Math.round(workload * 100) / 100,
        capacity: Math.round(capacity * 100) / 100,
        utilization_rate: Math.round(utilization * 100) / 100,
        worker_count: proc.worker_count.size,
        is_bottleneck,
        bottleneck_score: Math.round(bottleneck_score * 100) / 100,
        recommendation: is_bottleneck ? `建议增加人手或优化工序流程` : null,
        priority: is_bottleneck ? Math.ceil(bottleneck_score / 10) : 0,
      };
    })
    .sort((a, b) => b.bottleneck_score - a.bottleneck_score);

  return NextResponse.json({
    success: true,
    data: {
      date,
      bottlenecks: bottlenecks.filter((b) => b.is_bottleneck),
      all_processes: bottlenecks,
    },
  });
}

// 获取产线KPI
async function getLineKPI(
  client: any,
  params: { date: string; lineId?: string | null }
) {
  const { date, lineId } = params;

  let query = client
    .from('production_lines')
    .select(`
      id, name, capacity,
      employee_kpi_daily!employee_kpi_daily_line_id_fkey(
        total_quantity, efficiency_rate, quality_rate, work_hours
      )
    `)
    .eq('is_active', true);

  if (lineId) {
    query = query.eq('id', lineId);
  }

  const { data: lines, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }

  const lineKPIs = (lines || []).map((line: any) => {
    const kpis = line.employee_kpi_daily || [];
    const totalQuantity = kpis.reduce((sum: number, k: any) => sum + (k.total_quantity || 0), 0);
    const avgEfficiency = kpis.length > 0
      ? kpis.reduce((sum: number, k: any) => sum + (k.efficiency_rate || 0), 0) / kpis.length
      : 0;
    const avgQuality = kpis.length > 0
      ? kpis.reduce((sum: number, k: any) => sum + (k.quality_rate || 0), 0) / kpis.length
      : 0;

    return {
      line_id: line.id,
      line_name: line.name,
      total_quantity: totalQuantity,
      avg_efficiency: Math.round(avgEfficiency * 100) / 100,
      avg_quality: Math.round(avgQuality * 100) / 100,
      worker_count: kpis.length,
      plan_quantity: line.capacity || 0,
      completion_rate: line.capacity > 0 ? (totalQuantity / line.capacity * 100) : 0,
    };
  });

  return NextResponse.json({
    success: true,
    data: lineKPIs,
  });
}

// 获取员工KPI详情
async function getEmployeeKPI(
  client: any,
  params: { period: string; date: string; employeeId?: string | null }
) {
  const { period, date, employeeId } = params;

  if (!employeeId) {
    return NextResponse.json({ success: false, error: '缺少员工ID' }, { status: 400 });
  }

  if (period === 'daily') {
    const { data, error } = await client
      .from('employee_kpi_daily')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: '未找到数据' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } else {
    const d = new Date(date);
    const { data, error } = await client
      .from('employee_kpi_monthly')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('year', d.getFullYear())
      .eq('month', d.getMonth() + 1)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: '未找到数据' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  }
}

// 获取KPI总览
async function getKPISummary(client: any, params: { date: string }) {
  const { date } = params;

  // 今日统计
  const { data: todayStats } = await client
    .from('employee_kpi_daily')
    .select('total_quantity, efficiency_rate, quality_rate, performance_score')
    .eq('date', date);

  // 本月统计
  const d = new Date(date);
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];

  const { data: monthStats } = await client
    .from('employee_kpi_daily')
    .select('total_quantity, efficiency_rate, quality_rate, performance_score')
    .gte('date', monthStart)
    .lte('date', date);

  // 计算汇总
  const calcStats = (data: any[]) => {
    if (!data || data.length === 0) {
      return { count: 0, avg_efficiency: 0, avg_quality: 0, total_output: 0, avg_score: 0 };
    }

    return {
      count: data.length,
      avg_efficiency: data.reduce((sum, k) => sum + (k.efficiency_rate || 0), 0) / data.length,
      avg_quality: data.reduce((sum, k) => sum + (k.quality_rate || 0), 0) / data.length,
      total_output: data.reduce((sum, k) => sum + (k.total_quantity || 0), 0),
      avg_score: data.reduce((sum, k) => sum + (k.performance_score || 0), 0) / data.length,
    };
  };

  return NextResponse.json({
    success: true,
    data: {
      today: calcStats(todayStats),
      month: calcStats(monthStats),
    },
  });
}
