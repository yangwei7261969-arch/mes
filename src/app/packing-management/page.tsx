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
import { QRCodeSVG } from 'qrcode.react';
import {
  Package,
  Box,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  QrCode,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  RefreshCw,
  BarChart3,
  Settings,
  Eye,
} from 'lucide-react';

// 装箱单
interface PackingList {
  id: string;
  packingNo: string;
  orderNo: string;
  styleNo: string;
  styleName: string;
  customer: string;
  color: string;
  totalQty: number;
  totalBoxes: number;
  status: 'pending' | 'packing' | 'completed' | 'shipped';
  createdAt: string;
  completedAt?: string;
  shippedAt?: string;
  boxes: PackingBox[];
}

// 装箱明细
interface PackingBox {
  id: string;
  boxNo: string;
  sizeRatio: string; // 配码 如 S:M:L:XL = 1:2:2:1
  sizes: SizeDetail[];
  totalQty: number;
  grossWeight: number;
  netWeight: number;
  cartonSize: string; // 纸箱尺寸
  status: 'pending' | 'packed' | 'shipped';
}

// 尺码明细
interface SizeDetail {
  size: string;
  quantity: number;
}

// 配码模板
interface SizeRatioTemplate {
  id: string;
  name: string;
  sizes: string[];
  ratios: number[];
  description: string;
}

