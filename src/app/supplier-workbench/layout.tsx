import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '供应商工作台',
  description: '供应商订单管理、发货、财务对账',
};

// 供应商工作台使用独立布局，不使用主系统的侧边栏
export default function SupplierWorkbenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
