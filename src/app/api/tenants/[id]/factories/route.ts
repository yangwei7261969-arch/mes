import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 租户工厂管理 API
 */

// GET: 获取租户下的工厂列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;
    const client = getSupabaseClient();
    
    const { data: factories, error } = await client
      .from('factories')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch factories:', error);
      return NextResponse.json({ 
        success: false, 
        error: '获取工厂列表失败' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: factories || [] 
    });
  } catch (error) {
    console.error('Get factories error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}

// POST: 创建工厂
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;
    const body = await request.json();
    const { name, code, location, capacity, contact_person, phone } = body;

    if (!name || !code) {
      return NextResponse.json({ 
        success: false, 
        error: '工厂名称和编码必填' 
      }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 检查编码是否已存在
    const { data: existingFactory } = await client
      .from('factories')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', code)
      .single();

    if (existingFactory) {
      return NextResponse.json({ 
        success: false, 
        error: '工厂编码已存在' 
      }, { status: 400 });
    }

    // 创建工厂
    const { data: factory, error } = await client
      .from('factories')
      .insert({
        tenant_id: tenantId,
        name,
        code,
        location,
        capacity,
        contact_person,
        phone,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create factory:', error);
      return NextResponse.json({ 
        success: false, 
        error: '创建工厂失败' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: factory 
    });
  } catch (error) {
    console.error('Create factory error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
