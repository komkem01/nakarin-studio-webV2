"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function ProtectedCustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      const query = searchParams.toString();
      const next = query ? `${pathname}?${query}` : pathname;
      router.replace(`/auth/login?next=${encodeURIComponent(next)}`);
      return;
    }

    setChecking(false);
  }, [pathname, router, searchParams]);

  if (checking) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">
        กำลังตรวจสอบสิทธิ์...
      </main>
    );
  }

  return <>{children}</>;
}
