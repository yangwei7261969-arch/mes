'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRCodeSVG } from 'qrcode.react';
import {
  Scan,
  Ticket,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Package,
  Play,
  Pause,
  RefreshCw,
  Printer,
  Camera,
} from 'lucide-react';

interface WorkTicket {
  id: string;
  ticket_no: string;
  bundle_no: string;
  style_no: string;
  size: string;
  color: string;
  quantity: number;
  process: string;
  worker_id: string;
  worker_name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'defective';
  start_time: string | null;
  end_time: string | null;
  completed_qty: number;
  defective_qty: number;
}

interface ProcessStep {
  id: string;
  name: string;
  sequence: number;
  unit_price: number;
}

// 模拟工序列表
const PROCESS_STEPS: ProcessStep[] = [
  { id: '1', name: '裁床', sequence: 1, unit_price: 0.5 },
  { id: '2', name: '平车', sequence: 2, unit_price: 1.2 },
  { id: '3', name: '双针', sequence: 3, unit_price: 0.8 },
  { id: '4', name: '套结', sequence: 4, unit_price: 0.6 },
  { id: '5', name: '整烫', sequence: 5, unit_price: 0.4 },
  { id: '6', name: '质检', sequence: 6, unit_price: 0.3 },
  { id: '7', name: '包装', sequence: 7, unit_price: 0.2 },
];

