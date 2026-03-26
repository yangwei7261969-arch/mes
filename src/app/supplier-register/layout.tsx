import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '供应商注册',
  description: '供应商入驻申请',
};

// 供应商注册页使用独立布局
export default function SupplierRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
