'use client';

import './globals.css';
import AppLayout from '../components/layout/AppLayout';
import QueryProvider from '../providers/QueryProvider';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark h-full">
      <body className="bg-[#080C14] text-slate-200 font-sans antialiased h-full flex flex-col min-h-screen overflow-x-hidden select-none">
        <QueryProvider>
          <AppLayout>{children}</AppLayout>
        </QueryProvider>
      </body>
    </html>
  );
}
