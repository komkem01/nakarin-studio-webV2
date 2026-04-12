import AdminPageTemplate from "../../../../components/admin/AdminPageTemplate";

export default function AdminBookingsProductionPage() {
  return (
    <AdminPageTemplate
      title="คิวงานประดิษฐ์"
      subtitle="ติดตามสายการผลิตบายศรี แบ่งตามทีมและวันส่ง"
      kpis={[
        { label: "กำลังประดิษฐ์", value: "17", tone: "text-emerald-700" },
        { label: "รอวัตถุดิบ", value: "4", tone: "text-amber-700" },
        { label: "ต้องเร่งด่วน", value: "6", tone: "text-rose-700" },
        { label: "ส่งมอบพรุ่งนี้", value: "9", tone: "text-sky-700" },
      ]}
    />
  );
}
