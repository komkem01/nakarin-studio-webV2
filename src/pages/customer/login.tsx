import { FormEvent, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { customerApi } from "../../services/customerApi";
import { setCustomerSession } from "../../store/customerSession";
import { useToast } from "../../components/ui/Toast";

export default function CustomerLoginPage() {
  const router = useRouter();
  const nextPath = typeof router.query.next === "string" ? router.query.next : "/customer/orders";
  const toast = useToast();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await customerApi.login({ phone, password });
      setCustomerSession({
        token: res.accessToken,
        refreshToken: res.refreshToken,
        firstName: res.member.firstName,
        lastName: res.member.lastName,
        phone,
      });
      toast("เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ!", "success");
      void router.push(nextPath);
    } catch {
      toast("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>เข้าสู่ระบบ — NAKARIN STUDIO</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-100 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Branding */}
          <div className="mb-8 text-center">
            <Link href="/customer">
              <span className="text-3xl font-black tracking-tight text-emerald-900">NAKARIN STUDIO</span>
            </Link>
            <p className="mt-2 text-sm text-slate-500">ยินดีต้อนรับกลับ — เข้าสู่ระบบเพื่อดำเนินการต่อ</p>
          </div>

          {/* Card */}
          <div className="rounded-3xl bg-white px-8 py-10 shadow-2xl ring-1 ring-slate-200/60">
            <h1 className="mb-6 text-xl font-bold text-slate-900">เข้าสู่ระบบ</h1>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0xx-xxx-xxxx"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">รหัสผ่าน</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-600 py-3 font-semibold text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-700 hover:to-emerald-500 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              ยังไม่มีบัญชี?{" "}
              <Link
                href={`/customer/register?next=${encodeURIComponent(nextPath)}`}
                className="font-medium text-emerald-700 hover:text-emerald-600"
              >
                สมัครสมาชิก
              </Link>
            </p>
          </div>

          {/* Back link */}
          <p className="mt-6 text-center text-sm text-slate-400">
            <Link href="/customer" className="hover:text-emerald-700">
              ← กลับสู่หน้าหลัก
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
