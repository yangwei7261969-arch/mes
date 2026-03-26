import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 设备管理API
 * 
 * 功能：
 * • 设备档案管理
 * • 设备维护保养
 * • 故障记录与维修
 * • 设备效率分析(OEE)
 * • 维护提醒
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await listEquipment(client, searchParams);
      case 'detail':
        return await getEquipmentDetail(client, searchParams);
      case 'maintenance-schedule':
        return await getMaintenanceSchedule(client, searchParams);
      case 'faults':
        return await listFaults(client, searchParams);
      case 'oee':
        return await calculateOEE(client, searchParams);
      case 'statistics':
        return await getEquipmentStats(client, searchParams);
      case 'alerts':
        return await getMaintenanceAlerts(client, searchParams);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Equipment API error:', error);
    return NextResponse.json({ success: false, error: '设备查询失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create':
        return await createEquipment(client, data);
      case 'update':
        return await updateEquipment(client, data);
      case 'add-maintenance':
        return await addMaintenanceRecord(client, data);
      case 'report-fault':
        return await reportFault(client, data);
      case 'repair':
        return await completeRepair(client, data.faultId, data.repairData);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Equipment operation error:', error);
    return NextResponse.json({ success: false, error: '设备操作失败' }, { status: 500 });
  }
}

/**
 * 设备列表
 */
