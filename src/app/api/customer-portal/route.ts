import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 客户门户API
 * 
 * 高级商业功能：
 * • 客户查看订单进度
 * • 下载资料文件
 * • 查看出货状态
 * • 提交反馈
 * 
 * 价值：客户会要求工厂用你的系统
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'orders';

    // 从header获取客户认证信息
    const authHeader = request.headers.get('authorization');
    const customerId = await validateCustomerAuth(client, authHeader);

    if (!customerId) {
      return NextResponse.json({ 
        success: false, 
        error: '未授权访问' 
      }, { status: 401 });
    }

    switch (action) {
      case 'orders':
        return await getCustomerOrders(client, customerId, searchParams);
      case 'order-detail':
        return await getCustomerOrderDetail(client, customerId, searchParams.get('id'));
      case 'progress':
        return await getCustomerProgress(client, customerId, searchParams);
      case 'shipments':
        return await getCustomerShipments(client, customerId, searchParams);
      case 'documents':
        return await getCustomerDocuments(client, customerId, searchParams);
      case 'notifications':
        return await getCustomerNotifications(client, customerId);
      case 'profile':
        return await getCustomerProfile(client, customerId);
      case 'dashboard':
        return await getCustomerDashboard(client, customerId);
      default:
        return await getCustomerOrders(client, customerId, searchParams);
    }
  } catch (error) {
    console.error('Customer portal error:', error);
    return NextResponse.json({ success: false, error: '获取数据失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    // 验证客户身份
    const authHeader = request.headers.get('authorization');
    const customerId = await validateCustomerAuth(client, authHeader);

    if (!customerId) {
      return NextResponse.json({ 
        success: false, 
        error: '未授权访问' 
      }, { status: 401 });
    }

    const { action, data } = body;

    switch (action) {
      case 'submit-feedback':
        return await submitFeedback(client, customerId, data);
      case 'confirm-shipment':
        return await confirmShipment(client, customerId, data);
      case 'request-update':
        return await requestUpdate(client, customerId, data);
      case 'download-log':
        return await logDownload(client, customerId, data);
      case 'update-profile':
        return await updateCustomerProfile(client, customerId, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Customer portal operation error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}

/**
 * 获取客户订单列表
 */
async function getCustomerOrders(client: any, customerId: string, searchParams: URLSearchParams) {
  const status = searchParams.get('status') || 'all';
  const keyword = searchParams.get('keyword');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '20');

  let query = client
    .from('production_orders')
    .select(`
      id,
      order_code,
      total_quantity,
      completed_quantity,
      progress,
      status,
      delivery_date,
      created_at,
      styles (
        id,
        style_no,
        style_name,
        style_image
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (keyword) {
    query = query.or(`order_code.ilike.%${keyword}%,styles.style_no.ilike.%${keyword}%`);
  }

  const { data: orders, error, count } = await query;

  if (error) throw error;

  // 添加可查看的详细信息标识
  const ordersWithPermissions = orders?.map((order: any) => ({
    ...order,
    canViewDetail: true,
    canDownloadDocs: ['confirmed', 'in_production', 'completed'].includes(order.status),
    canProvideFeedback: order.progress >= 90
  }));

  return NextResponse.json({
    success: true,
    data: {
      orders: ordersWithPermissions,
      pagination: {
        page,
        pageSize,
        total: count || 0
      }
    }
  });
}

/**
 * 获取订单详情
 */
async function getCustomerOrderDetail(client: any, customerId: string, orderId: string | null) {
  if (!orderId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少订单ID' 
    }, { status: 400 });
  }

  // 验证订单归属
  const { data: order, error } = await client
    .from('production_orders')
    .select(`
      id,
      order_code,
      total_quantity,
      completed_quantity,
      progress,
      status,
      delivery_date,
      created_at,
      actual_start_date,
      estimated_completion_date,
      styles (
        id,
        style_no,
        style_name,
        style_image,
        category
      ),
      customer_feedback (
        id,
        feedback_type,
        content,
        created_at,
        status
      )
    `)
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .single();

  if (error || !order) {
    return NextResponse.json({ 
      success: false, 
      error: '订单不存在或无权访问' 
    }, { status: 404 });
  }

  // 获取生产进度明细
  const { data: processProgress } = await client
    .from('order_process_progress')
    .select(`
      process_id,
      process_name,
      planned_quantity,
      completed_quantity,
      progress,
      status
    `)
    .eq('order_id', orderId);

  // 获取出货记录
  const { data: shipments } = await client
    .from('shipments')
    .select(`
      id,
      shipment_no,
      quantity,
      cartons,
      shipped_at,
      status,
      carrier,
      tracking_no
    `)
    .eq('order_id', orderId)
    .eq('status', 'shipped');

  // 计算预计完成时间
  const estimatedCompletion = calculateEstimatedCompletion(order, processProgress);

  return NextResponse.json({
    success: true,
    data: {
      order,
      processProgress,
      shipments,
      estimatedCompletion,
      timeline: await buildOrderTimeline(client, orderId)
    }
  });
}

/**
 * 获取客户进度总览
 */
async function getCustomerProgress(client: any, customerId: string, searchParams: URLSearchParams) {
  // 获取所有订单进度汇总
  const { data: orders } = await client
    .from('production_orders')
    .select(`
      id,
      order_code,
      progress,
      status,
      delivery_date,
      styles (style_no, style_name)
    `)
    .eq('customer_id', customerId)
    .in('status', ['confirmed', 'in_production']);

  // 按状态分组
  const grouped = {
    inProduction: orders?.filter((o: any) => o.status === 'in_production') || [],
    pending: orders?.filter((o: any) => o.status === 'confirmed') || [],
    atRisk: orders?.filter((o: any) => {
      const daysUntilDue = Math.ceil(
        (new Date(o.delivery_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilDue <= 7 && o.progress < 80;
    }) || []
  };

  // 即将到期的订单
  const upcomingDeadlines = orders
    ?.filter((o: any) => {
      const daysUntilDue = Math.ceil(
        (new Date(o.delivery_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilDue <= 14 && daysUntilDue > 0;
    })
    .sort((a: any, b: any) => 
      new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime()
    )
    .slice(0, 5);

  return NextResponse.json({
    success: true,
    data: {
      orders,
      grouped,
      upcomingDeadlines,
      summary: {
        total: orders?.length || 0,
        inProduction: grouped.inProduction.length,
        pending: grouped.pending.length,
        atRisk: grouped.atRisk.length
      }
    }
  });
}

/**
 * 获取出货记录
 */
async function getCustomerShipments(client: any, customerId: string, searchParams: URLSearchParams) {
  const status = searchParams.get('status') || 'all';

  let query = client
    .from('shipments')
    .select(`
      id,
      shipment_no,
      quantity,
      actual_quantity,
      cartons,
      planned_date,
      shipped_at,
      status,
      carrier,
      tracking_no,
      production_orders (
        order_code,
        styles (style_no, style_name)
      )
    `)
    .eq('production_orders.customer_id', customerId)
    .order('shipped_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: shipments, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: shipments
  });
}

/**
 * 获取可下载文档
 */
async function getCustomerDocuments(client: any, customerId: string, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');

  let query = client
    .from('customer_documents')
    .select(`
      id,
      document_name,
      document_type,
      file_url,
      file_size,
      created_at,
      production_orders (
        order_code,
        styles (style_no)
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (orderId) {
    query = query.eq('order_id', orderId);
  }

  const { data: documents, error } = await query;

  if (error) throw error;

  // 按类型分组
  const grouped = {
    invoice: documents?.filter((d: any) => d.document_type === 'invoice') || [],
    packingList: documents?.filter((d: any) => d.document_type === 'packing_list') || [],
    certificate: documents?.filter((d: any) => d.document_type === 'certificate') || [],
    photo: documents?.filter((d: any) => d.document_type === 'photo') || [],
    other: documents?.filter((d: any) => d.document_type === 'other') || []
  };

  return NextResponse.json({
    success: true,
    data: {
      documents,
      grouped
    }
  });
}

/**
 * 获取通知消息
 */
async function getCustomerNotifications(client: any, customerId: string) {
  const { data: notifications, error } = await client
    .from('customer_notifications')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  // 未读数量
  const unreadCount = notifications?.filter((n: any) => !n.read_at).length || 0;

  return NextResponse.json({
    success: true,
    data: {
      notifications,
      unreadCount
    }
  });
}

/**
 * 获取客户档案
 */
async function getCustomerProfile(client: any, customerId: string) {
  const { data: customer, error } = await client
    .from('customers')
    .select(`
      id,
      code,
      name,
      contact_person,
      contact_phone,
      contact_email,
      address,
      created_at,
      customer_settings (
        notification_preferences,
        language,
        timezone
      )
    `)
    .eq('id', customerId)
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: customer
  });
}

/**
 * 客户仪表盘
 */
async function getCustomerDashboard(client: any, customerId: string) {
  // 订单统计
  const { data: orderStats } = await client
    .from('production_orders')
    .select('status')
    .eq('customer_id', customerId);

  const stats = {
    total: orderStats?.length || 0,
    inProduction: orderStats?.filter((o: any) => o.status === 'in_production').length || 0,
    completed: orderStats?.filter((o: any) => o.status === 'completed').length || 0,
    pending: orderStats?.filter((o: any) => o.status === 'confirmed').length || 0
  };

  // 即将出货
  const { data: upcomingShipments } = await client
    .from('shipments')
    .select(`
      id,
      shipment_no,
      planned_date,
      quantity,
      production_orders (order_code)
    `)
    .eq('production_orders.customer_id', customerId)
    .eq('status', 'pending')
    .order('planned_date', { ascending: true })
    .limit(5);

  // 最近活动
  const { data: recentActivity } = await client
    .from('customer_activity_logs')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    success: true,
    data: {
      stats,
      upcomingShipments,
      recentActivity
    }
  });
}

/**
 * 提交反馈
 */
async function submitFeedback(client: any, customerId: string, data: any) {
  const { orderId, feedbackType, content, rating } = data;

  const { data: feedback, error } = await client
    .from('customer_feedback')
    .insert({
      customer_id: customerId,
      order_id: orderId,
      feedback_type: feedbackType,
      content,
      rating,
      status: 'submitted',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // 通知工厂
  await client
    .from('notifications')
    .insert({
      type: 'customer_feedback',
      title: '收到客户反馈',
      content: `客户对订单 ${orderId} 提交了反馈`,
      reference_id: feedback.id
    });

  return NextResponse.json({
    success: true,
    data: feedback,
    message: '反馈已提交'
  });
}

/**
 * 确认收货
 */
async function confirmShipment(client: any, customerId: string, data: any) {
  const { shipmentId, confirmed, notes } = data;

  const { error } = await client
    .from('shipments')
    .update({
      customer_confirmed: confirmed,
      customer_confirmed_at: new Date().toISOString(),
      customer_notes: notes
    })
    .eq('id', shipmentId);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    message: confirmed ? '已确认收货' : '已提交问题'
  });
}

/**
 * 请求更新
 */
async function requestUpdate(client: any, customerId: string, data: any) {
  const { orderId, requestType, message } = data;

  const { data: request, error } = await client
    .from('customer_requests')
    .insert({
      customer_id: customerId,
      order_id: orderId,
      request_type: requestType,
      message,
      status: 'pending',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: request,
    message: '请求已提交'
  });
}

/**
 * 记录下载
 */
async function logDownload(client: any, customerId: string, data: any) {
  const { documentId } = data;

  await client
    .from('document_downloads')
    .insert({
      customer_id: customerId,
      document_id: documentId,
      downloaded_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true
  });
}

/**
 * 更新客户档案
 */
async function updateCustomerProfile(client: any, customerId: string, data: any) {
  const { contactPerson, contactPhone, contactEmail, address, notificationPreferences } = data;

  // 更新基本信息
  await client
    .from('customers')
    .update({
      contact_person: contactPerson,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      address,
      updated_at: new Date().toISOString()
    })
    .eq('id', customerId);

  // 更新设置
  if (notificationPreferences) {
    await client
      .from('customer_settings')
      .upsert({
        customer_id: customerId,
        notification_preferences: notificationPreferences
      });
  }

  return NextResponse.json({
    success: true,
    message: '档案已更新'
  });
}

// 辅助函数
async function validateCustomerAuth(client: any, authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;

  // 从header提取token
  const token = authHeader.replace('Bearer ', '');

  // 验证token
  const { data: session } = await client
    .from('customer_sessions')
    .select('customer_id, expires_at')
    .eq('token', token)
    .single();

  if (!session) return null;

  // 检查是否过期
  if (new Date(session.expires_at) < new Date()) {
    return null;
  }

  return session.customer_id;
}

function calculateEstimatedCompletion(order: any, processProgress: any[]): Date | null {
  if (order.status === 'completed') return null;
  if (!processProgress || processProgress.length === 0) return null;

  // 简单估算：根据当前进度推算
  const remainingProgress = 100 - order.progress;
  const avgDailyProgress = 10; // 假设每天10%
  const remainingDays = Math.ceil(remainingProgress / avgDailyProgress);

  const estimated = new Date();
  estimated.setDate(estimated.getDate() + remainingDays);

  return estimated;
}

async function buildOrderTimeline(client: any, orderId: string): Promise<any[]> {
  const timeline: any[] = [];

  // 获取订单创建
  const { data: order } = await client
    .from('production_orders')
    .select('created_at, actual_start_date')
    .eq('id', orderId)
    .single();

  if (order) {
    timeline.push({
      date: order.created_at,
      event: 'order_created',
      description: '订单创建'
    });

    if (order.actual_start_date) {
      timeline.push({
        date: order.actual_start_date,
        event: 'production_started',
        description: '开始生产'
      });
    }
  }

  // 获取出货记录
  const { data: shipments } = await client
    .from('shipments')
    .select('shipped_at, shipment_no')
    .eq('order_id', orderId)
    .eq('status', 'shipped');

  shipments?.forEach((s: any) => {
    timeline.push({
      date: s.shipped_at,
      event: 'shipped',
      description: `出货 ${s.shipment_no}`
    });
  });

  // 按时间排序
  return timeline.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}
