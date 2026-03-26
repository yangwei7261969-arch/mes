import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 条码/RFID追踪API
 * 
 * 功能：
 * • 生成追踪码（条码/RFID）
 * • 全流程追踪（裁剪→缝制→质检→包装→出货）
 * • 扫码记录
 * • 追溯查询
 * • 批次追踪
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'trace';

    switch (action) {
      case 'trace':
        return await traceItem(client, searchParams);
      case 'history':
        return await getTrackingHistory(client, searchParams);
      case 'batch':
        return await traceBatch(client, searchParams);
      case 'statistics':
        return await getTrackingStats(client, searchParams);
      case 'scan':
        return await scanAndRecord(client, searchParams);
      case 'generate':
        return await generateTrackingCodes(client, searchParams);
      case 'by-order':
        return await trackByOrder(client, searchParams);
      case 'quality-history':
        return await getQualityHistory(client, searchParams);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Tracking API error:', error);
    return NextResponse.json({ success: false, error: '追踪查询失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'generate':
        return await generateTrackingCodesFromOrder(client, data);
      case 'scan':
        return await recordScan(client, data);
      case 'bulk-scan':
        return await bulkScan(client, data);
      case 'update-status':
        return await updateItemStatus(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Tracking operation error:', error);
    return NextResponse.json({ success: false, error: '追踪操作失败' }, { status: 500 });
  }
}

/**
 * 追溯单个物品
 */
async function traceItem(client: any, searchParams: URLSearchParams) {
  const code = searchParams.get('code');
  const trackingId = searchParams.get('tracking_id');

  if (!code && !trackingId) {
    return NextResponse.json({ 
      success: false, 
      error: '请提供追踪码或追踪ID' 
    }, { status: 400 });
  }

  // 查找追踪记录
  let query = client
    .from('tracking_items')
    .select(`
      *,
      production_orders (order_no, style_no, customer_id),
      styles (style_no, style_name),
      customers (name)
    `);

  if (code) {
    query = query.eq('tracking_code', code);
  } else {
    query = query.eq('id', trackingId);
  }

  const { data: item, error } = await query.single();

  if (error || !item) {
    return NextResponse.json({ 
      success: false, 
      error: '未找到追踪记录' 
    }, { status: 404 });
  }

  // 获取追踪历史
  const { data: history } = await client
    .from('tracking_events')
    .select(`
      *,
      employees (name),
      production_lines (line_code, line_name)
    `)
    .eq('tracking_id', item.id)
    .order('scanned_at', { ascending: true });

  // 获取质检记录
  const { data: quality } = await client
    .from('quality_inspections')
    .select('*')
    .eq('tracking_code', item.tracking_code);

  // 构建追踪链
  const trackingChain = buildTrackingChain(history || []);

  return NextResponse.json({
    success: true,
    data: {
      item,
      history: history || [],
      quality: quality || [],
      trackingChain,
      summary: {
        totalStages: history?.length || 0,
        completedStages: history?.filter((h: any) => h.status === 'completed').length || 0,
        qualityIssues: quality?.filter((q: any) => q.result === 'failed').length || 0
      }
    }
  });
}

/**
 * 获取追踪历史
 */
async function getTrackingHistory(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');
  const stage = searchParams.get('stage');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const lineId = searchParams.get('line_id');

  let query = client
    .from('tracking_events')
    .select(`
      *,
      tracking_items (tracking_code, order_id, style_no),
      employees (name, department),
      production_lines (line_code, line_name)
    `)
    .order('scanned_at', { ascending: false });

  if (orderId) {
    query = query.eq('tracking_items.order_id', orderId);
  }
  if (stage) {
    query = query.eq('stage', stage);
  }
  if (startDate) {
    query = query.gte('scanned_at', startDate);
  }
  if (endDate) {
    query = query.lte('scanned_at', endDate);
  }
  if (lineId) {
    query = query.eq('line_id', lineId);
  }

  const { data, error } = await query.limit(100);

  if (error) throw error;

  // 按阶段统计
  const stageStats: Record<string, number> = {};
  data?.forEach((e: any) => {
    stageStats[e.stage] = (stageStats[e.stage] || 0) + 1;
  });

  return NextResponse.json({
    success: true,
    data: {
      events: data || [],
      stageStats,
      total: data?.length || 0
    }
  });
}

/**
 * 批次追踪
 */
async function traceBatch(client: any, searchParams: URLSearchParams) {
  const batchNo = searchParams.get('batch_no');
  const orderId = searchParams.get('order_id');

  if (!batchNo && !orderId) {
    return NextResponse.json({ 
      success: false, 
      error: '请提供批次号或订单号' 
    }, { status: 400 });
  }

  let query = client
    .from('tracking_items')
    .select(`
      *,
      production_orders (order_no, customer_id),
      styles (style_no, style_name)
    `);

  if (batchNo) {
    query = query.eq('batch_no', batchNo);
  }
  if (orderId) {
    query = query.eq('order_id', orderId);
  }

  const { data: items, error } = await query;

  if (error) throw error;

  // 统计各阶段数量
  const stageCounts: Record<string, number> = {
    cutting: 0,
    sewing: 0,
    finishing: 0,
    quality: 0,
    packing: 0,
    shipped: 0
  };

  items?.forEach((item: any) => {
    if (stageCounts.hasOwnProperty(item.current_stage)) {
      stageCounts[item.current_stage]++;
    }
  });

  // 按状态统计
  const statusCounts = {
    normal: items?.filter((i: any) => i.status === 'normal').length || 0,
    rework: items?.filter((i: any) => i.status === 'rework').length || 0,
    defective: items?.filter((i: any) => i.status === 'defective').length || 0
  };

  return NextResponse.json({
    success: true,
    data: {
      items: items || [],
      batchNo,
      orderId,
      summary: {
        total: items?.length || 0,
        stageCounts,
        statusCounts,
        progress: calculateProgress(stageCounts, items?.length || 0)
      }
    }
  });
}

/**
 * 追踪统计
 */
async function getTrackingStats(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  // 今日扫描统计
  const { data: todayScans } = await client
    .from('tracking_events')
    .select('stage, status')
    .gte('scanned_at', `${date}T00:00:00`)
    .lte('scanned_at', `${date}T23:59:59`);

  // 按阶段统计
  const byStage: Record<string, { total: number; completed: number }> = {};
  todayScans?.forEach((scan: any) => {
    if (!byStage[scan.stage]) {
      byStage[scan.stage] = { total: 0, completed: 0 };
    }
    byStage[scan.stage].total++;
    if (scan.status === 'completed') {
      byStage[scan.stage].completed++;
    }
  });

  // 在制品统计
  const { data: wip } = await client
    .from('tracking_items')
    .select('current_stage, status');

  const wipByStage: Record<string, number> = {};
  wip?.filter((i: any) => !['packed', 'shipped'].includes(i.current_stage))
    .forEach((item: any) => {
      wipByStage[item.current_stage] = (wipByStage[item.current_stage] || 0) + 1;
    });

  // 异常统计
  const { data: anomalies } = await client
    .from('tracking_items')
    .select('*')
    .in('status', ['rework', 'defective', 'blocked']);

  // 追溯覆盖率
  const { data: orders } = await client
    .from('production_orders')
    .select('id, quantity, tracked_quantity');

  const coverage = orders?.reduce((acc: any, o: any) => {
    acc.total += o.quantity || 0;
    acc.tracked += o.tracked_quantity || 0;
    return acc;
  }, { total: 0, tracked: 0 }) || { total: 0, tracked: 0 };

  return NextResponse.json({
    success: true,
    data: {
      date,
      todayScans: {
        total: todayScans?.length || 0,
        byStage
      },
      wip: {
        total: Object.values(wipByStage).reduce((a: number, b: number) => a + b, 0),
        byStage: wipByStage
      },
      anomalies: {
        total: anomalies?.length || 0,
        rework: anomalies?.filter((a: any) => a.status === 'rework').length || 0,
        defective: anomalies?.filter((a: any) => a.status === 'defective').length || 0
      },
      coverage: {
        rate: coverage.total > 0 ? Math.round((coverage.tracked / coverage.total) * 100) : 0,
        ...coverage
      }
    }
  });
}

/**
 * 扫码并记录
 */
async function scanAndRecord(client: any, searchParams: URLSearchParams) {
  const code = searchParams.get('code');
  const stage = searchParams.get('stage');
  const employeeId = searchParams.get('employee_id');
  const lineId = searchParams.get('line_id');

  if (!code) {
    return NextResponse.json({ success: false, error: '缺少追踪码' }, { status: 400 });
  }

  // 查找物品
  const { data: item } = await client
    .from('tracking_items')
    .select('*')
    .eq('tracking_code', code || '')
    .single();

  if (!item) {
    return NextResponse.json({ 
      success: false, 
      error: '追踪码不存在',
      code 
    }, { status: 404 });
  }

  // 检查是否可以扫描此阶段
  const stageOrder = ['cutting', 'sewing', 'finishing', 'quality', 'packing', 'shipped'];
  const currentIndex = stageOrder.indexOf(item.current_stage);
  const scanIndex = stage ? stageOrder.indexOf(stage) : currentIndex;

  if (stage && scanIndex < currentIndex) {
    return NextResponse.json({ 
      success: false, 
      error: '不能回退扫描',
      item 
    }, { status: 400 });
  }

  // 记录扫描
  const event = {
    tracking_id: item.id,
    stage: stage || item.current_stage,
    previous_stage: item.current_stage,
    status: 'completed',
    employee_id: employeeId,
    line_id: lineId,
    scanned_at: new Date().toISOString()
  };

  const { data: scanEvent, error } = await client
    .from('tracking_events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;

  // 更新物品当前阶段
  if (stage) {
    await client
      .from('tracking_items')
      .update({ 
        current_stage: stage,
        last_scanned_at: new Date().toISOString()
      })
      .eq('id', item.id);
  }

  return NextResponse.json({
    success: true,
    data: {
      item: { ...item, current_stage: stage || item.current_stage },
      scanEvent,
      message: '扫码成功'
    }
  });
}

/**
 * 生成追踪码
 */
async function generateTrackingCodes(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');
  const quantity = parseInt(searchParams.get('quantity') || '1');
  const prefix = searchParams.get('prefix') || 'TRK';

  if (!orderId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少订单ID' 
    }, { status: 400 });
  }

  const codes = generateCodes(prefix, quantity);
  const items = codes.map(code => ({
    tracking_code: code,
    order_id: orderId,
    current_stage: 'pending',
    status: 'normal',
    created_at: new Date().toISOString()
  }));

  const { data, error } = await client
    .from('tracking_items')
    .insert(items)
    .select();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: {
      codes,
      items: data,
      total: codes.length,
      message: `已生成${codes.length}个追踪码`
    }
  });
}

