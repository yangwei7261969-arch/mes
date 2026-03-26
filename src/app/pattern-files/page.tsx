'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Plus,
  Loader2,
  Search,
  Trash2,
  Eye,
  Edit,
  Upload,
  Layers,
  Ruler,
  Download,
  History,
  Copy,
  Calculator,
} from 'lucide-react';

interface PatternFile {
  id: string;
  file_no: string;
  file_name: string;
  file_type: 'marker' | 'pattern';
  file_path: string | null;
  file_size: number | null;
  style_no: string | null;
  style_name: string | null;
  sizes: string[] | null;
  fabric_width: number | null;
  fabric_length: number | null;
  fabric_usage: number | null;
  layout_efficiency: number | null;
  layers_count: number;
  pieces_count: number | null;
  production_order_id: string | null;
  version: number;
  parent_id: string | null;
  change_log: string | null;
  remark: string | null;
  status: string;
  created_at: string;
  production_orders?: {
    order_no: string;
    style_name: string;
    color: string;
    quantity: number;
  } | null;
}

interface ProductionOrder {
  id: string;
  order_no: string;
  style_no: string;
  style_name: string;
  color: string;
  quantity: number;
}

export default function PatternFilesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<PatternFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // 弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<PatternFile | null>(null);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  
  // 表单数据
  const [formData, setFormData] = useState({
    file_name: '',
    file_type: 'marker' as 'marker' | 'pattern',
    file_path: '',
    file_size: 0,
    style_no: '',
    style_name: '',
    sizes: [] as string[],
    fabric_width: 0,
    fabric_length: 0,
    layout_efficiency: 0,
    layers_count: 1,
    pieces_count: 0,
    production_order_id: '',
    remark: '',
  });
  
  // 用量计算
  const [calcData, setCalcData] = useState({
    quantity: 100,
    fabric_width: 150,
    fabric_length: 100,
    layers_count: 1,
  });

  // 文件上传相关
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    file_key: string;
    file_path: string;
    file_url: string;
    file_name: string;
    file_size: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
    fetchProductionOrders();
  }, [typeFilter]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      
      const response = await fetch(`/api/pattern-files?${params}`);
      const result = await response.json();
      if (result.success) {
        setFiles(result.data || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductionOrders = async () => {
    try {
      const response = await fetch('/api/production-orders');
      const result = await response.json();
      if (result.success) {
        setProductionOrders(result.data || []);
      }
    } catch (error) {
      console.error('Fetch production orders error:', error);
    }
  };

  // 文件上传处理
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('file_type', formData.file_type);

      const response = await fetch('/api/pattern-files/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();
      if (result.success) {
        setUploadedFile(result.data);
        setFormData({
          ...formData,
          file_name: formData.file_name || result.data.file_name,
          file_path: result.data.file_path,
          file_size: result.data.file_size,
        });
      } else {
        setUploadError(result.error || '上传失败');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      file_name: '',
      file_type: 'marker',
      file_path: '',
      file_size: 0,
      style_no: '',
      style_name: '',
      sizes: [],
      fabric_width: 0,
      fabric_length: 0,
      layout_efficiency: 0,
      layers_count: 1,
      pieces_count: 0,
      production_order_id: '',
      remark: '',
    });
    setUploadedFile(null);
    setUploadError(null);
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (file: PatternFile) => {
    setSelectedFile(file);
    setFormData({
      file_name: file.file_name,
      file_type: file.file_type,
      file_path: file.file_path || '',
      file_size: file.file_size || 0,
      style_no: file.style_no || '',
      style_name: file.style_name || '',
      sizes: file.sizes || [],
      fabric_width: file.fabric_width || 0,
      fabric_length: file.fabric_length || 0,
      layout_efficiency: file.layout_efficiency || 0,
      layers_count: file.layers_count || 1,
      pieces_count: file.pieces_count || 0,
      production_order_id: file.production_order_id || '',
      remark: file.remark || '',
    });
    setDialogOpen(true);
  };

  const handleViewDetail = (file: PatternFile) => {
    setSelectedFile(file);
    setDetailDialogOpen(true);
  };

  const handleSave = async () => {
    // 新建时必须有上传的文件
    if (!selectedFile && !uploadedFile) {
      alert('请先上传文件');
      return;
    }
    
    if (!formData.file_name.trim()) {
      alert('请输入文件名');
      return;
    }

    setSaving(true);
    try {
      const url = selectedFile 
        ? `/api/pattern-files?id=${selectedFile.id}`
        : '/api/pattern-files';
      
      const body = selectedFile
        ? { id: selectedFile.id, ...formData }
        : { 
            ...formData, 
            file_path: uploadedFile?.file_path,
            file_size: uploadedFile?.file_size,
          };

      const response = await fetch(url, {
        method: selectedFile ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (result.success) {
        setDialogOpen(false);
        setUploadedFile(null);
        fetchFiles();
      } else {
        alert(result.error || '保存失败');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 下载文件
  const handleDownload = async (file: PatternFile) => {
    if (!file.file_path) {
      alert('该文件没有上传文件');
      return;
    }
    
    try {
      const response = await fetch(`/api/pattern-files/download?file_key=${encodeURIComponent(file.file_path)}`);
      const result = await response.json();
      if (result.success && result.data?.download_url) {
        // 使用 fetch + blob 模式下载
        const fileResponse = await fetch(result.data.download_url);
        const blob = await fileResponse.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = file.file_name;
        link.click();
        window.URL.revokeObjectURL(blobUrl);
      } else {
        alert(result.error || '获取下载链接失败');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('下载失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此文件吗？')) return;
    
    try {
      const response = await fetch(`/api/pattern-files?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        fetchFiles();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // 创建新版本
  const handleCreateVersion = async (file: PatternFile) => {
    if (!confirm('确定要基于此文件创建新版本吗？')) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/pattern-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: file.file_name,
          file_type: file.file_type,
          style_no: file.style_no,
          style_name: file.style_name,
          sizes: file.sizes,
          fabric_width: file.fabric_width,
          fabric_length: file.fabric_length,
          layout_efficiency: file.layout_efficiency,
          layers_count: file.layers_count,
          pieces_count: file.pieces_count,
          production_order_id: file.production_order_id,
          parent_id: file.id,
          change_log: `从版本V${file.version}创建`,
        }),
      });

      const result = await response.json();
      if (result.success) {
        fetchFiles();
        alert(`新版本V${file.version + 1}创建成功`);
      }
    } catch (error) {
      console.error('Create version error:', error);
      alert('创建版本失败');
    } finally {
      setSaving(false);
    }
  };

  // 计算用量
  const calculateUsage = () => {
    const { quantity, fabric_width, fabric_length, layers_count } = calcData;
    const singleUsage = (fabric_width * fabric_length) / 10000; // 平方米
    const totalUsage = singleUsage * quantity;
    const efficiency = 85; // 假设85%利用率
    
    return {
      singleUsage: singleUsage.toFixed(4),
      totalUsage: totalUsage.toFixed(2),
      actualUsage: (totalUsage / (efficiency / 100)).toFixed(2),
      efficiency,
    };
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 过滤列表
  const filteredFiles = files.filter(file => {
    const matchSearch = !searchTerm || 
      file.file_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.style_no?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  // 统计
  const stats = {
    total: files.length,
    markers: files.filter(f => f.file_type === 'marker').length,
    patterns: files.filter(f => f.file_type === 'pattern').length,
    totalUsage: files.reduce((sum, f) => sum + (f.fabric_usage || 0), 0),
  };

  return (
    <div className="p-6 space-y-6">
      {/* 标题区域 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">唛架/纸样管理</h1>
            <p className="text-muted-foreground">管理唛架文件、纸样文件，计算用量</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCalcDialogOpen(true)}>
            <Calculator className="h-4 w-4 mr-2" />
            用量计算器
          </Button>
          <Button onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-2" />
            新增文件
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总文件数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">唛架文件</CardTitle>
            <Layers className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.markers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">纸样文件</CardTitle>
            <Ruler className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.patterns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总用料(㎡)</CardTitle>
            <Calculator className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.totalUsage.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索文件编号、文件名、款号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="marker">唛架文件</SelectItem>
                <SelectItem value="pattern">纸样文件</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 文件列表 */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无文件数据
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>文件编号</TableHead>
                  <TableHead>文件名</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>款号</TableHead>
                  <TableHead>尺码</TableHead>
                  <TableHead>面料门幅</TableHead>
                  <TableHead>单件用量</TableHead>
                  <TableHead>利用率</TableHead>
                  <TableHead>版本</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-mono">{file.file_no}</TableCell>
                    <TableCell className="font-medium">{file.file_name}</TableCell>
                    <TableCell>
                      <Badge variant={file.file_type === 'marker' ? 'default' : 'secondary'}>
                        {file.file_type === 'marker' ? '唛架' : '纸样'}
                      </Badge>
                    </TableCell>
                    <TableCell>{file.style_no || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(file.sizes || []).slice(0, 3).map(size => (
                          <Badge key={size} variant="outline" className="text-xs">{size}</Badge>
                        ))}
                        {(file.sizes || []).length > 3 && (
                          <Badge variant="outline" className="text-xs">+{(file.sizes || []).length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{file.fabric_width ? `${file.fabric_width}cm` : '-'}</TableCell>
                    <TableCell>{file.fabric_usage ? `${file.fabric_usage}㎡` : '-'}</TableCell>
                    <TableCell>
                      {file.layout_efficiency ? `${file.layout_efficiency}%` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">V{file.version}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          title="查看详情"
                          onClick={() => handleViewDetail(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          title="编辑"
                          onClick={() => handleOpenEdit(file)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {file.file_path && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            title="下载文件"
                            onClick={() => handleDownload(file)}
                          >
                            <Download className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          title="创建新版本"
                          onClick={() => handleCreateVersion(file)}
                        >
                          <Copy className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          title="删除"
                          onClick={() => handleDelete(file.id)}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {selectedFile ? '编辑文件' : '新增文件'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 文件上传区域 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                上传文件 <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 relative border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".prj,.dxf,.plt,.cut,.aoo,.xml"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-muted-foreground">上传中...</span>
                    </div>
                  ) : uploadedFile ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <FileText className="h-5 w-5" />
                      <span className="font-medium">{uploadedFile.file_name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(uploadedFile.file_size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        点击或拖拽上传唛架/纸样文件
                      </span>
                      <span className="text-xs text-muted-foreground">
                        支持 .prj, .dxf, .plt, .cut, .aoo, .xml 格式
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {uploadError && (
                <div className="text-sm text-red-500">{uploadError}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>文件名</Label>
                <Input
                  placeholder="如: PB2511004女上衣.prj"
                  value={formData.file_name}
                  onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  文件类型 <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.file_type} 
                  onValueChange={(v) => setFormData({ ...formData, file_type: v as 'marker' | 'pattern' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marker">唛架文件</SelectItem>
                    <SelectItem value="pattern">纸样文件</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>款号</Label>
                <Input
                  placeholder="如: PB2511004"
                  value={formData.style_no}
                  onChange={(e) => setFormData({ ...formData, style_no: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>款名</Label>
                <Input
                  placeholder="如: 女上衣"
                  value={formData.style_name}
                  onChange={(e) => setFormData({ ...formData, style_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>关联生产订单</Label>
              <Select 
                value={formData.production_order_id} 
                onValueChange={(v) => {
                  const order = productionOrders.find(o => o.id === v);
                  setFormData({ 
                    ...formData, 
                    production_order_id: v,
                    style_no: order?.style_no || formData.style_no,
                    style_name: order?.style_name || formData.style_name,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择生产订单" />
                </SelectTrigger>
                <SelectContent>
                  {productionOrders.map(order => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.order_no} - {order.style_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>尺码（逗号分隔）</Label>
              <Input
                placeholder="如: 2XS, XS, S, M, L, XL, 2XL, 3XL"
                value={formData.sizes.join(', ')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  sizes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                })}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">用料信息</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>面料门幅(cm)</Label>
                  <Input
                    type="number"
                    placeholder="如: 150"
                    value={formData.fabric_width || ''}
                    onChange={(e) => setFormData({ ...formData, fabric_width: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>单件长度(cm)</Label>
                  <Input
                    type="number"
                    placeholder="如: 100"
                    value={formData.fabric_length || ''}
                    onChange={(e) => setFormData({ ...formData, fabric_length: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>排料利用率(%)</Label>
                  <Input
                    type="number"
                    placeholder="如: 85"
                    value={formData.layout_efficiency || ''}
                    onChange={(e) => setFormData({ ...formData, layout_efficiency: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>层数</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.layers_count}
                    onChange={(e) => setFormData({ ...formData, layers_count: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>裁片数量</Label>
                  <Input
                    type="number"
                    placeholder="裁片总数"
                    value={formData.pieces_count || ''}
                    onChange={(e) => setFormData({ ...formData, pieces_count: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                rows={2}
              />
            </div>

            {/* 用量计算结果 */}
            {formData.fabric_width && formData.fabric_length && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">用量计算</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">单件用量：</span>
                    <span className="font-bold">
                      {((formData.fabric_width * formData.fabric_length) / 10000).toFixed(4)} ㎡
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">利用率修正：</span>
                    <span className="font-bold">
                      {formData.layout_efficiency 
                        ? (((formData.fabric_width * formData.fabric_length) / 10000) / (formData.layout_efficiency / 100)).toFixed(4)
                        : '-'
                      } ㎡
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              文件详情
            </DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">文件编号</span>
                  <p className="font-mono font-medium">{selectedFile.file_no}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">文件名</span>
                  <p className="font-medium">{selectedFile.file_name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">文件类型</span>
                  <Badge variant={selectedFile.file_type === 'marker' ? 'default' : 'secondary'}>
                    {selectedFile.file_type === 'marker' ? '唛架文件' : '纸样文件'}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">版本</span>
                  <Badge variant="outline">V{selectedFile.version}</Badge>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">款号</span>
                  <p className="font-medium">{selectedFile.style_no || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">款名</span>
                  <p>{selectedFile.style_name || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">面料门幅</span>
                  <p>{selectedFile.fabric_width ? `${selectedFile.fabric_width}cm` : '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">单件长度</span>
                  <p>{selectedFile.fabric_length ? `${selectedFile.fabric_length}cm` : '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">单件用量</span>
                  <p className="font-bold text-blue-600">
                    {selectedFile.fabric_usage ? `${selectedFile.fabric_usage}㎡` : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">排料利用率</span>
                  <p>{selectedFile.layout_efficiency ? `${selectedFile.layout_efficiency}%` : '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">层数</span>
                  <p>{selectedFile.layers_count}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">裁片数量</span>
                  <p>{selectedFile.pieces_count || '-'}</p>
                </div>
              </div>

              {selectedFile.sizes && selectedFile.sizes.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">包含尺码</span>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {selectedFile.sizes.map(size => (
                      <Badge key={size} variant="secondary">{size}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedFile.production_orders && (
                <div>
                  <span className="text-sm text-muted-foreground">关联订单</span>
                  <p className="font-medium">{selectedFile.production_orders.order_no} - {selectedFile.production_orders.style_name}</p>
                </div>
              )}

              {selectedFile.remark && (
                <div>
                  <span className="text-sm text-muted-foreground">备注</span>
                  <p>{selectedFile.remark}</p>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                创建时间: {new Date(selectedFile.created_at).toLocaleString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 用量计算器弹窗 */}
      <Dialog open={calcDialogOpen} onOpenChange={setCalcDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              用量计算器
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>生产数量</Label>
              <Input
                type="number"
                value={calcData.quantity}
                onChange={(e) => setCalcData({ ...calcData, quantity: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>面料门幅(cm)</Label>
              <Input
                type="number"
                value={calcData.fabric_width}
                onChange={(e) => setCalcData({ ...calcData, fabric_width: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>单件长度(cm)</Label>
              <Input
                type="number"
                value={calcData.fabric_length}
                onChange={(e) => setCalcData({ ...calcData, fabric_length: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>层数</Label>
              <Input
                type="number"
                value={calcData.layers_count}
                onChange={(e) => setCalcData({ ...calcData, layers_count: Number(e.target.value) })}
              />
            </div>

            {/* 计算结果 */}
            <div className="p-4 bg-green-50 rounded-lg space-y-2">
              <h4 className="font-semibold text-green-800">计算结果</h4>
              {(() => {
                const result = calculateUsage();
                return (
                  <>
                    <div className="flex justify-between">
                      <span>单件用量：</span>
                      <span className="font-bold">{result.singleUsage} ㎡</span>
                    </div>
                    <div className="flex justify-between">
                      <span>理论总用量：</span>
                      <span className="font-bold">{result.totalUsage} ㎡</span>
                    </div>
                    <div className="flex justify-between">
                      <span>利用率({result.efficiency}%)修正：</span>
                      <span className="font-bold text-red-600">{result.actualUsage} ㎡</span>
                    </div>
                    <div className="flex justify-between">
                      <span>面料总长度：</span>
                      <span className="font-bold">{(Number(result.actualUsage) * 10000 / calcData.fabric_width).toFixed(1)} cm</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
