import React, { FormEvent, useState } from "react";
import { useRouter } from "next/router";

import { AdminRole, setAdminSession } from "../../store/adminSession";

const App = () => {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AdminRole>("owner");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // Validation เบื้องต้น
    if (phoneNumber.length < 10) {
      setError("กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก");
      return;
    }
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setIsLoading(true);

    // จำลองการต่อ API
    setTimeout(() => {
      console.log("Logging in with:", { phoneNumber, password });
      setAdminSession({
        name: "ผู้ดูแลระบบ",
        role,
        token: "demo-token",
        refreshToken: "demo-refresh-token",
      });
      setIsLoading(false);
      void router.push("/admin/dashboard");
    }, 1500);
  };

  const formatPhoneNumber = (value: string) => {
    const number = value.replace(/\D/g, "");
    if (number.length <= 10) {
      setPhoneNumber(number);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-100 rounded-full opacity-50 blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-50 rounded-full opacity-50 blur-3xl"></div>
      </div>

      <div className="w-full max-w-md z-10">
        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-100">
          {/* Header Section */}
          <div className="bg-emerald-900 p-8 text-center relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400"></div>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 shadow-inner">
              <span className="text-2xl font-black text-emerald-700">NS</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide mb-1">
              นครินทร์ สตูดิโอ
            </h1>
            <p className="text-emerald-100 text-sm font-light">
              ระบบจัดการหลังบ้าน (Admin Panel)
            </p>
          </div>

          {/* Form Section */}
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 text-red-700 text-sm animate-pulse">
                  {error}
                </div>
              )}

              {/* Phone Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                  <span>◉</span> เบอร์โทรศัพท์
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="08X-XXX-XXXX"
                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    value={phoneNumber}
                    onChange={(e) => formatPhoneNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                  <span>◉</span> รหัสผ่าน
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    {showPassword ? "ซ่อน" : "แสดง"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                  <span>◉</span> บทบาทผู้ใช้
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as AdminRole)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-emerald-500"
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 rounded-lg font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
                  isLoading
                    ? "bg-emerald-700 cursor-not-allowed"
                    : "bg-emerald-800 hover:bg-emerald-900 active:transform active:scale-[0.98]"
                }`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    เข้าสู่ระบบ <span>→</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-widest">
                ประณีตศิลป์ บายศรีไทย
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-gray-400 text-sm">
          &copy; 2026 Nakarin Studio. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default App;
