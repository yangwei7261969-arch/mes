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
  DialogDescription,
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
  Package,
  Search,
  Plus,
  Edit,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  material_id: string;
  warehouse: string;
  location: string | null;
  quantity: number;
  locked_qty: number;
  available_qty: number;
  materials?: {
    code: string;
    name: string;
    category: string;
    unit: string;
    unit_price: number;
    safety_stock: number;
  };
}

interface InventoryLog {
  id: string;
  material_id: string;
  type: string;
  quantity: number;
  before_qty: number;
  after_qty: number;
  warehouse: string;
  related_type: string | null;
  related_id: string | null;
  notes: string | null;
  created_at: string;
  materials?: {
    code: string;
    name: string;
    unit: string;
  };
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    material_id: '',
    type: 'in' as 'in' | 'out',
    quantity: 0,
    warehouse: '主仓库',
    location: '',
    notes: '',
  });

  // 物料列表（用于选择）
  const [materials, setMaterials] = useState<any[]>([]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(warehouseFilter !== 'all' && { warehouse: warehouseFilter }),
      });
      
      const response = await fetch(`/api/inventory?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setInventory(result.data);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await fetch('/api/inventory-logs?pageSize=20');
      const result = await response.json();
      
      if (result.success) {
        setLogs(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/materials?pageSize=100');
      const result = await response.json();
      if (result.success) {
        setMaterials(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchLogs();
    fetchMaterials();
  }, [page, warehouseFilter]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      
      if (result.success) {
        setDialogOpen(false);
        fetchInventory();
        fetchLogs();
        alert(formData.type === 'in' ? '入库成功！' : '出库成功！');
      } else {
        alert(result.error || '操作失败');
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 计算库存预警
  const lowStockItems = inventory.filter(item => {
    const safetyStock = item.materials?.safety_stock || 0;
    return safetyStock > 0 && item.quantity < safetyStock;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">仓库库存</h1>
          <p className="text-muted-foreground">管理物料库存、入库出库</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          入库/出库
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">物料种类</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总库存量</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {inventory.reduce((sum, item) => sum + Number(item.quantity), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">可用库存</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {inventory.reduce((sum, item) => sum + Number(item.available_qty), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">库存预警</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{lowStockItems.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">库存列表</TabsTrigger>
          <TabsTrigger value="logs">出入库记录</TabsTrigger>
          <TabsTrigger value="alerts">库存预警</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索物料..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="仓库筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部仓库</SelectItem>
                    <SelectItem value="主仓库">主仓库</SelectItem>
                    <SelectItem value="辅料仓">辅料仓</SelectItem>
                    <SelectItem value="面料仓">面料仓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : inventory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  暂无库存数据
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>物料编码</TableHead>
                      <TableHead>物料名称</TableHead>
                      <TableHead>分类</TableHead>
                      <TableHead>仓库</TableHead>
                      <TableHead>库存数量</TableHead>
                      <TableHead>锁定数量</TableHead>
                      <TableHead>可用数量</TableHead>
                      <TableHead>单位</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((item) => {
                      const isLowStock = item.materials?.safety_stock && 
                        item.quantity < item.materials.safety_stock;
                      
                      return (
                        <TableRow key={item.id} className={isLowStock ? 'bg-red-50' : ''}>
                          <TableCell className="font-medium">
                            {item.materials?.code}
                            {isLowStock && (
                              <AlertTriangle className="inline ml-2 h-4 w-4 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell>{item.materials?.name}</TableCell>
                          <TableCell>
                            <Badge variant={item.materials?.category === '面料' ? 'default' : 'secondary'}>
                              {item.materials?.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.warehouse}</TableCell>
                          <TableCell className="font-medium">{item.quantity}</TableCell>
                          <TableCell className="text-orange-500">{item.locked_qty}</TableCell>
                          <TableCell className="text-green-600">{item.available_qty}</TableCell>
                          <TableCell>{item.materials?.unit}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardContent className="pt-6">
              {logsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>物料</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>数量</TableHead>
                      <TableHead>变动前</TableHead>
                      <TableHead>变动后</TableHead>
                      <TableHead>仓库</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead>时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.materials?.name}
                          <div className="text-xs text-muted-foreground">{log.materials?.code}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.type === 'in' ? 'default' : 'destructive'}>
                            {log.type === 'in' ? (
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 mr-1" />
                            )}
                            {log.type === 'in' ? '入库' : '出库'}
                          </Badge>
                        </TableCell>
                        <TableCell className={log.type === 'in' ? 'text-green-600' : 'text-red-600'}>
                          {log.type === 'in' ? '+' : '-'}{log.quantity}
                        </TableCell>
                        <TableCell>{log.before_qty}</TableCell>
                        <TableCell>{log.after_qty}</TableCell>
                        <TableCell>{log.warehouse}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.notes || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardContent className="pt-6">
              {lowStockItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  暂无库存预警
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>物料编码</TableHead>
                      <TableHead>物料名称</TableHead>
                      <TableHead>当前库存</TableHead>
                      <TableHead>安全库存</TableHead>
                      <TableHead>缺口</TableHead>
                      <TableHead>仓库</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => (
                      <TableRow key={item.id} className="bg-red-50">
                        <TableCell className="font-medium">{item.materials?.code}</TableCell>
                        <TableCell>{item.materials?.name}</TableCell>
                        <TableCell className="text-red-600 font-medium">{item.quantity}</TableCell>
                        <TableCell>{item.materials?.safety_stock}</TableCell>
                        <TableCell className="text-red-600">
                          {Number(item.materials?.safety_stock) - item.quantity}
                        </TableCell>
                        <TableCell>{item.warehouse}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 入库/出库弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>入库/出库</DialogTitle>
            <DialogDescription>
              选择物料并进行入库或出库操作
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>操作类型 *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v as 'in' | 'out' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">入库</SelectItem>
                  <SelectItem value="out">出库</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>物料 *</Label>
              <Select 
                value={formData.material_id} 
                onValueChange={(v) => setFormData({ ...formData, material_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择物料" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>数量 *</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>仓库</Label>
                <Select 
                  value={formData.warehouse} 
                  onValueChange={(v) => setFormData({ ...formData, warehouse: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="主仓库">主仓库</SelectItem>
                    <SelectItem value="辅料仓">辅料仓</SelectItem>
                    <SelectItem value="面料仓">面料仓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>库位</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="例如：A区-1排-2层"
              />
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="例如：采购入库、生产领料"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || !formData.material_id || formData.quantity <= 0}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认{formData.type === 'in' ? '入库' : '出库'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
