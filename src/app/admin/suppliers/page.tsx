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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  XCircle,
  Eye,
  Users,
  AlertCircle,
  Link2,
  Trash2,
} from 'lucide-react';

interface Supplier {
  id: string;
  code: string;
  name: string;
  short_name?: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: string;
  is_active?: boolean;
  is_verified?: boolean;
  parent_id?: string;
  parent_supplier_id?: string;
  created_at: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-800' },
  active: { label: '已激活', color: 'bg-green-100 text-green-800' },
  inactive: { label: '已停用', color: 'bg-gray-100 text-gray-800' },
};

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [parentMap, setParentMap] = useState<Record<string, string>>({});
  
  // 筛选
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/suppliers');
      const result = await response.json();
      if (result.success) {
        const suppliersList = result.data?.suppliers || result.data || [];
        setSuppliers(Array.isArray(suppliersList) ? suppliersList : []);
        // 构建父子关系映射
        const map: Record<string, string> = {};
        (Array.isArray(suppliersList) ? suppliersList : []).forEach((s: Supplier) => {
          if (s.parent_id) {
            const parent = (Array.isArray(suppliersList) ? suppliersList : []).find((p: Supplier) => p.id === s.parent_id);
            if (parent) {
              map[s.id] = parent.name;
            }
          }
        });
        setParentMap(map);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (supplier: Supplier) => {
    if (!confirm(`确定要审核通过 ${supplier.name} 吗？`)) return;

    try {
      const response = await fetch('/api/supplier-auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: supplier.id,
          status: 'active',
          is_verified: true,
        }),
      });

      const result = await response.json();
      if (result.success) {
        fetchSuppliers();
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleReject = async (supplier: Supplier) => {
    if (!confirm(`确定要拒绝 ${supplier.name} 的注册申请吗？`)) return;

    try {
      const response = await fetch('/api/supplier-auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: supplier.id,
          status: 'inactive',
          is_verified: false,
        }),
      });

      const result = await response.json();
      if (result.success) {
        fetchSuppliers();
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    const newStatus = supplier.status === 'active' ? 'inactive' : 'active';
    if (!confirm(`确定要${newStatus === 'active' ? '激活' : '停用'} ${supplier.name} 吗？`)) return;

    try {
      const response = await fetch('/api/supplier-auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: supplier.id,
          status: newStatus,
        }),
      });

      const result = await response.json();
      if (result.success) {
        fetchSuppliers();
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  // 筛选数据
  const filteredSuppliers = suppliers.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (searchText && !s.name.includes(searchText) && !s.code.includes(searchText)) return false;
    return true;
  });

  // 统计
  const pendingCount = suppliers.filter(s => s.status === 'pending').length;
  const activeCount = suppliers.filter(s => s.status === 'active').length;
  const inactiveCount = suppliers.filter(s => s.status === 'inactive').length;

  // 下线关系树
  const buildTree = () => {
    const roots = suppliers.filter(s => !s.parent_id);
    const getChildren = (parentId: string) => suppliers.filter(s => s.parent_id === parentId);
    return { roots, getChildren };
  };

  const { roots, getChildren } = buildTree();

  return (
    <div className="p-6 space-y-6">
      {/* 顶部导航 */}
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
            供应商管理
          </h1>
          <p className="text-gray-500 text-sm">审核供应商注册、管理下线关系</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <div className="text-sm text-gray-500">总供应商数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-sm text-gray-500">待审核</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <div className="text-sm text-gray-500">已激活</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-600">{inactiveCount}</div>
            <div className="text-sm text-gray-500">已停用</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 供应商列表 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>供应商列表</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="搜索名称/编码..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-40"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="pending">待审核</SelectItem>
                      <SelectItem value="active">已激活</SelectItem>
                      <SelectItem value="inactive">已停用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">加载中...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>编码</TableHead>
                      <TableHead>名称</TableHead>
                      <TableHead>联系人</TableHead>
                      <TableHead>电话</TableHead>
                      <TableHead>上级</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-mono">{supplier.code}</TableCell>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.contact || '-'}</TableCell>
                        <TableCell>{supplier.phone || '-'}</TableCell>
                        <TableCell>
                          {parentMap[supplier.id] && (
                            <Badge variant="outline" className="text-xs">
                              <Link2 className="h-3 w-3 mr-1" />
                              {parentMap[supplier.id]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusMap[supplier.status]?.color || 'bg-gray-100 text-gray-800'}>
                            {statusMap[supplier.status]?.label || supplier.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {supplier.status === 'pending' && (
                              <>
                                <Button 
                                  size="sm"
                                  onClick={() => handleApprove(supplier)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleReject(supplier)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {supplier.status !== 'pending' && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleToggleStatus(supplier)}
                              >
                                {supplier.status === 'active' ? '停用' : '激活'}
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                setSelectedSupplier(supplier);
                                setDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
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

        {/* 下线关系树 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              下线关系
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {roots.map((root) => {
                const children = getChildren(root.id);
                return (
                  <div key={root.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{root.name}</span>
                      <Badge variant="outline" className="text-xs">{root.code}</Badge>
                    </div>
                    {children.length > 0 && (
                      <div className="mt-2 ml-6 space-y-1">
                        {children.map((child) => (
                          <div key={child.id} className="flex items-center gap-2 text-sm text-gray-600">
                            <Link2 className="h-3 w-3" />
                            {child.name}
                            <Badge variant="outline" className="text-xs">{child.code}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详情弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>供应商详情</DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">编码</div>
                  <div className="font-mono">{selectedSupplier.code}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">名称</div>
                  <div className="font-medium">{selectedSupplier.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">联系人</div>
                  <div>{selectedSupplier.contact || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">电话</div>
                  <div>{selectedSupplier.phone || '-'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-500">邮箱</div>
                  <div>{selectedSupplier.email || '-'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-500">地址</div>
                  <div>{selectedSupplier.address || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">状态</div>
                  <Badge className={statusMap[selectedSupplier.status]?.color || 'bg-gray-100 text-gray-800'}>
                    {statusMap[selectedSupplier.status]?.label || selectedSupplier.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500">上级供应商</div>
                  <div>{parentMap[selectedSupplier.id] || '-'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-500">注册时间</div>
                  <div>{new Date(selectedSupplier.created_at).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
