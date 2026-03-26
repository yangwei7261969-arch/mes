import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 供应商登录
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { code, phone } = body;

    if (!code || !phone) {
      return NextResponse.json(
        { success: false, error: '请填写供应商编码和联系电话' },
        { status: 400 }
      );
    }

    // 查询供应商
    const { data: supplier, error } = await client
      .from('suppliers')
      .select('id, code, name, contact, phone, level, status')
      .eq('code', code)
      .eq('phone', phone)
      .single();

    if (error || !supplier) {
      return NextResponse.json(
        { success: false, error: '供应商编码或联系电话错误' },
        { status: 401 }
      );
    }

    if (supplier.status !== 'approved' && supplier.status !== 'active') {
      return NextResponse.json(
        { success: false, error: '供应商账户未审核或已停用' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error('Supplier login error:', error);
    return NextResponse.json(
      { success: false, error: '登录失败' },
      { status: 500 }
    );
  }
}
