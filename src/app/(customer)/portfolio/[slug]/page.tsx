import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Product, ApiResponse, EventType } from "@/types";

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: "แต่งงาน",
  ordination: "บวช",
  housewarming: "ขึ้นบ้านใหม่",
  blessing: "งานมงคล",
  graduation: "รับปริญญา",
  other: "อื่นๆ",
};

async function getProduct(slug: string): Promise<Product | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
  try {
    const res = await fetch(`${base}/products/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json: ApiResponse<Product> = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "ไม่พบผลงาน" };
  return {
    title: product.seo_title ?? `${product.title} — นครินทร์ สตูดิโอ`,
    description:
      product.seo_description ?? product.description ?? undefined,
    openGraph: product.images?.[0]
      ? { images: [{ url: product.images[0].url }] }
      : undefined,
  };
}

export default async function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const mainImage = product.images?.find((img) => img.is_main) ?? product.images?.[0];
  const otherImages = product.images?.filter((img) => img.id !== mainImage?.id) ?? [];

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <Link href="/portfolio" className="text-emerald-800 text-sm mb-6 inline-block hover:underline">
        ← กลับหน้าผลงาน
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-emerald-50">
            {mainImage ? (
              <Image
                src={mainImage.url}
                alt={product.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-emerald-200 text-6xl">
                🌸
              </div>
            )}
          </div>
          {otherImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {otherImages.slice(0, 5).map((img) => (
                <div
                  key={img.id}
                  className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-emerald-50"
                >
                  <Image
                    src={img.url}
                    alt={product.title}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-medium px-3 py-1 rounded-full mb-3">
            {EVENT_TYPE_LABELS[product.event_type]}
          </span>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">{product.title}</h1>

          {product.price_start != null && (
            <p className="text-2xl font-semibold text-emerald-800 mb-4">
              เริ่มต้น {product.price_start.toLocaleString("th-TH")} บาท
            </p>
          )}

          {product.description && (
            <p className="text-gray-600 leading-7 mb-6 whitespace-pre-line">
              {product.description}
            </p>
          )}

          {product.color_tags?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">สีที่มี</p>
              <div className="flex flex-wrap gap-2">
                {product.color_tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.service_areas?.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-1">พื้นที่ให้บริการ</p>
              <p className="text-sm text-gray-500">{product.service_areas.join(", ")}</p>
            </div>
          )}

          <Link
            href={`/order?product_id=${product.id}&mode=custom_from_product`}
            className="block w-full bg-emerald-800 text-white text-center py-3 rounded-xl font-semibold hover:bg-emerald-900 transition"
          >
            สั่งทำแบบนี้
          </Link>
        </div>
      </div>
    </main>
  );
}
