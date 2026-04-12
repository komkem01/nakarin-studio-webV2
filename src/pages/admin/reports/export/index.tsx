import AdminPageTemplate from "../../../../components/admin/AdminPageTemplate";

export default function AdminReportsExportPage() {
  return (
    <AdminPageTemplate
      title="Export Center"
      subtitle="ส่งออกข้อมูล CSV/XLSX สำหรับทีมบัญชีและฝ่ายบริหาร"
      allowedRoles={["owner", "admin"]}
      kpis={[
        { label: "ไฟล์วันนี้", value: "43", tone: "text-emerald-700" },
        { label: "CSV", value: "31", tone: "text-sky-700" },
        { label: "XLSX", value: "12", tone: "text-violet-700" },
        { label: "เฉลี่ยเวลา export", value: "2.1s", tone: "text-amber-700" },
      ]}
    />
  );
}
