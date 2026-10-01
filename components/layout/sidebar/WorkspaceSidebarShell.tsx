import type { ReactNode } from "react";

import { TopBar } from "@/components/layout/TopBar";
import { WorkspaceSidebar } from "@/components/layout/sidebar/WorkspaceSidebar";

export function WorkspaceSidebarShell({
  subdomain,
  workspaceName,
  children,
}: {
  subdomain: string;
  workspaceName: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-canvas">
      <WorkspaceSidebar subdomain={subdomain} workspaceName={workspaceName} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar workspaceName={subdomain} />
        <main className="flex-1 overflow-y-auto bg-canvas">{children}</main>
      </div>
    </div>
  );
}
