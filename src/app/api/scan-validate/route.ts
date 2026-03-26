import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 扫码验证API
 * 
 * 功能：
 * 1. 验证条码有效性
 * 2. 检测未到工序（跳工序）
 * 3. 检测重复扫码
 * 4. 检测超时报警
 * 5. 记录扫码日志
 */

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { action } = body;

    if (action === 'validate') {
      // 验证扫码
      return await validateScan(client, body);
    }

    if (action === 'start_process') {
      // 开始工序
      return await startProcess(client, body);
    }

    if (action === 'end_process') {
      // 结束工序
      return await endProcess(client, body);
    }

    if (action === 'check_sequence') {
      // 检查工序顺序
      return await checkProcessSequence(client, body);
    }

    return NextResponse.json({ 
      success: false, 
      error: '未知操作' 
    }, { status: 400 });

  } catch (error) {
    console.error('Scan validate error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}

/**
 * 验证扫码
 */
async function validateScan(client: any, body: any) {
  const { barcode, employeeId, stationId } = body;

  // 解析条码
  const parseResult = await parseBarcodeInfo(client, barcode);
  if (!parseResult.success || !parseResult.data) {
    return NextResponse.json(parseResult);
  }

  const { type, bundle_id, process_id } = parseResult.data;

  const validation: any = {
    valid: true,
    barcode,
    type,
    warnings: [],
    errors: []
  };

  // 1. 检查条码类型
  if (type === 'QT') {
    // 质检条码特殊处理
    validation.valid = true;
    validation.message = '质检条码，可进行质检操作';
    return NextResponse.json({ success: true, data: validation });
  }

  // 2. 检查扎包是否存在
  const { data: bundle } = await client
    .from('cutting_bundles')
    .select('id, status, quantity, created_at')
    .eq('id', bundle_id)
    .single();

  if (!bundle) {
    validation.valid = false;
    validation.errors.push({ code: 'BUNDLE_NOT_FOUND', message: '扎包不存在' });
    return NextResponse.json({ success: true, data: validation });
  }

  // 3. 检查工序顺序（是否跳工序）
  if (process_id) {
    const sequenceCheck = await checkProcessSequenceInternal(client, bundle_id, process_id);
    if (!sequenceCheck.valid) {
      validation.warnings.push({
        code: 'PROCESS_SKIPPED',
        message: sequenceCheck.message,
        skipped_processes: sequenceCheck.skipped_processes
      });
    }
  }

  // 4. 检查重复扫码
  const { data: existingScan } = await client
    .from('process_tracking')
    .select('*')
    .eq('bundle_id', bundle_id)
    .eq('process_id', process_id)
    .eq('employee_id', employeeId)
    .gte('start_time', new Date(Date.now() - 3600000).toISOString()) // 1小时内
    .single();

  if (existingScan) {
    validation.warnings.push({
      code: 'DUPLICATE_SCAN',
      message: '1小时内已扫过此条码',
      last_scan_time: existingScan.start_time
    });
  }

  // 5. 检查超时（扎包创建后超过24小时未开始第一道工序）
  const bundleCreatedAt = new Date(bundle.created_at);
  const hoursSinceCreation = (Date.now() - bundleCreatedAt.getTime()) / (1000 * 60 * 60);

  if (bundle.status === 'pending' && hoursSinceCreation > 24) {
    validation.warnings.push({
      code: 'TIMEOUT_NOT_STARTED',
      message: `扎包创建已超过 ${Math.floor(hoursSinceCreation)} 小时，尚未开始生产`,
      hours_delayed: Math.floor(hoursSinceCreation)
    });
  }

  // 6. 检查工序超时（当前工序已超过标准工时的2倍）
  const { data: currentProcess } = await client
    .from('process_tracking')
    .select(`
      *,
      processes (standard_time, name)
    `)
    .eq('bundle_id', bundle_id)
    .is('end_time', null)
    .single();

  if (currentProcess && currentProcess.processes) {
    const startTime = new Date(currentProcess.start_time);
    const minutesElapsed = (Date.now() - startTime.getTime()) / (1000 * 60);
    const standardTime = currentProcess.processes.standard_time || 60;

    if (minutesElapsed > standardTime * 2) {
      validation.warnings.push({
        code: 'PROCESS_TIMEOUT',
        message: `当前工序"${currentProcess.processes.name}"已超时`,
        standard_time: standardTime,
        actual_time: Math.floor(minutesElapsed),
        overtime: Math.floor(minutesElapsed - standardTime)
      });
    }
  }

  // 7. 检查员工权限（是否可以操作此工序）
  if (employeeId && process_id) {
    const { data: employee } = await client
      .from('employees')
      .select(`
        id,
        skills,
        lines:production_line_id (processes)
      `)
      .eq('id', employeeId)
      .single();

    if (employee) {
      // 检查技能
      if (employee.skills && !employee.skills.includes(process_id)) {
        validation.warnings.push({
          code: 'SKILL_MISMATCH',
          message: '员工技能不匹配此工序'
        });
      }
    }
  }

  // 综合判断
  if (validation.errors.length > 0) {
    validation.valid = false;
  }

  // 记录扫码日志
  await client
    .from('scan_logs')
    .insert({
      barcode,
      employee_id: employeeId,
      station_id: stationId,
      validation_result: validation,
      created_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    data: validation
  });
}

/**
 * 开始工序
 */
async function startProcess(client: any, body: any) {
  const { barcode, employeeId, processId, stationId } = body;

  // 验证扫码
  const validateResult = await validateScan(client, {
    barcode,
    employeeId,
    stationId
  });

  const validationResult = await validateResult.json();
  if (!validationResult.data.valid) {
    return NextResponse.json({
      success: false,
      error: '扫码验证失败',
      details: validationResult.data?.errors || []
    });
  }

  // 解析条码
  const parseResult = await parseBarcodeInfo(client, barcode);
  if (!parseResult.data) {
    return NextResponse.json({
      success: false,
      error: '条码解析失败'
    });
  }
  const { bundle_id, process_id } = parseResult.data;

  // 创建跟踪记录
  const trackingId = `${bundle_id}-${processId || process_id}-${Date.now()}`;
  const { data, error } = await client
    .from('process_tracking')
    .insert({
      id: trackingId,
      bundle_id,
      process_id: processId || process_id,
      employee_id: employeeId,
      station_id: stationId,
      start_time: new Date().toISOString(),
      status: 'in_progress'
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ 
      success: false, 
      error: '开始工序失败' 
    }, { status: 500 });
  }

  // 更新扎包状态
  await client
    .from('cutting_bundles')
    .update({ status: 'in_production' })
    .eq('id', bundle_id);

  return NextResponse.json({
    success: true,
    data: {
      tracking_id: trackingId,
      message: '工序已开始',
      warnings: validationResult.data.warnings
    }
  });
}

/**
 * 结束工序
 */
async function endProcess(client: any, body: any) {
  const { barcode, employeeId, processId, quantity, defects } = body;

  // 解析条码
  const parseResult = await parseBarcodeInfo(client, barcode);
  if (!parseResult.data) {
    return NextResponse.json({
      success: false,
      error: '条码解析失败'
    });
  }
  const { bundle_id, process_id } = parseResult.data;

  // 找到进行中的工序记录
  const { data: tracking } = await client
    .from('process_tracking')
    .select('*')
    .eq('bundle_id', bundle_id)
    .eq('process_id', processId || process_id)
    .eq('employee_id', employeeId)
    .is('end_time', null)
    .single();

  if (!tracking) {
    return NextResponse.json({ 
      success: false, 
      error: '未找到进行中的工序' 
    }, { status: 400 });
  }

  // 计算工时
  const startTime = new Date(tracking.start_time);
  const endTime = new Date();
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

  // 更新跟踪记录
  const { error } = await client
    .from('process_tracking')
    .update({
      end_time: endTime.toISOString(),
      quantity_completed: quantity,
      defects,
      duration_minutes: Math.round(durationMinutes),
      status: 'completed'
    })
    .eq('id', tracking.id);

  if (error) {
    return NextResponse.json({ 
      success: false, 
      error: '结束工序失败' 
    }, { status: 500 });
  }

  // 计算效率
  const { data: processInfo } = await client
    .from('processes')
    .select('standard_time')
    .eq('id', processId || process_id)
    .single();

  let efficiency = 100;
  if (processInfo?.standard_time && quantity > 0) {
    const standardMinutes = processInfo.standard_time * quantity;
    efficiency = Math.round((standardMinutes / durationMinutes) * 100);
  }

  return NextResponse.json({
    success: true,
    data: {
      tracking_id: tracking.id,
      duration_minutes: Math.round(durationMinutes),
      efficiency,
      message: '工序已完成'
    }
  });
}

/**
 * 检查工序顺序
 */
async function checkProcessSequence(client: any, body: any) {
  const { bundleId, processId } = body;
  const result = await checkProcessSequenceInternal(client, bundleId, processId);
  return NextResponse.json({ success: true, data: result });
}

/**
 * 内部工序顺序检查
 */
async function checkProcessSequenceInternal(client: any, bundleId: string, processId: string) {
  // 获取款式的工序流程
  const { data: bundle } = await client
    .from('cutting_bundles')
    .select(`
      cutting_records (
        order_id,
        production_orders (
          style_id
        )
      )
    `)
    .eq('id', bundleId)
    .single();

  if (!bundle?.cutting_records?.production_orders?.style_id) {
    return { valid: true, message: '无法获取款式信息' };
  }

  const styleId = bundle.cutting_records.production_orders.style_id;

  // 获取款式工序流程
  const { data: styleProcesses } = await client
    .from('style_processes')
    .select(`
      process_id,
      sequence,
      processes (id, name)
    `)
    .eq('style_id', styleId)
    .order('sequence', { ascending: true });

  if (!styleProcesses || styleProcesses.length === 0) {
    return { valid: true, message: '款式未设置工序流程' };
  }

  // 找到当前工序
  const currentProcessIndex = styleProcesses.findIndex(
    (sp: any) => sp.process_id === processId
  );

  if (currentProcessIndex === -1) {
    return { valid: true, message: '工序不在流程中' };
  }

  // 获取已完成的工序
  const { data: completedProcesses } = await client
    .from('process_tracking')
    .select('process_id')
    .eq('bundle_id', bundleId)
    .eq('status', 'completed');

  const completedIds = completedProcesses?.map((p: any) => p.process_id) || [];

  // 检查前面是否所有工序都已完成
  const requiredProcesses = styleProcesses.slice(0, currentProcessIndex);
  const skippedProcesses = requiredProcesses.filter(
    (sp: any) => !completedIds.includes(sp.process_id)
  );

  if (skippedProcesses.length > 0) {
    return {
      valid: false,
      message: `跳过了 ${skippedProcesses.length} 道工序`,
      skipped_processes: skippedProcesses.map((sp: any) => ({
        id: sp.process_id,
        name: sp.processes?.name,
        sequence: sp.sequence
      }))
    };
  }

  return { valid: true, message: '工序顺序正常' };
}

/**
 * 解析条码信息
 */
async function parseBarcodeInfo(client: any, barcode: string) {
  const parts = barcode.split('-');
  if (parts.length < 2) {
    return { success: false, error: '无效的条码格式' };
  }

  const [type, orderId, bundleId, processId, seq] = parts;

  return {
    success: true,
    data: {
      barcode,
      type,
      order_id: orderId,
      bundle_id: bundleId,
      process_id: processId,
      sequence: seq
    }
  };
}
