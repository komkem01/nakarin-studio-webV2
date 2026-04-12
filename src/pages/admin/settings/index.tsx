import AdminPageTemplate from "../../../components/admin/AdminPageTemplate";

export default function AdminSettingsPage() {
  return (
    <AdminPageTemplate
      title="ตั้งค่าระบบ"
      subtitle="ตั้งค่า workflow การจอง แจ้งเตือน และ branding ของระบบ"
      allowedRoles={["owner"]}
      kpis={[
        { label: "ค่า config ทั้งหมด", value: "56", tone: "text-emerald-700" },
        { label: "แก้ไขวันนี้", value: "4", tone: "text-sky-700" },
        { label: "pending review", value: "2", tone: "text-amber-700" },
        { label: "environment", value: "Production", tone: "text-violet-700" },
      ]}
    />
  );
}
