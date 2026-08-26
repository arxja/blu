import { notFound } from "next/navigation";

import { requireTenantContext } from "@/lib/tenancy/tenant-context";

interface TenantPageProps {
  params: Promise<{
    subdomain: string;
  }>;
}

export default async function TenantHomePage({ params }: TenantPageProps) {
  const { subdomain } = await params;

  const context = await requireTenantContext(subdomain);

  if (!context) {
    notFound();
  }

  const { user, tenant, membership } = context;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">{tenant.companyName}</h1>

      <p className="mt-2">Signed in as {user.name}</p>

      <p className="mt-2">Role: {membership.role}</p>

      <p className="mt-2 text-sm text-slate-500">Tenant: {tenant.subdomain}</p>
    </main>
  );
}
