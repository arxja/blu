import { requireTenantContext } from "@/lib/tenancy/tenant-context";

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

  await requireTenantContext(subdomain);

  return children;
}
