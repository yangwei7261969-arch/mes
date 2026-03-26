import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 分层预警系统API
 * 
 * 预警级别：
 * • NORMAL - 正常（绿色）
 * • RISK - 风险（黄色）
 * • DELAY - 延期（红色）
 * 
 * 预警类型：
 * • 订单延期
 * • 产能不足
 * • 质量异常
 * • 设备故障
 * • 物料短缺
 * • 外发延误
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'summary':
        return await getAlertSummary(client);
      case 'predict':
        return await predictAlerts(client, searchParams);
      case 'history':
        return await getAlertHistory(client, searchParams);
      case 'detail':
        return await getAlertDetail(client, searchParams.get('id'));
      default:
        return await getAlertList(client, searchParams);
    }
  } catch (error) {
    console.error('Alert system error:', error);
    return NextResponse.json({ success: false, error: '获取预警失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { action, data } = body;

    switch (action) {
      case 'acknowledge':
        return await acknowledgeAlert(client, data);
      case 'resolve':
        return await resolveAlert(client, data);
      case 'escalate':
        return await escalateAlert(client, data);
      case 'create':
        return await createAlert(client, data);
      case 'config':
        return await updateAlertConfig(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Alert operation error:', error);
    return NextResponse.json({ success: false, error: '预警操作失败' }, { status: 500 });
  }
}

/**
 * 获取预警列表（分层）
 */
async function getAlertList(client: any, searchParams: URLSearchParams) {
  const level = searchParams.get('level');
  const type = searchParams.get('type');
  const status = searchParams.get('status') || 'active';
  const limit = parseInt(searchParams.get('limit') || '50');

  let query = client
    .from('alerts')
    .select(`
      id,
      type,
      level,
      title,
      message,
      status,
      created_at,
      acknowledged_at,
      resolved_at,
      source_type,
      source_id,
      assigned_to,
      metadata,
      employees (name)
    `)
    .order('level', { ascending: false }) // DELAY > RISK > NORMAL
    .order('created_at', { ascending: false })
    .limit(limit);

  if (level && level !== 'all') {
    query = query.eq('level', level);
  }

  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  if (status === 'active') {
    query = query.in('status', ['open', 'acknowledged']);
  } else if (status === 'resolved') {
    query = query.eq('status', 'resolved');
  }

  const { data: alerts, error } = await query;

  // 处理表不存在的情况
  if (error) {
    console.error('Alerts query error:', error);
    if (error.message?.includes('Could not find') || 
        error.code === '42P01' || 
        error.message?.includes('does not exist') ||
        error.message?.includes('relation') ||
        error.code === 'PGRST116') {
      return NextResponse.json({
        success: true,
        data: {
          alerts: [],
          grouped: { delay: [], risk: [], normal: [] },
          counts: { total: 0, delay: 0, risk: 0, normal: 0 }
        }
      });
    }
    throw error;
  }

  // 按级别分组
  const grouped = {
    delay: alerts?.filter((a: any) => a.level === 'delay') || [],
    risk: alerts?.filter((a: any) => a.level === 'risk') || [],
    normal: alerts?.filter((a: any) => a.level === 'normal') || []
  };

  return NextResponse.json({
    success: true,
    data: {
      alerts,
      grouped,
      counts: {
        total: alerts?.length || 0,
        delay: grouped.delay.length,
        risk: grouped.risk.length,
        normal: grouped.normal.length
      }
    }
  });
}

/**
 * 获取预警汇总
 */
async function getAlertSummary(client: any) {
  const today = new Date().toISOString().split('T')[0];

  // 统计各级别预警数量
  const { data: levelStats } = await client
    .from('alerts')
    .select('level, status')
    .in('status', ['open', 'acknowledged']);

  const counts = {
    delay: 0,
    risk: 0,
    normal: 0,
    acknowledged: 0
  };

  levelStats?.forEach((stat: any) => {
    if (stat.level === 'delay') counts.delay++;
    else if (stat.level === 'risk') counts.risk++;
    else counts.normal++;

    if (stat.status === 'acknowledged') counts.acknowledged++;
  });

  // 按类型统计
  const { data: typeStats } = await client
    .from('alerts')
    .select('type')
    .in('status', ['open', 'acknowledged']);

  const byType: Record<string, number> = {};
  typeStats?.forEach((stat: any) => {
    byType[stat.type] = (byType[stat.type] || 0) + 1;
  });

  // 今日新增
  const { count: todayNew } = await client
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${today}T00:00:00Z`);

  // 今日解决
  const { count: todayResolved } = await client
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'resolved')
    .gte('resolved_at', `${today}T00:00:00Z`);

  // 平均响应时间
  const { data: responseTimes } = await client
    .from('alerts')
    .select('created_at, acknowledged_at')
    .not('acknowledged_at', 'is', null)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  let avgResponseTime = 0;
  if (responseTimes && responseTimes.length > 0) {
    const totalMinutes = responseTimes.reduce((sum: number, a: any) => {
      const created = new Date(a.created_at).getTime();
      const acknowledged = new Date(a.acknowledged_at).getTime();
      return sum + (acknowledged - created) / (1000 * 60);
    }, 0);
    avgResponseTime = Math.round(totalMinutes / responseTimes.length);
  }

  return NextResponse.json({
    success: true,
    data: {
      counts,
      byType,
      today: {
        new: todayNew || 0,
        resolved: todayResolved || 0
      },
      metrics: {
        avgResponseTime,
        responseRate: levelStats?.length > 0 
          ? Math.round(counts.acknowledged / levelStats.length * 100) 
          : 0
      }
    }
  });
}

/**
 * 智能预测预警
 */
async function predictAlerts(client: any, searchParams: URLSearchParams) {
  const predictionType = searchParams.get('type') || 'all';
  const predictions: any[] = [];

  // 1. 预测延期订单
  if (predictionType === 'all' || predictionType === 'delay') {
    const { data: inProgressOrders } = await client
      .from('production_orders')
      .select(`
        id,
        order_code,
        delivery_date,
        progress,
        total_quantity,
        customers (name)
      `)
      .in('status', ['confirmed', 'in_production']);

    inProgressOrders?.forEach((order: any) => {
      const daysUntilDue = Math.ceil(
        (new Date(order.delivery_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const remainingProgress = 100 - (order.progress || 0);

      // 简单预测：剩余进度 > 剩余天数 * 15%
      const requiredDailyProgress = daysUntilDue > 0 ? remainingProgress / daysUntilDue : 100;
      
      if (requiredDailyProgress > 15) {
        const riskLevel = requiredDailyProgress > 25 ? 'delay' : 'risk';
        predictions.push({
          type: 'delay_prediction',
          level: riskLevel,
          title: `订单可能延期: ${order.order_code}`,
          message: `当前进度 ${order.progress}%，距交期仅 ${daysUntilDue} 天，需日均进度 ${Math.round(requiredDailyProgress)}%`,
          sourceType: 'order',
          sourceId: order.id,
          predictedDelay: Math.ceil((requiredDailyProgress - 15) / 15),
          confidence: Math.min(95, 60 + requiredDailyProgress)
        });
      }
    });
  }

  // 2. 预测产能瓶颈
  if (predictionType === 'all' || predictionType === 'capacity') {
    const { data: lines } = await client
      .from('production_lines')
      .select(`
        id,
        name,
        capacity,
        production_schedule (
          production_orders (total_quantity, delivery_date)
        )
      `)
      .eq('status', 'active');

    lines?.forEach((line: any) => {
      const upcomingOrders = line.production_schedule?.filter((s: any) => {
        const deliveryDate = new Date(s.production_orders?.delivery_date);
        return deliveryDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }) || [];

      const totalQty = upcomingOrders.reduce((sum: number, o: any) => 
        sum + (o.production_orders?.total_quantity || 0), 0);
      const dailyCapacity = line.capacity * 8;
      const loadRate = Math.round(totalQty / dailyCapacity);

      if (loadRate > 120) {
        predictions.push({
          type: 'capacity_overload',
          level: 'delay',
          title: `产线过载预警: ${line.name}`,
          message: `未来7天订单量已达产能 ${loadRate}%，建议调整排产或外发`,
          sourceType: 'line',
          sourceId: line.id,
          loadRate
        });
      } else if (loadRate > 90) {
        predictions.push({
          type: 'capacity_tight',
          level: 'risk',
          title: `产线产能紧张: ${line.name}`,
          message: `未来7天订单量已达产能 ${loadRate}%`,
          sourceType: 'line',
          sourceId: line.id,
          loadRate
        });
      }
    });
  }

  // 3. 预测质量问题
  if (predictionType === 'all' || predictionType === 'quality') {
    const { data: recentDefects } = await client
      .from('quality_defects')
      .select('defect_type, quantity')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const defectByType: Record<string, number> = {};
    recentDefects?.forEach((d: any) => {
      defectByType[d.defect_type] = (defectByType[d.defect_type] || 0) + (d.quantity || 1);
    });

    // 如果某类缺陷持续出现
    Object.entries(defectByType).forEach(([type, count]) => {
      if (count >= 10) {
        predictions.push({
          type: 'quality_trend',
          level: count >= 20 ? 'risk' : 'normal',
          title: `质量趋势预警: ${type}`,
          message: `近7天该缺陷类型出现 ${count} 次，建议检查工序`,
          sourceType: 'quality',
          defectType: type,
          count
        });
      }
    });
  }

  // 4. 预测外发延误
  if (predictionType === 'all' || predictionType === 'outsource') {
    const { data: outsourceOrders } = await client
      .from('outsource_orders')
      .select(`
        id,
        expected_return_date,
        status,
        suppliers (name, rating),
        production_orders (order_code)
      `)
      .eq('status', 'in_progress');

    outsourceOrders?.forEach((order: any) => {
      const daysUntilDue = Math.ceil(
        (new Date(order.expected_return_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // 供应商评分低 + 时间紧 = 高风险
      if (daysUntilDue <= 3 || (order.suppliers?.rating < 3 && daysUntilDue <= 5)) {
        predictions.push({
          type: 'outsource_delay',
          level: daysUntilDue <= 1 ? 'delay' : 'risk',
          title: `外发可能延误: ${order.production_orders?.order_code}`,
          message: `供应商 ${order.suppliers?.name} 预计回厂时间剩余 ${daysUntilDue} 天`,
          sourceType: 'outsource',
          sourceId: order.id,
          supplierRating: order.suppliers?.rating
        });
      }
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      predictions,
      summary: {
        total: predictions.length,
        delay: predictions.filter(p => p.level === 'delay').length,
        risk: predictions.filter(p => p.level === 'risk').length,
        normal: predictions.filter(p => p.level === 'normal').length
      },
      generatedAt: new Date().toISOString()
    }
  });
}

/**
 * 确认预警
 */
async function acknowledgeAlert(client: any, data: any) {
  const { alertId, acknowledgedBy, notes } = data;

  const { data: alert, error } = await client
    .from('alerts')
    .update({
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: acknowledgedBy,
      acknowledge_notes: notes
    })
    .eq('id', alertId)
    .select()
    .single();

  if (error) throw error;

  // 发送通知给相关人员
  await sendNotification(client, alert, 'acknowledged');

  return NextResponse.json({
    success: true,
    data: alert
  });
}

/**
 * 解决预警
 */
async function resolveAlert(client: any, data: any) {
  const { alertId, resolvedBy, resolution, rootCause, preventiveAction } = data;

  const { data: alert, error } = await client
    .from('alerts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
      resolution,
      root_cause: rootCause,
      preventive_action: preventiveAction
    })
    .eq('id', alertId)
    .select()
    .single();

  if (error) throw error;

  // 记录到知识库（如果有根因分析）
  if (rootCause && preventiveAction) {
    await client
      .from('alert_knowledge_base')
      .insert({
        alert_type: alert.type,
        title: alert.title,
        root_cause: rootCause,
        solution: preventiveAction,
        created_by: resolvedBy
      });
  }

  return NextResponse.json({
    success: true,
    data: alert
  });
}

/**
 * 升级预警
 */
async function escalateAlert(client: any, data: any) {
  const { alertId, escalatedTo, reason } = data;

  // 获取原预警
  const { data: originalAlert } = await client
    .from('alerts')
    .select('*')
    .eq('id', alertId)
    .single();

  if (!originalAlert) {
    return NextResponse.json({ 
      success: false, 
      error: '预警不存在' 
    }, { status: 404 });
  }

  // 升级预警级别
  const levelOrder = ['normal', 'risk', 'delay'];
  const currentIndex = levelOrder.indexOf(originalAlert.level);
  const newLevel = levelOrder[Math.min(currentIndex + 1, 2)];

  const { data: alert, error } = await client
    .from('alerts')
    .update({
      level: newLevel,
      escalated_at: new Date().toISOString(),
      escalated_to: escalatedTo,
      escalation_reason: reason
    })
    .eq('id', alertId)
    .select()
    .single();

  if (error) throw error;

  // 发送升级通知
  await sendNotification(client, alert, 'escalated');

  return NextResponse.json({
    success: true,
    data: alert,
    message: `预警已升级为 ${newLevel} 级`
  });
}

/**
 * 创建预警
 */
async function createAlert(client: any, data: any) {
  const {
    type,
    level,
    title,
    message,
    sourceType,
    sourceId,
    assignedTo,
    metadata
  } = data;

  const { data: alert, error } = await client
    .from('alerts')
    .insert({
      type,
      level,
      title,
      message,
      source_type: sourceType,
      source_id: sourceId,
      assigned_to: assignedTo,
      metadata,
      status: 'open'
    })
    .select()
    .single();

  if (error) throw error;

  // 发送通知
  await sendNotification(client, alert, 'created');

  return NextResponse.json({
    success: true,
    data: alert
  });
}

/**
 * 更新预警配置
 */
async function updateAlertConfig(client: any, data: any) {
  const { configType, rules } = data;

  const { error } = await client
    .from('alert_configs')
    .upsert({
      config_type: configType,
      rules,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;

  return NextResponse.json({
    success: true,
    message: '预警配置已更新'
  });
}

/**
 * 获取预警历史
 */
async function getAlertHistory(client: any, searchParams: URLSearchParams) {
  const startDate = searchParams.get('start_date') || 
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = searchParams.get('end_date') || 
    new Date().toISOString().split('T')[0];

  const { data: alerts, error } = await client
    .from('alerts')
    .select(`
      id,
      type,
      level,
      title,
      status,
      created_at,
      resolved_at,
      acknowledged_at,
      employees (name)
    `)
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // 统计趋势
  const dailyStats: Record<string, { created: number; resolved: number }> = {};
  alerts?.forEach((alert: any) => {
    const createdDate = alert.created_at.split('T')[0];
    if (!dailyStats[createdDate]) {
      dailyStats[createdDate] = { created: 0, resolved: 0 };
    }
    dailyStats[createdDate].created++;

    if (alert.resolved_at) {
      const resolvedDate = alert.resolved_at.split('T')[0];
      if (!dailyStats[resolvedDate]) {
        dailyStats[resolvedDate] = { created: 0, resolved: 0 };
      }
      dailyStats[resolvedDate].resolved++;
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      alerts,
      dailyStats,
      summary: {
        total: alerts?.length || 0,
        resolved: alerts?.filter((a: any) => a.status === 'resolved').length || 0,
        avgResolutionTime: calculateAvgResolutionTime(alerts)
      }
    }
  });
}

/**
 * 获取预警详情
 */
async function getAlertDetail(client: any, alertId: string | null) {
  if (!alertId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少预警ID' 
    }, { status: 400 });
  }

  const { data: alert, error } = await client
    .from('alerts')
    .select(`
      *,
      employees (name, role),
      alert_actions (
        id,
        action_type,
        action_time,
        action_by,
        notes,
        employees (name)
      )
    `)
    .eq('id', alertId)
    .single();

  if (error) throw error;

  if (!alert) {
    return NextResponse.json({ 
      success: false, 
      error: '预警不存在' 
    }, { status: 404 });
  }

  // 获取相关预警
  const { data: relatedAlerts } = await client
    .from('alerts')
    .select('id, type, level, title, status, created_at')
    .eq('source_type', alert.source_type)
    .eq('source_id', alert.source_id)
    .neq('id', alertId)
    .limit(5);

  return NextResponse.json({
    success: true,
    data: {
      alert,
      relatedAlerts,
      timeline: buildTimeline(alert)
    }
  });
}

/**
 * 发送通知
 */
async function sendNotification(client: any, alert: any, action: string) {
  // 根据预警级别决定通知方式
  const notifyMethods = {
    delay: ['sms', 'push', 'email'],
    risk: ['push', 'email'],
    normal: ['email']
  };

  const methods = notifyMethods[alert.level as keyof typeof notifyMethods] || ['email'];

  // 获取通知对象
  const { data: recipients } = await client
    .from('alert_recipients')
    .select('user_id, users (name, email, phone)')
    .eq('alert_type', alert.type);

  // 创建通知记录
  if (recipients && recipients.length > 0) {
    await client
      .from('notifications')
      .insert(recipients.map((r: any) => ({
        user_id: r.user_id,
        type: 'alert',
        title: alert.title,
        content: alert.message,
        alert_id: alert.id,
        methods,
        status: 'pending'
      })));
  }

  // 实际发送逻辑（集成短信/推送服务）
  // 这里仅记录，实际发送由定时任务处理
}

/**
 * 计算平均解决时间
 */
function calculateAvgResolutionTime(alerts: any[]): number {
  const resolved = alerts.filter(a => a.resolved_at && a.created_at);
  if (resolved.length === 0) return 0;

  const totalMinutes = resolved.reduce((sum, a) => {
    const created = new Date(a.created_at).getTime();
    const resolvedTime = new Date(a.resolved_at).getTime();
    return sum + (resolvedTime - created) / (1000 * 60);
  }, 0);

  return Math.round(totalMinutes / resolved.length);
}

/**
 * 构建时间线
 */
function buildTimeline(alert: any): any[] {
  const timeline: any[] = [];

  timeline.push({
    time: alert.created_at,
    action: 'created',
    description: '预警创建'
  });

  if (alert.acknowledged_at) {
    timeline.push({
      time: alert.acknowledged_at,
      action: 'acknowledged',
      description: '预警确认',
      user: alert.employees?.name
    });
  }

  if (alert.escalated_at) {
    timeline.push({
      time: alert.escalated_at,
      action: 'escalated',
      description: `预警升级为 ${alert.level} 级`,
      reason: alert.escalation_reason
    });
  }

  if (alert.resolved_at) {
    timeline.push({
      time: alert.resolved_at,
      action: 'resolved',
      description: '预警解决',
      user: alert.resolved_by,
      resolution: alert.resolution
    });
  }

  return timeline.sort((a, b) => 
    new Date(a.time).getTime() - new Date(b.time).getTime()
  );
}
