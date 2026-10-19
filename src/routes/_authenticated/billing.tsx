import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, ArrowLeft, Shield, Zap, CreditCard, Crown, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PLANS as SUBSCRIPTION_PLANS,
  RAZORPAY_KEY,
  getActiveSubscription,
  cancelSubscription,
} from "@/lib/subscription";
import { UpgradeModal } from "@/components/upgrade-modal";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Subscription & Billing — Myaipro" },
      { name: "description", content: "Upgrade your Myaipro subscription plan with Razorpay secure checkout." },
    ],
  }),
  component: BillingPage,
});

const PLANS = [
  {
    id: "starter",
    name: "Starter Plan",
    priceINR: 59,
    period: "month",
    description: "All free trial features doubled (2x). Perfect for casual creators.",
    features: [
      "⚡ 10 No-Code Credits (2x Doubled)",
      "🎙️ 60 Mins Voice Speaking (2x Doubled)",
      "📊 4 Slide Presentations (2x Doubled)",
      "🔬 2 Deep Researches / day (2x Doubled)",
      "Standard neural code & chat access",
    ],
    popular: false,
    badge: "2x Doubled",
  },
  {
    id: "pro",
    name: "Pro Plan",
    priceINR: 199,
    period: "month",
    description: "All free trial features multiplied 5x. Ideal for developers and builders.",
    features: [
      "⚡ 25 No-Code Credits (5x Multiplier)",
      "🎙️ 150 Mins Voice Speaking (2.5 hrs, 5x)",
      "📊 10 Slide Presentations (5x)",
      "🔬 5 Deep Researches / day (5x)",
      "Slide maker with Studio Ghibli anime art",
      "High-speed flash neural engines",
    ],
    popular: true,
    badge: "5x Multiplier",
  },
  {
    id: "enterprise",
    name: "Enterprise Plan",
    priceINR: 299,
    period: "month",
    description: "All free trial features multiplied 10x with GitHub private repo sync.",
    features: [
      "⚡ 50 No-Code Credits (10x Multiplier)",
      "🎙️ 300 Mins Voice Speaking (5 hrs, 10x)",
      "📊 20 Slide Presentations (10x)",
      "🔬 10 Deep Researches / day (10x)",
      "GitHub private repository import & sync",
      "Priority queue & zero throttling",
    ],
    popular: false,
    badge: "10x Multiplier",
  },
  {
    id: "ultimate",
    name: "Ultimate Pass",
    priceINR: 599,
    period: "month / VIP",
    description: "All free trial features multiplied 20x with unrestricted VIP clusters.",
    features: [
      "⚡ 100 No-Code Credits (20x Multiplier)",
      "🎙️ 600 Mins Voice Speaking (10 hrs, 20x)",
      "📊 40 Slide Presentations (20x)",
      "🔬 20 Deep Researches / day (20x)",
      "Unrestricted VIP engineering cluster",
      "Dedicated multi-agent researcher",
    ],
    popular: false,
    badge: "20x Multiplier",
  },
];

function BillingPage() {
  const [selectedPlanId, setSelectedPlanId] = useState<string>("pro");
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  const loadSub = () => {
    const sub = getActiveSubscription();
    if (sub) {
      setActiveSubscription(sub);
    }
  };

  useEffect(() => {
    loadSub();
    const handleSubUpdated = () => loadSub();
    window.addEventListener("myaipro_subscription_updated", handleSubUpdated);
    return () => {
      window.removeEventListener("myaipro_subscription_updated", handleSubUpdated);
    };
  }, []);

  const handleOpenCheckout = (planId: string) => {
    setSelectedPlanId(planId);
    setCheckoutModalOpen(true);
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-canvas font-sans text-ink selection:bg-brand selection:text-white">
      {/* Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 bg-surface/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            to="/build"
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink transition"
          >
            <ArrowLeft className="size-4" /> Back to App
          </Link>
          <span className="text-border">/</span>
          <span className="text-xs font-bold text-brand uppercase tracking-wider">Myaipro Subscriptions</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-600 border border-emerald-500/30">
            <Shield className="size-3.5" /> Razorpay Secured ({RAZORPAY_KEY})
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-1.5 text-xs font-bold text-brand">
              <Crown className="size-4" /> Upgrade Your Workspace
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
              Myaipro Flexible Plans
            </h1>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground">
              Choose the plan that fits your workflow. Powered by Razorpay secure UPI &amp; Cards starting from ₹59.
            </p>
          </div>

          {activeSubscription && (
            <div className="rounded-3xl border border-brand/40 bg-surface p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-brand text-brand-foreground flex items-center justify-center font-bold">
                  <Star className="size-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand">Active Subscription</span>
                  <h3 className="font-serif text-xl font-bold text-ink">{activeSubscription.planName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Activated on {new Date(activeSubscription.activatedAt).toLocaleDateString()} • Payment ID: <span className="font-mono">{activeSubscription.paymentId}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/15 px-4 py-1.5 text-xs font-bold text-emerald-600 border border-emerald-500/30">
                  Active &amp; Verified
                </span>
                <button
                  type="button"
                  onClick={() => {
                    cancelSubscription();
                    setActiveSubscription(null);
                    toast.info("Subscription cancelled. Returned to Free tier.");
                  }}
                  className="rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer"
                  title="Reset subscription to Free Tier"
                >
                  Reset to Free Tier
                </button>
              </div>
            </div>
          )}

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => {
              const isCurrent = activeSubscription?.planId === plan.id;
              const isSelected = selectedPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-3xl border p-6 transition-all duration-300 cursor-pointer bg-surface",
                    plan.popular
                      ? "border-brand shadow-xl ring-2 ring-brand/20 scale-[1.02]"
                      : isSelected
                        ? "border-brand/80 shadow-md"
                        : "border-border/60 hover:border-brand/40 hover:shadow-md",
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-foreground shadow-sm">
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {plan.name}
                      </span>
                      {!plan.popular && (
                        <span className="rounded-full bg-canvas px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/50">
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="font-serif text-3xl font-bold text-ink">₹{plan.priceINR}</span>
                      <span className="text-xs text-muted-foreground">/ {plan.period}</span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                      {plan.description}
                    </p>

                    <ul className="space-y-2.5 mb-6 border-t border-border/40 pt-4">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-ink">
                          <Check className="size-4 shrink-0 text-brand mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCheckout(plan.id);
                    }}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold transition shadow-sm cursor-pointer",
                      isCurrent
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : plan.popular
                          ? "bg-brand text-brand-foreground hover:opacity-90 shadow-md"
                          : "bg-ink text-white hover:bg-black",
                    )}
                  >
                    {isCurrent ? (
                      <>
                        <Check className="size-4" /> Current Plan
                      </>
                    ) : (
                      <>
                        <CreditCard className="size-4" /> Pay ₹{plan.priceINR} with Razorpay
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="rounded-3xl border border-border/60 bg-surface p-6 text-center space-y-2 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Myaipro Enterprise Clusters</h4>
            <p className="text-sm text-ink font-medium">
              Supported payment methods: UPI (Google Pay, PhonePe, Paytm, BHIM), RuPay, Visa, Mastercard, NetBanking.
            </p>
          </div>
        </div>
      </div>

      {/* Embedded Upgrade & Checkout Modal */}
      <UpgradeModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        initialPlanId={selectedPlanId}
        onSuccess={() => {
          loadSub();
        }}
      />
    </div>
  );
}
