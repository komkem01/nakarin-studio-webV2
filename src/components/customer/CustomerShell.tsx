import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { clearCustomerSession, getCustomerSession } from "../../store/customerSession";

type CustomerShellProps = {
  title?: string;
  children: React.ReactNode;
};

const NAV_LINKS = [
  { href: "/customer/portfolio", label: "Portfolio" },
  { href: "/customer/order/new", label: "สั่งจอง" },
  { href: "/customer/orders", label: "งานของฉัน" },
];

export default function CustomerShell({ title, children }: CustomerShellProps) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    const s = getCustomerSession();
    if (s) {
      setLoggedIn(true);
      setFirstName(s.firstName || "");
    }
  }, []);

  function handleLogout() {
    clearCustomerSession();
    if (typeof window !== "undefined") window.location.href = "/customer";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          {/* Logo */}
          <Link href="/customer" className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-[10px] font-black text-white">N</span>
            <span className="text-base font-black tracking-tight text-slate-900">NAKARIN STUDIO</span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = router.pathname === link.href || router.pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {loggedIn ? (
              <div className="ml-2 flex items-center gap-2 border-l border-slate-100 pl-3">
                {firstName && (
                  <span className="hidden text-xs text-slate-400 sm:block">สวัสดี, {firstName}</span>
                )}
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <Link
                href="/customer/login"
                className="ml-2 rounded-lg bg-gradient-to-r from-emerald-800 to-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-emerald-500"
              >
                เข้าสู่ระบบ
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        {title && (
          <h1 className="mb-6 text-2xl font-black text-slate-900">{title}</h1>
        )}
        {children}
      </main>
    </div>
  );
}
