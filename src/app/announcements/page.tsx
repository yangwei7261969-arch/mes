'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Plus,
  Eye,
  Megaphone,
  AlertCircle,
  Info,
} from 'lucide-react';

const announcements = [
  { id: 1, title: '春节放假通知', type: 'important', content: '2024年春节放假时间为...', date: '2024-01-15', status: 'published' },
  { id: 2, title: '系统升级公告', type: 'system', content: '系统将于本周六进行升级...', date: '2024-01-14', status: 'published' },
  { id: 3, title: '新员工入职培训', type: 'general', content: '本周五下午进行新员工培训...', date: '2024-01-13', status: 'published' },
  { id: 4, title: '安全生产提醒', type: 'urgent', content: '请各部门注意安全生产...', date: '2024-01-12', status: 'draft' },
];

const typeConfig: Record<string, { label: string; icon: typeof Info; className: string }> = {
  important: { label: '重要', icon: AlertCircle, className: 'bg-orange-500' },
  urgent: { label: '紧急', icon: AlertCircle, className: 'bg-red-500' },
  system: { label: '系统', icon: Info, className: 'bg-blue-500' },
  general: { label: '普通', icon: Megaphone, className: 'bg-gray-500' },
};

export default function AnnouncementsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">公告中心</h1>
          <p className="text-muted-foreground">发布和管理公司公告</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          发布公告
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">已发布公告</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">条公告</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">待发布</CardTitle>
            <Bell className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">3</div>
            <p className="text-xs text-muted-foreground">草稿</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">紧急公告</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">1</div>
            <p className="text-xs text-muted-foreground">条</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">本月新增</CardTitle>
            <Megaphone className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">8</div>
            <p className="text-xs text-muted-foreground">条公告</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">全部公告</TabsTrigger>
          <TabsTrigger value="important">重要公告</TabsTrigger>
          <TabsTrigger value="system">系统公告</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标题</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>内容预览</TableHead>
                    <TableHead>发布日期</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((announcement) => {
                    const config = typeConfig[announcement.type];
                    return (
                      <TableRow key={announcement.id}>
                        <TableCell className="font-medium">{announcement.title}</TableCell>
                        <TableCell>
                          <Badge className={config.className}>
                            <config.icon className="mr-1 h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{announcement.content}</TableCell>
                        <TableCell>{announcement.date}</TableCell>
                        <TableCell>
                          <Badge variant={announcement.status === 'published' ? 'default' : 'secondary'}>
                            {announcement.status === 'published' ? '已发布' : '草稿'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="important">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {announcements.filter(a => a.type === 'important' || a.type === 'urgent').map((announcement) => (
                  <div key={announcement.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{announcement.title}</h3>
                      <Badge className={typeConfig[announcement.type].className}>
                        {typeConfig[announcement.type].label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{announcement.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">{announcement.date}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                系统公告列表...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
