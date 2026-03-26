'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sparkles,
  Send,
  Bot,
  User,
  RefreshCw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Package,
  DollarSign,
  TrendingUp,
  CheckCircle,
  BarChart3,
  MessageSquare,
  Brain,
  Zap,
  Target,
  Clock,
  Factory,
  Truck,
  AlertCircle,
  Lightbulb,
  Settings,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const quickActions = [
  { icon: BarChart3, label: '生产分析', prompt: '请分析当前的生产订单状态，给出完成率、延期情况和改进建议', color: 'text-blue-500' },
  { icon: Package, label: '库存预警', prompt: '检查物料库存情况，列出所有低于安全库存的物料，并给出补货建议', color: 'text-amber-500' },
  { icon: DollarSign, label: '财务概览', prompt: '分析本月财务收支情况，给出利润分析和成本控制建议', color: 'text-green-500' },
  { icon: AlertTriangle, label: '异常检测', prompt: '全面检查当前业务中的异常情况，包括延期订单、低库存、质量问题等，并给出解决方案', color: 'text-red-500' },
  { icon: Factory, label: '效率分析', prompt: '分析生产效率，找出生产瓶颈，给出效率提升建议', color: 'text-purple-500' },
  { icon: Target, label: '排产建议', prompt: '根据当前订单优先级和到期时间，给出最优排产建议', color: 'text-cyan-500' },
];

const suggestedQuestions = [
  '当前生产进度如何？有哪些需要重点关注的问题？',
  '分析订单完成效率，给出具体的改进建议',
  '本月的经营状况如何？利润情况怎样？',
  '有哪些订单即将到期需要加快进度？',
  '分析当前库存状况，是否需要补货？',
  '外发订单进度如何？有什么风险？',
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `您好！我是您的智能生产管理助手 🤖

我可以帮您：
• 📊 **生产分析** - 订单状态、进度追踪、效率分析
• 📦 **库存管理** - 库存预警、补货建议、周转分析
• 💰 **财务分析** - 收支统计、成本分析、利润预测
• ⚠️ **风险预警** - 延期订单、低库存、质量问题
• 🎯 **智能排产** - 优先级排序、产能优化建议

**新功能**：开启「深度思考」模式，获得更详细的分析报告！

请问有什么可以帮您的？`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [enableThinking, setEnableThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, aiMessage]);

    try {
      const chatMessages = messages
        .filter(m => m.role !== 'assistant' || m.content)
        .map(m => ({ role: m.role, content: m.content }));
      chatMessages.push({ role: 'user', content: userMessage.content });

      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: chatMessages, 
          stream: true,
          enableThinking: enableThinking 
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMessageId
                      ? { ...m, content: fullContent }
                      : m
                  )
                );
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId ? { ...m, isStreaming: false } : m
        )
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId ? { ...m, isStreaming: false } : m
          )
        );
      } else {
        console.error('AI chat error:', error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  content: '抱歉，处理您的请求时出现错误。请稍后重试。',
                  isStreaming: false,
                }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: '对话已清空。请问有什么可以帮您的？',
        timestamp: new Date(),
      },
    ]);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-4rem)] flex flex-col">
      {/* Page Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI 智能助手</h1>
              <p className="text-sm text-muted-foreground">基于真实业务数据的智能分析助手</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className={`h-5 w-5 ${enableThinking ? 'text-violet-500' : 'text-gray-400'}`} />
              <Label htmlFor="thinking-mode" className="text-sm cursor-pointer">
                深度思考
              </Label>
              <Switch
                id="thinking-mode"
                checked={enableThinking}
                onCheckedChange={setEnableThinking}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4 flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="border-b py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                </div>
                <div>
                  <CardTitle className="text-sm">智能助手</CardTitle>
                  <CardDescription className="text-xs">在线 · 随时为您服务</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {enableThinking && (
                  <Badge variant="outline" className="text-violet-500 border-violet-300">
                    <Brain className="h-3 w-3 mr-1" />
                    深度思考
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={handleClearChat}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  清空
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <Avatar className="flex-shrink-0 h-8 w-8">
                      <AvatarFallback
                        className={
                          message.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                        }
                      >
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[85%] rounded-xl p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                        {message.isStreaming && (
                          <span className="inline-block w-1.5 h-4 ml-0.5 bg-violet-500 animate-pulse" />
                        )}
                      </div>
                      {message.role === 'assistant' && !message.isStreaming && message.content && (
                        <div className="mt-2 pt-2 border-t flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            onClick={() => handleCopy(message.content)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            复制
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-3">
                    <Avatar className="flex-shrink-0 h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-xl p-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="text-sm text-muted-foreground ml-2">
                          {enableThinking ? '正在深度思考...' : '思考中...'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="输入您的问题，例如：分析当前生产进度..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                className="flex-1"
                disabled={isLoading}
              />
              {isLoading ? (
                <Button variant="destructive" onClick={handleStop}>
                  停止
                </Button>
              ) : (
                <Button onClick={handleSend} disabled={!input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-3 overflow-y-auto">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                快捷分析
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto flex-col gap-1 py-2 px-2"
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={isLoading}
                >
                  <action.icon className={`h-4 w-4 ${action.color}`} />
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Suggested Questions */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                推荐问题
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {suggestedQuestions.slice(0, 4).map((question, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto py-2 px-2"
                  onClick={() => handleQuickAction(question)}
                  disabled={isLoading}
                >
                  <MessageSquare className="h-3 w-3 mr-2 flex-shrink-0 text-muted-foreground" />
                  <span className="text-xs line-clamp-2">{question}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* AI Capabilities */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-500" />
                AI 能力
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span>实时业务数据查询</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span>智能生产分析</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span>库存预警检测</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span>财务数据分析</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span>异常订单检测</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span>深度思考模式</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span>优化建议生成</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-violet-50 border-violet-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-violet-700">
                  <p className="font-medium mb-1">小贴士</p>
                  <p>开启「深度思考」模式可以获得更详细、更有深度的分析报告和解决方案。</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
