import { WorkspaceSidebarShell } from "@/components/layout/sidebar/WorkspaceSidebarShell";
import { getTenantContext } from "@/lib/tenancy/tenant-context";
import { notFound } from "next/navigation";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    subdomain: string;
  }>;
}

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { subdomain } = await params;

  const ctx = await getTenantContext(subdomain);

  if (!ctx) {
    notFound();
  }

  return (
    <WorkspaceSidebarShell
      subdomain={subdomain}
      workspaceName={ctx.tenant.companyName}
    >
      {children}
    </WorkspaceSidebarShell>
  );
}
