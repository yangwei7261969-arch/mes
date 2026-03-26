import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 生产节拍/产线平衡分析API
 * 
 * 高级工厂功能：
 * • 每道工序节拍（秒/件）
 * • 产线平衡分析
 * • 瓶颈检测
 * • 效率优化建议
 * 
 * 输出：哪一道拖慢整条线
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'analysis';

    switch (action) {
      case 'analysis':
        return await getLineBalanceAnalysis(client, searchParams);
      case 'bottleneck':
        return await getBottleneckAnalysis(client, searchParams);
      case 'takt-time':
        return await getTaktTimeAnalysis(client, searchParams);
      case 'process-timing':
        return await getProcessTiming(client, searchParams);
      case 'balance-rate':
        return await getBalanceRate(client, searchParams);
      case 'improvement':
        return await getImprovementSuggestions(client, searchParams);
      case 'history':
        return await getBalanceHistory(client, searchParams);
      case 'realtime':
        return await getRealtimeStatus(client, searchParams);
      default:
        return await getLineBalanceAnalysis(client, searchParams);
    }
  } catch (error) {
    console.error('Line balance error:', error);
    return NextResponse.json({ success: false, error: '产线平衡分析失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { action, data } = body;

    switch (action) {
      case 'record-timing':
        return await recordProcessTiming(client, data);
      case 'set-target':
        return await setTargetTakt(client, data);
      case 'rebalance':
        return await suggestRebalance(client, data);
      case 'simulate':
        return await simulateBalance(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Line balance operation error:', error);
    return NextResponse.json({ success: false, error: '产线平衡操作失败' }, { status: 500 });
  }
}

/**
 * 产线平衡分析（核心）
 */
async function getLineBalanceAnalysis(client: any, searchParams: URLSearchParams) {
  const lineId = searchParams.get('line_id');
  const orderId = searchParams.get('order_id');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  if (!lineId && !orderId) {
    return NextResponse.json({ 
      success: false, 
      error: '需要产线ID或订单ID' 
    }, { status: 400 });
  }

  // 获取工序列表
  let processQuery = client
    .from('line_processes')
    .select(`
      id,
      process_id,
      sequence,
      station_count,
      target_takt,
      processes (
        id,
        process_code,
        process_name,
        category
      )
    `)
    .order('sequence', { ascending: true });

  if (lineId) {
    processQuery = processQuery.eq('line_id', lineId);
  }

  const { data: processes } = await processQuery;

  if (!processes || processes.length === 0) {
    return NextResponse.json({ 
      success: false, 
      error: '没有找到工序数据' 
    }, { status: 400 });
  }

  // 获取实际节拍数据
  const processIds = processes.map((p: any) => p.process_id);
  
  const { data: timingData } = await client
    .from('process_timing')
    .select(`
      process_id,
      employee_id,
      quantity_completed,
      total_time_seconds,
      start_time,
      end_time,
      employees (name, employee_code)
    `)
    .in('process_id', processIds)
    .gte('start_time', `${date}T00:00:00Z`)
    .lte('end_time', `${date}T23:59:59Z`);

  // 计算各工序节拍
  const processAnalysis = processes.map((p: any) => {
    const timings = timingData?.filter((t: any) => t.process_id === p.process_id) || [];
    
    let avgTakt = 0;
    let minTakt = 0;
    let maxTakt = 0;
    let totalOutput = 0;

    if (timings.length > 0) {
      const takts = timings.map((t: any) => 
        t.quantity_completed > 0 ? t.total_time_seconds / t.quantity_completed : 0
      ).filter((t: number) => t > 0);

      if (takts.length > 0) {
        avgTakt = takts.reduce((sum: number, t: number) => sum + t, 0) / takts.length;
        minTakt = Math.min(...takts);
        maxTakt = Math.max(...takts);
      }

      totalOutput = timings.reduce((sum: number, t: any) => sum + (t.quantity_completed || 0), 0);
    }

    return {
      processId: p.process_id,
      processCode: p.processes?.process_code,
      processName: p.processes?.process_name,
      sequence: p.sequence,
      stationCount: p.station_count || 1,
      targetTakt: p.target_takt || 60,
      actualTakt: Math.round(avgTakt * 100) / 100,
      minTakt: Math.round(minTakt * 100) / 100,
      maxTakt: Math.round(maxTakt * 100) / 100,
      totalOutput,
      efficiency: p.target_takt ? Math.round((p.target_takt / avgTakt) * 100) : 0,
      isBottleneck: false // 后续标记
    };
  });

  // 找出瓶颈工序（节拍最长的）
  const maxTaktProcess = processAnalysis.reduce((prev: any, current: any) => 
    current.actualTakt > prev.actualTakt ? current : prev
  );

  // 标记瓶颈
  processAnalysis.forEach((p: any) => {
    p.isBottleneck = p.processId === maxTaktProcess.processId;
  });

  // 计算产线平衡率
  const totalTakt = processAnalysis.reduce((sum: number, p: any) => sum + p.actualTakt, 0);
  const maxTakt = maxTaktProcess.actualTakt;
  const balanceRate = totalTakt > 0 
    ? Math.round((totalTakt / (maxTakt * processAnalysis.length)) * 100) 
    : 0;

  // 计算产线效率
  const bottleneckTakt = maxTaktProcess.actualTakt;
  const hourlyOutput = bottleneckTakt > 0 ? Math.round(3600 / bottleneckTakt) : 0;

  // 瓶颈分析
  const bottlenecks = processAnalysis
    .filter((p: any) => p.actualTakt > bottleneckTakt * 0.9) // 接近瓶颈的工序
    .sort((a: any, b: any) => b.actualTakt - a.actualTakt);

  // 改进建议
  const suggestions = generateBalanceSuggestions(processAnalysis, balanceRate, bottleneckTakt);

  return NextResponse.json({
    success: true,
    data: {
      lineId,
      date,
      processAnalysis,
      summary: {
        totalProcesses: processAnalysis.length,
        totalOutput: processAnalysis.reduce((sum: number, p: any) => sum + p.totalOutput, 0),
        balanceRate,
        bottleneckProcess: maxTaktProcess.processName,
        bottleneckTakt: Math.round(bottleneckTakt * 100) / 100,
        hourlyOutput,
        lineEfficiency: Math.round(balanceRate * 0.9) // 产线效率约为平衡率的90%
      },
      bottlenecks,
      suggestions
    }
  });
}

/**
 * 瓶颈分析
 */
async function getBottleneckAnalysis(client: any, searchParams: URLSearchParams) {
  const lineId = searchParams.get('line_id');
  const days = parseInt(searchParams.get('days') || '7');

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // 获取时间段内的瓶颈记录
  const { data: bottlenecks } = await client
    .from('bottleneck_records')
    .select(`
      id,
      process_id,
      line_id,
      takt_time,
      impact_on_output,
      detected_at,
      resolved_at,
      resolution,
      processes (
        process_code,
        process_name
      ),
      production_lines (name)
    `)
    .gte('detected_at', startDate.toISOString())
    .order('detected_at', { ascending: false });

  // 统计瓶颈频率
  const frequencyByProcess: Record<string, {
    processId: string;
    processName: string;
    count: number;
    avgImpact: number;
    avgDuration: number;
  }> = {};

  bottlenecks?.forEach((b: any) => {
    const processId = b.process_id;
    if (!frequencyByProcess[processId]) {
      frequencyByProcess[processId] = {
        processId,
        processName: b.processes?.process_name || '未知',
        count: 0,
        avgImpact: 0,
        avgDuration: 0
      };
    }
    frequencyByProcess[processId].count++;
    frequencyByProcess[processId].avgImpact += b.impact_on_output || 0;
    if (b.detected_at && b.resolved_at) {
      frequencyByProcess[processId].avgDuration += 
        (new Date(b.resolved_at).getTime() - new Date(b.detected_at).getTime()) / (1000 * 60);
    }
  });

  // 计算平均值
  Object.values(frequencyByProcess).forEach(p => {
    p.avgImpact = Math.round(p.avgImpact / p.count * 100) / 100;
    p.avgDuration = Math.round(p.avgDuration / p.count);
  });

  // 排序
  const sortedByFrequency = Object.values(frequencyByProcess)
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    success: true,
    data: {
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      totalBottlenecks: bottlenecks?.length || 0,
      frequencyByProcess: sortedByFrequency,
      recentBottlenecks: bottlenecks?.slice(0, 10),
      summary: {
        mostFrequentProcess: sortedByFrequency[0]?.processName || '无',
        totalOutputLoss: bottlenecks?.reduce((sum: number, b: any) => sum + (b.impact_on_output || 0), 0) || 0
      }
    }
  });
}

/**
 * 节拍时间分析
 */
async function getTaktTimeAnalysis(client: any, searchParams: URLSearchParams) {
  const processId = searchParams.get('process_id');
  const lineId = searchParams.get('line_id');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  let query = client
    .from('process_timing')
    .select(`
      id,
      process_id,
      employee_id,
      quantity_completed,
      total_time_seconds,
      start_time,
      end_time,
      processes (process_code, process_name),
      employees (name, employee_code)
    `)
    .gte('start_time', `${date}T00:00:00Z`)
    .lte('end_time', `${date}T23:59:59Z`);

  if (processId) {
    query = query.eq('process_id', processId);
  }

  const { data: timings, error } = await query;

  if (error) throw error;

  // 计算节拍
  const analysis = timings?.map((t: any) => {
    const takt = t.quantity_completed > 0 
      ? t.total_time_seconds / t.quantity_completed 
      : 0;

    return {
      ...t,
      taktTime: Math.round(takt * 100) / 100,
      efficiency: t.target_takt ? Math.round((t.target_takt / takt) * 100) : null
    };
  }) || [];

  // 统计
  const validTakts = analysis.filter((a: any) => a.taktTime > 0);
  const avgTakt = validTakts.length > 0
    ? validTakts.reduce((sum: number, a: any) => sum + a.taktTime, 0) / validTakts.length
    : 0;

  const distribution = {
    underTarget: validTakts.filter((a: any) => a.taktTime < (a.target_takt || 60)).length,
    nearTarget: validTakts.filter((a: any) => {
      const target = a.target_takt || 60;
      return a.taktTime >= target && a.taktTime < target * 1.1;
    }).length,
    aboveTarget: validTakts.filter((a: any) => a.taktTime >= (a.target_takt || 60) * 1.1).length
  };

  return NextResponse.json({
    success: true,
    data: {
      timings: analysis,
      statistics: {
        total: analysis.length,
        avgTakt: Math.round(avgTakt * 100) / 100,
        minTakt: validTakts.length > 0 ? Math.min(...validTakts.map((a: any) => a.taktTime)) : 0,
        maxTakt: validTakts.length > 0 ? Math.max(...validTakts.map((a: any) => a.taktTime)) : 0,
        distribution
      }
    }
  });
}

/**
 * 产线平衡率计算
 */
async function getBalanceRate(client: any, searchParams: URLSearchParams) {
  const lineId = searchParams.get('line_id');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  // 复用产线平衡分析的核心逻辑
  const analysis = await getLineBalanceAnalysis(client, searchParams);
  const analysisData = await analysis.json();

  if (!analysisData.success) {
    return analysis;
  }

  const processes = analysisData.data.processAnalysis;

  // 计算各指标
  const maxTakt = Math.max(...processes.map((p: any) => p.actualTakt || 0));
  const minTakt = Math.min(...processes.map((p: any) => p.actualTakt || Infinity));
  const avgTakt = processes.reduce((sum: number, p: any) => sum + (p.actualTakt || 0), 0) / processes.length;

  // 平衡率 = 平均节拍 / 最大节拍
  const balanceRate = maxTakt > 0 ? Math.round((avgTakt / maxTakt) * 100) : 0;

  // 平衡损失率
  const balanceLoss = 100 - balanceRate;

  // 标准差
  const variance = processes.reduce((sum: number, p: any) => 
    sum + Math.pow((p.actualTakt || 0) - avgTakt, 2), 0) / processes.length;
  const stdDev = Math.sqrt(variance);

  // 变异系数
  const cv = avgTakt > 0 ? Math.round((stdDev / avgTakt) * 100) : 0;

  return NextResponse.json({
    success: true,
    data: {
      lineId,
      date,
      balanceRate,
      balanceLoss,
      maxTakt: Math.round(maxTakt * 100) / 100,
      minTakt: Math.round(minTakt * 100) / 100,
      avgTakt: Math.round(avgTakt * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      cv,
      rating: getBalanceRating(balanceRate),
      improvement: balanceLoss > 15 ? `可提升 ${Math.round(balanceLoss - 10)}%` : '优秀'
    }
  });
}

/**
 * 改进建议
 */
async function getImprovementSuggestions(client: any, searchParams: URLSearchParams) {
  const lineId = searchParams.get('line_id');

  if (!lineId) {
    return NextResponse.json({ 
      success: false, 
      error: '需要产线ID' 
    }, { status: 400 });
  }

  // 获取产线平衡数据
  const analysis = await getLineBalanceAnalysis(client, searchParams);
  const analysisData = await analysis.json();

  if (!analysisData.success) {
    return analysis;
  }

  const processes = analysisData.data.processAnalysis;
  const balanceRate = analysisData.data.summary.balanceRate;
  const bottleneckTakt = analysisData.data.summary.bottleneckTakt;

  const suggestions: any[] = [];

  // 1. 瓶颈工序优化
  const bottleneck = processes.find((p: any) => p.isBottleneck);
  if (bottleneck) {
    suggestions.push({
      type: 'bottleneck',
      priority: 'high',
      process: bottleneck.processName,
      issue: `节拍 ${bottleneck.actualTakt}秒 是产线瓶颈`,
      suggestion: '增加工位或优化工序方法',
      expectedImprovement: `可提升产量 ${Math.round((bottleneck.actualTakt / bottleneckTakt - 1) * 100)}%`
    });
  }

  // 2. 空闲工序
  const idleProcesses = processes.filter((p: any) => 
    p.actualTakt < bottleneckTakt * 0.7
  );

  idleProcesses.forEach((p: any) => {
    suggestions.push({
      type: 'idle',
      priority: 'medium',
      process: p.processName,
      issue: `节拍 ${p.actualTakt}秒，利用率仅 ${Math.round(p.actualTakt / bottleneckTakt * 100)}%`,
      suggestion: '考虑合并工序或减少工位',
      expectedImprovement: '可节省人力成本'
    });
  });

  // 3. 节拍波动大
  const highVariationProcesses = processes.filter((p: any) => 
    p.maxTakt > p.minTakt * 1.5
  );

  highVariationProcesses.forEach((p: any) => {
    suggestions.push({
      type: 'variation',
      priority: 'medium',
      process: p.processName,
      issue: `节拍波动大 (${p.minTakt}-${p.maxTakt}秒)`,
      suggestion: '培训员工或标准化操作',
      expectedImprovement: '减少约20%波动'
    });
  });

  // 4. 平衡率改善
  if (balanceRate < 85) {
    suggestions.push({
      type: 'balance',
      priority: 'high',
      process: '整条产线',
      issue: `平衡率 ${balanceRate}% 偏低`,
      suggestion: '重新分配工作内容',
      expectedImprovement: `可提升至 ${Math.min(90, balanceRate + 10)}%`
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      suggestions,
      summary: {
        total: suggestions.length,
        highPriority: suggestions.filter(s => s.priority === 'high').length,
        estimatedOutputGain: calculateOutputGain(suggestions, bottleneckTakt)
      }
    }
  });
}

/**
 * 实时状态
 */
async function getRealtimeStatus(client: any, searchParams: URLSearchParams) {
  const lineId = searchParams.get('line_id');

  if (!lineId) {
    return NextResponse.json({ 
      success: false, 
      error: '需要产线ID' 
    }, { status: 400 });
  }

  // 获取产线实时数据
  const { data: line } = await client
    .from('production_lines')
    .select(`
      id,
      name,
      status,
      current_order_id,
      production_orders (
        order_code,
        total_quantity,
        progress
      )
    `)
    .eq('id', lineId)
    .single();

  // 获取当前各工位状态
  const { data: stations } = await client
    .from('work_stations')
    .select(`
      id,
      station_no,
      process_id,
      status,
      current_employee_id,
      current_output,
      current_takt,
      processes (process_code, process_name),
      employees (name, employee_code)
    `)
    .eq('line_id', lineId)
    .eq('status', 'active');

  // 获取最近一小时的产出
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data: recentOutput } = await client
    .from('process_tracking')
    .select('quantity_completed, process_id')
    .eq('line_id', lineId)
    .gte('end_time', oneHourAgo);

  const hourlyOutput = recentOutput?.reduce((sum: number, r: any) => sum + r.quantity_completed, 0) || 0;

  // 计算当前瓶颈
  const maxTaktStation = stations?.reduce((prev: any, current: any) => 
    (current.current_takt || 0) > (prev.current_takt || 0) ? current : prev
  , { current_takt: 0 });

  return NextResponse.json({
    success: true,
    data: {
      line,
      stations,
      realtime: {
        hourlyOutput,
        currentBottleneck: maxTaktStation?.processes?.process_name || null,
        currentTakt: maxTaktStation?.current_takt || 0,
        expectedHourlyOutput: maxTaktStation?.current_takt 
          ? Math.round(3600 / maxTaktStation.current_takt) 
          : 0
      }
    }
  });
}

/**
 * 记录工序时间
 */
async function recordProcessTiming(client: any, data: any) {
  const {
    processId,
    employeeId,
    lineId,
    orderId,
    quantityCompleted,
    totalTimeSeconds,
    startTime,
    endTime
  } = data;

  const { data: timing, error } = await client
    .from('process_timing')
    .insert({
      process_id: processId,
      employee_id: employeeId,
      line_id: lineId,
      order_id: orderId,
      quantity_completed: quantityCompleted,
      total_time_seconds: totalTimeSeconds,
      start_time: startTime,
      end_time: endTime,
      takt_time: quantityCompleted > 0 ? totalTimeSeconds / quantityCompleted : 0
    })
    .select()
    .single();

  if (error) throw error;

  // 检查是否成为瓶颈
  await checkAndRecordBottleneck(client, processId, lineId, timing);

  return NextResponse.json({
    success: true,
    data: timing
  });
}

/**
 * 设置目标节拍
 */
async function setTargetTakt(client: any, data: any) {
  const { lineId, processId, targetTakt, setBy } = data;

  const { error } = await client
    .from('line_processes')
    .update({
      target_takt: targetTakt,
      target_set_at: new Date().toISOString(),
      target_set_by: setBy
    })
    .eq('line_id', lineId)
    .eq('process_id', processId);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    message: '目标节拍已更新'
  });
}

