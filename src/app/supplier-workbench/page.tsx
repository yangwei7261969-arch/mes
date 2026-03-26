'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { getColorValue } from '@/lib/color-utils';
import {
  Factory,
  Package,
  CheckCircle,
  Clock,
  Truck,
  AlertCircle,
  ArrowRight,
  Play,
  LogOut,
  Building2,
  DollarSign,
  Settings,
  FileText,
  Calendar,
  TrendingUp,
  Users,
  Bell,
  ChevronRight,
  XCircle,
} from 'lucide-react';

interface Supplier {
  id: string;
  code: string;
  name: string;
  type: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  status: string;
  balance: number;
}

interface OutsourceOrder {
  id: string;
  order_no: string;
  style_no: string;
  style_name: string;
  color: string;
  size: string;
  quantity: number;
  completed_quantity: number;
  unit_price: number;
  total_amount: number;
  status: string;
  plan_start_date: string;
  plan_end_date: string;
  notes: string;
  created_at: string;
}

interface Progress {
  id: string;
  stage: string;
  stage_name: string;
  quantity: number;
  completed_qty: number;
  status: string;
  start_date: string;
  end_date: string;
  notes: string;
}

interface Shipment {
  id: string;
  task_no: string;
  style_no: string;
  quantity: number;
  receiver: string;
  receiver_phone: string;
  courier: string;
  tracking_no: string;
  ship_date: string;
  status: string;
}

