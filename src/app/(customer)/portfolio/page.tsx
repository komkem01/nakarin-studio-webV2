import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { Product, EventType, PaginatedResponse } from "@/types";

export const metadata: Metadata = {
  title: "ผลงานบายศรี — นครินทร์ สตูดิโอ",
  description:
    "ชมผลงานบายศรีแต่งงาน บวช ขึ้นบ้านใหม่ รับปริญญา จากนครินทร์ สตูดิโอ สั่งทำได้เลยวันนี้",
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: "แต่งงาน",
  ordination: "บวช",
  housewarming: "ขึ้นบ้านใหม่",
  blessing: "งานมงคล",
  graduation: "รับปริญญา",
  other: "อื่นๆ",
};

async function getProducts(eventType?: string): Promise<Product[]> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
  const url = new URL(`${base}/products`);
  url.searchParams.set("page", "1");
  url.searchParams.set("size", "24");
  if (eventType) url.searchParams.set("event_type", eventType);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json: PaginatedResponse<Product> = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ event_type?: string }>;
}) {
  const params = await searchParams;
  const products = await getProducts(params.event_type);

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">ผลงานของเรา</h1>
      <p className="text-gray-500 mb-8">บายศรีสำหรับทุกงานมงคล</p>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-10">
        <Link
          href="/portfolio"
          className={`px-4 py-1.5 rounded-full text-sm border transition ${
            !params.event_type
              ? "bg-emerald-800 text-white border-emerald-800"
              : "border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          }`}
        >
          ทั้งหมด
        </Link>
        {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(
          ([key, label]) => (
            <Link
              key={key}
              href={`/portfolio?event_type=${key}`}
              className={`px-4 py-1.5 rounded-full text-sm border transition ${
                params.event_type === key
                  ? "bg-emerald-800 text-white border-emerald-800"
                  : "border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              }`}
            >
              {label}
            </Link>
          )
        )}
      </div>

      {/* Product grid */}
      {products.length === 0 ? (
        <p className="text-center text-gray-400 py-24">ยังไม่มีผลงานในหมวดนี้</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/portfolio/${product.slug}`}
              className="group rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition"
            >
              <div className="relative aspect-square bg-emerald-50">
                {product.images?.[0] ? (
                  <Image
                    src={product.images[0].url}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-emerald-200 text-4xl">
                    🌸
                  </div>
                )}
                <span className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm text-emerald-800 text-xs font-medium px-2 py-1 rounded-full">
                  {EVENT_TYPE_LABELS[product.event_type]}
                </span>
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-gray-800 line-clamp-1">
                  {product.title}
                </h2>
                {product.price_start != null && (
                  <p className="text-emerald-800 text-sm mt-1">
                    เริ่มต้น {product.price_start.toLocaleString("th-TH")} บาท
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
