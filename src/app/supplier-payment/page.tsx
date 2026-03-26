'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  DollarSign,
  CreditCard,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Building2,
  TrendingUp,
  ArrowUpDown,
  Receipt,
  Banknote,
} from 'lucide-react';

// 付款单
interface PaymentRecord {
  id: string;
  paymentNo: string;
  supplierId: string;
  supplierName: string;
  relatedOrder: string;
  amount: number;
  paidAmount: number;
  unpaidAmount: number;
  paymentMethod: 'bank' | 'cash' | 'check';
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  dueDate: string;
  paidDate?: string;
  bankAccount?: string;
  bankName?: string;
  remark?: string;
  createdAt: string;
}

// 供应商账务
interface SupplierAccount {
  id: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  orderCount: number;
  paymentCount: number;
  creditLimit: number;
  creditUsed: number;
  status: 'normal' | 'warning' | 'overdue';
}

// 付款计划
interface PaymentPlan {
  id: string;
  supplierId: string;
  supplierName: string;
  orderNo: string;
  totalAmount: number;
  payments: PaymentInstallment[];
  status: 'active' | 'completed';
}

interface PaymentInstallment {
  id: string;
  installmentNo: number;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: string;
}

export default function SupplierPaymentPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // 付款记录
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  
  // 供应商账务
  const [supplierAccounts, setSupplierAccounts] = useState<SupplierAccount[]>([]);
  
  // 付款计划
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  
  // 新建付款
  const [createPaymentDialogOpen, setCreatePaymentDialogOpen] = useState(false);
  const [newPayment, setNewPayment] = useState<{
    supplierId: string;
    supplierName: string;
    relatedOrder: string;
    amount: number;
    paymentMethod: 'bank' | 'cash' | 'check';
    dueDate: string;
    bankAccount: string;
    bankName: string;
    remark: string;
  }>({
    supplierId: '',
    supplierName: '',
    relatedOrder: '',
    amount: 0,
    paymentMethod: 'bank',
    dueDate: '',
    bankAccount: '',
    bankName: '',
    remark: '',
  });
  
  // 付款趋势
  const [paymentTrend, setPaymentTrend] = useState<{month: string; total: number; paid: number}[]>([]);
  
  // 统计
  const [stats, setStats] = useState({
    totalPayable: 0,
    totalPaid: 0,
    totalUnpaid: 0,
    overdueAmount: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 模拟付款记录
      const mockPayments: PaymentRecord[] = [
        {
          id: '1',
          paymentNo: 'PAY-2024-001',
          supplierId: 'S001',
          supplierName: '供应商A',
          relatedOrder: 'PO-2024-001',
          amount: 50000,
          paidAmount: 50000,
          unpaidAmount: 0,
          paymentMethod: 'bank',
          status: 'paid',
          dueDate: '2024-01-10',
          paidDate: '2024-01-08',
          bankAccount: '6222 **** **** 1234',
          bankName: '工商银行',
          createdAt: '2024-01-05',
        },
        {
          id: '2',
          paymentNo: 'PAY-2024-002',
          supplierId: 'S002',
          supplierName: '供应商B',
          relatedOrder: 'PO-2024-002',
          amount: 30000,
          paidAmount: 15000,
          unpaidAmount: 15000,
          paymentMethod: 'bank',
          status: 'partial',
          dueDate: '2024-01-20',
          createdAt: '2024-01-10',
        },
        {
          id: '3',
          paymentNo: 'PAY-2024-003',
          supplierId: 'S003',
          supplierName: '供应商C',
          relatedOrder: 'PO-2024-003',
          amount: 80000,
          paidAmount: 0,
          unpaidAmount: 80000,
          paymentMethod: 'bank',
          status: 'pending',
          dueDate: '2024-01-25',
          createdAt: '2024-01-12',
        },
        {
          id: '4',
          paymentNo: 'PAY-2024-004',
          supplierId: 'S001',
          supplierName: '供应商A',
          relatedOrder: 'PO-2024-004',
          amount: 25000,
          paidAmount: 0,
          unpaidAmount: 25000,
          paymentMethod: 'bank',
          status: 'overdue',
          dueDate: '2024-01-05',
          createdAt: '2024-01-01',
        },
      ];
      setPayments(mockPayments);

      // 供应商账务
      setSupplierAccounts([
        { id: '1', supplierId: 'S001', supplierName: '供应商A', totalAmount: 150000, paidAmount: 100000, unpaidAmount: 50000, orderCount: 8, paymentCount: 5, creditLimit: 200000, creditUsed: 50000, status: 'normal' },
        { id: '2', supplierId: 'S002', supplierName: '供应商B', totalAmount: 80000, paidAmount: 60000, unpaidAmount: 20000, orderCount: 5, paymentCount: 3, creditLimit: 100000, creditUsed: 20000, status: 'normal' },
        { id: '3', supplierId: 'S003', supplierName: '供应商C', totalAmount: 120000, paidAmount: 40000, unpaidAmount: 80000, orderCount: 6, paymentCount: 2, creditLimit: 80000, creditUsed: 80000, status: 'warning' },
        { id: '4', supplierId: 'S004', supplierName: '供应商D', totalAmount: 50000, paidAmount: 30000, unpaidAmount: 20000, orderCount: 3, paymentCount: 2, creditLimit: 50000, creditUsed: 20000, status: 'overdue' },
      ]);

      // 付款计划
      setPaymentPlans([
        {
          id: '1',
          supplierId: 'S001',
          supplierName: '供应商A',
          orderNo: 'PO-2024-005',
          totalAmount: 100000,
          status: 'active',
          payments: [
            { id: '1', installmentNo: 1, amount: 30000, dueDate: '2024-01-15', status: 'paid', paidDate: '2024-01-14' },
            { id: '2', installmentNo: 2, amount: 40000, dueDate: '2024-02-15', status: 'pending' },
            { id: '3', installmentNo: 3, amount: 30000, dueDate: '2024-03-15', status: 'pending' },
          ],
        },
        {
          id: '2',
          supplierId: 'S002',
          supplierName: '供应商B',
          orderNo: 'PO-2024-006',
          totalAmount: 60000,
          status: 'active',
          payments: [
            { id: '1', installmentNo: 1, amount: 20000, dueDate: '2024-01-20', status: 'paid', paidDate: '2024-01-19' },
            { id: '2', installmentNo: 2, amount: 20000, dueDate: '2024-02-20', status: 'pending' },
            { id: '3', installmentNo: 3, amount: 20000, dueDate: '2024-03-20', status: 'pending' },
          ],
        },
      ]);

      // 付款趋势
      setPaymentTrend([
        { month: '01', total: 180000, paid: 150000 },
        { month: '02', total: 220000, paid: 180000 },
        { month: '03', total: 160000, paid: 140000 },
        { month: '04', total: 250000, paid: 200000 },
        { month: '05', total: 200000, paid: 170000 },
        { month: '06', total: 230000, paid: 190000 },
      ]);

      // 统计
      setStats({
        totalPayable: mockPayments.reduce((sum, p) => sum + p.amount, 0),
        totalPaid: mockPayments.reduce((sum, p) => sum + p.paidAmount, 0),
        totalUnpaid: mockPayments.reduce((sum, p) => sum + p.unpaidAmount, 0),
        overdueAmount: mockPayments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.unpaidAmount, 0),
      });

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = () => {
    if (!newPayment.supplierName || !newPayment.amount) {
      alert('请填写完整信息');
      return;
    }

    const payment: PaymentRecord = {
      id: Date.now().toString(),
      paymentNo: `PAY-${Date.now()}`,
      supplierId: newPayment.supplierId || `S${Date.now()}`,
      supplierName: newPayment.supplierName,
      relatedOrder: newPayment.relatedOrder,
      amount: newPayment.amount,
      paidAmount: 0,
      unpaidAmount: newPayment.amount,
      paymentMethod: newPayment.paymentMethod,
      status: 'pending',
      dueDate: newPayment.dueDate,
      bankAccount: newPayment.bankAccount,
      bankName: newPayment.bankName,
      remark: newPayment.remark,
      createdAt: new Date().toLocaleDateString(),
    };

    setPayments(prev => [payment, ...prev]);
    setCreatePaymentDialogOpen(false);
    setNewPayment({
      supplierId: '',
      supplierName: '',
      relatedOrder: '',
      amount: 0,
      paymentMethod: 'bank',
      dueDate: '',
      bankAccount: '',
      bankName: '',
      remark: '',
    });
  };

  const handlePay = (amount: number) => {
    if (!selectedPayment) return;
    
    setPayments(prev => prev.map(p => {
      if (p.id === selectedPayment.id) {
        const newPaidAmount = p.paidAmount + amount;
        const newUnpaidAmount = p.amount - newPaidAmount;
        return {
          ...p,
          paidAmount: newPaidAmount,
          unpaidAmount: newUnpaidAmount,
          status: newUnpaidAmount <= 0 ? 'paid' : 'partial',
          paidDate: new Date().toLocaleDateString(),
        };
      }
      return p;
    }));
    setPaymentDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: '待付款', className: 'bg-gray-100 text-gray-800' },
      partial: { label: '部分付款', className: 'bg-yellow-100 text-yellow-800' },
      paid: { label: '已付清', className: 'bg-green-100 text-green-800' },
      overdue: { label: '已逾期', className: 'bg-red-100 text-red-800' },
    };
    return config[status as keyof typeof config];
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = { bank: '银行转账', cash: '现金', check: '支票' };
    return labels[method as keyof typeof labels];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">供应商付款管理</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出报表
          </Button>
          <Button onClick={() => setCreatePaymentDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新建付款单
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">应付总额</p>
                <p className="text-2xl font-bold">¥{stats.totalPayable.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已付金额</p>
                <p className="text-2xl font-bold text-green-600">¥{stats.totalPaid.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">待付金额</p>
                <p className="text-2xl font-bold text-orange-600">¥{stats.totalUnpaid.toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">逾期金额</p>
                <p className="text-2xl font-bold text-red-600">¥{stats.overdueAmount.toLocaleString()}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            概览
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Receipt className="h-4 w-4 mr-2" />
            付款记录
          </TabsTrigger>
          <TabsTrigger value="accounts">
            <Building2 className="h-4 w-4 mr-2" />
            供应商账务
          </TabsTrigger>
          <TabsTrigger value="plans">
            <Calendar className="h-4 w-4 mr-2" />
            付款计划
          </TabsTrigger>
        </TabsList>

        {/* 概览 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* 付款趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">付款趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                      <Bar dataKey="total" name="应付" fill="#94a3b8" />
                      <Bar dataKey="paid" name="已付" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 待付款列表 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">待付款提醒</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.filter(p => p.status !== 'paid').slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{payment.supplierName}</p>
                        <p className="text-sm text-muted-foreground">
                          到期日: {payment.dueDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">¥{payment.unpaidAmount.toLocaleString()}</p>
                        <Badge className={getStatusBadge(payment.status).className}>
                          {getStatusBadge(payment.status).label}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 最近付款记录 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">最近付款记录</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>付款单号</TableHead>
                    <TableHead>供应商</TableHead>
                    <TableHead>关联订单</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead className="text-right">已付</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>到期日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.slice(0, 5).map((payment) => {
                    const statusConfig = getStatusBadge(payment.status);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.paymentNo}</TableCell>
                        <TableCell>{payment.supplierName}</TableCell>
                        <TableCell>{payment.relatedOrder}</TableCell>
                        <TableCell className="text-right">¥{payment.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{payment.paidAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                        </TableCell>
                        <TableCell>{payment.dueDate}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 付款记录 */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-between">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="搜索付款单..." className="pl-10 w-64" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="pending">待付款</SelectItem>
                  <SelectItem value="partial">部分付款</SelectItem>
                  <SelectItem value="paid">已付清</SelectItem>
                  <SelectItem value="overdue">已逾期</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>付款单号</TableHead>
                    <TableHead>供应商</TableHead>
                    <TableHead>关联订单</TableHead>
                    <TableHead>付款方式</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead className="text-right">已付</TableHead>
                    <TableHead className="text-right">未付</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>到期日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const statusConfig = getStatusBadge(payment.status);
                    return (
                      <TableRow key={payment.id} className={payment.status === 'overdue' ? 'bg-red-50' : ''}>
                        <TableCell className="font-medium">{payment.paymentNo}</TableCell>
                        <TableCell>{payment.supplierName}</TableCell>
                        <TableCell>{payment.relatedOrder}</TableCell>
                        <TableCell>{getPaymentMethodLabel(payment.paymentMethod)}</TableCell>
                        <TableCell className="text-right">¥{payment.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-600">¥{payment.paidAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-600">¥{payment.unpaidAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                        </TableCell>
                        <TableCell>{payment.dueDate}</TableCell>
                        <TableCell>
                          {payment.status !== 'paid' && (
                            <Button 
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setPaymentDialogOpen(true);
                              }}
                            >
                              <Banknote className="h-4 w-4 mr-1" />
                              付款
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 供应商账务 */}
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>供应商</TableHead>
                    <TableHead className="text-right">应付总额</TableHead>
                    <TableHead className="text-right">已付金额</TableHead>
                    <TableHead className="text-right">未付金额</TableHead>
                    <TableHead className="text-right">订单数</TableHead>
                    <TableHead className="text-right">信用额度</TableHead>
                    <TableHead className="text-right">已用额度</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.supplierName}</TableCell>
                      <TableCell className="text-right">¥{account.totalAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">¥{account.paidAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">¥{account.unpaidAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{account.orderCount}</TableCell>
                      <TableCell className="text-right">¥{account.creditLimit.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={account.creditUsed > account.creditLimit * 0.8 ? 'text-red-600 font-medium' : ''}>
                          ¥{account.creditUsed.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          account.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          account.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {account.status === 'overdue' ? '逾期' : account.status === 'warning' ? '预警' : '正常'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">详情</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 付款计划 */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-end">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建付款计划
            </Button>
          </div>

          {paymentPlans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">
                    {plan.supplierName} - {plan.orderNo}
                  </CardTitle>
                  <Badge className={plan.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                    {plan.status === 'completed' ? '已完成' : '进行中'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plan.payments.map((installment) => (
                    <div 
                      key={installment.id} 
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        installment.status === 'paid' ? 'bg-green-50' :
                        installment.status === 'overdue' ? 'bg-red-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          installment.status === 'paid' ? 'bg-green-500 text-white' :
                          installment.status === 'overdue' ? 'bg-red-500 text-white' : 'bg-gray-300'
                        }`}>
                          {installment.installmentNo}
                        </div>
                        <div>
                          <p className="font-medium">第 {installment.installmentNo} 期</p>
                          <p className="text-sm text-muted-foreground">
                            到期日: {installment.dueDate}
                            {installment.paidDate && ` | 付款日: ${installment.paidDate}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold">¥{installment.amount.toLocaleString()}</p>
                        <Badge className={
                          installment.status === 'paid' ? 'bg-green-100 text-green-800' :
                          installment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {installment.status === 'paid' ? '已付款' :
                           installment.status === 'overdue' ? '已逾期' : '待付款'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t flex justify-between">
                  <span className="text-muted-foreground">付款进度</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {plan.payments.filter(p => p.status === 'paid').length} / {plan.payments.length} 期
                    </span>
                    <span className="text-green-600 font-bold">
                      ¥{plan.payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0).toLocaleString()} / ¥{plan.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* 付款对话框 */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>付款</DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>供应商: <span className="font-medium">{selectedPayment.supplierName}</span></div>
                  <div>付款单号: <span className="font-medium">{selectedPayment.paymentNo}</span></div>
                  <div>应付金额: <span className="font-medium">¥{selectedPayment.amount.toLocaleString()}</span></div>
                  <div>未付金额: <span className="font-medium text-red-600">¥{selectedPayment.unpaidAmount.toLocaleString()}</span></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>付款金额</Label>
                <Input 
                  type="number" 
                  defaultValue={selectedPayment.unpaidAmount}
                  id="payment-amount"
                />
              </div>
              
              <div className="space-y-2">
                <Label>付款方式</Label>
                <Select defaultValue="bank">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">银行转账</SelectItem>
                    <SelectItem value="cash">现金</SelectItem>
                    <SelectItem value="check">支票</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => {
              const amountInput = document.getElementById('payment-amount') as HTMLInputElement;
              handlePay(parseFloat(amountInput?.value || '0'));
            }}>
              确认付款
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建付款单对话框 */}
      <Dialog open={createPaymentDialogOpen} onOpenChange={setCreatePaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建付款单</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>供应商 *</Label>
                <Input
                  value={newPayment.supplierName}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, supplierName: e.target.value }))}
                  placeholder="供应商名称"
                />
              </div>
              <div className="space-y-2">
                <Label>关联订单</Label>
                <Input
                  value={newPayment.relatedOrder}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, relatedOrder: e.target.value }))}
                  placeholder="PO-2024-001"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>付款金额 *</Label>
                <Input
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>到期日 *</Label>
                <Input
                  type="date"
                  value={newPayment.dueDate}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>付款方式</Label>
              <Select
                value={newPayment.paymentMethod}
                onValueChange={(value: 'bank' | 'cash' | 'check') => 
                  setNewPayment(prev => ({ ...prev, paymentMethod: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">银行转账</SelectItem>
                  <SelectItem value="cash">现金</SelectItem>
                  <SelectItem value="check">支票</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开户银行</Label>
                <Input
                  value={newPayment.bankName}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, bankName: e.target.value }))}
                  placeholder="银行名称"
                />
              </div>
              <div className="space-y-2">
                <Label>银行账户</Label>
                <Input
                  value={newPayment.bankAccount}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, bankAccount: e.target.value }))}
                  placeholder="银行账号"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                value={newPayment.remark}
                onChange={(e) => setNewPayment(prev => ({ ...prev, remark: e.target.value }))}
                placeholder="备注信息"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePaymentDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreatePayment}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
