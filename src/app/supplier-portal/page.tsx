'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getColorValue } from '@/lib/color-utils';
import {
  Building2,
  Package,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  LogIn,
  LogOut,
  Send,
  Eye,
} from 'lucide-react';

interface SupplierInfo {
  id: string;
  code: string;
  name: string;
  contact: string;
  phone: string;
  level: number;
  status: string;
}

interface OutsourceOrder {
  id: string;
  outsource_no: string;
  style_no: string;
  size: string;
  color: string;
  quantity: number;
  process_name: string;
  unit_price: number;
  total_price: number;
  status: string;
  send_date: string;
  expected_return_date: string;
  notes: string;
}

export default function SupplierPortalPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [supplier, setSupplier] = useState<SupplierInfo | null>(null);
  const [orders, setOrders] = useState<OutsourceOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  
  // 登录表单
  const [loginForm, setLoginForm] = useState({
    code: '',
    phone: '',
  });
  
  // 回货表单
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OutsourceOrder | null>(null);
  const [returnForm, setReturnForm] = useState({
    quantity: 0,
    notes: '',
  });

  // 对账表单
  const [statementDialogOpen, setStatementDialogOpen] = useState(false);

  useEffect(() => {
    // 检查本地存储的登录状态
    const savedSupplier = localStorage.getItem('supplier_info');
    if (savedSupplier) {
      try {
        const parsed = JSON.parse(savedSupplier);
        setSupplier(parsed);
        setIsLoggedIn(true);
      } catch (e) {
        // 解析失败，清除无效数据
        localStorage.removeItem('supplier_info');
      }
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && supplier) {
      fetchOrders();
    }
  }, [isLoggedIn, supplier, activeTab]);

  const handleLogin = async () => {
    if (!loginForm.code || !loginForm.phone) {
      alert('请填写供应商编码和联系电话');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/supplier-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (data.success) {
        setSupplier(data.data);
        setIsLoggedIn(true);
        localStorage.setItem('supplier_info', JSON.stringify(data.data));
      } else {
        alert(data.error || '登录失败');
      }
    } catch (error) {
      alert('登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // 清除所有状态
    setIsLoggedIn(false);
    setSupplier(null);
    setOrders([]);
    setLoginForm({ code: '', phone: '' });
    // 清除本地存储
    localStorage.removeItem('supplier_info');
    // 强制刷新页面到登录状态
    router.refresh();
  };

  const fetchOrders = async () => {
    if (!supplier) return;
    
    setLoading(true);
    try {
      let statusParam = '';
      if (activeTab === 'pending') {
        statusParam = 'status=pending';
      } else if (activeTab === 'in_progress') {
        statusParam = 'status=shipped&status=in_production';
      } else if (activeTab === 'completed') {
        statusParam = 'status=completed';
      }

      const res = await fetch(`/api/bundle-outsource?supplier_id=${supplier.id}&${statusParam}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReturn = (order: OutsourceOrder) => {
    setSelectedOrder(order);
    setReturnForm({
      quantity: order.quantity,
      notes: '',
    });
    setReturnDialogOpen(true);
  };

  const handleSubmitReturn = async () => {
    if (!selectedOrder || !supplier) return;

    try {
      const res = await fetch('/api/bundle-outsource/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outsource_id: selectedOrder.id,
          bundle_id: selectedOrder.id,
          quantity: returnForm.quantity,
          quality: 'good',
          notes: returnForm.notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('回货提交成功！');
        setReturnDialogOpen(false);
        fetchOrders();
      } else {
        alert(data.error || '提交失败');
      }
    } catch (error) {
      alert('提交失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: '待发货', className: 'bg-gray-100 text-gray-800' },
      shipped: { label: '已发货', className: 'bg-blue-100 text-blue-800' },
      in_production: { label: '生产中', className: 'bg-yellow-100 text-yellow-800' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-800' },
    };
    const { label, className } = config[status] || config.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  // 统计数据
  const stats = {
    pending: orders.filter(o => o.status === 'pending').length,
    inProgress: orders.filter(o => ['shipped', 'in_production'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'completed').length,
    totalAmount: orders.reduce((sum, o) => sum + (o.total_price || 0), 0),
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl">供应商工作台</CardTitle>
            <p className="text-sm text-gray-500">请使用供应商编码和联系电话登录</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>供应商编码</Label>
              <Input
                value={loginForm.code}
                onChange={(e) => setLoginForm({ ...loginForm, code: e.target.value })}
                placeholder="输入供应商编码"
              />
            </div>
            <div className="space-y-2">
              <Label>联系电话</Label>
              <Input
                value={loginForm.phone}
                onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
                placeholder="输入联系电话"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? '登录中...' : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  登录
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold">{supplier?.name}</div>
              <div className="text-sm text-gray-500">
                {supplier?.level}级供应商 | {supplier?.code}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            退出
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">待处理</span>
                <Clock className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">进行中</span>
                <Package className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">已完成</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">累计金额</span>
                <DollarSign className="h-4 w-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-orange-600">
                ¥{stats.totalAmount.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 订单列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>外发订单</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setStatementDialogOpen(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                对账单
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending">待发货 ({stats.pending})</TabsTrigger>
                <TabsTrigger value="in_progress">进行中 ({stats.inProgress})</TabsTrigger>
                <TabsTrigger value="completed">已完成 ({stats.completed})</TabsTrigger>
                <TabsTrigger value="all">全部</TabsTrigger>
              </TabsList>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>外发单号</TableHead>
                    <TableHead>款号</TableHead>
                    <TableHead>颜色/尺码</TableHead>
                    <TableHead>工序</TableHead>
                    <TableHead>数量</TableHead>
                    <TableHead>单价</TableHead>
                    <TableHead>总价</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>发送日期</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        暂无订单
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono">{order.outsource_no}</TableCell>
                        <TableCell className="font-medium">{order.style_no}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-5 h-5 rounded-full border border-gray-200 shadow-sm"
                              style={{ backgroundColor: getColorValue(order.color) }}
                            />
                            <div>
                              <div className="font-bold">{order.color}</div>
                              <div className="text-gray-500 text-xs">{order.size}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{order.process_name}</TableCell>
                        <TableCell className="font-bold text-blue-600">{order.quantity}件</TableCell>
                        <TableCell>¥{order.unit_price}</TableCell>
                        <TableCell className="font-medium">¥{order.total_price}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>{order.send_date}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedOrder(order);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {['shipped', 'in_production'].includes(order.status) && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenReturn(order)}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                回货
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* 回货对话框 */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>提交回货</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <div><strong>外发单号：</strong>{selectedOrder.outsource_no}</div>
                <div><strong>外发数量：</strong>{selectedOrder.quantity}件</div>
              </div>
              
              <div className="space-y-2">
                <Label>回货数量</Label>
                <Input
                  type="number"
                  value={returnForm.quantity}
                  onChange={(e) => setReturnForm({ ...returnForm, quantity: parseInt(e.target.value) || 0 })}
                  max={selectedOrder.quantity}
                />
              </div>
              
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  placeholder="如有问题请说明..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSubmitReturn}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  确认回货
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 对账单对话框 */}
      <Dialog open={statementDialogOpen} onOpenChange={setStatementDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>对账单</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">供应商</div>
                  <div className="font-medium">{supplier?.name}</div>
                </div>
                <div>
                  <div className="text-gray-500">累计订单</div>
                  <div className="font-medium">{orders.length}笔</div>
                </div>
                <div>
                  <div className="text-gray-500">累计金额</div>
                  <div className="font-medium text-orange-600">¥{stats.totalAmount.toLocaleString()}</div>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 text-center py-8">
              * 对账单仅供参考，具体以财务确认为准
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
