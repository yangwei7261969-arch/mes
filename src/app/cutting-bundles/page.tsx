'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Layers,
  Plus,
  Search,
  Package,
  Calendar,
  Hash,
  Trash2,
  Eye,
  Printer,
  QrCode,
  RefreshCw,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Info,
  Copy,
  Settings,
  Grid3X3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getColorValue } from '@/lib/color-utils';

interface CuttingBundle {
  id: string;
  bundle_no: string;
  size: string;
  color: string;
  quantity: number;
  status: string;
  qr_code?: string;
  barcode?: string;
  current_process?: string;
  created_at: string;
  cutting_order_id: string;
  cutting_orders?: {
    order_no: string;
    style_no: string;
    color: string;
    bed_number?: number;
  };
}

interface CuttingOrder {
  id: string;
  order_no: string;
  style_no: string;
  style_name?: string;
  color: string;
  quantity: number;
  size_breakdown?: Record<string, number>;
  bed_number?: number;
  total_beds?: number;
  status: string;
  cutting_date?: string;
  created_at: string;
}

export default function CuttingBundlesPage() {
  // 数据状态
  const [cuttingOrders, setCuttingOrders] = useState<CuttingOrder[]>([]);
  const [bundles, setBundles] = useState<CuttingBundle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 左侧选择
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  // 右侧分扎配置
  const [bundleConfig, setBundleConfig] = useState<{
    size: string;
    color: string;
    orderQty: number;
    piecesPerBundle: number;
    bundleCount: number;
  }[]>([]);
  
  // 功能开关
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // 弹窗状态
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<CuttingBundle | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);
  
  // 新建裁床单
  const [newOrder, setNewOrder] = useState({
    style_no: '',
    style_name: '',
    color: '',
    quantity: 0,
    size_breakdown: '',
    cutting_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchCuttingOrders();
    fetchBundles();
  }, []);

  useEffect(() => {
    if (selectedOrderId) {
      fetchBundlesByOrder(selectedOrderId);
    }
  }, [selectedOrderId]);

  const fetchCuttingOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cutting-orders?pageSize=100');
      const data = await res.json();
      if (data.success) {
        setCuttingOrders(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch cutting orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBundles = async () => {
    try {
      const res = await fetch('/api/cutting-bundles');
      const data = await res.json();
      if (data.success) {
        setBundles(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch bundles:', error);
    }
  };

  const fetchBundlesByOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/cutting-bundles?cutting_order_id=${orderId}`);
      const data = await res.json();
      if (data.success) {
        setBundles(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch bundles:', error);
    }
  };

  // 筛选裁床单
  const filteredOrders = useMemo(() => {
    if (!searchTerm) return cuttingOrders;
    const term = searchTerm.toLowerCase();
    return cuttingOrders.filter(
      o => o.order_no.toLowerCase().includes(term) ||
           o.style_no.toLowerCase().includes(term) ||
           o.color.toLowerCase().includes(term)
    );
  }, [cuttingOrders, searchTerm]);

  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredOrders.length / pageSize);

  // 选中的裁床单
  const selectedOrder = cuttingOrders.find(o => o.id === selectedOrderId);

  // 初始化分扎配置
  const initBundleConfig = (order: CuttingOrder) => {
    const sizeBreakdown = order.size_breakdown || { '均码': order.quantity };
    const config = Object.entries(sizeBreakdown).map(([size, qty]) => ({
      size,
      color: order.color,
      orderQty: qty as number,
      piecesPerBundle: 50,
      bundleCount: Math.ceil((qty as number) / 50),
    }));
    setBundleConfig(config);
  };

  // 选择裁床单
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = cuttingOrders.find(o => o.id === orderId);
    if (order) {
      initBundleConfig(order);
    }
  };

  // 更新分扎配置
  const updateConfig = (index: number, field: string, value: number) => {
    const newConfig = [...bundleConfig];
    newConfig[index] = { ...newConfig[index], [field]: value };
    
    if (autoCalculate) {
      if (field === 'piecesPerBundle' && value > 0) {
        newConfig[index].bundleCount = Math.ceil(newConfig[index].orderQty / value);
      }
      if (field === 'bundleCount' && value > 0) {
        newConfig[index].piecesPerBundle = Math.ceil(newConfig[index].orderQty / value);
      }
    }
    
    setBundleConfig(newConfig);
  };

  // 增加一行
  const addConfigRow = () => {
    if (!selectedOrder) return;
    setBundleConfig([...bundleConfig, {
      size: 'M',
      color: selectedOrder.color,
      orderQty: 0,
      piecesPerBundle: 50,
      bundleCount: 1,
    }]);
  };

  // 删除一行
  const removeConfigRow = (index: number) => {
    setBundleConfig(bundleConfig.filter((_, i) => i !== index));
  };

  // 清空配置
  const clearConfig = () => {
    setBundleConfig([]);
  };

  // 计算总数
  const totals = useMemo(() => {
    const totalBundles = bundleConfig.reduce((sum, c) => sum + c.bundleCount, 0);
    const totalPieces = bundleConfig.reduce((sum, c) => sum + c.piecesPerBundle * c.bundleCount, 0);
    const orderTotal = bundleConfig.reduce((sum, c) => sum + c.orderQty, 0);
    return { totalBundles, totalPieces, orderTotal };
  }, [bundleConfig]);

  // 创建分扎
  const handleCreateBundles = async () => {
    if (!selectedOrderId) return;
    
    try {
      const bundlesData = bundleConfig
        .filter(c => c.bundleCount > 0)
        .map(c => ({
          size: c.size,
          color: c.color,
          quantity: c.piecesPerBundle,
          bundle_count: c.bundleCount,
        }));

      const res = await fetch('/api/cutting-bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cutting_order_id: selectedOrderId,
          bundles: bundlesData,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchBundlesByOrder(selectedOrderId);
      } else {
        alert(data.error || '创建失败');
      }
    } catch (error) {
      alert('创建失败');
    }
  };

  // 删除分扎
  const handleDeleteBundle = async (id: string) => {
    if (!confirm('确定要删除此分扎吗？')) return;
    
    try {
      const res = await fetch(`/api/cutting-bundles?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && selectedOrderId) {
        fetchBundlesByOrder(selectedOrderId);
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  // 创建裁床单
  const handleCreateOrder = async () => {
    if (!newOrder.style_no || !newOrder.color || !newOrder.quantity) {
      alert('请填写完整信息');
      return;
    }

    try {
      const res = await fetch('/api/cutting-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style_no: newOrder.style_no,
          style_name: newOrder.style_name,
          color: newOrder.color,
          cutting_qty: newOrder.quantity,
          size_breakdown: newOrder.size_breakdown 
            ? Object.fromEntries(newOrder.size_breakdown.split(',').map(item => {
                const [size, qty] = item.trim().split(':');
                return [size.trim(), parseInt(qty.trim()) || 0];
              }))
            : { '均码': newOrder.quantity },
          cutting_date: newOrder.cutting_date,
          notes: newOrder.notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCreateOrderDialogOpen(false);
        setNewOrder({
          style_no: '',
          style_name: '',
          color: '',
          quantity: 0,
          size_breakdown: '',
          cutting_date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        fetchCuttingOrders();
        setSelectedOrderId(data.data.id);
      } else {
        alert(data.error || '创建失败');
      }
    } catch (error) {
      alert('创建失败');
    }
  };

  // 查看详情
  const handleViewDetail = (bundle: CuttingBundle) => {
    setSelectedBundle(bundle);
    setDetailDialogOpen(true);
  };

  // 状态徽章
  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      pending: { variant: 'outline', label: '待生产' },
      in_progress: { variant: 'default', label: '生产中' },
      completed: { variant: 'secondary', label: '已完成' },
    };
    const { variant, label } = config[status] || config.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  // 尺码选项
  const sizeOptions = ['3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '均码'];

  return (
    <div className="flex h-[calc(100vh-80px)] gap-4 p-4">
      {/* 左侧：裁床单列表 */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-card rounded-lg border">
        {/* 头部 */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">裁床单</h2>
            <Button size="sm" onClick={() => setCreateOrderDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              新建
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索裁床单..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {paginatedOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => handleSelectOrder(order.id)}
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all",
                selectedOrderId === order.id
                  ? "bg-primary/10 border-primary"
                  : "hover:bg-muted/50"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-medium">{order.order_no}</span>
                <Badge variant="outline" className="text-xs">{order.style_no}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div
                  className="w-3 h-3 rounded-full border"
                  style={{ backgroundColor: getColorValue(order.color) }}
                />
                <span>{order.color}</span>
                <span className="ml-auto">{order.quantity}件</span>
              </div>
              {order.cutting_date && (
                <div className="text-xs text-muted-foreground mt-1">
                  {order.cutting_date}
                </div>
              )}
            </div>
          ))}
          
          {paginatedOrders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              暂无裁床单
            </div>
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="p-3 border-t flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{page}/{totalPages}</span>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ←
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 右侧：分扎操作区 */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* 选中裁床单信息 */}
        {selectedOrder ? (
          <>
            {/* 信息卡片 */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">裁床单号</div>
                      <div className="font-mono font-bold">{selectedOrder.order_no}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">款号</div>
                      <div className="font-bold">{selectedOrder.style_no}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full border-2"
                        style={{ backgroundColor: getColorValue(selectedOrder.color) }}
                      />
                      <div>
                        <div className="text-sm text-muted-foreground">颜色</div>
                        <div className="font-medium">{selectedOrder.color}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">总数量</div>
                      <div className="font-bold text-primary">{selectedOrder.quantity}件</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchCuttingOrders}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      刷新
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 分扎配置 */}
            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">分扎配置</CardTitle>
                    <CardDescription>设置每个尺码的每扎件数和扎数</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={autoCalculate}
                        onCheckedChange={(v) => setAutoCalculate(!!v)}
                      />
                      自动计算
                    </label>
                    <Button variant="outline" size="sm" onClick={addConfigRow}>
                      <Plus className="h-4 w-4 mr-1" />
                      增加行
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearConfig}>
                      清空
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">尺码</TableHead>
                      <TableHead className="w-28">颜色</TableHead>
                      <TableHead className="w-24">订单数量</TableHead>
                      <TableHead className="w-28">每扎件数</TableHead>
                      <TableHead className="w-24">扎数</TableHead>
                      <TableHead className="w-28">实际件数</TableHead>
                      <TableHead className="w-20">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundleConfig.map((config, index) => {
                      const actualQty = config.piecesPerBundle * config.bundleCount;
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={config.size}
                              onValueChange={(v) => {
                                const newConfig = [...bundleConfig];
                                newConfig[index].size = v;
                                setBundleConfig(newConfig);
                              }}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {sizeOptions.map(s => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: getColorValue(config.color) }}
                              />
                              <Input
                                className="h-8 w-20"
                                value={config.color}
                                onChange={(e) => {
                                  const newConfig = [...bundleConfig];
                                  newConfig[index].color = e.target.value;
                                  setBundleConfig(newConfig);
                                }}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{config.orderQty}</span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="h-8 w-20"
                              value={config.piecesPerBundle}
                              onChange={(e) => updateConfig(index, 'piecesPerBundle', Number(e.target.value))}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="h-8 w-16"
                              value={config.bundleCount}
                              onChange={(e) => updateConfig(index, 'bundleCount', Number(e.target.value))}
                            />
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "font-medium",
                              actualQty >= config.orderQty ? "text-green-600" : "text-orange-600"
                            )}>
                              {actualQty}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeConfigRow(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {bundleConfig.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    点击"增加行"添加分扎配置
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 数据汇总 */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-sm text-muted-foreground">当前裁货总数</div>
                      <div className="text-2xl font-bold text-primary">
                        {totals.totalPieces}<span className="text-sm font-normal text-muted-foreground">/件</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">总扎数</div>
                      <div className="text-2xl font-bold">{totals.totalBundles}<span className="text-sm font-normal text-muted-foreground">/扎</span></div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">订单总数</div>
                      <div className="text-2xl font-bold">{totals.orderTotal}<span className="text-sm font-normal text-muted-foreground">/件</span></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateBundles}
                      disabled={bundleConfig.length === 0 || totals.totalBundles === 0}
                    >
                      <Layers className="h-4 w-4 mr-2" />
                      创建分扎 ({totals.totalBundles}扎)
                    </Button>
                  </div>
                </div>

                {/* 提示 */}
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    提示：每扎件数 × 扎数 应等于或略大于订单数量，剩余部分将合并到最后一扎
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* 已创建的分扎列表 */}
            {bundles.length > 0 && (
              <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">已创建分扎</CardTitle>
                      <CardDescription>共 {bundles.length} 扎</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>扎号</TableHead>
                        <TableHead>尺码</TableHead>
                        <TableHead>颜色</TableHead>
                        <TableHead>数量</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bundles.slice(0, 20).map((bundle) => (
                        <TableRow key={bundle.id}>
                          <TableCell className="font-mono">{bundle.bundle_no}</TableCell>
                          <TableCell>{bundle.size}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: getColorValue(bundle.color) }}
                              />
                              {bundle.color}
                            </div>
                          </TableCell>
                          <TableCell>{bundle.quantity}</TableCell>
                          <TableCell>{getStatusBadge(bundle.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewDetail(bundle)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteBundle(bundle.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          // 未选中提示
          <Card className="flex-1 flex items-center justify-center">
            <CardContent className="text-center">
              <Grid3X3 className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">请从左侧选择一个裁床单</p>
              <p className="text-sm text-muted-foreground/60 mt-1">选择后可以进行分扎配置</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 新建裁床单弹窗 */}
      <Dialog open={createOrderDialogOpen} onOpenChange={setCreateOrderDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>新建裁床单</DialogTitle>
            <DialogDescription>创建新的裁床单</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">款号 *</label>
                <Input
                  placeholder="输入款号"
                  value={newOrder.style_no}
                  onChange={(e) => setNewOrder({ ...newOrder, style_no: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">款名</label>
                <Input
                  placeholder="输入款名"
                  value={newOrder.style_name}
                  onChange={(e) => setNewOrder({ ...newOrder, style_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">颜色 *</label>
                <Input
                  placeholder="输入颜色"
                  value={newOrder.color}
                  onChange={(e) => setNewOrder({ ...newOrder, color: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">总数量 *</label>
                <Input
                  type="number"
                  placeholder="输入数量"
                  value={newOrder.quantity || ''}
                  onChange={(e) => setNewOrder({ ...newOrder, quantity: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">尺码明细</label>
              <Input
                placeholder="格式: S:100,M:200,L:150"
                value={newOrder.size_breakdown}
                onChange={(e) => setNewOrder({ ...newOrder, size_breakdown: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">不填则按均码处理</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">裁床日期</label>
                <Input
                  type="date"
                  value={newOrder.cutting_date}
                  onChange={(e) => setNewOrder({ ...newOrder, cutting_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">备注</label>
              <Textarea
                placeholder="输入备注..."
                value={newOrder.notes}
                onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOrderDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateOrder}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 分扎详情弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分扎详情</DialogTitle>
          </DialogHeader>
          {selectedBundle && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">扎号</p>
                  <p className="font-mono font-bold">{selectedBundle.bundle_no}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">数量</p>
                  <p className="font-bold">{selectedBundle.quantity} 件</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">尺码</p>
                  <p className="font-medium">{selectedBundle.size}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">颜色</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: getColorValue(selectedBundle.color) }}
                    />
                    <span>{selectedBundle.color}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">状态</p>
                  {getStatusBadge(selectedBundle.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">创建时间</p>
                  <p className="text-sm">{selectedBundle.created_at}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
