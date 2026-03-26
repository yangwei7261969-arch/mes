'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getColorValue } from '@/lib/color-utils';
import {
  ClipboardList,
  CheckCircle,
  Play,
  Package,
  AlertCircle,
  Clock,
  RefreshCw,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductionOrder {
  id: string;
  order_no: string;
  style_no: string;
  style_name: string;
  color: string;
  size: string;
  quantity: number;
  completed_quantity: number;
  status: string;
  plan_start_date: string;
  plan_end_date: string;
}

interface BOMItem {
  id: string;
  material_code: string;
  material_name: string;
  material_type: string;
  item_type?: string;
  color: string;
  unit: string;
  unit_usage: number;
  total_qty: number;
  supplier: string;
}

export default function ProductionPrepPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [loadingBOM, setLoadingBOM] = useState(false);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  
  // 生产准备表单
  const [prepForm, setPrepForm] = useState({
    fabric_code: '',
    fabric_qty: 0,
    accessories: '',
    worker_count: 0,
    machine_count: 0,
    notes: '',
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/production-orders');
      const result = await response.json();
      if (result.success) {
        // 只显示已确认待生产的订单
        setOrders(result.data.filter((o: ProductionOrder) => 
          ['confirmed', 'pending'].includes(o.status)
        ));
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // 根据款号获取BOM数据
  const fetchBOMByStyleNo = async (styleNo: string, quantity: number) => {
    setLoadingBOM(true);
    try {
      // 1. 先查找该款号对应的工艺单
      const techPackRes = await fetch(`/api/tech-pack?keyword=${styleNo}&page_size=1`);
      const techPackData = await techPackRes.json();
      
      if (techPackData.success && techPackData.data?.techPacks?.length > 0) {
        const techPack = techPackData.data.techPacks[0];
        
        // 2. 获取BOM数据
        const bomRes = await fetch(`/api/tech-pack?action=bom&tech_pack_id=${techPack.id}`);
        const bomData = await bomRes.json();
        
        if (bomData.success && bomData.data?.bom?.length > 0) {
          const items = bomData.data.bom;
          setBomItems(items);
          
          // 3. 分离面料和辅料
          const fabrics = items.filter((item: BOMItem) => 
            item.material_type === '面料' || item.item_type === '面料'
          );
          const accessories = items.filter((item: BOMItem) => 
            item.material_type === '辅料' || item.item_type === '辅料'
          );
          
          // 4. 自动填充面料信息
          if (fabrics.length > 0) {
            const mainFabric = fabrics[0];
            const fabricQty = mainFabric.unit_usage ? mainFabric.unit_usage * quantity : quantity * 1.2;
            
            setPrepForm(prev => ({
              ...prev,
              fabric_code: mainFabric.material_code || mainFabric.material_name,
              fabric_qty: Math.ceil(fabricQty * 100) / 100,
            }));
          }
          
          // 5. 自动填充辅料清单
          if (accessories.length > 0) {
            const accessoriesText = accessories.map((item: BOMItem) => {
              const qty = item.unit_usage ? Math.ceil(item.unit_usage * quantity) : quantity;
              return `${item.material_name || item.material_code}x${qty}${item.unit || '个'}`;
            }).join(', ');
            
            setPrepForm(prev => ({
              ...prev,
              accessories: accessoriesText,
            }));
          }
          
          return items;
        }
      }
      
      // 没有找到BOM数据
      setBomItems([]);
      return [];
    } catch (error) {
      console.error('Failed to fetch BOM:', error);
      return [];
    } finally {
      setLoadingBOM(false);
    }
  };

  const handleStartPrep = async (order: ProductionOrder) => {
    setSelectedOrder(order);
    setBomItems([]);
    setPrepForm({
      fabric_code: '',
      fabric_qty: 0,
      accessories: '',
      worker_count: 0,
      machine_count: 0,
      notes: '',
    });
    setDialogOpen(true);
    
    // 自动查询BOM
    await fetchBOMByStyleNo(order.style_no, order.quantity);
  };

  const handleConfirmPrep = async () => {
    if (!selectedOrder) return;

    try {
      // 更新订单状态为生产准备中
      const response = await fetch('/api/production-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedOrder.id,
          status: 'preparing',
        }),
      });

      const result = await response.json();
      if (result.success) {
        setDialogOpen(false);
        fetchOrders();
        alert('生产准备已确认！');
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleStartProduction = async (orderId: string) => {
    if (!confirm('确认开始生产？')) return;

    try {
      const response = await fetch('/api/production-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          status: 'in_production',
          actual_start_date: new Date().toISOString().split('T')[0],
        }),
      });

      const result = await response.json();
      if (result.success) {
        fetchOrders();
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  // 重新加载BOM
  const handleReloadBOM = () => {
    if (selectedOrder) {
      fetchBOMByStyleNo(selectedOrder.style_no, selectedOrder.quantity);
    }
  };

  // 统计
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const confirmedCount = orders.filter(o => o.status === 'confirmed').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: '待确认', color: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: '已确认', color: 'bg-blue-100 text-blue-800' },
    preparing: { label: '生产准备中', color: 'bg-indigo-100 text-indigo-800' },
    in_production: { label: '生产中', color: 'bg-green-100 text-green-800' },
  };

  // 分离面料和辅料
  const fabrics = bomItems.filter(item => 
    item.material_type === '面料' || item.item_type === '面料'
  );
  const accessories = bomItems.filter(item => 
    item.material_type === '辅料' || item.item_type === '辅料'
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            生产准备
          </h1>
          <p className="text-gray-500 mt-1">准备面料、辅料、人员、设备等生产资源</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">待确认</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">已确认</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{confirmedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">准备中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{preparingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">本日待处理</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* 准备清单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            生产准备清单
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无待准备的订单</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>生产单号</TableHead>
                  <TableHead>款号</TableHead>
                  <TableHead>款式名称</TableHead>
                  <TableHead>颜色/尺码</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>计划交期</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
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
                    <TableCell>{order.plan_end_date}</TableCell>
                    <TableCell>
                      <Badge className={statusMap[order.status]?.color}>
                        {statusMap[order.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {order.status === 'confirmed' && (
                          <Button 
                            size="sm"
                            onClick={() => handleStartPrep(order)}
                          >
                            <ClipboardList className="h-4 w-4 mr-1" />
                            开始准备
                          </Button>
                        )}
                        {order.status === 'preparing' && (
                          <Button 
                            size="sm"
                            onClick={() => handleStartProduction(order.id)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            开始生产
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

      {/* 生产准备弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              生产准备确认
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">生产单号：</span>
                  <span className="font-mono">{selectedOrder.order_no}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">款号：</span>
                  <span className="font-bold">{selectedOrder.style_no}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">数量：</span>
                  <span>{selectedOrder.quantity}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">交期：</span>
                  <span>{selectedOrder.plan_end_date}</span>
                </div>
              </div>
            </div>
          )}

          {/* BOM自动加载提示 */}
          {loadingBOM && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>正在从BOM单获取物料信息...</span>
            </div>
          )}

          {bomItems.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg mb-4">
              <Sparkles className="h-4 w-4" />
              <span>已从BOM单自动带出 {bomItems.length} 项物料信息</span>
            </div>
          )}

          {bomItems.length === 0 && !loadingBOM && (
            <div className="flex items-center justify-between p-3 bg-amber-50 text-amber-700 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>未找到对应的BOM数据，请手动填写</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleReloadBOM}>
                <RefreshCw className="h-4 w-4 mr-1" />
                重新查询
              </Button>
            </div>
          )}

          {/* BOM详情展示 */}
          {bomItems.length > 0 && (
            <div className="mb-4 border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 font-medium text-sm flex items-center justify-between">
                <span>BOM物料清单</span>
                <Button variant="ghost" size="sm" onClick={handleReloadBOM}>
                  <RefreshCw className={cn("h-4 w-4 mr-1", loadingBOM && "animate-spin")} />
                  刷新
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">物料编码</TableHead>
                      <TableHead className="text-xs">物料名称</TableHead>
                      <TableHead className="text-xs">类型</TableHead>
                      <TableHead className="text-xs">单耗</TableHead>
                      <TableHead className="text-xs">需求量</TableHead>
                      <TableHead className="text-xs">单位</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bomItems.map((item, index) => {
                      const demand = item.unit_usage 
                        ? Math.ceil(item.unit_usage * (selectedOrder?.quantity || 1))
                        : (selectedOrder?.quantity || 1);
                      return (
                        <TableRow key={item.id || index} className="text-xs">
                          <TableCell className="font-mono">{item.material_code || '-'}</TableCell>
                          <TableCell>{item.material_name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {item.material_type || item.item_type || '物料'}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.unit_usage || '-'}</TableCell>
                          <TableCell className="font-medium">{demand}</TableCell>
                          <TableCell>{item.unit || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  面料编码
                  {fabrics.length > 0 && (
                    <Badge variant="secondary" className="text-xs">已自动填充</Badge>
                  )}
                </Label>
                <Input
                  value={prepForm.fabric_code}
                  onChange={(e) => setPrepForm({ ...prepForm, fabric_code: e.target.value })}
                  placeholder="面料编码"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  面料数量(米)
                  {fabrics.length > 0 && (
                    <Badge variant="secondary" className="text-xs">已计算</Badge>
                  )}
                </Label>
                <Input
                  type="number"
                  value={prepForm.fabric_qty}
                  onChange={(e) => setPrepForm({ ...prepForm, fabric_qty: parseFloat(e.target.value) || 0 })}
                  placeholder="数量"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                辅料清单
                {accessories.length > 0 && (
                  <Badge variant="secondary" className="text-xs">已自动填充 {accessories.length} 项</Badge>
                )}
              </Label>
              <Textarea
                value={prepForm.accessories}
                onChange={(e) => setPrepForm({ ...prepForm, accessories: e.target.value })}
                placeholder="如: 拉链x100, 纽扣x200"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>安排工人数量</Label>
                <Input
                  type="number"
                  value={prepForm.worker_count}
                  onChange={(e) => setPrepForm({ ...prepForm, worker_count: parseInt(e.target.value) || 0 })}
                  placeholder="工人数"
                />
              </div>
              <div className="space-y-2">
                <Label>安排机器数量</Label>
                <Input
                  type="number"
                  value={prepForm.machine_count}
                  onChange={(e) => setPrepForm({ ...prepForm, machine_count: parseInt(e.target.value) || 0 })}
                  placeholder="机器数"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                value={prepForm.notes}
                onChange={(e) => setPrepForm({ ...prepForm, notes: e.target.value })}
                placeholder="备注信息"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleConfirmPrep}>
              <CheckCircle className="h-4 w-4 mr-1" />
              确认准备完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
