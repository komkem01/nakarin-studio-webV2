import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import CustomerShell from "../../../components/customer/CustomerShell";
import { customerApi, ProductItem } from "../../../services/customerApi";
import { useToast } from "../../../components/ui/Toast";

export default function CustomerPortfolioDetailPage() {
  const router = useRouter();
  const productId = typeof router.query.id === "string" ? router.query.id : "";
  const toast = useToast();
  const [item, setItem] = useState<ProductItem | null>(null);
  const [similarItems, setSimilarItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    customerApi
      .getProductById(productId)
      .then(async (res) => {
        setItem(res);
        try {
          const similar = await customerApi.listProducts({ categoryId: res.categoryId, isActive: true, page: 1, limit: 8 });
          setSimilarItems((similar.items || []).filter((x) => x.id !== res.id).slice(0, 4));
        } catch {
          setSimilarItems([]);
        }
      })
      .catch(() => {
        setItem(null);
        setSimilarItems([]);
        toast("ไม่พบรายละเอียดสินค้า", "error");
      })
      .finally(() => setLoading(false));
  }, [productId, toast]);

  return (
    <CustomerShell>
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/customer/portfolio" className="hover:text-emerald-700">Portfolio</Link>
        <span>/</span>
        <span className="text-slate-800">{loading ? "..." : (item?.name ?? "รายละเอียดสินค้า")}</span>
      </nav>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <div className="h-5 w-32 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-9 w-64 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-28 animate-pulse rounded-lg bg-slate-200" />
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      )}

      {!loading && !item && (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-24 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-5xl">😕</p>
          <p className="mt-4 font-bold text-slate-700">ไม่พบรายละเอียดสินค้า</p>
          <Link href="/customer/portfolio" className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:text-emerald-900">
            ← กลับสู่ Portfolio
          </Link>
        </div>
      )}

      {!loading && item && (
        <>
          {/* Main detail */}
          <section className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            {/* Left: info */}
            <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                {item.categoryName}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{item.name}</h1>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {item.isActive ? "พร้อมให้จอง" : "ปิดการขาย"}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-500">
                  {item.sku}
                </span>
              </div>

              <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600">
                {item.description || "ไม่มีรายละเอียดเพิ่มเติม"}
              </p>
            </div>

            {/* Right: price & CTA */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-700 p-6 text-white shadow-lg">
                <p className="text-sm text-emerald-300">ราคาเริ่มต้น</p>
                <p className="mt-1 text-4xl font-black tracking-tight">
                  {item.price.toLocaleString("th-TH")}
                  <span className="ml-1 text-xl font-semibold text-emerald-300">บาท</span>
                </p>
                <p className="mt-3 text-sm text-emerald-200">คงเหลือ {item.stockQty} ชิ้น</p>

                {item.isActive && (
                  <Link
                    href={`/customer/order/new?productId=${item.id}`}
                    className="mt-5 flex w-full items-center justify-center rounded-xl bg-white py-3 font-bold text-emerald-900 transition hover:bg-emerald-50 active:scale-[.98]"
                  >
                    เลือกแบบนี้เพื่อจอง →
                  </Link>
                )}
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">ข้อมูลสินค้า</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">รหัสสินค้า</dt>
                    <dd className="font-mono font-semibold text-slate-800">{item.sku}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">หมวดหมู่</dt>
                    <dd className="font-semibold text-slate-800">{item.categoryName}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">คงเหลือ</dt>
                    <dd className="font-semibold text-slate-800">{item.stockQty} ชิ้น</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          {/* Similar products */}
          {similarItems.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-4 text-lg font-black text-slate-900">สินค้าที่คล้ายกัน</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {similarItems.map((sim) => (
                  <article
                    key={sim.id}
                    className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:ring-emerald-200"
                  >
                    <div className="mb-2 h-1 w-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">{sim.categoryName}</p>
                    <Link
                      href={`/customer/portfolio/${sim.id}`}
                      className="mt-1 block text-sm font-bold text-slate-900 group-hover:text-emerald-800"
                    >
                      {sim.name}
                    </Link>
                    <p className="mt-2 text-sm font-black text-emerald-800">
                      {sim.price.toLocaleString("th-TH")} บาท
                    </p>
                    <Link
                      href={`/customer/order/new?productId=${sim.id}`}
                      className="mt-3 block w-full rounded-xl border border-emerald-200 py-1.5 text-center text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      เลือกแบบนี้
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </CustomerShell>
  );
}
