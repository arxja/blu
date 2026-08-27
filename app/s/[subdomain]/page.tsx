import { requireTenantContext } from "@/lib/tenancy/tenant-context";

interface TenantHomePageProps {
  params: Promise<{
    subdomain: string;
  }>;
}

export default async function TenantHomePage({ params }: TenantHomePageProps) {
  const { subdomain } = await params;

  const { user, tenant, membership } = await requireTenantContext(subdomain);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">{tenant.companyName}</h1>

      <p className="mt-2">Signed in as {user.name}</p>

      <p className="mt-2">Role: {membership.role}</p>

      <p className="mt-2 text-sm text-slate-500">Tenant: {tenant.subdomain}</p>
    </main>
  );
}
