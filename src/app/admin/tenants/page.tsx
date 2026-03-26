'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Building2,
  Plus,
  Edit,
  Trash2,
  Users,
  Factory,
  Settings,
  CheckCircle,
  XCircle,
  Crown,
  Zap,
  Star,
  Shield,
  Database,
  Key,
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  code: string;
  logo?: string;
  plan: string;
  status: string;
  max_users: number;
  max_orders: number;
  features: Record<string, boolean>;
  contact_person?: string;
  phone?: string;
  email?: string;
  created_at: string;
}

interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  department?: string;
  status: string;
  joined_at: string;
}

interface Factory {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  location?: string;
  capacity?: number;
  status: string;
}

const planConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  free: { label: '免费版', color: 'bg-gray-100 text-gray-800', icon: <Database className="h-4 w-4" /> },
  standard: { label: '标准版', color: 'bg-blue-100 text-blue-800', icon: <Star className="h-4 w-4" /> },
  premium: { label: '高级版', color: 'bg-purple-100 text-purple-800', icon: <Zap className="h-4 w-4" /> },
  enterprise: { label: '企业版', color: 'bg-amber-100 text-amber-800', icon: <Crown className="h-4 w-4" /> },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: '正常', color: 'bg-green-100 text-green-800' },
  suspended: { label: '已暂停', color: 'bg-red-100 text-red-800' },
  trial: { label: '试用中', color: 'bg-yellow-100 text-yellow-800' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
};

