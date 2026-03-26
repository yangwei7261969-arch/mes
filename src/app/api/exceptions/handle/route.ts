import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 处理异常（确认/指派/解决/关闭/升级）
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { exception_id, action, operator_id, operator_name, ...actionData } = body;

    if (!exception_id || !action) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    // 获取异常单
    const { data: exception, error: fetchError } = await client
      .from('exceptions')
      .select('*')
      .eq('id', exception_id)
      .single();

    if (fetchError || !exception) {
      return NextResponse.json({ success: false, error: '异常不存在' }, { status: 404 });
    }

    let updateData: any = {};
    let recordContent = '';

    switch (action) {
      case 'acknowledge':
        // 确认异常
        updateData = {
          status: 'acknowledged',
          acknowledged_by: operator_id,
          acknowledged_at: new Date().toISOString(),
        };
        recordContent = `${operator_name} 确认了异常`;
        break;

      case 'assign':
        // 指派处理人
        updateData = {
          handler_type: actionData.handler_type || 'employee',
          handler_id: actionData.handler_id,
          handler_name: actionData.handler_name,
          assigned_at: new Date().toISOString(),
        };
        recordContent = `${operator_name} 指派给 ${actionData.handler_name}`;
        break;

      case 'resolve':
        // 解决异常
        updateData = {
          status: 'resolved',
          resolved_by: operator_id,
          resolved_at: new Date().toISOString(),
          resolution: actionData.resolution,
          root_cause: actionData.root_cause,
          preventive_action: actionData.preventive_action,
        };
        // 计算处理时长
        if (exception.acknowledged_at) {
          const duration = Math.floor(
            (new Date().getTime() - new Date(exception.created_at).getTime()) / 60000
          );
          updateData.handle_duration = duration;
        }
        recordContent = `${operator_name} 解决了异常\n原因: ${actionData.root_cause || '未填写'}\n方案: ${actionData.resolution || '未填写'}`;
        break;

      case 'close':
        // 关闭异常
        updateData = {
          status: 'closed',
          closed_by: operator_id,
          closed_at: new Date().toISOString(),
          close_note: actionData.close_note,
          satisfaction_rating: actionData.satisfaction_rating,
          feedback: actionData.feedback,
        };
        recordContent = `${operator_name} 关闭了异常`;
        break;

      case 'reopen':
        // 重新打开异常
        updateData = {
          status: 'open',
          closed_by: null,
          closed_at: null,
          resolved_by: null,
          resolved_at: null,
        };
        recordContent = `${operator_name} 重新打开了异常`;
        break;

      case 'escalate':
        // 升级异常
        const newLevel = (exception.escalation_level || 0) + 1;
        updateData = {
          escalation_level: newLevel,
          escalated_at: new Date().toISOString(),
          escalated_to: actionData.escalated_to,
          handler_id: actionData.new_handler_id,
          handler_name: actionData.new_handler_name,
          severity: upgradeSeverity(exception.severity),
        };
        recordContent = `${operator_name} 升级了异常 (级别 ${newLevel})`;
        break;

      case 'comment':
        // 添加备注
        recordContent = `${operator_name} 添加备注: ${actionData.comment}`;
        break;

      default:
        return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 });
    }

    // 更新异常单
    updateData.updated_at = new Date().toISOString();

    const { error: updateError } = await client
      .from('exceptions')
      .update(updateData)
      .eq('id', exception_id);

    if (updateError) {
      console.error('Update exception error:', updateError);
      return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
    }

    // 创建处理记录
    await client.from('exception_records').insert({
      id: `er_${Date.now()}`,
      exception_id,
      action,
      old_status: exception.status,
      new_status: updateData.status || exception.status,
      operator_id,
      operator_name,
      content: recordContent,
      attachments: actionData.attachments,
    });

    return NextResponse.json({
      success: true,
      message: '操作成功',
    });
  } catch (error) {
    console.error('Handle exception error:', error);
    return NextResponse.json({ success: false, error: '处理失败' }, { status: 500 });
  }
}

// 自动检测异常
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'detect') {
      // 执行自动检测
      const detectedExceptions = await runAutoDetection(client);
      return NextResponse.json({
        success: true,
        data: detectedExceptions,
        message: `检测到 ${detectedExceptions.length} 个新异常`,
      });
    }

    if (action === 'check_overdue') {
      // 检查超时异常
      const overdueCount = await checkOverdueExceptions(client);
      return NextResponse.json({
        success: true,
        data: { overdue_count: overdueCount },
        message: `${overdueCount} 个异常已超时`,
      });
    }

    // 获取统计
    return await getExceptionStats(client);
  } catch (error) {
    console.error('Exception detection error:', error);
    return NextResponse.json({ success: false, error: '检测失败' }, { status: 500 });
  }
}

