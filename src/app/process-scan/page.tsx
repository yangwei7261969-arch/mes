'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  QrCode, 
  Camera, 
  CheckCircle, 
  Clock, 
  User,
  Package,
  AlertCircle,
  Play,
  RotateCcw
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  employee_no: string;
  department: string;
}

interface Process {
  id: string;
  name: string;
  code: string;
  category: string;
  unit_price: number;
}

interface BundleInfo {
  id: string;
  bundle_no: string;
  size: string;
  color: string;
  quantity: number;
  status: string;
  cutting_orders: {
    style_no: string;
    color: string;
  };
}

interface TrackingRecord {
  id: string;
  bundle_id: string;
  process_id: string;
  worker_id: string;
  quantity: number;
  wage: number;
  status: string;
  created_at: string;
  processes?: Process;
  employees?: Employee;
  cutting_bundles?: BundleInfo;
}

export default function ProcessScanPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [selectedProcess, setSelectedProcess] = useState<string>('');
  const [qrCode, setQrCode] = useState('');
  const [bundleInfo, setBundleInfo] = useState<BundleInfo | null>(null);
  const [recentRecords, setRecentRecords] = useState<TrackingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState<'manual' | 'camera'>('manual');
  const [todayStats, setTodayStats] = useState({
    totalQuantity: 0,
    totalWage: 0,
    recordCount: 0,
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetchEmployees();
    fetchProcesses();
    fetchTodayStats();
    
    // 聚焦到输入框
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (selectedWorker) {
      fetchRecentRecords();
    }
  }, [selectedWorker]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchProcesses = async () => {
    try {
      const res = await fetch('/api/processes');
      const data = await res.json();
      if (data.success) {
        setProcesses(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch processes:', error);
    }
  };

  const fetchRecentRecords = async () => {
    try {
      const res = await fetch(`/api/process-tracking?worker_id=${selectedWorker}&pageSize=10`);
      const data = await res.json();
      if (data.success) {
        setRecentRecords(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch recent records:', error);
    }
  };

  const fetchTodayStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const res = await fetch(`/api/process-tracking?start_date=${today}&end_date=${today}`);
      const data = await res.json();
      if (data.success) {
        const records = data.data;
        setTodayStats({
          totalQuantity: records.reduce((sum: number, r: TrackingRecord) => sum + r.quantity, 0),
          totalWage: records.reduce((sum: number, r: TrackingRecord) => sum + r.wage, 0),
          recordCount: records.length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch today stats:', error);
    }
  };

  const handleScanBundle = async () => {
    if (!qrCode.trim()) {
      alert('请输入或扫描二维码');
      return;
    }

    setLoading(true);
    try {
      // 查找分扎信息
      const res = await fetch(`/api/cutting-bundles?bundle_no=${qrCode}`);
      const data = await res.json();
      
      if (data.success && data.data.length > 0) {
        setBundleInfo(data.data[0]);
      } else {
        alert('未找到对应的分扎信息');
        setBundleInfo(null);
      }
    } catch (error) {
      alert('查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterProcess = async () => {
    if (!bundleInfo) {
      alert('请先扫描分扎二维码');
      return;
    }
    if (!selectedWorker) {
      alert('请选择员工');
      return;
    }
    if (!selectedProcess) {
      alert('请选择工序');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/process-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_code: qrCode,
          process_id: selectedProcess,
          worker_id: selectedWorker,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        
        // 重置并刷新
        setQrCode('');
        setBundleInfo(null);
        setSelectedProcess('');
        fetchRecentRecords();
        fetchTodayStats();
        inputRef.current?.focus();
      } else {
        alert(data.error || '登记失败');
      }
    } catch (error) {
      alert('登记失败');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanMode('camera');
    } catch (error) {
      alert('无法访问摄像头，请使用手动输入');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanMode('manual');
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: '待处理', className: 'bg-gray-100 text-gray-800' },
      in_progress: { label: '生产中', className: 'bg-blue-100 text-blue-800' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-800' },
    };
    const { label, className } = config[status] || config.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  const selectedWorkerInfo = employees.find(e => e.id === selectedWorker);
  const selectedProcessInfo = processes.find(p => p.id === selectedProcess);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <QrCode className="h-8 w-8" />
            工序扫码登记
          </h1>
          <p className="text-gray-500 mt-1">扫描扎票二维码，登记工序完成</p>
        </div>
      </div>

      {/* 今日统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{todayStats.totalQuantity}</div>
                <div className="text-sm text-gray-500">今日完成数量</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{todayStats.recordCount}</div>
                <div className="text-sm text-gray-500">今日登记次数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">¥{todayStats.totalWage.toFixed(2)}</div>
                <div className="text-sm text-gray-500">今日工资</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 扫码登记区 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                选择员工
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                <SelectTrigger>
                  <SelectValue placeholder="选择员工" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.employee_no} - {emp.name} ({emp.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedWorkerInfo && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                  <div><strong>员工：</strong>{selectedWorkerInfo.name}</div>
                  <div><strong>工号：</strong>{selectedWorkerInfo.employee_no}</div>
                  <div><strong>部门：</strong>{selectedWorkerInfo.department}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                扫描二维码
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scanMode === 'manual' ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      placeholder="输入或扫描扎票编号..."
                      value={qrCode}
                      onChange={(e) => setQrCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleScanBundle()}
                      className="flex-1 font-mono"
                    />
                    <Button onClick={handleScanBundle} disabled={loading}>
                      查询
                    </Button>
                  </div>
                  <Button onClick={startCamera} variant="outline" className="w-full">
                    <Camera className="h-4 w-4 mr-2" />
                    使用摄像头扫描
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-4 border-blue-500 m-8 rounded-lg pointer-events-none" />
                  </div>
                  <Button onClick={stopCamera} variant="outline" className="w-full">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    切换手动输入
                  </Button>
                </div>
              )}

              {bundleInfo && (
                <div className="mt-4 p-4 border-2 border-green-200 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">已识别分扎</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>扎号：</strong>{bundleInfo.bundle_no}</div>
                    <div><strong>款号：</strong>{bundleInfo.cutting_orders?.style_no}</div>
                    <div><strong>颜色：</strong>{bundleInfo.color}</div>
                    <div><strong>尺码：</strong>{bundleInfo.size}</div>
                    <div><strong>数量：</strong>{bundleInfo.quantity} 件</div>
                    <div><strong>状态：</strong>{getStatusBadge(bundleInfo.status)}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                选择工序
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedProcess} onValueChange={setSelectedProcess}>
                <SelectTrigger>
                  <SelectValue placeholder="选择工序" />
                </SelectTrigger>
                <SelectContent>
                  {processes.map(proc => (
                    <SelectItem key={proc.id} value={proc.id}>
                      {proc.code} - {proc.name} (¥{proc.unit_price}/件)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedProcessInfo && bundleInfo && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-orange-50 rounded-lg text-sm">
                    <div><strong>工序：</strong>{selectedProcessInfo.name}</div>
                    <div><strong>单价：</strong>¥{selectedProcessInfo.unit_price}/件</div>
                    <div><strong>预计工资：</strong>¥{(bundleInfo.quantity * selectedProcessInfo.unit_price).toFixed(2)}</div>
                  </div>
                  
                  <Button 
                    onClick={handleRegisterProcess} 
                    disabled={loading || !bundleInfo}
                    className="w-full"
                    size="lg"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    确认登记
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 最近记录 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              最近登记记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无记录
              </div>
            ) : (
              <div className="space-y-3">
                {recentRecords.map((record) => (
                  <div key={record.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">
                        {record.cutting_bundles?.bundle_no}
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        ¥{record.wage.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        工序: {record.processes?.name || '-'} 
                        <span className="text-gray-400 ml-2">×{record.quantity}件</span>
                      </div>
                      <div className="text-gray-400 text-xs">
                        {new Date(record.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
