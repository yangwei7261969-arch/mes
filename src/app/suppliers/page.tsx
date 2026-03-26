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
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  UserCheck,
  UserX,
} from 'lucide-react';

interface Supplier {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
  type: string | null;
  category: string | null;
  supplier_level: number;
  contact: string;
  phone: string;
  email: string | null;
  address: string | null;
  tax_no: string | null;
  bank_name: string | null;
  bank_account: string | null;
  payment_terms: string | null;
  credit_limit: number | null;
  balance: number;
  rating: number;
  notes: string | null;
  is_active: boolean;
  status: string;
  is_verified: boolean;
  reject_reason: string | null;
  created_at: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [auditAction, setAuditAction] = useState<'approve' | 'reject'>('approve');
  const [rejectReason, setRejectReason] = useState('');

  const [form, setForm] = useState({
    name: '',
    short_name: '',
    type: '',
    category: '',
    supplier_level: 1,
    contact: '',
    phone: '',
    email: '',
    address: '',
    tax_no: '',
    bank_name: '',
    bank_account: '',
    payment_terms: '',
    credit_limit: '',
    rating: 5,
    notes: '',
  });

  useEffect(() => {
    fetchSuppliers();
  }, [page, activeTab]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      let statusFilter = '';
      if (activeTab === 'pending') {
        statusFilter = '&status=pending';
      } else if (activeTab === 'approved') {
        statusFilter = '&status=approved';
      } else if (activeTab === 'rejected') {
        statusFilter = '&status=rejected';
      }
      
      const response = await fetch(`/api/suppliers?page=${page}&pageSize=20${statusFilter}`);
      const result = await response.json();
      if (result.success) {
        setSuppliers(result.data);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchTerm) {
      fetchSuppliers();
      return;
    }
    const filtered = suppliers.filter(
      (s) =>
        s.name.includes(searchTerm) ||
        s.code.includes(searchTerm) ||
        s.contact?.includes(searchTerm)
    );
    setSuppliers(filtered);
  };

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setIsEdit(true);
      setSelectedSupplier(supplier);
      setForm({
        name: supplier.name,
        short_name: supplier.short_name || '',
        type: supplier.type || '',
        category: supplier.category || '',
        supplier_level: supplier.supplier_level || 1,
        contact: supplier.contact || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        tax_no: supplier.tax_no || '',
        bank_name: supplier.bank_name || '',
        bank_account: supplier.bank_account || '',
        payment_terms: supplier.payment_terms || '',
        credit_limit: supplier.credit_limit?.toString() || '',
        rating: supplier.rating || 5,
        notes: supplier.notes || '',
      });
    } else {
      setIsEdit(false);
      setSelectedSupplier(null);
      setForm({
        name: '',
        short_name: '',
        type: '',
        category: '',
        supplier_level: 1,
        contact: '',
        phone: '',
        email: '',
        address: '',
        tax_no: '',
        bank_name: '',
        bank_account: '',
        payment_terms: '',
        credit_limit: '',
        rating: 5,
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = isEdit ? `/api/suppliers?id=${selectedSupplier?.id}` : '/api/suppliers';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : null,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setDialogOpen(false);
        fetchSuppliers();
        alert(isEdit ? '更新成功！' : '创建成功！');
      } else {
        alert(result.error || '操作失败');
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此供应商吗？')) return;

    try {
      const response = await fetch(`/api/suppliers?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        fetchSuppliers();
        alert('删除成功！');
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleViewDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDetailDialogOpen(true);
  };

  const handleOpenAudit = (supplier: Supplier, action: 'approve' | 'reject') => {
    setSelectedSupplier(supplier);
    setAuditAction(action);
    setRejectReason('');
    setAuditDialogOpen(true);
  };

  const handleAudit = async () => {
    if (!selectedSupplier) return;
    
    if (auditAction === 'reject' && !rejectReason.trim()) {
      alert('请填写拒绝原因');
      return;
    }

    try {
      const response = await fetch('/api/suppliers/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSupplier.id,
          action: auditAction,
          reject_reason: auditAction === 'reject' ? rejectReason : null,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setAuditDialogOpen(false);
        fetchSuppliers();
        alert(auditAction === 'approve' ? '审核通过！' : '已拒绝！');
      } else {
        alert(result.error || '操作失败');
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      pending: { 
        label: '待审核', 
        className: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="h-3 w-3 mr-1" />
      },
      approved: { 
        label: '已通过', 
        className: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="h-3 w-3 mr-1" />
      },
      rejected: { 
        label: '已拒绝', 
        className: 'bg-red-100 text-red-800',
        icon: <XCircle className="h-3 w-3 mr-1" />
      },
      active: { 
        label: '合作中', 
        className: 'bg-blue-100 text-blue-800',
        icon: <CheckCircle className="h-3 w-3 mr-1" />
      },
    };
    const s = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800', icon: null };
    return (
      <Badge className={s.className}>
        {s.icon}
        {s.label}
      </Badge>
    );
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getTypeBadge = (type: string | null) => {
    if (!type) return null;
    const types: Record<string, { label: string; className: string }> = {
      material: { label: '原料供应商', className: 'bg-blue-100 text-blue-800' },
      accessory: { label: '辅料供应商', className: 'bg-green-100 text-green-800' },
      processing: { label: '加工厂', className: 'bg-orange-100 text-orange-800' },
      logistics: { label: '物流公司', className: 'bg-purple-100 text-purple-800' },
    };
    const t = types[type] || { label: type, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={t.className}>{t.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            供应商管理
          </h1>
          <p className="text-gray-500 mt-1">管理供应商信息、评级与审核</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/supplier-register" target="_blank">
              <Users className="h-4 w-4 mr-2" />
              注册链接
            </a>
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            新增供应商
          </Button>
        </div>
      </div>

      {/* 待审核提醒 */}
      {suppliers.filter(s => s.status === 'pending').length > 0 && activeTab !== 'pending' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="text-orange-700">
                有 {suppliers.filter(s => s.status === 'pending').length} 个供应商待审核，
              </span>
              <Button 
                variant="link" 
                className="text-orange-700 p-0 h-auto"
                onClick={() => setActiveTab('pending')}
              >
                点击查看
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 搜索栏 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <Input
              placeholder="搜索供应商名称、编码或联系人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button variant="outline" onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              搜索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tab切换 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="pending" className="text-yellow-600">
            <Clock className="h-4 w-4 mr-1" />
            待审核
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle className="h-4 w-4 mr-1" />
            已通过
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <XCircle className="h-4 w-4 mr-1" />
            已拒绝
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {/* 供应商列表 */}
          <Card>
            <CardHeader>
              <CardTitle>供应商列表 ({total})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">加载中...</div>
              ) : suppliers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无供应商数据</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>编码</TableHead>
                      <TableHead>名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>等级</TableHead>
                      <TableHead>联系人</TableHead>
                      <TableHead>电话</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>评级</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                        {suppliers.map((supplier) => (
                      <TableRow key={supplier.id} className={supplier.status === 'pending' ? 'bg-yellow-50' : ''}>
                        <TableCell className="font-mono">{supplier.code}</TableCell>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{getTypeBadge(supplier.type)}</TableCell>
                        <TableCell>
                          <Badge className={supplier.supplier_level === 1 ? 'bg-yellow-100 text-yellow-800' : 
                                           supplier.supplier_level === 2 ? 'bg-gray-100 text-gray-800' : 
                                           'bg-orange-100 text-orange-800'}>
                            {supplier.supplier_level || 1}级
                          </Badge>
                        </TableCell>
                        <TableCell>{supplier.contact}</TableCell>
                        <TableCell>{supplier.phone}</TableCell>
                        <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                        <TableCell>
                          <div className="flex">{renderStars(supplier.rating)}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {supplier.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600"
                                  onClick={() => handleOpenAudit(supplier, 'approve')}
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  通过
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleOpenAudit(supplier, 'reject')}
                                >
                                  <UserX className="h-4 w-4 mr-1" />
                                  拒绝
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewDetail(supplier)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {supplier.status !== 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenDialog(supplier)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600"
                                  onClick={() => handleDelete(supplier.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
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
      </Tabs>

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? '编辑供应商' : '新增供应商'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>名称 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>简称</Label>
              <Input
                value={form.short_name}
                onChange={(e) => setForm({ ...form, short_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>类型</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">原料供应商</SelectItem>
                  <SelectItem value="accessory">辅料供应商</SelectItem>
                  <SelectItem value="processing">加工厂</SelectItem>
                  <SelectItem value="logistics">物流公司</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>分类</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="如：面料、辅料、包装等"
              />
            </div>
            <div className="space-y-2">
              <Label>供应商等级</Label>
              <Select value={form.supplier_level?.toString() || '1'} onValueChange={(v) => setForm({ ...form, supplier_level: parseInt(v) })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择等级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">一级供应商（核心）</SelectItem>
                  <SelectItem value="2">二级供应商（重要）</SelectItem>
                  <SelectItem value="3">三级供应商（一般）</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">一级为核心供应商，二级为重要供应商，三级为一般供应商</p>
            </div>
            <div className="space-y-2">
              <Label>联系人 *</Label>
              <Input
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>电话 *</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>邮箱</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>地址</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>税号</Label>
              <Input
                value={form.tax_no}
                onChange={(e) => setForm({ ...form, tax_no: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>开户银行</Label>
              <Input
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>银行账号</Label>
              <Input
                value={form.bank_account}
                onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>付款条款</Label>
              <Input
                value={form.payment_terms}
                onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                placeholder="如：月结30天"
              />
            </div>
            <div className="space-y-2">
              <Label>信用额度</Label>
              <Input
                type="number"
                value={form.credit_limit}
                onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>评级</Label>
              <Select
                value={form.rating.toString()}
                onValueChange={(v) => setForm({ ...form, rating: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      <div className="flex">{renderStars(n)}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>备注</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              供应商详情
            </DialogTitle>
          </DialogHeader>

          {selectedSupplier && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold">{selectedSupplier.name}</div>
                  <div className="text-gray-500">{selectedSupplier.code}</div>
                </div>
                <div className="flex">{renderStars(selectedSupplier.rating)}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">类型：</span>
                  {getTypeBadge(selectedSupplier.type)}
                </div>
                <div>
                  <span className="text-gray-500">等级：</span>
                  <Badge className={selectedSupplier.supplier_level === 1 ? 'bg-yellow-100 text-yellow-800 ml-1' : 
                                   selectedSupplier.supplier_level === 2 ? 'bg-gray-100 text-gray-800 ml-1' : 
                                   'bg-orange-100 text-orange-800 ml-1'}>
                    {selectedSupplier.supplier_level || 1}级
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">分类：</span>
                  {selectedSupplier.category || '-'}
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {selectedSupplier.phone}
                </div>
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {selectedSupplier.email || '-'}
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {selectedSupplier.address || '-'}
                </div>
                <div>
                  <span className="text-gray-500">开户银行：</span>
                  {selectedSupplier.bank_name || '-'}
                </div>
                <div>
                  <span className="text-gray-500">银行账号：</span>
                  {selectedSupplier.bank_account || '-'}
                </div>
                <div>
                  <span className="text-gray-500">付款条款：</span>
                  {selectedSupplier.payment_terms || '-'}
                </div>
                <div>
                  <span className="text-gray-500">信用额度：</span>
                  ¥{selectedSupplier.credit_limit?.toLocaleString() || '未设置'}
                </div>
                <div>
                  <span className="text-gray-500">当前余额：</span>
                  <span className={selectedSupplier.balance < 0 ? 'text-red-600 font-bold' : ''}>
                    ¥{selectedSupplier.balance.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">创建时间：</span>
                  {new Date(selectedSupplier.created_at).toLocaleDateString()}
                </div>
              </div>

              {selectedSupplier.notes && (
                <div className="pt-2 border-t">
                  <div className="text-gray-500 text-sm">备注：</div>
                  <div className="text-sm">{selectedSupplier.notes}</div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
            {selectedSupplier?.status === 'pending' && (
              <Button onClick={() => {
                setDetailDialogOpen(false);
                handleOpenAudit(selectedSupplier, 'approve');
              }}>
                审核
              </Button>
            )}
            {selectedSupplier?.status !== 'pending' && (
              <Button onClick={() => {
                setDetailDialogOpen(false);
                handleOpenDialog(selectedSupplier!);
              }}>
                编辑
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 审核弹窗 */}
      <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {auditAction === 'approve' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  审核通过
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  拒绝申请
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedSupplier && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="font-medium">{selectedSupplier.name}</div>
                <div className="text-gray-500">{selectedSupplier.code} | {selectedSupplier.contact} {selectedSupplier.phone}</div>
              </div>

              {auditAction === 'approve' ? (
                <div className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
                  审核通过后，供应商将可以使用注册的手机号和密码登录供应商工作台。
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>拒绝原因 *</Label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="请填写拒绝原因，将通知供应商"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleAudit}
              className={auditAction === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
            >
              {auditAction === 'approve' ? '确认通过' : '确认拒绝'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
