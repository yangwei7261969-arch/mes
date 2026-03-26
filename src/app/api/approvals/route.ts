import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 审批流系统API
 * 
 * 功能：
 * • 审批流程定义
 * • 审批申请提交
 * • 审批处理
 * • 审批记录查询
 * • 催办提醒
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'pending':
        return await getPendingApprovals(client, searchParams);
      case 'my-applications':
        return await getMyApplications(client, searchParams);
      case 'detail':
        return await getApprovalDetail(client, searchParams.get('id'));
      case 'templates':
        return await getApprovalTemplates(client);
      case 'statistics':
        return await getApprovalStatistics(client, searchParams);
      default:
        return await getPendingApprovals(client, searchParams);
    }
  } catch (error) {
    console.error('Approval flow error:', error);
    return NextResponse.json({ success: false, error: '获取审批数据失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { action, data } = body;

    switch (action) {
      case 'submit':
        return await submitApproval(client, data);
      case 'approve':
        return await approveRequest(client, data);
      case 'reject':
        return await rejectRequest(client, data);
      case 'transfer':
        return await transferApproval(client, data);
      case 'withdraw':
        return await withdrawApproval(client, data);
      case 'remind':
        return await sendReminder(client, data);
      case 'create-template':
        return await createApprovalTemplate(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Approval operation error:', error);
    return NextResponse.json({ success: false, error: '审批操作失败' }, { status: 500 });
  }
}

/**
 * 获取待审批列表
 */
async function getPendingApprovals(client: any, searchParams: URLSearchParams) {
  const userId = searchParams.get('user_id');
  const type = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!userId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少用户ID' 
    }, { status: 400 });
  }

  let query = client
    .from('approval_requests')
    .select(`
      id,
      request_no,
      type,
      title,
      status,
      priority,
      created_at,
      applicant_id,
      current_step,
      total_steps,
      applicants (name, employee_code),
      approval_flows (name)
    `)
    .or(`current_approver_id.eq.${userId},delegate_approver_ids.cs.{${userId}}`)
    .in('status', ['pending', 'processing'])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  const { data: approvals, error } = await query;

  if (error) throw error;

  // 按优先级和类型分组
  const grouped = {
    urgent: approvals?.filter((a: any) => a.priority === 'urgent') || [],
    high: approvals?.filter((a: any) => a.priority === 'high' && a.priority !== 'urgent') || [],
    normal: approvals?.filter((a: any) => a.priority === 'normal') || [],
    low: approvals?.filter((a: any) => a.priority === 'low') || []
  };

  return NextResponse.json({
    success: true,
    data: {
      approvals,
      grouped,
      counts: {
        total: approvals?.length || 0,
        urgent: grouped.urgent.length,
        high: grouped.high.length
      }
    }
  });
}

/**
 * 获取我的申请列表
 */
async function getMyApplications(client: any, searchParams: URLSearchParams) {
  const userId = searchParams.get('user_id');
  const status = searchParams.get('status') || 'all';
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!userId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少用户ID' 
    }, { status: 400 });
  }

  let query = client
    .from('approval_requests')
    .select(`
      id,
      request_no,
      type,
      title,
      status,
      priority,
      created_at,
      current_step,
      total_steps,
      approval_flows (name)
    `)
    .eq('applicant_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: applications, error } = await query;

  if (error) throw error;

  // 统计各状态数量
  const statusCounts = {
    pending: 0,
    processing: 0,
    approved: 0,
    rejected: 0,
    withdrawn: 0
  };

  applications?.forEach((app: any) => {
    if (app.status in statusCounts) {
      statusCounts[app.status as keyof typeof statusCounts]++;
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      applications,
      statusCounts
    }
  });
}

/**
 * 获取审批详情
 */
