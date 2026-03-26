import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 生成异常单号
function generateExceptionNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EX${dateStr}${random}`;
}

// 创建异常
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const {
      exception_type_code,
      severity,
      order_id,
      style_id,
      process_id,
      bundle_id,
      employee_id,
      equipment_id,
      title,
      description,
      source = 'manual',
      actual_value,
      expected_value,
      handler_id,
      handler_name,
    } = body;

    // 获取异常类型
    const { data: exceptionType, error: typeError } = await client
      .from('exception_types')
      .select('*')
      .eq('code', exception_type_code)
      .single();

    if (typeError || !exceptionType) {
      return NextResponse.json({ success: false, error: '异常类型不存在' }, { status: 400 });
    }

    // 计算偏差
    let deviation_value = null;
    let deviation_rate = null;
    if (actual_value !== undefined && expected_value !== undefined && expected_value !== 0) {
      deviation_value = actual_value - expected_value;
      deviation_rate = (deviation_value / expected_value) * 100;
    }

    // 计算截止时间
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + (exceptionType.deadline_hours || 24));

    // 确定处理人
    let finalHandlerId = handler_id;
    let finalHandlerName = handler_name;
    let finalHandlerType = 'employee';

    if (!finalHandlerId && exceptionType.default_handler_id) {
      finalHandlerId = exceptionType.default_handler_id;
      finalHandlerType = exceptionType.default_handler_type || 'employee';

      // 获取处理人名称
      if (finalHandlerType === 'employee') {
        const { data: emp } = await client
          .from('employees')
          .select('name')
          .eq('id', finalHandlerId)
          .single();
        finalHandlerName = emp?.name;
      } else if (finalHandlerType === 'role') {
        const { data: role } = await client
          .from('roles')
          .select('display_name')
          .eq('id', finalHandlerId)
          .single();
        finalHandlerName = role?.display_name;
      }
    }

    // 创建异常单
    const exceptionNo = generateExceptionNo();
    const exceptionRecord = {
      id: `ex_${Date.now()}`,
      exception_no: exceptionNo,
      exception_type_id: exceptionType.id,
      exception_type_code: exceptionType.code,
      exception_type_name: exceptionType.name,
      severity: severity || exceptionType.severity,
      priority: calculatePriority(severity || exceptionType.severity),
      order_id,
      style_id,
      process_id,
      bundle_id,
      employee_id,
      equipment_id,
      title,
      description,
      source,
      actual_value,
      expected_value,
      deviation_value,
      deviation_rate,
      status: 'open',
      handler_type: finalHandlerType,
      handler_id: finalHandlerId,
      handler_name: finalHandlerName,
      assigned_at: finalHandlerId ? new Date().toISOString() : null,
      deadline: deadline.toISOString(),
      created_by: body.created_by || 'system',
    };

    const { data: exception, error: insertError } = await client
      .from('exceptions')
      .insert(exceptionRecord)
      .select()
      .single();

    if (insertError) {
      console.error('Create exception error:', insertError);
      return NextResponse.json({ success: false, error: '创建异常失败' }, { status: 500 });
    }

    // 创建处理记录
    await client.from('exception_records').insert({
      id: `er_${Date.now()}`,
      exception_id: exception.id,
      action: 'create',
      new_status: 'open',
      operator_id: body.created_by || 'system',
      operator_name: body.creator_name || '系统',
      content: `创建异常: ${title}`,
    });

    // 发送通知（如果配置了）
    if (finalHandlerId) {
      // TODO: 发送通知给处理人
      console.log(`Notify handler: ${finalHandlerName} (${finalHandlerId})`);
    }

    return NextResponse.json({
      success: true,
      data: exception,
      message: '异常已创建并指派处理人',
    });
  } catch (error) {
    console.error('Create exception error:', error);
    return NextResponse.json({ success: false, error: '创建失败' }, { status: 500 });
  }
}

// 获取异常列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const handler_id = searchParams.get('handler_id');
    const severity = searchParams.get('severity');
    const order_id = searchParams.get('order_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = client
      .from('exceptions')
      .select(`
        *,
        production_orders(order_code, style_id, styles(style_code, style_name)),
        processes(name),
        employees(name, code)
      `)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    // 应用过滤条件
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('exception_type_code', type);
    }
    if (handler_id) {
      query = query.eq('handler_id', handler_id);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }
    if (order_id) {
      query = query.eq('order_id', order_id);
    }
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    // 分页
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Query exceptions error:', error);
      return NextResponse.json({ 
        success: false, 
        error: '查询失败', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      }, { status: 500 });
    }

    // 格式化数据
    const formattedData = (data || []).map((item: any) => ({
      ...item,
      order_code: item.production_orders?.order_code,
      style_name: item.production_orders?.styles?.style_name,
      process_name: item.processes?.name,
      employee_name: item.employees?.name,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        page,
        limit,
        total: count,
      },
    });
  } catch (error) {
    console.error('Get exceptions error:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// 计算优先级
function calculatePriority(severity: string): number {
  switch (severity) {
    case 'emergency':
      return 100;
    case 'critical':
      return 80;
    case 'warning':
      return 50;
    case 'info':
      return 20;
    default:
      return 30;
  }
}
