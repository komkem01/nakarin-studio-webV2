import AdminPageTemplate from "../../../components/admin/AdminPageTemplate";

export default function AdminDashboardPage() {
  return (
    <AdminPageTemplate
      title="แดชบอร์ดแอดมิน"
      subtitle="ภาพรวมยอดขาย คิวงานพิธี และสถานะการปฏิบัติงาน"
      kpis={[
        { label: "งานวันนี้", value: "14", tone: "text-emerald-700" },
        { label: "ออเดอร์ใหม่", value: "29", tone: "text-sky-700" },
        { label: "กำลังผลิต", value: "11", tone: "text-amber-700" },
        { label: "รายได้เดือนนี้", value: "฿198,400", tone: "text-violet-700" },
      ]}
    />
  );
}
