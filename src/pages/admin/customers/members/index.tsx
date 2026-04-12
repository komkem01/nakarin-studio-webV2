import AdminPageTemplate from "../../../../components/admin/AdminPageTemplate";

export default function AdminCustomerMembersPage() {
  return (
    <AdminPageTemplate
      title="สมาชิก"
      subtitle="จัดการข้อมูลลูกค้า ประวัติการสั่งซื้อ และ segmentation"
      kpis={[
        { label: "สมาชิกทั้งหมด", value: "3,842", tone: "text-emerald-700" },
        { label: "สมาชิกใหม่เดือนนี้", value: "218", tone: "text-sky-700" },
        { label: "VIP", value: "126", tone: "text-violet-700" },
        { label: "inactive เกิน 90 วัน", value: "402", tone: "text-amber-700" },
      ]}
    />
  );
}
