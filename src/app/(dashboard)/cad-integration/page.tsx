'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  FileUp,
  Layers,
  Ruler,
  Percent,
  Download,
  Play,
  RefreshCw,
  Eye,
  Trash2,
  FileText,
  Palette,
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  Box,
  Grid,
  ZoomIn,
  RotateCw,
  Move,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatternPiece {
  id: string;
  name: string;
  style_id: string;
  area: number;
  quantity_per_garment: number;
  grain_angle: number;
  created_at: string;
}

interface MarkerPlan {
  id: string;
  name: string;
  style_id: string;
  fabric_width: number;
  fabric_length: number;
  utilization_rate: number;
  status: 'draft' | 'optimized' | 'saved' | 'exported';
  sizes: string[];
  created_at: string;
}

interface FabricCalculation {
  totalArea: number;
  fabricWidth: number;
  targetUtilization: number;
  fabricLengthPerPiece: number;
  quantity: number;
  totalFabricLength: number;
  wasteRate: number;
  totalWithWaste: number;
}

export default function CADIntegrationPage() {
  const [patterns, setPatterns] = useState<PatternPiece[]>([]);
  const [markers, setMarkers] = useState<MarkerPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState<PatternPiece | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MarkerPlan | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCreateMarkerDialog, setShowCreateMarkerDialog] = useState(false);
  const [showCalcDialog, setShowCalcDialog] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);

  // 新建排料方案表单
  const [newMarker, setNewMarker] = useState({
    styleId: '',
    name: '',
    fabricWidth: 150,
    sizes: '',
    patternIds: [] as string[],
  });

  // 用料计算
  const [calcParams, setCalcParams] = useState({
    styleId: '',
    quantity: 100,
    sizes: '',
  });
  const [calcResult, setCalcResult] = useState<{
    calculation: FabricCalculation;
    cost: { fabricPrice: number; totalCost: number; costPerPiece: number };
    optimization: { potentialSaving: number; recommendations: string[] };
  } | null>(null);

  useEffect(() => {
    fetchPatterns();
    fetchMarkers();
  }, []);

  const fetchPatterns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cad-integration?action=list');
      const result = await response.json();
      if (result.success) {
        setPatterns(result.data.patterns);
      }
    } catch (error) {
      console.error('Failed to fetch patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarkers = async () => {
    try {
      const response = await fetch('/api/cad-integration?action=marker-list');
      const result = await response.json();
      if (result.success) {
        setMarkers(result.data.markers);
      }
    } catch (error) {
      console.error('Failed to fetch markers:', error);
    }
  };

  const handleCreateMarker = async () => {
    try {
      const response = await fetch('/api/cad-integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-marker',
          data: {
            styleId: newMarker.styleId,
            name: newMarker.name,
            fabricWidth: newMarker.fabricWidth,
            sizes: newMarker.sizes.split(',').map(s => s.trim()),
            patternIds: newMarker.patternIds,
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShowCreateMarkerDialog(false);
        setNewMarker({ styleId: '', name: '', fabricWidth: 150, sizes: '', patternIds: [] });
        fetchMarkers();
      }
    } catch (error) {
      console.error('Failed to create marker:', error);
    }
  };

  const handleOptimizeMarker = async (markerId: string) => {
    try {
      setOptimizing(true);
      setOptimizationResult(null);

      const response = await fetch('/api/cad-integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize-marker',
          data: {
            markerId,
            optimizationLevel: 'high',
            constraints: {},
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        setOptimizationResult(result.data.optimization);
        fetchMarkers();
      }
    } catch (error) {
      console.error('Failed to optimize marker:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const handleCalculateFabric = async () => {
    try {
      const params = new URLSearchParams({
        action: 'calculate-fabric',
        style_id: calcParams.styleId,
        quantity: calcParams.quantity.toString(),
        sizes: calcParams.sizes,
      });

      const response = await fetch(`/api/cad-integration?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setCalcResult(result.data);
      }
    } catch (error) {
      console.error('Failed to calculate fabric:', error);
    }
  };

  const handleExportMarker = async (markerId: string, format: string) => {
    try {
      const params = new URLSearchParams({
        action: 'export',
        id: markerId,
        format,
      });

      const response = await fetch(`/api/cad-integration?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        // 创建下载
        const blob = new Blob([JSON.stringify(result.data.content, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.filename;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export marker:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      draft: { variant: 'outline', label: '草稿' },
      optimized: { variant: 'secondary', label: '已优化' },
      saved: { variant: 'default', label: '已保存' },
      exported: { variant: 'default', label: '已导出' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatArea = (area: number) => {
    return `${(area * 10000).toFixed(2)} cm²`;
  };

  const formatLength = (cm: number) => {
    return `${(cm / 100).toFixed(2)} m`;
  };

  // 统计数据
  const avgUtilization = markers.length > 0
    ? Math.round(markers.reduce((sum, m) => sum + (m.utilization_rate || 0), 0) / markers.length * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CAD集成管理</h1>
          <p className="text-muted-foreground">版片管理、智能排料优化、用料计算</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCalcDialog(true)}>
            <Calculator className="mr-2 h-4 w-4" />
            用料计算
          </Button>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button>
                <FileUp className="mr-2 h-4 w-4" />
                上传版片
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>上传CAD文件</DialogTitle>
                <DialogDescription>支持Gerber、Lectra等格式</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    拖放CAD文件到此处，或点击选择
                  </p>
                  <Input type="file" className="hidden" id="cad-file" accept=".dxf,.plt,.tmp" />
                  <Button variant="outline" onClick={() => document.getElementById('cad-file')?.click()}>
                    选择文件
                  </Button>
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    支持的格式：DXF、PLT、TMP (Gerber)。文件将自动解析并提取版片信息。
                  </AlertDescription>
                </Alert>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">版片数量</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patterns.length}</div>
            <p className="text-xs text-muted-foreground">已导入版片</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">排料方案</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{markers.length}</div>
            <p className="text-xs text-muted-foreground">已创建方案</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均利用率</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUtilization}%</div>
            <Progress value={avgUtilization} className="mt-2 h-1" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">高利用率方案</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {markers.filter(m => (m.utilization_rate || 0) >= 0.9).length}
            </div>
            <p className="text-xs text-muted-foreground">利用率≥90%</p>
          </CardContent>
        </Card>
      </div>

      {/* 主内容 */}
      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patterns">版片管理</TabsTrigger>
          <TabsTrigger value="markers">排料方案</TabsTrigger>
          <TabsTrigger value="optimization">智能优化</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>版片列表</CardTitle>
                  <CardDescription>管理已导入的CAD版片</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchPatterns}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  刷新
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>版片名称</TableHead>
                    <TableHead>面积</TableHead>
                    <TableHead>每件数量</TableHead>
                    <TableHead>纱向角度</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : patterns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        暂无版片数据，请上传CAD文件
                      </TableCell>
                    </TableRow>
                  ) : (
                    patterns.map((pattern) => (
                      <TableRow key={pattern.id}>
                        <TableCell className="font-medium">{pattern.name}</TableCell>
                        <TableCell>{formatArea(pattern.area)}</TableCell>
                        <TableCell>{pattern.quantity_per_garment}</TableCell>
                        <TableCell>{pattern.grain_angle}°</TableCell>
                        <TableCell>{new Date(pattern.created_at).toLocaleDateString('zh-CN')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" title="查看详情">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="删除" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="markers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>排料方案列表</CardTitle>
                  <CardDescription>管理排料方案和优化结果</CardDescription>
                </div>
                <Dialog open={showCreateMarkerDialog} onOpenChange={setShowCreateMarkerDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Layers className="mr-2 h-4 w-4" />
                      新建方案
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>创建排料方案</DialogTitle>
                      <DialogDescription>设置基本参数创建新方案</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-sm">方案名称</label>
                        <Input
                          className="col-span-3"
                          value={newMarker.name}
                          onChange={(e) => setNewMarker({ ...newMarker, name: e.target.value })}
                          placeholder="输入方案名称"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-sm">面料幅宽</label>
                        <Input
                          type="number"
                          className="col-span-3"
                          value={newMarker.fabricWidth}
                          onChange={(e) => setNewMarker({ ...newMarker, fabricWidth: Number(e.target.value) })}
                          placeholder="面料幅宽（cm）"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-sm">尺码</label>
                        <Input
                          className="col-span-3"
                          value={newMarker.sizes}
                          onChange={(e) => setNewMarker({ ...newMarker, sizes: e.target.value })}
                          placeholder="用逗号分隔，如：S,M,L,XL"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateMarkerDialog(false)}>
                        取消
                      </Button>
                      <Button onClick={handleCreateMarker} disabled={!newMarker.name}>
                        创建方案
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>方案名称</TableHead>
                    <TableHead>面料幅宽</TableHead>
                    <TableHead>面料长度</TableHead>
                    <TableHead>利用率</TableHead>
                    <TableHead>尺码</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : markers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        暂无排料方案，请新建方案
                      </TableCell>
                    </TableRow>
                  ) : (
                    markers.map((marker) => (
                      <TableRow key={marker.id}>
                        <TableCell className="font-medium">{marker.name}</TableCell>
                        <TableCell>{marker.fabric_width} cm</TableCell>
                        <TableCell>{formatLength(marker.fabric_length || 0)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-medium",
                              (marker.utilization_rate || 0) >= 0.9 ? "text-green-600" :
                              (marker.utilization_rate || 0) >= 0.85 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {Math.round((marker.utilization_rate || 0) * 100)}%
                            </span>
                            <Progress 
                              value={(marker.utilization_rate || 0) * 100} 
                              className="w-16 h-1"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {marker.sizes?.map((size, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{size}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(marker.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="优化"
                              onClick={() => {
                                setSelectedMarker(marker);
                                handleOptimizeMarker(marker.id);
                              }}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="导出JSON"
                              onClick={() => handleExportMarker(marker.id, 'json')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          {/* 优化结果展示 */}
          {optimizing ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <RefreshCw className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">正在进行智能排料优化...</p>
                  <p className="text-sm text-muted-foreground">AI正在计算最优排料方案</p>
                </div>
              </CardContent>
            </Card>
          ) : optimizationResult ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>优化结果</CardTitle>
                  <CardDescription>智能排料优化完成</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">利用率提升</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-green-600">
                          +{Math.round(optimizationResult.improvement * 100)}%
                        </span>
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">节省面料</p>
                      <p className="text-2xl font-bold">{formatLength(optimizationResult.fabricSaved)}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">节省成本</p>
                      <p className="text-2xl font-bold text-green-600">
                        ¥{optimizationResult.costSaved.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Alert className="mt-4">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>优化成功</AlertTitle>
                    <AlertDescription>{optimizationResult.log}</AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Grid className="h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium">选择排料方案进行优化</p>
                  <p className="text-sm text-muted-foreground">
                    在"排料方案"标签页中选择方案并点击优化按钮
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 用料计算对话框 */}
      <Dialog open={showCalcDialog} onOpenChange={setShowCalcDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>用料计算</DialogTitle>
            <DialogDescription>计算指定款式的面料用量和成本</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm">款式ID</label>
              <Input
                className="col-span-3"
                value={calcParams.styleId}
                onChange={(e) => setCalcParams({ ...calcParams, styleId: e.target.value })}
                placeholder="输入款式ID"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm">生产数量</label>
              <Input
                type="number"
                className="col-span-3"
                value={calcParams.quantity}
                onChange={(e) => setCalcParams({ ...calcParams, quantity: Number(e.target.value) })}
                placeholder="生产数量"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm">尺码</label>
              <Input
                className="col-span-3"
                value={calcParams.sizes}
                onChange={(e) => setCalcParams({ ...calcParams, sizes: e.target.value })}
                placeholder="用逗号分隔（可选）"
              />
            </div>
            <Button onClick={handleCalculateFabric} className="w-full">
              <Calculator className="mr-2 h-4 w-4" />
              计算用料
            </Button>

            {calcResult && (
              <div className="space-y-4 mt-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">总面料长度</p>
                    <p className="text-xl font-bold">
                      {calcResult.calculation.totalWithWaste.toFixed(2)} cm
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">总成本</p>
                    <p className="text-xl font-bold text-primary">
                      ¥{calcResult.cost.totalCost.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">单件成本</p>
                    <p className="text-lg font-medium">
                      ¥{calcResult.cost.costPerPiece.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">潜在节省</p>
                    <p className="text-lg font-medium text-green-600">
                      ¥{calcResult.optimization.potentialSaving.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">优化建议</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {calcResult.optimization.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
