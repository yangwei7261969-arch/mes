import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 模板系统API
 * 
 * 隐藏赚钱点：
 * • 工艺单模板
 * • BOM模板
 * • 尺寸模板
 * 
 * 价值：快速复制客户，提升效率
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await getTemplates(client, searchParams);
      case 'detail':
        return await getTemplateDetail(client, searchParams.get('id'));
      case 'tech-pack':
        return await getTechPackTemplates(client, searchParams);
      case 'bom':
        return await getBOMTemplates(client, searchParams);
      case 'size':
        return await getSizeTemplates(client, searchParams);
      case 'process':
        return await getProcessTemplates(client, searchParams);
      case 'apply':
        return await applyTemplate(client, searchParams);
      case 'preview':
        return await previewTemplate(client, searchParams);
      default:
        return await getTemplates(client, searchParams);
    }
  } catch (error) {
    console.error('Template error:', error);
    return NextResponse.json({ success: false, error: '获取模板失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { action, data } = body;

    switch (action) {
      case 'create':
        return await createTemplate(client, data);
      case 'update':
        return await updateTemplate(client, data);
      case 'duplicate':
        return await duplicateTemplate(client, data);
      case 'delete':
        return await deleteTemplate(client, data);
      case 'apply-to-order':
        return await applyTemplateToOrder(client, data);
      case 'create-from-order':
        return await createTemplateFromOrder(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Template operation error:', error);
    return NextResponse.json({ success: false, error: '模板操作失败' }, { status: 500 });
  }
}

/**
 * 获取模板列表
 */
async function getTemplates(client: any, searchParams: URLSearchParams) {
  const type = searchParams.get('type') || 'all';
  const category = searchParams.get('category');
  const keyword = searchParams.get('keyword');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '20');

  let query = client
    .from('templates')
    .select(`
      id,
      template_code,
      template_name,
      template_type,
      category,
      description,
      usage_count,
      is_public,
      created_at,
      updated_at,
      creator:users (name)
    `)
    .order('usage_count', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (type !== 'all') {
    query = query.eq('template_type', type);
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (keyword) {
    query = query.or(`template_name.ilike.%${keyword}%,template_code.ilike.%${keyword}%`);
  }

  const { data: templates, error, count } = await query;

  // 如果表不存在，返回空数据
  if (error) {
    if (error.message?.includes('Could not find') || error.code === '42P01') {
      return NextResponse.json({
        success: true,
        data: {
          templates: [],
          pagination: {
            page,
            pageSize,
            total: 0
          }
        }
      });
    }
    throw error;
  }

  return NextResponse.json({
    success: true,
    data: {
      templates,
      pagination: {
        page,
        pageSize,
        total: count || 0
      }
    }
  });
}

/**
 * 获取模板详情
 */
async function getTemplateDetail(client: any, templateId: string | null) {
  if (!templateId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少模板ID' 
    }, { status: 400 });
  }

  const { data: template, error } = await client
    .from('templates')
    .select(`
      *,
      template_items (
        id,
        item_type,
        item_data,
        sequence
      ),
      creator:users (name)
    `)
    .eq('id', templateId)
    .single();

  if (error) throw error;

  if (!template) {
    return NextResponse.json({ 
      success: false, 
      error: '模板不存在' 
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: template
  });
}

/**
 * 创建模板
 */
async function createTemplate(client: any, data: any) {
  const {
    templateName,
    templateType, // 'tech_pack' | 'bom' | 'size' | 'process'
    category,
    description,
    items,
    isPublic,
    createdBy
  } = data;

  // 生成模板编号
  const templateCode = `TPL${Date.now().toString(36).toUpperCase()}`;

  const { data: template, error } = await client
    .from('templates')
    .insert({
      template_code: templateCode,
      template_name: templateName,
      template_type: templateType,
      category,
      description,
      is_public: isPublic || false,
      usage_count: 0,
      created_by: createdBy,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // 保存模板项目
  if (items && items.length > 0) {
    await client
      .from('template_items')
      .insert(items.map((item: any, index: number) => ({
        template_id: template.id,
        item_type: item.itemType,
        item_data: item.itemData,
        sequence: index + 1
      })));
  }

  return NextResponse.json({
    success: true,
    data: template,
    message: '模板已创建'
  });
}

/**
 * 工艺单模板
 */
async function getTechPackTemplates(client: any, searchParams: URLSearchParams) {
  const category = searchParams.get('category');

  let query = client
    .from('tech_pack_templates')
    .select(`
      id,
      template_code,
      template_name,
      category,
      season,
      description,
      usage_count,
      created_at,
      template_preview_image
    `)
    .eq('is_active', true)
    .order('usage_count', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data: templates, error } = await query;

  if (error) throw error;

  // 分类统计
  const categories = [...new Set(templates?.map((t: any) => t.category) || [])];

  return NextResponse.json({
    success: true,
    data: {
      templates,
      categories,
      total: templates?.length || 0
    }
  });
}

/**
 * BOM模板
 */
async function getBOMTemplates(client: any, searchParams: URLSearchParams) {
  const category = searchParams.get('category');

  let query = client
    .from('bom_templates')
    .select(`
      id,
      template_code,
      template_name,
      category,
      style_type,
      description,
      usage_count,
      created_at,
      bom_template_items (
        id,
        material_type,
        material_name,
        default_quantity,
        unit,
        notes
      )
    `)
    .eq('is_active', true)
    .order('usage_count', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data: templates, error } = await query;

  if (error) throw error;

  // 按风格类型分组
  const byStyleType: Record<string, any[]> = {};
  templates?.forEach((t: any) => {
    const type = t.style_type || '通用';
    if (!byStyleType[type]) {
      byStyleType[type] = [];
    }
    byStyleType[type].push(t);
  });

  return NextResponse.json({
    success: true,
    data: {
      templates,
      byStyleType,
      total: templates?.length || 0
    }
  });
}

/**
 * 尺寸模板
 */
async function getSizeTemplates(client: any, searchParams: URLSearchParams) {
  const category = searchParams.get('category');

  let query = client
    .from('size_templates')
    .select(`
      id,
      template_code,
      template_name,
      category,
      size_range,
      description,
      usage_count,
      created_at,
      size_template_measurements (
        measurement_name,
        tolerance,
        sizes
      )
    `)
    .eq('is_active', true)
    .order('usage_count', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data: templates, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: {
      templates,
      total: templates?.length || 0
    }
  });
}

/**
 * 工序模板
 */
async function getProcessTemplates(client: any, searchParams: URLSearchParams) {
  const category = searchParams.get('category');

  let query = client
    .from('process_templates')
    .select(`
      id,
      template_code,
      template_name,
      category,
      total_smv,
      process_count,
      description,
      usage_count,
      created_at,
      process_template_items (
        sequence,
        process_id,
        process_name,
        standard_time,
        machine_type,
        skill_level
      )
    `)
    .eq('is_active', true)
    .order('usage_count', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data: templates, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: {
      templates,
      total: templates?.length || 0
    }
  });
}

/**
 * 应用模板到订单
 */
async function applyTemplateToOrder(client: any, data: any) {
  const { templateId, templateType, orderId, overrides, appliedBy } = data;

  // 获取模板
  const { data: template } = await client
    .from('templates')
    .select('*, template_items (*)')
    .eq('id', templateId)
    .single();

  if (!template) {
    return NextResponse.json({ 
      success: false, 
      error: '模板不存在' 
    }, { status: 404 });
  }

  let result: any = {};

  if (templateType === 'tech_pack') {
    result = await applyTechPackTemplate(client, orderId, template, overrides);
  } else if (templateType === 'bom') {
    result = await applyBOMTemplate(client, orderId, template, overrides);
  } else if (templateType === 'size') {
    result = await applySizeTemplate(client, orderId, template, overrides);
  } else if (templateType === 'process') {
    result = await applyProcessTemplate(client, orderId, template, overrides);
  }

  // 更新模板使用次数
  await client
    .from('templates')
    .update({
      usage_count: (template.usage_count || 0) + 1,
      last_used_at: new Date().toISOString()
    })
    .eq('id', templateId);

  // 记录使用日志
  await client
    .from('template_usage_logs')
    .insert({
      template_id: templateId,
      order_id: orderId,
      applied_by: appliedBy,
      applied_at: new Date().toISOString(),
      overrides
    });

  return NextResponse.json({
    success: true,
    data: result,
    message: '模板已应用'
  });
}

/**
 * 从订单创建模板
 */
async function createTemplateFromOrder(client: any, data: any) {
  const { orderId, templateName, templateType, createdBy } = data;

  // 获取订单数据
  const { data: order } = await client
    .from('production_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ 
      success: false, 
      error: '订单不存在' 
    }, { status: 404 });
  }

  let template: any = null;

  if (templateType === 'bom') {
    // 从订单BOM创建模板
    const { data: bomItems } = await client
      .from('order_bom')
      .select('*')
      .eq('order_id', orderId);

    template = await createBOMTemplateFromBOM(client, templateName, bomItems, createdBy);
  } else if (templateType === 'process') {
    // 从订单工序创建模板
    const { data: processes } = await client
      .from('order_processes')
      .select('*')
      .eq('order_id', orderId);

    template = await createProcessTemplateFromProcesses(client, templateName, processes, createdBy);
  } else if (templateType === 'size') {
    // 从尺寸表创建模板
    const { data: sizeChart } = await client
      .from('order_size_chart')
      .select('*')
      .eq('order_id', orderId);

    template = await createSizeTemplateFromChart(client, templateName, sizeChart, createdBy);
  }

  return NextResponse.json({
    success: true,
    data: template,
    message: '模板已从订单创建'
  });
}

/**
 * 预览模板
 */
async function previewTemplate(client: any, searchParams: URLSearchParams) {
  const templateId = searchParams.get('id');

  if (!templateId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少模板ID' 
    }, { status: 400 });
  }

  const { data: template } = await client
    .from('templates')
    .select('*, template_items (*)')
    .eq('id', templateId)
    .single();

  if (!template) {
    return NextResponse.json({ 
      success: false, 
      error: '模板不存在' 
    }, { status: 404 });
  }

  // 生成预览数据
  const preview = {
    templateInfo: {
      code: template.template_code,
      name: template.template_name,
      type: template.template_type,
      usageCount: template.usage_count
    },
    items: template.template_items?.map((item: any) => ({
      type: item.item_type,
      data: item.item_data
    })),
    estimatedValues: calculateEstimatedValues(template)
  };

  return NextResponse.json({
    success: true,
    data: preview
  });
}