export default function PackingManagementPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  
  // 装箱单列表
  const [packingLists, setPackingLists] = useState<PackingList[]>([]);
  const [selectedPacking, setSelectedPacking] = useState<PackingList | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // 新建装箱单
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPacking, setNewPacking] = useState({
    orderNo: '',
    styleNo: '',
    styleName: '',
    customer: '',
    color: '',
  });
  
  // 配码模板
  const [sizeTemplates, setSizeTemplates] = useState<SizeRatioTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SizeRatioTemplate | null>(null);
  
  // 统计
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    packing: 0,
    completed: 0,
    shipped: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 模拟装箱单数据
      const mockPackingLists: PackingList[] = [
        {
          id: '1',
          packingNo: 'PK-2024-001',
          orderNo: 'PO-2024-001',
          styleNo: 'STYLE-A',
          styleName: '红色T恤',
          customer: '客户A',
          color: '红色',
          totalQty: 500,
          totalBoxes: 10,
          status: 'completed',
          createdAt: '2024-01-15 09:00',
          completedAt: '2024-01-15 16:00',
          boxes: [
            { id: '1', boxNo: 'PK-2024-001-01', sizeRatio: 'S:M:L:XL=1:2:2:1', sizes: [{ size: 'S', quantity: 5 }, { size: 'M', quantity: 10 }, { size: 'L', quantity: 10 }, { size: 'XL', quantity: 5 }], totalQty: 30, grossWeight: 8.5, netWeight: 7.8, cartonSize: '60x40x30', status: 'packed' },
            { id: '2', boxNo: 'PK-2024-001-02', sizeRatio: 'S:M:L:XL=1:2:2:1', sizes: [{ size: 'S', quantity: 5 }, { size: 'M', quantity: 10 }, { size: 'L', quantity: 10 }, { size: 'XL', quantity: 5 }], totalQty: 30, grossWeight: 8.5, netWeight: 7.8, cartonSize: '60x40x30', status: 'packed' },
          ],
        },
        {
          id: '2',
          packingNo: 'PK-2024-002',
          orderNo: 'PO-2024-002',
          styleNo: 'STYLE-B',
          styleName: '蓝色衬衫',
          customer: '客户B',
          color: '蓝色',
          totalQty: 300,
          totalBoxes: 6,
          status: 'packing',
          createdAt: '2024-01-15 10:30',
          boxes: [
            { id: '1', boxNo: 'PK-2024-002-01', sizeRatio: 'M:L:XL=1:2:1', sizes: [{ size: 'M', quantity: 10 }, { size: 'L', quantity: 20 }, { size: 'XL', quantity: 10 }], totalQty: 40, grossWeight: 9.2, netWeight: 8.5, cartonSize: '60x40x35', status: 'packed' },
            { id: '2', boxNo: 'PK-2024-002-02', sizeRatio: 'M:L:XL=1:2:1', sizes: [{ size: 'M', quantity: 10 }, { size: 'L', quantity: 20 }, { size: 'XL', quantity: 10 }], totalQty: 40, grossWeight: 9.2, netWeight: 8.5, cartonSize: '60x40x35', status: 'pending' },
          ],
        },
        {
          id: '3',
          packingNo: 'PK-2024-003',
          orderNo: 'PO-2024-003',
          styleNo: 'STYLE-C',
          styleName: '黑色裤子',
          customer: '客户C',
          color: '黑色',
          totalQty: 200,
          totalBoxes: 4,
          status: 'pending',
          createdAt: '2024-01-15 14:00',
          boxes: [],
        },
        {
          id: '4',
          packingNo: 'PK-2024-004',
          orderNo: 'PO-2024-001',
          styleNo: 'STYLE-A',
          styleName: '红色T恤',
          customer: '客户A',
          color: '红色',
          totalQty: 500,
          totalBoxes: 10,
          status: 'shipped',
          createdAt: '2024-01-14 08:00',
          completedAt: '2024-01-14 15:00',
          shippedAt: '2024-01-15 09:00',
          boxes: [],
        },
      ];
      setPackingLists(mockPackingLists);

      // 配码模板
      setSizeTemplates([
        { id: '1', name: '标准配码 S-M-L-XL', sizes: ['S', 'M', 'L', 'XL'], ratios: [1, 2, 2, 1], description: '适用于常规款式' },
        { id: '2', name: '大码配码 M-L-XL-XXL', sizes: ['M', 'L', 'XL', 'XXL'], ratios: [1, 2, 2, 1], description: '适用于大码款式' },
        { id: '3', name: '简约配码 M-L', sizes: ['M', 'L'], ratios: [1, 1], description: '适用于简约款式' },
        { id: '4', name: '全尺码配码', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], ratios: [1, 1, 2, 2, 1, 1], description: '适用于全尺码款式' },
      ]);

      // 统计
      setStats({
        total: mockPackingLists.length,
        pending: mockPackingLists.filter(p => p.status === 'pending').length,
        packing: mockPackingLists.filter(p => p.status === 'packing').length,
        completed: mockPackingLists.filter(p => p.status === 'completed').length,
        shipped: mockPackingLists.filter(p => p.status === 'shipped').length,
      });

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePacking = () => {
    if (!newPacking.orderNo || !newPacking.styleNo) {
      alert('请填写完整信息');
      return;
    }

    const packing: PackingList = {
      id: Date.now().toString(),
      packingNo: `PK-${Date.now()}`,
      ...newPacking,
      totalQty: 0,
      totalBoxes: 0,
      status: 'pending',
      createdAt: new Date().toLocaleString(),
      boxes: [],
    };

    setPackingLists(prev => [packing, ...prev]);
    setCreateDialogOpen(false);
    setNewPacking({
      orderNo: '',
      styleNo: '',
      styleName: '',
      customer: '',
      color: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: '待装箱', className: 'bg-gray-100 text-gray-800' },
      packing: { label: '装箱中', className: 'bg-blue-100 text-blue-800' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-800' },
      shipped: { label: '已发货', className: 'bg-purple-100 text-purple-800' },
    };
    return config[status as keyof typeof config];
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="h-4 w-4" />,
      packing: <Package className="h-4 w-4" />,
      completed: <CheckCircle className="h-4 w-4" />,
      shipped: <Truck className="h-4 w-4" />,
    };
    return icons[status as keyof typeof icons];
  };

  const handlePrintBoxLabel = (box: PackingBox, packing: PackingList) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>箱标 - ${box.boxNo}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .label { border: 2px solid #000; padding: 15px; width: 300px; margin: 0 auto; }
          .header { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 10px; }
          .info { margin-bottom: 5px; font-size: 12px; }
          .qr-code { text-align: center; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          td { border: 1px solid #000; padding: 5px; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="header">装箱标签</div>
          <div class="info">箱号: ${box.boxNo}</div>
          <div class="info">款号: ${packing.styleNo}</div>
          <div class="info">颜色: ${packing.color}</div>
          <div class="info">配码: ${box.sizeRatio}</div>
          <table>
            <tr><td>尺码</td><td>数量</td></tr>
            ${box.sizes.map(s => `<tr><td>${s.size}</td><td>${s.quantity}</td></tr>`).join('')}
            <tr><td><strong>合计</strong></td><td><strong>${box.totalQty}</strong></td></tr>
          </table>
          <div class="info" style="margin-top: 10px;">毛重: ${box.grossWeight}kg | 净重: ${box.netWeight}kg</div>
          <div class="info">纸箱尺寸: ${box.cartonSize}</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
        <h1 className="text-2xl font-bold">装箱配码管理</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            配码模板
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新建装箱单
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总装箱单</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">待装箱</p>
                <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">装箱中</p>
                <p className="text-2xl font-bold text-blue-600">{stats.packing}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已完成</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已发货</p>
                <p className="text-2xl font-bold text-purple-600">{stats.shipped}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">
            <Package className="h-4 w-4 mr-2" />
            装箱单列表
          </TabsTrigger>
          <TabsTrigger value="templates">
            <BarChart3 className="h-4 w-4 mr-2" />
            配码模板
          </TabsTrigger>
        </TabsList>

        {/* 装箱单列表 */}
        <TabsContent value="list" className="space-y-4">
          <div className="flex justify-between">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="搜索装箱单..." className="pl-10 w-64" />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                筛选
              </Button>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>装箱单号</TableHead>
                    <TableHead>订单号</TableHead>
                    <TableHead>款号</TableHead>
                    <TableHead>款式名称</TableHead>
                    <TableHead>客户</TableHead>
                    <TableHead>颜色</TableHead>
                    <TableHead className="text-right">总数量</TableHead>
                    <TableHead className="text-right">箱数</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packingLists.map((packing) => {
                    const statusConfig = getStatusBadge(packing.status);
                    return (
                      <TableRow key={packing.id}>
                        <TableCell className="font-medium">{packing.packingNo}</TableCell>
                        <TableCell>{packing.orderNo}</TableCell>
                        <TableCell>{packing.styleNo}</TableCell>
                        <TableCell>{packing.styleName}</TableCell>
                        <TableCell>{packing.customer}</TableCell>
                        <TableCell>{packing.color}</TableCell>
                        <TableCell className="text-right">{packing.totalQty}</TableCell>
                        <TableCell className="text-right">{packing.totalBoxes}</TableCell>
                        <TableCell>
                          <Badge className={statusConfig.className}>
                            <span className="mr-1">{getStatusIcon(packing.status)}</span>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{packing.createdAt}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedPacking(packing);
                                setDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 配码模板 */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建模板
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {sizeTemplates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:border-primary">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Button variant="ghost" size="sm">编辑</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                  
                  <div className="flex items-center gap-2 mb-3">
                    {template.sizes.map((size, index) => (
                      <div key={size} className="text-center">
                        <Badge variant="outline">{size}</Badge>
                        <div className="text-xs mt-1">{template.ratios[index]}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>配码比例: {template.ratios.join(':')}</span>
                    <span>合计: {template.ratios.reduce((a, b) => a + b, 0)} 件/箱</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 装箱单详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>装箱单详情 - {selectedPacking?.packingNo}</DialogTitle>
          </DialogHeader>
          
          {selectedPacking && (
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">订单号</span>
                  <p className="font-medium">{selectedPacking.orderNo}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">款号</span>
                  <p className="font-medium">{selectedPacking.styleNo}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">客户</span>
                  <p className="font-medium">{selectedPacking.customer}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">颜色</span>
                  <p className="font-medium">{selectedPacking.color}</p>
                </div>
              </div>
              
              {/* 箱明细 */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">装箱明细</h4>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    添加箱
                  </Button>
                </div>
                
                {selectedPacking.boxes.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>箱号</TableHead>
                        <TableHead>配码</TableHead>
                        <TableHead>尺码明细</TableHead>
                        <TableHead className="text-right">数量</TableHead>
                        <TableHead className="text-right">毛重(kg)</TableHead>
                        <TableHead className="text-right">净重(kg)</TableHead>
                        <TableHead>纸箱尺寸</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPacking.boxes.map((box) => (
                        <TableRow key={box.id}>
                          <TableCell className="font-mono">{box.boxNo}</TableCell>
                          <TableCell>{box.sizeRatio}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {box.sizes.map((s) => (
                                <Badge key={s.size} variant="outline" className="text-xs">
                                  {s.size}:{s.quantity}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{box.totalQty}</TableCell>
                          <TableCell className="text-right">{box.grossWeight}</TableCell>
                          <TableCell className="text-right">{box.netWeight}</TableCell>
                          <TableCell>{box.cartonSize}</TableCell>
                          <TableCell>
                            <Badge className={box.status === 'packed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {box.status === 'packed' ? '已装箱' : '待装箱'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handlePrintBoxLabel(box, selectedPacking)}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <QrCode className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无装箱明细，请添加箱子
                  </div>
                )}
              </div>
              
              {/* 汇总信息 */}
              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">总箱数</p>
                  <p className="text-xl font-bold">{selectedPacking.totalBoxes}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">总数量</p>
                  <p className="text-xl font-bold">{selectedPacking.totalQty}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">状态</p>
                  <Badge className={getStatusBadge(selectedPacking.status).className}>
                    {getStatusBadge(selectedPacking.status).label}
                  </Badge>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">创建时间</p>
                  <p className="text-sm">{selectedPacking.createdAt}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
            {selectedPacking?.status === 'pending' && (
              <Button>
                开始装箱
              </Button>
            )}
            {selectedPacking?.status === 'packing' && (
              <Button>
                完成装箱
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建装箱单对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建装箱单</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>订单号 *</Label>
                <Input
                  value={newPacking.orderNo}
                  onChange={(e) => setNewPacking(prev => ({ ...prev, orderNo: e.target.value }))}
                  placeholder="PO-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label>款号 *</Label>
                <Input
                  value={newPacking.styleNo}
                  onChange={(e) => setNewPacking(prev => ({ ...prev, styleNo: e.target.value }))}
                  placeholder="STYLE-A"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>款式名称</Label>
                <Input
                  value={newPacking.styleName}
                  onChange={(e) => setNewPacking(prev => ({ ...prev, styleName: e.target.value }))}
                  placeholder="红色T恤"
                />
              </div>
              <div className="space-y-2">
                <Label>客户</Label>
                <Input
                  value={newPacking.customer}
                  onChange={(e) => setNewPacking(prev => ({ ...prev, customer: e.target.value }))}
                  placeholder="客户名称"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>颜色</Label>
              <Input
                value={newPacking.color}
                onChange={(e) => setNewPacking(prev => ({ ...prev, color: e.target.value }))}
                placeholder="颜色"
              />
            </div>
            
            <div className="space-y-2">
              <Label>配码模板</Label>
              <Select onValueChange={(value) => {
                const template = sizeTemplates.find(t => t.id === value);
                setSelectedTemplate(template || null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="选择配码模板" />
                </SelectTrigger>
                <SelectContent>
                  {sizeTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedTemplate && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">配码详情</p>
                <div className="flex items-center gap-2">
                  {selectedTemplate.sizes.map((size, index) => (
                    <div key={size} className="text-center">
                      <Badge variant="outline">{size}</Badge>
                      <div className="text-xs mt-1">{selectedTemplate.ratios[index]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreatePacking}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
