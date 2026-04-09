"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { orderApi, authApi, addressApi } from "@/lib/api/client";
import type {
  EventType,
  Gender,
  OrderMode,
  Province,
  District,
  SubDistrict,
  TitlePrefix,
} from "@/types";

type Step = 1 | 2 | 3;

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: "wedding", label: "แต่งงาน" },
  { value: "ordination", label: "บวช" },
  { value: "housewarming", label: "ขึ้นบ้านใหม่" },
  { value: "blessing", label: "งานมงคล" },
  { value: "graduation", label: "รับปริญญา" },
  { value: "other", label: "อื่นๆ" },
];

const TITLE_PREFIX_OPTIONS: TitlePrefix[] = ["นาย", "นาง", "นางสาว", "ดร.", "รศ.", "ศ.", "อื่นๆ"];
const GENDER_OPTIONS: Gender[] = ["ชาย", "หญิง", "อื่นๆ"];
const TITLE_PREFIX_BY_GENDER: Record<Gender, TitlePrefix[]> = {
  ชาย: ["นาย", "ดร.", "รศ.", "ศ.", "อื่นๆ"],
  หญิง: ["นาง", "นางสาว", "ดร.", "รศ.", "ศ.", "อื่นๆ"],
  "อื่นๆ": ["ดร.", "รศ.", "ศ.", "อื่นๆ"],
};

interface FormState {
  mode: OrderMode;
  product_id: string;
  event_type: EventType;
  event_date: string;
  event_location: string;
  province_id: string;
  district_id: string;
  sub_district_id: string;
  budget_min: string;
  budget_max: string;
  color_notes: string;
  customization_notes: string;
  // Auth
  title_prefix: TitlePrefix;
  gender: Gender;
  name: string;
  phone: string;
  email: string;
}

const defaultForm: FormState = {
  mode: "preset",
  product_id: "",
  event_type: "wedding",
  event_date: "",
  event_location: "",
  province_id: "",
  district_id: "",
  sub_district_id: "",
  budget_min: "",
  budget_max: "",
  color_notes: "",
  customization_notes: "",
  title_prefix: "นาย",
  gender: "ชาย",
  name: "",
  phone: "",
  email: "",
};

