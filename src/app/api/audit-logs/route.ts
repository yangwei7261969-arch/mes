import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 操作日志与审计API
 * 
 * 功能：
 * • 操作日志记录
 * • 操作日志查询
 * • 安全审计
 * • 异常行为检测
 * • 数据变更追踪
 * • 敏感操作监控
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await getAuditLogs(client, searchParams);
      case 'detail':
        return await getAuditLogDetail(client, searchParams.get('id'));
      case 'user-activity':
        return await getUserActivity(client, searchParams);
      case 'entity-history':
        return await getEntityHistory(client, searchParams);
      case 'security-report':
        return await getSecurityReport(client, searchParams);
      case 'anomaly-detection':
        return await detectAnomalies(client);
      case 'statistics':
        return await getAuditStatistics(client, searchParams);
      default:
        return await getAuditLogs(client, searchParams);
    }
  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json({ success: false, error: '获取审计日志失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { action, data } = body;

    switch (action) {
      case 'log':
        return await createAuditLog(client, data);
      case 'batch-log':
        return await createBatchAuditLogs(client, data);
      case 'export':
        return await exportAuditLogs(client, data);
      case 'clean':
        return await cleanOldLogs(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Audit operation error:', error);
    return NextResponse.json({ success: false, error: '审计操作失败' }, { status: 500 });
  }
}

/**
 * 获取审计日志列表
 */
async function getAuditLogs(client: any, searchParams: URLSearchParams) {
  const userId = searchParams.get('user_id');
  const action = searchParams.get('action');
  const entityType = searchParams.get('entity_type');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const keyword = searchParams.get('keyword');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '50');

  let query = client
    .from('audit_logs')
    .select(`
      id,
      action,
      entity_type,
      entity_id,
      user_id,
      ip_address,
      user_agent,
      status,
      created_at,
      details,
      users (name, employee_code)
    `)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  // 应用筛选条件
  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (action && action !== 'all') {
    query = query.eq('action', action);
  }

  if (entityType && entityType !== 'all') {
    query = query.eq('entity_type', entityType);
  }

  if (startDate) {
    query = query.gte('created_at', `${startDate}T00:00:00Z`);
  }

  if (endDate) {
    query = query.lte('created_at', `${endDate}T23:59:59Z`);
  }

  if (keyword) {
    query = query.or(`details.ilike.%${keyword}%,entity_id.ilike.%${keyword}%`);
  }

  const { data: logs, error, count } = await query;

  if (error) throw error;

  // 获取总数
  const { count: totalCount } = await client
    .from('audit_logs')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({
    success: true,
    data: {
      logs,
      pagination: {
        page,
        pageSize,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / pageSize)
      }
    }
  });
}

/**
 * 获取审计日志详情
 */
async function getAuditLogDetail(client: any, logId: string | null) {
  if (!logId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少日志ID' 
    }, { status: 400 });
  }

  const { data: log, error } = await client
    .from('audit_logs')
    .select(`
      *,
      users (
        id,
        name,
        employee_code,
        email,
        role
      )
    `)
    .eq('id', logId)
    .single();

  if (error) throw error;

  if (!log) {
    return NextResponse.json({ 
      success: false, 
      error: '日志不存在' 
    }, { status: 404 });
  }

  // 如果是更新操作，获取变更前后的数据对比
  let changes = null;
  if (log.action === 'update' && log.old_data && log.new_data) {
    changes = compareData(log.old_data, log.new_data);
  }

  // 获取相关日志
  const { data: relatedLogs } = await client
    .from('audit_logs')
    .select('id, action, created_at, users (name)')
    .eq('entity_type', log.entity_type)
    .eq('entity_id', log.entity_id)
    .neq('id', logId)
    .order('created_at', { ascending: false })
    .limit(5);

  return NextResponse.json({
    success: true,
    data: {
      log,
      changes,
      relatedLogs
    }
  });
}

/**
 * 获取用户活动记录
 */