/**
 * 从订单生成追踪码
 */
async function generateTrackingCodesFromOrder(client: any, data: any) {
  const { orderId, prefix, startFrom } = data;

  // 获取订单信息
  const { data: order } = await client
    .from('production_orders')
    .select('*, styles (style_no, style_name)')
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ 
      success: false, 
      error: '订单不存在' 
    }, { status: 404 });
  }

  const quantity = order.quantity || 0;
  const codePrefix = prefix || `TRK${order.order_no}`;

  const codes = generateCodes(codePrefix, quantity, startFrom);
  
  const items = codes.map((code, index) => ({
    tracking_code: code,
    order_id: orderId,
    style_no: order.styles?.style_no,
    batch_no: `${order.order_no}-${new Date().toISOString().split('T')[0]}`,
    sequence: (startFrom || 0) + index + 1,
    current_stage: 'pending',
    status: 'normal',
    created_at: new Date().toISOString()
  }));

  const { data: inserted, error } = await client
    .from('tracking_items')
    .insert(items)
    .select();

  if (error) throw error;

  // 更新订单追踪数量
  await client
    .from('production_orders')
    .update({ tracked_quantity: quantity })
    .eq('id', orderId);

  return NextResponse.json({
    success: true,
    data: {
      order,
      codes,
      items: inserted,
      total: codes.length,
      message: `已为订单${order.order_no}生成${codes.length}个追踪码`
    }
  });
}