// 运行自动检测
async function runAutoDetection(client: any) {
  const detected: any[] = [];

  // 1. 检测工序超时
  const processTimeouts = await detectProcessTimeout(client);
  detected.push(...processTimeouts);

  // 2. 检测重复扫码
  const duplicateScans = await detectDuplicateScan(client);
  detected.push(...duplicateScans);

  // 3. 检测外发延期
  const outsourceDelays = await detectOutsourceDelay(client);
  detected.push(...outsourceDelays);

  // 4. 检测次品率过高
  const highDefectRates = await detectHighDefectRate(client);
  detected.push(...highDefectRates);

  // 5. 检测产量异常
  const lowOutputs = await detectLowOutput(client);
  detected.push(...lowOutputs);

  // 创建检测到的异常
  for (const item of detected) {
    try {
      await client.from('exceptions').insert(item);
      await client.from('exception_records').insert({
        id: `er_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        exception_id: item.id,
        action: 'create',
        new_status: 'open',
        operator_id: 'system',
        operator_name: '系统自动检测',
        content: `自动检测创建异常: ${item.title}`,
      });
    } catch (err) {
      console.error('Insert exception error:', err);
    }
  }

  return detected;
}

// 检测工序超时
async function detectProcessTimeout(client: any) {
  const exceptions: any[] = [];
  
  // 查找超过4小时未完成的工序
  const { data: tracking } = await client
    .from('process_tracking')
    .select(`
      id, order_id, process_id, employee_id, start_time, quantity,
      production_orders(order_code, style_id),
      processes(name, standard_time),
      employees(name)
    `)
    .is('completed_at', null)
    .not('start_time', 'is', null);

  if (tracking) {
    for (const t of tracking) {
      const startTime = new Date(t.start_time);
      const elapsed = (Date.now() - startTime.getTime()) / (1000 * 60 * 60); // 小时
      
      // 超时判定（默认4小时，或根据标准工时）
      const threshold = t.processes?.standard_time ? t.processes.standard_time * 3 : 4;
      
      if (elapsed > threshold) {
        // 检查是否已存在此异常
        const { data: existing } = await client
          .from('exceptions')
          .select('id')
          .eq('order_id', t.order_id)
          .eq('process_id', t.process_id)
          .eq('exception_type_code', 'PROCESS_TIMEOUT')
          .in('status', ['open', 'acknowledged', 'in_progress'])
          .single();

        if (!existing) {
          exceptions.push({
            id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            exception_no: generateExceptionNo(),
            exception_type_id: 'et_process_timeout',
            exception_type_code: 'PROCESS_TIMEOUT',
            exception_type_name: '工序超时',
            severity: 'warning',
            priority: 50,
            order_id: t.order_id,
            process_id: t.process_id,
            employee_id: t.employee_id,
            title: `工序超时: ${t.processes?.name || '未知工序'}`,
            description: `员工 ${t.employees?.name || '未知'} 在订单 ${t.production_orders?.order_code} 的 ${t.processes?.name} 工序已超时 ${elapsed.toFixed(1)} 小时`,
            source: 'auto',
            actual_value: elapsed,
            expected_value: threshold,
            deviation_value: elapsed - threshold,
            deviation_rate: ((elapsed - threshold) / threshold) * 100,
            status: 'open',
            handler_id: t.employee_id, // 默认指派给当前员工
            handler_name: t.employees?.name,
            deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            created_by: 'system',
          });
        }
      }
    }
  }

  return exceptions;
}

// 检测重复扫码
async function detectDuplicateScan(client: any) {
  const exceptions: any[] = [];

  // 查找最近的重复扫码记录
  const { data: recentScans } = await client
    .from('process_tracking')
    .select('bundle_id, process_id, employee_id, created_at, production_orders(order_code)')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // 最近1小时
    .order('created_at', { ascending: false });

  if (recentScans) {
    const scanMap = new Map();
    
    for (const scan of recentScans) {
      const key = `${scan.bundle_id}_${scan.process_id}`;
      if (scanMap.has(key)) {
        // 发现重复
        const firstScan = scanMap.get(key);
        
        exceptions.push({
          id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          exception_no: generateExceptionNo(),
          exception_type_id: 'et_scan_duplicate',
          exception_type_code: 'SCAN_DUPLICATE',
          exception_type_name: '重复扫码',
          severity: 'warning',
          priority: 50,
          order_id: scan.production_orders?.order_code ? null : scan.order_id,
          bundle_id: scan.bundle_id,
          process_id: scan.process_id,
          employee_id: scan.employee_id,
          title: `重复扫码: 扎 ${scan.bundle_id}`,
          description: `工序 ${scan.process_id} 对同一扎进行了重复扫码`,
          source: 'auto',
          status: 'open',
          deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          created_by: 'system',
        });
      } else {
        scanMap.set(key, scan);
      }
    }
  }

  return exceptions;
}

// 检测外发延期
async function detectOutsourceDelay(client: any) {
  const exceptions: any[] = [];

  const { data: outsource } = await client
    .from('bundle_outsource')
    .select(`
      id, order_id, bundle_id, supplier_id, planned_return_date, actual_return_date, status,
      production_orders(order_code),
      suppliers(name)
    `)
    .eq('status', 'out')
    .not('planned_return_date', 'is', null);

  if (outsource) {
    for (const o of outsource) {
      if (o.planned_return_date && !o.actual_return_date) {
        const plannedDate = new Date(o.planned_return_date);
        if (plannedDate < new Date()) {
          const delayDays = Math.floor((Date.now() - plannedDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (delayDays > 0) {
            exceptions.push({
              id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              exception_no: generateExceptionNo(),
              exception_type_id: 'et_outsource_delay',
              exception_type_code: 'OUTSOURCE_DELAY',
              exception_type_name: '外发延期',
              severity: delayDays > 3 ? 'critical' : 'warning',
              priority: delayDays > 3 ? 80 : 50,
              order_id: o.order_id,
              bundle_id: o.bundle_id,
              title: `外发延期: ${o.suppliers?.name}`,
              description: `供应商 ${o.suppliers?.name} 延期 ${delayDays} 天未交货`,
              source: 'auto',
              actual_value: delayDays,
              expected_value: 0,
              deviation_value: delayDays,
              status: 'open',
              deadline: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
              created_by: 'system',
            });
          }
        }
      }
    }
  }

  return exceptions;
}

// 检测次品率过高
async function detectHighDefectRate(client: any) {
  const exceptions: any[] = [];

  // 查找最近质检记录
  const { data: inspections } = await client
    .from('quality_inspections')
    .select(`
      id, order_id, process_id, inspector_id, pass_quantity, fail_quantity, created_at,
      production_orders(order_code)
    `)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (inspections) {
    for (const insp of inspections) {
      const total = (insp.pass_quantity || 0) + (insp.fail_quantity || 0);
      if (total > 0) {
        const defectRate = (insp.fail_quantity / total) * 100;
        
        if (defectRate > 5) { // 次品率超过5%
          exceptions.push({
            id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            exception_no: generateExceptionNo(),
            exception_type_id: 'et_defect_high',
            exception_type_code: 'DEFECT_HIGH',
            exception_type_name: '次品率高',
            severity: defectRate > 10 ? 'critical' : 'warning',
            priority: defectRate > 10 ? 80 : 50,
            order_id: insp.order_id,
            process_id: insp.process_id,
            employee_id: insp.inspector_id,
            title: `次品率过高: ${insp.production_orders?.order_code}`,
            description: `次品率 ${defectRate.toFixed(1)}%，次品数 ${insp.fail_quantity} 件`,
            source: 'auto',
            actual_value: defectRate,
            expected_value: 5,
            deviation_value: defectRate - 5,
            deviation_rate: ((defectRate - 5) / 5) * 100,
            status: 'open',
            deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            created_by: 'system',
          });
        }
      }
    }
  }

  return exceptions;
}

// 检测产量异常
async function detectLowOutput(client: any) {
  const exceptions: any[] = [];

  // 按员工统计今日产量
  const today = new Date().toISOString().split('T')[0];
  
  const { data: todayTracking } = await client
    .from('process_tracking')
    .select('employee_id, quantity, employees(name, daily_target)')
    .gte('completed_at', `${today}T00:00:00`)
    .lte('completed_at', `${today}T23:59:59`);

  if (todayTracking) {
    const employeeOutput = new Map();
    
    for (const t of todayTracking) {
      const empId = t.employee_id;
      if (!employeeOutput.has(empId)) {
        employeeOutput.set(empId, {
          employee_id: empId,
          employee_name: t.employees?.name,
          daily_target: t.employees?.daily_target || 100,
          total_quantity: 0,
        });
      }
      employeeOutput.get(empId).total_quantity += t.quantity || 0;
    }

    // 当前时间进度
    const currentHour = new Date().getHours();
    const expectedProgress = currentHour / 8; // 假设8小时工作制

    for (const [empId, data] of employeeOutput) {
      const expectedQuantity = data.daily_target * expectedProgress;
      const actualQuantity = data.total_quantity;
      const progressRate = (actualQuantity / expectedQuantity) * 100;

      if (progressRate < 70 && currentHour >= 10) { // 进度低于70%且已工作2小时以上
        exceptions.push({
          id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          exception_no: generateExceptionNo(),
          exception_type_id: 'et_output_low',
          exception_type_code: 'OUTPUT_LOW',
          exception_type_name: '产量异常',
          severity: 'warning',
          priority: 50,
          employee_id: empId,
          title: `产量异常: ${data.employee_name}`,
          description: `${data.employee_name} 当前产量 ${actualQuantity} 件，仅达到预期进度的 ${progressRate.toFixed(0)}%`,
          source: 'auto',
          actual_value: actualQuantity,
          expected_value: expectedQuantity,
          deviation_value: actualQuantity - expectedQuantity,
          deviation_rate: progressRate - 100,
          status: 'open',
          handler_id: empId,
          handler_name: data.employee_name,
          deadline: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          created_by: 'system',
        });
      }
    }
  }

  return exceptions;
}

// 检查超时异常
async function checkOverdueExceptions(client: any) {
  const now = new Date().toISOString();
  
  // 查询超时的异常
  const { data: overdueList } = await client
    .from('exceptions')
    .select('id, deadline')
    .lt('deadline', now)
    .in('status', ['open', 'acknowledged', 'in_progress'])
    .eq('is_overdue', false);

  // 更新超时状态
  if (overdueList && overdueList.length > 0) {
    for (const item of overdueList) {
      const deadlineTime = new Date(item.deadline).getTime();
      const nowTime = new Date().getTime();
      const overdueHours = Math.floor((nowTime - deadlineTime) / (1000 * 60 * 60));
      
      await client
        .from('exceptions')
        .update({
          is_overdue: true,
          overdue_hours: overdueHours,
        })
        .eq('id', item.id);
    }
  }

  return overdueList?.length || 0;
}

// 获取异常统计
async function getExceptionStats(client: any) {
  const today = new Date().toISOString().split('T')[0];
  
  // 今日统计
  const { data: todayStats } = await client
    .from('exceptions')
    .select('status, severity, exception_type_code')
    .gte('created_at', `${today}T00:00:00`);

  // 待处理统计
  const { data: pendingStats } = await client
    .from('exceptions')
    .select('status, severity, is_overdue')
    .in('status', ['open', 'acknowledged', 'in_progress']);

  // 按类型统计
  const typeStats: Record<string, number> = {};
  const severityStats: Record<string, number> = { info: 0, warning: 0, critical: 0, emergency: 0 };
  const statusStats: Record<string, number> = {};

  if (todayStats) {
    for (const item of todayStats) {
      typeStats[item.exception_type_code] = (typeStats[item.exception_type_code] || 0) + 1;
      severityStats[item.severity] = (severityStats[item.severity] || 0) + 1;
      statusStats[item.status] = (statusStats[item.status] || 0) + 1;
    }
  }

  let overdueCount = 0;
  if (pendingStats) {
    for (const item of pendingStats) {
      if (item.is_overdue) overdueCount++;
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      today_total: todayStats?.length || 0,
      pending_total: pendingStats?.length || 0,
      overdue_count: overdueCount,
      by_type: typeStats,
      by_severity: severityStats,
      by_status: statusStats,
    },
  });
}

// 升级严重程度
function upgradeSeverity(current: string): string {
  const levels = ['info', 'warning', 'critical', 'emergency'];
  const currentIndex = levels.indexOf(current);
  return levels[Math.min(currentIndex + 1, levels.length - 1)];
}

// 生成异常单号
function generateExceptionNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EX${dateStr}${random}`;
}