interface Payment {
  id: string;
  payment_no: string;
  amount: number;
  payment_type: string;
  status: string;
  created_at: string;
  notes: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待接单', color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: '已接单', color: 'bg-blue-100 text-blue-800' },
  in_production: { label: '生产中', color: 'bg-indigo-100 text-indigo-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  delivered: { label: '已交付', color: 'bg-teal-100 text-teal-800' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
};

const stageOrder = ['production_prep', 'cutting', 'craft', 'workshop', 'finishing', 'shipping'];
const stageNames: Record<string, string> = {
  production_prep: '生产准备',
  cutting: '裁剪',
  craft: '工艺',
  workshop: '车间生产',
  finishing: '后整',
  shipping: '发货',
};

export default function SupplierWorkbenchPage() {
  const router = useRouter();
  const [supplierInfo, setSupplierInfo] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // 数据状态
  const [orders, setOrders] = useState<OutsourceOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OutsourceOrder | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  // 弹窗状态
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [shipForm, setShipForm] = useState({
    quantity: 0,
    courier: '',
    tracking_no: '',
  });

  useEffect(() => {
    // 检查登录状态
    const supplierInfoStr = localStorage.getItem('supplier_info');
    const userType = localStorage.getItem('user_type');
    
    if (!supplierInfoStr || userType !== 'supplier') {
      router.push('/supplier-login');
      return;
    }

    setSupplierInfo(JSON.parse(supplierInfoStr));
  }, [router]);

  useEffect(() => {
    if (supplierInfo) {
      fetchAllData();
    }
  }, [supplierInfo]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOrders(),
        fetchShipments(),
        fetchPayments(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    if (!supplierInfo) return;
    try {
      const response = await fetch(`/api/outsource-orders?supplier_id=${supplierInfo.id}`);
      const result = await response.json();
      if (result.success) {
        setOrders(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const fetchShipments = async () => {
    if (!supplierInfo) return;
    try {
      const response = await fetch(`/api/shipping-tasks?supplier_id=${supplierInfo.id}`);
      const result = await response.json();
      if (result.success) {
        setShipments(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    }
  };

  const fetchPayments = async () => {
    if (!supplierInfo) return;
    try {
      const response = await fetch(`/api/supplier-payments?supplier_id=${supplierInfo.id}`);
      const result = await response.json();
      if (result.success) {
        setPayments(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const response = await fetch('/api/outsource-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: 'accepted' }),
      });

      const result = await response.json();
      if (result.success) {
        fetchOrders();
        alert('接单成功！');
      } else {
        alert(result.error || '操作失败');
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    if (!confirm('确定要拒绝此订单吗？')) return;

    try {
      const response = await fetch('/api/outsource-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: 'rejected' }),
      });

      const result = await response.json();
      if (result.success) {
        fetchOrders();
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleViewProgress = async (order: OutsourceOrder) => {
    setSelectedOrder(order);
    try {
      const response = await fetch(`/api/outsource-progress?outsource_order_id=${order.id}`);
      const result = await response.json();
      if (result.success) {
        const sorted = stageOrder.map(stage => 
          result.data.find((p: Progress) => p.stage === stage)
        ).filter(Boolean);
        setProgress(sorted);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
    setProgressDialogOpen(true);
  };

  const handleUpdateProgress = async (progressId: string, status: string) => {
    try {
      const response = await fetch('/api/outsource-progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: progressId, 
          status,
          outsource_order_id: selectedOrder!.id,
        }),
      });

      const result = await response.json();
      if (result.success) {
        handleViewProgress(selectedOrder!);
        fetchOrders();
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleCreateShipment = async () => {
    if (!selectedOrder) return;
    
    try {
      const response = await fetch('/api/shipping-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outsource_order_id: selectedOrder.id,
          supplier_id: supplierInfo?.id,
          style_no: selectedOrder.style_no,
          quantity: shipForm.quantity,
          courier: shipForm.courier,
          tracking_no: shipForm.tracking_no,
          ship_date: new Date().toISOString().split('T')[0],
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShipDialogOpen(false);
        fetchShipments();
        alert('发货成功！');
      } else {
        alert(result.error || '发货失败');
      }
    } catch (error) {
      alert('发货失败');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('supplier_info');
    localStorage.removeItem('user_type');
    router.push('/supplier-login');
  };

  // 统计数据
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const acceptedCount = orders.filter(o => o.status === 'accepted').length;
  const inProgressCount = orders.filter(o => o.status === 'in_production').length;
  const completedCount = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
  
  const totalAmount = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const completedAmount = orders
    .filter(o => o.status === 'completed' || o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const pendingAmount = totalAmount - completedAmount;

  // 即将到期订单
  const urgentOrders = orders.filter(o => {
    if (o.status === 'completed' || o.status === 'delivered' || o.status === 'rejected') return false;
    const daysLeft = Math.ceil((new Date(o.plan_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 3;
  });

  if (!supplierInfo) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
              <Factory className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">供应商工作台</h1>
              <p className="text-sm text-gray-500">{supplierInfo.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {supplierInfo.code}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" />
              退出
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">
              <TrendingUp className="h-4 w-4 mr-1" />
              仪表盘
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Package className="h-4 w-4 mr-1" />
              外发订单
            </TabsTrigger>
            <TabsTrigger value="shipments">
              <Truck className="h-4 w-4 mr-1" />
              发货管理
            </TabsTrigger>
            <TabsTrigger value="finance">
              <DollarSign className="h-4 w-4 mr-1" />
              财务对账
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-1" />
              账号设置
            </TabsTrigger>
          </TabsList>

          {/* 仪表盘 */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{pendingCount}</div>
                      <div className="text-sm text-gray-500">待接单</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{acceptedCount + inProgressCount}</div>
                      <div className="text-sm text-gray-500">进行中</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{completedCount}</div>
                      <div className="text-sm text-gray-500">已完成</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">¥{pendingAmount.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">待结算</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 即将到期提醒 */}
            {urgentOrders.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <AlertCircle className="h-5 w-5" />
                    即将到期订单
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {urgentOrders.map((order) => {
                      const daysLeft = Math.ceil((new Date(order.plan_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={order.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="font-mono">{order.order_no}</span>
                            <span className="font-bold">{order.style_no}</span>
                            <span className="text-gray-500">{order.quantity}件</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={daysLeft <= 1 ? 'bg-red-500' : 'bg-orange-500'}>
                              {daysLeft <= 0 ? '已超期' : `${daysLeft}天后到期`}
                            </Badge>
                            <Button size="sm" onClick={() => handleViewProgress(order)}>
                              查看进度
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 最近订单 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    最近订单
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('orders')}>
                    查看全部 <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>订单号</TableHead>
                      <TableHead>款号</TableHead>
                      <TableHead>数量</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>交期</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.slice(0, 5).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono">{order.order_no}</TableCell>
                        <TableCell className="font-bold">{order.style_no}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>¥{order.total_amount?.toLocaleString()}</TableCell>
                        <TableCell>{order.plan_end_date}</TableCell>
                        <TableCell>
                          <Badge className={statusMap[order.status]?.color}>
                            {statusMap[order.status]?.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 外发订单 */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>外发订单列表</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">加载中...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">暂无订单</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>订单号</TableHead>
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
                        <TableRow key={order.id} className={order.status === 'pending' ? 'bg-yellow-50' : ''}>
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
                            <div className="flex justify-end gap-2">
                              {order.status === 'pending' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleAcceptOrder(order.id)}
                                  >
                                    接单
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleRejectOrder(order.id)}
                                  >
                                    拒绝
                                  </Button>
                                </>
                              )}
                              {(order.status === 'accepted' || order.status === 'in_production') && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleViewProgress(order)}
                                  >
                                    进度管理
                                  </Button>
                                  <Button 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setShipForm({
                                        quantity: order.quantity - (order.completed_quantity || 0),
                                        courier: '',
                                        tracking_no: '',
                                      });
                                      setShipDialogOpen(true);
                                    }}
                                  >
                                    发货
                                  </Button>
                                </>
                              )}
                              {order.status === 'completed' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleViewProgress(order)}
                                >
                                  查看详情
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
          </TabsContent>

          {/* 发货管理 */}
          <TabsContent value="shipments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>发货记录</CardTitle>
              </CardHeader>
              <CardContent>
                {shipments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">暂无发货记录</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>发货单号</TableHead>
                        <TableHead>款号</TableHead>
                        <TableHead>数量</TableHead>
                        <TableHead>快递公司</TableHead>
                        <TableHead>运单号</TableHead>
                        <TableHead>发货日期</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipments.map((ship) => (
                        <TableRow key={ship.id}>
                          <TableCell className="font-mono">{ship.task_no}</TableCell>
                          <TableCell className="font-bold">{ship.style_no}</TableCell>
                          <TableCell>{ship.quantity}</TableCell>
                          <TableCell>{ship.courier || '-'}</TableCell>
                          <TableCell className="font-mono">{ship.tracking_no || '-'}</TableCell>
                          <TableCell>{ship.ship_date}</TableCell>
                          <TableCell>
                            <Badge className={ship.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                              {ship.status === 'delivered' ? '已送达' : '运输中'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 财务对账 */}
          <TabsContent value="finance" className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-500">累计订单金额</div>
                  <div className="text-2xl font-bold">¥{totalAmount.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-500">已结算金额</div>
                  <div className="text-2xl font-bold text-green-600">¥{completedAmount.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-gray-500">待结算金额</div>
                  <div className="text-2xl font-bold text-orange-600">¥{pendingAmount.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>结算记录</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">暂无结算记录</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>结算单号</TableHead>
                        <TableHead>金额</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>日期</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono">{payment.payment_no}</TableCell>
                          <TableCell>¥{payment.amount.toLocaleString()}</TableCell>
                          <TableCell>{payment.payment_type}</TableCell>
                          <TableCell>{payment.created_at?.split('T')[0]}</TableCell>
                          <TableCell>
                            <Badge className={payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {payment.status === 'completed' ? '已完成' : '处理中'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 账号设置 */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>供应商信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">供应商编码</Label>
                    <div className="font-medium">{supplierInfo.code}</div>
                  </div>
                  <div>
                    <Label className="text-gray-500">公司名称</Label>
                    <div className="font-medium">{supplierInfo.name}</div>
                  </div>
                  <div>
                    <Label className="text-gray-500">联系人</Label>
                    <div className="font-medium">{supplierInfo.contact}</div>
                  </div>
                  <div>
                    <Label className="text-gray-500">联系电话</Label>
                    <div className="font-medium">{supplierInfo.phone}</div>
                  </div>
                  <div>
                    <Label className="text-gray-500">邮箱</Label>
                    <div className="font-medium">{supplierInfo.email || '-'}</div>
                  </div>
                  <div>
                    <Label className="text-gray-500">地址</Label>
                    <div className="font-medium">{supplierInfo.address || '-'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 进度管理弹窗 */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              生产进度管理
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">订单号：</span>
                  <span className="font-mono">{selectedOrder.order_no}</span>
                </div>
                <div>
                  <span className="text-gray-500">款号：</span>
                  <span className="font-bold">{selectedOrder.style_no}</span>
                </div>
                <div>
                  <span className="text-gray-500">数量：</span>
                  <span>{selectedOrder.quantity}</span>
                </div>
                <div>
                  <span className="text-gray-500">交期：</span>
                  <span>{selectedOrder.plan_end_date}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {progress.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无进度数据</div>
            ) : (
              progress.map((p, index) => {
                const isCurrent = p.status === 'in_progress';
                const isCompleted = p.status === 'completed';
                const prevCompleted = index === 0 || progress[index - 1]?.status === 'completed';

                return (
                  <div 
                    key={p.id} 
                    className={`p-4 border rounded-lg ${isCompleted ? 'bg-green-50 border-green-200' : isCurrent ? 'bg-blue-50 border-blue-200' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-blue-500 text-white' : 'bg-gray-200'
                        }`}>
                          {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{p.stage_name}</div>
                          <div className="text-sm text-gray-500">
                            {isCompleted ? `完成时间: ${p.end_date}` : isCurrent ? '进行中' : '待开始'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.status === 'in_progress' && (
                          <Button 
                            size="sm"
                            onClick={() => handleUpdateProgress(p.id, 'completed')}
                          >
                            完成此阶段
                          </Button>
                        )}
                        {p.status === 'pending' && prevCompleted && (
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateProgress(p.id, 'in_progress')}
                          >
                            开始
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressDialogOpen(false)}>
              关闭
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
              创建发货单
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>订单号: <span className="font-mono">{selectedOrder.order_no}</span></div>
                  <div>款号: <span className="font-bold">{selectedOrder.style_no}</span></div>
                  <div>订单数量: {selectedOrder.quantity}</div>
                  <div>已发货: {selectedOrder.completed_quantity || 0}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>发货数量</Label>
                <Input
                  type="number"
                  value={shipForm.quantity}
                  onChange={(e) => setShipForm({ ...shipForm, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>快递公司</Label>
                <Select value={shipForm.courier} onValueChange={(v) => setShipForm({ ...shipForm, courier: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择快递公司" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="顺丰">顺丰</SelectItem>
                    <SelectItem value="圆通">圆通</SelectItem>
                    <SelectItem value="中通">中通</SelectItem>
                    <SelectItem value="申通">申通</SelectItem>
                    <SelectItem value="韵达">韵达</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>运单号</Label>
                <Input
                  value={shipForm.tracking_no}
                  onChange={(e) => setShipForm({ ...shipForm, tracking_no: e.target.value })}
                  placeholder="输入运单号"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShipDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateShipment}>
              确认发货
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