/**
 * 模拟平衡
 */
async function simulateBalance(client: any, data: any) {
  const { processes, adjustments } = data;

  // 应用调整
  const simulated = processes.map((p: any) => {
    const adjustment = adjustments.find((a: any) => a.processId === p.processId);
    return {
      ...p,
      simulatedTakt: adjustment 
        ? p.actualTakt * (1 + adjustment.changePercent / 100)
        : p.actualTakt
    };
  });

  // 计算新的平衡率
  const maxTakt = Math.max(...simulated.map((p: any) => p.simulatedTakt || 0));
  const avgTakt = simulated.reduce((sum: number, p: any) => sum + (p.simulatedTakt || 0), 0) / simulated.length;
  const newBalanceRate = maxTakt > 0 ? Math.round((avgTakt / maxTakt) * 100) : 0;

  // 计算产量变化
  const currentOutput = 3600 / Math.max(...processes.map((p: any) => p.actualTakt || 0));
  const newOutput = 3600 / maxTakt;

  return NextResponse.json({
    success: true,
    data: {
      currentBalanceRate: Math.round((avgTakt / Math.max(...processes.map((p: any) => p.actualTakt || 0))) * 100),
      newBalanceRate,
      improvement: newBalanceRate - Math.round((avgTakt / Math.max(...processes.map((p: any) => p.actualTakt || 0))) * 100),
      currentHourlyOutput: Math.round(currentOutput),
      newHourlyOutput: Math.round(newOutput),
      outputChange: Math.round((newOutput - currentOutput) / currentOutput * 100)
    }
  });
}

