import AdminPageTemplate from "../../../components/admin/AdminPageTemplate";

export default function AdminAuditLogsPage() {
  return (
    <AdminPageTemplate
      title="Audit Logs"
      subtitle="ติดตามกิจกรรมผู้ใช้ การเปลี่ยนแปลงข้อมูล และเหตุการณ์สำคัญ"
      allowedRoles={["owner"]}
      kpis={[
        { label: "events วันนี้", value: "1,284", tone: "text-emerald-700" },
        { label: "critical", value: "3", tone: "text-rose-700" },
        { label: "ผิดพลาด login", value: "21", tone: "text-amber-700" },
        { label: "เก็บย้อนหลัง", value: "365 วัน", tone: "text-sky-700" },
      ]}
    />
  );
}
