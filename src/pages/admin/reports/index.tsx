import { useEffect, useMemo, useState } from "react";

import AdminPageTemplate from "../../../components/admin/AdminPageTemplate";
import { DataTableColumn } from "../../../components/ui/DataTable";
import { fetchReportsByStatus, fetchReportsOverview, ReportByStatusResponse, ReportsOverviewResponse } from "../../../services/adminApi";

export default function AdminReportsPage() {
  const [overview, setOverview] = useState<ReportsOverviewResponse | null>(null);
  const [statusReport, setStatusReport] = useState<ReportByStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableQuery, setTableQuery] = useState({ page: 1, size: 8, sort: "createdAt", order: "desc" as "asc" | "desc", q: "" });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      fetchReportsOverview(),
      fetchReportsByStatus({
        status: "confirmed",
        page: tableQuery.page,
        size: tableQuery.size,
        sort: tableQuery.sort,
        order: tableQuery.order,
        q: tableQuery.q || undefined,
      }),
    ])
      .then(([overviewRes, statusRes]) => {
        if (!mounted) return;
        setOverview(overviewRes);
        setStatusReport(statusRes);
      })
      .catch(() => {
        if (!mounted) return;
        setOverview(null);
        setStatusReport(null);
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
      (statusReport?.items || []).map((item) => ({
          bookingNo: item.bookingNo,
          status: item.status,
          payment: item.payment,
          createdAt: new Date(item.createdAt).toLocaleString("th-TH"),
        })),
    [statusReport]
  );

  const columns: DataTableColumn<Record<string, unknown>>[] = [
    { key: "bookingNo", label: "เลขที่ออเดอร์", sortable: true },
    { key: "status", label: "สถานะ", sortable: true },
    { key: "payment", label: "การชำระเงิน", sortable: true },
    { key: "createdAt", label: "สร้างเมื่อ", sortable: true },
  ];

  return (
    <AdminPageTemplate
      title="รายงาน"
      subtitle={loading ? "กำลังโหลดข้อมูลรายงาน..." : "รายงานเชิงปฏิบัติการและรายงานสรุปเพื่อผู้บริหาร"}
      kpis={[
        { label: "จำนวนสมาชิก", value: String(overview?.membersCount ?? 0), tone: "text-emerald-700" },
        { label: "จำนวนออเดอร์", value: String(overview?.bookingsCount ?? 0), tone: "text-sky-700" },
        { label: "รายงานสถานะ", value: String(statusReport?.total ?? 0), tone: "text-rose-700" },
        { label: "ล่าสุด", value: overview?.generatedAt ? new Date(overview.generatedAt).toLocaleTimeString("th-TH") : "-", tone: "text-slate-700" },
      ]}
      tableTitle="Booking Report (status=confirmed)"
      tableColumns={columns}
      tableRows={rows}
      tableServerMeta={{ page: statusReport?.page || 1, size: statusReport?.size || 8, total: statusReport?.total || 0 }}
      tableQuery={tableQuery.q}
      tableLoading={loading}
      onTableQueryChange={setTableQuery}
      allowedRoles={["owner", "admin"]}
    />
  );
}
