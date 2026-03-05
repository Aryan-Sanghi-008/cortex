/**
 * Payment Gateway — Stripe integration + abstract gateway interface.
 */

import { logger } from "../utils/logger.js";

export interface PaymentResult {
  sessionId: string;
  checkoutUrl: string;
  status: "pending" | "paid" | "failed";
}

export interface CostBreakdown {
  llmCost: number;       // LLM token cost in cents
  deployFee: number;     // flat deployment fee in cents
  platformCost: number;  // monthly platform cost in cents (first month)
  totalCents: number;
  totalFormatted: string;
  items: Array<{ label: string; amount: string }>;
}

/**
 * Calculate total project cost.
 */
export function calculateCost(
  llmCostUsd: number,
  platform: string = "vercel",
  complexity: "simple" | "medium" | "complex" = "medium"
): CostBreakdown {
  const llmCents = Math.ceil(llmCostUsd * 100);
  const deployFee = 200; // $2 flat

  const platformCosts: Record<string, Record<string, number>> = {
    vercel: { simple: 0, medium: 0, complex: 2000 },
    railway: { simple: 500, medium: 1000, complex: 2000 },
    render: { simple: 0, medium: 700, complex: 2500 },
  };

  const platformCost = platformCosts[platform]?.[complexity] ?? 0;
  const totalCents = llmCents + deployFee + platformCost;

  const items: Array<{ label: string; amount: string }> = [
    { label: "AI Code Generation", amount: `$${(llmCents / 100).toFixed(2)}` },
    { label: "Deployment Setup", amount: `$${(deployFee / 100).toFixed(2)}` },
  ];

  if (platformCost > 0) {
    items.push({ label: `Hosting (${platform}, first month)`, amount: `$${(platformCost / 100).toFixed(2)}` });
  } else {
    items.push({ label: `Hosting (${platform})`, amount: "Free" });
  }

  return {
    llmCost: llmCents,
    deployFee,
    platformCost,
    totalCents,
    totalFormatted: `$${(totalCents / 100).toFixed(2)}`,
    items,
  };
}

/**
 * Abstract Payment Gateway.
 */
export interface PaymentGateway {
  createCheckout(
    projectId: string,
    costBreakdown: CostBreakdown,
    successUrl: string,
    cancelUrl: string
  ): Promise<PaymentResult>;
}

/**
 * Stripe Gateway — uses Stripe Checkout Sessions.
 */
export class StripeGateway implements PaymentGateway {
  private secretKey: string;

  constructor(secretKey?: string) {
    this.secretKey = secretKey ?? process.env.STRIPE_SECRET_KEY ?? "";
  }

  async createCheckout(
    projectId: string,
    costBreakdown: CostBreakdown,
    successUrl: string,
    cancelUrl: string
  ): Promise<PaymentResult> {
    if (!this.secretKey) {
      logger.warn("[Payment] STRIPE_SECRET_KEY not set");
      return { sessionId: "", checkoutUrl: "", status: "failed" };
    }

    try {
      const lineItems = costBreakdown.items
        .filter((i) => !i.amount.includes("Free"))
        .map((item) => ({
          price_data: {
            currency: "usd",
            product_data: { name: item.label },
            unit_amount: Math.round(parseFloat(item.amount.replace("$", "")) * 100),
          },
          quantity: 1,
        }));

      const body = new URLSearchParams();
      body.append("mode", "payment");
      body.append("success_url", `${successUrl}?session_id={CHECKOUT_SESSION_ID}`);
      body.append("cancel_url", cancelUrl);
      body.append("metadata[projectId]", projectId);

      lineItems.forEach((item, i) => {
        body.append(`line_items[${i}][price_data][currency]`, item.price_data.currency);
        body.append(`line_items[${i}][price_data][product_data][name]`, item.price_data.product_data.name);
        body.append(`line_items[${i}][price_data][unit_amount]`, String(item.price_data.unit_amount));
        body.append(`line_items[${i}][quantity]`, "1");
      });

      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(this.secretKey + ":").toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Stripe error: ${res.status} ${err}`);
      }

      const session = (await res.json()) as { id: string; url: string };

      logger.info(`[Payment] Checkout created: ${session.id}`);

      return {
        sessionId: session.id,
        checkoutUrl: session.url,
        status: "pending",
      };
    } catch (err) {
      logger.error("[Payment] Checkout failed", err);
      return { sessionId: "", checkoutUrl: "", status: "failed" };
    }
  }

  /**
   * Create a Stripe Checkout Session for project download — fixed ₹100 INR.
   */
  async createDownloadCheckout(
    projectId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<PaymentResult> {
    if (!this.secretKey) {
      logger.warn("[Payment] STRIPE_SECRET_KEY not set — skipping payment, marking as paid");
      // Dev mode: auto-approve if no key set
      return { sessionId: "dev-mode", checkoutUrl: "", status: "paid" };
    }

    try {
      const body = new URLSearchParams();
      body.append("mode", "payment");
      body.append("success_url", `${successUrl}?session_id={CHECKOUT_SESSION_ID}`);
      body.append("cancel_url", cancelUrl);
      body.append("metadata[projectId]", projectId);
      body.append("metadata[type]", "download");
      // Fixed ₹100 INR = 10000 paise
      body.append("line_items[0][price_data][currency]", "inr");
      body.append("line_items[0][price_data][product_data][name]", "Cortex Project Download");
      body.append("line_items[0][price_data][product_data][description]", `Full source code for project ${projectId}`);
      body.append("line_items[0][price_data][unit_amount]", "10000");
      body.append("line_items[0][quantity]", "1");

      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(this.secretKey + ":").toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Stripe error: ${res.status} ${err}`);
      }

      const session = (await res.json()) as { id: string; url: string };
      logger.info(`[Payment] Download checkout created: ${session.id} (₹100 INR)`);

      return {
        sessionId: session.id,
        checkoutUrl: session.url,
        status: "pending",
      };
    } catch (err) {
      logger.error("[Payment] Download checkout failed", err);
      return { sessionId: "", checkoutUrl: "", status: "failed" };
    }
  }
}
