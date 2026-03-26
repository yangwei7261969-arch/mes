import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 排料/裁剪优化API
 * 
 * 核心功能：
 * • 排料图上传与管理
 * • 面料利用率计算
 * • 自动损耗计算
 * • 排料方案对比
 * • 成本优化建议
 * 
 * 行业价值：布料是最大成本，这块优化=直接赚钱
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await getLayoutList(client, searchParams);
      case 'detail':
        return await getLayoutDetail(client, searchParams.get('id'));
      case 'by-order':
        return await getLayoutsByOrder(client, searchParams);
      case 'statistics':
        return await getLayoutStatistics(client, searchParams);
      case 'compare':
        return await compareLayouts(client, searchParams);
      case 'utilization-report':
        return await getUtilizationReport(client, searchParams);
      case 'cost-analysis':
        return await getCostAnalysis(client, searchParams);
      case 'optimization-suggestions':
        return await getOptimizationSuggestions(client, searchParams);
      default:
        return await getLayoutList(client, searchParams);
    }
  } catch (error) {
    console.error('Layout error:', error);
    return NextResponse.json({ success: false, error: '获取排料数据失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { action, data } = body;

    switch (action) {
      case 'create':
        return await createLayout(client, data);
      case 'update':
        return await updateLayout(client, data);
      case 'upload-image':
        return await uploadLayoutImage(client, data);
      case 'calculate':
        return await calculateUtilization(client, data);
      case 'optimize':
        return await optimizeLayout(client, data);
      case 'save-scheme':
        return await saveLayoutScheme(client, data);
      case 'approve':
        return await approveLayout(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Layout operation error:', error);
    return NextResponse.json({ success: false, error: '排料操作失败' }, { status: 500 });
  }
}

/**
 * 获取排料列表
 */
async function getLayoutList(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');
  const status = searchParams.get('status') || 'all';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '20');

  let query = client
    .from('fabric_layouts')
    .select(`
      id,
      layout_no,
      layout_name,
      fabric_type,
      fabric_width,
      fabric_length,
      utilization_rate,
      waste_rate,
      status,
      created_at,
      approved_at,
      production_orders (
        id,
        order_code,
        customers (name)
      ),
      styles (
        id,
        style_no,
        style_name
      ),
      creator:users (name)
    `)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (orderId) {
    query = query.eq('order_id', orderId);
  }

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: layouts, error, count } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: {
      layouts,
      pagination: {
        page,
        pageSize,
        total: count || 0
      }
    }
  });
}

/**
 * 获取排料详情
 */
async function getLayoutDetail(client: any, layoutId: string | null) {
  if (!layoutId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少排料ID' 
    }, { status: 400 });
  }

  const { data: layout, error } = await client
    .from('fabric_layouts')
    .select(`
      *,
      production_orders (
        id,
        order_code,
        total_quantity,
        customers (name)
      ),
      styles (
        id,
        style_no,
        style_name
      ),
      layout_pieces (
        id,
        piece_name,
        piece_count,
        piece_area,
        position_x,
        position_y,
        rotation,
        grain_direction
      ),
      layout_schemes (
        id,
        scheme_name,
        utilization_rate,
        waste_rate,
        estimated_cost,
        is_recommended,
        created_at
      ),
      layout_images (
        id,
        image_url,
        image_type,
        description
      )
    `)
    .eq('id', layoutId)
    .single();

  if (error) throw error;

  if (!layout) {
    return NextResponse.json({ 
      success: false, 
      error: '排料记录不存在' 
    }, { status: 404 });
  }

  // 计算节省金额
  const savings = calculateSavings(layout);

  return NextResponse.json({
    success: true,
    data: {
      layout,
      savings
    }
  });
}

/**
 * 创建排料方案
 */
