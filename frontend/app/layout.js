'use client';

import './globals.css';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import QueryProvider from '../providers/QueryProvider';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark h-full">
      <body className="bg-[#080C14] text-slate-200 font-sans antialiased h-full flex flex-col min-h-screen overflow-x-hidden select-none">
        <QueryProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 bg-[#080C14]">
              <Header />
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
