'use client'

import { ToastProvider } from '@/components/ui/toast'
import { ProfileProvider } from '@/lib/context/profile-context'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { MobileNav } from './mobile-nav'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ProfileProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen">
            <Topbar />
            <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 overflow-y-auto">
              {children}
            </main>
            <MobileNav />
          </div>
        </div>
      </ProfileProvider>
    </ToastProvider>
  )
}