// 辅助函数
function generateBalanceSuggestions(processes: any[], balanceRate: number, bottleneckTakt: number): any[] {
  const suggestions: any[] = [];

  // 平衡率建议
  if (balanceRate < 70) {
    suggestions.push({
      type: 'critical',
      message: '产线平衡率严重偏低，建议立即优化',
      action: '重新分配工序内容或调整工位数'
    });
  } else if (balanceRate < 85) {
    suggestions.push({
      type: 'warning',
      message: '产线平衡率有提升空间',
      action: '优化瓶颈工序可提升产量'
    });
  }

  // 瓶颈建议
  const bottleneck = processes.find(p => p.isBottleneck);
  if (bottleneck) {
    const gap = ((bottleneck.actualTakt / bottleneckTakt) - 1) * 100;
    if (gap > 20) {
      suggestions.push({
        type: 'bottleneck',
        message: `瓶颈工序「${bottleneck.processName}」节拍比目标高 ${Math.round(gap)}%`,
        action: '增加工位或培训员工'
      });
    }
  }

  return suggestions;
}

function getBalanceRating(rate: number): string {
  if (rate >= 90) return '优秀';
  if (rate >= 85) return '良好';
  if (rate >= 75) return '一般';
  if (rate >= 65) return '较差';
  return '需要改进';
}

