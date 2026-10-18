"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ErrorState, LoadingState } from "@/components/async-state";
import { BrandLogo } from "@/components/brand-logo";
import { useSession } from "@/components/session-provider";
import { ui } from "@/lib/ui";

const InsightsPanel = dynamic(() =>
  import("@/features/insights-panel").then((module) => module.InsightsPanel),
);
const CatalogPanel = dynamic(() =>
  import("@/features/catalog-panel").then((module) => module.CatalogPanel),
);
const CirculationPanel = dynamic(() =>
  import("@/features/circulation-panel").then(
    (module) => module.CirculationPanel,
  ),
);
const FinancePanel = dynamic(() =>
  import("@/features/finance-panel").then((module) => module.FinancePanel),
);
const EngagementPanel = dynamic(() =>
  import("@/features/engagement-panel").then(
    (module) => module.EngagementPanel,
  ),
);
const AccountsPanel = dynamic(() =>
  import("@/features/accounts-panel").then((module) => module.AccountsPanel),
);

type Section =
  | "accounts"
  | "catalog"
  | "circulation"
  | "engagement"
  | "finance"
  | "overview";

export function DashboardShell() {
  const router = useRouter();
  const session = useSession();
  const [section, setSection] = useState<Section>("overview");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (session.phase === "signed-out") router.replace("/");
  }, [router, session.phase]);

  if (session.phase === "checking" || session.phase === "waking")
    return (
      <main id="main-content" className={ui.centerPage}>
        <LoadingState waking={session.phase === "waking"} />
      </main>
    );
  if (session.phase === "unavailable" && session.error)
    return (
      <main id="main-content" className={ui.centerPage}>
        <ErrorState error={session.error} retry={session.refresh} />
      </main>
    );
  if (!session.principal) return null;

  const navigation: { id: Section; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "catalog", label: "Catalog" },
    { id: "circulation", label: "Loans & reservations" },
    { id: "finance", label: "Fines" },
    { id: "engagement", label: "Requests & feedback" },
  ];
  if (session.principal.role === "administrator")
    navigation.push({ id: "accounts", label: "Accounts" });

  const content = {
    overview: <InsightsPanel principal={session.principal} />,
    catalog: <CatalogPanel principal={session.principal} />,
    circulation: <CirculationPanel principal={session.principal} />,
    finance: <FinancePanel principal={session.principal} />,
    engagement: <EngagementPanel principal={session.principal} />,
    accounts: <AccountsPanel />,
  }[section];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3 min-[761px]:hidden">
        <BrandLogo compact />
        <button
          className={`${ui.button} ${ui.secondary}`}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="dashboard-navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          Menu
        </button>
      </header>
      <aside
        className={`fixed inset-y-0 left-0 z-20 flex w-[260px] flex-col justify-between border-r border-border bg-surface/97 px-5 pt-[30px] pb-[22px] max-[760px]:top-[69px] max-[760px]:w-[min(86vw,320px)] motion-safe:transition-transform motion-safe:duration-180 ${menuOpen ? "max-[760px]:translate-x-0" : "max-[760px]:-translate-x-[105%]"}`}
        id="dashboard-navigation"
      >
        <div>
          <BrandLogo className="max-[760px]:hidden" />
          <nav
            className="mt-[46px] grid gap-[5px] max-[760px]:mt-0"
            aria-label="Dashboard sections"
          >
            {navigation.map((item) => (
              <button
                key={item.id}
                className="rounded-[11px] border-0 bg-transparent px-3 py-[11px] text-left text-muted aria-[current=page]:bg-accent/12 aria-[current=page]:font-bold aria-[current=page]:text-accent-strong"
                type="button"
                aria-current={section === item.id ? "page" : undefined}
                onClick={() => {
                  setSection(item.id);
                  setMenuOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-1 border-t border-border pt-[18px]">
          <span
            className="row-span-2 grid size-[38px] place-items-center rounded-full bg-foreground font-[750] text-background"
            aria-hidden="true"
          >
            {session.principal.display_name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong className="block font-bold">
              {session.principal.display_name}
            </strong>
            <small className="mt-0.5 block text-muted capitalize">
              {session.principal.role}
            </small>
          </div>
          <button
            className={`${ui.textButton} col-start-2 justify-self-start pl-0 text-xs`}
            type="button"
            onClick={() => void session.logout()}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main
        id="main-content"
        className="ml-[260px] w-[min(1180px,calc(100%-260px))] p-[clamp(32px,6vw,72px)] max-[760px]:m-0 max-[760px]:w-full max-[760px]:px-[18px] max-[760px]:pt-[34px] max-[760px]:pb-[60px]"
        tabIndex={-1}
      >
        <div className="mb-[30px] flex justify-between gap-3.5 border-b border-border pb-[18px] font-mono text-[0.63rem] tracking-[0.02em] text-muted">
          <span>CataNova workspace</span>
          <span className="max-[760px]:hidden">Catalog. Manage. Discover.</span>
        </div>
        {content}
      </main>
    </div>
  );
}
