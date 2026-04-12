import AdminPageTemplate from "../../../../components/admin/AdminPageTemplate";

export default function AdminCatalogCategoriesPage() {
  return (
    <AdminPageTemplate
      title="หมวดหมู่"
      subtitle="โครงสร้างหมวดหมู่สินค้าและแพ็กเกจพิธีการ"
      kpis={[
        { label: "หมวดหมู่หลัก", value: "12", tone: "text-emerald-700" },
        { label: "หมวดย่อย", value: "38", tone: "text-sky-700" },
        { label: "ต้องจัดเรียงใหม่", value: "6", tone: "text-amber-700" },
        { label: "active", value: "43", tone: "text-violet-700" },
      ]}
    />
  );
}
