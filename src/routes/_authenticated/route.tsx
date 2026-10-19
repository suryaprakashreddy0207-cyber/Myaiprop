import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthProvider, useFirebaseAuth } from "@/lib/auth-context";
import { getActiveUserSession } from "@/lib/user-session";
import { auth } from "@/lib/firebase";
import { Loader2, Sparkles, Crown, Zap, X } from "lucide-react";
import {
  getUserCredits,
  hasProSubscription,
  isFreeUser,
  triggerUpgradeModal,
} from "@/lib/subscription";
import { UpgradeModal } from "@/components/upgrade-modal";

export const Route = createFileRoute("/_authenticated")({
  component: ProtectedRouteLayout,
});

function ProtectedContent() {
  const { isAuthenticated, loading, session } = useFirebaseAuth();
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location.pathname });
  const [mounted, setMounted] = useState(false);

  // Subscription & credits state
  const [credits, setCredits] = useState<number>(5);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [dismissedBanner, setDismissedBanner] = useState<boolean>(false);

  const refreshSubscriptionStatus = () => {
    const cred = getUserCredits();
    const pro = hasProSubscription();
    setCredits(cred);
    setIsPro(pro);
    return { cred, pro };
  };

  useEffect(() => {
    setMounted(true);
    const { cred, pro } = refreshSubscriptionStatus();

    // If free user and credits are finished (0 credits), automatically prompt to upgrade
    if (!pro && cred <= 0) {
      setShowUpgradeModal(true);
    }

    const handleOpenModal = () => {
      setShowUpgradeModal(true);
    };

    const handleCreditsChange = (e: any) => {
      const c = e.detail ?? getUserCredits();
      setCredits(c);
      if (c <= 0 && !hasProSubscription()) {
        setShowUpgradeModal(true);
      }
    };

    const handleSubChange = () => {
      refreshSubscriptionStatus();
      setShowUpgradeModal(false);
    };

    window.addEventListener("myaipro_open_upgrade_modal", handleOpenModal);
    window.addEventListener("myaipro_credits_updated", handleCreditsChange);
    window.addEventListener("myaipro_subscription_updated", handleSubChange);

    return () => {
      window.removeEventListener("myaipro_open_upgrade_modal", handleOpenModal);
      window.removeEventListener("myaipro_credits_updated", handleCreditsChange);
      window.removeEventListener("myaipro_subscription_updated", handleSubChange);
    };
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;

    // Fast synchronous check
    const hasActiveSession = Boolean(getActiveUserSession() || auth.currentUser || session);

    if (!hasActiveSession && !isAuthenticated) {
      // User is not authenticated -> redirect to /auth
      navigate({
        to: "/auth",
      });
    }
  }, [mounted, loading, isAuthenticated, session, navigate, location]);

  const hasLocalSession =
    mounted && typeof window !== "undefined" && Boolean(getActiveUserSession() || auth.currentUser);

  if (loading && !hasLocalSession) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0c0906] font-sans text-stone-100 select-none">
        <div className="relative flex flex-col items-center space-y-4">
          <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 shadow-[0_0_35px_rgba(245,158,11,0.5)] animate-pulse">
            <Sparkles className="size-7 fill-white text-white" />
          </div>
          <div className="flex items-center space-x-2 text-stone-300">
            <Loader2 className="size-4 animate-spin text-amber-400" />
            <span className="text-sm font-medium tracking-wide">
              Authenticating with Myaipro…
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-canvas text-ink">
      {/* Top Free User Status Banner */}
      {!isPro && !dismissedBanner && (
        <div className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-brand/10 via-amber-500/10 to-orange-500/10 border-b border-brand/20 text-xs">
          <div className="flex items-center gap-2">
            <Crown className="size-3.5 text-brand shrink-0" />
            <span>
              {credits > 0 ? (
                <>
                  <span className="font-bold text-ink">Free Tier</span> (₹0):{" "}
                  <span className="font-bold text-brand">{credits} free credits</span> left for Myaipro.
                </>
              ) : (
                <>
                  <span className="font-bold text-red-600">Free Credits Exhausted</span>: Please upgrade for pro to continue unthrottled generation.
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-0.5 text-[11px] font-bold text-white shadow-2xs hover:opacity-90 transition cursor-pointer"
            >
              <Zap className="size-3" /> Please upgrade for pro
            </button>
            <button
              type="button"
              onClick={() => setDismissedBanner(true)}
              className="text-muted-foreground hover:text-ink p-1 transition"
              title="Dismiss banner"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main App Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </div>

      {/* Global Upgrade & Payment Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={() => {
          refreshSubscriptionStatus();
        }}
      />
    </div>
  );
}

function ProtectedRouteLayout() {
  return (
    <AuthProvider>
      <ProtectedContent />
    </AuthProvider>
  );
}
