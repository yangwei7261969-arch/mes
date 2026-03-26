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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Settings,
  Shield,
  Users,
  Palette,
  Bell,
  Database,
  Key,
  Globe,
  Mail,
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">系统设置</h1>
        <p className="text-muted-foreground">管理系统配置、权限和主题</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">基本设置</TabsTrigger>
          <TabsTrigger value="permissions">权限管理</TabsTrigger>
          <TabsTrigger value="appearance">主题外观</TabsTrigger>
          <TabsTrigger value="notifications">通知设置</TabsTrigger>
          <TabsTrigger value="system">系统配置</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                企业信息
              </CardTitle>
              <CardDescription>配置企业基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>企业名称</Label>
                  <Input placeholder="输入企业名称" defaultValue="XX服装有限公司" />
                </div>
                <div className="space-y-2">
                  <Label>企业简称</Label>
                  <Input placeholder="输入企业简称" defaultValue="XX服装" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>联系电话</Label>
                  <Input placeholder="联系电话" defaultValue="020-12345678" />
                </div>
                <div className="space-y-2">
                  <Label>传真号码</Label>
                  <Input placeholder="传真号码" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>企业地址</Label>
                <Textarea placeholder="企业详细地址" defaultValue="广东省广州市XX区XX路XX号" />
              </div>
            </CardContent>
          </Card>

          {/* Contact Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                联系方式配置
              </CardTitle>
              <CardDescription>配置系统通知邮箱和客服联系方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>系统通知邮箱</Label>
                  <Input type="email" placeholder="system@company.com" />
                </div>
                <div className="space-y-2">
                  <Label>客服电话</Label>
                  <Input placeholder="400-XXX-XXXX" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                角色权限配置
              </CardTitle>
              <CardDescription>配置各角色的系统访问权限</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { role: '超级管理员', description: '拥有系统所有权限', level: 1 },
                  { role: '厂长', description: '管理生产、仓库、财务等核心模块', level: 2 },
                  { role: '生产主管', description: '管理生产订单和工序进度', level: 3 },
                  { role: '仓管员', description: '管理仓库库存和出入库', level: 4 },
                  { role: '财务', description: '管理账单、付款和发票', level: 3 },
                  { role: '人事', description: '管理员工信息和工资', level: 3 },
                  { role: '普通员工', description: '查看个人相关信息', level: 5 },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-4">
                    <div>
                      <p className="font-medium">{item.role}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">权限级别: {item.level}</span>
                      <Button variant="outline" size="sm">配置权限</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                主题设置
              </CardTitle>
              <CardDescription>自定义系统外观</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>主题模式</Label>
                <Select defaultValue="light">
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">浅色模式</SelectItem>
                    <SelectItem value="dark">深色模式</SelectItem>
                    <SelectItem value="system">跟随系统</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>主题色</Label>
                <div className="flex gap-2">
                  {['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500'].map((color, index) => (
                    <button
                      key={index}
                      className={`h-8 w-8 rounded-full ${color} ring-offset-2 hover:ring-2 ring-primary`}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Logo 设置</Label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-32 rounded border flex items-center justify-center bg-muted">
                    Logo 预览
                  </div>
                  <Button variant="outline">上传 Logo</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                通知设置
              </CardTitle>
              <CardDescription>配置系统通知规则</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { label: '库存预警通知', description: '当物料库存低于安全库存时通知' },
                { label: '订单超期通知', description: '当生产订单超过计划完成日期时通知' },
                { label: '付款到期通知', description: '当应付账单即将到期时通知' },
                { label: '系统公告推送', description: '有新公告时推送通知' },
                { label: 'AI 操作记录', description: '记录所有 AI 助手的操作日志' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                系统配置
              </CardTitle>
              <CardDescription>系统级配置参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>数据备份周期</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">每天</SelectItem>
                      <SelectItem value="weekly">每周</SelectItem>
                      <SelectItem value="monthly">每月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>日志保留天数</Label>
                  <Input type="number" defaultValue="90" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>会话超时时间（分钟）</Label>
                  <Input type="number" defaultValue="30" />
                </div>
                <div className="space-y-2">
                  <Label>最大上传文件大小（MB）</Label>
                  <Input type="number" defaultValue="10" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                安全设置
              </CardTitle>
              <CardDescription>系统安全相关配置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">强制密码修改</p>
                  <p className="text-sm text-muted-foreground">要求用户定期修改密码</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">双因素认证</p>
                  <p className="text-sm text-muted-foreground">启用双因素认证增强安全性</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">操作日志审计</p>
                  <p className="text-sm text-muted-foreground">记录所有用户操作日志</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline">重置</Button>
        <Button>保存设置</Button>
      </div>
    </div>
  );
}
