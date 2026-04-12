import { useEffect, useMemo, useState } from "react";

import AdminPageTemplate from "../../../components/admin/AdminPageTemplate";
import { DataTableColumn } from "../../../components/ui/DataTable";
import { AnalyticsDailyResponse, fetchAnalyticsDaily } from "../../../services/adminApi";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsDailyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchAnalyticsDaily({ groupBy: "day", timezone: "Asia/Bangkok" })
      .then((res) => {
        if (mounted) setData(res);
      })
      .catch(() => {
        if (mounted) setData(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const series = data?.series || [];
  const latest = series[series.length - 1];

  const rows = useMemo<Record<string, unknown>[]>(
    () =>
      series.map((point) => ({
        period: `${point.periodStart} - ${point.periodEnd}`,
        totalBookings: point.totalBookings,
        totalRevenue: point.totalRevenue.toLocaleString("th-TH"),
        averageOrder: point.averageOrder.toLocaleString("th-TH"),
        cumulativeBookings: point.cumulativeBookings,
        cumulativeRevenue: point.cumulativeRevenue.toLocaleString("th-TH"),
      })),
    [series]
  );

  const columns: DataTableColumn<Record<string, unknown>>[] = [
    { key: "period", label: "ช่วงเวลา", sortable: true },
    { key: "totalBookings", label: "ยอดออเดอร์", sortable: true },
    { key: "totalRevenue", label: "รายได้", sortable: true },
    { key: "averageOrder", label: "AOV", sortable: true },
    { key: "cumulativeBookings", label: "สะสมออเดอร์", sortable: true },
    { key: "cumulativeRevenue", label: "สะสมรายได้", sortable: true },
  ];

  return (
    <AdminPageTemplate
      title="Analytics"
      subtitle={loading ? "กำลังโหลดข้อมูลวิเคราะห์..." : `ช่วงข้อมูล ${data?.groupBy || "day"} โซนเวลา ${data?.timezone || "Asia/Bangkok"}`}
      kpis={[
        { label: "Revenue ล่าสุด", value: latest ? `฿${latest.cumulativeRevenue.toLocaleString("th-TH")}` : "-", tone: "text-emerald-700" },
        { label: "Orders ล่าสุด", value: latest ? String(latest.cumulativeBookings) : "-", tone: "text-sky-700" },
        { label: "AOV ล่าสุด", value: latest ? `฿${latest.averageOrder.toLocaleString("th-TH")}` : "-", tone: "text-violet-700" },
        { label: "ช่วงข้อมูล", value: String(series.length), tone: "text-amber-700" },
      ]}
      tableTitle="Time-series Analytics จาก API"
      tableColumns={columns}
      tableRows={rows}
      allowedRoles={["owner", "admin"]}
    />
  );
}
