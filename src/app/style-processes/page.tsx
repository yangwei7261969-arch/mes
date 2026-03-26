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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Cog,
  Plus,
  Trash2,
  Copy,
  Save,
  Search,
  AlertCircle,
  CheckCircle,
  FileText,
  ArrowRight,
} from 'lucide-react';

interface Process {
  id: string;
  name: string;
  code: string;
  category: string;
  unit_price: number;
  standard_time?: number;
}

interface StyleProcess {
  id: string;
  style_no: string;
  process_id: string;
  sequence: number;
  unit_price: number;
  notes?: string;
  processes?: Process;
}

interface ProcessTemplate {
  id: string;
  name: string;
  description?: string;
  processes: any[];
  is_default: boolean;
}

export default function StyleProcessesPage() {
  const [styleProcesses, setStyleProcesses] = useState<Record<string, StyleProcess[]>>({});
  const [allProcesses, setAllProcesses] = useState<Process[]>([]);
  const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchStyle, setSearchStyle] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  
  // 配置表单
  const [selectedStyleNo, setSelectedStyleNo] = useState('');
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [copyFromStyle, setCopyFromStyle] = useState('');
  
  // 模板表单
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 并行获取数据
      const [styleRes, processRes, templateRes] = await Promise.all([
        fetch('/api/style-processes'),
        fetch('/api/processes'),
        fetch('/api/process-templates'),
      ]);

      const [styleData, processData, templateData] = await Promise.all([
        styleRes.json(),
        processRes.json(),
        templateRes.json(),
      ]);

      if (styleData.success) setStyleProcesses(styleData.data);
      if (processData.success) setAllProcesses(processData.data);
      if (templateData.success) setTemplates(templateData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureStyle = (styleNo: string) => {
    setSelectedStyleNo(styleNo);
    // 如果已有配置，预选中
    const existing = styleProcesses[styleNo] || [];
    setSelectedProcesses(existing.map((sp: StyleProcess) => sp.process_id));
    setDialogOpen(true);
  };

  const handleSaveProcesses = async () => {
    if (!selectedStyleNo || selectedProcesses.length === 0) {
      alert('请选择至少一个工序');
      return;
    }

    try {
      // 先删除旧配置
      await fetch(`/api/style-processes?style_no=${selectedStyleNo}`, {
        method: 'DELETE',
      });

      // 创建新配置
      const processes = selectedProcesses.map((processId, index) => {
        const process = allProcesses.find(p => p.id === processId);
        return {
          process_id: processId,
          sequence: index + 1,
          unit_price: process?.unit_price || 0,
        };
      });

      const response = await fetch('/api/style-processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style_no: selectedStyleNo,
          processes,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('配置成功！');
        setDialogOpen(false);
        fetchData();
      } else {
        alert(result.error || '配置失败');
      }
    } catch (error) {
      alert('配置失败');
    }
  };

  const handleCopyFromStyle = async () => {
    if (!selectedStyleNo || !copyFromStyle) {
      alert('请选择源款式');
      return;
    }

    try {
      const response = await fetch('/api/style-processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style_no: selectedStyleNo,
          copy_from: copyFromStyle,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(result.message);
        setCopyDialogOpen(false);
        setCopyFromStyle('');
        fetchData();
      } else {
        alert(result.error || '复制失败');
      }
    } catch (error) {
      alert('复制失败');
    }
  };

  const handleDeleteStyleProcess = async (styleNo: string) => {
    if (!confirm(`确定要删除 ${styleNo} 的所有工序配置吗？`)) return;

    try {
      const response = await fetch(`/api/style-processes?style_no=${styleNo}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        fetchData();
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleSaveAsTemplate = async (styleNo: string) => {
    setSelectedStyleNo(styleNo);
    setTemplateName(`${styleNo}工序模板`);
    setTemplateDesc('');
    setTemplateDialogOpen(true);
  };

  const handleCreateTemplate = async () => {
    if (!templateName) {
      alert('请输入模板名称');
      return;
    }

    const processes = styleProcesses[selectedStyleNo] || [];
    if (processes.length === 0) {
      alert('该款式没有工序配置');
      return;
    }

    try {
      const response = await fetch('/api/process-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          description: templateDesc,
          processes: processes.map(p => ({
            process_id: p.process_id,
            process_name: p.processes?.name,
            sequence: p.sequence,
            unit_price: p.unit_price,
          })),
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('模板创建成功！');
        setTemplateDialogOpen(false);
        fetchData();
      } else {
        alert(result.error || '创建失败');
      }
    } catch (error) {
      alert('创建失败');
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (!selectedStyleNo) return;

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    try {
      // 先删除旧配置
      await fetch(`/api/style-processes?style_no=${selectedStyleNo}`, {
        method: 'DELETE',
      });

      // 应用模板
      const processes = template.processes.map((p: any, index: number) => ({
        process_id: p.process_id,
        sequence: p.sequence || index + 1,
        unit_price: p.unit_price,
      }));

      const response = await fetch('/api/style-processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style_no: selectedStyleNo,
          processes,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('模板应用成功！');
        setDialogOpen(false);
        fetchData();
      } else {
        alert(result.error || '应用失败');
      }
    } catch (error) {
      alert('应用失败');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('确定要删除此模板吗？')) return;

    try {
      await fetch(`/api/process-templates?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      alert('删除失败');
    }
  };

  // 获取所有款式号（从配置中提取）
  const allStyleNos = Object.keys(styleProcesses);

  // 筛选
  const filteredStyles = searchStyle
    ? allStyleNos.filter(s => s.toLowerCase().includes(searchStyle.toLowerCase()))
    : allStyleNos;

  // 统计
  const totalStyles = allStyleNos.length;
  const totalProcesses = allProcesses.length;
  const totalTemplates = templates.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            款式工序配置
          </h1>
          <p className="text-gray-500 mt-1">配置款式的工序流程，支持跨款式复制和模板</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">已配置款式</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStyles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">可用工序</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProcesses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">工序模板</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTemplates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">配置覆盖率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalStyles > 0 ? '100%' : '0%'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：款式工序配置列表 */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>款式工序配置</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="搜索款号..."
                    value={searchStyle}
                    onChange={(e) => setSearchStyle(e.target.value)}
                    className="w-48"
                  />
                  <Button 
                    size="sm"
                    onClick={() => {
                      setSelectedStyleNo('');
                      setSelectedProcesses([]);
                      setDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    配置新款式
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">加载中...</div>
              ) : filteredStyles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无配置，点击"配置新款式"开始
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>款号</TableHead>
                      <TableHead>工序数</TableHead>
                      <TableHead>工序流程</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStyles.map((styleNo) => {
                      const processes = styleProcesses[styleNo] || [];
                      return (
                        <TableRow key={styleNo}>
                          <TableCell className="font-bold">{styleNo}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{processes.length} 个</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-md">
                              {processes.slice(0, 5).map((sp: StyleProcess, i: number) => (
                                <span key={sp.id} className="text-xs">
                                  {sp.processes?.name}
                                  {i < Math.min(processes.length, 5) - 1 && ' → '}
                                </span>
                              ))}
                              {processes.length > 5 && (
                                <span className="text-xs text-gray-400">
                                  +{processes.length - 5}更多
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleConfigureStyle(styleNo)}
                              >
                                <Cog className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleSaveAsTemplate(styleNo)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDeleteStyleProcess(styleNo)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：工序模板 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              工序模板
            </CardTitle>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                暂无模板，可从已配置款式保存
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div key={template.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{template.name}</div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setSelectedStyleNo('');
                            setSelectedProcesses(template.processes.map((p: any) => p.process_id));
                            setDialogOpen(true);
                          }}
                        >
                          应用
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {template.processes.length} 个工序
                    </div>
                    {template.description && (
                      <div className="text-xs text-gray-400 mt-1">
                        {template.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 配置工序弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>配置工序</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>款号</Label>
              <Input
                value={selectedStyleNo}
                onChange={(e) => setSelectedStyleNo(e.target.value)}
                placeholder="输入款号，如: ST2024001"
              />
            </div>

            {selectedStyleNo && styleProcesses[selectedStyleNo] && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  该款式已有 {styleProcesses[selectedStyleNo].length} 个工序配置
                </AlertDescription>
              </Alert>
            )}

            {/* 快捷操作 */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCopyDialogOpen(true)}
              >
                <Copy className="h-4 w-4 mr-1" />
                从其他款式复制
              </Button>
              {templates.length > 0 && (
                <Select onValueChange={handleApplyTemplate}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="应用模板" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 工序列表 */}
            <div className="space-y-2">
              <Label>选择工序（按顺序勾选）</Label>
              <div className="border rounded-lg p-3 max-h-80 overflow-y-auto">
                {allProcesses.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    请先在工序管理中添加工序
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allProcesses.map((process) => (
                      <div 
                        key={process.id} 
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedProcesses.includes(process.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProcesses([...selectedProcesses, process.id]);
                              } else {
                                setSelectedProcesses(selectedProcesses.filter(id => id !== process.id));
                              }
                            }}
                          />
                          <span>{process.code} - {process.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {process.category}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          ¥{process.unit_price}/件
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 已选择的工序 */}
            {selectedProcesses.length > 0 && (
              <div className="space-y-2">
                <Label>已选择工序顺序</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg">
                  {selectedProcesses.map((processId, index) => {
                    const process = allProcesses.find(p => p.id === processId);
                    return (
                      <div key={processId} className="flex items-center gap-1">
                        <Badge>{index + 1}. {process?.name}</Badge>
                        {index < selectedProcesses.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSaveProcesses}
              disabled={!selectedStyleNo || selectedProcesses.length === 0}
            >
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 从其他款式复制弹窗 */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              从其他款式复制工序
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                将已有款式的工序配置复制到当前款式
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>目标款式</Label>
              <Input value={selectedStyleNo} disabled />
            </div>

            <div className="space-y-2">
              <Label>源款式（复制自）</Label>
              <Select value={copyFromStyle} onValueChange={setCopyFromStyle}>
                <SelectTrigger>
                  <SelectValue placeholder="选择源款式" />
                </SelectTrigger>
                <SelectContent>
                  {allStyleNos.filter(s => s !== selectedStyleNo).map(styleNo => {
                    const count = styleProcesses[styleNo]?.length || 0;
                    return (
                      <SelectItem key={styleNo} value={styleNo}>
                        {styleNo} ({count}个工序)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {copyFromStyle && styleProcesses[copyFromStyle] && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium mb-1">工序流程：</div>
                  <div className="flex flex-wrap gap-1">
                    {styleProcesses[copyFromStyle].map((sp: StyleProcess, i: number) => (
                      <span key={sp.id}>
                        {sp.processes?.name}
                        {i < styleProcesses[copyFromStyle].length - 1 && ' → '}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleCopyFromStyle}
              disabled={!copyFromStyle}
            >
              <Copy className="h-4 w-4 mr-1" />
              复制
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 保存为模板弹窗 */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              保存为工序模板
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>模板名称</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="如：T恤标准工序"
              />
            </div>

            <div className="space-y-2">
              <Label>描述（可选）</Label>
              <Input
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="模板描述"
              />
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium mb-1">
                {styleProcesses[selectedStyleNo]?.length || 0} 个工序
              </div>
              <div className="flex flex-wrap gap-1 text-xs">
                {styleProcesses[selectedStyleNo]?.map((sp: StyleProcess, i: number) => (
                  <span key={sp.id}>
                    {sp.processes?.name}
                    {i < (styleProcesses[selectedStyleNo]?.length || 0) - 1 && ' → '}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateTemplate}>
              <Save className="h-4 w-4 mr-1" />
              保存模板
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
