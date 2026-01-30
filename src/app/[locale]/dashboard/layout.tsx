"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

const DEFAULT_SIDEBAR_WIDTH = 256;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);

  useEffect(() => {
    // Load initial width from localStorage
    const savedWidth = localStorage.getItem("sidebarWidth");
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth, 10));
    }

    // Listen for sidebar resize events
    const handleResize = (e: CustomEvent<{ width: number }>) => {
      setSidebarWidth(e.detail.width);
    };

    window.addEventListener("sidebarResize", handleResize as EventListener);

    return () => {
      window.removeEventListener("sidebarResize", handleResize as EventListener);
    };
  }, []);

  return (
    <WorkspaceProvider>
      <div className="min-h-screen bg-dashboard-background">
        <Sidebar />
        <main
          style={{ paddingLeft: `${sidebarWidth}px` }}
          className="transition-[padding-left] duration-0"
        >
          <div className="p-8">{children}</div>
        </main>
      </div>
    </WorkspaceProvider>
  );
}
