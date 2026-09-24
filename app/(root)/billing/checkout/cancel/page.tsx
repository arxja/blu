import CheckoutCancelClient from "@/components/pages/billing/cancel/CheckoutCancelClient";

interface Props {
  searchParams: Promise<{
    tenantId?: string;
  }>;
}

export default async function CheckoutCancelPage({ searchParams }: Props) {
  const params = await searchParams;

  return <CheckoutCancelClient tenantId={params.tenantId ?? null} />;
}
