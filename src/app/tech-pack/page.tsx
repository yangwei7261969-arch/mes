'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Download,
  Copy,
  Package,
  Layers,
  Ruler,
  GitBranch,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

interface TechPack {
  id: string;
  tech_pack_no: string;
  style_no: string;
  style_name: string;
  customer_id: string;
  customer_name: string;
  season: string;
  category: string;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BOMItem {
  id: string;
  material_type: string;
  material_code: string;
  material_name: string;
  specification: string;
  color: string;
  unit: string;
  consumption: number;
  loss_rate: number;
  unit_price: number;
  total_price: number;
  supplier: string;
  lead_time: number;
  in_stock: boolean;
}

interface ProcessStep {
  id: string;
  step_code: string;
  step_name: string;
  department: string;
  sequence: number;
  standard_time: number;
  rate: number;
  equipment: string;
  notes: string;
}

export default function TechPackPage() {
  const [techPacks, setTechPacks] = useState<TechPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // 详情弹窗
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTechPack, setSelectedTechPack] = useState<TechPack | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [activeTab, setActiveTab] = useState('basic');
  
  // 新增/编辑弹窗
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    style_no: '',
    style_name: '',
    customer_id: '',
    season: '',
    category: '',
    notes: '',
  });

  useEffect(() => {
    fetchTechPacks();
  }, [statusFilter]);

  const fetchTechPacks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tech-pack?action=list');
      const data = await res.json();
      if (data.success) {
        // 处理API返回的数据结构
        const techPackList = data.data?.techPacks || [];
        // 转换为前端期望的格式
        const formatted = techPackList.map((tp: any) => ({
          id: tp.id,
          tech_pack_no: tp.tech_pack_no,
          style_no: tp.styles?.style_no || '-',
          style_name: tp.styles?.style_name || '-',
          customer_id: tp.customers?.id || '',
          customer_name: tp.customers?.name || '-',
          season: tp.styles?.season || '-',
          category: tp.styles?.category || '-',
          version: tp.version,
          status: tp.status,
          created_at: tp.created_at,
          updated_at: tp.updated_at,
        }));
        setTechPacks(formatted);
      }
    } catch (error) {
      console.error('Failed to fetch tech packs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechPackDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/tech-pack?action=bom&tech_pack_id=${id}`);
      const data = await res.json();
      if (data.success) {
        // 转换BOM数据
        const bomData = (data.data?.bom || []).map((item: any) => ({
          id: item.id,
          material_type: item.item_type || '辅料',
          material_code: item.materials?.material_code || item.material_id || '-',
          material_name: item.material_name || item.materials?.material_name || '-',
          specification: item.specification || '-',
          color: item.color || '-',
          unit: item.unit || '件',
          consumption: item.quantity || 0,
          loss_rate: item.wastage_rate || 0,
          unit_price: item.unit_price || 0,
          total_price: (item.unit_price || 0) * (item.quantity || 0),
          supplier: item.materials?.suppliers?.name || '-',
          lead_time: 0,
          in_stock: false,
        }));
        setBomItems(bomData);
      }
      
      const res2 = await fetch(`/api/tech-pack?action=processes&tech_pack_id=${id}`);
      const data2 = await res2.json();
      if (data2.success) {
        const processData = (data2.data?.processes || []).map((p: any, index: number) => ({
          id: p.id,
          step_code: p.processes?.process_code || p.process_id || `P${index + 1}`,
          step_name: p.processes?.process_name || '-',
          department: p.processes?.category || '生产',
          sequence: p.sequence || index + 1,
          standard_time: p.standard_time || p.processes?.standard_time || 0,
          rate: 0,
          equipment: p.machine_type || '-',
          notes: p.remarks || '',
        }));
        setProcessSteps(processData);
      }
    } catch (error) {
      console.error('Failed to fetch tech pack detail:', error);
    }
  };

  const handleViewDetail = (techPack: TechPack) => {
    setSelectedTechPack(techPack);
    setDetailDialogOpen(true);
    fetchTechPackDetail(techPack.id);
  };

  const handleCreateNew = () => {
    setEditForm({
      style_no: '',
      style_name: '',
      customer_id: '',
      season: '',
      category: '',
      notes: '',
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/tech-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          data: {
            styleId: null,
            style_no: editForm.style_no,
            style_name: editForm.style_name,
            customerId: editForm.customer_id || null,
            season: editForm.season,
            category: editForm.category,
            description: editForm.notes,
          }
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditDialogOpen(false);
        fetchTechPacks();
      } else {
        alert(data.error || '保存失败');
      }
    } catch (error) {
      alert('保存失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      draft: { variant: 'secondary', label: '草稿' },
      pending: { variant: 'outline', label: '待审核' },
      approved: { variant: 'default', label: '已批准' },
      rejected: { variant: 'destructive', label: '已拒绝' },
    };
    const config = statusMap[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredTechPacks = techPacks.filter(tp => {
    const matchesSearch = tp.style_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tp.style_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tp.tech_pack_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // BOM统计
  const bomStats = {
    total: bomItems.length,
    totalCost: bomItems.reduce((sum, item) => sum + item.total_price, 0),
    fabric: bomItems.filter(i => i.material_type === '面料').length,
    accessory: bomItems.filter(i => i.material_type === '辅料').length,
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* 标题和操作 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">工艺单管理</h1>
          <p className="text-muted-foreground">管理款式工艺单、BOM清单、工序流程</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            新建工艺单
          </Button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索款式号、款式名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="pending">待审核</SelectItem>
                <SelectItem value="approved">已批准</SelectItem>
                <SelectItem value="rejected">已拒绝</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 工艺单列表 */}
      <Card>
        <CardHeader>
          <CardTitle>工艺单列表</CardTitle>
          <CardDescription>共 {filteredTechPacks.length} 条记录</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>工艺单号</TableHead>
                    <TableHead>款式号</TableHead>
                    <TableHead>款式名称</TableHead>
                    <TableHead>客户</TableHead>
                    <TableHead>季节</TableHead>
                    <TableHead>版本</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>更新时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTechPacks.map((tp) => (
                    <TableRow key={tp.id}>
                      <TableCell className="font-medium">{tp.tech_pack_no}</TableCell>
                      <TableCell>{tp.style_no}</TableCell>
                      <TableCell>{tp.style_name}</TableCell>
                      <TableCell>{tp.customer_name || '-'}</TableCell>
                      <TableCell>{tp.season || '-'}</TableCell>
                      <TableCell>V{tp.version}</TableCell>
                      <TableCell>{getStatusBadge(tp.status)}</TableCell>
                      <TableCell>{new Date(tp.updated_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetail(tp)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTechPacks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 详情弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              工艺单详情 - {selectedTechPack?.tech_pack_no}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="bom">
                <Package className="h-4 w-4 mr-1" />
                BOM清单
              </TabsTrigger>
              <TabsTrigger value="process">
                <GitBranch className="h-4 w-4 mr-1" />
                工序流程
              </TabsTrigger>
              <TabsTrigger value="images">
                <ImageIcon className="h-4 w-4 mr-1" />
                图片资料
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                <div>
                  <Label className="text-muted-foreground">款式号</Label>
                  <p className="font-medium">{selectedTechPack?.style_no}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">款式名称</Label>
                  <p className="font-medium">{selectedTechPack?.style_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">客户</Label>
                  <p className="font-medium">{selectedTechPack?.customer_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">季节</Label>
                  <p className="font-medium">{selectedTechPack?.season || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">品类</Label>
                  <p className="font-medium">{selectedTechPack?.category || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">版本</Label>
                  <p className="font-medium">V{selectedTechPack?.version}</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="bom" className="space-y-4">
              {/* BOM统计 */}
              <div className="grid grid-cols-4 gap-4 pt-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">{bomStats.total}</p>
                    <p className="text-sm text-muted-foreground">物料总数</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-green-600">¥{bomStats.totalCost.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">总成本</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{bomStats.fabric}</p>
                    <p className="text-sm text-muted-foreground">面料</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{bomStats.accessory}</p>
                    <p className="text-sm text-muted-foreground">辅料</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* BOM表格 */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>物料类型</TableHead>
                      <TableHead>物料编码</TableHead>
                      <TableHead>物料名称</TableHead>
                      <TableHead>规格</TableHead>
                      <TableHead>颜色</TableHead>
                      <TableHead className="text-right">单耗</TableHead>
                      <TableHead className="text-right">损耗率</TableHead>
                      <TableHead className="text-right">单价</TableHead>
                      <TableHead className="text-right">总价</TableHead>
                      <TableHead>供应商</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bomItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="outline">{item.material_type}</Badge>
                        </TableCell>
                        <TableCell>{item.material_code}</TableCell>
                        <TableCell>{item.material_name}</TableCell>
                        <TableCell>{item.specification}</TableCell>
                        <TableCell>{item.color}</TableCell>
                        <TableCell className="text-right">{item.consumption} {item.unit}</TableCell>
                        <TableCell className="text-right">{item.loss_rate}%</TableCell>
                        <TableCell className="text-right">¥{item.unit_price}</TableCell>
                        <TableCell className="text-right font-medium">¥{item.total_price.toFixed(2)}</TableCell>
                        <TableCell>{item.supplier || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {bomItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          暂无BOM数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="process" className="space-y-4">
              <div className="overflow-x-auto pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>序号</TableHead>
                      <TableHead>工序编码</TableHead>
                      <TableHead>工序名称</TableHead>
                      <TableHead>部门</TableHead>
                      <TableHead className="text-right">标准工时</TableHead>
                      <TableHead className="text-right">工价</TableHead>
                      <TableHead>设备</TableHead>
                      <TableHead>备注</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processSteps.map((step, index) => (
                      <TableRow key={step.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{step.step_code}</TableCell>
                        <TableCell className="font-medium">{step.step_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{step.department}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{step.standard_time}秒</TableCell>
                        <TableCell className="text-right">¥{step.rate.toFixed(2)}</TableCell>
                        <TableCell>{step.equipment || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{step.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {processSteps.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          暂无工序数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="images" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                <Card>
                  <CardContent className="pt-4 flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-200">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">款式图</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-200">
                    <Layers className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">结构图</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-200">
                    <Ruler className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">尺寸表</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              导出PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增/编辑弹窗 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建工艺单</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>款式号 *</Label>
                <Input
                  value={editForm.style_no}
                  onChange={(e) => setEditForm({...editForm, style_no: e.target.value})}
                  placeholder="如: ST2024001"
                />
              </div>
              <div className="space-y-2">
                <Label>款式名称 *</Label>
                <Input
                  value={editForm.style_name}
                  onChange={(e) => setEditForm({...editForm, style_name: e.target.value})}
                  placeholder="如: 经典圆领T恤"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>季节</Label>
                <Input
                  value={editForm.season}
                  onChange={(e) => setEditForm({...editForm, season: e.target.value})}
                  placeholder="如: 2024SS"
                />
              </div>
              <div className="space-y-2">
                <Label>品类</Label>
                <Input
                  value={editForm.category}
                  onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                  placeholder="如: T恤"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                placeholder="输入备注信息..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