async function getUserActivity(client: any, searchParams: URLSearchParams) {
  const userId = searchParams.get('user_id');
  const startDate = searchParams.get('start_date') || 
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = searchParams.get('end_date') || 
    new Date().toISOString().split('T')[0];

  if (!userId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少用户ID' 
    }, { status: 400 });
  }

  // 获取用户操作日志
  const { data: logs } = await client
    .from('audit_logs')
    .select('action, entity_type, created_at, details')
    .eq('user_id', userId)
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`)
    .order('created_at', { ascending: false });

  // 按日期分组统计
  const dailyActivity: Record<string, { count: number; actions: Record<string, number> }> = {};
  logs?.forEach((log: any) => {
    const date = log.created_at.split('T')[0];
    if (!dailyActivity[date]) {
      dailyActivity[date] = { count: 0, actions: {} };
    }
    dailyActivity[date].count++;
    dailyActivity[date].actions[log.action] = (dailyActivity[date].actions[log.action] || 0) + 1;
  });

  // 按操作类型统计
  const actionStats: Record<string, number> = {};
  logs?.forEach((log: any) => {
    actionStats[log.action] = (actionStats[log.action] || 0) + 1;
  });

  // 按实体类型统计
  const entityStats: Record<string, number> = {};
  logs?.forEach((log: any) => {
    entityStats[log.entity_type] = (entityStats[log.entity_type] || 0) + 1;
  });

  // 获取用户信息
  const { data: user } = await client
    .from('users')
    .select('id, name, employee_code, role, last_login_at')
    .eq('id', userId)
    .single();

  return NextResponse.json({
    success: true,
    data: {
      user,
      period: { start: startDate, end: endDate },
      totalActions: logs?.length || 0,
      dailyActivity: Object.entries(dailyActivity).map(([date, data]) => ({
        date,
        ...data
      })),
      actionStats,
      entityStats,
      recentLogs: logs?.slice(0, 10) || []
    }
  });
}

/**
 * 获取实体变更历史
 */
async function getEntityHistory(client: any, searchParams: URLSearchParams) {
  const entityType = searchParams.get('entity_type');
  const entityId = searchParams.get('entity_id');

  if (!entityType || !entityId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少实体类型或ID' 
    }, { status: 400 });
  }

  const { data: history, error } = await client
    .from('audit_logs')
    .select(`
      id,
      action,
      old_data,
      new_data,
      created_at,
      users (name, employee_code)
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // 构建变更时间线
  const timeline = history?.map((h: any) => ({
    id: h.id,
    action: h.action,
    user: h.users?.name,
    time: h.created_at,
    changes: h.action === 'update' ? compareData(h.old_data, h.new_data) : null
  }));

  return NextResponse.json({
    success: true,
    data: {
      entityType,
      entityId,
      history,
      timeline
    }
  });
}

/**
 * 获取安全审计报告
 */
