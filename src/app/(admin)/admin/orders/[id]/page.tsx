"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminOrderApi } from "@/lib/api/client";
import type { Order, OrderStatus, Quote } from "@/types";
import { useRouter } from "next/navigation";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "รอดำเนินการ",
  quoted: "เสนอราคาแล้ว",
  confirmed: "ยืนยันแล้ว",
  in_progress: "กำลังทำ",
  done: "เสร็จแล้ว",
  cancelled: "ยกเลิก",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "แต่งงาน",
  ordination: "บวช",
  housewarming: "ขึ้นบ้านใหม่",
  blessing: "งานมงคล",
  graduation: "รับปริญญา",
  other: "อื่นๆ",
};

export default function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const qc = useQueryClient();

  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");

  const { data: order, isPending } = useQuery<Order>({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const res = await adminOrderApi.getById(id);
      return res.data.data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => adminOrderApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-order", id] }),
  });

  const createQuote = useMutation({
    mutationFn: (body: { amount: number; note?: string }) =>
      adminOrderApi.createQuote(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
      setQuoteAmount("");
      setQuoteNote("");
    },
  });

  const addNote = useMutation({
    mutationFn: (content: string) => adminOrderApi.addNote(id, content, true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
      setNoteContent("");
    },
  });

  if (isPending) {
    return <div className="text-gray-400 py-12 text-center">กำลังโหลด...</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-3">ไม่พบคำสั่งซื้อ</p>
        <button
          onClick={() => router.back()}
          className="text-emerald-800 underline text-sm"
        >
          กลับ
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => router.back()}
        className="text-emerald-800 text-sm mb-6 hover:underline"
      >
        ← กลับรายการ
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {order.customer?.name ?? "ลูกค้า"}
          </h2>
          <p className="text-sm text-gray-400 font-mono">{order.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={newStatus || order.status}
            onChange={(e) => {
              setNewStatus(e.target.value as OrderStatus);
              updateStatus.mutate(e.target.value);
            }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {(Object.entries(STATUS_LABELS) as [OrderStatus, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Order details */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-3 text-sm">
        <Row label="ลูกค้า" value={order.customer?.name ?? "—"} />
        <Row label="โทรศัพท์" value={order.customer?.phone ?? "—"} />
        <Row label="ประเภทงาน" value={EVENT_TYPE_LABELS[order.event_type] ?? order.event_type} />
        <Row
          label="วันที่จัดงาน"
          value={new Date(order.event_date).toLocaleDateString("th-TH", { dateStyle: "long" })}
        />
        <Row label="สถานที่" value={order.event_location} />
        {order.event_postal_code && <Row label="รหัสไปรษณีย์" value={order.event_postal_code} />}
        {order.budget_min != null && (
          <Row
            label="งบประมาณ"
            value={`${order.budget_min.toLocaleString("th-TH")} – ${(order.budget_max ?? 0).toLocaleString("th-TH")} บาท`}
          />
        )}
        {order.color_notes && <Row label="สีดอกไม้" value={order.color_notes} />}
        {order.customization_notes && (
          <Row label="รายละเอียด" value={order.customization_notes} />
        )}
      </div>

      {/* Quote sender */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-700 mb-4">ส่งใบเสนอราคา</h3>

        {/* Existing quotes */}
        {order.quotes && order.quotes.length > 0 && (
          <div className="mb-4 space-y-2">
            {order.quotes.map((q: Quote) => (
              <div key={q.id} className="flex items-center justify-between bg-emerald-50 rounded-lg px-4 py-2 text-sm">
                <span className="font-medium text-emerald-900">
                  {q.amount.toLocaleString("th-TH")} บาท
                </span>
                <span
                  className={`text-xs ${
                    q.status === "accepted"
                      ? "text-green-600"
                      : q.status === "rejected"
                      ? "text-red-500"
                      : "text-yellow-600"
                  }`}
                >
                  {q.status === "accepted" ? "ยอมรับ" : q.status === "rejected" ? "ปฏิเสธ" : "รอตอบ"}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <input
            type="number"
            value={quoteAmount}
            onChange={(e) => setQuoteAmount(e.target.value)}
            placeholder="จำนวนเงิน (บาท) *"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <input
            type="text"
            value={quoteNote}
            onChange={(e) => setQuoteNote(e.target.value)}
            placeholder="หมายเหตุ (ไม่บังคับ)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <button
            onClick={() =>
              createQuote.mutate({
                amount: Number(quoteAmount),
                note: quoteNote || undefined,
              })
            }
            disabled={!quoteAmount || createQuote.isPending}
            className="bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-900 transition disabled:opacity-50"
          >
            {createQuote.isPending ? "กำลังส่ง..." : "ส่ง"}
          </button>
        </div>
      </div>

      {/* Internal note */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-700 mb-4">บันทึกภายใน</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="เพิ่มบันทึก..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <button
            onClick={() => addNote.mutate(noteContent)}
            disabled={!noteContent || addNote.isPending}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
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
