import Link from "next/link";
import CustomerNavAuth from "@/components/layout/customer-nav-auth";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="h-0.5 bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-700" />
        <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-emerald-800 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-yellow-300 tracking-wider">NS</span>
            </div>
            <span className="text-[17px] font-bold text-emerald-950 tracking-tight">นครินทร์ สตูดิโอ</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/portfolio" className="text-gray-600 hover:text-emerald-800 transition">
              ผลงาน
            </Link>
            <Link href="/order" className="text-gray-600 hover:text-emerald-800 transition">
              สั่งทำบายศรี
            </Link>
            <Link
              href="/order"
              className="bg-emerald-800 text-white px-4 py-2 rounded-lg hover:bg-emerald-900 transition text-sm"
            >
              สั่งทำเลย
            </Link>
            <CustomerNavAuth />
          </div>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="bg-emerald-950 text-emerald-100 py-10 px-4 border-t-4 border-yellow-700">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-yellow-200 mb-2">นครินทร์ สตูดิโอ</h3>
            <p className="text-sm leading-6">
              รับทำบายศรีทุกประเภท สำหรับงานมงคลทั่วไทย
            </p>
          </div>
          <div>
            <h3 className="font-bold text-yellow-200 mb-2">บริการ</h3>
            <ul className="text-sm space-y-1">
              <li><Link href="/portfolio" className="hover:text-white transition">ดูผลงาน</Link></li>
              <li><Link href="/order" className="hover:text-white transition">สั่งทำบายศรี</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-yellow-200 mb-2">ติดต่อ</h3>
            <p className="text-sm leading-6">
              Line: @nakarin-studio<br />
              Tel: 08x-xxx-xxxx
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-yellow-100/80 mt-8">
          © {new Date().getFullYear()} นครินทร์ สตูดิโอ สงวนลิขสิทธิ์
        </p>
      </footer>
    </div>
  );
}
