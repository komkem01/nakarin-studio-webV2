import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "นาคารินสตูดิโอ — บายศรีสำหรับทุกงานสำคัญ",
  description:
    "รับทำบายศรีตามงาน แต่งงาน บวช ขึ้นบ้านใหม่ รับปริญญา และอื่นๆ สั่งง่าย จัดส่งถึงงาน",
};

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-amber-50 py-24 text-center px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-4">
          บายศรีสำหรับทุกงานสำคัญ
        </h1>
        <p className="text-amber-700 text-lg mb-8 max-w-xl mx-auto">
          รับทำบายศรีแต่งงาน บวช ขึ้นบ้านใหม่ รับปริญญา และงานมงคลอื่นๆ
          ออกแบบพิเศษตามความต้องการ
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/portfolio"
            className="bg-amber-700 text-white px-8 py-3 rounded-lg font-medium hover:bg-amber-800 transition"
          >
            ดูผลงาน
          </Link>
          <Link
            href="/order"
            className="border-2 border-amber-700 text-amber-700 px-8 py-3 rounded-lg font-medium hover:bg-amber-50 transition"
          >
            สั่งทำบายศรี
          </Link>
        </div>
      </section>

      {/* Featured products placeholder */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
          ผลงานแนะนำ
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="rounded-xl bg-gray-100 h-64 animate-pulse" />
          <div className="rounded-xl bg-gray-100 h-64 animate-pulse" />
          <div className="rounded-xl bg-gray-100 h-64 animate-pulse" />
        </div>
        <div className="text-center mt-8">
          <Link href="/portfolio" className="text-amber-700 underline">
            ดูทั้งหมด →
          </Link>
        </div>
      </section>

      {/* How to order */}
      <section className="bg-amber-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-amber-900 text-center mb-10">
            วิธีสั่งทำบายศรี
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { step: "1", title: "เลือกแบบ", desc: "เลือกจากแบบสำเร็จ หรือแจ้งความต้องการเอง" },
              { step: "2", title: "รับใบเสนอราคา", desc: "ทีมงานจะติดต่อกลับพร้อมใบเสนอราคา" },
              { step: "3", title: "จัดส่งถึงงาน", desc: "จัดส่งตรงถึงสถานที่จัดงานของท่าน" },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-700 text-white flex items-center justify-center text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold text-amber-900">{item.title}</h3>
                <p className="text-amber-700 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

