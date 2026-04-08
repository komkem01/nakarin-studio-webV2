import Link from "next/link";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-amber-100 sticky top-0 z-50">
        <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-amber-800">
            นาคารินสตูดิโอ
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/portfolio" className="text-gray-600 hover:text-amber-700 transition">
              ผลงาน
            </Link>
            <Link href="/order" className="text-gray-600 hover:text-amber-700 transition">
              สั่งทำบายศรี
            </Link>
            <Link
              href="/order"
              className="bg-amber-700 text-white px-4 py-2 rounded-lg hover:bg-amber-800 transition text-sm"
            >
              สั่งทำเลย
            </Link>
          </div>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="bg-amber-900 text-amber-100 py-10 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-white mb-2">นาคารินสตูดิโอ</h3>
            <p className="text-sm leading-6">
              รับทำบายศรีทุกประเภท สำหรับงานมงคลทั่วไทย
            </p>
          </div>
          <div>
            <h3 className="font-bold text-white mb-2">บริการ</h3>
            <ul className="text-sm space-y-1">
              <li><Link href="/portfolio" className="hover:text-white transition">ดูผลงาน</Link></li>
              <li><Link href="/order" className="hover:text-white transition">สั่งทำบายศรี</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-2">ติดต่อ</h3>
            <p className="text-sm leading-6">
              Line: @nakarin-studio<br />
              Tel: 08x-xxx-xxxx
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-amber-300 mt-8">
          © {new Date().getFullYear()} นาคารินสตูดิโอ สงวนลิขสิทธิ์
        </p>
      </footer>
    </div>
  );
}
