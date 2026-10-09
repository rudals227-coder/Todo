import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tika',
  description: '1인 사용자용 칸반 TODO 앱',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