export default function WorkTicketPage() {
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const [scanMode, setScanMode] = useState<'start' | 'complete'>('start');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 工票数据
  const [tickets, setTickets] = useState<WorkTicket[]>([]);
  const [currentTicket, setCurrentTicket] = useState<WorkTicket | null>(null);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  
  // 生成工票
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    bundle_no: '',
    style_no: '',
    size: '',
    color: '',
    quantity: 100,
    processes: [] as string[],
  });

  // 今日统计
  const [todayStats, setTodayStats] = useState({
    totalScans: 0,
    completed: 0,
    inProgress: 0,
    defectives: 0,
  });

  useEffect(() => {
    fetchTickets();
    // 自动聚焦到扫描输入框
    inputRef.current?.focus();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // 模拟数据
      const mockTickets: WorkTicket[] = [
        {
          id: '1',
          ticket_no: 'TK-2024-001-01',
          bundle_no: 'B-001',
          style_no: 'STYLE-A',
          size: 'M',
          color: '黑色',
          quantity: 50,
          process: '平车',
          worker_id: 'W001',
          worker_name: '张三',
          status: 'completed',
          start_time: '08:00',
          end_time: '10:30',
          completed_qty: 50,
          defective_qty: 1,
        },
        {
          id: '2',
          ticket_no: 'TK-2024-001-02',
          bundle_no: 'B-002',
          style_no: 'STYLE-A',
          size: 'L',
          color: '黑色',
          quantity: 50,
          process: '双针',
          worker_id: 'W002',
          worker_name: '李四',
          status: 'in_progress',
          start_time: '09:15',
          end_time: null,
          completed_qty: 32,
          defective_qty: 0,
        },
      ];
      setTickets(mockTickets);
      
      setTodayStats({
        totalScans: mockTickets.length,
        completed: mockTickets.filter(t => t.status === 'completed').length,
        inProgress: mockTickets.filter(t => t.status === 'in_progress').length,
        defectives: mockTickets.reduce((sum, t) => sum + t.defective_qty, 0),
      });
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  // 扫描处理
  const handleScan = (value: string) => {
    if (!value.trim()) return;
    
    // 模拟扫描逻辑
    const ticket = tickets.find(t => t.ticket_no === value.trim());
    
    if (ticket) {
      setCurrentTicket(ticket);
      setScanDialogOpen(true);
    } else {
      // 新工票
      alert(`工票 ${value} 未找到`);
    }
    
    setScanInput('');
    inputRef.current?.focus();
  };

  // 开始工序
  const handleStartProcess = () => {
    if (!currentTicket) return;
    
    setTickets(prev => prev.map(t => 
      t.id === currentTicket.id 
        ? { ...t, status: 'in_progress', start_time: new Date().toLocaleTimeString() }
        : t
    ));
    
    setScanDialogOpen(false);
    setCurrentTicket(null);
    alert('工序已开始');
  };

  // 完成工序
  const handleCompleteProcess = (defectiveQty: number = 0) => {
    if (!currentTicket) return;
    
    setTickets(prev => prev.map(t => 
      t.id === currentTicket.id 
        ? { 
            ...t, 
            status: defectiveQty > 0 ? 'defective' : 'completed', 
            end_time: new Date().toLocaleTimeString(),
            completed_qty: t.quantity - defectiveQty,
            defective_qty: defectiveQty,
          }
        : t
    ));
    
    setScanDialogOpen(false);
    setCurrentTicket(null);
    alert('工序已完成');
  };

  // 生成工票
  const handleGenerateTickets = () => {
    if (!generateForm.bundle_no || !generateForm.style_no || generateForm.processes.length === 0) {
      alert('请填写完整信息');
      return;
    }

    const newTickets: WorkTicket[] = generateForm.processes.map((processId, index) => {
      const process = PROCESS_STEPS.find(p => p.id === processId);
      return {
        id: `${Date.now()}-${index}`,
        ticket_no: `TK-${generateForm.bundle_no}-${processId}`,
        bundle_no: generateForm.bundle_no,
        style_no: generateForm.style_no,
        size: generateForm.size,
        color: generateForm.color,
        quantity: generateForm.quantity,
        process: process?.name || '',
        worker_id: '',
        worker_name: '',
        status: 'pending',
        start_time: null,
        end_time: null,
        completed_qty: 0,
        defective_qty: 0,
      };
    });

    setTickets(prev => [...newTickets, ...prev]);
    setGenerateDialogOpen(false);
    setGenerateForm({
      bundle_no: '',
      style_no: '',
      size: '',
      color: '',
      quantity: 100,
      processes: [],
    });
    alert(`成功生成 ${newTickets.length} 张工票`);
  };

  // 打印工票
  const handlePrintTicket = (ticket: WorkTicket) => {
    // 创建打印窗口
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrValue = JSON.stringify({
      ticket_no: ticket.ticket_no,
      bundle_no: ticket.bundle_no,
      process: ticket.process,
      quantity: ticket.quantity,
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>工票打印 - ${ticket.ticket_no}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .ticket { border: 2px solid #000; padding: 15px; width: 300px; margin: 0 auto; }
          .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
          .info { margin-bottom: 5px; font-size: 14px; }
          .qr-code { text-align: center; margin: 15px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          td { border: 1px solid #000; padding: 5px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">生产工票</div>
          <div class="info">工票号: ${ticket.ticket_no}</div>
          <div class="info">扎号: ${ticket.bundle_no}</div>
          <div class="info">款号: ${ticket.style_no}</div>
          <div class="info">工序: ${ticket.process}</div>
          <table>
            <tr><td>颜色</td><td>${ticket.color}</td></tr>
            <tr><td>尺码</td><td>${ticket.size}</td></tr>
            <tr><td>数量</td><td>${ticket.quantity}</td></tr>
          </table>
          <div class="qr-code" id="qrcode"></div>
          <div class="info" style="text-align: center; font-size: 12px;">
            扫码开始/结束工序
          </div>
        </div>
        <script>
          // QR Code placeholder
          document.getElementById('qrcode').innerHTML = '<div style="width:100px;height:100px;border:1px solid #000;display:flex;align-items:center;justify-content:center;font-size:10px;">QR Code</div>';
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: '待处理', className: 'bg-gray-100 text-gray-800' },
      in_progress: { label: '进行中', className: 'bg-blue-100 text-blue-800' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-800' },
      defective: { label: '有不良', className: 'bg-red-100 text-red-800' },
    };
    return config[status] || config.pending;
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">条码工票系统</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setScanDialogOpen(true)}>
            <Camera className="h-4 w-4 mr-2" />
            扫码报工
          </Button>
          <Button onClick={() => setGenerateDialogOpen(true)}>
            <Ticket className="h-4 w-4 mr-2" />
            生成工票
          </Button>
        </div>
      </div>

      {/* 扫描输入区 - 悬浮固定 */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="scan-input" className="text-base font-medium">
                扫描工票条码
              </Label>
              <Input
                id="scan-input"
                ref={inputRef}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleScan(scanInput);
                  }
                }}
                placeholder="扫描或输入工票号..."
                className="mt-2 text-lg h-12"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={scanMode === 'start' ? 'default' : 'outline'}
                onClick={() => setScanMode('start')}
              >
                <Play className="h-4 w-4 mr-2" />
                开始工序
              </Button>
              <Button
                variant={scanMode === 'complete' ? 'default' : 'outline'}
                onClick={() => setScanMode('complete')}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                完成工序
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 今日统计 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">扫描次数</p>
                <p className="text-2xl font-bold">{todayStats.totalScans}</p>
              </div>
              <Scan className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">进行中</p>
                <p className="text-2xl font-bold text-blue-600">{todayStats.inProgress}</p>
              </div>
              <Play className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已完成</p>
                <p className="text-2xl font-bold text-green-600">{todayStats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">不良品</p>
                <p className="text-2xl font-bold text-red-600">{todayStats.defectives}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 工票列表 */}
      <Card>
        <CardHeader>
          <CardTitle>工票列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>工票号</TableHead>
                <TableHead>扎号</TableHead>
                <TableHead>款号</TableHead>
                <TableHead>工序</TableHead>
                <TableHead>数量</TableHead>
                <TableHead>工人</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>结束时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => {
                const statusConfig = getStatusBadge(ticket.status);
                return (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono">{ticket.ticket_no}</TableCell>
                    <TableCell>{ticket.bundle_no}</TableCell>
                    <TableCell>{ticket.style_no}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ticket.process}</Badge>
                    </TableCell>
                    <TableCell>{ticket.quantity}</TableCell>
                    <TableCell>{ticket.worker_name || '-'}</TableCell>
                    <TableCell>
                      <Badge className={statusConfig.className}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{ticket.start_time || '-'}</TableCell>
                    <TableCell>{ticket.end_time || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePrintTicket(ticket)}
                        >
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

      {/* 扫码报工对话框 */}
      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>扫码报工</DialogTitle>
          </DialogHeader>
          
          {currentTicket ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>工票号: <span className="font-medium">{currentTicket.ticket_no}</span></div>
                  <div>扎号: <span className="font-medium">{currentTicket.bundle_no}</span></div>
                  <div>工序: <span className="font-medium">{currentTicket.process}</span></div>
                  <div>数量: <span className="font-medium">{currentTicket.quantity}</span></div>
                </div>
              </div>
              
              {currentTicket.status === 'pending' && (
                <Button className="w-full" onClick={handleStartProcess}>
                  <Play className="h-4 w-4 mr-2" />
                  开始工序
                </Button>
              )}
              
              {currentTicket.status === 'in_progress' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>不良品数量</Label>
                    <Input type="number" min="0" defaultValue={0} id="defective-input" />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      const defectiveInput = document.getElementById('defective-input') as HTMLInputElement;
                      handleCompleteProcess(parseInt(defectiveInput?.value || '0'));
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    完成工序
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Scan className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">请扫描工票条码</p>
              </div>
              <Input
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleScan(scanInput);
                  }
                }}
                placeholder="扫描或输入工票号..."
                className="text-lg"
                autoFocus
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 生成工票对话框 */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>生成工票</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>扎号 *</Label>
                <Input
                  value={generateForm.bundle_no}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, bundle_no: e.target.value }))}
                  placeholder="如: B-001"
                />
              </div>
              <div className="space-y-2">
                <Label>款号 *</Label>
                <Input
                  value={generateForm.style_no}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, style_no: e.target.value }))}
                  placeholder="如: STYLE-A"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>颜色</Label>
                <Input
                  value={generateForm.color}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="黑色"
                />
              </div>
              <div className="space-y-2">
                <Label>尺码</Label>
                <Input
                  value={generateForm.size}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, size: e.target.value }))}
                  placeholder="M"
                />
              </div>
              <div className="space-y-2">
                <Label>数量</Label>
                <Input
                  type="number"
                  value={generateForm.quantity}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>选择工序 *</Label>
              <div className="grid grid-cols-4 gap-2">
                {PROCESS_STEPS.map((process) => (
                  <Button
                    key={process.id}
                    variant={generateForm.processes.includes(process.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setGenerateForm(prev => ({
                        ...prev,
                        processes: prev.processes.includes(process.id)
                          ? prev.processes.filter(p => p !== process.id)
                          : [...prev.processes, process.id],
                      }));
                    }}
                  >
                    {process.name}
                    <span className="ml-1 text-xs opacity-70">¥{process.unit_price}</span>
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                已选择 {generateForm.processes.length} 道工序，将生成 {generateForm.processes.length} 张工票
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleGenerateTickets}>
              <Ticket className="h-4 w-4 mr-2" />
              生成工票
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
