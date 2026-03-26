import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取公告列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let query = client
      .from('announcements')
      .select('*', { count: 'exact' });

    if (activeOnly) {
      query = query
        .eq('is_active', true)
        .lte('publish_date', new Date().toISOString().split('T')[0]);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    // 如果表不存在或列不存在，返回空数据
    if (error) {
      if (error.message?.includes('Could not find') || 
          error.message?.includes('does not exist') || 
          error.code === '42P01') {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          page,
          pageSize,
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      total: count,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    return NextResponse.json({ error: '获取公告失败' }, { status: 500 });
  }
}

// 创建公告
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { title, content, type, priority, publish_date, expire_date, created_by } = body;

    if (!title || !content) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const id = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { data, error } = await client
      .from('announcements')
      .insert({
        id,
        title,
        content,
        type: type || 'notice',
        priority: priority || 0,
        is_active: true,
        publish_date: publish_date || new Date().toISOString().split('T')[0],
        expire_date,
        created_by,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, message: '公告发布成功' });
  } catch (error) {
    console.error('Create announcement error:', error);
    return NextResponse.json({ error: '发布公告失败' }, { status: 500 });
  }
}

// 更新公告
export async function PUT(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { id, title, content, type, priority, is_active, expire_date } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少公告ID' }, { status: 400 });
    }

    const { error } = await client
      .from('announcements')
      .update({
        title,
        content,
        type,
        priority,
        is_active,
        expire_date,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '公告更新成功' });
  } catch (error) {
    console.error('Update announcement error:', error);
    return NextResponse.json({ error: '更新公告失败' }, { status: 500 });
  }
}

// 删除公告
export async function DELETE(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少公告ID' }, { status: 400 });
    }

    const { error } = await client
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '公告删除成功' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    return NextResponse.json({ error: '删除公告失败' }, { status: 500 });
  }
}
