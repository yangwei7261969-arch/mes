'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Factory, 
  User, 
  Building2, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  MapPin,
  ArrowRight
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 登录表单
  const [loginCode, setLoginCode] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginType, setLoginType] = useState<'supplier' | 'admin'>('admin');
  const [rememberMe, setRememberMe] = useState(false);

  // 注册表单
  const [regForm, setRegForm] = useState({
    code: '',
    name: '',
    short_name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    password: '',
    confirmPassword: '',
    parent_id: '',
  });

  const [parentSuppliers, setParentSuppliers] = useState<any[]>([]);
  const [showParentSelect, setShowParentSelect] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 检查是否已登录
    const userInfo = localStorage.getItem('user_info');
    const supplierInfo = localStorage.getItem('supplier_info');
    if (userInfo || supplierInfo) {
      router.push('/');
    }
  }, [router]);

  // 登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginCode || !loginPassword) {
      setError('请输入账号和密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (loginType === 'supplier') {
        const response = await fetch('/api/supplier-auth', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: loginCode, password: loginPassword }),
        });

        const result = await response.json();
        if (result.success) {
          localStorage.setItem('supplier_info', JSON.stringify(result.data));
          localStorage.setItem('user_type', 'supplier');
          if (rememberMe) {
            localStorage.setItem('remembered_code', loginCode);
            localStorage.setItem('remembered_type', 'supplier');
          }
          // 使用 window.location.href 强制页面重新加载
          window.location.href = '/supplier-workbench';
        } else {
          setError(result.error || '登录失败');
        }
      } else {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: loginCode, password: loginPassword }),
        });

        const result = await response.json();
        if (result.success) {
          localStorage.setItem('user_info', JSON.stringify(result.user));
          localStorage.setItem('user_type', 'admin');
          if (rememberMe) {
            localStorage.setItem('remembered_code', loginCode);
            localStorage.setItem('remembered_type', 'admin');
          }
          // 使用 window.location.href 强制页面重新加载
          window.location.href = '/';
        } else {
          setError(result.error || '账号或密码错误');
        }
      }
    } catch (err) {
      setError('登录失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regForm.code || !regForm.name || !regForm.phone || !regForm.password) {
      setError('请填写必填项（带*号的字段）');
      return;
    }

    if (regForm.password !== regForm.confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    if (regForm.password.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/supplier-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      });

      const result = await response.json();
      if (result.success) {
        setSuccess('注册成功！请等待管理员审核后登录');
        setRegForm({
          code: '',
          name: '',
          short_name: '',
          contact: '',
          phone: '',
          email: '',
          address: '',
          password: '',
          confirmPassword: '',
          parent_id: '',
        });
      } else {
        setError(result.error || '注册失败');
      }
    } catch (err) {
      setError('注册失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 加载上级供应商列表
  const loadParentSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers');
      const result = await response.json();
      if (result.success) {
        setParentSuppliers(result.data?.suppliers?.filter((s: any) => s.status === 'active') || []);
      }
    } catch (err) {
      console.error('Failed to load suppliers');
    }
  };

  // 加载记住的账号
  useEffect(() => {
    const rememberedCode = localStorage.getItem('remembered_code');
    const rememberedType = localStorage.getItem('remembered_type');
    if (rememberedCode && rememberedType) {
      setLoginCode(rememberedCode);
      setLoginType(rememberedType as 'supplier' | 'admin');
      setRememberMe(true);
    }
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌区域 */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
        
        {/* 装饰图案 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border-2 border-white rounded-full" />
          <div className="absolute bottom-20 right-20 w-96 h-96 border-2 border-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 border-2 border-white rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-14 w-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Factory className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">服装ERP</h1>
                <p className="text-white/80 text-sm">生产管理系统</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 text-white">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
              智能生产<br />
              高效协同
            </h2>
            <p className="text-lg text-white/80 max-w-md">
              全流程数字化管理，从订单到交付，让服装生产更简单、更透明
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-6 max-w-md">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-3xl font-bold text-white">100+</div>
              <div className="text-white/70 text-sm">合作供应商</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-3xl font-bold text-white">50万+</div>
              <div className="text-white/70 text-sm">月均产量</div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧登录区域 */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* 移动端Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center">
              <Factory className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">服装ERP</h1>
              <p className="text-muted-foreground text-sm">生产管理系统</p>
            </div>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">欢迎回来</CardTitle>
              <CardDescription>
                登录您的账户以继续
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">登录</TabsTrigger>
                  <TabsTrigger value="register">供应商注册</TabsTrigger>
                </TabsList>

                {/* 登录表单 */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="loginType">登录身份</Label>
                      <Select value={loginType} onValueChange={(v) => setLoginType(v as any)}>
                        <SelectTrigger id="loginType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              内部管理员
                            </div>
                          </SelectItem>
                          <SelectItem value="supplier">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              供应商
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loginCode">
                        {loginType === 'supplier' ? '供应商编码' : '账号'}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="loginCode"
                          value={loginCode}
                          onChange={(e) => setLoginCode(e.target.value)}
                          placeholder={loginType === 'supplier' ? '输入供应商编码' : '输入账号'}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loginPassword">密码</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="loginPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="输入密码"
                          className="pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        />
                        <Label htmlFor="remember" className="text-sm cursor-pointer">
                          记住我
                        </Label>
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          登录中...
                        </>
                      ) : (
                        <>
                          登录
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* 注册表单 */}
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="regCode">供应商编码 *</Label>
                        <Input
                          id="regCode"
                          value={regForm.code}
                          onChange={(e) => setRegForm({ ...regForm, code: e.target.value })}
                          placeholder="SUP001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="regName">公司名称 *</Label>
                        <Input
                          id="regName"
                          value={regForm.name}
                          onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                          placeholder="XX服饰有限公司"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="regContact">联系人 *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="regContact"
                            value={regForm.contact}
                            onChange={(e) => setRegForm({ ...regForm, contact: e.target.value })}
                            placeholder="姓名"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="regPhone">联系电话 *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="regPhone"
                            value={regForm.phone}
                            onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                            placeholder="13800138000"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="regAddress">公司地址</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="regAddress"
                          value={regForm.address}
                          onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                          placeholder="详细地址"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* 上级供应商选择 */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasParent"
                        checked={showParentSelect}
                        onCheckedChange={(checked) => {
                          setShowParentSelect(checked as boolean);
                          if (checked) {
                            loadParentSuppliers();
                          } else {
                            setRegForm({ ...regForm, parent_id: '' });
                          }
                        }}
                      />
                      <Label htmlFor="hasParent" className="text-sm cursor-pointer">
                        我是下线供应商
                      </Label>
                    </div>

                    {showParentSelect && (
                      <div className="space-y-2">
                        <Label>选择上级供应商</Label>
                        <Select 
                          value={regForm.parent_id} 
                          onValueChange={(v) => setRegForm({ ...regForm, parent_id: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择上级供应商" />
                          </SelectTrigger>
                          <SelectContent>
                            {parentSuppliers.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} ({s.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="regPassword">密码 *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="regPassword"
                            type="password"
                            value={regForm.password}
                            onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                            placeholder="至少6位"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="regConfirmPassword">确认密码 *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="regConfirmPassword"
                            type="password"
                            value={regForm.confirmPassword}
                            onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                            placeholder="再次输入"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700 dark:text-green-400">{success}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          注册中...
                        </>
                      ) : (
                        '提交注册'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 底部信息 */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            登录即表示您同意我们的
            <a href="#" className="text-primary hover:underline mx-1">服务条款</a>
            和
            <a href="#" className="text-primary hover:underline mx-1">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
}
