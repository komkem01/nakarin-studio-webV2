import { ReactNode, useMemo, useState } from "react";

export type DataTableColumn<T> = {
  key: keyof T;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => string | number | ReactNode;
};

type DataTableProps<T extends Record<string, unknown>> = {
  title: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  searchPlaceholder?: string;
  pageSize?: number;
  serverMode?: boolean;
  total?: number;
  page?: number;
  size?: number;
  query?: string;
  loading?: boolean;
  onQueryChange?: (query: { page: number; size: number; sort: string; order: "asc" | "desc"; q: string }) => void;
};

export default function DataTable<T extends Record<string, unknown>>({
  title,
  columns,
  rows,
  searchPlaceholder = "ค้นหา",
  pageSize = 10,
  serverMode = false,
  total,
  page,
  size,
  query,
  loading,
  onQueryChange,
}: DataTableProps<T>) {
  const [localQuery, setLocalQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [localPage, setLocalPage] = useState(1);

  const searchText = serverMode ? query || "" : localQuery;
  const currentPage = serverMode ? page || 1 : localPage;
  const currentSize = serverMode ? size || pageSize : pageSize;

  const filtered = useMemo(() => {
    const normalized = searchText.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(normalized))
    );
  }, [rows, searchText]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      const cmp = av.localeCompare(bv, "th");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalRows = serverMode ? total || 0 : sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / currentSize));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * currentSize;
  const paged = serverMode ? rows : sorted.slice(start, start + currentSize);

  function onSort(key: keyof T) {
    const newOrder: "asc" | "desc" = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    const newSort = String(key);
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    if (serverMode && onQueryChange) {
      onQueryChange({ page: 1, size: currentSize, sort: newSort, order: newOrder, q: searchText });
    }
  }

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-emerald-950">{title}</h2>
        <input
          value={searchText}
          onChange={(e) => {
            const nextQuery = e.target.value;
            if (serverMode && onQueryChange) {
              onQueryChange({ page: 1, size: currentSize, sort: sortKey ? String(sortKey) : "createdAt", order: sortDir, q: nextQuery });
            } else {
              setLocalPage(1);
              setLocalQuery(nextQuery);
            }
          }}
          className="w-full rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-sm outline-none transition md:w-80"
          placeholder={searchPlaceholder}
        />
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-emerald-50/60 text-xs uppercase tracking-[0.12em] text-emerald-700">
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} className={`px-3 py-3 ${col.className || ""}`}>
                  {col.sortable ? (
                    <button className="inline-flex items-center gap-1 font-bold" onClick={() => onSort(col.key)}>
                      {col.label}
                      {sortKey === col.key ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                    </button>
                  ) : (
                    <span className="font-bold">{col.label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : null}
            {!loading && paged.map((row, idx) => (
              <tr key={idx} className="border-b border-slate-100">
                {columns.map((col) => (
                  <td key={String(col.key)} className={`px-3 py-3 text-slate-700 ${col.className || ""}`}>
                    {col.render ? col.render(row) : String(row[col.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
            {!loading && paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">
                  ไม่พบข้อมูล
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <footer className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <p>
          แสดง {paged.length} จาก {sorted.length} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = Math.max(1, safePage - 1);
              if (serverMode && onQueryChange) {
                onQueryChange({ page: next, size: currentSize, sort: sortKey ? String(sortKey) : "createdAt", order: sortDir, q: searchText });
              } else {
                setLocalPage(next);
              }
            }}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50"
            disabled={safePage === 1}
          >
            ก่อนหน้า
          </button>
          <span>
            หน้า {safePage}/{totalPages}
          </span>
          <button
            onClick={() => {
              const next = Math.min(totalPages, safePage + 1);
              if (serverMode && onQueryChange) {
                onQueryChange({ page: next, size: currentSize, sort: sortKey ? String(sortKey) : "createdAt", order: sortDir, q: searchText });
              } else {
                setLocalPage(next);
              }
            }}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50"
            disabled={safePage === totalPages}
          >
            ถัดไป
          </button>
        </div>
      </footer>
    </section>
  );
}