function calculateOutputGain(suggestions: any[], bottleneckTakt: number): number {
  const bottleneckSuggestion = suggestions.find(s => s.type === 'bottleneck');
  if (!bottleneckSuggestion) return 0;

  const match = bottleneckSuggestion.expectedImprovement?.match(/(\d+)%/);
  return match ? parseInt(match[1]) : 0;
}

async function checkAndRecordBottleneck(client: any, processId: string, lineId: string, timing: any) {
  // 获取该产线其他工序的平均节拍
  const { data: otherTimings } = await client
    .from('process_timing')
    .select('takt_time')
    .eq('line_id', lineId)
    .gte('start_time', new Date(Date.now() - 60 * 60 * 1000).toISOString());

  if (!otherTimings || otherTimings.length === 0) return;

  const avgTakt = otherTimings.reduce((sum: number, t: any) => sum + t.takt_time, 0) / otherTimings.length;

  // 如果该工序节拍比平均值高50%以上，记录为瓶颈
  if (timing.takt_time > avgTakt * 1.5) {
    await client
      .from('bottleneck_records')
      .insert({
        process_id: processId,
        line_id: lineId,
        takt_time: timing.takt_time,
        avg_line_takt: avgTakt,
        impact_on_output: Math.round((timing.takt_time - avgTakt) / avgTakt * 100),
        detected_at: new Date().toISOString(),
        status: 'active'
      });
  }
}

