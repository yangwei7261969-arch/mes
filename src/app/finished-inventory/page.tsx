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
  Shirt,
  Plus,
  Loader2,
  Package,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
} from 'lucide-react';

interface FinishedGood {
  id: string;
  sku: string;
  style_no: string;
  style_name: string;
  color: string;
  size: string;
  unit: string;
  cost_price: number;
  sale_price: number;
}

interface Inventory {
  id: string;
  goods_id: string;
  warehouse: string;
  location: string;
  quantity: number;
  locked_qty: number;
  available_qty: number;
  finished_goods?: FinishedGood;
}

export default function FinishedInventoryPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'in' | 'out'>('in');
  const [submitting, setSubmitting] = useState(false);
  
  const [finishedGoods, setFinishedGoods] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    goods_id: '',
    quantity: '',
    warehouse: '主仓库',
    location: '',
    notes: '',
  });

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (warehouseFilter !== 'all') {
        params.append('warehouse', warehouseFilter);
      }
      
      const response = await fetch(`/api/finished-inventory?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setInventory(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch finished inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinishedGoods = async () => {
    try {
      // 从生产订单获取成衣信息
      const response = await fetch('/api/production-orders?status=completed&pageSize=100');
      const result = await response.json();
      if (result.success) {
        setFinishedGoods(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch finished goods:', error);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchFinishedGoods();
  }, [warehouseFilter]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/finished-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          type: dialogType,
          quantity: Number(formData.quantity),
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        setDialogOpen(false);
        setFormData({
          goods_id: '',
          quantity: '',
          warehouse: '主仓库',
          location: '',
          notes: '',
        });
        fetchInventory();
        alert(dialogType === 'in' ? '入库成功！' : '出库成功！');
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 统计
  const stats = {
    totalSku: new Set(inventory.map(i => i.goods_id)).size,
    totalQty: inventory.reduce((sum, i) => sum + Number(i.quantity), 0),
    lowStock: inventory.filter(i => Number(i.quantity) < 10).length,
    totalValue: inventory.reduce((sum, i) => {
      const cost = Number(i.finished_goods?.cost_price || 0);
      return sum + Number(i.quantity) * cost;
    }, 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">成衣库存</h1>
          <p className="text-muted-foreground">管理成品入库、出库和库存</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setDialogType('out'); setDialogOpen(true); }}>
            <ArrowUp className="mr-2 h-4 w-4" />
            出库
          </Button>
          <Button onClick={() => { setDialogType('in'); setDialogOpen(true); }}>
            <ArrowDown className="mr-2 h-4 w-4" />
            入库
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SKU数量</CardTitle>
            <Shirt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSku}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总库存量</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.totalQty.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">件</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">低库存预警</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.lowStock}</div>
            <p className="text-xs text-muted-foreground">SKU</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">库存价值</CardTitle>
            <Shirt className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              ¥{stats.totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="仓库" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部仓库</SelectItem>
              <SelectItem value="主仓库">主仓库</SelectItem>
              <SelectItem value="成品仓">成品仓</SelectItem>
              <SelectItem value="待检仓">待检仓</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无成衣库存数据，完成生产后可入库
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>款号</TableHead>
                  <TableHead>款名</TableHead>
                  <TableHead>颜色</TableHead>
                  <TableHead>尺码</TableHead>
                  <TableHead>仓库</TableHead>
                  <TableHead>库位</TableHead>
                  <TableHead>库存数量</TableHead>
                  <TableHead>锁定数量</TableHead>
                  <TableHead>可用数量</TableHead>
                  <TableHead>成本价</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.finished_goods?.sku || '-'}</TableCell>
                    <TableCell>{item.finished_goods?.style_no || '-'}</TableCell>
                    <TableCell className="font-medium">{item.finished_goods?.style_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.finished_goods?.color || '-'}</Badge>
                    </TableCell>
                    <TableCell>{item.finished_goods?.size || '-'}</TableCell>
                    <TableCell>{item.warehouse}</TableCell>
                    <TableCell>{item.location || '-'}</TableCell>
                    <TableCell className={Number(item.quantity) < 10 ? 'text-orange-500 font-bold' : ''}>
                      {item.quantity}
                    </TableCell>
                    <TableCell>{item.locked_qty}</TableCell>
                    <TableCell>{item.available_qty}</TableCell>
                    <TableCell>¥{Number(item.finished_goods?.cost_price || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 入库/出库弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogType === 'in' ? '成衣入库' : '成衣出库'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>选择成品 *</Label>
              <Select 
                value={formData.goods_id} 
                onValueChange={(v) => setFormData({ ...formData, goods_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择成品" />
                </SelectTrigger>
                <SelectContent>
                  {finishedGoods.map(goods => (
                    <SelectItem key={goods.id} value={goods.id}>
                      {goods.style_no} - {goods.style_name} ({goods.color})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>数量 *</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>仓库</Label>
                <Select 
                  value={formData.warehouse} 
                  onValueChange={(v) => setFormData({ ...formData, warehouse: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择仓库" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="主仓库">主仓库</SelectItem>
                    <SelectItem value="成品仓">成品仓</SelectItem>
                    <SelectItem value="待检仓">待检仓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>库位</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="如: A-1-1"
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
            <Button onClick={handleSubmit} disabled={submitting || !formData.goods_id || !formData.quantity}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认{dialogType === 'in' ? '入库' : '出库'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
