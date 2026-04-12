import { ReactNode } from "react";

import AdminShell from "./AdminShell";
import DataTable, { DataTableColumn } from "../ui/DataTable";

type Kpi = {
  label: string;
  value: string;
  tone: string;
};

type AdminPageTemplateProps = {
  title: string;
  subtitle: string;
  kpis: Kpi[];
  tableTitle?: string;
  tableColumns?: DataTableColumn<Record<string, unknown>>[];
  tableRows?: Record<string, unknown>[];
  tableServerMeta?: { page: number; size: number; total: number };
  tableQuery?: string;
  tableLoading?: boolean;
  onTableQueryChange?: (query: { page: number; size: number; sort: string; order: "asc" | "desc"; q: string }) => void;
  allowedRoles?: ("owner" | "admin" | "staff")[];
  children?: ReactNode;
};

const defaultRows: Record<string, unknown>[] = [
  { task: "ตรวจสอบรายการใหม่", owner: "ทีมขาย", status: "pending", updatedAt: "วันนี้ 09:30" },
  { task: "ยืนยันคิวงานพิธี", owner: "ทีมประสานงาน", status: "in_progress", updatedAt: "วันนี้ 10:45" },
  { task: "ส่งออกรายงานประจำวัน", owner: "ทีมแอดมิน", status: "done", updatedAt: "วันนี้ 11:20" },
];

const defaultColumns: DataTableColumn<Record<string, unknown>>[] = [
  { key: "task", label: "งาน", sortable: true },
  { key: "owner", label: "ผู้รับผิดชอบ", sortable: true },
  { key: "status", label: "สถานะ", sortable: true },
  { key: "updatedAt", label: "อัปเดตล่าสุด", sortable: true },
];

export default function AdminPageTemplate({
  title,
  subtitle,
  kpis,
  tableTitle,
  tableColumns,
  tableRows,
  tableServerMeta,
  tableQuery,
  tableLoading,
  onTableQueryChange,
  allowedRoles,
  children,
}: AdminPageTemplateProps) {
  return (
    <AdminShell
      title={title}
      subtitle={subtitle}
      allowedRoles={allowedRoles}
      actions={
        <button className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-900">
          <span className="text-base leading-none">+</span>
          เพิ่มรายการ
        </button>
      }
    >
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{kpi.label}</p>
            <p className={`mt-2 text-3xl font-black tracking-tight ${kpi.tone}`}>{kpi.value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DataTable
            title={tableTitle || "รายการปฏิบัติงาน"}
            columns={tableColumns || defaultColumns}
            rows={tableRows || defaultRows}
            searchPlaceholder="ค้นหารายการ"
            pageSize={8}
            serverMode={Boolean(tableServerMeta)}
            total={tableServerMeta?.total}
            page={tableServerMeta?.page}
            size={tableServerMeta?.size}
            query={tableQuery}
            loading={tableLoading}
            onQueryChange={onTableQueryChange}
          />
        </div>

        <article className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-900 to-emerald-700 p-6 text-white shadow-lg">
          <div className="inline-flex rounded-lg bg-white/20 p-2">
            <span className="text-sm">✦</span>
          </div>
          <h3 className="mt-4 text-lg font-bold">Admin Insight</h3>
          <p className="mt-2 text-sm text-emerald-100">จัดลำดับงานตามความเร่งด่วนและทีมที่รับผิดชอบเพื่อเพิ่มความเร็วในการส่งมอบ</p>
        </article>
      </section>

      {children ? <section className="mt-6">{children}</section> : null}
    </AdminShell>
  );
}