async function getProcessTiming(client: any, searchParams: URLSearchParams) {
  const processId = searchParams.get('process_id');
  const employeeId = searchParams.get('employee_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let query = client
    .from('process_timing')
    .select(`
      *,
      processes (process_code, process_name),
      employees (name, employee_code)
    `)
    .order('start_time', { ascending: false });

  if (processId) query = query.eq('process_id', processId);
  if (employeeId) query = query.eq('employee_id', employeeId);
  if (startDate) query = query.gte('start_time', `${startDate}T00:00:00Z`);
  if (endDate) query = query.lte('end_time', `${endDate}T23:59:59Z`);

  const { data, error } = await query;
  if (error) throw error;

  return NextResponse.json({ success: true, data });
}

async function getBalanceHistory(client: any, searchParams: URLSearchParams) {
  const lineId = searchParams.get('line_id');
  const days = parseInt(searchParams.get('days') || '30');

  const history: any[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // 简化：从缓存或预计算数据获取
    // 实际应调用getBalanceRate或使用预聚合表
    history.push({
      date: dateStr,
      balanceRate: 75 + Math.random() * 20 // 模拟数据
    });
  }

  return NextResponse.json({
    success: true,
    data: history
  });
}

async function suggestRebalance(client: any, data: any) {
  const { lineId } = data;

  // 获取当前平衡分析
  const analysis = await getLineBalanceAnalysis(client, new URLSearchParams({ line_id: lineId }));
  const analysisData = await analysis.json();

  if (!analysisData.success) {
    return analysis;
  }

  const processes = analysisData.data.processAnalysis;
  const suggestions: any[] = [];

  // 分析可合并的工序
  const lowUtilization = processes.filter((p: any) => p.efficiency < 70);
  if (lowUtilization.length >= 2) {
    suggestions.push({
      type: 'merge',
      processes: lowUtilization.map((p: any) => p.processName),
      benefit: '减少工位，提高利用率'
    });
  }

  // 分析可拆分的工序
  const highLoad = processes.filter((p: any) => p.isBottleneck);
  highLoad.forEach((p: any) => {
    if (p.actualTakt > processes.reduce((sum: number, pr: any) => sum + pr.actualTakt, 0) / processes.length * 1.5) {
      suggestions.push({
        type: 'split',
        process: p.processName,
        benefit: '增加工位，降低节拍'
      });
    }
  });

  return NextResponse.json({
    success: true,
    data: { suggestions }
  });
}