async function getSecurityReport(client: any, searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'week';
  const dateRange = getDateRange(period);

  // 登录统计
  const { data: loginLogs } = await client
    .from('audit_logs')
    .select('user_id, ip_address, created_at, details')
    .eq('action', 'login')
    .gte('created_at', `${dateRange.start}T00:00:00Z`)
    .lte('created_at', `${dateRange.end}T23:59:59Z`);

  // 失败登录
  const failedLogins = loginLogs?.filter((l: any) => l.details?.success === false) || [];
  const uniqueFailedUsers = new Set(failedLogins.map((l: any) => l.user_id)).size;

  // 异常IP
  const ipLoginCount: Record<string, { count: number; users: Set<string> }> = {};
  loginLogs?.forEach((log: any) => {
    const ip = log.ip_address;
    if (!ipLoginCount[ip]) {
      ipLoginCount[ip] = { count: 0, users: new Set() };
    }
    ipLoginCount[ip].count++;
    ipLoginCount[ip].users.add(log.user_id);
  });

  const suspiciousIps = Object.entries(ipLoginCount)
    .filter(([ip, data]) => data.users.size > 3 || data.count > 20)
    .map(([ip, data]) => ({
      ip,
      loginCount: data.count,
      uniqueUsers: data.users.size
    }));

  // 敏感操作统计
  const { data: sensitiveOps } = await client
    .from('audit_logs')
    .select(`
      action,
      entity_type,
      user_id,
      created_at,
      users (name)
    `)
    .in('action', ['delete', 'export', 'permission_change', 'role_change'])
    .gte('created_at', `${dateRange.start}T00:00:00Z`)
    .lte('created_at', `${dateRange.end}T23:59:59Z`);

  // 非工作时间操作
  const afterHoursOps = loginLogs?.filter((l: any) => {
    const hour = new Date(l.created_at).getHours();
    return hour < 8 || hour > 18;
  }) || [];

  // 数据导出统计
  const { data: exportOps } = await client
    .from('audit_logs')
    .select('user_id, details, created_at, users (name)')
    .eq('action', 'export')
    .gte('created_at', `${dateRange.start}T00:00:00Z`);

  return NextResponse.json({
    success: true,
    data: {
      period,
      dateRange,
      login: {
        total: loginLogs?.length || 0,
        failed: failedLogins.length,
        uniqueFailedUsers,
        suspiciousIps
      },
      sensitiveOperations: {
        total: sensitiveOps?.length || 0,
        byType: groupBy(sensitiveOps, 'action'),
        details: sensitiveOps?.slice(0, 20)
      },
      afterHours: {
        count: afterHoursOps.length,
        details: afterHoursOps.slice(0, 10)
      },
      dataExports: {
        count: exportOps?.length || 0,
        details: exportOps?.slice(0, 10)
      },
      riskScore: calculateRiskScore({
        failedLogins: failedLogins.length,
        suspiciousIps: suspiciousIps.length,
        sensitiveOps: sensitiveOps?.length || 0,
        afterHoursOps: afterHoursOps.length
      })
    }
  });
}

/**
 * 异常行为检测
 */