/**
 * 复制模板
 */
async function duplicateTemplate(client: any, data: any) {
  const { templateId, newName, createdBy } = data;

  const { data: original } = await client
    .from('templates')
    .select('*, template_items (*)')
    .eq('id', templateId)
    .single();

  if (!original) {
    return NextResponse.json({ 
      success: false, 
      error: '模板不存在' 
    }, { status: 404 });
  }

  // 创建新模板
  const templateCode = `TPL${Date.now().toString(36).toUpperCase()}`;

  const { data: newTemplate, error } = await client
    .from('templates')
    .insert({
      template_code: templateCode,
      template_name: newName || `${original.template_name} (副本)`,
      template_type: original.template_type,
      category: original.category,
      description: original.description,
      is_public: false,
      usage_count: 0,
      created_by: createdBy,
      parent_id: templateId,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // 复制模板项目
  if (original.template_items && original.template_items.length > 0) {
    await client
      .from('template_items')
      .insert(original.template_items.map((item: any) => ({
        template_id: newTemplate.id,
        item_type: item.item_type,
        item_data: item.item_data,
        sequence: item.sequence
      })));
  }

  return NextResponse.json({
    success: true,
    data: newTemplate,
    message: '模板已复制'
  });
}

/**
 * 更新模板
 */
async function updateTemplate(client: any, data: any) {
  const { templateId, updates, items } = data;

  // 更新基本信息
  const { data: template, error } = await client
    .from('templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;

  // 更新模板项目
  if (items) {
    // 先删除旧项目
    await client
      .from('template_items')
      .delete()
      .eq('template_id', templateId);

    // 插入新项目
    if (items.length > 0) {
      await client
        .from('template_items')
        .insert(items.map((item: any, index: number) => ({
          template_id: templateId,
          item_type: item.itemType,
          item_data: item.itemData,
          sequence: index + 1
        })));
    }
  }

  return NextResponse.json({
    success: true,
    data: template,
    message: '模板已更新'
  });
}

/**
 * 删除模板
 */
async function deleteTemplate(client: any, data: any) {
  const { templateId } = data;

  // 软删除
  const { error } = await client
    .from('templates')
    .update({
      is_active: false,
      deleted_at: new Date().toISOString()
    })
    .eq('id', templateId);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    message: '模板已删除'
  });
}

// 辅助函数
async function applyTechPackTemplate(client: any, orderId: string, template: any, overrides: any) {
  // 应用工艺单模板逻辑
  const items = template.template_items || [];
  
  // 创建工艺单...
  return { appliedItems: items.length };
}

async function applyBOMTemplate(client: any, orderId: string, template: any, overrides: any) {
  const items = template.template_items || [];
  
  // 创建BOM
  const bomItems = items.map((item: any) => ({
    order_id: orderId,
    material_type: item.item_data.materialType,
    material_name: item.item_data.materialName,
    quantity: item.item_data.defaultQuantity * (overrides?.quantity || 1),
    unit: item.item_data.unit
  }));

  if (bomItems.length > 0) {
    await client
      .from('order_bom')
      .insert(bomItems);
  }

  return { appliedItems: bomItems.length };
}

async function applySizeTemplate(client: any, orderId: string, template: any, overrides: any) {
  const items = template.template_items || [];
  
  // 创建尺寸表
  const sizeItems = items.map((item: any) => ({
    order_id: orderId,
    measurement_name: item.item_data.measurementName,
    sizes: item.item_data.sizes,
    tolerance: item.item_data.tolerance
  }));

  if (sizeItems.length > 0) {
    await client
      .from('order_size_chart')
      .insert(sizeItems);
  }

  return { appliedItems: sizeItems.length };
}

async function applyProcessTemplate(client: any, orderId: string, template: any, overrides: any) {
  const items = template.template_items || [];
  
  // 创建工序
  const processItems = items.map((item: any, index: number) => ({
    order_id: orderId,
    process_id: item.item_data.processId,
    process_name: item.item_data.processName,
    sequence: index + 1,
    standard_time: item.item_data.standardTime
  }));

  if (processItems.length > 0) {
    await client
      .from('order_processes')
      .insert(processItems);
  }

  return { appliedItems: processItems.length };
}

async function createBOMTemplateFromBOM(client: any, name: string, bomItems: any[], createdBy: string) {
  const templateCode = `BOM${Date.now().toString(36).toUpperCase()}`;

  const { data: template } = await client
    .from('bom_templates')
    .insert({
      template_code: templateCode,
      template_name: name,
      category: 'custom',
      created_by: createdBy,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (bomItems && bomItems.length > 0) {
    await client
      .from('bom_template_items')
      .insert(bomItems.map(item => ({
        template_id: template.id,
        material_type: item.material_type,
        material_name: item.material_name,
        default_quantity: item.quantity,
        unit: item.unit
      })));
  }

  return template;
}

async function createProcessTemplateFromProcesses(client: any, name: string, processes: any[], createdBy: string) {
  const templateCode = `PRC${Date.now().toString(36).toUpperCase()}`;
  const totalSMV = processes?.reduce((sum, p) => sum + (p.standard_time || 0), 0) || 0;

  const { data: template } = await client
    .from('process_templates')
    .insert({
      template_code: templateCode,
      template_name: name,
      category: 'custom',
      total_smv: totalSMV,
      process_count: processes?.length || 0,
      created_by: createdBy,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (processes && processes.length > 0) {
    await client
      .from('process_template_items')
      .insert(processes.map((p, index) => ({
        template_id: template.id,
        sequence: index + 1,
        process_id: p.process_id,
        process_name: p.process_name,
        standard_time: p.standard_time
      })));
  }

  return template;
}

async function createSizeTemplateFromChart(client: any, name: string, sizeChart: any[], createdBy: string) {
  const templateCode = `SIZE${Date.now().toString(36).toUpperCase()}`;

  const sizes = [...new Set(sizeChart?.map((s: any) => s.size_name) || [])];

  const { data: template } = await client
    .from('size_templates')
    .insert({
      template_code: templateCode,
      template_name: name,
      category: 'custom',
      size_range: sizes.join(', '),
      created_by: createdBy,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (sizeChart && sizeChart.length > 0) {
    // 按测量项分组
    const measurements: Record<string, any> = {};
    sizeChart.forEach((s: any) => {
      if (!measurements[s.measurement_name]) {
        measurements[s.measurement_name] = {
          measurement_name: s.measurement_name,
          tolerance: s.tolerance,
          sizes: {}
        };
      }
      measurements[s.measurement_name].sizes[s.size_name] = s.measurement_value;
    });

    await client
      .from('size_template_measurements')
      .insert(Object.values(measurements).map((m: any) => ({
        template_id: template.id,
        measurement_name: m.measurement_name,
        tolerance: m.tolerance,
        sizes: m.sizes
      })));
  }

  return template;
}

function calculateEstimatedValues(template: any): any {
  const items: any[] = template.template_items || [];

  switch (template.template_type) {
    case 'bom':
      return {
        totalItems: items.length,
        estimatedCost: items.reduce((sum: number, item: any) => sum + (item.item_data?.estimatedCost || 0), 0)
      };
    case 'process':
      return {
        totalProcesses: items.length,
        totalSMV: items.reduce((sum: number, item: any) => sum + (item.item_data?.standardTime || 0), 0)
      };
    default:
      return { totalItems: items.length };
  }
}

async function applyTemplate(client: any, searchParams: URLSearchParams) {
  const templateId = searchParams.get('id');
  const orderId = searchParams.get('order_id');

  if (!templateId || !orderId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少模板ID或订单ID' 
    }, { status: 400 });
  }

  // 预览应用效果
  const { data: template } = await client
    .from('templates')
    .select('*, template_items (*)')
    .eq('id', templateId)
    .single();

  return NextResponse.json({
    success: true,
    data: {
      template,
      orderId,
      preview: true
    }
  });
}
