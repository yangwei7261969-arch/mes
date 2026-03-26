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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Palette,
  Plus,
  Loader2,
  Play,
  CheckCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface CraftProcess {
  id: string;
  production_order_id: string;
  process_name: string;
  process_type: string;
  quantity: number;
  completed_qty: number;
  unit_price: number;
  total_cost: number;
  status: string;
  start_time?: string;
  end_time?: string;
  production_orders?: {
    order_no: string;
    style_no: string;
    style_name: string;
  };
}

const processTypes = [
  { value: 'printing', label: '印花' },
  { value: 'embroidery', label: '刺绣' },
  { value: 'washing', label: '水洗' },
  { value: 'dyeing', label: '染色' },
  { value: 'coating', label: '涂层' },
  { value: 'other', label: '其他' },
];

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  pending: { label: '待处理', variant: 'outline' },
  in_progress: { label: '进行中', variant: 'secondary' },
  completed: { label: '已完成', variant: 'default' },
};

export default function CraftProcessesPage() {
  const [processes, setProcesses] = useState<CraftProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [productionOrders, setProductionOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    production_order_id: '',
    process_name: '',
    process_type: 'printing',
    quantity: '',
    unit_price: '',
    supplier_id: '',
    notes: '',
  });

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/craft-processes?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setProcesses(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch craft processes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductionOrders = async () => {
    try {
      const response = await fetch('/api/production-orders?pageSize=100');
      const result = await response.json();
      if (result.success) {
        setProductionOrders(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch production orders:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers?pageSize=100');
      const result = await response.json();
      if (result.success) {
        setSuppliers(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  useEffect(() => {
    fetchProcesses();
    fetchProductionOrders();
    fetchSuppliers();
  }, [statusFilter, typeFilter]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/craft-processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          unit_price: Number(formData.unit_price),
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        setDialogOpen(false);
        setFormData({
          production_order_id: '',
          process_name: '',
          process_type: 'printing',
          quantity: '',
          unit_price: '',
          supplier_id: '',
          notes: '',
        });
        fetchProcesses();
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/craft-processes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const result = await response.json();
      
      if (result.success) {
        fetchProcesses();
      }
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  // 统计
  const stats = {
    total: processes.length,
    pending: processes.filter(p => p.status === 'pending').length,
    inProgress: processes.filter(p => p.status === 'in_progress').length,
    totalCost: processes.reduce((sum, p) => sum + Number(p.total_cost), 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">二次工艺</h1>
          <p className="text-muted-foreground">管理印花、刺绣、水洗等后道工艺</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新增工艺
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">工艺总数</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">待处理</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">进行中</CardTitle>
            <Play className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总成本</CardTitle>
            <Palette className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              ¥{stats.totalCost.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="in_progress">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="工艺类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {processTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : processes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无二次工艺数据
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>生产单号</TableHead>
                  <TableHead>款号/款名</TableHead>
                  <TableHead>工艺名称</TableHead>
                  <TableHead>工艺类型</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>单价</TableHead>
                  <TableHead>总成本</TableHead>
                  <TableHead>开始时间</TableHead>
                  <TableHead>结束时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processes.map((process) => (
                  <TableRow key={process.id}>
                    <TableCell className="font-mono text-sm">
                      {process.production_orders?.order_no || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{process.production_orders?.style_no}</div>
                        <div className="text-muted-foreground">{process.production_orders?.style_name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{process.process_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {processTypes.find(t => t.value === process.process_type)?.label || process.process_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{process.quantity}</TableCell>
                    <TableCell>¥{Number(process.unit_price).toFixed(2)}</TableCell>
                    <TableCell className="font-medium">¥{Number(process.total_cost).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {process.start_time ? new Date(process.start_time).toLocaleString('zh-CN', { 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {process.end_time ? new Date(process.end_time).toLocaleString('zh-CN', { 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[process.status]?.variant || 'outline'}>
                        {statusConfig[process.status]?.label || process.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {process.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleUpdateStatus(process.id, 'in_progress')}
                          >
                            开始
                          </Button>
                        )}
                        {process.status === 'in_progress' && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleUpdateStatus(process.id, 'completed')}
                          >
                            完成
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 新增弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增二次工艺</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>关联生产订单</Label>
              <Select 
                value={formData.production_order_id} 
                onValueChange={(v) => setFormData({ ...formData, production_order_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择生产订单" />
                </SelectTrigger>
                <SelectContent>
                  {productionOrders.map(order => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.order_no} - {order.style_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>工艺名称 *</Label>
              <Input
                value={formData.process_name}
                onChange={(e) => setFormData({ ...formData, process_name: e.target.value })}
                placeholder="如: 前片印花"
              />
            </div>
            <div className="space-y-2">
              <Label>工艺类型</Label>
              <Select 
                value={formData.process_type} 
                onValueChange={(v) => setFormData({ ...formData, process_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  {processTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>数量 *</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>单价(元) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>加工供应商</Label>
              <Select 
                value={formData.supplier_id} 
                onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择供应商（可选）" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.supplier_level === 1 ? '一级' : supplier.supplier_level === 2 ? '二级' : '三级'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting || !formData.process_name || !formData.quantity}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