export default function OrderPage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>({
    ...defaultForm,
    mode: (searchParams.get("mode") as OrderMode) ?? "preset",
    product_id: searchParams.get("product_id") ?? "",
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [subDistricts, setSubDistricts] = useState<SubDistrict[]>([]);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const guestTitleOptions = TITLE_PREFIX_BY_GENDER[form.gender];

  useEffect(() => {
    if (!guestTitleOptions.includes(form.title_prefix)) {
      setForm((f) => ({ ...f, title_prefix: guestTitleOptions[0] }));
    }
  }, [form.gender, form.title_prefix, guestTitleOptions]);

  // Check login state
  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
  }, []);

  // Load provinces
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await addressApi.listProvinces();
        if (!ignore) {
          setProvinces(res.data.data ?? []);
          setNetworkError(null);
        }
      } catch {
        if (!ignore) {
          setProvinces([]);
          setNetworkError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
        }
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  // Load districts when province changes
  useEffect(() => {
    if (!form.province_id) {
      setDistricts([]);
      setSubDistricts([]);
      return;
    }

    let ignore = false;
    const load = async () => {
      try {
        const res = await addressApi.listDistricts(form.province_id);
        if (!ignore) {
          setDistricts(res.data.data ?? []);
          setNetworkError(null);
        }
      } catch {
        if (!ignore) {
          setDistricts([]);
          setSubDistricts([]);
          setNetworkError("ไม่สามารถโหลดข้อมูลอำเภอได้ กรุณาลองใหม่");
        }
      }
    };
    void load();

    setForm((f) => ({ ...f, district_id: "", sub_district_id: "" }));
    return () => {
      ignore = true;
    };
  }, [form.province_id]);

  // Load sub-districts when district changes
  useEffect(() => {
    if (!form.district_id) {
      setSubDistricts([]);
      return;
    }

    let ignore = false;
    const load = async () => {
      try {
        const res = await addressApi.listSubDistricts(form.district_id);
        if (!ignore) {
          setSubDistricts(res.data.data ?? []);
          setNetworkError(null);
        }
      } catch {
        if (!ignore) {
          setSubDistricts([]);
          setNetworkError("ไม่สามารถโหลดข้อมูลตำบลได้ กรุณาลองใหม่");
        }
      }
    };
    void load();

    setForm((f) => ({ ...f, sub_district_id: "" }));
    return () => {
      ignore = true;
    };
  }, [form.district_id]);

  const set = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // Register mutation (for guests)
  const registerMutation = useMutation({
    mutationFn: () =>
      authApi.register({
        title_prefix: form.title_prefix,
        gender: form.gender,
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        password: form.phone, // use phone as default password
      }),
    onSuccess: (res) => {
      localStorage.setItem("token", res.data.data.token);
      setIsLoggedIn(true);
    },
  });

  // Order mutation
  const orderMutation = useMutation({
    mutationFn: () =>
      orderApi.create({
        order_mode: form.mode,
        product_id: form.product_id || undefined,
        event_type: form.event_type,
        event_date: form.event_date,
        event_location: form.event_location,
        event_sub_district_id: form.sub_district_id || undefined,
        budget_min: form.budget_min ? Number(form.budget_min) : undefined,
        budget_max: form.budget_max ? Number(form.budget_max) : undefined,
        color_notes: form.color_notes || undefined,
        customization_notes: form.customization_notes || undefined,
      }),
    onSuccess: (res) => {
      setSubmittedOrderId(res.data.data.id);
      setStep(3);
    },
  });

  async function handleSubmit() {
    try {
      if (!isLoggedIn) {
        await registerMutation.mutateAsync();
      }
      await orderMutation.mutateAsync();
    } catch {
      setNetworkError("ส่งคำสั่งซื้อไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่");
    }
  }

  const isLoading = registerMutation.isPending || orderMutation.isPending;
  const error = registerMutation.error ?? orderMutation.error;

  // ─── Step 3: Success ───────────────────────────────────────────────────────
  if (step === 3 && submittedOrderId) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">รับคำสั่งซื้อแล้ว!</h1>
        <p className="text-gray-500 mb-6">
          ทีมงานจะติดต่อกลับเร็วๆ นี้ ท่านสามารถตรวจสอบสถานะคำสั่งซื้อได้ด้านล่าง
        </p>
        <a
          href={`/order/status/${submittedOrderId}`}
          className="inline-block bg-emerald-800 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-900 transition"
        >
          ติดตามคำสั่งซื้อ
        </a>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">สั่งทำบายศรี</h1>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition ${
                step >= s ? "bg-emerald-800 text-white" : "bg-gray-200 text-gray-400"
              }`}
            >
              {s}
            </div>
            {s < 2 && <div className={`h-0.5 w-12 ${step > s ? "bg-emerald-800" : "bg-gray-200"}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">
          {step === 1 ? "เลือกรูปแบบ" : "รายละเอียดงาน"}
        </span>
      </div>

      {/* ─── Step 1: Mode ── */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-gray-600 font-medium mb-2">เลือกรูปแบบการสั่งซื้อ</p>
          {(
            [
              { value: "preset", label: "บายศรีสำเร็จรูป", desc: "เลือกจากแบบที่มีอยู่แล้ว" },
              {
                value: "custom_own",
                label: "สั่งทำตามความต้องการ",
                desc: "ระบุสี ดอกไม้ และรายละเอียดเอง",
              },
              {
                value: "custom_from_product",
                label: "สั่งทำจากแบบตัวอย่าง",
                desc: "ดัดแปลงจากผลงานที่มีอยู่",
              },
            ] as { value: OrderMode; label: string; desc: string }[]
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => set("mode", opt.value)}
              className={`w-full text-left border-2 rounded-xl p-4 transition ${
                form.mode === opt.value
                  ? "border-emerald-800 bg-emerald-50"
                  : "border-gray-200 hover:border-emerald-300"
              }`}
            >
              <p className="font-semibold text-gray-800">{opt.label}</p>
              <p className="text-sm text-gray-500">{opt.desc}</p>
            </button>
          ))}
          <button
            onClick={() => setStep(2)}
            className="w-full bg-emerald-800 text-white py-3 rounded-xl font-semibold hover:bg-emerald-900 transition mt-2"
          >
            ถัดไป →
          </button>
        </div>
      )}

      {/* ─── Step 2: Details ── */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Event type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทงาน *</label>
            <select
              value={form.event_type}
              onChange={(e) => set("event_type", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {EVENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Event date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่จัดงาน *</label>
            <input
              type="date"
              value={form.event_date}
              onChange={(e) => set("event_date", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              สถานที่จัดงาน *
            </label>
            <input
              type="text"
              value={form.event_location}
              onChange={(e) => set("event_location", e.target.value)}
              placeholder="ชื่อสถานที่ หรือที่อยู่"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Address cascade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">จังหวัด</label>
              <select
                value={form.province_id}
                onChange={(e) => set("province_id", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="">เลือกจังหวัด</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>{p.name_th}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">อำเภอ</label>
              <select
                value={form.district_id}
                onChange={(e) => set("district_id", e.target.value)}
                disabled={!form.province_id}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-40"
              >
                <option value="">เลือกอำเภอ</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name_th}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ตำบล</label>
              <select
                value={form.sub_district_id}
                onChange={(e) => set("sub_district_id", e.target.value)}
                disabled={!form.district_id}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-40"
              >
                <option value="">เลือกตำบล</option>
                {subDistricts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name_th}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Budget */}
          {form.mode !== "preset" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  งบประมาณต่ำสุด (บาท)
                </label>
                <input
                  type="number"
                  value={form.budget_min}
                  onChange={(e) => set("budget_min", e.target.value)}
                  placeholder="500"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  งบประมาณสูงสุด (บาท)
                </label>
                <input
                  type="number"
                  value={form.budget_max}
                  onChange={(e) => set("budget_max", e.target.value)}
                  placeholder="2000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">นัดสีดอกไม้</label>
            <input
              type="text"
              value={form.color_notes}
              onChange={(e) => set("color_notes", e.target.value)}
              placeholder="เช่น สีขาว เหลือง ชมพู"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รายละเอียดเพิ่มเติม
            </label>
            <textarea
              value={form.customization_notes}
              onChange={(e) => set("customization_notes", e.target.value)}
              rows={3}
              placeholder="แจ้งรายละเอียดเพิ่มเติมที่ต้องการ"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Guest — collect name/phone */}
          {!isLoggedIn && (
            <div className="border-t pt-5 space-y-3">
              <p className="text-sm font-medium text-gray-700">ข้อมูลติดต่อ</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={form.title_prefix}
                  onChange={(e) => set("title_prefix", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {guestTitleOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <select
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {GENDER_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="ชื่อ-นามสกุล *"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="เบอร์โทรศัพท์ *"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="อีเมล (ไม่บังคับ)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm">
              เกิดข้อผิดพลาด กรุณาลองอีกครั้ง
            </p>
          )}

          {networkError && (
            <p className="text-red-500 text-sm">{networkError}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border-2 border-gray-300 py-3 rounded-xl font-semibold text-gray-600 hover:border-gray-400 transition"
            >
              ← ย้อนกลับ
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                isLoading ||
                !form.event_date ||
                !form.event_location ||
                (!isLoggedIn && (!form.name || !form.phone))
              }
              className="flex-2 flex-1 bg-emerald-800 text-white py-3 rounded-xl font-semibold hover:bg-emerald-900 transition disabled:opacity-50"
            >
              {isLoading ? "กำลังส่ง..." : "ส่งคำสั่งซื้อ"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
