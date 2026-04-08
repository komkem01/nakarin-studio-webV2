"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { orderApi } from "@/lib/api/client";
import type { Order, OrderStatus } from "@/types";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: string }
> = {
  pending: { label: "รอดำเนินการ", color: "text-yellow-600 bg-yellow-50", icon: "⏳" },
  quoted: { label: "ได้รับใบเสนอราคา", color: "text-blue-600 bg-blue-50", icon: "📋" },
  confirmed: { label: "ยืนยันแล้ว", color: "text-indigo-600 bg-indigo-50", icon: "✅" },
  in_progress: { label: "กำลังดำเนินการ", color: "text-amber-600 bg-amber-50", icon: "🌸" },
  done: { label: "เสร็จสิ้น", color: "text-green-600 bg-green-50", icon: "🎉" },
  cancelled: { label: "ยกเลิก", color: "text-red-600 bg-red-50", icon: "❌" },
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

  useEffect(() => {
    // Redirect to home if no token (unauthenticated)
    if (!localStorage.getItem("token")) {
      window.location.href = "/order";
    }
  }, []);

  const { data, isPending, isError } = useQuery<Order>({
    queryKey: ["order", id],
    queryFn: async () => {
      const res = await orderApi.getById(id);
      return res.data.data;
    },
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  if (isPending) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">
        กำลังโหลด...
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">ไม่พบคำสั่งซื้อ</p>
        <Link href="/order" className="text-amber-700 underline">
          สั่งทำบายศรีใหม่
        </Link>
      </main>
    );
  }

  const config = STATUS_CONFIG[data.status];
  const currentIdx = STATUS_ORDER.indexOf(data.status);

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/" className="text-amber-700 text-sm mb-6 inline-block hover:underline">
        ← กลับหน้าหลัก
      </Link>

      <h1 className="text-2xl font-bold text-gray-800 mb-1">ติดตามคำสั่งซื้อ</h1>
      <p className="text-gray-400 text-sm mb-8 font-mono">{data.id}</p>

      {/* Status badge */}
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold mb-8 ${config.color}`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </div>

      {/* Progress stepper */}
      {data.status !== "cancelled" && (
        <div className="mb-10">
          <div className="flex items-center">
            {STATUS_ORDER.map((s, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      done
                        ? "bg-amber-700 text-white"
                        : "bg-gray-200 text-gray-400"
                    } ${active ? "ring-4 ring-amber-200" : ""}`}
                  >
                    {done && i < currentIdx ? "✓" : i + 1}
                  </div>
                  {i < STATUS_ORDER.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-1 rounded ${
                        i < currentIdx ? "bg-amber-700" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex mt-2 text-xs text-gray-400">
            {STATUS_ORDER.map((s) => (
              <div key={s} className="flex-1 text-center">
                {STATUS_CONFIG[s].label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order info */}
      <div className="bg-gray-50 rounded-2xl p-6 space-y-3 text-sm">
        <h2 className="font-semibold text-gray-700 mb-3">รายละเอียดคำสั่งซื้อ</h2>
        <Row label="วันที่จัดงาน" value={new Date(data.event_date).toLocaleDateString("th-TH", { dateStyle: "long" })} />
        <Row label="สถานที่" value={data.event_location} />
        {data.event_postal_code && <Row label="รหัสไปรษณีย์" value={data.event_postal_code} />}
        {data.color_notes && <Row label="สีดอกไม้" value={data.color_notes} />}
        {data.customization_notes && <Row label="รายละเอียด" value={data.customization_notes} />}
        <Row label="วันที่สั่ง" value={new Date(data.created_at).toLocaleDateString("th-TH", { dateStyle: "long" })} />
      </div>

      {/* Quotes */}
      {data.quotes && data.quotes.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold text-gray-700 mb-3">ใบเสนอราคา</h2>
          {data.quotes.map((q) => (
            <div key={q.id} className="border rounded-xl p-4 mb-3 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-700 text-lg">
                  {q.amount.toLocaleString("th-TH")} บาท
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    q.status === "accepted"
                      ? "bg-green-100 text-green-600"
                      : q.status === "rejected"
                      ? "bg-red-100 text-red-500"
                      : "bg-yellow-100 text-yellow-600"
                  }`}
                >
                  {q.status === "accepted" ? "ยอมรับแล้ว" : q.status === "rejected" ? "ปฏิเสธ" : "รอตอบรับ"}
                </span>
              </div>
              {q.note && <p className="text-gray-500">{q.note}</p>}
              {q.file_url && (
                <a href={q.file_url} target="_blank" rel="noopener noreferrer" className="text-amber-700 underline">
                  ดูไฟล์ใบเสนอราคา
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-32 flex-shrink-0">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}
