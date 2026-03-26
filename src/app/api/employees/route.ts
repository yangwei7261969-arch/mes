import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取员工列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const client = getSupabaseClient();
    
    let query = client
      .from('employees')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (department && department !== 'all') {
      query = query.eq('department', department);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`employee_no.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
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
    console.error('Get employees error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 创建员工
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    // 生成员工编号
    const { data: lastEmployee } = await client
      .from('employees')
      .select('employee_no')
      .order('employee_no', { ascending: false })
      .limit(1);

    let employeeNo = 'EMP001';
    if (lastEmployee && lastEmployee.length > 0) {
      const lastNo = parseInt(lastEmployee[0].employee_no.replace('EMP', ''));
      employeeNo = `EMP${String(lastNo + 1).padStart(3, '0')}`;
    }

    const { data, error } = await client
      .from('employees')
      .insert({ ...body, employee_no: employeeNo })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
