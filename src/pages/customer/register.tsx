import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { SelectDropdown } from "../../components/ui/Dropdown";
import { customerApi, GenderItem, PrefixItem } from "../../services/customerApi";
import { setCustomerSession } from "../../store/customerSession";
import { useToast } from "../../components/ui/Toast";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const nextPath = typeof router.query.next === "string" ? router.query.next : "/customer/orders";
  const [genders, setGenders] = useState<GenderItem[]>([]);
  const [prefixes, setPrefixes] = useState<PrefixItem[]>([]);
  const [gendersLoading, setGendersLoading] = useState(true);
  const [prefixesLoading, setPrefixesLoading] = useState(false);
  const [genderId, setGenderId] = useState("");
  const [prefixId, setPrefixId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  // Use a ref so toast never becomes a useEffect dependency
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; });

  // Fetch genders once on mount
  useEffect(() => {
    let mounted = true;
    setGendersLoading(true);
    customerApi
      .listGenders()
      .then((items) => {
        if (!mounted) return;
        setGenders(items);
        if (items.length > 0) setGenderId(items[0].id);
      })
      .catch(() => {
        if (!mounted) return;
        setGenders([]);
        toastRef.current("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่", "error");
      })
      .finally(() => { if (mounted) setGendersLoading(false); });
    return () => { mounted = false; };
  }, []); // intentionally run once — toast is accessed via ref

  // Fetch prefixes whenever genderId changes
  useEffect(() => {
    if (!genderId) return;
    let mounted = true;
    setPrefixesLoading(true);
    customerApi
      .listPrefixesByGender(genderId)
      .then((items) => {
        if (!mounted) return;
        setPrefixes(items);
        setPrefixId(items[0]?.id || "");
      })
      .catch(() => {
        if (!mounted) return;
        setPrefixes([]);
        setPrefixId("");
        toastRef.current("โหลดคำนำหน้าไม่สำเร็จ", "error");
      })
      .finally(() => { if (mounted) setPrefixesLoading(false); });
    return () => { mounted = false; };
  }, [genderId]);

  const canSubmit = useMemo(() => Boolean(genderId && prefixId && firstName && lastName && phone && password), [genderId, prefixId, firstName, lastName, phone, password]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await customerApi.register({ genderId, prefixId, firstName, lastName, phone, password });
      setCustomerSession({
        token: res.accessToken,
        refreshToken: res.refreshToken,
        firstName: res.member.firstName,
        lastName: res.member.lastName,
        phone,
      });
      toast("สมัครสมาชิกสำเร็จ ยินดีต้อนรับ!", "success");
      void router.push(nextPath);
    } catch {
      toast("สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่", "error");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100";

  return (
    <>
      <Head>
        <title>สมัครสมาชิก — NAKARIN STUDIO</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-100 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Branding */}
          <div className="mb-8 text-center">
            <Link href="/customer">
              <span className="text-3xl font-black tracking-tight text-emerald-900">NAKARIN STUDIO</span>
            </Link>
            <p className="mt-2 text-sm text-slate-500">สร้างบัญชีใหม่เพื่อเริ่มสั่งจองผลงาน</p>
          </div>

          {/* Card */}
          <div className="rounded-3xl bg-white px-8 py-10 shadow-2xl ring-1 ring-slate-200/60">
            <h1 className="mb-6 text-xl font-bold text-slate-900">สมัครสมาชิก</h1>

            <form onSubmit={onSubmit} className="space-y-5">
              {/* Gender + Prefix */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">เพศ</label>
                  <SelectDropdown
                    value={genderId}
                    onChange={setGenderId}
                    options={genders.map((g) => ({ id: g.id, label: g.name }))}
                    placeholder="— เลือกเพศ —"
                    loading={gendersLoading}
                    disabled={gendersLoading}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">คำนำหน้า</label>
                  <SelectDropdown
                    value={prefixId}
                    onChange={setPrefixId}
                    options={prefixes.map((p) => ({ id: p.id, label: p.name }))}
                    placeholder={genderId ? "— เลือกคำนำหน้า —" : "— เลือกเพศก่อน —"}
                    loading={prefixesLoading}
                    disabled={prefixesLoading || !genderId}
                  />
                </div>
              </div>

              {/* Name */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">ชื่อ</label>
                  <input
                    placeholder="ชื่อจริง"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">นามสกุล</label>
                  <input
                    placeholder="นามสกุล"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  placeholder="0xx-xxx-xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">รหัสผ่าน</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-600 py-3 font-semibold text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-700 hover:to-emerald-500 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              มีบัญชีแล้ว?{" "}
              <Link href="/customer/login" className="font-medium text-emerald-700 hover:text-emerald-600">
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>

          {/* Back link */}
          <p className="mt-6 text-center text-sm text-slate-400">
            <Link href="/customer" className="hover:text-emerald-700">
              ← กลับสู่หน้าหลัก
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
