import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { AuthProvider } from '@/components/auth-provider';
import { Toaster } from '@/components/ui/sonner';
//import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '学习助手 | Study Helper',
    template: '%s | 学习助手',
  },
  description: '一款帮助你记录学习时间、制定学习计划、提醒学习、并可与好友互相监督的学习助手应用',
  keywords: ['学习', '番茄钟', '学习计划', '时间管理', '专注', '监督学习'],
  authors: [{ name: 'Study Helper Team' }],
  other: {
    'google': 'notranslate',
  },
  openGraph: {
    title: '学习助手 | Study Helper',
    description: '一款帮助你记录学习时间、制定学习计划、提醒学习、并可与好友互相监督的学习助手应用',
    locale: 'zh_CN',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN" translate="no">
      <body className="antialiased">
        {isDev && <Inspector />}
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