async function detectAnomalies(client: any) {
  const anomalies: any[] = [];

  // 1. 检测异常登录
  const { data: recentLogins } = await client
    .from('audit_logs')
    .select('user_id, ip_address, created_at, details')
    .eq('action', 'login')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  // 检测多次失败登录
  const failedLoginAttempts: Record<string, number> = {};
  recentLogins?.forEach((log: any) => {
    if (log.details?.success === false) {
      failedLoginAttempts[log.user_id] = (failedLoginAttempts[log.user_id] || 0) + 1;
    }
  });

  Object.entries(failedLoginAttempts).forEach(([userId, count]) => {
    if (count >= 5) {
      anomalies.push({
        type: 'brute_force_attempt',
        severity: 'high',
        userId,
        description: `24小时内失败登录 ${count} 次`,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 2. 检测异常数据访问
  const { data: dataAccess } = await client
    .from('audit_logs')
    .select('user_id, action, entity_type, created_at')
    .in('action', ['read', 'export'])
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

  const accessCount: Record<string, number> = {};
  dataAccess?.forEach((log: any) => {
    const key = `${log.user_id}`;
    accessCount[key] = (accessCount[key] || 0) + 1;
  });

  Object.entries(accessCount).forEach(([userId, count]) => {
    if (count >= 100) {
      anomalies.push({
        type: 'excessive_data_access',
        severity: 'medium',
        userId,
        description: `1小时内数据访问 ${count} 次`,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 3. 检测敏感操作集中发生
  const { data: sensitiveOps } = await client
    .from('audit_logs')
    .select('user_id, action, created_at')
    .in('action', ['delete', 'permission_change', 'role_change'])
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

  const sensitiveCount: Record<string, number> = {};
  sensitiveOps?.forEach((log: any) => {
    sensitiveCount[log.user_id] = (sensitiveCount[log.user_id] || 0) + 1;
  });

  Object.entries(sensitiveCount).forEach(([userId, count]) => {
    if (count >= 3) {
      anomalies.push({
        type: 'sensitive_operation_burst',
        severity: 'high',
        userId,
        description: `1小时内敏感操作 ${count} 次`,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 4. 检测非工作时间异常
  const currentHour = new Date().getHours();
  if (currentHour < 6 || currentHour > 22) {
    const { data: nightOps } = await client
      .from('audit_logs')
      .select('user_id, action, entity_type')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .in('action', ['create', 'update', 'delete']);

    if (nightOps && nightOps.length > 10) {
      anomalies.push({
        type: 'after_hours_activity',
        severity: 'low',
        description: `非工作时间有 ${nightOps.length} 次数据操作`,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 5. 检测IP地址异常
  const { data: recentIpLogins } = await client
    .from('audit_logs')
    .select('user_id, ip_address')
    .eq('action', 'login')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

  const userIps: Record<string, Set<string>> = {};
  recentIpLogins?.forEach((log: any) => {
    if (!userIps[log.user_id]) {
      userIps[log.user_id] = new Set();
    }
    userIps[log.user_id].add(log.ip_address);
  });

  Object.entries(userIps).forEach(([userId, ips]) => {
    if (ips.size >= 3) {
      anomalies.push({
        type: 'multiple_ip_login',
        severity: 'medium',
        userId,
        description: `1小时内从 ${ips.size} 个不同IP登录`,
        ips: Array.from(ips),
        timestamp: new Date().toISOString()
      });
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      anomalies,
      summary: {
        total: anomalies.length,
        high: anomalies.filter(a => a.severity === 'high').length,
        medium: anomalies.filter(a => a.severity === 'medium').length,
        low: anomalies.filter(a => a.severity === 'low').length
      },
      checkedAt: new Date().toISOString()
    }
  });
}

/**
 * 获取审计统计
 */
async function getAuditStatistics(client: any, searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'month';
  const dateRange = getDateRange(period);

  // 操作统计
  const { data: logs } = await client
    .from('audit_logs')
    .select('action, entity_type, user_id, created_at')
    .gte('created_at', `${dateRange.start}T00:00:00Z`)
    .lte('created_at', `${dateRange.end}T23:59:59Z`);

  // 按操作类型统计
  const byAction: Record<string, number> = {};
  logs?.forEach((log: any) => {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
  });

  // 按实体类型统计
  const byEntityType: Record<string, number> = {};
  logs?.forEach((log: any) => {
    byEntityType[log.entity_type] = (byEntityType[log.entity_type] || 0) + 1;
  });

  // 按用户统计（活跃用户）
  const byUser: Record<string, number> = {};
  logs?.forEach((log: any) => {
    byUser[log.user_id] = (byUser[log.user_id] || 0) + 1;
  });

  // 按日期统计
  const byDate: Record<string, number> = {};
  logs?.forEach((log: any) => {
    const date = log.created_at.split('T')[0];
    byDate[date] = (byDate[date] || 0) + 1;
  });

  // 获取活跃用户详情
  const activeUserIds = Object.keys(byUser).sort((a, b) => byUser[b] - byUser[a]).slice(0, 10);
  const { data: activeUsers } = await client
    .from('users')
    .select('id, name, employee_code')
    .in('id', activeUserIds);

  const activeUsersWithCount = activeUsers?.map((u: any) => ({
    ...u,
    operationCount: byUser[u.id] || 0
  }));

  return NextResponse.json({
    success: true,
    data: {
      period,
      dateRange,
      total: logs?.length || 0,
      byAction,
      byEntityType,
      byDate: Object.entries(byDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      activeUsers: activeUsersWithCount,
      uniqueUsers: Object.keys(byUser).length
    }
  });
}

/**
 * 创建审计日志
 */
async function createAuditLog(client: any, data: any) {
  const {
    action,
    entityType,
    entityId,
    userId,
    ipAddress,
    userAgent,
    oldData,
    newData,
    details,
    status
  } = data;

  const { data: log, error } = await client
    .from('audit_logs')
    .insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      old_data: oldData,
      new_data: newData,
      details,
      status: status || 'success',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // 检查是否需要告警
  if (['delete', 'permission_change', 'role_change'].includes(action)) {
    await sendAuditAlert(client, log);
  }

  return NextResponse.json({
    success: true,
    data: log
  });
}

/**
 * 批量创建审计日志
 */
async function createBatchAuditLogs(client: any, data: any) {
  const { logs } = data;

  const { error } = await client
    .from('audit_logs')
    .insert(logs.map((log: any) => ({
      ...log,
      created_at: log.created_at || new Date().toISOString()
    })));

  if (error) throw error;

  return NextResponse.json({
    success: true,
    message: `成功记录 ${logs.length} 条日志`
  });
}

/**
 * 导出审计日志
 */
async function exportAuditLogs(client: any, data: any) {
  const { startDate, endDate, userId, action, entityType, format = 'json' } = data;

  let query = client
    .from('audit_logs')
    .select(`
      id,
      action,
      entity_type,
      entity_id,
      user_id,
      ip_address,
      status,
      created_at,
      details,
      users (name, employee_code)
    `)
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`)
    .order('created_at', { ascending: false });

  if (userId) query = query.eq('user_id', userId);
  if (action) query = query.eq('action', action);
  if (entityType) query = query.eq('entity_type', entityType);

  const { data: logs, error } = await query;

  if (error) throw error;

  // 记录导出操作
  await client
    .from('audit_logs')
    .insert({
      action: 'export',
      entity_type: 'audit_log',
      user_id: data.requesterId,
      details: { 
        startDate, 
        endDate, 
        count: logs?.length || 0,
        format 
      },
      created_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    data: {
      logs,
      exportedAt: new Date().toISOString(),
      count: logs?.length || 0
    }
  });
}

/**
 * 清理旧日志
 */
async function cleanOldLogs(client: any, data: any) {
  const { retentionDays = 365 } = data;
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const { error } = await client
    .from('audit_logs')
    .delete()
    .lt('created_at', cutoffDate.toISOString());

  if (error) throw error;

  return NextResponse.json({
    success: true,
    message: `已清理 ${retentionDays} 天前的日志`
  });
}

/**
 * 比较数据变更
 */
function compareData(oldData: any, newData: any): any[] {
  const changes: any[] = [];
  
  if (!oldData || !newData) return changes;

  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  allKeys.forEach(key => {
    const oldValue = oldData[key];
    const newValue = newData[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        oldValue,
        newValue
      });
    }
  });

  return changes;
}

/**
 * 按字段分组
 */
function groupBy(array: any[], field: string): Record<string, number> {
  const result: Record<string, number> = {};
  array?.forEach((item: any) => {
    const key = item[field];
    result[key] = (result[key] || 0) + 1;
  });
  return result;
}

/**
 * 计算风险评分
 */
function calculateRiskScore(metrics: {
  failedLogins: number;
  suspiciousIps: number;
  sensitiveOps: number;
  afterHoursOps: number;
}): number {
  let score = 0;

  score += Math.min(metrics.failedLogins * 2, 30);
  score += Math.min(metrics.suspiciousIps * 10, 30);
  score += Math.min(metrics.sensitiveOps * 3, 20);
  score += Math.min(metrics.afterHoursOps * 0.5, 20);

  return Math.min(score, 100);
}

/**
 * 发送审计告警
 */
async function sendAuditAlert(client: any, log: any) {
  // 获取需要通知的用户（管理员）
  const { data: admins } = await client
    .from('users')
    .select('id')
    .in('role', ['admin', 'boss']);

  if (admins && admins.length > 0) {
    await client
      .from('notifications')
      .insert(admins.map((admin: any) => ({
        user_id: admin.id,
        type: 'audit_alert',
        title: '敏感操作告警',
        content: `检测到敏感操作：${log.action} on ${log.entity_type}`,
        reference_type: 'audit_log',
        reference_id: log.id,
        status: 'pending'
      })));
  }
}

/**
 * 获取日期范围
 */
function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start: string;

  switch (period) {
    case 'day':
      start = end;
      break;
    case 'week':
      now.setDate(now.getDate() - 7);
      start = now.toISOString().split('T')[0];
      break;
    case 'month':
      now.setMonth(now.getMonth() - 1);
      start = now.toISOString().split('T')[0];
      break;
    case 'quarter':
      now.setMonth(now.getMonth() - 3);
      start = now.toISOString().split('T')[0];
      break;
    case 'year':
      now.setFullYear(now.getFullYear() - 1);
      start = now.toISOString().split('T')[0];
      break;
    default:
      now.setMonth(now.getMonth() - 1);
      start = now.toISOString().split('T')[0];
  }

  return { start, end };
}
