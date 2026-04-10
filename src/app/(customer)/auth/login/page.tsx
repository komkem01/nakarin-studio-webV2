"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { authApi } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/my-orders";
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("token")) router.replace(next);
  }, [next, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login({ phone, password });
      localStorage.setItem("token", res.data.data.token);
      router.push(next);
      router.refresh();
    } catch {
      setError("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบเบอร์โทรและรหัสผ่าน");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "linear-gradient(135deg, #f0faf5 0%, #fffdf5 50%, #fdf8ee 100%)" }}>
      <div className="w-full max-w-sm">

        {/* Brand mark */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-800 shadow-lg mb-5">
            <span className="text-2xl select-none">🌿</span>
          </div>
          <h1 className="text-2xl font-bold text-emerald-950 tracking-tight">เข้าสู่ระบบ</h1>
          <p className="text-gray-400 mt-1.5 text-sm">นครินทร์ สตูดิโอ — บายศรีสำหรับทุกงานสำคัญ</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-emerald-900/5 border border-gray-100 overflow-hidden">

          {/* Gold accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-400" />

          <form onSubmit={onSubmit} className="px-7 py-7 space-y-5">

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                เบอร์โทรศัพท์
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-base select-none">📱</span>
                <input
                  type="tel"
                  required
                  placeholder="08x-xxx-xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-300 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                รหัสผ่าน
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-base select-none">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-16 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-300 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-emerald-700 font-medium transition"
                >
                  {showPassword ? "ซ่อน" : "แสดง"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-800 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-emerald-900 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-emerald-900/20"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : "เข้าสู่ระบบ"}
            </button>

            {/* Footer link */}
            <p className="text-center text-sm text-gray-400 pt-1">
              ยังไม่มีบัญชี?{" "}
              <Link href="/auth/register" className="text-emerald-700 font-semibold hover:text-emerald-900 transition">
                สมัครสมาชิก
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          © {new Date().getFullYear()} Nakarin Studio. All rights reserved.
        </p>
      </div>
    </main>
  );
}
