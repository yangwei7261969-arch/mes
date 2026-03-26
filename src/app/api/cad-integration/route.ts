import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * CAD对接与智能排料API
 * 
 * 功能：
 * • CAD文件解析（Gerber/Lectra格式）
 * • 版片数据提取
 * • 智能排料优化
 * • 用料计算
 * • 排料方案生成
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await listPatterns(client, searchParams);
      case 'detail':
        return await getPatternDetail(client, searchParams);
      case 'marker-list':
        return await listMarkers(client, searchParams);
      case 'marker-detail':
        return await getMarkerDetail(client, searchParams);
      case 'calculate-fabric':
        return await calculateFabric(client, searchParams);
      case 'optimization-suggestions':
        return await getOptimizationSuggestions(client, searchParams);
      case 'export':
        return await exportMarker(client, searchParams);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('CAD API error:', error);
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'upload-pattern':
        return await uploadPattern(client, data);
      case 'parse-cad':
        return await parseCADFile(client, data);
      case 'create-marker':
        return await createMarker(client, data);
      case 'optimize-marker':
        return await optimizeMarker(client, data);
      case 'save-marker':
        return await saveMarker(client, data);
      case 'generate-report':
        return await generateMarkerReport(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('CAD operation error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}

/**
 * 版片列表
 */
async function listPatterns(client: any, searchParams: URLSearchParams) {
  const styleId = searchParams.get('style_id');

  let query = client
    .from('pattern_pieces')
    .select('*')
    .order('created_at', { ascending: false });

  if (styleId) {
    query = query.eq('style_id', styleId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // 按款式分组
  const byStyle: Record<string, any[]> = {};
  data?.forEach((p: any) => {
    const key = p.style_id || 'unknown';
    if (!byStyle[key]) {
      byStyle[key] = [];
    }
    byStyle[key].push(p);
  });

  return NextResponse.json({
    success: true,
    data: {
      patterns: data || [],
      byStyle,
      total: data?.length || 0
    }
  });
}

/**
 * 版片详情
 */
async function getPatternDetail(client: any, searchParams: URLSearchParams) {
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: '缺少版片ID' }, { status: 400 });
  }

  const { data: pattern, error } = await client
    .from('pattern_pieces')
    .select(`
      *,
      styles (id, style_no, style_name)
    `)
    .eq('id', id)
    .single();

  if (error || !pattern) {
    return NextResponse.json({ success: false, error: '版片不存在' }, { status: 404 });
  }

  // 获取相关排料方案
  const { data: markers } = await client
    .from('marker_plans')
    .select('*')
    .contains('pattern_ids', [id]);

  return NextResponse.json({
    success: true,
    data: {
      pattern,
      relatedMarkers: markers || []
    }
  });
}

/**
 * 排料方案列表
 */
async function listMarkers(client: any, searchParams: URLSearchParams) {
  const styleId = searchParams.get('style_id');
  const status = searchParams.get('status');

  let query = client
    .from('marker_plans')
    .select(`
      *,
      styles (id, style_no, style_name)
    `)
    .order('created_at', { ascending: false });

  if (styleId) {
    query = query.eq('style_id', styleId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;

  // 统计利用率
  const stats = {
    total: data?.length || 0,
    avgUtilization: data?.length 
      ? Math.round(data.reduce((sum: number, m: any) => sum + (m.utilization_rate || 0), 0) / data.length) 
      : 0,
    highUtilization: data?.filter((m: any) => (m.utilization_rate || 0) >= 90).length || 0
  };

  return NextResponse.json({
    success: true,
    data: {
      markers: data || [],
      stats
    }
  });
}

/**
 * 排料方案详情
 */
async function getMarkerDetail(client: any, searchParams: URLSearchParams) {
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: '缺少排料ID' }, { status: 400 });
  }

  const { data: marker, error } = await client
    .from('marker_plans')
    .select(`
      *,
      styles (id, style_no, style_name),
      marker_pieces (*)
    `)
    .eq('id', id)
    .single();

  if (error || !marker) {
    return NextResponse.json({ success: false, error: '排料方案不存在' }, { status: 404 });
  }

  // 计算详细统计
  const totalPieces = marker.marker_pieces?.length || 0;
  const sizes = new Set(marker.marker_pieces?.map((p: any) => p.size));
  const colors = new Set(marker.marker_pieces?.map((p: any) => p.color));

  return NextResponse.json({
    success: true,
    data: {
      marker,
      statistics: {
        totalPieces,
        sizes: Array.from(sizes),
        colors: Array.from(colors),
        fabricLength: marker.fabric_length,
        fabricWidth: marker.fabric_width,
        utilizationRate: marker.utilization_rate
      }
    }
  });
}