/**
 * 记录扫描
 */
async function recordScan(client: any, data: any) {
  const { trackingCode, stage, employeeId, lineId, status, notes } = data;

  // 查找物品
  const { data: item } = await client
    .from('tracking_items')
    .select('*')
    .eq('tracking_code', trackingCode)
    .single();

  if (!item) {
    return NextResponse.json({ 
      success: false, 
      error: '追踪码不存在' 
    }, { status: 404 });
  }

  // 创建扫描事件
  const event = {
    tracking_id: item.id,
    stage: stage || item.current_stage,
    previous_stage: item.current_stage,
    status: status || 'completed',
    employee_id: employeeId,
    line_id: lineId,
    notes,
    scanned_at: new Date().toISOString()
  };

  const { data: scanEvent, error } = await client
    .from('tracking_events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;

  // 更新物品状态
  if (stage && stage !== item.current_stage) {
    await client
      .from('tracking_items')
      .update({ 
        current_stage: stage,
        status: status || 'normal',
        last_scanned_at: new Date().toISOString()
      })
      .eq('id', item.id);
  }

  return NextResponse.json({
    success: true,
    data: {
      item,
      scanEvent,
      message: '扫描记录已保存'
    }
  });
}

/**
 * 批量扫描
 */
async function bulkScan(client: any, data: any) {
  const { codes, stage, employeeId, lineId } = data;

  if (!codes || codes.length === 0) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少追踪码列表' 
    }, { status: 400 });
  }

  const results = {
    success: [] as any[],
    failed: [] as any[]
  };

  for (const code of codes) {
    try {
      // 查找物品
      const { data: item } = await client
        .from('tracking_items')
        .select('*')
        .eq('tracking_code', code)
        .single();

      if (!item) {
        results.failed.push({ code, reason: '追踪码不存在' });
        continue;
      }

      // 创建扫描事件
      await client
        .from('tracking_events')
        .insert({
          tracking_id: item.id,
          stage,
          previous_stage: item.current_stage,
          status: 'completed',
          employee_id: employeeId,
          line_id: lineId,
          scanned_at: new Date().toISOString()
        });

      // 更新物品
      await client
        .from('tracking_items')
        .update({ 
          current_stage: stage,
          last_scanned_at: new Date().toISOString()
        })
        .eq('id', item.id);

      results.success.push({ code, itemId: item.id });
    } catch (err) {
      results.failed.push({ code, reason: String(err) });
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      total: codes.length,
      successCount: results.success.length,
      failedCount: results.failed.length,
      results
    }
  });
}

