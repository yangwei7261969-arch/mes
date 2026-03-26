'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  QrCode,
  Search,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Camera,
} from 'lucide-react';

interface BundleInfo {
  id: string;
  bundle_no: string;
  size: string;
  color: string;
  quantity: number;
  status: string;
  cutting_orders?: {
    order_no: string;
    style_no: string;
    bed_number?: number;
    total_beds?: number;
  };
}

interface ProcessTracking {
  id: string;
  process_name: string;
  status: string;
  quantity: number;
  start_time?: string;
  end_time?: string;
  employee_name?: string;
}

export default function MobileScanPage() {
  const [bundleNo, setBundleNo] = useState('');
  const [bundleInfo, setBundleInfo] = useState<BundleInfo | null>(null);
  const [processes, setProcesses] = useState<ProcessTracking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 从URL参数获取扎号
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bundleNoParam = params.get('bundle_no');
    if (bundleNoParam) {
      setBundleNo(bundleNoParam);
      searchBundle(bundleNoParam);
    }
  }, []);

  const searchBundle = async (searchNo?: string) => {
    const searchValue = searchNo || bundleNo;
    if (!searchValue) return;

    setLoading(true);
    setError('');
    setBundleInfo(null);
    setProcesses([]);

    try {
      // 搜索扎包信息
      const res = await fetch(`/api/cutting-bundles?bundle_no=${searchValue}`);
      const data = await res.json();

      if (data.success && data.data && data.data.length > 0) {
        const bundle = data.data[0];
        setBundleInfo(bundle);

        // 获取工序跟踪信息
        const trackingRes = await fetch(`/api/process-tracking?bundle_id=${bundle.id}`);
        const trackingData = await trackingRes.json();
        if (trackingData.success) {
          setProcesses(trackingData.data || []);
        }
      } else {
        setError('未找到该扎包信息');
      }
    } catch (err) {
      setError('查询失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: '待处理', className: 'bg-gray-100 text-gray-800' },
      in_progress: { label: '进行中', className: 'bg-blue-100 text-blue-800' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-800' },
      outsourced: { label: '外发中', className: 'bg-orange-100 text-orange-800' },
    };
    const { label, className } = config[status] || config.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  const calculateProgress = () => {
    if (processes.length === 0) return 0;
    const completed = processes.filter(p => p.status === 'completed').length;
    return Math.round((completed / processes.length) * 100);
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      {/* 头部 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="h-6 w-6" />
          工票扫描
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          扫描或输入扎号查看详情
        </p>
      </div>

      {/* 搜索栏 */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="输入扎号或扫描二维码"
            value={bundleNo}
            onChange={(e) => setBundleNo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchBundle()}
            className="pl-10"
          />
        </div>
        <Button onClick={() => searchBundle()} disabled={loading}>
          {loading ? '查询中...' : '查询'}
        </Button>
      </div>

      {/* 扫码按钮 */}
      <Button
        variant="outline"
        className="w-full mb-6 h-16 text-lg"
        onClick={() => {
          // 这里可以集成摄像头扫码功能
          alert('扫码功能需要摄像头权限，请在实际设备上使用');
        }}
      >
        <Camera className="h-6 w-6 mr-2" />
        扫描二维码
      </Button>

      {/* 错误提示 */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 扎包信息 */}
      {bundleInfo && (
        <>
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{bundleInfo.bundle_no}</CardTitle>
                {getStatusBadge(bundleInfo.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">单号：</span>
                  <span className="font-medium">{bundleInfo.cutting_orders?.order_no || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">款号：</span>
                  <span className="font-medium">{bundleInfo.cutting_orders?.style_no || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">颜色：</span>
                  <span>{bundleInfo.color}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">尺码：</span>
                  <span className="font-bold">{bundleInfo.size}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">数量：</span>
                  <span className="font-bold text-lg">{bundleInfo.quantity}</span>
                  <span className="text-muted-foreground ml-1">件</span>
                </div>
                {bundleInfo.cutting_orders?.bed_number && (
                  <div>
                    <span className="text-muted-foreground">床次：</span>
                    <span className="font-medium">
                      {bundleInfo.cutting_orders.bed_number}/{bundleInfo.cutting_orders.total_beds || '?'}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 进度条 */}
          {processes.length > 0 && (
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">生产进度</span>
                  <span className="text-sm font-bold">{calculateProgress()}%</span>
                </div>
                <Progress value={calculateProgress()} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>
                    已完成 {processes.filter(p => p.status === 'completed').length} 工序
                  </span>
                  <span>
                    共 {processes.length} 工序
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 工序列表 */}
          {processes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">工序详情</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {processes.map((process, index) => (
                    <div
                      key={process.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        process.status === 'completed' 
                          ? 'bg-green-100' 
                          : process.status === 'in_progress' 
                            ? 'bg-blue-100' 
                            : 'bg-gray-100'
                      }`}>
                        {process.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : process.status === 'in_progress' ? (
                          <Clock className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Package className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{process.process_name}</span>
                          {getStatusBadge(process.status)}
                        </div>
                        {process.employee_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            操作员: {process.employee_name}
                          </p>
                        )}
                        {process.start_time && (
                          <p className="text-xs text-muted-foreground">
                            开始: {new Date(process.start_time).toLocaleString('zh-CN')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* 底部导航 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="grid grid-cols-4 gap-1 p-2">
          <a
            href="/production-dashboard"
            className="flex flex-col items-center p-2 rounded hover:bg-muted"
          >
            <Package className="h-5 w-5" />
            <span className="text-xs mt-1">看板</span>
          </a>
          <a
            href="/cutting-bundles"
            className="flex flex-col items-center p-2 rounded hover:bg-muted"
          >
            <QrCode className="h-5 w-5" />
            <span className="text-xs mt-1">分扎</span>
          </a>
          <a
            href="/mobile-scan"
            className="flex flex-col items-center p-2 rounded bg-primary text-primary-foreground"
          >
            <Camera className="h-5 w-5" />
            <span className="text-xs mt-1">扫码</span>
          </a>
          <a
            href="/outsource-tracking"
            className="flex flex-col items-center p-2 rounded hover:bg-muted"
          >
            <Clock className="h-5 w-5" />
            <span className="text-xs mt-1">外发</span>
          </a>
        </div>
      </div>
    </div>
  );
}
