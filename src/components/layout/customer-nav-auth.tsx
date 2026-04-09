"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function CustomerNavAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
  }, [pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    router.push("/");
    router.refresh();
  };

  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/my-orders"
          className="text-gray-600 hover:text-emerald-800 transition"
        >
          ออเดอร์ของฉัน
        </Link>
        <button
          onClick={logout}
          className="border border-yellow-700 text-yellow-800 px-3 py-1.5 rounded-md hover:bg-yellow-50 transition"
        >
          ออกจากระบบ
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/auth/login"
        className="text-gray-600 hover:text-emerald-800 transition"
      >
        เข้าสู่ระบบ
      </Link>
      <Link
        href="/auth/register"
        className="border border-emerald-800 text-emerald-800 px-3 py-1.5 rounded-md hover:bg-emerald-50 transition"
      >
        สมัครสมาชิก
      </Link>
    </div>
  );
}