/**
 * 计算用料
 */
async function calculateFabric(client: any, searchParams: URLSearchParams) {
  const styleId = searchParams.get('style_id');
  const quantity = parseInt(searchParams.get('quantity') || '100');
  const sizes = searchParams.get('sizes')?.split(',') || [];

  if (!styleId) {
    return NextResponse.json({ success: false, error: '缺少款式ID' }, { status: 400 });
  }

  // 获取款式信息
  const { data: style } = await client
    .from('styles')
    .select('*')
    .eq('id', styleId)
    .single();

  // 获取版片
  const { data: patterns } = await client
    .from('pattern_pieces')
    .select('*')
    .eq('style_id', styleId);

  if (!patterns || patterns.length === 0) {
    return NextResponse.json({ success: false, error: '缺少版片数据' }, { status: 400 });
  }

  // 计算总面积
  const totalArea = patterns.reduce((sum: number, p: any) => {
    const area = (p.area || 0) * (p.quantity_per_garment || 1);
    return sum + area;
  }, 0);

  // 获取面料信息
  const fabricWidth = style?.fabric_width || 150; // cm
  const targetUtilization = 0.88; // 目标利用率88%

  // 计算所需面料长度
  const fabricLengthPerPiece = totalArea / (fabricWidth * targetUtilization);
  const totalFabricLength = fabricLengthPerPiece * quantity;

  // 添加损耗
  const wasteRate = 0.02; // 2%损耗
  const totalWithWaste = totalFabricLength * (1 + wasteRate);

  // 计算成本
  const fabricPrice = style?.fabric_price || 30; // 元/米
  const totalCost = (totalWithWaste / 100) * fabricPrice;

  return NextResponse.json({
    success: true,
    data: {
      calculation: {
        totalArea,
        fabricWidth,
        targetUtilization,
        fabricLengthPerPiece: Math.round(fabricLengthPerPiece * 100) / 100,
        quantity,
        totalFabricLength: Math.round(totalFabricLength * 100) / 100,
        wasteRate,
        totalWithWaste: Math.round(totalWithWaste * 100) / 100
      },
      cost: {
        fabricPrice,
        totalCost: Math.round(totalCost * 100) / 100,
        costPerPiece: Math.round((totalCost / quantity) * 100) / 100
      },
      optimization: {
        potentialSaving: Math.round((1 - targetUtilization) * totalCost * 100) / 100,
        recommendations: generateFabricRecommendations(targetUtilization, patterns)
      }
    }
  });
}

/**
 * 优化建议
 */
