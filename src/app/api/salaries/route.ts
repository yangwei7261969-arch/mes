import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取工资列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get('month'); // 格式: "2025-01"
    const status = searchParams.get('status');

    const client = getSupabaseClient();
    
    let query = client
      .from('salaries')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 解析月份字符串 (格式: "2025-01")
    if (monthStr) {
      const [year, month] = monthStr.split('-').map(Number);
      query = query.eq('year', year).eq('month', month);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取员工信息
    let employees: Record<string, any> = {};
    if (data && data.length > 0) {
      const employeeIds = [...new Set(data.map(s => s.employee_id))];
      const { data: empData } = await client
        .from('employees')
        .select('id, name, department, position')
        .in('id', employeeIds);
      
      if (empData) {
        empData.forEach(emp => {
          employees[emp.id] = emp;
        });
      }
    }

    // 组装返回数据
    const formattedData = data?.map(item => ({
      ...item,
      total_salary: item.total_amount,
      employees: employees[item.employee_id] || null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      total: count,
    });
  } catch (error) {
    console.error('Get salaries error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 创建工资条
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    // 处理month字段转换
    let salaryData = { ...body };
    if (body.month && typeof body.month === 'string') {
      const [year, month] = body.month.split('-').map(Number);
      salaryData.year = year;
      salaryData.month = month;
      delete salaryData.month;
    }

    // 处理total_salary -> total_amount
    if (body.total_salary) {
      salaryData.total_amount = body.total_salary;
      delete salaryData.total_salary;
    }

    const { data, error } = await client
      .from('salaries')
      .insert(salaryData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Create salary error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
