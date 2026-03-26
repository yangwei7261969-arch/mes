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
import {
  Truck,
  Plus,
  Eye,
  Package,
  CheckCircle,
  Clock,
  MapPin,
} from 'lucide-react';

interface ShippingTask {
  id: string;
  task_no: string;
  outsource_order_id: string;
  production_order_id: string;
  customer_id: string;
  style_no: string;
  quantity: number;
  courier: string;
  tracking_no: string;
  shipping_address: string;
  receiver: string;
  receiver_phone: string;
  status: string;
  ship_date: string;
  delivery_date: string;
  notes: string;
  customer: any;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待发货', color: 'bg-yellow-100 text-yellow-800' },
  shipped: { label: '已发货', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: '已送达', color: 'bg-green-100 text-green-800' },
};

export default function ShippingTasksPage() {
  const [tasks, setTasks] = useState<ShippingTask[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ShippingTask | null>(null);
  
  // 新建发货任务表单
  const [form, setForm] = useState({
    customer_id: '',
    style_no: '',
    quantity: 0,
    shipping_address: '',
    receiver: '',
    receiver_phone: '',
    notes: '',
  });

  // 发货表单
  const [shipForm, setShipForm] = useState({
    courier: '',
    tracking_no: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, customersRes] = await Promise.all([
        fetch('/api/shipping-tasks'),
        fetch('/api/customers'),
      ]);

      const [tasksData, customersData] = await Promise.all([
        tasksRes.json(),
        customersRes.json(),
      ]);

      if (tasksData.success) setTasks(tasksData.data);
      if (customersData.success) setCustomers(customersData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!form.customer_id || !form.style_no || form.quantity <= 0) {
      alert('请填写必填项');
      return;
    }

    try {
      const response = await fetch('/api/shipping-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await response.json();
      if (result.success) {
        setDialogOpen(false);
        setForm({
          customer_id: '',
          style_no: '',
          quantity: 0,
          shipping_address: '',
          receiver: '',
          receiver_phone: '',
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

  const handleShip = async () => {
    if (!shipForm.courier || !shipForm.tracking_no) {
      alert('请填写快递公司和运单号');
      return;
    }

    try {
      const response = await fetch('/api/shipping-tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTask?.id,
          status: 'shipped',
          courier: shipForm.courier,
          tracking_no: shipForm.tracking_no,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShipDialogOpen(false);
        setShipForm({ courier: '', tracking_no: '' });
        fetchData();
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleDelivered = async (taskId: string) => {
    if (!confirm('确认已送达？')) return;

    try {
      const response = await fetch('/api/shipping-tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: 'delivered' }),
      });

      const result = await response.json();
      if (result.success) {
        fetchData();
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  // 统计
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const shippedCount = tasks.filter(t => t.status === 'shipped').length;
  const deliveredCount = tasks.filter(t => t.status === 'delivered').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8" />
            发货任务管理
          </h1>
          <p className="text-gray-500 mt-1">管理成品发货任务</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          新建发货任务
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总任务数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">待发货</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">运输中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{shippedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">已送达</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{deliveredCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            发货任务列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无发货任务</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>任务号</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead>款号</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>收件人</TableHead>
                  <TableHead>快递</TableHead>
                  <TableHead>运单号</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-mono">{task.task_no}</TableCell>
                    <TableCell>{task.customer?.name || '-'}</TableCell>
                    <TableCell className="font-bold">{task.style_no}</TableCell>
                    <TableCell>{task.quantity}</TableCell>
                    <TableCell>
                      <div>
                        <div>{task.receiver}</div>
                        <div className="text-xs text-gray-500">{task.receiver_phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{task.courier || '-'}</TableCell>
                    <TableCell className="font-mono">{task.tracking_no || '-'}</TableCell>
                    <TableCell>
                      <Badge className={statusMap[task.status]?.color}>
                        {statusMap[task.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {task.status === 'pending' && (
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedTask(task);
                              setShipDialogOpen(true);
                            }}
                          >
                            <Truck className="h-4 w-4 mr-1" />
                            发货
                          </Button>
                        )}
                        {task.status === 'shipped' && (
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelivered(task.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            确认送达
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

      {/* 新建发货任务弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              新建发货任务
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>客户 *</Label>
              <Select 
                value={form.customer_id} 
                onValueChange={(v) => setForm({ ...form, customer_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择客户" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
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
                <Label>数量 *</Label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                  placeholder="数量"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                收货地址
              </Label>
              <Input
                value={form.shipping_address}
                onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                placeholder="详细地址"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>收件人</Label>
                <Input
                  value={form.receiver}
                  onChange={(e) => setForm({ ...form, receiver: e.target.value })}
                  placeholder="收件人姓名"
                />
              </div>
              <div className="space-y-2">
                <Label>联系电话</Label>
                <Input
                  value={form.receiver_phone}
                  onChange={(e) => setForm({ ...form, receiver_phone: e.target.value })}
                  placeholder="联系电话"
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateTask}>
              创建任务
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 发货弹窗 */}
      <Dialog open={shipDialogOpen} onOpenChange={setShipDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              填写发货信息
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedTask && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <div>任务号: {selectedTask.task_no}</div>
                <div>款号: {selectedTask.style_no}</div>
                <div>数量: {selectedTask.quantity}</div>
              </div>
            )}

            <div className="space-y-2">
              <Label>快递公司 *</Label>
              <Select 
                value={shipForm.courier} 
                onValueChange={(v) => setShipForm({ ...shipForm, courier: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择快递公司" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="顺丰">顺丰</SelectItem>
                  <SelectItem value="圆通">圆通</SelectItem>
                  <SelectItem value="中通">中通</SelectItem>
                  <SelectItem value="申通">申通</SelectItem>
                  <SelectItem value="韵达">韵达</SelectItem>
                  <SelectItem value="EMS">EMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>运单号 *</Label>
              <Input
                value={shipForm.tracking_no}
                onChange={(e) => setShipForm({ ...shipForm, tracking_no: e.target.value })}
                placeholder="输入运单号"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShipDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleShip}>
              确认发货
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
