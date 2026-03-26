import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 供应商审核
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, reject_reason } = body;
    
    if (!id || !action) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const client = getSupabaseClient();

    if (action === 'approve') {
      // 审核通过
      const { error } = await client
        .from('suppliers')
        .update({
          status: 'approved',
          is_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '审核通过' });
    } 
    else if (action === 'reject') {
      // 拒绝
      if (!reject_reason) {
        return NextResponse.json({ error: '请填写拒绝原因' }, { status: 400 });
      }

      const { error } = await client
        .from('suppliers')
        .update({
          status: 'rejected',
          reject_reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '已拒绝' });
    }
    else {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Audit supplier error:', error);
    return NextResponse.json({ error: '审核失败' }, { status: 500 });
  }
}