async function getApprovalDetail(client: any, requestId: string | null) {
  if (!requestId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少审批ID' 
    }, { status: 400 });
  }

  const { data: approval, error } = await client
    .from('approval_requests')
    .select(`
      *,
      applicants (id, name, employee_code, department),
      approval_flows (id, name, description),
      approval_records (
        id,
        step,
        action,
        action_time,
        comment,
        attachments,
        approvers (id, name, employee_code),
        delegates (id, name)
      ),
      approval_attachments (
        id,
        file_name,
        file_url,
        file_type,
        file_size
      )
    `)
    .eq('id', requestId)
    .single();

  if (error) throw error;

  if (!approval) {
    return NextResponse.json({ 
      success: false, 
      error: '审批不存在' 
    }, { status: 404 });
  }

  // 获取关联业务数据
  let businessData = null;
  if (approval.business_type && approval.business_id) {
    businessData = await getBusinessData(client, approval.business_type, approval.business_id);
  }

  // 构建时间线
  const timeline = buildApprovalTimeline(approval);

  return NextResponse.json({
    success: true,
    data: {
      approval,
      businessData,
      timeline,
      canApprove: true, // 需要根据当前用户判断
      canWithdraw: approval.status === 'pending' || approval.status === 'processing'
    }
  });
}

/**
 * 提交审批申请
 */
async function submitApproval(client: any, data: any) {
  const {
    type,
    title,
    applicantId,
    businessType,
    businessId,
    content,
    attachments,
    priority,
    notifyApprovers
  } = data;

  // 获取审批流程模板
  const { data: template } = await client
    .from('approval_templates')
    .select(`
      id,
      flow_id,
      steps
    `)
    .eq('type', type)
    .eq('status', 'active')
    .single();

  if (!template) {
    return NextResponse.json({ 
      success: false, 
      error: '未找到对应的审批流程' 
    }, { status: 400 });
  }

  // 生成申请编号
  const requestNo = `AP${Date.now().toString(36).toUpperCase()}`;

  // 获取第一步审批人
  const firstStep = template.steps[0];
  const currentApproverId = await getApproverId(client, firstStep, applicantId);

  // 创建审批请求
  const { data: approval, error } = await client
    .from('approval_requests')
    .insert({
      request_no: requestNo,
      type,
      title,
      applicant_id: applicantId,
      business_type: businessType,
      business_id: businessId,
      content,
      flow_id: template.flow_id,
      current_step: 1,
      total_steps: template.steps.length,
      current_approver_id: currentApproverId,
      status: 'pending',
      priority: priority || 'normal'
    })
    .select()
    .single();

  if (error) throw error;

  // 保存附件
  if (attachments && attachments.length > 0) {
    await client
      .from('approval_attachments')
      .insert(attachments.map((att: any) => ({
        approval_request_id: approval.id,
        file_name: att.fileName,
        file_url: att.fileUrl,
        file_type: att.fileType,
        file_size: att.fileSize
      })));
  }

  // 发送通知
  if (notifyApprovers !== false) {
    await sendApprovalNotification(client, {
      requestId: approval.id,
      type: 'new',
      approverId: currentApproverId
    });
  }

  // 记录审计日志
  await client
    .from('audit_logs')
    .insert({
      action: 'submit_approval',
      entity_type: 'approval_request',
      entity_id: approval.id,
      user_id: applicantId,
      details: { type, title, businessType, businessId }
    });

  return NextResponse.json({
    success: true,
    data: approval
  });
}

/**
 * 批准申请
 */