export default function TenantManagementPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    plan: string;
    max_users: number;
    max_orders: number;
    contact_person: string;
    phone: string;
    email: string;
    features: Record<string, boolean>;
  }>({
    name: '',
    code: '',
    plan: 'standard',
    max_users: 50,
    max_orders: 1000,
    contact_person: '',
    phone: '',
    email: '',
    features: {
      ai: true,
      cad: false,
      mes: true,
      advanced: false,
    },
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tenants');
      const result = await response.json();
      if (result.success) {
        setTenants(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantDetails = async (tenantId: string) => {
    try {
      const [usersRes, factoriesRes] = await Promise.all([
        fetch(`/api/tenants/${tenantId}/users`),
        fetch(`/api/tenants/${tenantId}/factories`),
      ]);

      const [usersData, factoriesData] = await Promise.all([
        usersRes.json(),
        factoriesRes.json(),
      ]);

      setTenantUsers(usersData.data || []);
      setFactories(factoriesData.data || []);
    } catch (error) {
      console.error('Failed to fetch tenant details:', error);
    }
  };

  const handleSelectTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    fetchTenantDetails(tenant.id);
  };

  const handleCreateTenant = () => {
    setEditMode(false);
    setFormData({
      name: '',
      code: '',
      plan: 'standard',
      max_users: 50,
      max_orders: 1000,
      contact_person: '',
      phone: '',
      email: '',
      features: { ai: true, cad: false, mes: true, advanced: false },
    });
    setDialogOpen(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditMode(true);
    setFormData({
      name: tenant.name,
      code: tenant.code,
      plan: tenant.plan,
      max_users: tenant.max_users || 50,
      max_orders: tenant.max_orders || 1000,
      contact_person: tenant.contact_person || '',
      phone: tenant.phone || '',
      email: tenant.email || '',
      features: tenant.features || { ai: true, cad: false, mes: true, advanced: false },
    });
    setSelectedTenant(tenant);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const url = editMode ? `/api/tenants/${selectedTenant?.id}` : '/api/tenants';
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        setDialogOpen(false);
        fetchTenants();
      } else {
        alert(result.error || '操作失败');
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleToggleStatus = async (tenant: Tenant) => {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`确定要${newStatus === 'active' ? '激活' : '暂停'} ${tenant.name} 吗？`)) return;

    try {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      if (result.success) {
        fetchTenants();
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              多租户管理
            </h1>
            <p className="text-gray-500 text-sm">管理所有租户、权限和计费</p>
          </div>
        </div>
        <Button onClick={handleCreateTenant}>
          <Plus className="h-4 w-4 mr-2" />
          创建租户
        </Button>
      </div>

      {/* 统计概览 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">总租户数</div>
                <div className="text-2xl font-bold">{tenants.length}</div>
              </div>
              <Building2 className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">活跃租户</div>
                <div className="text-2xl font-bold text-green-600">
                  {tenants.filter((t) => t.status === 'active').length}
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">试用租户</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {tenants.filter((t) => t.status === 'trial').length}
                </div>
              </div>
              <Zap className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">企业版</div>
                <div className="text-2xl font-bold text-purple-600">
                  {tenants.filter((t) => t.plan === 'enterprise').length}
                </div>
              </div>
              <Crown className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 租户列表 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>租户列表</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">加载中...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>编码</TableHead>
                      <TableHead>套餐</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant) => (
                      <TableRow
                        key={tenant.id}
                        className={`cursor-pointer hover:bg-gray-50 ${
                          selectedTenant?.id === tenant.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleSelectTenant(tenant)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {tenant.logo ? (
                              <img src={tenant.logo} alt="" className="w-8 h-8 rounded" />
                            ) : (
                              <div className="w-8 h-8 bg-primary text-primary-foreground rounded flex items-center justify-center text-sm font-medium">
                                {tenant.name[0]}
                              </div>
                            )}
                            <span className="font-medium">{tenant.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{tenant.code}</TableCell>
                        <TableCell>
                          <Badge className={planConfig[tenant.plan]?.color || 'bg-gray-100'}>
                            <span className="flex items-center gap-1">
                              {planConfig[tenant.plan]?.icon}
                              {planConfig[tenant.plan]?.label || tenant.plan}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig[tenant.status]?.color || 'bg-gray-100'}>
                            {statusConfig[tenant.status]?.label || tenant.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(tenant.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTenant(tenant)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(tenant)}
                            >
                              {tenant.status === 'active' ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
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
        </div>

        {/* 租户详情 */}
        <div className="space-y-6">
          {selectedTenant ? (
            <>
              {/* 基本信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    租户详情
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    {selectedTenant.logo ? (
                      <img src={selectedTenant.logo} alt="" className="w-12 h-12 rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-xl font-bold">
                        {selectedTenant.name[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-lg">{selectedTenant.name}</div>
                      <div className="text-sm text-gray-500">{selectedTenant.code}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">套餐</div>
                      <Badge className={planConfig[selectedTenant.plan]?.color}>
                        {planConfig[selectedTenant.plan]?.label}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-gray-500">状态</div>
                      <Badge className={statusConfig[selectedTenant.status]?.color}>
                        {statusConfig[selectedTenant.status]?.label}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-gray-500">用户上限</div>
                      <div className="font-medium">{selectedTenant.max_users}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">订单上限</div>
                      <div className="font-medium">{selectedTenant.max_orders}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-500 text-sm mb-2">功能权限</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTenant.features?.ai && (
                        <Badge variant="outline">AI 助手</Badge>
                      )}
                      {selectedTenant.features?.cad && (
                        <Badge variant="outline">CAD 集成</Badge>
                      )}
                      {selectedTenant.features?.mes && (
                        <Badge variant="outline">MES 看板</Badge>
                      )}
                      {selectedTenant.features?.advanced && (
                        <Badge variant="outline">高级功能</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 用户列表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    用户 ({tenantUsers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tenantUsers.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">暂无用户</div>
                  ) : (
                    <div className="space-y-2">
                      {tenantUsers.slice(0, 5).map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                              {user.user_id.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{user.user_id}</div>
                              <div className="text-xs text-gray-500">{user.department || '-'}</div>
                            </div>
                          </div>
                          <Badge
                            className={
                              user.role === 'owner'
                                ? 'bg-amber-100 text-amber-800'
                                : user.role === 'admin'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {user.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 工厂列表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="h-5 w-5" />
                    工厂 ({factories.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {factories.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">暂无工厂</div>
                  ) : (
                    <div className="space-y-2">
                      {factories.map((factory) => (
                        <div
                          key={factory.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div>
                            <div className="text-sm font-medium">{factory.name}</div>
                            <div className="text-xs text-gray-500">
                              {factory.location || '-'} · 日产能 {factory.capacity || 0}
                            </div>
                          </div>
                          <Badge
                            className={
                              factory.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {factory.status === 'active' ? '正常' : '停用'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>选择一个租户查看详情</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 创建/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMode ? '编辑租户' : '创建租户'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>租户名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="公司/工厂名称"
                />
              </div>
              <div className="space-y-2">
                <Label>租户编码 *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="如: COMPANY_A"
                  disabled={editMode}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>套餐</Label>
                <Select
                  value={formData.plan}
                  onValueChange={(v) => setFormData({ ...formData, plan: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">免费版</SelectItem>
                    <SelectItem value="standard">标准版</SelectItem>
                    <SelectItem value="premium">高级版</SelectItem>
                    <SelectItem value="enterprise">企业版</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>用户上限</Label>
                <Input
                  type="number"
                  value={formData.max_users}
                  onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 50 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>联系人</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>联系电话</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>联系邮箱</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>功能权限</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'ai', label: 'AI 助手' },
                  { key: 'cad', label: 'CAD 集成' },
                  { key: 'mes', label: 'MES 看板' },
                  { key: 'advanced', label: '高级功能' },
                ].map((feature) => (
                  <label
                    key={feature.key}
                    className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={formData.features[feature.key as keyof typeof formData.features] || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          features: { ...formData.features, [feature.key]: e.target.checked },
                        })
                      }
                      className="rounded"
                    />
                    <span className="text-sm">{feature.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editMode ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
