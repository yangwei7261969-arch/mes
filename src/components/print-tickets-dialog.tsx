'use client';

import React, { useState, forwardRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, FileText, Eye, Clock, Trash2 } from 'lucide-react';

interface BundleInfo {
  id: string;
  bundle_no: string;
  quantity: number;
  color: string;
  size: string;
  cutting_order_id?: string;
  production_order_id?: string;
  cutting_orders?: {
    order_no: string;
    style_no: string;
    color: string;
    bed_number?: number;
    total_beds?: number;
  };
  production_orders?: {
    order_no: string;
    style_no: string;
    style_name: string;
  };
}

interface CraftProcess {
  id: string;
  process_name: string;
  process_type: string;
  status: string;
  notes?: string;
}

interface PrintTicketsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundles: BundleInfo[];
  craftProcesses?: CraftProcess[];
}

// 单个菲票组件 - 40mm x 60mm
const TicketCard = forwardRef<HTMLDivElement, {
  bundle: BundleInfo;
  craftNotes?: string;
  index?: number;
}>(({ bundle, craftNotes, index }, ref) => {
  const qrData = JSON.stringify({
    bundleId: bundle.id,
    bundleNo: bundle.bundle_no,
    qty: bundle.quantity,
    orderNo: bundle.cutting_orders?.order_no || bundle.production_orders?.order_no || '',
  });

  return (
    <div 
      ref={ref}
      className="ticket-card"
      style={{
        width: '40mm',
        height: '60mm',
        padding: '2mm',
        border: '1px solid #000',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        fontSize: '8pt',
        fontFamily: 'SimHei, Arial, sans-serif',
        pageBreakAfter: 'always',
      }}
    >
      {/* 标题 */}
      <div style={{ 
        textAlign: 'center', 
        fontWeight: 'bold',
        fontSize: '10pt',
        borderBottom: '1px solid #000',
        paddingBottom: '1mm',
        marginBottom: '1mm',
      }}>
        生产工票
      </div>

      {/* 主要内容区 */}
      <div style={{ display: 'flex', gap: '2mm', flex: 1 }}>
        {/* 左侧信息 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5mm' }}>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '10mm' }}>单号:</span>
            <span style={{ fontWeight: 'bold', fontSize: '9pt' }}>
              {bundle.cutting_orders?.order_no || bundle.production_orders?.order_no || '-'}
            </span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '10mm' }}>款号:</span>
            <span style={{ fontWeight: 'bold' }}>
              {bundle.cutting_orders?.style_no || bundle.production_orders?.style_no || '-'}
            </span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '10mm' }}>扎号:</span>
            <span style={{ fontWeight: 'bold', fontSize: '11pt', color: '#000' }}>
              {bundle.bundle_no}
            </span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '10mm' }}>颜色:</span>
            <span>{bundle.color}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '10mm' }}>尺码:</span>
            <span style={{ fontWeight: 'bold' }}>{bundle.size}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '10mm' }}>数量:</span>
            <span style={{ fontWeight: 'bold', fontSize: '11pt' }}>{bundle.quantity}件</span>
          </div>
          {bundle.cutting_orders?.bed_number && (
            <div style={{ display: 'flex' }}>
              <span style={{ width: '10mm' }}>床次:</span>
              <span style={{ fontWeight: 'bold' }}>
                {bundle.cutting_orders.bed_number}/{bundle.cutting_orders.total_beds || '?'}
              </span>
            </div>
          )}
        </div>

        {/* 右侧二维码 */}
        <div style={{ 
          width: '15mm',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <QRCodeSVG 
            value={qrData}
            size={50}
            level="L"
            style={{ border: '1px solid #ccc' }}
          />
          <div style={{ fontSize: '6pt', marginTop: '0.5mm' }}>
            {bundle.bundle_no}
          </div>
        </div>
      </div>

      {/* 二次工艺备注 */}
      {craftNotes && (
        <div style={{ 
          borderTop: '1px dashed #999',
          marginTop: '1mm',
          paddingTop: '0.5mm',
          fontSize: '7pt',
          color: '#333',
          maxHeight: '12mm',
          overflow: 'hidden',
        }}>
          <div style={{ fontWeight: 'bold' }}>二次工艺:</div>
          <div style={{ wordBreak: 'break-all' }}>{craftNotes}</div>
        </div>
      )}

      {/* 底部条码 */}
      <div style={{ 
        borderTop: '1px solid #000',
        marginTop: 'auto',
        paddingTop: '0.5mm',
        textAlign: 'center',
        fontFamily: 'monospace',
        fontSize: '7pt',
      }}>
        *{bundle.bundle_no}*
      </div>
    </div>
  );
});

TicketCard.displayName = 'TicketCard';

export default function PrintTickets({
  open,
  onOpenChange,
  bundles,
  craftProcesses = [],
}: PrintTicketsProps) {
  const [printMode, setPrintMode] = useState<'single' | 'batch'>('batch');
  const [selectedBundleId, setSelectedBundleId] = useState<string>('');
  const [copiesPerBundle, setCopiesPerBundle] = useState(1);

  // 获取二次工艺备注
  const getCraftNotes = (bundle: BundleInfo): string => {
    const processes = craftProcesses.filter(
      p => p.status !== 'completed' && p.notes
    );
    if (processes.length === 0) return '';
    return processes.map(p => `${p.process_name}${p.notes ? `(${p.notes})` : ''}`).join(', ');
  };

  // 获取要打印的扎包列表
  const getPrintBundles = (): BundleInfo[] => {
    if (printMode === 'single' && selectedBundleId) {
      const bundle = bundles.find(b => b.id === selectedBundleId);
      return bundle ? Array(copiesPerBundle).fill(bundle) : [];
    }
    // 批量打印：按单号分组
    return bundles.flatMap(bundle => Array(copiesPerBundle).fill(bundle));
  };

  // 打印处理
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('请允许弹出窗口以进行打印');
      return;
    }

    const printBundles = getPrintBundles();
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>打印工票</title>
        <style>
          @page {
            size: 40mm 60mm;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-start;
          }
          .ticket-card {
            width: 40mm;
            height: 60mm;
            page-break-after: always;
            border: 1px solid #000;
            box-sizing: border-box;
            padding: 2mm;
            display: flex;
            flex-direction: column;
            font-family: SimHei, Arial, sans-serif;
            font-size: 8pt;
            background: #fff;
          }
          .ticket-title {
            text-align: center;
            font-weight: bold;
            font-size: 10pt;
            border-bottom: 1px solid #000;
            padding-bottom: 1mm;
            margin-bottom: 1mm;
          }
          .ticket-content {
            display: flex;
            gap: 2mm;
            flex: 1;
          }
          .ticket-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.5mm;
          }
          .ticket-info-row {
            display: flex;
          }
          .ticket-label {
            width: 10mm;
          }
          .ticket-value {
            font-weight: bold;
          }
          .ticket-value-large {
            font-weight: bold;
            font-size: 11pt;
          }
          .ticket-qr {
            width: 15mm;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .ticket-qr-text {
            font-size: 6pt;
            margin-top: 0.5mm;
          }
          .ticket-craft {
            border-top: 1px dashed #999;
            margin-top: 1mm;
            padding-top: 0.5mm;
            font-size: 7pt;
            color: #333;
            max-height: 12mm;
            overflow: hidden;
          }
          .ticket-craft-title {
            font-weight: bold;
          }
          .ticket-craft-content {
            word-break: break-all;
          }
          .ticket-footer {
            border-top: 1px solid #000;
            margin-top: auto;
            padding-top: 0.5mm;
            text-align: center;
            font-family: monospace;
            font-size: 7pt;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
    `);

    printBundles.forEach((bundle) => {
      const craftNotes = getCraftNotes(bundle);
      const qrData = JSON.stringify({
        bundleId: bundle.id,
        bundleNo: bundle.bundle_no,
        qty: bundle.quantity,
        orderNo: bundle.cutting_orders?.order_no || bundle.production_orders?.order_no || '',
      });

      printWindow.document.write(`
        <div class="ticket-card">
          <div class="ticket-title">生产工票</div>
          <div class="ticket-content">
            <div class="ticket-info">
              <div class="ticket-info-row">
                <span class="ticket-label">单号:</span>
                <span class="ticket-value" style="font-size:9pt">${bundle.cutting_orders?.order_no || bundle.production_orders?.order_no || '-'}</span>
              </div>
              <div class="ticket-info-row">
                <span class="ticket-label">款号:</span>
                <span class="ticket-value">${bundle.cutting_orders?.style_no || bundle.production_orders?.style_no || '-'}</span>
              </div>
              <div class="ticket-info-row">
                <span class="ticket-label">扎号:</span>
                <span class="ticket-value-large">${bundle.bundle_no}</span>
              </div>
              <div class="ticket-info-row">
                <span class="ticket-label">颜色:</span>
                <span>${bundle.color}</span>
              </div>
              <div class="ticket-info-row">
                <span class="ticket-label">尺码:</span>
                <span class="ticket-value">${bundle.size}</span>
              </div>
              <div class="ticket-info-row">
                <span class="ticket-label">数量:</span>
                <span class="ticket-value-large">${bundle.quantity}件</span>
              </div>
              ${bundle.cutting_orders?.bed_number ? `
              <div class="ticket-info-row">
                <span class="ticket-label">床次:</span>
                <span class="ticket-value">${bundle.cutting_orders.bed_number}/${bundle.cutting_orders.total_beds || '?'}</span>
              </div>
              ` : ''}
            </div>
            <div class="ticket-qr">
              <svg viewBox="0 0 100 100" width="50" height="50">
                <rect x="0" y="0" width="100" height="100" fill="white"/>
                <!-- 简化QR码占位符 -->
                <rect x="10" y="10" width="25" height="25" fill="black"/>
                <rect x="65" y="10" width="25" height="25" fill="black"/>
                <rect x="10" y="65" width="25" height="25" fill="black"/>
                <rect x="40" y="40" width="20" height="20" fill="black"/>
              </svg>
              <div class="ticket-qr-text">${bundle.bundle_no}</div>
            </div>
          </div>
          ${craftNotes ? `
          <div class="ticket-craft">
            <div class="ticket-craft-title">二次工艺:</div>
            <div class="ticket-craft-content">${craftNotes}</div>
          </div>
          ` : ''}
          <div class="ticket-footer">*${bundle.bundle_no}*</div>
        </div>
      `);
    });

    printWindow.document.write(`
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // 按单号分组的扎包统计
  const groupedByOrder = bundles.reduce((acc, bundle) => {
    const orderNo = bundle.cutting_orders?.order_no || bundle.production_orders?.order_no || '未知';
    if (!acc[orderNo]) {
      acc[orderNo] = { bundles: [], totalQty: 0 };
    }
    acc[orderNo].bundles.push(bundle);
    acc[orderNo].totalQty += bundle.quantity;
    return acc;
  }, {} as Record<string, { bundles: BundleInfo[]; totalQty: number }>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            打菲（批量打印工票）
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">
              <FileText className="h-4 w-4 mr-2" />
              打印设置
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              预览
            </TabsTrigger>
          </TabsList>

          {/* 打印设置标签页 */}
          <TabsContent value="settings" className="space-y-4 py-4">
            {/* 打印模式选择 */}
            <div className="space-y-2">
              <Label>打印模式</Label>
              <Select value={printMode} onValueChange={(v: 'single' | 'batch') => setPrintMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="batch">批量打印（按单号）</SelectItem>
                  <SelectItem value="single">单扎打印</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 单扎打印时选择扎号 */}
            {printMode === 'single' && (
              <div className="space-y-2">
                <Label>选择扎号</Label>
                <Select value={selectedBundleId} onValueChange={setSelectedBundleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择要打印的扎号" />
                  </SelectTrigger>
                  <SelectContent>
                    {bundles.map(bundle => (
                      <SelectItem key={bundle.id} value={bundle.id}>
                        {bundle.bundle_no} - {bundle.size} - {bundle.quantity}件
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 每扎打印份数 */}
            <div className="space-y-2">
              <Label>每扎打印份数</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={copiesPerBundle}
                onChange={(e) => setCopiesPerBundle(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
              />
              <p className="text-sm text-muted-foreground">建议每扎打印1-2份</p>
            </div>

            {/* 打印预览统计 */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                打印统计
              </h4>
              {printMode === 'batch' ? (
                <div className="space-y-2">
                  {Object.entries(groupedByOrder).map(([orderNo, data]) => (
                    <div key={orderNo} className="flex justify-between items-center text-sm">
                      <span>单号 {orderNo}</span>
                      <span className="font-medium">
                        {data.bundles.length}扎 × {copiesPerBundle}份 = {data.bundles.length * copiesPerBundle}张
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t flex justify-between font-bold">
                    <span>总计</span>
                    <span>{bundles.length * copiesPerBundle}张工票</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm">
                  {selectedBundleId && (
                    <div className="flex justify-between">
                      <span>已选扎号</span>
                      <span>{bundles.find(b => b.id === selectedBundleId)?.bundle_no}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                    <span>将打印</span>
                    <span>{copiesPerBundle}张工票</span>
                  </div>
                </div>
              )}
            </div>

            {/* 工票规格说明 */}
            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
              <div className="font-medium mb-1">工票规格</div>
              <ul className="space-y-1 list-disc list-inside">
                <li>尺寸: 40mm × 60mm</li>
                <li>包含: 单号、款号、扎号、颜色、尺码、数量、床次</li>
                <li>二维码: 扫码可查看扎包详情</li>
                <li>二次工艺备注: 显示未完成的二次工艺信息</li>
              </ul>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handlePrint} disabled={printMode === 'single' && !selectedBundleId}>
                <Printer className="h-4 w-4 mr-2" />
                打印 {printMode === 'batch' ? bundles.length * copiesPerBundle : copiesPerBundle} 张
              </Button>
            </div>
          </TabsContent>

          {/* 预览标签页 */}
          <TabsContent value="preview" className="py-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                预览前 3 张工票效果（实际打印尺寸为 40mm × 60mm）
              </div>
              
              <div className="flex flex-wrap gap-4 justify-center bg-gray-100 p-4 rounded-lg">
                {getPrintBundles().slice(0, 3).map((bundle, index) => (
                  <div 
                    key={`${bundle.id}-${index}`}
                    className="bg-white shadow-lg"
                    style={{
                      width: '120px', // 放大显示
                      height: '180px',
                      padding: '6px',
                      border: '1px solid #000',
                      display: 'flex',
                      flexDirection: 'column',
                      fontSize: '7pt',
                    }}
                  >
                    <div style={{ 
                      textAlign: 'center', 
                      fontWeight: 'bold',
                      fontSize: '8pt',
                      borderBottom: '1px solid #000',
                      paddingBottom: '2px',
                      marginBottom: '2px',
                    }}>
                      生产工票
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flex: 1, fontSize: '6pt' }}>
                      <div style={{ flex: 1 }}>
                        <div>单号: {bundle.cutting_orders?.order_no || '-'}</div>
                        <div>款号: {bundle.cutting_orders?.style_no || '-'}</div>
                        <div style={{ fontWeight: 'bold' }}>扎号: {bundle.bundle_no}</div>
                        <div>颜色: {bundle.color}</div>
                        <div>尺码: {bundle.size}</div>
                        <div style={{ fontWeight: 'bold' }}>数量: {bundle.quantity}件</div>
                        {bundle.cutting_orders?.bed_number && (
                          <div>床次: {bundle.cutting_orders.bed_number}/{bundle.cutting_orders.total_beds || '?'}</div>
                        )}
                      </div>
                      <div style={{ width: '50px', textAlign: 'center' }}>
                        <QRCodeSVG 
                          value={JSON.stringify({
                            bundleId: bundle.id,
                            bundleNo: bundle.bundle_no,
                            qty: bundle.quantity,
                          })}
                          size={40}
                          level="L"
                        />
                        <div style={{ fontSize: '5pt', marginTop: '2px' }}>
                          {bundle.bundle_no}
                        </div>
                      </div>
                    </div>
                    <div style={{ 
                      borderTop: '1px solid #000',
                      marginTop: 'auto',
                      paddingTop: '2px',
                      textAlign: 'center',
                      fontSize: '5pt',
                    }}>
                      *{bundle.bundle_no}*
                    </div>
                  </div>
                ))}
              </div>

              {getPrintBundles().length > 3 && (
                <p className="text-center text-sm text-muted-foreground">
                  还有 {getPrintBundles().length - 3} 张工票未显示
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button onClick={handlePrint} disabled={printMode === 'single' && !selectedBundleId}>
                  <Printer className="h-4 w-4 mr-2" />
                  打印 {printMode === 'batch' ? bundles.length * copiesPerBundle : copiesPerBundle} 张
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
