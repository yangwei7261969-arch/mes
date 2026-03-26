'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Database,
  Download,
  Upload,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  HardDrive,
} from 'lucide-react';

interface BackupRecord {
  id: string;
  name: string;
  size: string;
  created_at: string;
  type: 'auto' | 'manual';
  status: 'completed' | 'failed';
}

// 模拟备份记录
const mockBackups: BackupRecord[] = [
  {
    id: '1',
    name: '自动备份-20240315',
    size: '125.6 MB',
    created_at: '2024-03-15 03:00:00',
    type: 'auto',
    status: 'completed',
  },
  {
    id: '2',
    name: '手动备份-订单数据',
    size: '89.2 MB',
    created_at: '2024-03-14 15:30:00',
    type: 'manual',
    status: 'completed',
  },
  {
    id: '3',
    name: '自动备份-20240314',
    size: '124.8 MB',
    created_at: '2024-03-14 03:00:00',
    type: 'auto',
    status: 'completed',
  },
];

export default function BackupPage() {
  const [loading, setLoading] = useState(false);
  const [backups] = useState<BackupRecord[]>(mockBackups);

  const handleBackup = async () => {
    setLoading(true);
    // 模拟备份
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoading(false);
    alert('备份完成！');
  };

  const handleRestore = (backupId: string) => {
    if (!confirm('确定要恢复此备份吗？当前数据将被覆盖！')) return;
    alert('恢复功能需要在实际部署时配置');
  };

  return (
    <div className="p-6 space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            数据备份与恢复
          </h1>
          <p className="text-gray-500 text-sm">管理系统数据备份，支持一键恢复</p>
        </div>
      </div>

      {/* 存储状态 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">已用空间</div>
                <div className="text-2xl font-bold">339.6 MB</div>
              </div>
              <HardDrive className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">备份文件数</div>
                <div className="text-2xl font-bold">{backups.length}</div>
              </div>
              <Database className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">上次备份</div>
                <div className="text-lg font-bold">2024-03-15</div>
              </div>
              <Clock className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作区域 */}
      <Card>
        <CardHeader>
          <CardTitle>备份操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={handleBackup} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              立即备份
            </Button>
            <Button variant="outline" disabled>
              <Download className="h-4 w-4 mr-2" />
              导出备份文件
            </Button>
          </div>
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              自动备份每日凌晨3点执行，保留最近30天的备份记录。
              数据恢复需要管理员权限。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 备份列表 */}
      <Card>
        <CardHeader>
          <CardTitle>备份记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <Database className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">{backup.name}</div>
                    <div className="text-sm text-gray-500">
                      {backup.size} · {backup.created_at}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={backup.type === 'auto' ? 'secondary' : 'default'}>
                    {backup.type === 'auto' ? '自动' : '手动'}
                  </Badge>
                  <Badge
                    variant={backup.status === 'completed' ? 'default' : 'destructive'}
                    className="bg-green-100 text-green-800"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    完成
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(backup.id)}
                  >
                    恢复
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
