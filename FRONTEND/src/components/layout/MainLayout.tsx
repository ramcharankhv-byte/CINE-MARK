"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/ui/header-with-search";
import { Sidebar } from "./Sidebar";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { cn } from "@/lib/utils";
import { ShaderBackground } from "@/components/ui/shader-background";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <ProtectedRoute>
      <div className="flex h-screen w-full overflow-hidden relative">
        <div className="absolute inset-0 z-0">
          <ShaderBackground />
        </div>
        
        {/* Desktop Sidebar */}
        <aside className={cn(
          "hidden border-r border-white/5 bg-background/20 backdrop-blur-2xl md:flex md:flex-col shrink-0 relative z-20 shadow-2xl transition-all duration-500 overflow-hidden",
          isSidebarCollapsed ? "w-[72px]" : "w-80"
        )}>
          <div className={cn("h-full transition-all duration-500", isSidebarCollapsed ? "w-[72px]" : "w-80")}>
            <Sidebar 
              isCollapsed={isSidebarCollapsed} 
              onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            />
          </div>
        </aside>

        {/* Mobile Sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-80 flex-col border-r border-white/5 bg-background/80 backdrop-blur-2xl transition-transform duration-300 ease-in-out md:hidden shadow-2xl",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex-1 overflow-y-auto">
            <Sidebar />
          </div>
        </aside>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="md:hidden">
            <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          </div>
          <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden bg-transparent relative">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
