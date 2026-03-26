'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getColorValue } from '@/lib/color-utils';
import {
  ArrowLeft,
  Package,
  Send,
  Eye,
  RotateCcw,
  Search,
  Building2,
  Trash2,
  Plus,
  Edit,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ProductionOrder {
  id: string;
  order_no: string;
  style_no: string;
  style_name: string;
  color: string;
  size?: string;
  quantity: number;
  completed_quantity: number;
  status: string;
  priority: number;
  plan_start_date: string;
  plan_end_date: string;
  actual_start_date: string;
  actual_end_date: string;
  size_breakdown?: Record<string, number>;
  created_at: string;
}

interface OutsourceOrder {
  id: string;
  order_no: string;
  supplier_id: string;
  style_no: string;
  style_name: string;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
  status: string;
  supplier: any;
  created_at: string;
}

const orderStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: '已确认', color: 'bg-blue-100 text-blue-800' },
  in_production: { label: '生产中', color: 'bg-indigo-100 text-indigo-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
};

const outsourceStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待接单', color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: '已接单', color: 'bg-blue-100 text-blue-800' },
  in_production: { label: '生产中', color: 'bg-indigo-100 text-indigo-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
};

export default function AdminOrdersPage() {
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [outsourceOrders, setOutsourceOrders] = useState<OutsourceOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // 筛选
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  // 外发表单
  const [outsourceForm, setOutsourceForm] = useState({
    supplier_id: '',
    unit_price: 0,
    plan_end_date: '',
    notes: '',
  });

  // 新建/编辑订单表单
  const [orderForm, setOrderForm] = useState({
    style_no: '',
    style_name: '',
    color: '',
    quantity: 0,
    size_breakdown: {} as Record<string, number>,
    plan_start_date: '',
    plan_end_date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, outRes, supRes] = await Promise.all([
        fetch('/api/production-orders'),
        fetch('/api/outsource-orders'),
        fetch('/api/suppliers'),
      ]);

      const [prodData, outData, supData] = await Promise.all([
        prodRes.json(),
        outRes.json(),
        supRes.json(),
      ]);

      if (prodData.success) setProductionOrders(prodData.data);
      if (outData.success) setOutsourceOrders(outData.data);
      if (supData.success) setSuppliers(supData.data.filter((s: any) => s.status === 'active'));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 查看订单详情
  const handleViewDetail = async (order: ProductionOrder) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  // 新建订单
  const handleOpenCreate = () => {
    setOrderForm({
      style_no: '',
      style_name: '',
      color: '',
      quantity: 0,
      size_breakdown: { 'S': 0, 'M': 0, 'L': 0, 'XL': 0 },
      plan_start_date: new Date().toISOString().split('T')[0],
      plan_end_date: '',
      notes: '',
    });
    setCreateDialogOpen(true);
  };

  // 编辑订单
  const handleOpenEdit = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setOrderForm({
      style_no: order.style_no,
      style_name: order.style_name,
      color: order.color,
      quantity: order.quantity,
      size_breakdown: order.size_breakdown || { 'S': 0, 'M': 0, 'L': 0, 'XL': 0 },
      plan_start_date: order.plan_start_date || '',
      plan_end_date: order.plan_end_date || '',
      notes: '',
    });
    setCreateDialogOpen(true);
  };

  // 更新尺码数量
  const updateSizeBreakdown = (size: string, qty: number) => {
    const newBreakdown = { ...orderForm.size_breakdown, [size]: qty };
    const total = Object.values(newBreakdown).reduce((a, b) => a + b, 0);
    setOrderForm({ ...orderForm, size_breakdown: newBreakdown, quantity: total });
  };

  // 添加尺码
  const addSize = () => {
    const sizes = Object.keys(orderForm.size_breakdown);
    const defaultSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const availableSizes = defaultSizes.filter(s => !sizes.includes(s));
    const newSize = availableSizes[0] || `尺码${sizes.length + 1}`;
    setOrderForm({
      ...orderForm,
      size_breakdown: { ...orderForm.size_breakdown, [newSize]: 0 },
    });
  };

  // 删除尺码
  const removeSize = (size: string) => {
    const newBreakdown = { ...orderForm.size_breakdown };
    delete newBreakdown[size];
    const total = Object.values(newBreakdown).reduce((a, b) => a + b, 0);
    setOrderForm({ ...orderForm, size_breakdown: newBreakdown, quantity: total });
  };

  // 保存订单
  const handleSaveOrder = async () => {
    if (!orderForm.style_no || !orderForm.color || orderForm.quantity <= 0) {
      alert('请填写完整信息');
      return;
    }

    setSaving(true);
    try {
      const url = selectedOrder ? '/api/production-orders' : '/api/production-orders';
      const method = selectedOrder ? 'PUT' : 'POST';
      
      const body: any = {
        style_no: orderForm.style_no,
        style_name: orderForm.style_name,
        color: orderForm.color,
        quantity: orderForm.quantity,
        size_breakdown: orderForm.size_breakdown,
        plan_start_date: orderForm.plan_start_date,
        plan_end_date: orderForm.plan_end_date,
        notes: orderForm.notes,
      };

      if (selectedOrder) {
        body.id = selectedOrder.id;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (result.success) {
        setCreateDialogOpen(false);
        fetchData();
        alert(selectedOrder ? '订单已更新' : '订单已创建');
      } else {
        alert(result.error || '操作失败');
      }
    } catch (error) {
      alert('操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleOutsource = async (order: ProductionOrder) => {
    setSelectedOrder(order);
    setOutsourceForm({
      supplier_id: '',
      unit_price: 0,
      plan_end_date: order.plan_end_date,
      notes: '',
    });
    setDialogOpen(true);
  };

  const handleConfirmOutsource = async () => {
    if (!outsourceForm.supplier_id) {
      alert('请选择供应商');
      return;
    }

    try {
      const response = await fetch('/api/outsource-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: outsourceForm.supplier_id,
          production_order_id: selectedOrder?.id,
          style_no: selectedOrder?.style_no,
          style_name: selectedOrder?.style_name,
          color: selectedOrder?.color,
          size: selectedOrder?.size,
          quantity: selectedOrder?.quantity,
          unit_price: outsourceForm.unit_price,
          plan_end_date: outsourceForm.plan_end_date,
          notes: outsourceForm.notes,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setDialogOpen(false);
        fetchData();
        alert('外发订单已创建！');
      } else {
        alert(result.error || '创建失败');
      }
    } catch (error) {
      alert('创建失败');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('确定要取消此订单吗？')) return;

    try {
      const response = await fetch('/api/production-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          status: 'cancelled',
        }),
      });

      const result = await response.json();
      if (result.success) {
        fetchData();
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleRestoreOrder = async (order: ProductionOrder) => {
    if (!confirm('确定要恢复此订单吗？')) return;

    try {
      const response = await fetch('/api/production-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status: 'pending',
        }),
      });

      const result = await response.json();
      if (result.success) {
        fetchData();
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  // 筛选
  const filteredOrders = productionOrders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (searchText && !o.order_no.includes(searchText) && !o.style_no.includes(searchText)) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              订单管理
            </h1>
            <p className="text-gray-500 text-sm">管理生产订单和外发分配</p>
          </div>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" />
          新建订单
        </Button>
      </div>

      <Tabs defaultValue="production">
        <TabsList>
          <TabsTrigger value="production">生产订单</TabsTrigger>
          <TabsTrigger value="outsource">外发订单</TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="space-y-4">
          {/* 筛选 */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索订单号/款号..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-48"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {Object.entries(orderStatusMap).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 订单列表 */}
          <Card>
            <CardContent className="pt-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">加载中...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>订单号</TableHead>
                      <TableHead>款号</TableHead>
                      <TableHead>款式名称</TableHead>
                      <TableHead>颜色</TableHead>
                      <TableHead>数量</TableHead>
                      <TableHead>尺码明细</TableHead>
                      <TableHead>交期</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const sizes = order.size_breakdown ? Object.keys(order.size_breakdown) : [];
                      const hasSizeDetail = sizes.length > 0 && Object.values(order.size_breakdown || {}).some(v => v > 0);
                      
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono">{order.order_no}</TableCell>
                          <TableCell className="font-bold">{order.style_no}</TableCell>
                          <TableCell>{order.style_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-5 h-5 rounded-full border border-gray-200 shadow-sm"
                                style={{ backgroundColor: getColorValue(order.color) }}
                              />
                              <span className="font-bold">{order.color}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-blue-600">{order.quantity}</TableCell>
                          <TableCell>
                            {hasSizeDetail ? (
                              <div className="flex gap-1 flex-wrap">
                                {Object.entries(order.size_breakdown || {}).map(([size, qty]) => (
                                  qty > 0 && (
                                    <Badge key={size} variant="outline" className="text-xs">
                                      {size}: {qty}
                                    </Badge>
                                  )
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">未填写</span>
                            )}
                          </TableCell>
                          <TableCell>{order.plan_end_date}</TableCell>
                          <TableCell>
                            <Badge className={orderStatusMap[order.status]?.color}>
                              {orderStatusMap[order.status]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleViewDetail(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleOpenEdit(order)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {['pending', 'confirmed'].includes(order.status) && (
                                <>
                                  <Button 
                                    size="sm"
                                    onClick={() => handleOutsource(order)}
                                  >
                                    外发
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleCancelOrder(order.id)}
                                  >
                                    取消
                                  </Button>
                                </>
                              )}
                              {order.status === 'cancelled' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleRestoreOrder(order)}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  恢复
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outsource" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>外发单号</TableHead>
                    <TableHead>供应商</TableHead>
                    <TableHead>款号</TableHead>
                    <TableHead>数量</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outsourceOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.order_no}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4 text-blue-500" />
                          {order.supplier?.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">{order.style_no}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>¥{order.total_amount?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={outsourceStatusMap[order.status]?.color}>
                          {outsourceStatusMap[order.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 订单详情弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* 基本信息 */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">订单号</span>
                      <p className="font-mono font-bold">{selectedOrder.order_no}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">款号</span>
                      <p className="font-bold">{selectedOrder.style_no}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">款式名称</span>
                      <p>{selectedOrder.style_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">颜色</span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-5 h-5 rounded-full border"
                          style={{ backgroundColor: getColorValue(selectedOrder.color) }}
                        />
                        <span className="font-bold">{selectedOrder.color}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">总数量</span>
                      <p className="font-bold text-blue-600">{selectedOrder.quantity}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">完成数量</span>
                      <p className="font-bold text-green-600">{selectedOrder.completed_quantity || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">计划交期</span>
                      <p>{selectedOrder.plan_end_date}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">状态</span>
                      <Badge className={orderStatusMap[selectedOrder.status]?.color}>
                        {orderStatusMap[selectedOrder.status]?.label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 尺码明细表 */}
              <div className="space-y-2">
                <Label className="font-semibold">订单尺码明细</Label>
                {selectedOrder.size_breakdown && Object.keys(selectedOrder.size_breakdown).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">项目</TableHead>
                        {Object.keys(selectedOrder.size_breakdown).map(size => (
                          <TableHead key={size} className="text-center w-20">{size}</TableHead>
                        ))}
                        <TableHead className="text-right">合计</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-blue-50">
                        <TableCell className="font-medium">订单数量</TableCell>
                        {Object.entries(selectedOrder.size_breakdown).map(([size, qty]) => (
                          <TableCell key={size} className="text-center font-bold text-blue-600">
                            {qty}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-bold text-blue-600">
                          {Object.values(selectedOrder.size_breakdown).reduce((a, b) => a + b, 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center gap-2 p-4 bg-amber-50 text-amber-700 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span>该订单未填写尺码明细，请在裁床时补充</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
            <Button onClick={() => {
              setDetailDialogOpen(false);
              if (selectedOrder) handleOpenEdit(selectedOrder);
            }}>
              编辑订单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建/编辑订单弹窗 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedOrder ? '编辑订单' : '新建订单'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>款号 *</Label>
                <Input
                  value={orderForm.style_no}
                  onChange={(e) => setOrderForm({ ...orderForm, style_no: e.target.value })}
                  placeholder="输入款号"
                />
              </div>
              <div className="space-y-2">
                <Label>款式名称</Label>
                <Input
                  value={orderForm.style_name}
                  onChange={(e) => setOrderForm({ ...orderForm, style_name: e.target.value })}
                  placeholder="输入款式名称"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>颜色 *</Label>
                <Input
                  value={orderForm.color}
                  onChange={(e) => setOrderForm({ ...orderForm, color: e.target.value })}
                  placeholder="输入颜色"
                />
              </div>
              <div className="space-y-2">
                <Label>总数量</Label>
                <Input
                  type="number"
                  value={orderForm.quantity}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            {/* 尺码明细表 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">尺码明细 *</Label>
                <Button variant="outline" size="sm" onClick={addSize}>
                  <Plus className="h-4 w-4 mr-1" />
                  添加尺码
                </Button>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="grid gap-2">
                  {Object.entries(orderForm.size_breakdown).map(([size, qty]) => (
                    <div key={size} className="flex items-center gap-2">
                      <Input
                        className="w-24"
                        value={size}
                        onChange={(e) => {
                          const newBreakdown = { ...orderForm.size_breakdown };
                          delete newBreakdown[size];
                          newBreakdown[e.target.value] = qty;
                          setOrderForm({ ...orderForm, size_breakdown: newBreakdown });
                        }}
                        placeholder="尺码"
                      />
                      <Input
                        type="number"
                        min="0"
                        className="flex-1"
                        value={qty || ''}
                        onChange={(e) => updateSizeBreakdown(size, parseInt(e.target.value) || 0)}
                        placeholder="数量"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSize(size)}
                        disabled={Object.keys(orderForm.size_breakdown).length <= 1}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span>尺码合计：</span>
                    <span className="font-bold text-blue-600 text-lg">
                      {Object.values(orderForm.size_breakdown).reduce((a, b) => a + b, 0)} 件
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>计划开始日期</Label>
                <Input
                  type="date"
                  value={orderForm.plan_start_date}
                  onChange={(e) => setOrderForm({ ...orderForm, plan_start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>计划交期</Label>
                <Input
                  type="date"
                  value={orderForm.plan_end_date}
                  onChange={(e) => setOrderForm({ ...orderForm, plan_end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                value={orderForm.notes}
                onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                placeholder="备注信息"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveOrder} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedOrder ? '保存' : '创建订单'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 外发弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              外发订单
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>订单号: {selectedOrder.order_no}</div>
                <div>款号: {selectedOrder.style_no}</div>
                <div>数量: {selectedOrder.quantity}</div>
                <div>交期: {selectedOrder.plan_end_date}</div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>选择供应商 *</Label>
              <Select 
                value={outsourceForm.supplier_id} 
                onValueChange={(v) => setOutsourceForm({ ...outsourceForm, supplier_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择供应商" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>单价</Label>
                <Input
                  type="number"
                  value={outsourceForm.unit_price}
                  onChange={(e) => setOutsourceForm({ ...outsourceForm, unit_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>交期</Label>
                <Input
                  type="date"
                  value={outsourceForm.plan_end_date}
                  onChange={(e) => setOutsourceForm({ ...outsourceForm, plan_end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>备注</Label>
              <Input
                value={outsourceForm.notes}
                onChange={(e) => setOutsourceForm({ ...outsourceForm, notes: e.target.value })}
                placeholder="备注信息"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleConfirmOutsource}>
              确认外发
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
