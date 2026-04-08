"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminProductApi, productApi } from "@/lib/api/client";
import type { Product, EventType } from "@/types";

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: "แต่งงาน",
  ordination: "บวช",
  housewarming: "ขึ้นบ้านใหม่",
  blessing: "งานมงคล",
  graduation: "รับปริญญา",
  other: "อื่นๆ",
};

const EMPTY_FORM = {
  title: "",
  slug: "",
  description: "",
  event_type: "wedding" as EventType,
  price_start: "",
  color_tags: "",
  service_areas: "",
  is_featured: false,
  is_active: true,
  seo_title: "",
  seo_description: "",
};

type FormState = typeof EMPTY_FORM;

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [page, setPage] = useState(1);
  const formRef = useRef<HTMLDivElement>(null);

  const { data, isPending } = useQuery({
    queryKey: ["admin-products", page],
    queryFn: async () => {
      const res = await productApi.list({ page, size: 20 });
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        title: form.title,
        slug: form.slug,
        description: form.description || undefined,
        event_type: form.event_type,
        price_start: form.price_start ? Number(form.price_start) : undefined,
        color_tags: form.color_tags
          ? form.color_tags.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        service_areas: form.service_areas
          ? form.service_areas.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        is_featured: form.is_featured,
        is_active: form.is_active,
        seo_title: form.seo_title || undefined,
        seo_description: form.seo_description || undefined,
      };
      return editing
        ? adminProductApi.update(editing.id, body)
        : adminProductApi.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminProductApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      title: product.title,
      slug: product.slug,
      description: product.description ?? "",
      event_type: product.event_type,
      price_start: product.price_start != null ? String(product.price_start) : "",
      color_tags: product.color_tags?.join(", ") ?? "",
      service_areas: product.service_areas?.join(", ") ?? "",
      is_featured: product.is_featured,
      is_active: product.is_active,
      seo_title: product.seo_title ?? "",
      seo_description: product.seo_description ?? "",
    });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const products: Product[] = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-gray-400">ทั้งหมด {total} รายการ</span>
        <button
          onClick={openNew}
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition"
        >
          + เพิ่มผลงาน
        </button>
      </div>

      {/* Product grid */}
      {isPending ? (
        <p className="text-gray-400 text-center py-12">กำลังโหลด...</p>
      ) : products.length === 0 ? (
        <p className="text-gray-400 text-center py-12">ยังไม่มีผลงาน</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
            >
              <div className="relative aspect-video bg-amber-50">
                {product.images?.[0] ? (
                  <Image
                    src={product.images[0].url}
                    alt={product.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-amber-200 text-3xl">
                    🌸
                  </div>
                )}
                {!product.is_active && (
                  <span className="absolute top-2 right-2 bg-gray-800/70 text-white text-xs px-2 py-0.5 rounded">
                    ปิด
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold text-gray-800 line-clamp-1">{product.title}</p>
                <p className="text-xs text-gray-400 mb-3">
                  {EVENT_TYPE_LABELS[product.event_type]}
                  {product.price_start != null &&
                    ` · เริ่ม ${product.price_start.toLocaleString("th-TH")} บาท`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(product)}
                    className="flex-1 border border-amber-300 text-amber-700 py-1.5 rounded-lg text-xs hover:bg-amber-50 transition"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("ลบผลงานนี้?")) deleteMutation.mutate(product.id);
                    }}
                    className="flex-1 border border-red-200 text-red-500 py-1.5 rounded-lg text-xs hover:bg-red-50 transition"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 mb-8">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border rounded text-sm disabled:opacity-40">← ก่อนหน้า</button>
          <span className="px-3 py-1.5 text-sm text-gray-500">หน้า {page} / {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 20)} className="px-3 py-1.5 border rounded text-sm disabled:opacity-40">ถัดไป →</button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div ref={formRef} className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-700">
              {editing ? "แก้ไขผลงาน" : "เพิ่มผลงานใหม่"}
            </h3>
            <button
              onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="ชื่อผลงาน *" value={form.title} onChange={(v) => set("title", v)} placeholder="บายศรีแต่งงาน..." />
            <Field label="Slug *" value={form.slug} onChange={(v) => set("slug", v)} placeholder="baisi-wedding-001" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทงาน *</label>
              <select
                value={form.event_type}
                onChange={(e) => set("event_type", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <Field label="ราคาเริ่มต้น (บาท)" value={form.price_start} onChange={(v) => set("price_start", v)} placeholder="500" type="number" />
            <Field label="แท็กสี (คั่นด้วยจุลภาค)" value={form.color_tags} onChange={(v) => set("color_tags", v)} placeholder="ขาว, เหลือง, ชมพู" />
            <Field label="พื้นที่บริการ (คั่นด้วยจุลภาค)" value={form.service_areas} onChange={(v) => set("service_areas", v)} placeholder="กรุงเทพ, นนทบุรี" />
            <Field label="SEO Title" value={form.seo_title} onChange={(v) => set("seo_title", v)} />
            <Field label="SEO Description" value={form.seo_description} onChange={(v) => set("seo_description", v)} />

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="accent-amber-700" />
                <span className="text-sm text-gray-700">เปิดแสดงผล</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="accent-amber-700" />
                <span className="text-sm text-gray-700">แนะนำ</span>
              </label>
            </div>
          </div>

          {saveMutation.isError && (
            <p className="text-red-500 text-sm mt-3">บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง</p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }}
              className="flex-1 border-2 border-gray-200 py-2 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!form.title || !form.slug || saveMutation.isPending}
              className="flex-1 bg-amber-700 text-white py-2 rounded-xl text-sm font-medium hover:bg-amber-800 transition disabled:opacity-50"
            >
              {saveMutation.isPending ? "กำลังบันทึก..." : editing ? "บันทึกการแก้ไข" : "เพิ่มผลงาน"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
    </div>
  );
}
