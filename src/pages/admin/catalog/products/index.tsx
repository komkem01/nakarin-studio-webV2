import AdminPageTemplate from "../../../../components/admin/AdminPageTemplate";

export default function AdminCatalogProductsPage() {
  return (
    <AdminPageTemplate
      title="สินค้า"
      subtitle="จัดการรายการสินค้า ราคา รูปภาพ และสถานะพร้อมขาย"
      kpis={[
        { label: "SKU ทั้งหมด", value: "132", tone: "text-emerald-700" },
        { label: "พร้อมขาย", value: "108", tone: "text-sky-700" },
        { label: "ต้องอัปเดตราคา", value: "9", tone: "text-amber-700" },
        { label: "สินค้าซ่อน", value: "15", tone: "text-slate-700" },
      ]}
    />
  );
}
