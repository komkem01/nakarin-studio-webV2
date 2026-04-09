"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "@/lib/api/client";
import type { Order, OrderStatus } from "@/types";

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "รอดำเนินการ",
  quoted: "เสนอราคาแล้ว",
  confirmed: "ยืนยันแล้ว",
  in_progress: "กำลังดำเนินการ",
  done: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  quoted: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-emerald-100 text-emerald-700",
  done: "bg-emerald-200 text-emerald-800",
  cancelled: "bg-red-100 text-red-600",
};

const STATUS_OPTIONS: Array<{ value: "all" | OrderStatus; label: string }> = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "pending", label: "รอดำเนินการ" },
  { value: "quoted", label: "เสนอราคาแล้ว" },
  { value: "confirmed", label: "ยืนยันแล้ว" },
  { value: "in_progress", label: "กำลังดำเนินการ" },
  { value: "done", label: "เสร็จสิ้น" },
  { value: "cancelled", label: "ยกเลิก" },
];

export default function MyOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-orders", statusFilter, page],
    queryFn: async () => {
      const res = await orderApi.listMine({
        page,
        size: PAGE_SIZE,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      return res.data;
    },
    retry: 1,
  });

  const orders: Order[] = data?.data ?? [];
  const total = data?.paginate?.total ?? data?.total ?? orders.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      {/* Page header */}
      <div className="mb-8">
        <p className="text-yellow-700 tracking-[0.16em] text-xs font-semibold uppercase mb-1">My Account</p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-emerald-950">ออเดอร์ของฉัน</h1>
            <p className="text-gray-500 mt-1 text-sm">ติดตามความคืบหน้าของงานและใบเสนอราคาทั้งหมด</p>
          </div>
          <Link
            href="/order"
            className="shrink-0 bg-emerald-800 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-900 transition"
          >
            + สั่งทำบายศรี
          </Link>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border ${
              statusFilter === option.value
                ? "bg-emerald-800 text-white border-emerald-800"
                : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
            }`}
          >
            {option.label}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-2 shrink-0">{total.toLocaleString("th-TH")} รายการ</span>
      </div>

      {/* Orders list */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">กำลังโหลดข้อมูล...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-16">
            <p className="text-red-400 text-sm">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-5">
              <span className="text-gray-300 text-sm font-semibold select-none">—</span>
            </div>
            <p className="text-gray-500 mb-6 text-sm">ยังไม่มีคำสั่งซื้อในสถานะนี้</p>
            <Link
              href="/order"
              className="inline-block bg-emerald-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-900 transition"
            >
              สั่งทำบายศรีเลย
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/order/status/${order.id}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 hover:bg-gray-50 transition group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-800 group-hover:text-emerald-800 transition">
                    งานวันที่ {new Date(order.event_date).toLocaleDateString("th-TH", { dateStyle: "long" })}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{order.event_location}</p>
                  <p className="text-xs text-gray-300 mt-1 font-mono">#{order.id.slice(0, 8)}...</p>
                </div>
                <span className="shrink-0 text-emerald-700 text-sm font-medium group-hover:translate-x-0.5 transition-transform">
                  ดูรายละเอียด →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | "...")[]>((acc, p, i, arr) => {
              if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((item, i) =>
              item === "..." ? (
                <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item as number)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition ${
                    page === item
                      ? "bg-emerald-800 text-white"
                      : "border border-gray-200 text-gray-600 hover:border-emerald-400"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            ›
          </button>
        </div>
      )}
    </main>
  );
}