async function getOptimizationSuggestions(client: any, searchParams: URLSearchParams) {
  const markerId = searchParams.get('marker_id');
  const styleId = searchParams.get('style_id');

  if (markerId) {
    const { data: marker } = await client
      .from('marker_plans')
      .select('*')
      .eq('id', markerId)
      .single();

    if (!marker) {
      return NextResponse.json({ success: false, error: '排料方案不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: analyzeMarkerOptimization(marker)
    });
  }

  if (styleId) {
    const { data: markers } = await client
      .from('marker_plans')
      .select('*')
      .eq('style_id', styleId);

    const suggestions = (markers || []).map((m: any) => ({
      markerId: m.id,
      markerName: m.name,
      currentUtilization: m.utilization_rate,
      potentialImprovement: (0.92 - (m.utilization_rate || 0)) * 100,
      suggestions: analyzeMarkerOptimization(m).suggestions
    }));

    return NextResponse.json({
      success: true,
      data: {
        markers: suggestions,
        summary: {
          avgUtilization: suggestions.length 
            ? suggestions.reduce((sum: number, s: any) => sum + s.currentUtilization, 0) / suggestions.length 
            : 0,
          improvementPotential: suggestions.reduce((sum: number, s: any) => sum + s.potentialImprovement, 0)
        }
      }
    });
  }

  return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
}

/**
 * 导出排料
 */
async function exportMarker(client: any, searchParams: URLSearchParams) {
  const id = searchParams.get('id');
  const format = searchParams.get('format') || 'json'; // json, dxf, plt

  if (!id) {
    return NextResponse.json({ success: false, error: '缺少排料ID' }, { status: 400 });
  }

  const { data: marker } = await client
    .from('marker_plans')
    .select(`
      *,
      marker_pieces (*)
    `)
    .eq('id', id)
    .single();

  if (!marker) {
    return NextResponse.json({ success: false, error: '排料方案不存在' }, { status: 404 });
  }

  // 生成导出数据
  const exportData = generateExportData(marker, format);

  return NextResponse.json({
    success: true,
    data: {
      format,
      content: exportData,
      filename: `marker_${marker.id}_${Date.now()}.${format}`,
      generatedAt: new Date().toISOString()
    }
  });
}

/**
 * 上传版片
 */
async function uploadPattern(client: any, data: any) {
  const { styleId, fileData, fileName, fileType } = data;

  // 记录上传
  const upload = {
    style_id: styleId,
    file_name: fileName,
    file_type: fileType,
    file_data: fileData,
    status: 'uploaded',
    created_at: new Date().toISOString()
  };

  const { data: uploaded, error } = await client
    .from('pattern_uploads')
    .insert(upload)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: {
      upload: uploaded,
      message: '文件上传成功，请调用parse-cad进行解析'
    }
  });
}

/**
 * 解析CAD文件
 */
async function parseCADFile(client: any, data: any) {
  const { uploadId, fileData, fileType } = data;

  // 模拟CAD解析（实际应用中需要专业解析库）
  const parseResult = await simulateCADParsing(fileData, fileType);

  if (!parseResult.success) {
    return NextResponse.json({
      success: false,
      error: parseResult.error || '解析失败'
    }, { status: 400 });
  }

  // 保存解析结果
  const { data: parsed, error } = await client
    .from('pattern_pieces')
    .insert(parseResult.pieces)
    .select();

  if (error) throw error;

  // 更新上传状态
  await client
    .from('pattern_uploads')
    .update({ 
      status: 'parsed',
      parsed_at: new Date().toISOString()
    })
    .eq('id', uploadId);

  return NextResponse.json({
    success: true,
    data: {
      pieces: parsed,
      summary: {
        totalPieces: parseResult.pieces.length,
        totalArea: parseResult.totalArea,
        fabricType: parseResult.fabricType
      },
      message: 'CAD文件解析成功'
    }
  });
}

/**
 * 创建排料方案
 */
async function createMarker(client: any, data: any) {
  const { styleId, patternIds, sizes, fabricWidth, fabricLength, options } = data;

  // 获取版片
  const { data: patterns } = await client
    .from('pattern_pieces')
    .select('*')
    .in('id', patternIds);

  if (!patterns || patterns.length === 0) {
    return NextResponse.json({ success: false, error: '缺少版片数据' }, { status: 400 });
  }

  // 创建排料方案
  const marker = {
    style_id: styleId,
    name: `排料方案_${Date.now()}`,
    fabric_width: fabricWidth || 150,
    fabric_length: fabricLength || 0,
    pattern_ids: patternIds,
    sizes,
    options,
    status: 'draft',
    utilization_rate: 0,
    created_at: new Date().toISOString()
  };

  const { data: created, error } = await client
    .from('marker_plans')
    .insert(marker)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: created,
    message: '排料方案已创建，请调用optimize-marker进行优化'
  });
}

/**
 * 优化排料
 */