async function listEquipment(client: any, searchParams: URLSearchParams) {
  const workshop = searchParams.get('workshop');
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  let query = client
    .from('equipment')
    .select('*')
    .order('created_at', { ascending: false });

  if (workshop) {
    query = query.eq('workshop', workshop);
  }
  if (type) {
    query = query.eq('equipment_type', type);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;

  // 计算设备状态统计
  const stats = {
    total: data?.length || 0,
    running: data?.filter((e: any) => e.status === 'running').length || 0,
    maintenance: data?.filter((e: any) => e.status === 'maintenance').length || 0,
    fault: data?.filter((e: any) => e.status === 'fault').length || 0,
    idle: data?.filter((e: any) => e.status === 'idle').length || 0
  };

  return NextResponse.json({
    success: true,
    data: {
      equipment: data || [],
      stats
    }
  });
}

/**
 * 设备详情
 */
async function getEquipmentDetail(client: any, searchParams: URLSearchParams) {
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: '缺少设备ID' }, { status: 400 });
  }

  const { data: equipment, error } = await client
    .from('equipment')
    .select(`
      *,
      maintenance_records (*),
      fault_records (*),
      production_logs (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  if (!equipment) {
    return NextResponse.json({ success: false, error: '设备不存在' }, { status: 404 });
  }

  // 计算OEE
  const oee = await calculateEquipmentOEE(client, id);

  // 获取下次保养时间
  const nextMaintenance = await getNextMaintenance(client, id);

  return NextResponse.json({
    success: true,
    data: {
      equipment,
      oee,
      nextMaintenance
    }
  });
}

/**
 * 保养计划
 */
async function getMaintenanceSchedule(client: any, searchParams: URLSearchParams) {
  const equipmentId = searchParams.get('equipment_id');
  const upcoming = searchParams.get('upcoming') === 'true';
  const days = parseInt(searchParams.get('days') || '30');

  const today = new Date();
  const endDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  let query = client
    .from('equipment_maintenance')
    .select(`
      *,
      equipment (id, code, name, workshop)
    `)
    .gte('scheduled_date', today.toISOString())
    .lte('scheduled_date', endDate.toISOString())
    .order('scheduled_date', { ascending: true });

  if (equipmentId) {
    query = query.eq('equipment_id', equipmentId);
  }

  if (upcoming) {
    query = query.eq('status', 'scheduled');
  }

  const { data, error } = await query;

  if (error) throw error;

  // 按日期分组
  const byDate: Record<string, any[]> = {};
  data?.forEach((m: any) => {
    const date = m.scheduled_date.split('T')[0];
    if (!byDate[date]) {
      byDate[date] = [];
    }
    byDate[date].push(m);
  });

  return NextResponse.json({
    success: true,
    data: {
      schedule: data || [],
      byDate,
      total: data?.length || 0
    }
  });
}

/**
 * 故障记录
 */
async function listFaults(client: any, searchParams: URLSearchParams) {
  const equipmentId = searchParams.get('equipment_id');
  const status = searchParams.get('status');
  const severity = searchParams.get('severity');

  let query = client
    .from('equipment_faults')
    .select(`
      *,
      equipment (id, code, name, workshop)
    `)
    .order('reported_at', { ascending: false });

  if (equipmentId) {
    query = query.eq('equipment_id', equipmentId);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (severity) {
    query = query.eq('severity', severity);
  }

  const { data, error } = await query;

  if (error) throw error;

  // 统计
  const stats = {
    total: data?.length || 0,
    pending: data?.filter((f: any) => f.status === 'pending').length || 0,
    repairing: data?.filter((f: any) => f.status === 'repairing').length || 0,
    resolved: data?.filter((f: any) => f.status === 'resolved').length || 0,
    avgRepairTime: calculateAvgRepairTime(data)
  };

  return NextResponse.json({
    success: true,
    data: {
      faults: data || [],
      stats
    }
  });
}

/**
 * OEE计算
 */
async function calculateOEE(client: any, searchParams: URLSearchParams) {
  const equipmentId = searchParams.get('equipment_id');
  const startDate = searchParams.get('start_date') || 
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = searchParams.get('end_date') || 
    new Date().toISOString().split('T')[0];

  if (equipmentId) {
    // 单台设备OEE
    const oee = await calculateEquipmentOEE(client, equipmentId, startDate, endDate);
    return NextResponse.json({ success: true, data: oee });
  }

  // 所有设备OEE
  const { data: equipment } = await client
    .from('equipment')
    .select('id, code, name, workshop, equipment_type')
    .eq('status', 'running');

  const oeeList = await Promise.all(
    (equipment || []).map(async (eq: any) => {
      const oee = await calculateEquipmentOEE(client, eq.id, startDate, endDate);
      return { ...eq, oee };
    })
  );

  // 按车间分组
  const byWorkshop: Record<string, any> = {};
  oeeList.forEach((item: any) => {
    const ws = item.workshop || '未分配';
    if (!byWorkshop[ws]) {
      byWorkshop[ws] = { count: 0, totalOEE: 0, items: [] };
    }
    byWorkshop[ws].count += 1;
    byWorkshop[ws].totalOEE += item.oee?.oee || 0;
    byWorkshop[ws].items.push(item);
  });

  // 计算各车间平均OEE
  Object.keys(byWorkshop).forEach(ws => {
    byWorkshop[ws].avgOEE = byWorkshop[ws].totalOEE / byWorkshop[ws].count;
  });

  return NextResponse.json({
    success: true,
    data: {
      equipment: oeeList,
      byWorkshop,
      summary: {
        totalEquipment: oeeList.length,
        avgOEE: oeeList.reduce((sum: number, e: any) => sum + (e.oee?.oee || 0), 0) / (oeeList.length || 1),
        highOEE: oeeList.filter((e: any) => (e.oee?.oee || 0) >= 85).length,
        lowOEE: oeeList.filter((e: any) => (e.oee?.oee || 0) < 70).length
      }
    }
  });
}

/**
 * 计算单台设备OEE
 */
async function calculateEquipmentOEE(
  client: any, 
  equipmentId: string, 
  startDate?: string, 
  endDate?: string
): Promise<any> {
  const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const end = endDate || new Date().toISOString();

  // 获取设备信息
  const { data: equipment } = await client
    .from('equipment')
    .select('*')
    .eq('id', equipmentId)
    .single();

  if (!equipment) return null;

  // 获取生产记录
  const { data: production } = await client
    .from('equipment_production')
    .select('*')
    .eq('equipment_id', equipmentId)
    .gte('date', start)
    .lte('date', end);

  // 获取停机记录
  const { data: downtime } = await client
    .from('equipment_downtime')
    .select('*')
    .eq('equipment_id', equipmentId)
    .gte('start_time', start)
    .lte('end_time', end);

  // 计算时间可用率
  const totalPlannedTime = 8 * 60 * 60 * 7; // 假设每天8小时，一周7天
  const totalDowntime = downtime?.reduce((sum: number, d: any) => {
    const startT = new Date(d.start_time).getTime();
    const endT = new Date(d.end_time).getTime();
    return sum + (endT - startT) / 1000;
  }, 0) || 0;

  const availability = ((totalPlannedTime - totalDowntime) / totalPlannedTime) * 100;

  // 计算性能效率
  const totalOutput = production?.reduce((sum: number, p: any) => sum + (p.output_quantity || 0), 0) || 0;
  const theoreticalOutput = equipment.standard_output * ((totalPlannedTime - totalDowntime) / 3600);
  const performance = theoreticalOutput > 0 ? (totalOutput / theoreticalOutput) * 100 : 0;

  // 计算质量合格率
  const totalDefect = production?.reduce((sum: number, p: any) => sum + (p.defect_quantity || 0), 0) || 0;
  const quality = totalOutput > 0 ? ((totalOutput - totalDefect) / totalOutput) * 100 : 100;

  // 计算OEE
  const oee = (availability * performance * quality) / 10000;

  return {
    availability: Math.round(availability * 10) / 10,
    performance: Math.round(performance * 10) / 10,
    quality: Math.round(quality * 10) / 10,
    oee: Math.round(oee * 10) / 10,
    details: {
      plannedTime: totalPlannedTime,
      downtime: totalDowntime,
      output: totalOutput,
      defects: totalDefect
    }
  };
}

/**
 * 设备统计
 */
async function getEquipmentStats(client: any, searchParams: URLSearchParams) {
  const workshop = searchParams.get('workshop');

  // 设备总数和状态
  let eqQuery = client.from('equipment').select('status, equipment_type');
  if (workshop) {
    eqQuery = eqQuery.eq('workshop', workshop);
  }
  const { data: equipment } = await eqQuery;

  // 故障统计
  let faultQuery = client
    .from('equipment_faults')
    .select('severity, status, reported_at')
    .gte('reported_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  if (workshop) {
    faultQuery = faultQuery.eq('equipment.workshop', workshop);
  }
  const { data: faults } = await faultQuery;

  // 保养统计
  const { data: maintenance } = await client
    .from('equipment_maintenance')
    .select('status, maintenance_type')
    .gte('scheduled_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const stats = {
    equipment: {
      total: equipment?.length || 0,
      byStatus: {
        running: equipment?.filter((e: any) => e.status === 'running').length || 0,
        maintenance: equipment?.filter((e: any) => e.status === 'maintenance').length || 0,
        fault: equipment?.filter((e: any) => e.status === 'fault').length || 0,
        idle: equipment?.filter((e: any) => e.status === 'idle').length || 0
      },
      byType: groupBy(equipment || [], 'equipment_type')
    },
    faults: {
      total: faults?.length || 0,
      pending: faults?.filter((f: any) => f.status === 'pending').length || 0,
      bySeverity: {
        critical: faults?.filter((f: any) => f.severity === 'critical').length || 0,
        major: faults?.filter((f: any) => f.severity === 'major').length || 0,
        minor: faults?.filter((f: any) => f.severity === 'minor').length || 0
      }
    },
    maintenance: {
      total: maintenance?.length || 0,
      completed: maintenance?.filter((m: any) => m.status === 'completed').length || 0,
      pending: maintenance?.filter((m: any) => m.status === 'scheduled').length || 0
    }
  };

  return NextResponse.json({ success: true, data: stats });
}

/**
 * 维护提醒
 */
async function getMaintenanceAlerts(client: any, searchParams: URLSearchParams) {
  const days = parseInt(searchParams.get('days') || '7');
  const today = new Date();
  const endDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  // 即将到期的保养
  const { data: upcomingMaintenance } = await client
    .from('equipment_maintenance')
    .select(`
      *,
      equipment (id, code, name, workshop)
    `)
    .gte('scheduled_date', today.toISOString())
    .lte('scheduled_date', endDate.toISOString())
    .eq('status', 'scheduled');

  // 逾期的保养
  const { data: overdueMaintenance } = await client
    .from('equipment_maintenance')
    .select(`
      *,
      equipment (id, code, name, workshop)
    `)
    .lt('scheduled_date', today.toISOString())
    .eq('status', 'scheduled');

  // 即将到期的保修
  const { data: expiringWarranty } = await client
    .from('equipment')
    .select('*')
    .gte('warranty_expiry', today.toISOString())
    .lte('warranty_expiry', endDate.toISOString());

  // 运行时长即将到保养阈值的设备
  const { data: nearThreshold } = await client
    .from('equipment')
    .select('*')
    .eq('status', 'running');

  const thresholdAlerts = (nearThreshold || []).filter((eq: any) => {
    if (!eq.maintenance_threshold || !eq.total_running_hours) return false;
    const remaining = eq.maintenance_threshold - (eq.total_running_hours % eq.maintenance_threshold);
    return remaining <= 50; // 剩余50小时
  });

  return NextResponse.json({
    success: true,
    data: {
      upcomingMaintenance: upcomingMaintenance || [],
      overdueMaintenance: overdueMaintenance || [],
      expiringWarranty: expiringWarranty || [],
      nearThreshold,
      summary: {
        upcoming: upcomingMaintenance?.length || 0,
        overdue: overdueMaintenance?.length || 0,
        expiringWarranty: expiringWarranty?.length || 0,
        nearThreshold: thresholdAlerts.length
      }
    }
  });
}

/**
 * 创建设备
 */
async function createEquipment(client: any, data: any) {
  const equipmentData = {
    code: data.code || `EQ${Date.now()}`,
    name: data.name,
    equipment_type: data.equipmentType || data.equipment_type,
    brand: data.brand,
    model: data.model,
    workshop: data.workshop,
    purchase_date: data.purchaseDate || data.purchase_date,
    warranty_expiry: data.warrantyExpiry || data.warranty_expiry,
    standard_output: data.standardOutput || data.standard_output || 100,
    status: data.status || 'idle',
    maintenance_threshold: data.maintenanceThreshold || data.maintenance_threshold,
    created_at: new Date().toISOString()
  };

  const { data: equipment, error } = await client
    .from('equipment')
    .insert(equipmentData)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: equipment,
    message: '设备创建成功'
  });
}

/**
 * 更新设备
 */
async function updateEquipment(client: any, data: any) {
  const { id, ...updates } = data;

  if (!id) {
    return NextResponse.json({ success: false, error: '缺少设备ID' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data: equipment, error } = await client
    .from('equipment')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: equipment,
    message: '设备更新成功'
  });
}

/**
 * 添加保养记录
 */
async function addMaintenanceRecord(client: any, data: any) {
  const record = {
    equipment_id: data.equipmentId || data.equipment_id,
    maintenance_type: data.maintenanceType || data.maintenance_type,
    scheduled_date: data.scheduledDate || data.scheduled_date,
    actual_date: data.actualDate || data.actual_date,
    description: data.description,
    parts_replaced: data.partsReplaced || data.parts_replaced,
    cost: data.cost,
    technician: data.technician,
    status: data.status || 'completed',
    created_at: new Date().toISOString()
  };

  const { data: maintenance, error } = await client
    .from('equipment_maintenance')
    .insert(record)
    .select()
    .single();

  if (error) throw error;

  // 更新设备状态
  await client
    .from('equipment')
    .update({ 
      last_maintenance: record.actual_date || record.scheduled_date,
      status: 'running',
      updated_at: new Date().toISOString()
    })
    .eq('id', record.equipment_id);

  return NextResponse.json({
    success: true,
    data: maintenance,
    message: '保养记录已添加'
  });
}

/**
 * 报告故障
 */
async function reportFault(client: any, data: any) {
  const fault = {
    equipment_id: data.equipmentId || data.equipment_id,
    fault_type: data.faultType || data.fault_type,
    description: data.description,
    severity: data.severity || 'minor',
    reported_by: data.reportedBy || data.reported_by,
    reported_at: new Date().toISOString(),
    status: 'pending'
  };

  const { data: faultRecord, error } = await client
    .from('equipment_faults')
    .insert(fault)
    .select()
    .single();

  if (error) throw error;

  // 更新设备状态
  if (fault.severity === 'critical' || fault.severity === 'major') {
    await client
      .from('equipment')
      .update({ status: 'fault', updated_at: new Date().toISOString() })
      .eq('id', fault.equipment_id);
  }

  return NextResponse.json({
    success: true,
    data: faultRecord,
    message: '故障已报告'
  });
}

/**
 * 完成维修
 */
async function completeRepair(client: any, faultId: string, data: any) {
  const update = {
    status: 'resolved',
    resolved_at: new Date().toISOString(),
    repair_description: data.repairDescription || data.repair_description,
    repaired_by: data.repairedBy || data.repaired_by,
    parts_used: data.partsUsed || data.parts_used,
    repair_cost: data.repairCost || data.repair_cost
  };

  const { data: fault, error } = await client
    .from('equipment_faults')
    .update(update)
    .eq('id', faultId)
    .select()
    .single();

  if (error) throw error;

  // 恢复设备状态
  if (fault) {
    const { data: pendingFaults } = await client
      .from('equipment_faults')
      .select('id')
      .eq('equipment_id', fault.equipment_id)
      .in('status', ['pending', 'repairing']);

    if (!pendingFaults || pendingFaults.length === 0) {
      await client
        .from('equipment')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', fault.equipment_id);
    }
  }

  return NextResponse.json({
    success: true,
    data: fault,
    message: '维修已完成'
  });
}

// 辅助函数
function calculateAvgRepairTime(faults: any[]): number {
  const resolved = faults?.filter((f: any) => f.status === 'resolved' && f.reported_at && f.resolved_at) || [];
  if (resolved.length === 0) return 0;

  const totalTime = resolved.reduce((sum: number, f: any) => {
    const reported = new Date(f.reported_at).getTime();
    const resolvedT = new Date(f.resolved_at).getTime();
    return sum + (resolvedT - reported);
  }, 0);

  return Math.round(totalTime / resolved.length / 3600000); // 小时
}

function groupBy(arr: any[], key: string): Record<string, number> {
  const result: Record<string, number> = {};
  arr.forEach(item => {
    const k = item[key] || 'unknown';
    result[k] = (result[k] || 0) + 1;
  });
  return result;
}

async function getNextMaintenance(client: any, equipmentId: string): Promise<any> {
  const { data } = await client
    .from('equipment_maintenance')
    .select('*')
    .eq('equipment_id', equipmentId)
    .eq('status', 'scheduled')
    .gte('scheduled_date', new Date().toISOString())
    .order('scheduled_date', { ascending: true })
    .limit(1)
    .single();

  return data;
}
