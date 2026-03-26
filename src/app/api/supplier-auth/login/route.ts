import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import bcrypt from 'bcryptjs';

// 供应商登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json({ error: '请输入手机号和密码' }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 查找供应商
    const { data: supplier, error } = await client
      .from('suppliers')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !supplier) {
      return NextResponse.json({ error: '手机号未注册' }, { status: 400 });
    }

    // 检查审核状态
    if (supplier.status === 'pending') {
      return NextResponse.json({ error: '账号待审核，请等待管理员审核通过' }, { status: 400 });
    }

    if (supplier.status === 'rejected') {
      return NextResponse.json({ error: '账号审核未通过，请联系管理员' }, { status: 400 });
    }

    // 验证密码
    if (!supplier.password_hash) {
      return NextResponse.json({ error: '账号异常，请联系管理员' }, { status: 400 });
    }

    const isValid = await bcrypt.compare(password, supplier.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: '密码错误' }, { status: 400 });
    }

    // 返回供应商信息（不包含密码）
    const { password_hash, ...supplierInfo } = supplier;

    return NextResponse.json({
      success: true,
      data: {
        supplier: supplierInfo,
      },
    });
  } catch (error) {
    console.error('Supplier login error:', error);
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
  }
}