/**
 * 更新物品状态
 */
async function updateItemStatus(client: any, data: any) {
  const { trackingId, status, notes } = data;

  const { data: item, error } = await client
    .from('tracking_items')
    .update({ 
      status,
      notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', trackingId)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: item,
    message: '状态已更新'
  });
}

/**
 * 按订单追踪
 */
async function trackByOrder(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少订单ID' 
    }, { status: 400 });
  }

  const { data: items } = await client
    .from('tracking_items')
    .select(`
      *,
      tracking_events (*)
    `)
    .eq('order_id', orderId);

  // 各阶段统计
  const stageStats: Record<string, number> = {};
  items?.forEach((item: any) => {
    stageStats[item.current_stage] = (stageStats[item.current_stage] || 0) + 1;
  });

  // 时间线（按天统计）
  const timeline: Record<string, any> = {};
  items?.forEach((item: any) => {
    item.tracking_events?.forEach((event: any) => {
      const date = event.scanned_at.split('T')[0];
      if (!timeline[date]) {
        timeline[date] = { total: 0, byStage: {} };
      }
      timeline[date].total++;
      timeline[date].byStage[event.stage] = (timeline[date].byStage[event.stage] || 0) + 1;
    });
  });

  return NextResponse.json({
    success: true,
    data: {
      items,
      stageStats,
      timeline,
      summary: {
        total: items?.length || 0,
        stages: Object.keys(stageStats).length,
        progress: calculateProgress(stageStats, items?.length || 0)
      }
    }
  });
}

