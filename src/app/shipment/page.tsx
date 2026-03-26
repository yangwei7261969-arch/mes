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
import {
  Truck,
  Plus,
  Loader2,
  Package,
  CheckCircle,
} from 'lucide-react';

interface Shipment {
  id: string;
  shipment_no: string;
  customer_id: string;
  shipment_date: string;
  total_qty: number;
  total_amount: number;
  status: string;
  tracking_no: string | null;
  courier: string | null;
  customers?: {
    name: string;
  };
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  pending: { label: '待发货', variant: 'outline' },
  shipped: { label: '运输中', variant: 'secondary' },
  delivered: { label: '已送达', variant: 'default' },
};

export default function ShipmentPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [customers, setCustomers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    shipment_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  
  const [shipFormData, setShipFormData] = useState({
    tracking_no: '',
    courier: '',
  });

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      
      const response = await fetch(`/api/shipments?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setShipments(result.data);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers?pageSize=100');
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  useEffect(() => {
    fetchShipments();
    fetchCustomers();
  }, [page, statusFilter]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      
      if (result.success) {
        setDialogOpen(false);
        fetchShipments();
        alert('出货单创建成功！');
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShip = async () => {
    if (!selectedShipment) return;
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/shipments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedShipment.id,
          action: 'ship',
          ...shipFormData,
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        setShipDialogOpen(false);
        fetchShipments();
        alert('发货成功！');
      }
    } catch (error) {
      console.error('Ship error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeliver = async (id: string) => {
    try {
      const response = await fetch('/api/shipments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'deliver' }),
      });
      const result = await response.json();
      
      if (result.success) {
        fetchShipments();
        alert('已确认送达！');
      }
    } catch (error) {
      console.error('Deliver error:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">出货管理</h1>
          <p className="text-muted-foreground">管理出货单和物流</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新建出货单
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总出货单</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">待发货</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {shipments.filter(s => s.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">运输中</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {shipments.filter(s => s.status === 'shipped').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">本月出货额</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              ¥{shipments.reduce((sum, s) => sum + Number(s.total_amount), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待发货</SelectItem>
              <SelectItem value="shipped">运输中</SelectItem>
              <SelectItem value="delivered">已送达</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : shipments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无出货单
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>出货单号</TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead>出货日期</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>物流单号</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-medium">{shipment.shipment_no}</TableCell>
                    <TableCell>{shipment.customers?.name || '-'}</TableCell>
                    <TableCell>{shipment.shipment_date}</TableCell>
                    <TableCell>{shipment.total_qty}</TableCell>
                    <TableCell>¥{Number(shipment.total_amount).toLocaleString()}</TableCell>
                    <TableCell>{shipment.tracking_no || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[shipment.status]?.variant || 'outline'}>
                        {statusConfig[shipment.status]?.label || shipment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {shipment.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedShipment(shipment);
                              setShipDialogOpen(true);
                            }}
                          >
                            发货
                          </Button>
                        )}
                        {shipment.status === 'shipped' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeliver(shipment.id)}
                          >
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

      {/* 新建出货单弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建出货单</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>客户 *</Label>
              <Select 
                value={formData.customer_id} 
                onValueChange={(v) => setFormData({ ...formData, customer_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择客户" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>出货日期</Label>
              <Input
                type="date"
                value={formData.shipment_date}
                onChange={(e) => setFormData({ ...formData, shipment_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting || !formData.customer_id}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建出货单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 发货弹窗 */}
      <Dialog open={shipDialogOpen} onOpenChange={setShipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认发货</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>快递公司</Label>
              <Select 
                value={shipFormData.courier} 
                onValueChange={(v) => setShipFormData({ ...shipFormData, courier: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择快递公司" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="顺丰快递">顺丰快递</SelectItem>
                  <SelectItem value="圆通快递">圆通快递</SelectItem>
                  <SelectItem value="中通快递">中通快递</SelectItem>
                  <SelectItem value="韵达快递">韵达快递</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>物流单号</Label>
              <Input
                value={shipFormData.tracking_no}
                onChange={(e) => setShipFormData({ ...shipFormData, tracking_no: e.target.value })}
                placeholder="输入物流单号"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShipDialogOpen(false)}>取消</Button>
            <Button onClick={handleShip} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认发货
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
