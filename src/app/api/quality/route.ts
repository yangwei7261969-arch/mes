import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 质检系统API
 * 
 * 三级检验体系：
 * • IQC - 来料检验（Incoming Quality Control）
 * • IPQC - 生产巡检（In-Process Quality Control）
 * • OQC - 出货检验（Outgoing Quality Control）
 * 
 * 核心功能：
 * • 每一件记录问题类型、责任工序、责任人
 * • 不良率自动统计
 * • 问题工序TOP排名
 * • 质量趋势分析
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await getInspections(client, searchParams);
      case 'detail':
        return await getInspectionDetail(client, searchParams.get('id'));
      case 'iqc':
        return await getIQCList(client, searchParams);
      case 'ipqc':
        return await getIPQCList(client, searchParams);
      case 'oqc':
        return await getOQCList(client, searchParams);
      case 'statistics':
        return await getQualityStatistics(client, searchParams);
      case 'defect-analysis':
        return await getDefectAnalysis(client, searchParams);
      case 'process-ranking':
        return await getProcessRanking(client, searchParams);
      case 'trend':
        return await getQualityTrend(client, searchParams);
      case 'dashboard':
        return await getQualityDashboard(client);
      default:
        return await getInspections(client, searchParams);
    }
  } catch (error) {
    console.error('Quality inspection error:', error);
    return NextResponse.json({ success: false, error: '获取质检数据失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { action, data } = body;

    switch (action) {
      case 'create-iqc':
        return await createIQC(client, data);
      case 'create-ipqc':
        return await createIPQC(client, data);
      case 'create-oqc':
        return await createOQC(client, data);
      case 'record-defect':
        return await recordDefect(client, data);
      case 'batch-defect':
        return await batchRecordDefects(client, data);
      case 'resolve-defect':
        return await resolveDefect(client, data);
      case 'rework':
        return await createReworkFromDefect(client, data);
      case 'approve':
        return await approveInspection(client, data);
      case 'reject':
        return await rejectInspection(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Quality inspection operation error:', error);
    return NextResponse.json({ success: false, error: '质检操作失败' }, { status: 500 });
  }
}

/**
 * 获取检验列表
 */
async function getInspections(client: any, searchParams: URLSearchParams) {
  const type = searchParams.get('type') || 'all';
  const status = searchParams.get('status') || 'all';
  const orderId = searchParams.get('order_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '20');

  let query = client
    .from('quality_inspections')
    .select('id, inspection_no, inspection_type, inspection_time, result, status, total_quantity, pass_quantity, fail_quantity, pass_rate', { count: 'exact' })
    .order('inspection_time', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (type !== 'all') {
    query = query.eq('inspection_type', type);
  }

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (orderId) {
    query = query.eq('order_id', orderId);
  }

  if (startDate) {
    query = query.gte('inspection_time', `${startDate}T00:00:00Z`);
  }

  if (endDate) {
    query = query.lte('inspection_time', `${endDate}T23:59:59Z`);
  }

  const { data: inspections, error, count } = await query;

  // 如果表不存在或查询错误，返回空数据
  if (error) {
    console.error('Quality inspections query error:', error);
    // 处理表不存在的情况
    if (error.message?.includes('Could not find') || 
        error.code === '42P01' || 
        error.message?.includes('does not exist') ||
        error.message?.includes('relation') ||
        error.code === 'PGRST116') {
      return NextResponse.json({
        success: true,
        data: {
          inspections: [],
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
      inspections,
      pagination: {
        page,
        pageSize,
        total: count || 0
      }
    }
  });
}

/**
 * 获取检验详情
 */
async function getInspectionDetail(client: any, inspectionId: string | null) {
  if (!inspectionId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少检验ID' 
    }, { status: 400 });
  }

  const { data: inspection, error } = await client
    .from('quality_inspections')
    .select(`
      *,
      inspectors (id, name),
      production_orders (
        id,
        order_code,
        total_quantity,
        customers (name)
      ),
      processes (id, process_code, process_name),
      quality_defects (
        id,
        defect_type,
        defect_description,
        quantity,
        severity,
        root_cause,
        responsible_process,
        responsible_person,
        status,
        created_at,
        resolved_at
      )
    `)
    .eq('id', inspectionId)
    .single();

  if (error) throw error;

  if (!inspection) {
    return NextResponse.json({ 
      success: false, 
      error: '检验记录不存在' 
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: inspection
  });
}

/**
 * IQC - 来料检验
 */
async function getIQCList(client: any, searchParams: URLSearchParams) {
  const status = searchParams.get('status') || 'all';
  const supplierId = searchParams.get('supplier_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let query = client
    .from('incoming_inspections')
    .select(`
      id,
      inspection_no,
      inspection_time,
      result,
      status,
      material_name,
      material_code,
      batch_no,
      quantity,
      sample_quantity,
      pass_quantity,
      fail_quantity,
      suppliers (
        id,
        name,
        code
      ),
      inspectors (name)
    `)
    .order('inspection_time', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (supplierId) {
    query = query.eq('supplier_id', supplierId);
  }

  if (startDate) {
    query = query.gte('inspection_time', `${startDate}T00:00:00Z`);
  }

  if (endDate) {
    query = query.lte('inspection_time', `${endDate}T23:59:59Z`);
  }

  const { data: inspections, error } = await query;

  if (error) throw error;

  // 统计
  const total = inspections?.length || 0;
  const passed = inspections?.filter((i: any) => i.result === 'pass').length || 0;
  const failed = inspections?.filter((i: any) => i.result === 'fail').length || 0;

  return NextResponse.json({
    success: true,
    data: {
      inspections,
      summary: {
        total,
        passed,
        failed,
        passRate: total > 0 ? Math.round(passed / total * 100) : 0
      }
    }
  });
}

/**
 * IPQC - 生产巡检
 */
async function getIPQCList(client: any, searchParams: URLSearchParams) {
  const status = searchParams.get('status') || 'all';
  const lineId = searchParams.get('line_id');
  const processId = searchParams.get('process_id');
  const orderId = searchParams.get('order_id');

  let query = client
    .from('in_process_inspections')
    .select(`
      id,
      inspection_no,
      inspection_time,
      result,
      status,
      check_type,
      check_quantity,
      pass_quantity,
      fail_quantity,
      defect_description,
      production_orders (
        id,
        order_code,
        customers (name)
      ),
      processes (
        id,
        process_code,
        process_name
      ),
      production_lines (
        id,
        name
      ),
      inspectors (name)
    `)
    .order('inspection_time', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (lineId) {
    query = query.eq('line_id', lineId);
  }

  if (processId) {
    query = query.eq('process_id', processId);
  }

  if (orderId) {
    query = query.eq('order_id', orderId);
  }

  const { data: inspections, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: {
      inspections,
      summary: {
        total: inspections?.length || 0,
        passed: inspections?.filter((i: any) => i.result === 'pass').length || 0,
        failed: inspections?.filter((i: any) => i.result === 'fail').length || 0
      }
    }
  });
}

/**
 * OQC - 出货检验
 */
async function getOQCList(client: any, searchParams: URLSearchParams) {
  const status = searchParams.get('status') || 'all';
  const orderId = searchParams.get('order_id');
  const customerId = searchParams.get('customer_id');

  let query = client
    .from('outgoing_inspections')
    .select(`
      id,
      inspection_no,
      inspection_time,
      result,
      status,
      carton_range_start,
      carton_range_end,
      total_cartons,
      sample_cartons,
      pass_quantity,
      fail_quantity,
      inspection_standard,
      production_orders (
        id,
        order_code,
        total_quantity,
        delivery_date,
        customers (id, name)
      ),
      inspectors (name)
    `)
    .order('inspection_time', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (orderId) {
    query = query.eq('order_id', orderId);
  }

  if (customerId) {
    query = query.eq('production_orders.customer_id', customerId);
  }

  const { data: inspections, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: {
      inspections,
      summary: {
        total: inspections?.length || 0,
        passed: inspections?.filter((i: any) => i.result === 'pass').length || 0,
        failed: inspections?.filter((i: any) => i.result === 'fail').length || 0
      }
    }
  });
}

/**
 * 创建IQC检验
 */
async function createIQC(client: any, data: any) {
  const {
    materialId,
    materialCode,
    materialName,
    supplierId,
    batchNo,
    quantity,
    sampleQuantity,
    inspectionItems,
    defects,
    inspectorId,
    notes
  } = data;

  // 生成检验单号
  const inspectionNo = `IQC${Date.now().toString(36).toUpperCase()}`;

  // 计算检验结果
  let passQuantity = sampleQuantity;
  let failQuantity = 0;

  defects?.forEach((d: any) => {
    failQuantity += d.quantity;
    passQuantity -= d.quantity;
  });

  const result = failQuantity === 0 ? 'pass' : (failQuantity > sampleQuantity * 0.1 ? 'fail' : 'conditional');

  // 创建检验记录
  const { data: inspection, error } = await client
    .from('incoming_inspections')
    .insert({
      inspection_no: inspectionNo,
      material_id: materialId,
      material_code: materialCode,
      material_name: materialName,
      supplier_id: supplierId,
      batch_no: batchNo,
      quantity,
      sample_quantity: sampleQuantity,
      pass_quantity: passQuantity,
      fail_quantity: failQuantity,
      result,
      status: 'completed',
      inspector_id: inspectorId,
      inspection_time: new Date().toISOString(),
      inspection_items: inspectionItems,
      notes
    })
    .select()
    .single();

  if (error) throw error;

  // 记录缺陷
  if (defects && defects.length > 0) {
    await client
      .from('quality_defects')
      .insert(defects.map((d: any) => ({
        inspection_id: inspection.id,
        inspection_type: 'IQC',
        defect_type: d.type,
        defect_description: d.description,
        quantity: d.quantity,
        severity: d.severity,
        status: 'open'
      })));
  }

  // 更新供应商质量评分
  if (supplierId) {
    await updateSupplierQualityScore(client, supplierId, result);
  }

  return NextResponse.json({
    success: true,
    data: inspection,
    message: '来料检验记录已创建'
  });
}

/**
 * 创建IPQC检验
 */
async function createIPQC(client: any, data: any) {
  const {
    orderId,
    processId,
    lineId,
    checkType,
    checkQuantity,
    defects,
    inspectorId,
    notes
  } = data;

  const inspectionNo = `IPQC${Date.now().toString(36).toUpperCase()}`;

  let passQuantity = checkQuantity;
  let failQuantity = 0;

  defects?.forEach((d: any) => {
    failQuantity += d.quantity;
    passQuantity -= d.quantity;
  });

  const result = failQuantity === 0 ? 'pass' : (failQuantity > checkQuantity * 0.05 ? 'fail' : 'conditional');

  const { data: inspection, error } = await client
    .from('in_process_inspections')
    .insert({
      inspection_no: inspectionNo,
      order_id: orderId,
      process_id: processId,
      line_id: lineId,
      check_type: checkType,
      check_quantity: checkQuantity,
      pass_quantity: passQuantity,
      fail_quantity: failQuantity,
      result,
      status: 'completed',
      inspector_id: inspectorId,
      inspection_time: new Date().toISOString(),
      defect_description: defects?.map((d: any) => `${d.type}:${d.quantity}`).join(', '),
      notes
    })
    .select()
    .single();

  if (error) throw error;

  // 记录缺陷并关联责任人和工序
  if (defects && defects.length > 0) {
    await client
      .from('quality_defects')
      .insert(defects.map((d: any) => ({
        inspection_id: inspection.id,
        inspection_type: 'IPQC',
        order_id: orderId,
        process_id: processId,
        defect_type: d.type,
        defect_description: d.description,
        quantity: d.quantity,
        severity: d.severity,
        responsible_process: d.responsibleProcess,
        responsible_person: d.responsiblePerson,
        status: 'open'
      })));

    // 如果严重缺陷，触发预警
    const criticalDefects = defects.filter((d: any) => d.severity === 'critical');
    if (criticalDefects.length > 0) {
      await client
        .from('alerts')
        .insert({
          type: 'quality',
          level: 'delay',
          title: `严重质量问题: 工序 ${processId}`,
          message: `发现 ${criticalDefects.length} 个严重缺陷，请立即处理`,
          source_type: 'quality_inspection',
          source_id: inspection.id
        });
    }
  }

  return NextResponse.json({
    success: true,
    data: inspection,
    message: '生产巡检记录已创建'
  });
}

/**
 * 创建OQC检验
 */
async function createOQC(client: any, data: any) {
  const {
    orderId,
    cartonRangeStart,
    cartonRangeEnd,
    totalCartons,
    sampleCartons,
    inspectionStandard,
    defects,
    inspectorId,
    notes
  } = data;

  const inspectionNo = `OQC${Date.now().toString(36).toUpperCase()}`;

  const sampleQuantity = sampleCartons * 5; // 假设每箱抽5件
  let passQuantity = sampleQuantity;
  let failQuantity = 0;

  defects?.forEach((d: any) => {
    failQuantity += d.quantity;
    passQuantity -= d.quantity;
  });

  const result = failQuantity === 0 ? 'pass' : (failQuantity > sampleQuantity * 0.02 ? 'fail' : 'conditional');

  const { data: inspection, error } = await client
    .from('outgoing_inspections')
    .insert({
      inspection_no: inspectionNo,
      order_id: orderId,
      carton_range_start: cartonRangeStart,
      carton_range_end: cartonRangeEnd,
      total_cartons: totalCartons,
      sample_cartons: sampleCartons,
      pass_quantity: passQuantity,
      fail_quantity: failQuantity,
      result,
      status: result === 'pass' ? 'approved' : 'pending',
      inspector_id: inspectorId,
      inspection_time: new Date().toISOString(),
      inspection_standard: inspectionStandard,
      notes
    })
    .select()
    .single();

  if (error) throw error;

  // 记录缺陷
  if (defects && defects.length > 0) {
    await client
      .from('quality_defects')
      .insert(defects.map((d: any) => ({
        inspection_id: inspection.id,
        inspection_type: 'OQC',
        order_id: orderId,
        defect_type: d.type,
        defect_description: d.description,
        quantity: d.quantity,
        severity: d.severity,
        status: 'open'
      })));
  }

  return NextResponse.json({
    success: true,
    data: inspection,
    message: '出货检验记录已创建'
  });
}

/**
 * 记录缺陷
 */
async function recordDefect(client: any, data: any) {
  const {
    inspectionId,
    inspectionType,
    orderId,
    processId,
    defectType,
    description,
    quantity,
    severity,
    responsibleProcess,
    responsiblePerson,
    imageUrls
  } = data;

  const { data: defect, error } = await client
    .from('quality_defects')
    .insert({
      inspection_id: inspectionId,
      inspection_type: inspectionType,
      order_id: orderId,
      process_id: processId,
      defect_type: defectType,
      defect_description: description,
      quantity,
      severity,
      responsible_process: responsibleProcess,
      responsible_person: responsiblePerson,
      image_urls: imageUrls,
      status: 'open'
    })
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: defect,
    message: '缺陷已记录'
  });
}

/**
 * 批量记录缺陷
 */
async function batchRecordDefects(client: any, data: any) {
  const { defects } = data;

  const { error } = await client
    .from('quality_defects')
    .insert(defects.map((d: any) => ({
      inspection_id: d.inspectionId,
      inspection_type: d.inspectionType,
      order_id: d.orderId,
      process_id: d.processId,
      defect_type: d.defectType,
      defect_description: d.description,
      quantity: d.quantity,
      severity: d.severity,
      responsible_process: d.responsibleProcess,
      responsible_person: d.responsiblePerson,
      status: 'open'
    })));

  if (error) throw error;

  return NextResponse.json({
    success: true,
    message: `已记录 ${defects.length} 个缺陷`
  });
}

/**
 * 解决缺陷
 */
async function resolveDefect(client: any, data: any) {
  const { defectId, resolution, rootCause, preventiveAction, resolvedBy } = data;

  const { data: defect, error } = await client
    .from('quality_defects')
    .update({
      status: 'resolved',
      resolution,
      root_cause: rootCause,
      preventive_action: preventiveAction,
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy
    })
    .eq('id', defectId)
    .select()
    .single();

  if (error) throw error;

  // 如果有根因分析，记录到知识库
  if (rootCause && preventiveAction) {
    await client
      .from('quality_knowledge_base')
      .insert({
        defect_type: defect.defect_type,
        root_cause: rootCause,
        solution: preventiveAction,
        created_by: resolvedBy
      });
  }

  return NextResponse.json({
    success: true,
    data: defect,
    message: '缺陷已解决'
  });
}

/**
 * 从缺陷创建返工单
 */
async function createReworkFromDefect(client: any, data: any) {
  const { defectId, reworkType, assignedTo, notes } = data;

  // 获取缺陷信息
  const { data: defect } = await client
    .from('quality_defects')
    .select('*')
    .eq('id', defectId)
    .single();

  if (!defect) {
    return NextResponse.json({ 
      success: false, 
      error: '缺陷不存在' 
    }, { status: 404 });
  }

  // 创建返工单
  const reworkNo = `RW${Date.now().toString(36).toUpperCase()}`;

  const { data: rework, error } = await client
    .from('rework_orders')
    .insert({
      rework_no: reworkNo,
      order_id: defect.order_id,
      process_id: defect.process_id,
      defect_id: defectId,
      rework_type: reworkType,
      quantity: defect.quantity,
      status: 'pending',
      assigned_to: assignedTo,
      notes,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // 更新缺陷状态
  await client
    .from('quality_defects')
    .update({
      status: 'rework',
      rework_id: rework.id
    })
    .eq('id', defectId);

  return NextResponse.json({
    success: true,
    data: rework,
    message: '返工单已创建'
  });
}

/**
 * 批准检验
 */
async function approveInspection(client: any, data: any) {
  const { inspectionId, inspectionType, approvedBy, notes } = data;

  const tableName = getTableName(inspectionType);

  const { error } = await client
    .from(tableName)
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      approval_notes: notes
    })
    .eq('id', inspectionId);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    message: '检验已批准'
  });
}

/**
 * 拒绝检验
 */
async function rejectInspection(client: any, data: any) {
  const { inspectionId, inspectionType, rejectedBy, reason } = data;

  const tableName = getTableName(inspectionType);

  const { error } = await client
    .from(tableName)
    .update({
      status: 'rejected',
      rejected_by: rejectedBy,
      rejected_at: new Date().toISOString(),
      reject_reason: reason
    })
    .eq('id', inspectionId);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    message: '检验已拒绝'
  });
}

/**
 * 质量统计
 */
async function getQualityStatistics(client: any, searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'month';
  const dateRange = getDateRange(period);

  // IQC统计
  const { data: iqcData } = await client
    .from('incoming_inspections')
    .select('result, quantity, fail_quantity')
    .gte('inspection_time', `${dateRange.start}T00:00:00Z`);

  // IPQC统计
  const { data: ipqcData } = await client
    .from('in_process_inspections')
    .select('result, check_quantity, fail_quantity')
    .gte('inspection_time', `${dateRange.start}T00:00:00Z`);

  // OQC统计
  const { data: oqcData } = await client
    .from('outgoing_inspections')
    .select('result, pass_quantity, fail_quantity')
    .gte('inspection_time', `${dateRange.start}T00:00:00Z`);

  // 计算统计指标
  const iqcStats = {
    total: iqcData?.length || 0,
    passed: iqcData?.filter((i: any) => i.result === 'pass').length || 0,
    failed: iqcData?.filter((i: any) => i.result === 'fail').length || 0,
    totalQuantity: iqcData?.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || 0,
    totalDefects: iqcData?.reduce((sum: number, i: any) => sum + (i.fail_quantity || 0), 0) || 0
  };

  const ipqcStats = {
    total: ipqcData?.length || 0,
    passed: ipqcData?.filter((i: any) => i.result === 'pass').length || 0,
    failed: ipqcData?.filter((i: any) => i.result === 'fail').length || 0,
    totalChecked: ipqcData?.reduce((sum: number, i: any) => sum + (i.check_quantity || 0), 0) || 0,
    totalDefects: ipqcData?.reduce((sum: number, i: any) => sum + (i.fail_quantity || 0), 0) || 0
  };

  const oqcStats = {
    total: oqcData?.length || 0,
    passed: oqcData?.filter((i: any) => i.result === 'pass').length || 0,
    failed: oqcData?.filter((i: any) => i.result === 'fail').length || 0,
    totalChecked: oqcData?.reduce((sum: number, i: any) => sum + (i.pass_quantity || 0) + (i.fail_quantity || 0), 0) || 0,
    totalDefects: oqcData?.reduce((sum: number, i: any) => sum + (i.fail_quantity || 0), 0) || 0
  };

  return NextResponse.json({
    success: true,
    data: {
      period,
      dateRange,
      iqc: {
        ...iqcStats,
        passRate: iqcStats.total > 0 ? Math.round(iqcStats.passed / iqcStats.total * 100) : 0,
        defectRate: iqcStats.totalQuantity > 0 ? Math.round(iqcStats.totalDefects / iqcStats.totalQuantity * 10000) / 100 : 0
      },
      ipqc: {
        ...ipqcStats,
        passRate: ipqcStats.total > 0 ? Math.round(ipqcStats.passed / ipqcStats.total * 100) : 0,
        defectRate: ipqcStats.totalChecked > 0 ? Math.round(ipqcStats.totalDefects / ipqcStats.totalChecked * 10000) / 100 : 0
      },
      oqc: {
        ...oqcStats,
        passRate: oqcStats.total > 0 ? Math.round(oqcStats.passed / oqcStats.total * 100) : 0,
        defectRate: oqcStats.totalChecked > 0 ? Math.round(oqcStats.totalDefects / oqcStats.totalChecked * 10000) / 100 : 0
      }
    }
  });
}

/**
 * 缺陷分析
 */
async function getDefectAnalysis(client: any, searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'month';
  const dateRange = getDateRange(period);

  const { data: defects } = await client
    .from('quality_defects')
    .select(`
      id,
      defect_type,
      quantity,
      severity,
      status,
      created_at,
      resolved_at,
      processes (
        process_code,
        process_name
      )
    `)
    .gte('created_at', `${dateRange.start}T00:00:00Z`);

  // 按缺陷类型统计
  const byType: Record<string, { count: number; quantity: number }> = {};
  defects?.forEach((d: any) => {
    if (!byType[d.defect_type]) {
      byType[d.defect_type] = { count: 0, quantity: 0 };
    }
    byType[d.defect_type].count++;
    byType[d.defect_type].quantity += d.quantity || 0;
  });

  // 按严重程度统计
  const bySeverity = {
    critical: defects?.filter((d: any) => d.severity === 'critical').length || 0,
    major: defects?.filter((d: any) => d.severity === 'major').length || 0,
    minor: defects?.filter((d: any) => d.severity === 'minor').length || 0
  };

  // 按状态统计
  const byStatus = {
    open: defects?.filter((d: any) => d.status === 'open').length || 0,
    resolved: defects?.filter((d: any) => d.status === 'resolved').length || 0,
    rework: defects?.filter((d: any) => d.status === 'rework').length || 0
  };

  // 平均解决时间
  const resolvedDefects = defects?.filter((d: any) => d.resolved_at) || [];
  let avgResolutionTime = 0;
  if (resolvedDefects.length > 0) {
    const totalMinutes = resolvedDefects.reduce((sum: number, d: any) => {
      const created = new Date(d.created_at).getTime();
      const resolved = new Date(d.resolved_at).getTime();
      return sum + (resolved - created) / (1000 * 60);
    }, 0);
    avgResolutionTime = Math.round(totalMinutes / resolvedDefects.length);
  }

  return NextResponse.json({
    success: true,
    data: {
      total: defects?.length || 0,
      totalQuantity: defects?.reduce((sum: number, d: any) => sum + (d.quantity || 0), 0) || 0,
      byType: Object.entries(byType)
        .map(([type, data]) => ({ type, ...data }))
        .sort((a, b) => b.quantity - a.quantity),
      bySeverity,
      byStatus,
      avgResolutionTime,
      topDefects: Object.entries(byType)
        .sort((a, b) => b[1].quantity - a[1].quantity)
        .slice(0, 10)
        .map(([type, data]) => ({ type, ...data }))
    }
  });
}

/**
 * 工序问题排名（TOP）
 */
async function getProcessRanking(client: any, searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'month';
  const dateRange = getDateRange(period);

  const { data: defects } = await client
    .from('quality_defects')
    .select(`
      id,
      defect_type,
      quantity,
      severity,
      process_id,
      processes (
        id,
        process_code,
        process_name,
        category
      )
    `)
    .gte('created_at', `${dateRange.start}T00:00:00Z`);

  // 按工序统计
  const byProcess: Record<string, {
    processId: string;
    processCode: string;
    processName: string;
    category: string;
    defectCount: number;
    totalQuantity: number;
    criticalCount: number;
  }> = {};

  defects?.forEach((d: any) => {
    const processId = d.process_id;
    if (!processId) return;

    if (!byProcess[processId]) {
      byProcess[processId] = {
        processId,
        processCode: d.processes?.process_code,
        processName: d.processes?.process_name,
        category: d.processes?.category,
        defectCount: 0,
        totalQuantity: 0,
        criticalCount: 0
      };
    }

    byProcess[processId].defectCount++;
    byProcess[processId].totalQuantity += d.quantity || 0;
    if (d.severity === 'critical') {
      byProcess[processId].criticalCount++;
    }
  });

  // 排序
  const ranking = Object.values(byProcess)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .map((item, index) => ({
      rank: index + 1,
      ...item
    }));

  return NextResponse.json({
    success: true,
    data: {
      ranking: ranking.slice(0, 20),
      summary: {
        totalProcesses: ranking.length,
        totalDefects: ranking.reduce((sum, p) => sum + p.defectCount, 0),
        totalQuantity: ranking.reduce((sum, p) => sum + p.totalQuantity, 0)
      }
    }
  });
}

/**
 * 质量趋势
 */
async function getQualityTrend(client: any, searchParams: URLSearchParams) {
  const days = parseInt(searchParams.get('days') || '30');
  const trends: any[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // 获取当天检验数据
    const { data: ipqc } = await client
      .from('in_process_inspections')
      .select('result, check_quantity, fail_quantity')
      .gte('inspection_time', `${dateStr}T00:00:00Z`)
      .lte('inspection_time', `${dateStr}T23:59:59Z`);

    const { data: oqc } = await client
      .from('outgoing_inspections')
      .select('result, pass_quantity, fail_quantity')
      .gte('inspection_time', `${dateStr}T00:00:00Z`)
      .lte('inspection_time', `${dateStr}T23:59:59Z`);

    const ipqcTotal = ipqc?.length || 0;
    const ipqcPassed = ipqc?.filter((i: any) => i.result === 'pass').length || 0;
    const ipqcDefects = ipqc?.reduce((sum: number, i: any) => sum + (i.fail_quantity || 0), 0) || 0;

    const oqcTotal = oqc?.length || 0;
    const oqcPassed = oqc?.filter((i: any) => i.result === 'pass').length || 0;

    trends.push({
      date: dateStr,
      ipqc: {
        total: ipqcTotal,
        passed: ipqcPassed,
        passRate: ipqcTotal > 0 ? Math.round(ipqcPassed / ipqcTotal * 100) : 0,
        defects: ipqcDefects
      },
      oqc: {
        total: oqcTotal,
        passed: oqcPassed,
        passRate: oqcTotal > 0 ? Math.round(oqcPassed / oqcTotal * 100) : 0
      }
    });
  }

  return NextResponse.json({
    success: true,
    data: trends
  });
}

/**
 * 质量仪表盘
 */
async function getQualityDashboard(client: any) {
  const today = new Date().toISOString().split('T')[0];

  // 今日检验统计
  const [todayIQC, todayIPQC, todayOQC] = await Promise.all([
    client.from('incoming_inspections').select('result').gte('inspection_time', `${today}T00:00:00Z`),
    client.from('in_process_inspections').select('result').gte('inspection_time', `${today}T00:00:00Z`),
    client.from('outgoing_inspections').select('result').gte('inspection_time', `${today}T00:00:00Z`)
  ]);

  // 待处理缺陷
  const { count: openDefects } = await client
    .from('quality_defects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open');

  // 严重缺陷
  const { count: criticalDefects } = await client
    .from('quality_defects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open')
    .eq('severity', 'critical');

  // 本月质量趋势
  const monthStart = today.substring(0, 7) + '-01';
  const { data: monthData } = await client
    .from('in_process_inspections')
    .select('result')
    .gte('inspection_time', `${monthStart}T00:00:00Z`);

  const monthPassed = monthData?.filter((i: any) => i.result === 'pass').length || 0;
  const monthTotal = monthData?.length || 0;

  return NextResponse.json({
    success: true,
    data: {
      today: {
        iqc: {
          total: todayIQC.data?.length || 0,
          passed: todayIQC.data?.filter((i: any) => i.result === 'pass').length || 0
        },
        ipqc: {
          total: todayIPQC.data?.length || 0,
          passed: todayIPQC.data?.filter((i: any) => i.result === 'pass').length || 0
        },
        oqc: {
          total: todayOQC.data?.length || 0,
          passed: todayOQC.data?.filter((i: any) => i.result === 'pass').length || 0
        }
      },
      defects: {
        open: openDefects || 0,
        critical: criticalDefects || 0
      },
      month: {
        passed: monthPassed,
        total: monthTotal,
        passRate: monthTotal > 0 ? Math.round(monthPassed / monthTotal * 100) : 0
      }
    }
  });
}

// 辅助函数
function getTableName(inspectionType: string): string {
  switch (inspectionType) {
    case 'IQC':
      return 'incoming_inspections';
    case 'IPQC':
      return 'in_process_inspections';
    case 'OQC':
      return 'outgoing_inspections';
    default:
      return 'quality_inspections';
  }
}

function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start: string;

  switch (period) {
    case 'week':
      now.setDate(now.getDate() - 7);
      start = now.toISOString().split('T')[0];
      break;
    case 'month':
      start = end.substring(0, 7) + '-01';
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start = `${now.getFullYear()}-${(quarter * 3 + 1).toString().padStart(2, '0')}-01`;
      break;
    case 'year':
      start = `${now.getFullYear()}-01-01`;
      break;
    default:
      now.setDate(now.getDate() - 30);
      start = now.toISOString().split('T')[0];
  }

  return { start, end };
}

async function updateSupplierQualityScore(client: any, supplierId: string, result: string) {
  // 获取供应商历史检验记录
  const { data: history } = await client
    .from('incoming_inspections')
    .select('result')
    .eq('supplier_id', supplierId)
    .limit(20);

  const total = history?.length || 0;
  const passed = history?.filter((h: any) => h.result === 'pass').length || 0;
  const qualityScore = total > 0 ? Math.round(passed / total * 100) : 0;

  await client
    .from('suppliers')
    .update({ quality_score: qualityScore })
    .eq('id', supplierId);
}
