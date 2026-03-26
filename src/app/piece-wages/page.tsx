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
  Calculator,
  Plus,
  Loader2,
  DollarSign,
  Users,
  TrendingUp,
  FileText,
} from 'lucide-react';

interface PieceWage {
  id: string;
  order_id: string;
  process_id: string;
  worker_id: string;
  quantity: number;
  defective_qty: number;
  wage: number;
  created_at: string;
  employees?: { name: string; department: string };
  processes?: { name: string; code: string; unit_price: number };
  production_orders?: { order_no: string; style_no: string; style_name: string };
}

export default function PieceWagesPage() {
  const [wages, setWages] = useState<PieceWage[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [productionOrders, setProductionOrders] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    order_id: '',
    process_id: '',
    worker_id: '',
    quantity: '',
    defective_qty: '0',
    notes: '',
  });

  const fetchWages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (employeeFilter !== 'all') params.append('employeeId', employeeFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/piece-wages?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setWages(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch piece wages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [empRes, procRes, orderRes] = await Promise.all([
        fetch('/api/employees?status=active&pageSize=100'),
        fetch('/api/processes?pageSize=100'),
        fetch('/api/production-orders?status=in_progress&pageSize=100'),
      ]);

      const [emp, proc, order] = await Promise.all([
        empRes.json(),
        procRes.json(),
        orderRes.json(),
      ]);

      if (emp.success) setEmployees(emp.data);
      if (proc.success) setProcesses(proc.data);
      if (order.success) setProductionOrders(order.data);
    } catch (error) {
      console.error('Failed to fetch options:', error);
    }
  };

  useEffect(() => {
    fetchWages();
    fetchOptions();
  }, [employeeFilter, startDate, endDate]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/piece-wages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          defective_qty: Number(formData.defective_qty),
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        setDialogOpen(false);
        setFormData({
          order_id: '',
          process_id: '',
          worker_id: '',
          quantity: '',
          defective_qty: '0',
          notes: '',
        });
        fetchWages();
        alert(result.message);
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 统计
  const stats = {
    totalRecords: wages.length,
    totalQty: wages.reduce((sum, w) => sum + Number(w.quantity), 0),
    totalWage: wages.reduce((sum, w) => sum + w.wage, 0),
    avgWage: wages.length > 0 ? wages.reduce((sum, w) => sum + w.wage, 0) / wages.length : 0,
  };

  // 按员工汇总
  const employeeSummary = wages.reduce((acc, w) => {
    const empId = w.worker_id;
    if (!acc[empId]) {
      acc[empId] = {
        name: w.employees?.name || '未知',
        department: w.employees?.department || '',
        totalQty: 0,
        totalWage: 0,
        records: 0,
      };
    }
    acc[empId].totalQty += Number(w.quantity);
    acc[empId].totalWage += w.wage;
    acc[empId].records += 1;
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">计件工资</h1>
          <p className="text-muted-foreground">记录员工工序完成数量，自动计算工资</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          录入计件
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">计件记录</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords}</div>
            <p className="text-xs text-muted-foreground">条</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总完成数量</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.totalQty.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">件</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总工资</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              ¥{stats.totalWage.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">参与员工</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {Object.keys(employeeSummary).length}
            </div>
            <p className="text-xs text-muted-foreground">人</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label>员工</Label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="全部员工" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部员工</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>开始日期</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>结束日期</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">计件记录</TabsTrigger>
          <TabsTrigger value="summary">员工汇总</TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : wages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  暂无计件记录
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日期</TableHead>
                      <TableHead>员工</TableHead>
                      <TableHead>生产单号</TableHead>
                      <TableHead>工序</TableHead>
                      <TableHead>完成数量</TableHead>
                      <TableHead>次品数</TableHead>
                      <TableHead>单价</TableHead>
                      <TableHead>工资</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wages.map((wage) => (
                      <TableRow key={wage.id}>
                        <TableCell className="text-sm">
                          {new Date(wage.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{wage.employees?.name}</div>
                            <div className="text-xs text-muted-foreground">{wage.employees?.department}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {wage.production_orders?.order_no}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{wage.processes?.name}</div>
                            <div className="text-xs text-muted-foreground">{wage.processes?.code}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold">{wage.quantity}</TableCell>
                        <TableCell className="text-red-500">{wage.defective_qty}</TableCell>
                        <TableCell>¥{wage.processes?.unit_price?.toFixed(2)}</TableCell>
                        <TableCell className="text-green-600 font-bold">
                          ¥{wage.wage.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>员工</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>完成数量</TableHead>
                    <TableHead>计件次数</TableHead>
                    <TableHead>合计工资</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(employeeSummary).map(([empId, summary]) => (
                    <TableRow key={empId}>
                      <TableCell className="font-medium">{summary.name}</TableCell>
                      <TableCell>{summary.department}</TableCell>
                      <TableCell>{summary.totalQty}</TableCell>
                      <TableCell>{summary.records}</TableCell>
                      <TableCell className="text-green-600 font-bold">
                        ¥{summary.totalWage.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 录入弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>录入计件</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>生产订单 *</Label>
              <Select 
                value={formData.order_id} 
                onValueChange={(v) => setFormData({ ...formData, order_id: v })}
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
              <Label>工序 *</Label>
              <Select 
                value={formData.process_id} 
                onValueChange={(v) => setFormData({ ...formData, process_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择工序" />
                </SelectTrigger>
                <SelectContent>
                  {processes.map(proc => (
                    <SelectItem key={proc.id} value={proc.id}>
                      {proc.name} (¥{Number(proc.unit_price).toFixed(2)}/件)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>员工 *</Label>
              <Select 
                value={formData.worker_id} 
                onValueChange={(v) => setFormData({ ...formData, worker_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择员工" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} - {emp.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>完成数量 *</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>次品数</Label>
                <Input
                  type="number"
                  value={formData.defective_qty}
                  onChange={(e) => setFormData({ ...formData, defective_qty: e.target.value })}
                />
              </div>
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
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || !formData.order_id || !formData.process_id || !formData.worker_id || !formData.quantity}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
