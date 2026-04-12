import AdminPageTemplate from "../../../../components/admin/AdminPageTemplate";

export default function AdminCustomerMessagesPage() {
  return (
    <AdminPageTemplate
      title="กล่องข้อความลูกค้า"
      subtitle="รวมช่องทางแชต ตอบกลับ และติด tag ประเด็นบริการ"
      kpis={[
        { label: "ข้อความใหม่", value: "31", tone: "text-emerald-700" },
        { label: "รอตอบ", value: "12", tone: "text-amber-700" },
        { label: "ปิดเคสวันนี้", value: "24", tone: "text-sky-700" },
        { label: "CSAT เฉลี่ย", value: "4.8/5", tone: "text-violet-700" },
      ]}
    />
  );
}