/**
 * 获取质量历史
 */
async function getQualityHistory(client: any, searchParams: URLSearchParams) {
  const trackingCode = searchParams.get('tracking_code');

  if (!trackingCode) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少追踪码' 
    }, { status: 400 });
  }

  const { data: item } = await client
    .from('tracking_items')
    .select('*')
    .eq('tracking_code', trackingCode)
    .single();

  if (!item) {
    return NextResponse.json({ 
      success: false, 
      error: '追踪码不存在' 
    }, { status: 404 });
  }

  // 质检记录
  const { data: inspections } = await client
    .from('quality_inspections')
    .select('*')
    .eq('tracking_code', trackingCode);

  // 返工记录
  const { data: reworks } = await client
    .from('rework_orders')
    .select('*')
    .eq('tracking_code', trackingCode);

  return NextResponse.json({
    success: true,
    data: {
      item,
      inspections: inspections || [],
      reworks: reworks || [],
      summary: {
        totalInspections: inspections?.length || 0,
        passed: inspections?.filter((i: any) => i.result === 'passed').length || 0,
        failed: inspections?.filter((i: any) => i.result === 'failed').length || 0,
        reworkCount: reworks?.length || 0
      }
    }
  });
}

// 辅助函数
function generateCodes(prefix: string, quantity: number, startFrom: number = 0): string[] {
  const codes: string[] = [];
  const timestamp = Date.now().toString(36).toUpperCase();

  for (let i = 0; i < quantity; i++) {
    const seq = (startFrom + i + 1).toString().padStart(6, '0');
    const checkDigit = generateCheckDigit(`${prefix}${timestamp}${seq}`);
    codes.push(`${prefix}${timestamp}${seq}${checkDigit}`);
  }

  return codes;
}

function generateCheckDigit(code: string): string {
  let sum = 0;
  for (let i = 0; i < code.length; i++) {
    sum += code.charCodeAt(i) * (i % 2 === 0 ? 3 : 1);
  }
  return ((10 - (sum % 10)) % 10).toString();
}

function buildTrackingChain(history: any[]): any[] {
  const stages = ['cutting', 'sewing', 'finishing', 'quality', 'packing', 'shipped'];
  
  return stages.map(stage => {
    const events = history.filter(h => h.stage === stage);
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];

    return {
      stage,
      stageName: getStageName(stage),
      completed: events.length > 0,
      firstScan: firstEvent?.scanned_at,
      lastScan: lastEvent?.scanned_at,
      scanCount: events.length,
      employee: lastEvent?.employees?.name,
      line: lastEvent?.production_lines?.line_name
    };
  });
}

function getStageName(stage: string): string {
  const names: Record<string, string> = {
    pending: '待处理',
    cutting: '裁剪',
    sewing: '缝制',
    finishing: '后整',
    quality: '质检',
    packing: '包装',
    shipped: '已出货'
  };
  return names[stage] || stage;
}

function calculateProgress(stageStats: Record<string, number>, total: number): number {
  if (total === 0) return 0;
  
  const weights: Record<string, number> = {
    cutting: 15,
    sewing: 40,
    finishing: 20,
    quality: 15,
    packing: 10,
    shipped: 0
  };

  let progress = 0;
  Object.keys(weights).forEach(stage => {
    progress += (stageStats[stage] || 0) / total * weights[stage];
  });

  return Math.round(progress);
}
