import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 记录操作日志
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('operation_logs')
      .insert({
        user_id: body.user_id,
        user_name: body.user_name,
        module: body.module,
        action: body.action,
        resource_type: body.resource_type,
        resource_id: body.resource_id,
        resource_name: body.resource_name,
        old_data: body.old_data,
        new_data: body.new_data,
        ip_address: body.ip_address,
        user_agent: body.user_agent,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Create operation log error:', error);
    return NextResponse.json({ error: '记录日志失败' }, { status: 500 });
  }
}

// 查询操作日志
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const module = searchParams.get('module');
    const resourceType = searchParams.get('resource_type');
    const resourceId = searchParams.get('resource_id');
    const userId = searchParams.get('user_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '50');
    
    const client = getSupabaseClient();

    let query = client
      .from('operation_logs')
      .select('*', { count: 'exact' });

    if (module) query = query.eq('module', module);
    if (resourceType) query = query.eq('resource_type', resourceType);
    if (resourceId) query = query.eq('resource_id', resourceId);
    if (userId) query = query.eq('user_id', userId);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      pagination: {
        page,
        page_size: pageSize,
        total: count,
        total_pages: Math.ceil((count || 0) / pageSize),
      }
    });
  } catch (error) {
    console.error('Get operation logs error:', error);
    return NextResponse.json({ error: '获取日志失败' }, { status: 500 });
  }
}
