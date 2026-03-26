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
  DollarSign,
  Download,
  CheckCircle,
  Clock,
  FileSignature,
  Calculator,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { ExportButton } from '@/components/export-button';

interface Salary {
  id: string;
  employee_id: string;
  month: string;
  base_salary: number;
  overtime_pay: number;
  bonus: number;
  deduction: number;
  total_salary: number;
  status: string;
  paid_date: string | null;
  employees?: {
    name: string;
    department: string;
    position: string;
  };
}

export default function SalaryPage() {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    month: new Date().toISOString().slice(0, 7),
  });

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/salaries?month=${month}&status=${statusFilter}`);
      const result = await response.json();
      
      if (result.success) {
        setSalaries(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch salaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees?pageSize=100');
      const result = await response.json();
      if (result.success) {
        setEmployees(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  useEffect(() => {
    fetchSalaries();
    fetchEmployees();
  }, [month, statusFilter]);

  const handleGenerateSalaries = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/salaries/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: formData.month }),
      });
      const result = await response.json();
      
      if (result.success) {
        setGenerateDialogOpen(false);
        fetchSalaries();
        alert(`工资条生成成功！共 ${result.count} 条`);
      } else {
        alert(result.error || '生成失败');
      }
    } catch (error) {
      console.error('Generate error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      const response = await fetch(`/api/salaries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });
      const result = await response.json();
      
      if (result.success) {
        fetchSalaries();
      }
    } catch (error) {
      console.error('Confirm error:', error);
    }
  };

  const handlePay = async (id: string) => {
    if (!confirm('确认发放工资？')) return;
    
    try {
      const response = await fetch(`/api/salaries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'paid',
          paid_date: new Date().toISOString().slice(0, 10),
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        fetchSalaries();
        alert('工资发放成功！');
      }
    } catch (error) {
      console.error('Pay error:', error);
    }
  };

  // 统计
  const totalSalary = salaries.reduce((sum, s) => sum + Number(s.total_salary), 0);
  const pendingCount = salaries.filter(s => s.status === 'pending').length;
  const paidCount = salaries.filter(s => s.status === 'paid').length;
  const paidAmount = salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + Number(s.total_salary), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">工资管理</h1>
          <p className="text-muted-foreground">管理员工工资和发放</p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            dataType="salaries" 
            filters={{ month }}
            buttonText="导出工资条"
          />
          <ExportButton 
            dataType="finance_summary" 
            buttonText="导出财务明细"
          />
          <Button onClick={() => setGenerateDialogOpen(true)}>
            <Calculator className="mr-2 h-4 w-4" />
            生成工资条
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">本月工资总额</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totalSalary.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{salaries.length} 人</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">待确认</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">人待确认</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">已发放</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{paidCount}</div>
            <p className="text-xs text-muted-foreground">人已发放</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">已发放金额</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              ¥{paidAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label>月份</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待确认</SelectItem>
                  <SelectItem value="confirmed">已确认</SelectItem>
                  <SelectItem value="paid">已发放</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          ) : salaries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无工资数据，请先生成工资条
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>员工</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>基本工资</TableHead>
                  <TableHead>加班费</TableHead>
                  <TableHead>奖金</TableHead>
                  <TableHead>扣款</TableHead>
                  <TableHead>实发工资</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaries.map((salary) => (
                  <TableRow key={salary.id}>
                    <TableCell className="font-medium">
                      {salary.employees?.name}
                      <div className="text-xs text-muted-foreground">
                        {salary.employees?.position}
                      </div>
                    </TableCell>
                    <TableCell>{salary.employees?.department}</TableCell>
                    <TableCell>¥{Number(salary.base_salary).toLocaleString()}</TableCell>
                    <TableCell>¥{Number(salary.overtime_pay).toLocaleString()}</TableCell>
                    <TableCell className="text-green-600">+¥{Number(salary.bonus).toLocaleString()}</TableCell>
                    <TableCell className="text-red-600">-¥{Number(salary.deduction).toLocaleString()}</TableCell>
                    <TableCell className="font-bold text-lg">
                      ¥{Number(salary.total_salary).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {salary.status === 'pending' && <Badge variant="outline">待确认</Badge>}
                      {salary.status === 'confirmed' && <Badge variant="secondary">已确认</Badge>}
                      {salary.status === 'paid' && <Badge className="bg-green-500">已发放</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {salary.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleConfirm(salary.id)}
                          >
                            确认
                          </Button>
                        )}
                        {salary.status === 'confirmed' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handlePay(salary.id)}
                          >
                            发放
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">
                          详情
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 生成工资条弹窗 */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>生成工资条</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>月份</Label>
              <Input
                type="month"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              将为所有在职员工生成 {formData.month} 月的工资条，工资条金额根据员工基本工资自动计算。
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>取消</Button>
            <Button onClick={handleGenerateSalaries} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              生成工资条
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
