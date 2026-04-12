import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { clearAdminSession, getAdminSession, hasAnyRole, AdminRole } from "../../store/adminSession";
import { getAllowedRolesForPath } from "./nav-config";
import AdminSidebarAccordion from "./AdminSidebarAccordion";

type AdminShellProps = {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
  allowedRoles?: AdminRole[];
};

export default function AdminShell({ title, subtitle, actions, children, allowedRoles }: AdminShellProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<AdminRole>("staff");

  const pathAllowedRoles = useMemo(() => getAllowedRolesForPath(router.asPath), [router.asPath]);

  useEffect(() => {
    const session = getAdminSession();
    if (!session) {
      void router.replace("/admin");
      return;
    }
    const required = allowedRoles && allowedRoles.length > 0 ? allowedRoles : pathAllowedRoles;
    if (!hasAnyRole(session.role, required)) {
      void router.replace("/admin/dashboard");
      return;
    }
    setRole(session.role);
    setReady(true);
  }, [allowedRoles, pathAllowedRoles, router]);

  function handleLogout() {
    clearAdminSession();
    void router.push("/admin");
  }

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">กำลังเตรียมระบบ...</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <AdminSidebarAccordion pathname={router.asPath} role={role} onLogout={handleLogout} />

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/90 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="ml-14 lg:ml-0">
              <h1 className="text-2xl font-black tracking-tight text-emerald-950">{title}</h1>
              <p className="text-sm text-emerald-700/70">{subtitle}</p>
            </div>

            <div className="flex items-center gap-3">
              <label className="relative hidden md:block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600/70">⌕</span>
                <input
                  className="w-72 rounded-xl border border-emerald-100 bg-emerald-50/40 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-300 focus:bg-white"
                  placeholder="ค้นหาในระบบแอดมิน"
                />
              </label>
              <button className="rounded-xl border border-emerald-100 bg-white p-2 text-emerald-800">
                <span className="text-sm">◉</span>
              </button>
              {actions}
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
