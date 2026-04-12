import { useEffect, useMemo, useState } from "react";

import AdminPageTemplate from "../../../components/admin/AdminPageTemplate";
import { DataTableColumn } from "../../../components/ui/DataTable";
import { BookingItem, fetchOrders, PaginatedBookingsResponse } from "../../../services/adminApi";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<BookingItem[]>([]);
  const [meta, setMeta] = useState<PaginatedBookingsResponse["meta"]>({ page: 1, size: 8, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [tableQuery, setTableQuery] = useState({ page: 1, size: 8, sort: "createdAt", order: "desc" as "asc" | "desc", q: "" });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchOrders(tableQuery)
      .then((res) => {
        if (mounted) {
          setOrders(res.items || []);
          setMeta(res.meta || { page: tableQuery.page, size: tableQuery.size, total: 0, totalPages: 1 });
        }
      })
      .catch(() => {
        if (mounted) {
          setOrders([]);
          setMeta({ page: tableQuery.page, size: tableQuery.size, total: 0, totalPages: 1 });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [tableQuery]);

  const rows = useMemo<Record<string, unknown>[]>(
    () =>
      orders.map((item) => ({
        bookingNo: item.bookingNo,
        status: item.status,
        payment: item.payment,
        totalPrice: typeof item.totalPrice === "number" ? item.totalPrice.toLocaleString("th-TH") : "-",
        createdAt: new Date(item.createdAt).toLocaleString("th-TH"),
      })),
    [orders]
  );

  const columns: DataTableColumn<Record<string, unknown>>[] = [
    { key: "bookingNo", label: "เลขที่ออเดอร์", sortable: true },
    { key: "status", label: "สถานะ", sortable: true },
    { key: "payment", label: "การชำระเงิน", sortable: true },
    { key: "totalPrice", label: "ยอดรวม", sortable: true, className: "text-right" },
    { key: "createdAt", label: "สร้างเมื่อ", sortable: true },
  ];

  const waitingCount = orders.filter((o) => o.status === "pending").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;

  return (
    <AdminPageTemplate
      title="รายการออเดอร์"
      subtitle={loading ? "กำลังโหลดข้อมูลออเดอร์..." : "จัดการออเดอร์ทั้งหมด แยกตามสถานะและความเร่งด่วน"}
      kpis={[
        { label: "ทั้งหมด", value: String(meta.total), tone: "text-emerald-700" },
        { label: "รอยืนยัน", value: String(waitingCount), tone: "text-amber-700" },
        { label: "กำลังโหลด", value: loading ? "ใช่" : "ไม่", tone: "text-rose-700" },
        { label: "เสร็จสมบูรณ์", value: String(completedCount), tone: "text-sky-700" },
      ]}
      tableTitle="ตารางออเดอร์จริงจาก API"
      tableColumns={columns}
      tableRows={rows}
      tableServerMeta={{ page: meta.page, size: meta.size, total: meta.total }}
      tableQuery={tableQuery.q}
      tableLoading={loading}
      onTableQueryChange={setTableQuery}
    />
  );
}
