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
import { Textarea } from '@/components/ui/textarea';
import {
  Cog,
  Plus,
  Loader2,
  Edit,
  Trash2,
  DollarSign,
  Clock,
} from 'lucide-react';

interface Process {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string | null;
  standard_time: number | null;
  unit_price: number | null;
  sequence: number;
  is_active: boolean;
}

const categoryConfig: Record<string, { label: string; color: string }> = {
  cutting: { label: '裁床', color: 'bg-blue-500' },
  sewing: { label: '车缝', color: 'bg-green-500' },
  finishing: { label: '后道', color: 'bg-orange-500' },
  packing: { label: '包装', color: 'bg-purple-500' },
  craft: { label: '二次工艺', color: 'bg-pink-500' },
};

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'sewing',
    description: '',
    standard_time: '',
    unit_price: '',
    sequence: '0',
  });

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      
      const response = await fetch(`/api/processes?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setProcesses(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch processes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, [categoryFilter]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const url = '/api/processes';
      const method = editingProcess ? 'PUT' : 'POST';
      const body = editingProcess 
        ? { id: editingProcess.id, ...formData }
        : {
            ...formData,
            standard_time: formData.standard_time ? Number(formData.standard_time) : null,
            unit_price: formData.unit_price ? Number(formData.unit_price) : null,
            sequence: Number(formData.sequence),
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      
      if (result.success) {
        setDialogOpen(false);
        setEditingProcess(null);
        setFormData({
          name: '',
          code: '',
          category: 'sewing',
          description: '',
          standard_time: '',
          unit_price: '',
          sequence: '0',
        });
        fetchProcesses();
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (process: Process) => {
    setEditingProcess(process);
    setFormData({
      name: process.name,
      code: process.code,
      category: process.category,
      description: process.description || '',
      standard_time: process.standard_time?.toString() || '',
      unit_price: process.unit_price?.toString() || '',
      sequence: process.sequence?.toString() || '0',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此工序吗？此操作不可恢复。')) return;
    
    try {
      const response = await fetch(`/api/processes?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        fetchProcesses();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('删除失败');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">工序管理</h1>
          <p className="text-muted-foreground">定义标准工序、单价，用于计件工资计算</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新增工序
        </Button>
      </div>

      {/* 工序分类说明 */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(categoryConfig).map(([key, config]) => (
              <div 
                key={key} 
                className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted"
                onClick={() => setCategoryFilter(key)}
              >
                <div className={`w-3 h-3 rounded-full ${config.color}`} />
                <span className="text-sm font-medium">{config.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 筛选 */}
      <Card>
        <CardContent className="pt-6">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="工序分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              <SelectItem value="cutting">裁床</SelectItem>
              <SelectItem value="sewing">车缝</SelectItem>
              <SelectItem value="finishing">后道(熨烫/查货/剪线)</SelectItem>
              <SelectItem value="packing">包装</SelectItem>
              <SelectItem value="craft">二次工艺</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 工序列表 */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : processes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无工序数据
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>工序编码</TableHead>
                  <TableHead>工序名称</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>标准工时(秒)</TableHead>
                  <TableHead>单价(元)</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processes.map((process) => (
                  <TableRow key={process.id}>
                    <TableCell className="font-mono">{process.code}</TableCell>
                    <TableCell className="font-medium">{process.name}</TableCell>
                    <TableCell>
                      <Badge className={categoryConfig[process.category]?.color || 'bg-gray-500'}>
                        {categoryConfig[process.category]?.label || process.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {process.standard_time ? `${process.standard_time}秒` : '-'}
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">
                      ¥{process.unit_price?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>{process.sequence}</TableCell>
                    <TableCell>
                      <Badge variant={process.is_active ? 'default' : 'outline'}>
                        {process.is_active ? '启用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(process)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDelete(process.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProcess ? '编辑工序' : '新增工序'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>工序编码 *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="如: SEW001"
                />
              </div>
              <div className="space-y-2">
                <Label>工序名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如: 缝制前片"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>工序分类 *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cutting">裁床</SelectItem>
                  <SelectItem value="sewing">车缝</SelectItem>
                  <SelectItem value="finishing">后道(熨烫/查货/剪线)</SelectItem>
                  <SelectItem value="packing">包装</SelectItem>
                  <SelectItem value="craft">二次工艺</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  标准工时(秒)
                </Label>
                <Input
                  type="number"
                  value={formData.standard_time}
                  onChange={(e) => setFormData({ ...formData, standard_time: e.target.value })}
                  placeholder="如: 60"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  计件单价(元) *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  placeholder="如: 0.50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>排序号</Label>
              <Input
                type="number"
                value={formData.sequence}
                onChange={(e) => setFormData({ ...formData, sequence: e.target.value })}
                placeholder="数字越小越靠前"
              />
            </div>
            <div className="space-y-2">
              <Label>备注说明</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="工序说明..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDialogOpen(false);
              setEditingProcess(null);
            }}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting || !formData.name || !formData.code}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingProcess ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
