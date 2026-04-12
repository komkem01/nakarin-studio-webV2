import { useEffect, useState } from "react";
import Link from "next/link";

import CustomerGuard from "../../../components/customer/CustomerGuard";
import CustomerShell from "../../../components/customer/CustomerShell";
import { customerApi, BookingItem } from "../../../services/customerApi";
import { getTrackedBookings } from "../../../store/customerSession";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:     { label: "รอดำเนินการ",     cls: "bg-amber-100 text-amber-700" },
    confirmed:   { label: "ยืนยันแล้ว",       cls: "bg-blue-100 text-blue-700" },
    in_progress: { label: "กำลังดำเนินการ",  cls: "bg-purple-100 text-purple-700" },
    completed:   { label: "เสร็จสิ้น",        cls: "bg-emerald-100 text-emerald-700" },
    cancelled:   { label: "ยกเลิก",           cls: "bg-red-100 text-red-700" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>
  );
}

export default function CustomerOrdersPage() {
  const [items, setItems] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tracked = getTrackedBookings();
    if (tracked.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    Promise.all(tracked.map((x) => customerApi.getBookingById(x.id).catch(() => null)))
      .then((rows) => setItems(rows.filter(Boolean) as BookingItem[]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CustomerGuard>
      <CustomerShell>
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">งานของฉัน</h1>
            <p className="mt-0.5 text-sm text-slate-500">ประวัติการจองจากอุปกรณ์นี้</p>
          </div>
          <Link
            href="/customer/order/new"
            className="rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-emerald-500"
          >
            + สร้างการจองใหม่
          </Link>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-24 text-center shadow-sm ring-1 ring-slate-100">
            <p className="text-5xl">📋</p>
            <p className="mt-4 font-bold text-slate-700">ยังไม่มีการจอง</p>
            <p className="mt-1 text-sm text-slate-400">ประวัติจะปรากฏที่นี่หลังจากสร้างการจอง</p>
            <Link
              href="/customer/order/new"
              className="mt-5 rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              เริ่มสั่งจองเลย
            </Link>
          </div>
        )}

        {/* Items */}
        {!loading && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:ring-emerald-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <p className="text-xs text-slate-400">เลขที่จอง</p>
                      <p className="font-mono text-base font-bold text-slate-900">{item.bookingNo}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <Link
                    href={`/customer/orders/${item.id}`}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                  >
                    ดูรายละเอียด →
                  </Link>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-400">แพ็กเกจ</p>
                    <p className="font-medium text-slate-800">{item.packageName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">ยอดรวม</p>
                    <p className="font-bold text-emerald-800">{(item.totalPrice ?? 0).toLocaleString("th-TH")} บาท</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">การชำระเงิน</p>
                    <p className="font-medium text-slate-800">{item.payment || "-"}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </CustomerShell>
    </CustomerGuard>
  );
}