async function createLayout(client: any, data: any) {
  const {
    orderId,
    styleId,
    layoutName,
    fabricType,
    fabricWidth,
    fabricLength,
    fabricPrice,
    pieces,
    createdBy
  } = data;

  // 生成排料编号
  const layoutNo = `FL${Date.now().toString(36).toUpperCase()}`;

  // 计算利用率
  const totalPieceArea = pieces.reduce((sum: number, p: any) => sum + p.pieceArea * p.pieceCount, 0);
  const totalFabricArea = fabricWidth * fabricLength;
  const utilizationRate = Math.round(totalPieceArea / totalFabricArea * 10000) / 100;
  const wasteRate = 100 - utilizationRate;

  const { data: layout, error } = await client
    .from('fabric_layouts')
    .insert({
      layout_no: layoutNo,
      layout_name: layoutName,
      order_id: orderId,
      style_id: styleId,
      fabric_type: fabricType,
      fabric_width: fabricWidth,
      fabric_length: fabricLength,
      fabric_price: fabricPrice,
      total_piece_area: totalPieceArea,
      utilization_rate: utilizationRate,
      waste_rate: wasteRate,
      status: 'draft',
      created_by: createdBy,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // 保存裁片信息
  if (pieces && pieces.length > 0) {
    await client
      .from('layout_pieces')
      .insert(pieces.map((p: any) => ({
        layout_id: layout.id,
        piece_name: p.pieceName,
        piece_count: p.pieceCount,
        piece_area: p.pieceArea,
        position_x: p.positionX,
        position_y: p.positionY,
        rotation: p.rotation,
        grain_direction: p.grainDirection
      })));
  }

  return NextResponse.json({
    success: true,
    data: layout,
    message: '排料方案已创建'
  });
}

/**
 * 计算利用率
 */
async function calculateUtilization(client: any, data: any) {
  const { fabricWidth, fabricLength, pieces } = data;

  // 总面料面积
  const totalFabricArea = fabricWidth * fabricLength;

  // 总裁片面积
  let totalPieceArea = 0;
  pieces.forEach((p: any) => {
    totalPieceArea += p.pieceArea * p.pieceCount;
  });

  // 利用率
  const utilizationRate = Math.round(totalPieceArea / totalFabricArea * 10000) / 100;

  // 废料面积
  const wasteArea = totalFabricArea - totalPieceArea;
  const wasteRate = Math.round((1 - totalPieceArea / totalFabricArea) * 10000) / 100;

  // 分析各裁片占比
  const pieceAnalysis = pieces.map((p: any) => ({
    name: p.pieceName,
    area: p.pieceArea * p.pieceCount,
    percentage: Math.round(p.pieceArea * p.pieceCount / totalPieceArea * 100)
  }));

  return NextResponse.json({
    success: true,
    data: {
      totalFabricArea,
      totalPieceArea,
      wasteArea,
      utilizationRate,
      wasteRate,
      pieceAnalysis,
      isGoodLayout: utilizationRate >= 82, // 行业标准82%
      recommendation: getLayoutRecommendation(utilizationRate)
    }
  });
}

/**
 * 优化排料建议
 */
async function optimizeLayout(client: any, data: any) {
  const { pieces, fabricWidth, targetUtilization } = data;

  // 简单优化算法（实际生产中会使用更复杂的算法）
  const suggestions: any[] = [];

  // 1. 检查裁片方向
  const directionalPieces = pieces.filter((p: any) => p.grainDirection === 'warp');
  if (directionalPieces.length > pieces.length * 0.8) {
    suggestions.push({
      type: 'direction',
      priority: 'high',
      suggestion: '大部分裁片需要顺纹，考虑使用更宽的面料',
      potentialImprovement: '2-5%'
    });
  }

  // 2. 检查裁片尺寸
  const largePieces = pieces.filter((p: any) => p.pieceArea > fabricWidth * 0.5);
  if (largePieces.length > 0) {
    suggestions.push({
      type: 'size',
      priority: 'medium',
      suggestion: `有${largePieces.length}个大型裁片，建议分开排料`,
      potentialImprovement: '3-8%'
    });
  }

  // 3. 排序建议
  suggestions.push({
    type: 'sorting',
    priority: 'low',
    suggestion: '建议按面积从大到小排列裁片',
    potentialImprovement: '1-3%'
  });

  // 4. 嵌套建议
  const smallPieces = pieces.filter((p: any) => p.pieceArea < fabricWidth * 0.1);
  if (smallPieces.length > 5) {
    suggestions.push({
      type: 'nesting',
      priority: 'medium',
      suggestion: `有${smallPieces.length}个小裁片，可以考虑嵌套在大裁片空隙中`,
      potentialImprovement: '2-4%'
    });
  }

  // 计算预估优化后利用率
  const currentUtilization = pieces.reduce((sum: number, p: any) => sum + p.pieceArea * p.pieceCount, 0) / 
    (fabricWidth * data.fabricLength) * 100;
  const estimatedImprovement = suggestions.reduce((sum: number, s: any) => {
    const match = s.potentialImprovement?.match(/(\d+)-(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  return NextResponse.json({
    success: true,
    data: {
      suggestions,
      currentUtilization: Math.round(currentUtilization * 100) / 100,
      estimatedOptimalUtilization: Math.min(95, currentUtilization + estimatedImprovement),
      potentialSaving: `每100米面料可节省 ${Math.round(estimatedImprovement)} 米`
    }
  });
}

/**
 * 方案对比
 */
async function compareLayouts(client: any, searchParams: URLSearchParams) {
  const layoutIds = searchParams.get('ids')?.split(',') || [];

  if (layoutIds.length < 2) {
    return NextResponse.json({ 
      success: false, 
      error: '需要至少2个排料方案进行对比' 
    }, { status: 400 });
  }

  const { data: layouts, error } = await client
    .from('fabric_layouts')
    .select(`
      id,
      layout_no,
      layout_name,
      fabric_type,
      fabric_width,
      fabric_length,
      utilization_rate,
      waste_rate,
      fabric_price,
      total_piece_area,
      layout_pieces (piece_name, piece_count, piece_area)
    `)
    .in('id', layoutIds);

  if (error) throw error;

  // 对比分析
  const comparison = layouts.map((layout: any) => {
    const fabricCost = (layout.fabric_width * layout.fabric_length / 10000) * (layout.fabric_price || 50);
    const wasteCost = fabricCost * (layout.waste_rate / 100);

    return {
      id: layout.id,
      layoutNo: layout.layout_no,
      layoutName: layout.layout_name,
      utilizationRate: layout.utilization_rate,
      wasteRate: layout.waste_rate,
      fabricCost: Math.round(fabricCost * 100) / 100,
      wasteCost: Math.round(wasteCost * 100) / 100,
      pieceCount: layout.layout_pieces?.reduce((sum: number, p: any) => sum + p.piece_count, 0) || 0
    };
  });

  // 找出最优方案
  const best = comparison.reduce((prev: any, current: any) => 
    current.utilizationRate > prev.utilizationRate ? current : prev
  );

  // 计算节省
  const worst = comparison.reduce((prev: any, current: any) => 
    current.utilizationRate < prev.utilizationRate ? current : prev
  );

  const savingsPerPiece = worst.wasteCost - best.wasteCost;

  return NextResponse.json({
    success: true,
    data: {
      comparison,
      best,
      worst,
      savingsPerPiece: Math.round(savingsPerPiece * 100) / 100,
      recommendation: `推荐使用 ${best.layoutName}，利用率 ${best.utilizationRate}%`
    }
  });
}

/**
 * 利用率报告
 */
async function getUtilizationReport(client: any, searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'month';
  const dateRange = getDateRange(period);

  const { data: layouts } = await client
    .from('fabric_layouts')
    .select(`
      id,
      utilization_rate,
      waste_rate,
      fabric_type,
      total_piece_area,
      fabric_width,
      fabric_length,
      fabric_price,
      production_orders (order_code)
    `)
    .gte('created_at', `${dateRange.start}T00:00:00Z`);

  const total = layouts?.length || 0;

  // 平均利用率
  const avgUtilization = layouts && layouts.length > 0
    ? Math.round(layouts.reduce((sum: number, l: any) => sum + l.utilization_rate, 0) / layouts.length * 100) / 100
    : 0;

  // 按面料类型统计
  const byFabricType: Record<string, { count: number; avgUtilization: number; totalArea: number }> = {};
  layouts?.forEach((l: any) => {
    const type = l.fabric_type || '其他';
    if (!byFabricType[type]) {
      byFabricType[type] = { count: 0, avgUtilization: 0, totalArea: 0 };
    }
    byFabricType[type].count++;
    byFabricType[type].avgUtilization += l.utilization_rate;
    byFabricType[type].totalArea += l.fabric_width * l.fabric_length;
  });

  Object.keys(byFabricType).forEach(type => {
    byFabricType[type].avgUtilization = Math.round(byFabricType[type].avgUtilization / byFabricType[type].count * 100) / 100;
  });

  // 利用率分布
  const distribution = {
    excellent: layouts?.filter((l: any) => l.utilization_rate >= 90).length || 0,  // 90%以上
    good: layouts?.filter((l: any) => l.utilization_rate >= 82 && l.utilization_rate < 90).length || 0, // 82-90%
    average: layouts?.filter((l: any) => l.utilization_rate >= 75 && l.utilization_rate < 82).length || 0, // 75-82%
    poor: layouts?.filter((l: any) => l.utilization_rate < 75).length || 0 // 75%以下
  };

  // 计算节省潜力
  const targetUtilization = 85; // 目标利用率
  const potentialSavings = layouts?.reduce((sum: number, l: any) => {
    if (l.utilization_rate < targetUtilization) {
      const currentWaste = (l.fabric_width * l.fabric_length) * (1 - l.utilization_rate / 100);
      const targetWaste = (l.fabric_width * l.fabric_length) * (1 - targetUtilization / 100);
      return sum + (currentWaste - targetWaste) * (l.fabric_price || 50) / 10000;
    }
    return sum;
  }, 0) || 0;

  return NextResponse.json({
    success: true,
    data: {
      period,
      dateRange,
      total,
      avgUtilization,
      byFabricType: Object.entries(byFabricType).map(([type, data]) => ({ type, ...data })),
      distribution,
      potentialSavings: Math.round(potentialSavings * 100) / 100,
      industryBenchmark: 82
    }
  });
}

/**
 * 成本分析
 */
async function getCostAnalysis(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少订单ID' 
    }, { status: 400 });
  }

  // 获取订单排料
  const { data: layouts } = await client
    .from('fabric_layouts')
    .select(`
      id,
      layout_no,
      utilization_rate,
      waste_rate,
      fabric_width,
      fabric_length,
      fabric_price,
      fabric_type
    `)
    .eq('order_id', orderId);

  // 获取订单数量
  const { data: order } = await client
    .from('production_orders')
    .select('total_quantity')
    .eq('id', orderId)
    .single();

  const orderQuantity = order?.total_quantity || 1;

  // 计算面料成本
  let totalFabricCost = 0;
  let totalWasteCost = 0;

  layouts?.forEach((l: any) => {
    const fabricArea = l.fabric_width * l.fabric_length / 10000; // 转换为平方米
    const fabricCost = fabricArea * (l.fabric_price || 50);
    const wasteCost = fabricCost * (l.waste_rate / 100);

    totalFabricCost += fabricCost;
    totalWasteCost += wasteCost;
  });

  // 单件成本
  const costPerPiece = {
    fabric: Math.round(totalFabricCost / orderQuantity * 100) / 100,
    waste: Math.round(totalWasteCost / orderQuantity * 100) / 100
  };

  // 优化建议
  const avgUtilization = layouts && layouts.length > 0
    ? layouts.reduce((sum: number, l: any) => sum + l.utilization_rate, 0) / layouts.length
    : 0;

  const optimization = {
    currentWaste: costPerPiece.waste,
    potentialSavings: 0,
    recommendations: [] as string[]
  };

  if (avgUtilization < 82) {
    optimization.potentialSavings = Math.round((costPerPiece.waste * (82 - avgUtilization) / 100) * 100) / 100;
    optimization.recommendations = [
      '优化排料方案可节省面料成本',
      `预计每件可节省 ${optimization.potentialSavings} 元`,
      '建议使用自动排料优化工具'
    ];
  }

  return NextResponse.json({
    success: true,
    data: {
      orderId,
      layouts,
      totalFabricCost: Math.round(totalFabricCost * 100) / 100,
      totalWasteCost: Math.round(totalWasteCost * 100) / 100,
      costPerPiece,
      optimization
    }
  });
}

/**
 * 优化建议
 */
async function getOptimizationSuggestions(client: any, searchParams: URLSearchParams) {
  const { data: lowUtilizationLayouts } = await client
    .from('fabric_layouts')
    .select(`
      id,
      layout_no,
      layout_name,
      utilization_rate,
      fabric_type,
      fabric_width,
      fabric_length,
      production_orders (order_code)
    `)
    .lt('utilization_rate', 80)
    .order('utilization_rate', { ascending: true })
    .limit(10);

  const suggestions = lowUtilizationLayouts?.map((layout: any) => {
    const improvement = 85 - layout.utilization_rate;
    const fabricArea = layout.fabric_width * layout.fabric_length / 10000;
    const potentialSaving = fabricArea * 50 * (improvement / 100);

    return {
      layoutId: layout.id,
      layoutNo: layout.layout_no,
      layoutName: layout.layout_name,
      orderCode: layout.production_orders?.order_code,
      currentUtilization: layout.utilization_rate,
      targetUtilization: 85,
      potentialSaving: Math.round(potentialSaving * 100) / 100,
      priority: layout.utilization_rate < 70 ? 'high' : layout.utilization_rate < 75 ? 'medium' : 'low'
    };
  }) || [];

  return NextResponse.json({
    success: true,
    data: {
      suggestions,
      summary: {
        totalLowUtilization: suggestions.length,
        highPriority: suggestions.filter((s: any) => s.priority === 'high').length,
        potentialTotalSaving: Math.round(suggestions.reduce((sum: number, s: any) => sum + s.potentialSaving, 0) * 100) / 100
      }
    }
  });
}

/**
 * 获取订单排料方案
 */
async function getLayoutsByOrder(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少订单ID' 
    }, { status: 400 });
  }

  const { data: layouts, error } = await client
    .from('fabric_layouts')
    .select(`
      id,
      layout_no,
      layout_name,
      fabric_type,
      utilization_rate,
      waste_rate,
      status,
      created_at,
      approved_at,
      layout_pieces (
        piece_name,
        piece_count,
        piece_area
      )
    `)
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: {
      layouts,
      summary: {
        total: layouts?.length || 0,
        approved: layouts?.filter((l: any) => l.status === 'approved').length || 0,
        bestUtilization: layouts && layouts.length > 0
          ? Math.max(...layouts.map((l: any) => l.utilization_rate))
          : 0
      }
    }
  });
}

