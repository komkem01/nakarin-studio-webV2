import AdminPageTemplate from "../../../../components/admin/AdminPageTemplate";

export default function AdminBookingsCalendarPage() {
  return (
    <AdminPageTemplate
      title="ปฏิทินพิธีการ"
      subtitle="ดูคิวพิธี แผนส่งมอบ และกำลังการผลิตรายวัน"
      kpis={[
        { label: "คิวสัปดาห์นี้", value: "42", tone: "text-emerald-700" },
        { label: "คิวชนเวลา", value: "3", tone: "text-rose-700" },
        { label: "ต้องยืนยันสถานที่", value: "7", tone: "text-amber-700" },
        { label: "ทีมพร้อมงาน", value: "8 ทีม", tone: "text-sky-700" },
      ]}
    />
  );
}
