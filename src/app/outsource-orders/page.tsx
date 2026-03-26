'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getColorValue } from '@/lib/color-utils';
import {
  Send,
  Plus,
  Eye,
  AlertCircle,
  Building2,
  Package,
  Truck,
} from 'lucide-react';

interface Supplier {
  id: string;
  code: string;
  name: string;
  contact: string;
  phone: string;
  status: string;
}

interface OutsourceOrder {
  id: string;
  order_no: string;
  production_order_id: string;
  supplier_id: string;
  style_no: string;
  style_name: string;
  color: string;
  size: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: string;
  plan_start_date: string;
  plan_end_date: string;
  notes: string;
  supplier: Supplier;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待接单', color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: '已接单', color: 'bg-blue-100 text-blue-800' },
  in_production: { label: '生产中', color: 'bg-indigo-100 text-indigo-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
};

export default function OutsourceOrdersPage() {
  const [orders, setOrders] = useState<OutsourceOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OutsourceOrder | null>(null);
  
  // 新建外发订单表单
  const [form, setForm] = useState({
    supplier_id: '',
    style_no: '',
    style_name: '',
    color: '',
    size: '',
    quantity: 0,
    unit_price: 0,
    plan_start_date: '',
    plan_end_date: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, suppliersRes] = await Promise.all([
        fetch('/api/outsource-orders'),
        fetch('/api/suppliers'),
      ]);

      const [ordersData, suppliersData] = await Promise.all([
        ordersRes.json(),
        suppliersRes.json(),
      ]);

      if (ordersData.success) setOrders(ordersData.data);
      if (suppliersData.success) setSuppliers(suppliersData.data.filter((s: Supplier) => s.status === 'active'));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!form.supplier_id || !form.style_no || form.quantity <= 0) {
      alert('请填写必填项');
      return;
    }

    try {
      const response = await fetch('/api/outsource-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await response.json();
      if (result.success) {
        setDialogOpen(false);
        setForm({
          supplier_id: '',
          style_no: '',
          style_name: '',
          color: '',
          size: '',
          quantity: 0,
          unit_price: 0,
          plan_start_date: '',
          plan_end_date: '',
          notes: '',
        });
        fetchData();
      } else {
        alert(result.error || '创建失败');
      }
    } catch (error) {
      alert('创建失败');
    }
  };

  // 统计
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const inProgressCount = orders.filter(o => ['accepted', 'in_production'].includes(o.status)).length;
  const completedCount = orders.filter(o => o.status === 'completed').length;

  // 按供应商分组统计
  const supplierStats: Record<string, { total: number; completed: number }> = {};
  orders.forEach(o => {
    const key = o.supplier_id;
    if (!supplierStats[key]) {
      supplierStats[key] = { total: 0, completed: 0 };
    }
    supplierStats[key].total++;
    if (o.status === 'completed') supplierStats[key].completed++;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Send className="h-8 w-8" />
            外发订单管理
          </h1>
          <p className="text-gray-500 mt-1">管理外发给供应商的生产订单</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          新建外发订单
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总订单数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">待接单</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">生产中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* 供应商业绩 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            供应商业绩
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {suppliers.slice(0, 8).map(s => {
              const stats = supplierStats[s.id] || { total: 0, completed: 0 };
              return (
                <div key={s.id} className="p-3 border rounded-lg">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm text-gray-500">{s.code}</div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span>订单: {stats.total}</span>
                    <span className="text-green-600">完成: {stats.completed}</span>
                  </div>
                  {stats.total > 0 && (
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 订单列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            外发订单列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无外发订单</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单号</TableHead>
                  <TableHead>供应商</TableHead>
                  <TableHead>款号</TableHead>
                  <TableHead>款式名称</TableHead>
                  <TableHead>颜色/尺码</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>交期</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono">{order.order_no}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.supplier?.name}</div>
                        <div className="text-xs text-gray-500">{order.supplier?.code}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">{order.style_no}</TableCell>
                    <TableCell>{order.style_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-5 h-5 rounded-full border border-gray-200 shadow-sm"
                          style={{ backgroundColor: getColorValue(order.color) }}
                        />
                        <span className="font-bold">{order.color}</span>
                        {order.size && <span className="text-muted-foreground">/ {order.size}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-blue-600">{order.quantity}</TableCell>
                    <TableCell>¥{order.total_amount?.toLocaleString()}</TableCell>
                    <TableCell>{order.plan_end_date}</TableCell>
                    <TableCell>
                      <Badge className={statusMap[order.status]?.color}>
                        {statusMap[order.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setSelectedOrder(order);
                          setDetailDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {order.status === 'completed' && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          title="创建发货任务"
                        >
                          <Truck className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 新建外发订单弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              新建外发订单
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>选择供应商 *</Label>
              <Select 
                value={form.supplier_id} 
                onValueChange={(v) => setForm({ ...form, supplier_id: v })}
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
                <Label>款号 *</Label>
                <Input
                  value={form.style_no}
                  onChange={(e) => setForm({ ...form, style_no: e.target.value })}
                  placeholder="款号"
                />
              </div>
              <div className="space-y-2">
                <Label>款式名称</Label>
                <Input
                  value={form.style_name}
                  onChange={(e) => setForm({ ...form, style_name: e.target.value })}
                  placeholder="款式名称"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>颜色</Label>
                <Input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  placeholder="颜色"
                />
              </div>
              <div className="space-y-2">
                <Label>尺码</Label>
                <Input
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  placeholder="尺码"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>数量 *</Label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                  placeholder="数量"
                />
              </div>
              <div className="space-y-2">
                <Label>单价</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })}
                  placeholder="单价"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>计划开始日期</Label>
                <Input
                  type="date"
                  value={form.plan_start_date}
                  onChange={(e) => setForm({ ...form, plan_start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>计划交期</Label>
                <Input
                  type="date"
                  value={form.plan_end_date}
                  onChange={(e) => setForm({ ...form, plan_end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>备注</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="备注信息"
              />
            </div>

            {form.quantity > 0 && form.unit_price > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  订单总金额: ¥{(form.quantity * form.unit_price).toLocaleString()}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateOrder}>
              创建订单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 订单详情弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">订单号</div>
                  <div className="font-mono">{selectedOrder.order_no}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">供应商</div>
                  <div className="font-medium">{selectedOrder.supplier?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">款号</div>
                  <div className="font-bold">{selectedOrder.style_no}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">款式名称</div>
                  <div>{selectedOrder.style_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">颜色/尺码</div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-5 h-5 rounded-full border border-gray-200 shadow-sm"
                      style={{ backgroundColor: getColorValue(selectedOrder.color) }}
                    />
                    <span className="font-bold">{selectedOrder.color}</span>
                    {selectedOrder.size && <span className="text-muted-foreground">/ {selectedOrder.size}</span>}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">数量</div>
                  <div className="font-bold text-blue-600 text-lg">{selectedOrder.quantity}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">金额</div>
                  <div>¥{selectedOrder.total_amount?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">状态</div>
                  <Badge className={statusMap[selectedOrder.status]?.color}>
                    {statusMap[selectedOrder.status]?.label}
                  </Badge>
                </div>
              </div>
              {selectedOrder.notes && (
                <div>
                  <div className="text-sm text-gray-500">备注</div>
                  <div>{selectedOrder.notes}</div>
                </div>
              )}
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