/**
 * 保存排料方案
 */
async function saveLayoutScheme(client: any, data: any) {
  const { layoutId, schemeName, pieces, utilizationRate, estimatedCost } = data;

  const { data: scheme, error } = await client
    .from('layout_schemes')
    .insert({
      layout_id: layoutId,
      scheme_name: schemeName,
      utilization_rate: utilizationRate,
      waste_rate: 100 - utilizationRate,
      estimated_cost: estimatedCost,
      is_recommended: false,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: scheme,
    message: '方案已保存'
  });
}

/**
 * 批准排料方案
 */
async function approveLayout(client: any, data: any) {
  const { layoutId, approvedBy, notes } = data;

  const { data: layout, error } = await client
    .from('fabric_layouts')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      approval_notes: notes
    })
    .eq('id', layoutId)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: layout,
    message: '排料方案已批准'
  });
}

/**
 * 上传排料图
 */
async function uploadLayoutImage(client: any, data: any) {
  const { layoutId, imageUrl, imageType, description } = data;

  const { data: image, error } = await client
    .from('layout_images')
    .insert({
      layout_id: layoutId,
      image_url: imageUrl,
      image_type: imageType,
      description
    })
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: image
  });
}

async function updateLayout(client: any, data: any) {
  const { layoutId, updates } = data;

  const { data: layout, error } = await client
    .from('fabric_layouts')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', layoutId)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: layout
  });
}

