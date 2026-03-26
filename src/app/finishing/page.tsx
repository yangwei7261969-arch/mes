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
import {
  Scissors,
  CheckCircle,
  Package,
  AlertCircle,
  Clock,
  User,
  FileCheck,
} from 'lucide-react';

interface FinishingTask {
  id: string;
  order_no: string;
  style_no: string;
  style_name: string;
  color: string;
  size: string;
  quantity: number;
  completed_quantity: number;
  status: string;
  plan_end_date: string;
  current_stage: string;
  worker_name: string;
}

const stageMap: Record<string, { label: string; next: string }> = {
  ironing: { label: '熨烫', next: 'quality_check' },
  quality_check: { label: '质检', next: 'packaging' },
  packaging: { label: '包装', next: 'completed' },
  completed: { label: '已完成', next: '' },
};

export default function FinishingPage() {
  const [tasks, setTasks] = useState<FinishingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<FinishingTask | null>(null);
  
  // 完工表单
  const [completeForm, setCompleteForm] = useState({
    quantity: 0,
    defective_qty: 0,
    notes: '',
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // 获取生产中的订单作为尾部任务
      const response = await fetch('/api/production-orders?status=in_production');
      const result = await response.json();
      if (result.success) {
        // 模拟添加尾部阶段信息
        const finishingTasks = result.data.map((o: any) => ({
          ...o,
          current_stage: o.current_stage || 'ironing',
          worker_name: o.worker_name || '待分配',
        }));
        setTasks(finishingTasks);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (task: FinishingTask) => {
    setSelectedTask(task);
    setCompleteForm({
      quantity: task.quantity - task.completed_quantity,
      defective_qty: 0,
      notes: '',
    });
    setDialogOpen(true);
  };

  const handleCompleteStage = async () => {
    if (!selectedTask) return;

    try {
      const nextStage = stageMap[selectedTask.current_stage]?.next;
      const isFullyCompleted = nextStage === 'completed';

      // 更新订单状态
      const updateData: any = {
        id: selectedTask.id,
        completed_quantity: selectedTask.completed_quantity + completeForm.quantity,
      };

      if (isFullyCompleted) {
        updateData.status = 'completed';
        updateData.actual_end_date = new Date().toISOString().split('T')[0];
      }

      const response = await fetch('/api/production-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      if (result.success) {
        setDialogOpen(false);
        fetchOrders();
        alert(isFullyCompleted ? '尾部处理完成！' : '阶段完成！');
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const fetchOrders = () => {
    fetchTasks();
  };

  // 统计
  const ironingCount = tasks.filter(t => t.current_stage === 'ironing').length;
  const qcCount = tasks.filter(t => t.current_stage === 'quality_check').length;
  const packagingCount = tasks.filter(t => t.current_stage === 'packaging').length;

  const statusMap: Record<string, { label: string; color: string }> = {
    ironing: { label: '熨烫', color: 'bg-orange-100 text-orange-800' },
    quality_check: { label: '质检', color: 'bg-purple-100 text-purple-800' },
    packaging: { label: '包装', color: 'bg-blue-100 text-blue-800' },
    completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Scissors className="h-8 w-8" />
            尾部处理
          </h1>
          <p className="text-gray-500 mt-1">熨烫、质检、包装等尾部工序管理</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">待熨烫</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{ironingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">待质检</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{qcCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">待包装</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{packagingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">今日任务</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* 尾部流程说明 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-lg">
              <div className="h-6 w-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs">1</div>
              <span className="font-medium">熨烫</span>
            </div>
            <div className="h-px w-8 bg-gray-300" />
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg">
              <div className="h-6 w-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">2</div>
              <span className="font-medium">质检</span>
            </div>
            <div className="h-px w-8 bg-gray-300" />
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
              <div className="h-6 w-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">3</div>
              <span className="font-medium">包装</span>
            </div>
            <div className="h-px w-8 bg-gray-300" />
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
              <div className="h-6 w-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">✓</div>
              <span className="font-medium">完成</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            尾部任务列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无尾部任务</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>生产单号</TableHead>
                  <TableHead>款号</TableHead>
                  <TableHead>款式名称</TableHead>
                  <TableHead>颜色/尺码</TableHead>
                  <TableHead>总数</TableHead>
                  <TableHead>已完成</TableHead>
                  <TableHead>当前阶段</TableHead>
                  <TableHead>交期</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-mono">{task.order_no}</TableCell>
                    <TableCell className="font-bold">{task.style_no}</TableCell>
                    <TableCell>{task.style_name}</TableCell>
                    <TableCell>{task.color}/{task.size}</TableCell>
                    <TableCell>{task.quantity}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{task.completed_quantity}</span>
                        <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${(task.completed_quantity / task.quantity) * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusMap[task.current_stage]?.color}>
                        {stageMap[task.current_stage]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{task.plan_end_date}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm"
                        onClick={() => handleOpenDialog(task)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        完成
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 完成弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              完成阶段
            </DialogTitle>
          </DialogHeader>

          {selectedTask && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">当前阶段：</span>
                  <Badge className={statusMap[selectedTask.current_stage]?.color}>
                    {stageMap[selectedTask.current_stage]?.label}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">下一阶段：</span>
                  <span>{stageMap[selectedTask.current_stage]?.next ? stageMap[stageMap[selectedTask.current_stage]?.next]?.label : '完成'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>完成数量</Label>
              <Input
                type="number"
                value={completeForm.quantity}
                onChange={(e) => setCompleteForm({ ...completeForm, quantity: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>次品数量</Label>
              <Input
                type="number"
                value={completeForm.defective_qty}
                onChange={(e) => setCompleteForm({ ...completeForm, defective_qty: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>备注</Label>
              <Input
                value={completeForm.notes}
                onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                placeholder="备注信息"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCompleteStage}>
              <CheckCircle className="h-4 w-4 mr-1" />
              确认完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
