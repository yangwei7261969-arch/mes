'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  Search,
  Plus,
  MoreHorizontal,
  Users,
  Package,
  Database,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  BarChart3,
  Settings,
  Eye,
  Edit,
  Trash2,
  Pause,
  Play,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tenant {
  id: string;
  name: string;
  company_name: string;
  slug: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  trial_ends_at?: string;
  created_at: string;
  subscriptions?: {
    plan_id: string;
    status: string;
    current_period_end: string;
  };
}

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  limits: {
    max_users: number;
    max_orders: number;
    max_storage_gb: number;
    max_api_calls: number;
  };
  features: string[];
  is_active: boolean;
}

interface TenantStats {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  cancelled: number;
}

export default function SaaSTenantPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<TenantStats>({ total: 0, active: 0, trial: 0, suspended: 0, cancelled: 0 });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 新租户表单
  const [newTenant, setNewTenant] = useState({
    name: '',
    companyName: '',
    slug: '',
    planId: '',
    adminName: '',
    adminEmail: '',
  });

  useEffect(() => {
    fetchTenants();
    fetchPlans();
  }, [statusFilter]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/saas-tenant?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setTenants(result.data.tenants);
        setStats(result.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/saas-tenant?action=plans');
      const result = await response.json();
      if (result.success) {
        setPlans(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const handleCreateTenant = async () => {
    try {
      const response = await fetch('/api/saas-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          data: {
            name: newTenant.name,
            companyName: newTenant.companyName,
            slug: newTenant.slug,
            planId: newTenant.planId || null,
            adminUser: {
              name: newTenant.adminName,
              email: newTenant.adminEmail,
            },
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShowCreateDialog(false);
        setNewTenant({ name: '', companyName: '', slug: '', planId: '', adminName: '', adminEmail: '' });
        fetchTenants();
      }
    } catch (error) {
      console.error('Failed to create tenant:', error);
    }
  };

  const handleTenantAction = async (tenantId: string, action: string) => {
    try {
      const response = await fetch('/api/saas-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          data: { id: tenantId },
        }),
      });

      const result = await response.json();
      if (result.success) {
        fetchTenants();
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ReactNode }> = {
      active: { variant: 'default', label: '活跃', icon: <CheckCircle className="h-3 w-3" /> },
      trial: { variant: 'secondary', label: '试用', icon: <Clock className="h-3 w-3" /> },
      suspended: { variant: 'destructive', label: '已暂停', icon: <Pause className="h-3 w-3" /> },
      cancelled: { variant: 'outline', label: '已取消', icon: <XCircle className="h-3 w-3" /> },
    };

    const config = statusConfig[status] || statusConfig.active;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 计算MRR (月度经常性收入)
  const mrr = tenants
    .filter(t => t.status === 'active' && t.subscriptions?.plan_id)
    .reduce((sum, t) => {
      const plan = plans.find(p => p.id === t.subscriptions?.plan_id);
      return sum + (plan?.price_monthly || 0);
    }, 0);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SaaS多租户管理</h1>
          <p className="text-muted-foreground">管理租户、订阅计划和使用量统计</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建租户
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>创建新租户</DialogTitle>
              <DialogDescription>填写租户信息和管理员账户</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm">租户名称</label>
                <Input
                  className="col-span-3"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  placeholder="输入租户名称"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm">公司名称</label>
                <Input
                  className="col-span-3"
                  value={newTenant.companyName}
                  onChange={(e) => setNewTenant({ ...newTenant, companyName: e.target.value })}
                  placeholder="输入公司名称"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm">租户标识</label>
                <Input
                  className="col-span-3"
                  value={newTenant.slug}
                  onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="唯一标识（小写字母、数字、横线）"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm">订阅计划</label>
                <Select value={newTenant.planId} onValueChange={(v) => setNewTenant({ ...newTenant, planId: v })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="选择计划（试用可不选）" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {formatCurrency(plan.price_monthly)}/月
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm">管理员姓名</label>
                <Input
                  className="col-span-3"
                  value={newTenant.adminName}
                  onChange={(e) => setNewTenant({ ...newTenant, adminName: e.target.value })}
                  placeholder="输入管理员姓名"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm">管理员邮箱</label>
                <Input
                  className="col-span-3"
                  type="email"
                  value={newTenant.adminEmail}
                  onChange={(e) => setNewTenant({ ...newTenant, adminEmail: e.target.value })}
                  placeholder="输入管理员邮箱"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                取消
              </Button>
              <Button onClick={handleCreateTenant} disabled={!newTenant.name || !newTenant.slug}>
                创建租户
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总租户数</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              活跃: {stats.active} | 试用: {stats.trial}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(mrr)}</div>
            <p className="text-xs text-muted-foreground">
              月度经常性收入
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
            </div>
            <Progress 
              value={stats.total > 0 ? (stats.active / stats.total) * 100 : 0} 
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待处理</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.suspended}</div>
            <p className="text-xs text-muted-foreground">
              已暂停租户
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 主内容 */}
      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">租户列表</TabsTrigger>
          <TabsTrigger value="plans">订阅计划</TabsTrigger>
          <TabsTrigger value="usage">使用量监控</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-4">
          {/* 搜索和筛选 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索租户名称或公司..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchTenants()}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="状态筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="active">活跃</SelectItem>
                    <SelectItem value="trial">试用</SelectItem>
                    <SelectItem value="suspended">已暂停</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={fetchTenants}>搜索</Button>
              </div>
            </CardContent>
          </Card>

          {/* 租户列表 */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>租户名称</TableHead>
                  <TableHead>公司</TableHead>
                  <TableHead>标识</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>订阅计划</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : tenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无租户数据
                    </TableCell>
                  </TableRow>
                ) : (
                  tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell>{tenant.company_name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{tenant.slug}</code>
                      </TableCell>
                      <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                      <TableCell>
                        {tenant.subscriptions?.plan_id || (
                          <span className="text-muted-foreground text-sm">未订阅</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(tenant.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              setSelectedTenant(tenant);
                              setShowDetailDialog(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {tenant.status === 'active' && (
                              <DropdownMenuItem 
                                className="text-yellow-600"
                                onClick={() => handleTenantAction(tenant.id, 'suspend')}
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                暂停
                              </DropdownMenuItem>
                            )}
                            {tenant.status === 'suspended' && (
                              <DropdownMenuItem 
                                className="text-green-600"
                                onClick={() => handleTenantAction(tenant.id, 'reactivate')}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                重新激活
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className="relative">
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    {formatCurrency(plan.price_monthly)}/月 或 {formatCurrency(plan.price_yearly)}/年
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">用户上限：</span>
                      {plan.limits.max_users === -1 ? '无限制' : plan.limits.max_users}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">订单上限：</span>
                      {plan.limits.max_orders === -1 ? '无限制' : plan.limits.max_orders}/月
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">存储空间：</span>
                      {plan.limits.max_storage_gb === -1 ? '无限制' : `${plan.limits.max_storage_gb}GB`}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">API调用：</span>
                      {plan.limits.max_api_calls === -1 ? '无限制' : plan.limits.max_api_calls}/月
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm font-medium mb-2">功能特性：</p>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        {plan.features.slice(0, 5).map((feature, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>使用量监控</CardTitle>
              <CardDescription>实时监控各租户的资源使用情况</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertDescription>
                  选择上方租户列表中的租户查看详细使用量统计和配额使用情况。
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 租户详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>租户详情</DialogTitle>
            <DialogDescription>查看租户详细信息和使用情况</DialogDescription>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">租户名称</p>
                  <p className="font-medium">{selectedTenant.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">公司名称</p>
                  <p className="font-medium">{selectedTenant.company_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">标识</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{selectedTenant.slug}</code>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">状态</p>
                  {getStatusBadge(selectedTenant.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">创建时间</p>
                  <p className="font-medium">{formatDate(selectedTenant.created_at)}</p>
                </div>
                {selectedTenant.trial_ends_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">试用到期</p>
                    <p className="font-medium">{formatDate(selectedTenant.trial_ends_at)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