function calculateSavings(layout: any): any {
  const benchmarkUtilization = 82; // 行业标准
  const improvement = layout.utilization_rate - benchmarkUtilization;

  if (improvement <= 0) {
    return {
      hasSavings: false,
      message: '当前利用率低于行业标准'
    };
  }

  const fabricArea = layout.fabric_width * layout.fabric_length / 10000;
  const savingsPerPiece = fabricArea * (layout.fabric_price || 50) * (improvement / 100);

  return {
    hasSavings: true,
    improvementRate: improvement,
    savingsPerPiece: Math.round(savingsPerPiece * 100) / 100,
    message: `比行业标准节省 ${improvement}%`
  };
}

function getLayoutRecommendation(utilizationRate: number): string {
  if (utilizationRate >= 90) {
    return '优秀！利用率超过90%，继续保持';
  } else if (utilizationRate >= 82) {
    return '良好！达到行业标准，可以进一步优化';
  } else if (utilizationRate >= 75) {
    return '一般，建议优化排料方案';
  } else {
    return '需要改进，利用率低于75%会造成较大浪费';
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
    default:
      now.setDate(now.getDate() - 30);
      start = now.toISOString().split('T')[0];
  }

  return { start, end };
}

async function getLayoutStatistics(client: any, searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'month';
  const dateRange = getDateRange(period);

  const { data: layouts } = await client
    .from('fabric_layouts')
    .select('utilization_rate, waste_rate, fabric_type, status')
    .gte('created_at', `${dateRange.start}T00:00:00Z`);

  const total = layouts?.length || 0;
  const avgUtilization = layouts && layouts.length > 0
    ? Math.round(layouts.reduce((sum: number, l: any) => sum + l.utilization_rate, 0) / layouts.length * 100) / 100
    : 0;

  return NextResponse.json({
    success: true,
    data: {
      total,
      avgUtilization,
      avgWaste: 100 - avgUtilization
    }
  });
}
