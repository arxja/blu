import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { getCurrentUser } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/database/mongoose";
import Tenant from "@/lib/database/models/tenant.model";
import Membership from "@/lib/database/models/membership.model";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { priceId } = await req.json();
    const tenantId = user.tenantId;

    await connectDB();

    const membership = await Membership.findOne({
      userId: user.userId,
      tenantId,
      role: "owner",
      isActive: true,
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Only tenant owners can manage subscriptions" },
        { status: 403 },
      );
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    let planType = "pro";
    if (priceId === process.env.NEXT_PUBLIC_ENTERPRISE_PRICE_ID) {
      planType = "enterprise";
    }

    // Create or get Stripe customer
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.billingEmail,
        name: tenant.companyName,
        metadata: {
          tenantId: tenant._id.toString(),
          companyName: tenant.companyName,
          subdomain: tenant.subdomain,
        },
      });
      customerId = customer.id;
      await Tenant.findByIdAndUpdate(tenant._id, {
        stripeCustomerId: customerId,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${tenant.subdomain}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${tenant.subdomain}/settings/billing?canceled=true`,
      metadata: {
        tenantId: tenant._id.toString(),
        plan: planType,
        ownerId: user.userId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout" },
      { status: 500 },
    );
  }
}
