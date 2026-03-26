'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Banknote,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export default function SupplierRegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    // 基本信息
    name: '',
    short_name: '',
    type: '',
    category: '',
    // 联系信息
    contact: '',
    phone: '',
    email: '',
    address: '',
    // 资质信息
    tax_no: '',
    // 银行信息
    bank_name: '',
    bank_account: '',
    bank_branch: '',
    account_name: '',
    // 账号信息
    password: '',
    confirm_password: '',
    // 其他
    notes: '',
  });

  const handleNext = () => {
    if (step === 1) {
      if (!form.name || !form.type) {
        setError('请填写公司名称和供应商类型');
        return;
      }
    }
    if (step === 2) {
      if (!form.contact || !form.phone) {
        setError('请填写联系人和联系电话');
        return;
      }
    }
    if (step === 3) {
      // 银行信息可选，不强制验证
    }
    if (step === 4) {
      if (!form.password || form.password.length < 6) {
        setError('密码至少6位');
        return;
      }
      if (form.password !== form.confirm_password) {
        setError('两次密码不一致');
        return;
      }
    }
    setError('');
    setStep(step + 1);
  };

  const handlePrev = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/supplier-auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          short_name: form.short_name || null,
          type: form.type,
          category: form.category || null,
          contact: form.contact,
          phone: form.phone,
          email: form.email || null,
          address: form.address || null,
          tax_no: form.tax_no || null,
          bank_name: form.bank_name || null,
          bank_account: form.bank_account || null,
          bank_branch: form.bank_branch || null,
          account_name: form.account_name || null,
          password: form.password,
          notes: form.notes || null,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || '注册失败，请稍后重试');
      }
    } catch (err) {
      setError('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">注册申请已提交</h2>
            <p className="text-gray-500 mb-6">
              您的供应商注册申请已提交成功，请等待管理员审核。
              审核通过后，您将收到短信通知。
            </p>
            <Button onClick={() => window.location.href = '/supplier-login'}>
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Building2 className="h-7 w-7" />
            供应商注册
          </CardTitle>
          <CardDescription>
            注册成为我们的合作伙伴，开启高效协作
          </CardDescription>
          
          {/* 进度条 */}
          <div className="flex justify-center mt-4 gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s <= step
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 text-xs text-gray-500 mt-1">
            <span>基本信息</span>
            <span>联系方式</span>
            <span>银行账户</span>
            <span>账号设置</span>
            <span>提交审核</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* 步骤1：基本信息 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>公司名称 *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="请输入公司全称"
                />
              </div>
              <div className="space-y-2">
                <Label>公司简称</Label>
                <Input
                  value={form.short_name}
                  onChange={(e) => setForm({ ...form, short_name: e.target.value })}
                  placeholder="可选，用于快速识别"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>供应商类型 *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">原料供应商</SelectItem>
                      <SelectItem value="accessory">辅料供应商</SelectItem>
                      <SelectItem value="processing">加工厂</SelectItem>
                      <SelectItem value="logistics">物流公司</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>供应分类</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="如：面料、辅料、包装等"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>公司地址</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="详细地址"
                />
              </div>
            </div>
          )}

          {/* 步骤2：联系方式 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>联系人 *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      value={form.contact}
                      onChange={(e) => setForm({ ...form, contact: e.target.value })}
                      placeholder="姓名"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>联系电话 *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="手机号"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>电子邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>税号</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    value={form.tax_no}
                    onChange={(e) => setForm({ ...form, tax_no: e.target.value })}
                    placeholder="纳税人识别号"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 步骤3：银行账户 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                银行账户信息用于后续结算付款，请准确填写
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>开户银行</Label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      value={form.bank_name}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      placeholder="如：中国工商银行"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>开户支行</Label>
                  <Input
                    value={form.bank_branch}
                    onChange={(e) => setForm({ ...form, bank_branch: e.target.value })}
                    placeholder="如：深圳南山支行"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>银行账号</Label>
                  <Input
                    value={form.bank_account}
                    onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
                    placeholder="银行账号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>账户名称</Label>
                  <Input
                    value={form.account_name}
                    onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                    placeholder="账户名称（可与公司名称不同）"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 步骤4：账号设置 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>登录密码 *</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="至少6位密码"
                />
              </div>
              <div className="space-y-2">
                <Label>确认密码 *</Label>
                <Input
                  type="password"
                  value={form.confirm_password}
                  onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                  placeholder="再次输入密码"
                />
              </div>
            </div>
          )}

          {/* 步骤5：确认提交 */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-medium">请确认注册信息</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>公司名称：{form.name}</div>
                  <div>简称：{form.short_name || '-'}</div>
                  <div>类型：{form.type === 'material' ? '原料供应商' : form.type === 'accessory' ? '辅料供应商' : form.type === 'processing' ? '加工厂' : '物流公司'}</div>
                  <div>分类：{form.category || '-'}</div>
                  <div>联系人：{form.contact}</div>
                  <div>电话：{form.phone}</div>
                  <div>邮箱：{form.email || '-'}</div>
                  <div>地址：{form.address || '-'}</div>
                  <div>开户银行：{form.bank_name || '-'}</div>
                  <div>开户支行：{form.bank_branch || '-'}</div>
                  <div>银行账号：{form.bank_account || '-'}</div>
                  <div>账户名称：{form.account_name || '-'}</div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                <p>提交后，管理员将对您的信息进行审核。审核通过后，您可以使用注册的手机号和密码登录供应商工作台。</p>
              </div>
              <div className="space-y-2">
                <Label>备注（可选）</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="其他需要说明的信息"
                />
              </div>
            </div>
          )}

          {/* 按钮组 */}
          <div className="flex justify-between pt-4">
            {step > 1 ? (
              <Button variant="outline" onClick={handlePrev}>
                上一步
              </Button>
            ) : (
              <div />
            )}
            {step < 5 ? (
              <Button onClick={handleNext}>
                下一步
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? '提交中...' : '提交注册'}
              </Button>
            )}
          </div>

          <div className="text-center text-sm text-gray-500">
            已有账号？{' '}
            <a href="/supplier-login" className="text-blue-600 hover:underline">
              立即登录
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
