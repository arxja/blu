import { PLANS } from "@/lib/constants";
import PricingShell from "./PricingShell";

const PricingSection = () => {
  const checkoutBaseUrl = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL;
  const plans = [...PLANS];

  return <PricingShell plans={plans} checkoutBaseUrl={checkoutBaseUrl} />;
};

export default PricingSection;
