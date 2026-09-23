import CheckoutSuccessClient from "@/components/pages/billing/success/CheckoutSuccessClient";

interface Props {
  searchParams: Promise<{
    tenantId?: string;
    session_id?: string;
  }>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <CheckoutSuccessClient
      tenantId={params.tenantId ?? null}
      sessionId={params.session_id ?? null}
    />
  );
}
