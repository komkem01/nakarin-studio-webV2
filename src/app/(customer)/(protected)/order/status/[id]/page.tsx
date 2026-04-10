"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "@/lib/api/client";
import type { Order, OrderStatus, Quote } from "@/types";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; badge: string; dot: string }
> = {
  pending: { label: "รอดำเนินการ", badge: "text-yellow-700 bg-yellow-50 border border-yellow-200", dot: "bg-yellow-400" },
  quoted: { label: "ได้รับใบเสนอราคา", badge: "text-blue-700 bg-blue-50 border border-blue-200", dot: "bg-blue-500" },
  confirmed: { label: "ยืนยันแล้ว", badge: "text-indigo-700 bg-indigo-50 border border-indigo-200", dot: "bg-indigo-500" },
  in_progress: { label: "กำลังดำเนินการ", badge: "text-emerald-800 bg-emerald-50 border border-emerald-200", dot: "bg-emerald-600" },
  done: { label: "เสร็จสิ้น", badge: "text-green-700 bg-green-50 border border-green-200", dot: "bg-green-500" },
  cancelled: { label: "ยกเลิก", badge: "text-red-600 bg-red-50 border border-red-200", dot: "bg-red-400" },
};

const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "quoted",
  "confirmed",
  "in_progress",
  "done",
];

export default function OrderStatusPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const [copied, setCopied] = useState(false);
  const qc = useQueryClient();

  const { data, isPending, isError } = useQuery<Order>({
    queryKey: ["order", id],
    queryFn: async () => {
      const res = await orderApi.getById(id);
      return res.data.data;
    },
    refetchInterval: 30_000,
  });

  const acceptQuote = useMutation({
    mutationFn: (quoteId: string) => orderApi.acceptQuote(id, quoteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order", id] }),
  });

  const rejectQuote = useMutation({
    mutationFn: (quoteId: string) => orderApi.rejectQuote(id, quoteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order", id] }),
  });

  const copyOrderId = async (orderId: string) => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (isPending) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-20 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">กำลังโหลด...</p>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400 text-xl font-light select-none">?</span>
        </div>
        <p className="text-gray-600 font-medium mb-2">ไม่พบคำสั่งซื้อ</p>
        <p className="text-gray-400 text-sm mb-6">อาจถูกลบหรือหมดอายุแล้ว</p>
        <Link href="/order" className="inline-block bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-900 transition">
          สั่งทำบายศรีใหม่
        </Link>
      </main>
    );
  }

  const config = STATUS_CONFIG[data.status];
  const currentIdx = STATUS_ORDER.indexOf(data.status);

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <Link href="/my-orders" className="inline-flex items-center gap-1.5 text-emerald-700 text-sm mb-6 hover:text-emerald-900 transition">
        <span>←</span>
        <span>ออเดอร์ของฉัน</span>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-yellow-700 tracking-[0.16em] text-xs font-semibold uppercase mb-1">Order Tracking</p>
          <h1 className="text-2xl font-bold text-emerald-950">ติดตามคำสั่งซื้อ</h1>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-gray-400 text-xs font-mono">{data.id}</p>
            <button
              onClick={() => copyOrderId(data.id)}
              className={`text-xs px-2 py-0.5 rounded-md border transition ${
                copied
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-yellow-600 text-yellow-700 hover:bg-yellow-50"
              }`}
            >
              {copied ? "✓ คัดลอกแล้ว" : "คัดลอกเลข"}
            </button>
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${config.badge}`}>
          <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
          <span>{config.label}</span>
        </div>
      </div>

      {/* Progress stepper */}
      {data.status !== "cancelled" && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">ความคืบหน้า</p>
          <div className="flex items-center">
            {STATUS_ORDER.map((s, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div className="relative flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        done ? "bg-emerald-800 text-white shadow-sm" : "bg-gray-100 text-gray-400"
                      } ${active ? "ring-4 ring-emerald-200 scale-110" : ""}`}
                    >
                      {done && i < currentIdx ? "✓" : String(i + 1)}
                    </div>
                  </div>
                  {i < STATUS_ORDER.length - 1 && (
                    <div className={`flex-1 h-1 mx-1 rounded-full transition-all ${i < currentIdx ? "bg-emerald-800" : "bg-gray-100"}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex mt-3">
            {STATUS_ORDER.map((s) => (
              <div key={s} className="flex-1 text-center text-xs text-gray-400 px-1">
                {STATUS_CONFIG[s].label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail card */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-widest">รายละเอียดคำสั่งซื้อ</p>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm">
          <Row label="วันที่จัดงาน" value={new Date(data.event_date).toLocaleDateString("th-TH", { dateStyle: "long" })} />
          <Row label="สถานที่" value={data.event_location} />
          {data.event_postal_code && <Row label="รหัสไปรษณีย์" value={data.event_postal_code} />}
          {data.color_notes && <Row label="สีดอกไม้" value={data.color_notes} />}
          {data.customization_notes && <Row label="รายละเอียด" value={data.customization_notes} />}
          <Row label="วันที่สั่ง" value={new Date(data.created_at).toLocaleDateString("th-TH", { dateStyle: "long" })} />
        </div>
      </div>

      {/* Quotes */}
      {data.quotes && data.quotes.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-widest">ใบเสนอราคา</p>
          </div>
          <div className="divide-y divide-gray-100">
            {data.quotes.map((q: Quote) => (
              <div key={q.id} className="px-5 py-4 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-bold text-emerald-800">
                    {q.amount.toLocaleString("th-TH")} <span className="text-sm font-normal text-gray-500">บาท</span>
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      q.status === "accepted"
                        ? "bg-green-100 text-green-700"
                        : q.status === "rejected"
                        ? "bg-red-100 text-red-600"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {q.status === "accepted" ? "ยอมรับแล้ว" : q.status === "rejected" ? "ปฏิเสธแล้ว" : "รอตอบรับ"}
                  </span>
                </div>
                {q.note && <p className="text-gray-500 text-sm">{q.note}</p>}
                {q.file_url && (
                  <a href={q.file_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-emerald-700 text-xs font-medium underline underline-offset-2">
                    ดูไฟล์ใบเสนอราคา ↗
                  </a>
                )}
                {q.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => rejectQuote.mutate(q.id)}
                      disabled={acceptQuote.isPending || rejectQuote.isPending}
                      className="px-4 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                      ปฏิเสธ
                    </button>
                    <button
                      onClick={() => acceptQuote.mutate(q.id)}
                      disabled={acceptQuote.isPending || rejectQuote.isPending}
                      className="px-4 py-1.5 rounded-lg bg-emerald-800 text-white text-sm font-semibold hover:bg-emerald-900 transition disabled:opacity-50"
                    >
                      {acceptQuote.isPending ? "กำลังบันทึก..." : "ยอมรับ"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}
