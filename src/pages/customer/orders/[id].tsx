import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import CustomerGuard from "../../../components/customer/CustomerGuard";
import CustomerShell from "../../../components/customer/CustomerShell";
import { customerApi, BookingItem } from "../../../services/customerApi";

function InfoBox({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:     { label: "รอดำเนินการ",    cls: "bg-amber-100 text-amber-700 ring-amber-200" },
    confirmed:   { label: "ยืนยันแล้ว",      cls: "bg-blue-100 text-blue-700 ring-blue-200" },
    in_progress: { label: "กำลังดำเนินการ", cls: "bg-purple-100 text-purple-700 ring-purple-200" },
    completed:   { label: "เสร็จสิ้น",       cls: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
    cancelled:   { label: "ยกเลิก",          cls: "bg-red-100 text-red-700 ring-red-200" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600 ring-slate-200" };
  return (
    <span className={`rounded-full px-3 py-1.5 text-sm font-bold ring-1 ${cls}`}>{label}</span>
  );
}

function fmt(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("th-TH");
}

export default function CustomerOrderDetailPage() {
  const router = useRouter();
  const bookingId = typeof router.query.id === "string" ? router.query.id : "";
  const [item, setItem] = useState<BookingItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    customerApi
      .getBookingById(bookingId)
      .then((res) => setItem(res))
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [bookingId]);

  return (
    <CustomerGuard>
      <CustomerShell>
        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/customer/orders" className="hover:text-emerald-700">งานของฉัน</Link>
          <span>/</span>
          <span className="text-slate-800">{loading ? "..." : (item?.bookingNo ?? "รายละเอียด")}</span>
        </nav>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        )}

        {/* Not found */}
        {!loading && !item && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-24 text-center shadow-sm ring-1 ring-slate-100">
            <p className="text-5xl">😕</p>
            <p className="mt-4 font-bold text-slate-700">ไม่พบข้อมูลการจอง</p>
            <Link href="/customer/orders" className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-900">
              ← กลับสู่งานของฉัน
            </Link>
          </div>
        )}

        {!loading && item && (
          <div className="space-y-4">
            {/* Header card */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-700 px-7 py-6 text-white shadow-lg">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-emerald-300">เลขที่จอง</p>
                  <p className="mt-1 font-mono text-2xl font-black tracking-wider">{item.bookingNo}</p>
                  <p className="mt-1 text-sm text-emerald-200">{item.packageName || "-"}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            </div>

            {/* Info grid */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">ข้อมูลงาน</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <InfoBox label="สไตล์" value={item.baiseeStyle || "-"} />
                <InfoBox label="วันงาน" value={item.eventDate ? new Date(item.eventDate).toLocaleString("th-TH") : "-"} />
                <InfoBox label="การชำระเงิน" value={item.payment || "-"} />
              </div>
            </div>

            {/* Payment summary */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">สรุปการเงิน</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBox label="ยอดรวม" value={`${fmt(item.totalPrice)} บาท`} />
                <InfoBox label="มัดจำ" value={`${fmt(item.depositAmount)} บาท`} />
                <InfoBox label="ชำระแล้ว" value={`${fmt(item.paidAmount)} บาท`} />
                <div className="rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
                  <p className="text-xs text-emerald-600">คงเหลือ</p>
                  <p className="mt-0.5 text-sm font-bold text-emerald-800">{fmt(item.balanceAmount)} บาท</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CustomerShell>
    </CustomerGuard>
  );
}
