'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getColorValue } from '@/lib/color-utils';
import {
  Calendar,
  Truck,
  Package,
  AlertTriangle,
  RotateCcw,
  Plus,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Order {
  id: string;
  order_no: string;
  style_no: string;
  style_name: string;
  color: string;
  size: string;
  quantity: number;
  completed_quantity: number;
  status: string;
  plan_end_date: string;
  customer: any;
  isOverdue: boolean;
}

interface Shipment {
  id: string;
  task_no: string;
  style_no: string;
  quantity: number;
  status: string;
  ship_date: string;
  is_return: boolean;
  receiver: string;
  receiver_phone: string;
  customer: any;
}

interface DayData {
  orders: Order[];
  shipments: Shipment[];
  hasReturn: boolean;
  totalQty: number;
}

const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 日期格式化函数（提前定义，避免hoisting问题）
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export default function ShippingCalendarPage() {
  const [calendar, setCalendar] = useState<Record<string, DayData>>({});
  const [reminders, setReminders] = useState<{
    overdue: Order[];
    today: Order[];
    tomorrow: Order[];
  }>({ overdue: [], today: [], tomorrow: [] });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // 发货表单
  const [shipForm, setShipForm] = useState({
    courier: '',
    tracking_no: '',
    quantity: 0,
    is_return: false,
    return_reason: '',
  });

  // 当前周起始日期
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
  });

  useEffect(() => {
    fetchCalendar();
  }, [weekStart]);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const start = formatDate(weekStart);
      const end = formatDate(new Date(weekStart.getTime() + 7 * 86400000));

      const response = await fetch(`/api/shipping-calendar?start_date=${start}&end_date=${end}`);
      const result = await response.json();
      if (result.success) {
        setCalendar(result.data.calendar);
        setReminders(result.data.reminders);
      }
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart.getTime() + i * 86400000);
      dates.push(date);
    }
    return dates;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return formatDate(date) === formatDate(today);
  };

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date(Date.now() + 86400000);
    return formatDate(date) === formatDate(tomorrow);
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handlePrevWeek = () => {
    setWeekStart(new Date(weekStart.getTime() - 7 * 86400000));
  };

  const handleNextWeek = () => {
    setWeekStart(new Date(weekStart.getTime() + 7 * 86400000));
  };

  const handleToday = () => {
    const today = new Date();
    const day = today.getDay();
    setWeekStart(new Date(today.setDate(today.getDate() - day)));
  };

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setDetailDialogOpen(true);
  };

  const handleQuickShip = (order: Order) => {
    setSelectedOrder(order);
    setShipForm({
      courier: '',
      tracking_no: '',
      quantity: order.quantity - (order.completed_quantity || 0),
      is_return: false,
      return_reason: '',
    });
    setShipDialogOpen(true);
  };

  const handleConfirmShip = async () => {
    if (!selectedOrder) return;

    try {
      const response = await fetch('/api/shipping-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_order_id: selectedOrder.id,
          customer_id: selectedOrder.customer?.id,
          style_no: selectedOrder.style_no,
          quantity: shipForm.quantity,
          is_return: shipForm.is_return,
          return_reason: shipForm.return_reason,
          receiver: selectedOrder.customer?.contact,
          receiver_phone: selectedOrder.customer?.phone,
          ship_date: new Date().toISOString().split('T')[0],
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShipDialogOpen(false);
        fetchCalendar();
        alert(shipForm.is_return ? '退货单已创建！' : '发货任务已创建！');
      } else {
        alert(result.error || '创建失败');
      }
    } catch (error) {
      alert('创建失败');
    }
  };

  const weekDates = getWeekDates();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            出货日历
          </h1>
          <p className="text-gray-500 mt-1">查看近7天出货安排，避免订单超期</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            今天
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 提醒区域 */}
      {(reminders.overdue.length > 0 || reminders.today.length > 0 || reminders.tomorrow.length > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="space-y-3">
              {reminders.overdue.length > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="text-red-700 font-medium">
                    {reminders.overdue.length} 个订单已超期！
                  </span>
                  <div className="flex gap-1">
                    {reminders.overdue.slice(0, 3).map((o) => (
                      <Badge key={o.id} variant="destructive" className="text-xs">
                        {o.order_no}
                      </Badge>
                    ))}
                    {reminders.overdue.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{reminders.overdue.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              {reminders.today.length > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <span className="text-orange-700 font-medium">
                    今日到期 {reminders.today.length} 个订单
                  </span>
                  <div className="flex gap-1">
                    {reminders.today.slice(0, 3).map((o) => (
                      <Badge key={o.id} className="bg-orange-100 text-orange-800 text-xs">
                        {o.order_no}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {reminders.tomorrow.length > 0 && (
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  <span className="text-blue-700 font-medium">
                    明日到期 {reminders.tomorrow.length} 个订单
                  </span>
                  <div className="flex gap-1">
                    {reminders.tomorrow.slice(0, 3).map((o) => (
                      <Badge key={o.id} className="bg-blue-100 text-blue-800 text-xs">
                        {o.order_no}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 日历视图 */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date) => {
          const dateStr = formatDate(date);
          const dayData = calendar[dateStr] || { orders: [], shipments: [], hasReturn: false, totalQty: 0 };
          const hasOverdue = dayData.orders.some((o) => o.isOverdue);

          return (
            <Card
              key={dateStr}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                isToday(date) ? 'ring-2 ring-blue-500' : ''
              } ${isPast(date) && hasOverdue ? 'bg-red-50' : ''}`}
              onClick={() => handleDateClick(dateStr)}
            >
              <CardContent className="p-3">
                {/* 日期头部 */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs text-gray-500">{weekDays[date.getDay()]}</div>
                    <div className={`text-lg font-bold ${isToday(date) ? 'text-blue-600' : ''}`}>
                      {date.getDate()}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {dayData.hasReturn && (
                      <RotateCcw className="h-4 w-4 text-orange-500" />
                    )}
                    {isTomorrow(date) && dayData.orders.length > 0 && (
                      <Badge className="bg-blue-500 text-white text-xs">明</Badge>
                    )}
                  </div>
                </div>

                {/* 订单数量 */}
                <div className="space-y-1">
                  {dayData.orders.length > 0 && (
                    <div className={`text-xs p-1.5 rounded ${hasOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      <Package className="h-3 w-3 inline mr-1" />
                      {dayData.orders.length} 单待发
                    </div>
                  )}
                  {dayData.shipments.length > 0 && (
                    <div className="text-xs p-1.5 rounded bg-green-100 text-green-700">
                      <Truck className="h-3 w-3 inline mr-1" />
                      {dayData.shipments.length} 单发货
                    </div>
                  )}
                  {dayData.orders.length === 0 && dayData.shipments.length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-2">无安排</div>
                  )}
                </div>

                {/* 总数量 */}
                {dayData.totalQty > 0 && (
                  <div className="mt-2 text-xs text-gray-500 text-right">
                    共 {dayData.totalQty} 件
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 日期详情弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDate} 出货安排
            </DialogTitle>
          </DialogHeader>

          {selectedDate && calendar[selectedDate] && (
            <div className="space-y-4">
              {/* 待发货订单 */}
              {calendar[selectedDate].orders.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-500" />
                    待发货订单
                  </h3>
                  <div className="space-y-2">
                    {calendar[selectedDate].orders.map((order) => (
                      <div
                        key={order.id}
                        className={`p-3 border rounded-lg ${
                          order.isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{order.order_no}</span>
                              <span className="font-bold">{order.style_no}</span>
                              {order.isOverdue && (
                                <Badge variant="destructive" className="text-xs">超期</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {order.style_name} | 
                              <span className="inline-flex items-center gap-1 ml-1">
                                <div 
                                  className="w-4 h-4 rounded-full border border-gray-200"
                                  style={{ backgroundColor: getColorValue(order.color) }}
                                />
                                <span className="font-bold">{order.color}</span>
                              </span>
                              {order.size && <span className="ml-1">/ {order.size}</span>}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm">
                              <span className="font-bold text-blue-600">数量: {order.quantity}</span>
                              <span className="text-green-600 font-medium">完成: {order.completed_quantity || 0}</span>
                              {order.customer && (
                                <span className="text-gray-500">
                                  客户: {order.customer.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickShip(order);
                              }}
                            >
                              <Truck className="h-4 w-4 mr-1" />
                              发货
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickShip(order);
                                setShipForm(prev => ({ ...prev, is_return: true }));
                              }}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              退货
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 已发货任务 */}
              {calendar[selectedDate].shipments.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-green-500" />
                    发货任务
                  </h3>
                  <div className="space-y-2">
                    {calendar[selectedDate].shipments.map((ship) => (
                      <div
                        key={ship.id}
                        className={`p-3 border rounded-lg ${
                          ship.is_return ? 'bg-orange-50 border-orange-200' : 'bg-green-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {ship.is_return && (
                              <Badge className="bg-orange-500 text-white">
                                <RotateCcw className="h-3 w-3 mr-1" />
                                退货
                              </Badge>
                            )}
                            <span className="font-mono text-sm">{ship.task_no}</span>
                            <span className="font-bold">{ship.style_no}</span>
                          </div>
                          <Badge className={ship.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                            {ship.status === 'delivered' ? '已送达' : ship.status === 'shipped' ? '已发货' : '待发货'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          数量: {ship.quantity} | 收件人: {ship.receiver} {ship.receiver_phone}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {calendar[selectedDate].orders.length === 0 && calendar[selectedDate].shipments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  当日无出货安排
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 快捷发货弹窗 */}
      <Dialog open={shipDialogOpen} onOpenChange={setShipDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {shipForm.is_return ? (
                <>
                  <RotateCcw className="h-5 w-5 text-orange-500" />
                  创建退货单
                </>
              ) : (
                <>
                  <Truck className="h-5 w-5" />
                  快捷发货
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* 订单信息 */}
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>订单号: <span className="font-mono">{selectedOrder.order_no}</span></div>
                  <div>款号: <span className="font-bold">{selectedOrder.style_no}</span></div>
                  <div className="flex items-center gap-1">
                    颜色: 
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: getColorValue(selectedOrder.color) }}
                    />
                    <span className="font-bold">{selectedOrder.color}</span>
                  </div>
                  <div>尺码: <span className="font-bold">{selectedOrder.size}</span></div>
                  <div>订单数量: <span className="font-bold text-blue-600">{selectedOrder.quantity}</span></div>
                  <div>已完成: <span className="font-bold text-green-600">{selectedOrder.completed_quantity || 0}</span></div>
                </div>
                {selectedOrder.customer && (
                  <div className="mt-2 pt-2 border-t">
                    客户: {selectedOrder.customer.name} | {selectedOrder.customer.contact} {selectedOrder.customer.phone}
                  </div>
                )}
              </div>

              {/* 发货表单 */}
              <div className="space-y-2">
                <Label>发货数量</Label>
                <Input
                  type="number"
                  value={shipForm.quantity}
                  onChange={(e) => setShipForm({ ...shipForm, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>

              {!shipForm.is_return && (
                <>
                  <div className="space-y-2">
                    <Label>快递公司</Label>
                    <Select 
                      value={shipForm.courier} 
                      onValueChange={(v) => setShipForm({ ...shipForm, courier: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择快递公司" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="顺丰">顺丰</SelectItem>
                        <SelectItem value="圆通">圆通</SelectItem>
                        <SelectItem value="中通">中通</SelectItem>
                        <SelectItem value="申通">申通</SelectItem>
                        <SelectItem value="韵达">韵达</SelectItem>
                        <SelectItem value="EMS">EMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>运单号</Label>
                    <Input
                      value={shipForm.tracking_no}
                      onChange={(e) => setShipForm({ ...shipForm, tracking_no: e.target.value })}
                      placeholder="输入运单号"
                    />
                  </div>
                </>
              )}

              {shipForm.is_return && (
                <div className="space-y-2">
                  <Label>退货原因</Label>
                  <Input
                    value={shipForm.return_reason}
                    onChange={(e) => setShipForm({ ...shipForm, return_reason: e.target.value })}
                    placeholder="输入退货原因"
                  />
                </div>
              )}

              {/* 退货切换 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isReturn"
                  checked={shipForm.is_return}
                  onChange={(e) => setShipForm({ ...shipForm, is_return: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isReturn" className="cursor-pointer text-orange-600">
                  标记为退货单
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShipDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleConfirmShip}
              className={shipForm.is_return ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              {shipForm.is_return ? '确认退货' : '确认发货'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
