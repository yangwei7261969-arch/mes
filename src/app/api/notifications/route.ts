import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取通知列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const type = searchParams.get('type');
    const unreadOnly = searchParams.get('unread') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let query = client
      .from('notifications')
      .select('*', { count: 'exact' });

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取未读数量
    let unreadCount = 0;
    if (userId) {
      const { count: uc } = await client
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      unreadCount = uc || 0;
    }

    return NextResponse.json({
      success: true,
      data,
      total: count,
      unreadCount,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ error: '获取通知失败' }, { status: 500 });
  }
}

// 创建通知
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { user_id, type, title, content, link } = body;

    if (!user_id || !type || !title) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { data, error } = await client
      .from('notifications')
      .insert({
        id,
        user_id,
        type,
        title,
        content,
        link,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json({ error: '创建通知失败' }, { status: 500 });
  }
}

// 标记已读
export async function PUT(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { id, user_id, mark_all } = body;

    if (mark_all && user_id) {
      // 标记所有为已读
      const { error } = await client
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user_id)
        .eq('is_read', false);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else if (id) {
      // 标记单条为已读
      const { error } = await client
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: '已标记为已读' });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// 删除通知
export async function DELETE(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('user_id');

    if (!id) {
      return NextResponse.json({ error: '缺少通知ID' }, { status: 400 });
    }

    const query = client.from('notifications').delete().eq('id', id);
    if (userId) {
      query.eq('user_id', userId);
    }

    const { error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '通知已删除' });
  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
