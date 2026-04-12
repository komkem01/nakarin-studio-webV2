import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminRole } from "../../store/adminSession";
import { adminNavSections, getVisibleSectionsByRole } from "./nav-config";

type AdminSidebarAccordionProps = {
  pathname: string;
  role: AdminRole;
  onLogout: () => void;
};

function sectionByPath(pathname: string, role: AdminRole): string {
  const visibleSections = getVisibleSectionsByRole(role);
  const section = visibleSections.find((sec) => sec.items.some((item) => pathname.startsWith(item.href)));
  return section?.id ?? visibleSections[0]?.id ?? adminNavSections[0].id;
}

export default function AdminSidebarAccordion({ pathname, role, onLogout }: AdminSidebarAccordionProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(sectionByPath(pathname, role));

  const normalized = useMemo(() => pathname.replace(/\/$/, "") || "/", [pathname]);
  const visibleSections = useMemo(() => getVisibleSectionsByRole(role), [role]);

  const sidebarContent = (
    <>
      <div className="border-b border-emerald-800/60 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white p-2 text-emerald-900">
            <span className="text-sm font-black">NS</span>
          </div>
          <div>
            <p className="text-sm font-black tracking-tight text-white">NAKARIN STUDIO</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">admin console</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">เมนูแอดมิน</p>
        <div className="space-y-2">
          {visibleSections.map((section) => {
            const expanded = openSection === section.id;
            const hasActive = section.items.some((item) => normalized === item.href || normalized.startsWith(item.href + "/"));
            return (
              <div key={section.id} className="overflow-hidden rounded-2xl border border-emerald-900/80 bg-emerald-950/70">
                <button
                  type="button"
                  onClick={() => setOpenSection(expanded ? null : section.id)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-emerald-900/70"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-900 text-[10px] font-bold text-emerald-200">
                    {section.badge}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-emerald-100">{section.label}</span>
                  <span className={`text-xs text-emerald-300 transition-transform ${expanded ? "rotate-180" : ""}`}>⌄</span>
                </button>

                {expanded ? (
                  <div className="space-y-1 border-t border-emerald-900/70 px-2 py-2">
                    {section.items.map((item) => {
                      const active = normalized === item.href || normalized.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                            active
                              ? "bg-gradient-to-r from-emerald-700 to-emerald-600 font-semibold text-white"
                              : "text-emerald-200 hover:bg-emerald-900/80 hover:text-white"
                          }`}
                        >
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold">
                            {item.badge}
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}

                {!expanded && hasActive ? <div className="h-1 bg-emerald-500" /> : null}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-emerald-800/70 p-3">
        <button
          className="flex w-full items-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
          onClick={onLogout}
        >
          <span className="inline-flex h-4 w-4 items-center justify-center">↩</span>
          ออกจากระบบ
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl bg-emerald-900 p-2 text-white shadow-lg lg:hidden"
      >
        <span className="text-lg leading-none">☰</span>
      </button>

      <aside className="hidden h-screen w-80 flex-col bg-emerald-950 lg:flex">{sidebarContent}</aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 h-full w-80 max-w-[85vw] bg-emerald-950">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-lg bg-emerald-900 p-1 text-white"
            >
              <span className="text-sm leading-none">✕</span>
            </button>
            {sidebarContent}
          </aside>
        </div>
      ) : null}
    </>
  );
}