async function optimizeMarker(client: any, data: any) {
  const { markerId, optimizationLevel, constraints } = data;

  // 获取排料方案
  const { data: marker } = await client
    .from('marker_plans')
    .select(`
      *,
      pattern_pieces (*)
    `)
    .eq('id', markerId)
    .single();

  if (!marker) {
    return NextResponse.json({ success: false, error: '排料方案不存在' }, { status: 404 });
  }

  // 执行优化算法（模拟）
  const optimization = await performMarkerOptimization(marker, optimizationLevel, constraints);

  // 更新排料方案
  const { data: updated, error } = await client
    .from('marker_plans')
    .update({
      utilization_rate: optimization.utilizationRate,
      fabric_length: optimization.fabricLength,
      marker_pieces: optimization.pieces,
      optimization_log: optimization.log,
      status: 'optimized',
      updated_at: new Date().toISOString()
    })
    .eq('id', markerId)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: {
      marker: updated,
      optimization: {
        previousUtilization: marker.utilization_rate || 0,
        newUtilization: optimization.utilizationRate,
        improvement: optimization.utilizationRate - (marker.utilization_rate || 0),
        fabricSaved: optimization.fabricSaved,
        costSaved: optimization.costSaved
      },
      message: '排料优化完成'
    }
  });
}

/**
 * 保存排料
 */
async function saveMarker(client: any, data: any) {
  const { markerId, pieces, name } = data;

  const { data: updated, error } = await client
    .from('marker_plans')
    .update({
      name,
      marker_pieces: pieces,
      status: 'saved',
      updated_at: new Date().toISOString()
    })
    .eq('id', markerId)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: updated,
    message: '排料方案已保存'
  });
}

/**
 * 生成报告
 */
async function generateMarkerReport(client: any, data: any) {
  const { markerId, reportType } = data;

  const { data: marker } = await client
    .from('marker_plans')
    .select(`
      *,
      styles (style_no, style_name),
      marker_pieces (*)
    `)
    .eq('id', markerId)
    .single();

  if (!marker) {
    return NextResponse.json({ success: false, error: '排料方案不存在' }, { status: 404 });
  }

  const report = {
    markerId: marker.id,
    markerName: marker.name,
    style: marker.styles,
    createdAt: marker.created_at,
    summary: {
      fabricWidth: marker.fabric_width,
      fabricLength: marker.fabric_length,
      utilizationRate: marker.utilization_rate,
      totalPieces: marker.marker_pieces?.length || 0
    },
    details: generateDetailedReport(marker, reportType),
    costAnalysis: calculateCostAnalysis(marker),
    generatedAt: new Date().toISOString()
  };

  return NextResponse.json({
    success: true,
    data: report
  });
}

// 辅助函数
async function simulateCADParsing(fileData: any, fileType: string): Promise<any> {
  // 模拟解析结果
  const pieces = [
    { name: '前片', area: 0.25, quantity_per_garment: 2, grain_angle: 0 },
    { name: '后片', area: 0.28, quantity_per_garment: 1, grain_angle: 0 },
    { name: '袖片', area: 0.15, quantity_per_garment: 2, grain_angle: 5 },
    { name: '领片', area: 0.05, quantity_per_garment: 1, grain_angle: 0 },
    { name: '口袋', area: 0.03, quantity_per_garment: 2, grain_angle: 0 }
  ];

  return {
    success: true,
    pieces: pieces.map((p, i) => ({
      ...p,
      id: `piece_${i}`,
      created_at: new Date().toISOString()
    })),
    totalArea: pieces.reduce((sum, p) => sum + p.area * p.quantity_per_garment, 0),
    fabricType: 'knit'
  };
}

