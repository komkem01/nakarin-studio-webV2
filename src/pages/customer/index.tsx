import Link from "next/link";

import CustomerShell from "../../components/customer/CustomerShell";

const STEPS = [
  { step: "01", title: "เลือกแบบสินค้า", desc: "เลือกแพ็กเกจบายศรีตามงบประมาณและโอกาสงาน" },
  { step: "02", title: "กรอกข้อมูลงาน", desc: "ระบุวันงาน วันนัดหมาย และรายละเอียดการจอง" },
  { step: "03", title: "ติดตามสถานะ", desc: "ตรวจสอบความคืบหน้าจากหมายเลขการจอง" },
];

export default function CustomerHomePage() {
  return (
    <CustomerShell>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 px-8 py-16 text-white shadow-xl">
        <div className="relative z-10 max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            Customer Portal
          </p>
          <h1 className="mt-3 text-5xl font-black leading-tight tracking-tight">
            สั่งจองงาน<br />บายศรี
          </h1>
          <p className="mt-4 leading-relaxed text-emerald-100/90">
            เลือกแบบสินค้า กรอกข้อมูลงาน<br className="hidden sm:block" />
            และติดตามสถานะการจองได้ที่นี่
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/customer/order/new"
              className="rounded-xl bg-white px-6 py-2.5 font-bold text-emerald-900 shadow-lg transition hover:bg-emerald-50 active:scale-[.98]"
            >
              เริ่มสั่งจอง
            </Link>
            <Link
              href="/customer/portfolio"
              className="rounded-xl border border-emerald-500/50 px-6 py-2.5 font-semibold text-white transition hover:border-emerald-400 hover:bg-emerald-800/60"
            >
              ดู Portfolio
            </Link>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-600/25" />
        <div className="pointer-events-none absolute -bottom-16 right-12 h-64 w-64 rounded-full bg-emerald-500/15" />
        <div className="pointer-events-none absolute right-72 top-6 h-32 w-32 rounded-full bg-white/5" />
      </section>

      {/* Steps */}
      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        {STEPS.map(({ step, title, desc }) => (
          <article
            key={step}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:ring-emerald-200"
          >
            <p className="text-3xl font-black text-emerald-100">{step}</p>
            <h2 className="mt-2 font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</p>
          </article>
        ))}
      </section>

      {/* Quick links */}
      <section className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href="/customer/orders"
          className="group flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:ring-emerald-200"
        >
          <div>
            <p className="font-bold text-slate-900">งานของฉัน</p>
            <p className="mt-0.5 text-sm text-slate-500">ดูประวัติและสถานะการจองทั้งหมด</p>
          </div>
          <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600">→</span>
        </Link>
        <Link
          href="/customer/portfolio"
          className="group flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:ring-emerald-200"
        >
          <div>
            <p className="font-bold text-slate-900">Portfolio สินค้า</p>
            <p className="mt-0.5 text-sm text-slate-500">เลือกดูแบบงานและราคาทั้งหมด</p>
          </div>
          <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600">→</span>
        </Link>
      </section>
    </CustomerShell>
  );
}
