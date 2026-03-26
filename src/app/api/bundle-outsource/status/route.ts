import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 更新外发状态
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('bundle_outsource')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Update status error:', error);
      return NextResponse.json(
        { success: false, error: '更新状态失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '状态更新成功',
    });
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { success: false, error: '更新状态失败' },
      { status: 500 }
    );
  }
}
