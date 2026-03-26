import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';

export const metadata: Metadata = {
  title: {
    default: '服装生产管理系统',
    template: '%s | 服装ERP',
  },
  description:
    '专业的服装生产管理系统，涵盖生产、仓库、财务、采购、人事等全流程管理',
  keywords: [
    '服装ERP',
    '生产管理',
    '仓库管理',
    '财务管理',
    '采购管理',
    '人事管理',
  ],
  authors: [{ name: 'ERP Team' }],
  generator: 'Coze Code',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {isDev ? (
            <>
              <Inspector />
              <AppLayout>{children}</AppLayout>
            </>
          ) : (
            <AppLayout>{children}</AppLayout>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
