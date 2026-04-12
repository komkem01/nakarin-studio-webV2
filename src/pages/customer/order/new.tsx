import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import CustomerGuard from "../../../components/customer/CustomerGuard";
import CustomerShell from "../../../components/customer/CustomerShell";
import { customerApi, ProductItem } from "../../../services/customerApi";
import { addTrackedBooking } from "../../../store/customerSession";
import { useToast } from "../../../components/ui/Toast";

function generateBookingNo() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `BK${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{children}</p>
  );
}

export default function CustomerCreateOrderPage() {
  const router = useRouter();
  const preselectedProductId = typeof router.query.productId === "string" ? router.query.productId : "";
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [deliveryAt, setDeliveryAt] = useState("");
  const [baiseeStyle, setBaiseeStyle] = useState("");
  const [basePrice, setBasePrice] = useState("0");
  const [addonPrice, setAddonPrice] = useState("0");
  const [depositAmount, setDepositAmount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    customerApi.listProducts({ page: 1, limit: 100 }).then((res) => {
      const items = (res.items || []).filter((x) => x.isActive);
      setProducts(items);
      if (preselectedProductId) {
        const preselected = items.find((x) => x.id === preselectedProductId);
        if (preselected) {
          setSelectedProductId(preselected.id);
          setBasePrice(String(preselected.price || 0));
          return;
        }
      }
      if (items.length > 0) {
        setSelectedProductId(items[0].id);
        setBasePrice(String(items[0].price || 0));
      }
    });
  }, [preselectedProductId]);

  const selectedProduct = useMemo(
    () => products.find((x) => x.id === selectedProductId),
    [products, selectedProductId],
  );

  const totalPrice =
    (Number(basePrice) || 0) + (Number(addonPrice) || 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const bookingNo = generateBookingNo();
      const created = await customerApi.createBooking({
        bookingNo,
        packageName: selectedProduct?.name,
        baiseeStyle: baiseeStyle || undefined,
        eventDate: eventDate ? new Date(eventDate).toISOString() : undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        deliveryAt: deliveryAt ? new Date(deliveryAt).toISOString() : undefined,
        basePrice: Number(basePrice) || 0,
        addonPrice: Number(addonPrice) || 0,
        depositAmount: Number(depositAmount) || 0,
        paidAmount: Number(paidAmount) || 0,
      });
      addTrackedBooking({ id: created.id, bookingNo: created.bookingNo });
      toast("สร้างการจองสำเร็จแล้ว!", "success");
      void router.push(`/customer/orders/${created.id}`);
    } catch {
      toast("สร้างการจองไม่สำเร็จ กรุณาลองอีกครั้ง", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <CustomerGuard>
      <CustomerShell>
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900">สร้างคำขอจองใหม่</h1>
          <p className="mt-0.5 text-sm text-slate-500">กรอกรายละเอียดงานเพื่อส่งคำขอจอง</p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Left: form */}
          <div className="space-y-4">
            {/* Product */}
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <SectionTitle>เลือกสินค้า</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">แพ็กเกจสินค้า</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      const found = products.find((x) => x.id === e.target.value);
                      if (found) setBasePrice(String(found.price || 0));
                    }}
                    className={inputCls}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">สไตล์ที่ต้องการ</label>
                  <input
                    value={baiseeStyle}
                    onChange={(e) => setBaiseeStyle(e.target.value)}
                    placeholder="เช่น ทรงสูง 9 ชั้น"
                    className={inputCls}
                  />
                </div>
              </div>
            </section>

            {/* Dates */}
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <SectionTitle>วันและเวลา</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">วันงาน</label>
                  <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">เวลานัดหมาย</label>
                  <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">เวลาส่งมอบ</label>
                  <input type="datetime-local" value={deliveryAt} onChange={(e) => setDeliveryAt(e.target.value)} className={inputCls} />
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <SectionTitle>ราคาและการชำระเงิน</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">ราคาหลัก (บาท)</label>
                  <input value={basePrice} onChange={(e) => setBasePrice(e.target.value)} type="number" min="0" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">ราคาเพิ่มเติม (บาท)</label>
                  <input value={addonPrice} onChange={(e) => setAddonPrice(e.target.value)} type="number" min="0" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">มัดจำ (บาท)</label>
                  <input value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} type="number" min="0" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">ชำระแล้ว (บาท)</label>
                  <input value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} type="number" min="0" className={inputCls} />
                </div>
              </div>
            </section>
          </div>

          {/* Right: summary */}
          <div className="space-y-4">
            {/* Product card */}
            {selectedProduct && (
              <div className="rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-700 p-5 text-white shadow-lg">
                <p className="text-xs text-emerald-300">แพ็กเกจที่เลือก</p>
                <p className="mt-1.5 text-lg font-black">{selectedProduct.name}</p>
                {selectedProduct.categoryName && (
                  <p className="text-xs text-emerald-300">{selectedProduct.categoryName}</p>
                )}
                <p className="mt-3 text-2xl font-black">
                  {(selectedProduct.price || 0).toLocaleString("th-TH")}
                  <span className="ml-1 text-sm font-semibold text-emerald-300">บาท</span>
                </p>
              </div>
            )}

            {/* Price summary */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">สรุปราคา</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>ราคาหลัก</span>
                  <span>{(Number(basePrice) || 0).toLocaleString("th-TH")} บาท</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>ราคาเพิ่ม</span>
                  <span>{(Number(addonPrice) || 0).toLocaleString("th-TH")} บาท</span>
                </div>
                <div className="my-2 border-t border-slate-100" />
                <div className="flex justify-between font-black text-slate-900">
                  <span>รวมทั้งหมด</span>
                  <span className="text-emerald-800">{totalPrice.toLocaleString("th-TH")} บาท</span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-600 py-3.5 font-bold text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-700 hover:to-emerald-500 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "กำลังสร้างการจอง..." : "ยืนยันสร้างการจอง"}
            </button>
          </div>
        </form>
      </CustomerShell>
    </CustomerGuard>
  );
}
