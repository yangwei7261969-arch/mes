import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import bcrypt from 'bcryptjs';

// 供应商注册
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    // 检查手机号是否已注册
    const { data: existing } = await client
      .from('suppliers')
      .select('id')
      .eq('phone', body.phone)
      .single();

    if (existing) {
      return NextResponse.json({ error: '该手机号已注册' }, { status: 400 });
    }

    // 生成供应商编码
    const { data: existingCodes } = await client
      .from('suppliers')
      .select('code')
      .order('code', { ascending: false })
      .limit(1);

    let newCode = 'S001';
    if (existingCodes && existingCodes.length > 0) {
      const lastCode = existingCodes[0].code;
      const num = parseInt(lastCode.replace(/\D/g, '')) + 1;
      newCode = `S${String(num).padStart(3, '0')}`;
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(body.password, 10);

    const { data, error } = await client
      .from('suppliers')
      .insert({
        code: newCode,
        name: body.name,
        short_name: body.short_name || null,
        type: body.type,
        category: body.category || null,
        contact: body.contact,
        phone: body.phone,
        email: body.email || null,
        address: body.address || null,
        tax_no: body.tax_no || null,
        bank_name: body.bank_name || null,
        bank_account: body.bank_account || null,
        password_hash: passwordHash,
        notes: body.notes || null,
        is_active: true,
        status: 'pending', // 待审核
        is_verified: false,
        balance: 0,
        rating: 5,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Create supplier error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        id: data.id,
        code: data.code,
        name: data.name,
      }
    });
  } catch (error) {
    console.error('Register supplier error:', error);
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
  }
}
