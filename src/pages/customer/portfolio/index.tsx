import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import CustomerShell from "../../../components/customer/CustomerShell";
import { customerApi, ProductItem } from "../../../services/customerApi";

type CategoryOption = { id: string; name: string };

export default function CustomerPortfolioPage() {
  const router = useRouter();
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");

  const q = typeof router.query.q === "string" ? router.query.q : "";
  const categoryId = typeof router.query.categoryId === "string" ? router.query.categoryId : "";

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    customerApi
      .listProducts({ q: q || undefined, categoryId: categoryId || undefined, isActive: true, page: 1, limit: 120 })
      .then((res) => { if (mounted) setItems(res.items || []); })
      .catch(() => { if (mounted) setItems([]); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [q, categoryId]);

  const categories = useMemo<CategoryOption[]>(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.categoryId && item.categoryName) map.set(item.categoryId, item.categoryName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  function updateQuery(next: { q?: string; categoryId?: string }) {
    const query: Record<string, string> = {};
    const nextQ = typeof next.q === "string" ? next.q : q;
    const nextCategory = typeof next.categoryId === "string" ? next.categoryId : categoryId;
    if (nextQ.trim()) query.q = nextQ.trim();
    if (nextCategory.trim()) query.categoryId = nextCategory.trim();
    void router.push({ pathname: "/customer/portfolio", query }, undefined, { shallow: true });
  }

  return (
    <CustomerShell title="Portfolio">
      {/* Search + filter bar */}
      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") updateQuery({ q: searchInput }); }}
            placeholder="ค้นหาสินค้า เช่น บายศรีแต่งงาน..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          />
          <button
            onClick={() => updateQuery({ q: searchInput })}
            className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-emerald-500"
          >
            ค้นหา
          </button>
        </div>

        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => updateQuery({ categoryId: "" })}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                !categoryId
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ทั้งหมด
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => updateQuery({ categoryId: cat.id })}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  categoryId === cat.id
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-4xl">🔍</p>
          <p className="mt-3 font-semibold text-slate-700">ไม่พบสินค้าที่ค้นหา</p>
          <p className="mt-1 text-sm text-slate-400">ลองเปลี่ยนคำค้นหาหรือหมวดหมู่อื่น</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="group flex flex-col rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-emerald-200"
            >
              {/* Color band */}
              <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-emerald-600 to-emerald-400" />

              <div className="flex flex-1 flex-col p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-600">
                  {item.categoryName}
                </p>
                <h2 className="mt-1 text-base font-black text-slate-900 group-hover:text-emerald-800">
                  <Link href={`/customer/portfolio/${item.id}`}>{item.name}</Link>
                </h2>
                {item.description && (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {item.description}
                  </p>
                )}

                <div className="mt-auto pt-4">
                  <p className="text-xl font-black text-emerald-800">
                    {item.price.toLocaleString("th-TH")}{" "}
                    <span className="text-sm font-semibold text-slate-500">บาท</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">คงเหลือ {item.stockQty} ชิ้น</p>

                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/customer/portfolio/${item.id}`}
                      className="flex-1 rounded-xl border border-slate-200 py-2 text-center text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                    >
                      รายละเอียด
                    </Link>
                    <Link
                      href={`/customer/order/new?productId=${item.id}`}
                      className="flex-1 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-600 py-2 text-center text-xs font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-emerald-500"
                    >
                      เลือกแบบนี้
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </CustomerShell>
  );
}
