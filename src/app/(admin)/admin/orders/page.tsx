"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminOrderApi } from "@/lib/api/client";
import type { Order, OrderStatus } from "@/types";
import Link from "next/link";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "รอดำเนินการ",
  quoted: "เสนอราคาแล้ว",
  confirmed: "ยืนยันแล้ว",
  in_progress: "กำลังทำ",
  done: "เสร็จแล้ว",
  cancelled: "ยกเลิก",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  quoted: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-emerald-100 text-emerald-800",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-500",
};

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isPending } = useQuery({
    queryKey: ["admin-orders", statusFilter, page],
    queryFn: async () => {
      const res = await adminOrderApi.list({
        status: statusFilter || undefined,
        page,
        size: 20,
      });
      return res.data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminOrderApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  const orders: Order[] = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
        >
          <option value="">ทุกสถานะ</option>
          {(Object.entries(STATUS_LABELS) as [OrderStatus, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400">ทั้งหมด {total} รายการ</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ลำดับ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ลูกค้า</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">วันที่จัดงาน</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">สถานที่</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">อัปเดต</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  กำลังโหลด...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  ไม่มีคำสั่งซื้อ
                </td>
              </tr>
            ) : (
              orders.map((order, idx) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                    {(page - 1) * 20 + idx + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {order.customer?.name ?? "—"}
                    <div className="text-xs text-gray-400">{order.customer?.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(order.event_date).toLocaleDateString("th-TH")}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">
                    {order.event_location}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        updateStatus.mutate({ id: order.id, status: e.target.value })
                      }
                      className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    >
                      {(Object.entries(STATUS_LABELS) as [OrderStatus, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-emerald-800 hover:underline text-xs"
                    >
                      ดูรายละเอียด
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border rounded text-sm disabled:opacity-40"
          >
            ← ก่อนหน้า
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500">
            หน้า {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-3 py-1.5 border rounded text-sm disabled:opacity-40"
          >
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  );
}
