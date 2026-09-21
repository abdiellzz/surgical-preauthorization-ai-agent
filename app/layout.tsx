import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { authorize } from '@/lib/security/session';
import { dataSource } from '@/lib/security/config';
import { AppShell } from '@/components/app-shell';
import '@fontsource-variable/inter';
import './globals.css';
export const metadata: Metadata = {
  title: 'PreAuth | Surgical Pre-Authorization',
  description: 'Administrative pre-authorization workspace. Fictional hackathon data only.',
};
export const dynamic = 'force-dynamic';
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const demo = dataSource() === 'demo';
  if (!demo && requestHeaders.get('x-route-path') !== '/login') {
    try {
      await authorize(requestHeaders);
    } catch {
      redirect('/login');
    }
  }
  return (
    <html lang="en">
      <body>
        <AppShell demo={demo}>{children}</AppShell>
      </body>
    </html>
  );
}
