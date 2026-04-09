import type { Metadata } from "next";
import Link from "next/link";
import type { PaginatedResponse, Product } from "@/types";

export const metadata: Metadata = {
  title: "นครินทร์ สตูดิโอ — บายศรีสำหรับทุกงานสำคัญ",
  description:
    "รับทำบายศรีตามงาน แต่งงาน บวช ขึ้นบ้านใหม่ รับปริญญา และอื่นๆ สั่งง่าย จัดส่งถึงงาน",
};

async function getFeaturedProducts(): Promise<Product[]> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
  const url = new URL(`${base}/products`);
  url.searchParams.set("is_featured", "true");
  url.searchParams.set("size", "6");

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json: PaginatedResponse<Product> = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const featured = await getFeaturedProducts();

  return (
    <main>
      {/* Hero */}
      <section className="py-24 text-center px-4 bg-[linear-gradient(180deg,#ffffff_0%,#ecf6f1_75%,#f9f4e6_100%)] border-b border-yellow-100">
        <p className="text-yellow-700 tracking-[0.18em] text-xs font-semibold uppercase mb-4">
          Nakarin Studio
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-emerald-950 mb-4">
          บายศรีสำหรับทุกงานสำคัญ
        </h1>
        <p className="text-emerald-900/80 text-lg mb-8 max-w-xl mx-auto">
          รับทำบายศรีแต่งงาน บวช ขึ้นบ้านใหม่ รับปริญญา และงานมงคลอื่นๆ
          ออกแบบพิเศษตามความต้องการ
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/portfolio"
            className="bg-emerald-800 text-white px-8 py-3 rounded-lg font-medium hover:bg-emerald-900 transition"
          >
            ดูผลงาน
          </Link>
          <Link
            href="/order"
            className="border-2 border-yellow-700 text-yellow-800 px-8 py-3 rounded-lg font-medium hover:bg-yellow-50 transition"
          >
            สั่งทำบายศรี
          </Link>
        </div>
      </section>

      {/* Featured products */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
          ผลงานแนะนำ
        </h2>
        {featured.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl">
            <p className="text-gray-500">ยังไม่มีผลงานแนะนำในขณะนี้</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((product) => (
              <Link
                key={product.id}
                href={`/portfolio/${product.slug}`}
                className="group rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-emerald-50 to-yellow-50 flex items-center justify-center">
                  <span className="text-2xl font-bold tracking-[0.2em] text-emerald-200 select-none">NS</span>
                </div>
                <div className="p-4 bg-white">
                  <h3 className="font-semibold text-gray-800 line-clamp-1">{product.title}</h3>
                  {product.price_start != null && (
                    <p className="text-sm text-emerald-700 mt-1">
                      เริ่มต้น {product.price_start.toLocaleString("th-TH")} บาท
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="text-center mt-8">
          <Link href="/portfolio" className="text-yellow-800 underline underline-offset-4">
            ดูทั้งหมด →
          </Link>
        </div>
      </section>

      {/* How to order */}
      <section className="bg-white py-16 px-4 border-y border-yellow-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-emerald-950 text-center mb-10">
            วิธีสั่งทำบายศรี
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { step: "1", title: "เลือกแบบ", desc: "เลือกจากแบบสำเร็จ หรือแจ้งความต้องการเอง" },
              { step: "2", title: "รับใบเสนอราคา", desc: "ทีมงานจะติดต่อกลับพร้อมใบเสนอราคา" },
              { step: "3", title: "จัดส่งถึงงาน", desc: "จัดส่งตรงถึงสถานที่จัดงานของท่าน" },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-700 text-white flex items-center justify-center text-xl font-bold shadow-sm">
                  {item.step}
                </div>
                <h3 className="font-semibold text-emerald-950">{item.title}</h3>
                <p className="text-emerald-800 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

