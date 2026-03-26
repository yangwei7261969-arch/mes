'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Scan, 
  ClipboardList, 
  AlertTriangle, 
  BarChart3,
  User,
  Bell,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Camera
} from 'lucide-react';

export default function MobileApp() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [todayStats, setTodayStats] = useState({
    completed: 0,
    inProgress: 0,
    efficiency: 0
  });

  useEffect(() => {
    // 获取当前用户信息
    fetchCurrentUser();
    // 获取今日统计
    fetchTodayStats();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/kpi/daily?date=${today}`);
      const data = await res.json();
      if (data.success) {
        setTodayStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部状态栏 */}
      <header className="sticky top-0 z-50 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{currentUser?.name || '加载中...'}</p>
              <p className="text-xs text-muted-foreground">{currentUser?.role || ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">3</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="px-4 py-4">
        {activeTab === 'home' && (
          <HomePage stats={todayStats} onNavigate={setActiveTab} />
        )}
        {activeTab === 'scan' && (
          <ScanPage />
        )}
        {activeTab === 'tasks' && (
          <TasksPage />
        )}
        {activeTab === 'alerts' && (
          <AlertsPage />
        )}
        {activeTab === 'profile' && (
          <ProfilePage user={currentUser} />
        )}
      </main>

      {/* 底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50">
        <div className="flex justify-around py-2">
          <TabItem 
            icon={<BarChart3 className="w-5 h-5" />} 
            label="首页" 
            active={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
          />
          <TabItem 
            icon={<Scan className="w-5 h-5" />} 
            label="扫码" 
            active={activeTab === 'scan'}
            onClick={() => setActiveTab('scan')}
          />
          <TabItem 
            icon={<ClipboardList className="w-5 h-5" />} 
            label="任务" 
            active={activeTab === 'tasks'}
            onClick={() => setActiveTab('tasks')}
          />
          <TabItem 
            icon={<AlertTriangle className="w-5 h-5" />} 
            label="预警" 
            active={activeTab === 'alerts'}
            onClick={() => setActiveTab('alerts')}
          />
          <TabItem 
            icon={<User className="w-5 h-5" />} 
            label="我的" 
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
          />
        </div>
      </nav>
    </div>
  );
}

// 底部导航项
function TabItem({ icon, label, active, onClick }: { 
  icon: React.ReactNode; 
  label: string; 
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-1 ${
        active ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
}

// 首页
function HomePage({ stats, onNavigate }: { stats: any; onNavigate: (tab: string) => void }) {
  return (
    <div className="space-y-4">
      {/* 今日统计卡片 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">今日工作概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <StatItem label="已完成" value={stats.completed} unit="件" />
            <StatItem label="进行中" value={stats.inProgress} unit="件" />
            <StatItem label="效率" value={stats.efficiency} unit="%" />
          </div>
        </CardContent>
      </Card>

      {/* 快捷操作 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">快捷操作</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-3">
          <QuickAction 
            icon={<Scan className="w-6 h-6" />} 
            label="扫码报工" 
            onClick={() => onNavigate('scan')}
          />
          <QuickAction 
            icon={<Play className="w-6 h-6" />} 
            label="开始工序" 
            onClick={() => {}}
          />
          <QuickAction 
            icon={<Pause className="w-6 h-6" />} 
            label="暂停" 
            onClick={() => {}}
          />
          <QuickAction 
            icon={<AlertTriangle className="w-6 h-6" />} 
            label="上报异常" 
            onClick={() => onNavigate('alerts')}
          />
        </CardContent>
      </Card>

      {/* 待处理任务 */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">待处理任务</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigate('tasks')}>
            查看全部 <ChevronRight className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <TaskItem 
            title="订单 #2024001 - 裁剪"
            desc="数量: 100件 | 工序: 裁剪"
            status="pending"
            urgent
          />
          <TaskItem 
            title="订单 #2024002 - 缝制"
            desc="数量: 50件 | 工序: 缝制"
            status="in_progress"
          />
        </CardContent>
      </Card>

      {/* 预警提醒 */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">预警提醒</CardTitle>
          <Badge variant="destructive">3条</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          <AlertItem 
            title="订单延期风险"
            desc="订单#2024003距交期仅剩2天"
            level="delay"
          />
          <AlertItem 
            title="质量异常"
            desc="产线A缝制工序返工率偏高"
            level="risk"
          />
        </CardContent>
      </Card>
    </div>
  );
}

// 统计项
function StatItem({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs text-muted-foreground">{label}{unit}</p>
    </div>
  );
}

// 快捷操作项
function QuickAction({ icon, label, onClick }: { 
  icon: React.ReactNode; 
  label: string;
  onClick: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50 active:bg-muted"
    >
      <div className="text-primary">{icon}</div>
      <span className="text-xs">{label}</span>
    </button>
  );
}

// 任务项
function TaskItem({ title, desc, status, urgent }: { 
  title: string; 
  desc: string; 
  status: string;
  urgent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${
          status === 'completed' ? 'bg-green-500' :
          status === 'in_progress' ? 'bg-blue-500' :
          'bg-yellow-500'
        }`} />
        <div>
          <p className="text-sm font-medium flex items-center gap-2">
            {title}
            {urgent && <Badge variant="destructive" className="text-[10px]">紧急</Badge>}
          </p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

// 预警项
function AlertItem({ title, desc, level }: { 
  title: string; 
  desc: string; 
  level: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
      <div className={`w-2 h-2 mt-1.5 rounded-full ${
        level === 'delay' ? 'bg-red-500' :
        level === 'risk' ? 'bg-yellow-500' :
        'bg-green-500'
      }`} />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

// 扫码页面
function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [manualCode, setManualCode] = useState('');

  const handleScan = async (code: string) => {
    try {
      const res = await fetch('/api/scan-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: code })
      });
      const data = await res.json();
      setScanResult(data);
      setScanning(false);
    } catch (error) {
      console.error('Scan error:', error);
    }
  };

  const startScanning = () => {
    setScanning(true);
    setScanResult(null);
    // 实际项目中这里会调用摄像头扫码
    // 模拟扫码
    setTimeout(() => {
      handleScan('BC2024001001');
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">扫码报工</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 扫码区域 */}
          <div className="aspect-square bg-black/5 rounded-lg flex items-center justify-center">
            {scanning ? (
              <div className="text-center">
                <Camera className="w-12 h-12 mx-auto text-primary animate-pulse" />
                <p className="text-sm text-muted-foreground mt-2">正在扫描...</p>
              </div>
            ) : (
              <Button onClick={startScanning} className="gap-2">
                <Scan className="w-4 h-4" />
                开始扫码
              </Button>
            )}
          </div>

          {/* 手动输入 */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">或手动输入条码</p>
            <div className="flex gap-2">
              <Input 
                placeholder="输入条码编号"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              <Button onClick={() => handleScan(manualCode)}>查询</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 扫码结果 */}
      {scanResult && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">扫码结果</CardTitle>
              <Badge variant={scanResult.valid ? 'default' : 'destructive'}>
                {scanResult.valid ? '有效' : '无效'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {scanResult.valid ? (
              <>
                <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                  <p className="text-sm"><span className="text-muted-foreground">订单：</span>{scanResult.data?.orderCode}</p>
                  <p className="text-sm"><span className="text-muted-foreground">工序：</span>{scanResult.data?.processName}</p>
                  <p className="text-sm"><span className="text-muted-foreground">数量：</span>{scanResult.data?.quantity}件</p>
                  <p className="text-sm"><span className="text-muted-foreground">员工：</span>{scanResult.data?.employeeName}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="w-full">开始加工</Button>
                  <Button className="w-full">完成报工</Button>
                </div>
              </>
            ) : (
              <div className="p-3 bg-red-50 rounded-lg text-red-600 text-sm">
                {scanResult.error}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 最近记录 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">最近扫码记录</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm">BC2024000999</p>
                <p className="text-xs text-muted-foreground">10:30 完成</p>
              </div>
            </div>
            <span className="text-sm">50件</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm">BC2024000998</p>
                <p className="text-xs text-muted-foreground">09:15 完成</p>
              </div>
            </div>
            <span className="text-sm">100件</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 任务页面
function TasksPage() {
  const [filter, setFilter] = useState('all');

  return (
    <div className="space-y-4">
      {/* 筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'pending', 'in_progress', 'completed'].map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '全部' : f === 'pending' ? '待处理' : f === 'in_progress' ? '进行中' : '已完成'}
          </Button>
        ))}
      </div>

      {/* 任务列表 */}
      <div className="space-y-3">
        <Card className="overflow-hidden">
          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">订单 #2024001 - 裁剪工序</p>
                <p className="text-sm text-muted-foreground">客户：ABC服饰 | 数量：100件</p>
              </div>
              <Badge>待处理</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                预计：2小时
              </span>
              <span>交期：3天后</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline">查看详情</Button>
              <Button size="sm">开始加工</Button>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">订单 #2024002 - 缝制工序</p>
                <p className="text-sm text-muted-foreground">客户：XYZ贸易 | 数量：50件</p>
              </div>
              <Badge variant="secondary">进行中</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                已进行：1.5小时
              </span>
              <span>进度：60%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '60%' }} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline">暂停</Button>
              <Button size="sm">完成报工</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// 预警页面
function AlertsPage() {
  return (
    <div className="space-y-4">
      {/* 预警统计 */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-red-500">1</p>
          <p className="text-xs text-muted-foreground">延期</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-yellow-500">2</p>
          <p className="text-xs text-muted-foreground">风险</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-green-500">5</p>
          <p className="text-xs text-muted-foreground">正常</p>
        </Card>
      </div>

      {/* 预警列表 */}
      <div className="space-y-3">
        <Card className="border-l-4 border-l-red-500">
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">延期</Badge>
              <span className="text-xs text-muted-foreground">10分钟前</span>
            </div>
            <p className="font-medium">订单 #2024003 严重延期</p>
            <p className="text-sm text-muted-foreground">
              该订单已超过交期2天，请立即处理
            </p>
            <Button size="sm">立即处理</Button>
          </div>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">风险</Badge>
              <span className="text-xs text-muted-foreground">1小时前</span>
            </div>
            <p className="font-medium">产线A效率下降</p>
            <p className="text-sm text-muted-foreground">
              今日效率仅75%，低于平均水平85%
            </p>
            <Button size="sm" variant="outline">查看详情</Button>
          </div>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">风险</Badge>
              <span className="text-xs text-muted-foreground">2小时前</span>
            </div>
            <p className="font-medium">物料库存预警</p>
            <p className="text-sm text-muted-foreground">
              纽扣库存不足，仅剩3天用量
            </p>
            <Button size="sm" variant="outline">申请采购</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// 个人中心页面
function ProfilePage({ user }: { user: any }) {
  return (
    <div className="space-y-4">
      {/* 个人信息 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium">{user?.name || '用户名'}</p>
              <p className="text-sm text-muted-foreground">{user?.role || '员工'}</p>
              <p className="text-xs text-muted-foreground">工号：{user?.code || '---'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 本月绩效 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">本月绩效</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xl font-bold">1,250</p>
              <p className="text-xs text-muted-foreground">完成件数</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-green-600">92%</p>
              <p className="text-xs text-muted-foreground">效率</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-blue-600">98%</p>
              <p className="text-xs text-muted-foreground">合格率</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 功能菜单 */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            <MenuItem icon={<ClipboardList className="w-5 h-5" />} label="我的工单" />
            <MenuItem icon={<Clock className="w-5 h-5" />} label="考勤记录" />
            <MenuItem icon={<BarChart3 className="w-5 h-5" />} label="绩效报表" />
            <MenuItem icon={<Bell className="w-5 h-5" />} label="消息通知" />
            <MenuItem icon={<User className="w-5 h-5" />} label="个人设置" />
          </div>
        </CardContent>
      </Card>

      {/* 退出登录 */}
      <Button variant="outline" className="w-full">
        退出登录
      </Button>
    </div>
  );
}

// 菜单项
function MenuItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-between p-4 active:bg-muted/50">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}
