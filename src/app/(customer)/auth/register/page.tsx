"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { authApi } from "@/lib/api/client";
import type { Gender, TitlePrefix } from "@/types";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "ชาย", label: "ชาย" },
  { value: "หญิง", label: "หญิง" },
  { value: "อื่นๆ", label: "อื่นๆ" },
];

const TITLE_PREFIX_BY_GENDER: Record<Gender, TitlePrefix[]> = {
  ชาย: ["นาย", "ดร.", "รศ.", "ศ.", "อื่นๆ"],
  หญิง: ["นาง", "นางสาว", "ดร.", "รศ.", "ศ.", "อื่นๆ"],
  "อื่นๆ": ["ดร.", "รศ.", "ศ.", "อื่นๆ"],
};

export default function RegisterPage() {
  const router = useRouter();
  const [gender, setGender] = useState<Gender>("ชาย");
  const [titlePrefix, setTitlePrefix] = useState<TitlePrefix>("นาย");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const titleOptions = TITLE_PREFIX_BY_GENDER[gender];

  useEffect(() => {
    if (localStorage.getItem("token")) router.replace("/my-orders");
  }, [router]);

  useEffect(() => {
    if (!titleOptions.includes(titlePrefix)) setTitlePrefix(titleOptions[0]);
  }, [titleOptions, titlePrefix]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.register({
        title_prefix: titlePrefix,
        gender,
        first_name: firstName,
        last_name: lastName,
        phone,
        email: email || undefined,
        password,
      });
      localStorage.setItem("token", res.data.data.token);
      router.push("/my-orders");
      router.refresh();
    } catch {
      setError("สมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบข้อมูลหรืออาจมีบัญชีนี้แล้ว");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-yellow-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-yellow-700 tracking-[0.18em] text-xs font-semibold uppercase mb-2">Nakarin Studio</p>
          <h1 className="text-3xl font-bold text-emerald-950">สมัครสมาชิก</h1>
          <p className="text-gray-500 mt-2 text-sm">กรอกข้อมูลให้ครบเพื่อเริ่มใช้งาน</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <form onSubmit={onSubmit}>
            {/* Section 1: เพศและคำนำหน้า */}
            <div className="px-6 pt-6 pb-5 border-b border-gray-100">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-widest mb-4">ข้อมูลส่วนตัว</p>

              {/* Gender selector */}
              <label className="block text-sm font-medium text-gray-700 mb-2">เพศ</label>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {GENDER_OPTIONS.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGender(value)}
                    className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      gender === value
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50/40"
                    }`}
                  >
                    <span className="text-xl">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Title prefix */}
              <label className="block text-sm font-medium text-gray-700 mb-2">
                คำนำหน้า
                <span className="ml-2 text-xs font-normal text-gray-400">(กรองตามเพศอัตโนมัติ)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {titleOptions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTitlePrefix(t)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                      titlePrefix === t
                        ? "border-emerald-600 bg-emerald-600 text-white font-medium"
                        : "border-gray-200 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: ชื่อ-นามสกุล */}
            <div className="px-6 py-5 border-b border-gray-100 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อ</label>
                  <input
                    type="text"
                    required
                    placeholder="สมชาย"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">นามสกุล</label>
                  <input
                    type="text"
                    required
                    placeholder="ใจดี"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: บัญชีผู้ใช้ */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-widest">ข้อมูลบัญชี</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  required
                  placeholder="08x-xxx-xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-300"
                />
                <p className="text-xs text-gray-400 mt-1">ใช้เป็น Username ในการเข้าสู่ระบบ</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  อีเมล
                  <span className="ml-2 text-xs font-normal text-gray-400">ไม่บังคับ</span>
                </label>
                <input
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">รหัสผ่าน</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    {showPassword ? "ซ่อน" : "แสดง"}
                  </button>
                </div>
              </div>
            </div>

            {/* Error + Submit */}
            <div className="px-6 pb-6 space-y-3">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-800 text-white py-3 rounded-xl font-semibold hover:bg-emerald-900 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
              </button>
            </div>
          </form>
        </div>

        <p className="text-sm text-gray-500 mt-5 text-center">
          มีบัญชีแล้ว?{" "}
          <Link href="/auth/login" className="text-emerald-700 font-medium hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </main>
  );
}

