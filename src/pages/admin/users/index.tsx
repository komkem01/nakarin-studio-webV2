import AdminPageTemplate from "../../../components/admin/AdminPageTemplate";

export default function AdminUsersPage() {
  return (
    <AdminPageTemplate
      title="ผู้ใช้งานและสิทธิ์"
      subtitle="จัดการบทบาทแอดมิน สิทธิ์เข้าถึง และนโยบายความปลอดภัย"
      allowedRoles={["owner"]}
      kpis={[
        { label: "ผู้ใช้งานทั้งหมด", value: "26", tone: "text-emerald-700" },
        { label: "active sessions", value: "11", tone: "text-sky-700" },
        { label: "admin", value: "5", tone: "text-violet-700" },
        { label: "2FA enabled", value: "84%", tone: "text-amber-700" },
      ]}
    />
  );
}