async function approveRequest(client: any, data: any) {
  const { requestId, approverId, comment, attachments, delegateId } = data;

  // 获取审批请求
  const { data: approval } = await client
    .from('approval_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!approval) {
    return NextResponse.json({ 
      success: false, 
      error: '审批不存在' 
    }, { status: 404 });
  }

  // 验证审批权限
  if (approval.current_approver_id !== approverId && 
      !approval.delegate_approver_ids?.includes(approverId)) {
    return NextResponse.json({ 
      success: false, 
      error: '无审批权限' 
    }, { status: 403 });
  }

  // 创建审批记录
  await client
    .from('approval_records')
    .insert({
      approval_request_id: requestId,
      step: approval.current_step,
      approver_id: approverId,
      delegate_id: delegateId,
      action: 'approved',
      action_time: new Date().toISOString(),
      comment,
      attachments
    });

  // 判断是否还有下一步
  if (approval.current_step < approval.total_steps) {
    // 获取下一步审批人
    const { data: template } = await client
      .from('approval_templates')
      .select('steps')
      .eq('type', approval.type)
      .single();

    const nextStep = template?.steps[approval.current_step];
    const nextApproverId = await getApproverId(client, nextStep, approval.applicant_id);

    // 更新审批状态
    await client
      .from('approval_requests')
      .update({
        current_step: approval.current_step + 1,
        current_approver_id: nextApproverId,
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    // 通知下一步审批人
    await sendApprovalNotification(client, {
      requestId,
      type: 'next',
      approverId: nextApproverId
    });

  } else {
    // 审批完成
    await client
      .from('approval_requests')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        current_approver_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    // 执行审批通过后的业务逻辑
    await executeApprovalAction(client, approval);

    // 通知申请人
    await sendApprovalNotification(client, {
      requestId,
      type: 'approved',
      applicantId: approval.applicant_id
    });
  }

  return NextResponse.json({
    success: true,
    message: approval.current_step < approval.total_steps 
      ? '审批成功，已流转到下一审批人'
      : '审批完成'
  });
}

/**
 * 拒绝申请
 */
async function rejectRequest(client: any, data: any) {
  const { requestId, approverId, reason, attachments } = data;

  // 获取审批请求
  const { data: approval } = await client
    .from('approval_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!approval) {
    return NextResponse.json({ 
      success: false, 
      error: '审批不存在' 
    }, { status: 404 });
  }

  // 验证审批权限
  if (approval.current_approver_id !== approverId) {
    return NextResponse.json({ 
      success: false, 
      error: '无审批权限' 
    }, { status: 403 });
  }

  // 创建审批记录
  await client
    .from('approval_records')
    .insert({
      approval_request_id: requestId,
      step: approval.current_step,
      approver_id: approverId,
      action: 'rejected',
      action_time: new Date().toISOString(),
      comment: reason,
      attachments
    });

  // 更新审批状态
  await client
    .from('approval_requests')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejected_by: approverId,
      reject_reason: reason,
      current_approver_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId);

  // 通知申请人
  await sendApprovalNotification(client, {
    requestId,
    type: 'rejected',
    applicantId: approval.applicant_id,
    reason
  });

  return NextResponse.json({
    success: true,
    message: '审批已拒绝'
  });
}

/**
 * 转交审批
 */
async function transferApproval(client: any, data: any) {
  const { requestId, fromApproverId, toApproverId, reason } = data;

  // 更新当前审批人
  const { error } = await client
    .from('approval_requests')
    .update({
      current_approver_id: toApproverId,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .eq('current_approver_id', fromApproverId);

  if (error) throw error;

  // 记录转交
  await client
    .from('approval_transfers')
    .insert({
      approval_request_id: requestId,
      from_approver_id: fromApproverId,
      to_approver_id: toApproverId,
      reason,
      created_at: new Date().toISOString()
    });

  // 通知新审批人
  await sendApprovalNotification(client, {
    requestId,
    type: 'transfer',
    approverId: toApproverId
  });

  return NextResponse.json({
    success: true,
    message: '审批已转交'
  });
}

/**
 * 撤回申请
 */
async function withdrawApproval(client: any, data: any) {
  const { requestId, applicantId, reason } = data;

  // 获取审批请求
  const { data: approval } = await client
    .from('approval_requests')
    .select('status, applicant_id')
    .eq('id', requestId)
    .single();

  if (!approval) {
    return NextResponse.json({ 
      success: false, 
      error: '审批不存在' 
    }, { status: 404 });
  }

  if (approval.applicant_id !== applicantId) {
    return NextResponse.json({ 
      success: false, 
      error: '只能撤回自己的申请' 
    }, { status: 403 });
  }

  if (approval.status === 'approved' || approval.status === 'rejected') {
    return NextResponse.json({ 
      success: false, 
      error: '已完成的审批无法撤回' 
    }, { status: 400 });
  }

  // 更新状态
  const { error } = await client
    .from('approval_requests')
    .update({
      status: 'withdrawn',
      withdrawn_at: new Date().toISOString(),
      withdraw_reason: reason,
      current_approver_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (error) throw error;

  // 通知当前审批人
  if (approval.current_approver_id) {
    await sendApprovalNotification(client, {
      requestId,
      type: 'withdrawn',
      approverId: approval.current_approver_id
    });
  }

  return NextResponse.json({
    success: true,
    message: '申请已撤回'
  });
}

/**
 * 发送催办提醒
 */
async function sendReminder(client: any, data: any) {
  const { requestId, senderId } = data;

  // 获取审批请求
  const { data: approval } = await client
    .from('approval_requests')
    .select(`
      *,
      current_approver_id,
      applicants (name)
    `)
    .eq('id', requestId)
    .single();

  if (!approval || !approval.current_approver_id) {
    return NextResponse.json({ 
      success: false, 
      error: '无需催办' 
    }, { status: 400 });
  }

  // 发送催办通知
  await client
    .from('notifications')
    .insert({
      user_id: approval.current_approver_id,
      type: 'approval_reminder',
      title: '审批催办',
      content: `${approval.applicants?.name} 提醒您尽快处理审批：${approval.title}`,
      reference_type: 'approval',
      reference_id: requestId,
      status: 'pending'
    });

  // 记录催办
  await client
    .from('approval_reminders')
    .insert({
      approval_request_id: requestId,
      sender_id: senderId,
      receiver_id: approval.current_approver_id,
      created_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    message: '催办已发送'
  });
}

/**
 * 获取审批流程模板
 */
async function getApprovalTemplates(client: any) {
  const { data: templates, error } = await client
    .from('approval_templates')
    .select(`
      id,
      type,
      name,
      description,
      steps,
      status,
      created_at
    `)
    .eq('status', 'active')
    .order('type');

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: templates
  });
}

/**
 * 创建审批流程模板
 */
async function createApprovalTemplate(client: any, data: any) {
  const { type, name, description, steps, flowId } = data;

  const { data: template, error } = await client
    .from('approval_templates')
    .insert({
      type,
      name,
      description,
      steps,
      flow_id: flowId,
      status: 'active'
    })
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: template
  });
}

/**
 * 获取审批统计
 */
async function getApprovalStatistics(client: any, searchParams: URLSearchParams) {
  const userId = searchParams.get('user_id');
  const period = searchParams.get('period') || 'month';

  const dateRange = getDateRange(period);

  // 待处理数量
  const { count: pendingCount } = await client
    .from('approval_requests')
    .select('*', { count: 'exact', head: true })
    .eq('current_approver_id', userId)
    .in('status', ['pending', 'processing']);

  // 已处理数量
  const { count: processedCount } = await client
    .from('approval_records')
    .select('*', { count: 'exact', head: true })
    .eq('approver_id', userId)
    .gte('action_time', `${dateRange.start}T00:00:00Z`);

  // 申请数量
  const { count: appliedCount } = await client
    .from('approval_requests')
    .select('*', { count: 'exact', head: true })
    .eq('applicant_id', userId)
    .gte('created_at', `${dateRange.start}T00:00:00Z`);

  // 通过率
  const { data: approvalStats } = await client
    .from('approval_requests')
    .select('status')
    .eq('applicant_id', userId)
    .gte('created_at', `${dateRange.start}T00:00:00Z`);

  const total = approvalStats?.length || 0;
  const approved = approvalStats?.filter((a: any) => a.status === 'approved').length || 0;
  const passRate = total > 0 ? Math.round(approved / total * 100) : 0;

  // 平均审批时长
  const { data: completedApprovals } = await client
    .from('approval_requests')
    .select('created_at, approved_at')
    .eq('applicant_id', userId)
    .eq('status', 'approved')
    .gte('created_at', `${dateRange.start}T00:00:00Z`);

  let avgDuration = 0;
  if (completedApprovals && completedApprovals.length > 0) {
    const totalHours = completedApprovals.reduce((sum: number, a: any) => {
      const duration = new Date(a.approved_at).getTime() - new Date(a.created_at).getTime();
      return sum + duration / (1000 * 60 * 60);
    }, 0);
    avgDuration = Math.round(totalHours / completedApprovals.length);
  }

  return NextResponse.json({
    success: true,
    data: {
      pending: pendingCount || 0,
      processed: processedCount || 0,
      applied: appliedCount || 0,
      passRate,
      avgDuration,
      period,
      dateRange
    }
  });
}

/**
 * 获取审批人ID
 */
async function getApproverId(client: any, step: any, applicantId: string): Promise<string> {
  switch (step.approverType) {
    case 'specific':
      return step.approverId;
    
    case 'department_head':
      // 获取部门主管
      const { data: applicant } = await client
        .from('employees')
        .select('department_id, departments (head_id)')
        .eq('id', applicantId)
        .single();
      return applicant?.departments?.head_id;
    
    case 'role':
      // 获取指定角色的用户
      const { data: roleUser } = await client
        .from('employees')
        .select('id')
        .eq('role_id', step.roleId)
        .eq('status', 'active')
        .limit(1)
        .single();
      return roleUser?.id;
    
    default:
      return step.approverId;
  }
}

/**
 * 发送审批通知
 */
async function sendApprovalNotification(client: any, params: {
  requestId: string;
  type: string;
  approverId?: string;
  applicantId?: string;
  reason?: string;
}) {
  const { requestId, type, approverId, applicantId, reason } = params;

  // 获取审批详情
  const { data: approval } = await client
    .from('approval_requests')
    .select('title, request_no')
    .eq('id', requestId)
    .single();

  let userId: string;
  let title: string;
  let content: string;

  switch (type) {
    case 'new':
      userId = approverId!;
      title = '新的审批申请';
      content = `您有一条新的审批申请待处理：${approval?.title}`;
      break;
    
    case 'next':
      userId = approverId!;
      title = '审批流转';
      content = `审批已流转到您：${approval?.title}`;
      break;
    
    case 'approved':
      userId = applicantId!;
      title = '审批通过';
      content = `您的申请已通过：${approval?.title}`;
      break;
    
    case 'rejected':
      userId = applicantId!;
      title = '审批拒绝';
      content = `您的申请被拒绝：${approval?.title}。原因：${reason}`;
      break;
    
    case 'transfer':
      userId = approverId!;
      title = '审批转交';
      content = `审批已转交给您：${approval?.title}`;
      break;
    
    case 'withdrawn':
      userId = approverId!;
      title = '申请已撤回';
      content = `申请人已撤回审批：${approval?.title}`;
      break;
    
    default:
      return;
  }

  await client
    .from('notifications')
    .insert({
      user_id: userId,
      type: 'approval',
      title,
      content,
      reference_type: 'approval',
      reference_id: requestId,
      status: 'pending'
    });
}

/**
 * 执行审批通过后的业务逻辑
 */
async function executeApprovalAction(client: any, approval: any) {
  switch (approval.business_type) {
    case 'production_order':
      // 更新生产订单状态
      await client
        .from('production_orders')
        .update({ status: 'confirmed' })
        .eq('id', approval.business_id);
      break;
    
    case 'outsource_order':
      // 确认外发订单
      await client
        .from('outsource_orders')
        .update({ status: 'confirmed' })
        .eq('id', approval.business_id);
      break;
    
    case 'purchase_order':
      // 确认采购订单
      await client
        .from('purchase_orders')
        .update({ status: 'confirmed' })
        .eq('id', approval.business_id);
      break;
    
    // 可以扩展更多业务类型
  }
}

/**
 * 获取业务数据
 */
async function getBusinessData(client: any, businessType: string, businessId: string) {
  switch (businessType) {
    case 'production_order':
      return client
        .from('production_orders')
        .select(`
          *,
          customers (name),
          styles (style_name)
        `)
        .eq('id', businessId)
        .single();
    
    case 'outsource_order':
      return client
        .from('outsource_orders')
        .select(`
          *,
          suppliers (name),
          production_orders (order_code)
        `)
        .eq('id', businessId)
        .single();
    
    default:
      return null;
  }
}

/**
 * 构建审批时间线
 */
function buildApprovalTimeline(approval: any): any[] {
  const timeline: any[] = [];

  // 提交
  timeline.push({
    time: approval.created_at,
    action: 'submit',
    title: '提交申请',
    user: approval.applicants?.name
  });

  // 审批记录
  approval.approval_records?.forEach((record: any) => {
    timeline.push({
      time: record.action_time,
      action: record.action,
      title: record.action === 'approved' ? '审批通过' : '审批拒绝',
      user: record.approvers?.name,
      comment: record.comment
    });
  });

  // 如果已完成
  if (approval.status === 'approved' && approval.approved_at) {
    timeline.push({
      time: approval.approved_at,
      action: 'completed',
      title: '审批完成'
    });
  }

  return timeline.sort((a, b) => 
    new Date(a.time).getTime() - new Date(b.time).getTime()
  );
}

/**
 * 获取日期范围
 */
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
      now.setMonth(now.getMonth() - 1);
      start = now.toISOString().split('T')[0];
      break;
    case 'quarter':
      now.setMonth(now.getMonth() - 3);
      start = now.toISOString().split('T')[0];
      break;
    default:
      now.setMonth(now.getMonth() - 1);
      start = now.toISOString().split('T')[0];
  }

  return { start, end };
}