async function performMarkerOptimization(marker: any, level: string, constraints: any): Promise<any> {
  // 模拟优化算法
  const baseUtilization = 0.85;
  const improvement = level === 'high' ? 0.05 : level === 'medium' ? 0.03 : 0.01;
  const targetUtilization = Math.min(0.95, baseUtilization + improvement);

  // 计算优化结果
  const totalArea = marker.pattern_pieces?.reduce((sum: number, p: any) => sum + (p.area || 0), 0) || 0;
  const fabricWidth = marker.fabric_width || 150;
  const optimizedLength = totalArea / (fabricWidth * targetUtilization / 100);
  const originalLength = totalArea / (fabricWidth * 0.80);

  return {
    utilizationRate: targetUtilization,
    fabricLength: optimizedLength,
    pieces: marker.pattern_pieces?.map((p: any, i: number) => ({
      ...p,
      position: { x: Math.random() * 100, y: Math.random() * 200 },
      rotation: Math.random() * 10 - 5
    })) || [],
    fabricSaved: originalLength - optimizedLength,
    costSaved: (originalLength - optimizedLength) * 30, // 假设30元/米
    log: `优化完成，利用率从80%提升到${(targetUtilization * 100).toFixed(1)}%`
  };
}

function analyzeMarkerOptimization(marker: any): any {
  const suggestions = [];
  const currentUtilization = marker.utilization_rate || 0;

  if (currentUtilization < 0.85) {
    suggestions.push({
      type: 'efficiency',
      priority: 'high',
      message: '利用率偏低，建议重新排料',
      potentialGain: `${((0.88 - currentUtilization) * 100).toFixed(1)}%`
    });
  }

  if (currentUtilization < 0.90) {
    suggestions.push({
      type: 'mix-size',
      priority: 'medium',
      message: '考虑混码排料提高利用率',
      potentialGain: '3-5%'
    });
  }

  suggestions.push({
    type: 'general',
    priority: 'low',
    message: '调整版片角度可进一步优化',
    potentialGain: '1-2%'
  });

  return {
    currentUtilization,
    suggestions,
    potentialImprovement: suggestions.reduce((sum, s) => {
      const match = s.potentialGain?.match(/(\d+\.?\d*)/);
      return sum + (match ? parseFloat(match[1]) : 0);
    }, 0)
  };
}

function generateFabricRecommendations(utilization: number, patterns: any[]): string[] {
  const recommendations = [];

  if (utilization < 0.85) {
    recommendations.push('优化排料方案，提高面料利用率');
  }

  const smallPieces = patterns.filter(p => (p.area || 0) < 0.05);
  if (smallPieces.length > 2) {
    recommendations.push('小部件可考虑使用边角料');
  }

  recommendations.push('考虑混码排料减少面料损耗');
  recommendations.push('与供应商沟通面料幅宽，选择最优规格');

  return recommendations;
}

function generateExportData(marker: any, format: string): any {
  if (format === 'json') {
    return {
      marker: marker,
      pieces: marker.marker_pieces,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
    };
  }

  // 其他格式返回基础数据
  return {
    markerId: marker.id,
    fabricWidth: marker.fabric_width,
    fabricLength: marker.fabric_length,
    utilization: marker.utilization_rate
  };
}

function generateDetailedReport(marker: any, reportType: string): any {
  return {
    pieceList: marker.marker_pieces?.map((p: any) => ({
      name: p.name,
      size: p.size,
      quantity: p.quantity,
      area: p.area
    })) || [],
    sizeDistribution: calculateSizeDistribution(marker.marker_pieces),
    fabricAnalysis: {
      totalArea: marker.fabric_length * marker.fabric_width,
      usedArea: marker.utilization_rate * marker.fabric_length * marker.fabric_width,
      waste: (1 - marker.utilization_rate) * marker.fabric_length * marker.fabric_width
    }
  };
}

function calculateCostAnalysis(marker: any): any {
  const fabricPrice = 30; // 元/米
  const fabricLength = marker.fabric_length || 0;
  const totalCost = fabricLength * fabricPrice;

  return {
    fabricCost: totalCost,
    costPerGarment: totalCost / (marker.marker_pieces?.length || 1),
    savingsFromOptimization: (1 - marker.utilization_rate) * totalCost * 0.5
  };
}

function calculateSizeDistribution(pieces: any[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  pieces?.forEach(p => {
    const size = p.size || 'default';
    distribution[size] = (distribution[size] || 0) + 1;
  });
  return distribution;
}
