import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '供应商登录',
  description: '供应商工作台登录入口',
};

// 供应商登录页使用独立布局
export default function SupplierLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
