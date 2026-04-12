import { AdminRole } from "../../store/adminSession";

export type AdminNavItem = {
  label: string;
  href: string;
  badge: string;
  roles: AdminRole[];
};

export type AdminNavSection = {
  id: string;
  label: string;
  badge: string;
  roles: AdminRole[];
  items: AdminNavItem[];
};

export const adminNavSections: AdminNavSection[] = [
  {
    id: "overview",
    label: "ภาพรวม",
    badge: "OV",
    roles: ["owner", "admin", "staff"],
    items: [{ label: "แดชบอร์ด", href: "/admin/dashboard", badge: "DB", roles: ["owner", "admin", "staff"] }],
  },
  {
    id: "orders",
    label: "ออเดอร์และพิธีการ",
    badge: "OR",
    roles: ["owner", "admin", "staff"],
    items: [
      { label: "รายการออเดอร์", href: "/admin/orders", badge: "OD", roles: ["owner", "admin", "staff"] },
      { label: "ปฏิทินพิธีการ", href: "/admin/bookings/calendar", badge: "CL", roles: ["owner", "admin", "staff"] },
      { label: "คิวงานประดิษฐ์", href: "/admin/bookings/production", badge: "PD", roles: ["owner", "admin", "staff"] },
    ],
  },
  {
    id: "customers",
    label: "ลูกค้า",
    badge: "CU",
    roles: ["owner", "admin", "staff"],
    items: [
      { label: "สมาชิก", href: "/admin/customers/members", badge: "MB", roles: ["owner", "admin", "staff"] },
      { label: "กล่องข้อความ", href: "/admin/customers/messages", badge: "MS", roles: ["owner", "admin", "staff"] },
    ],
  },
  {
    id: "catalog",
    label: "สินค้าและแพ็กเกจ",
    badge: "CT",
    roles: ["owner", "admin"],
    items: [
      { label: "สินค้า", href: "/admin/catalog/products", badge: "PR", roles: ["owner", "admin"] },
      { label: "หมวดหมู่", href: "/admin/catalog/categories", badge: "CA", roles: ["owner", "admin"] },
    ],
  },
  {
    id: "insights",
    label: "รายงานและวิเคราะห์",
    badge: "IN",
    roles: ["owner", "admin"],
    items: [
      { label: "Analytics", href: "/admin/analytics", badge: "AN", roles: ["owner", "admin"] },
      { label: "รายงาน", href: "/admin/reports", badge: "RP", roles: ["owner", "admin"] },
      { label: "Export", href: "/admin/reports/export", badge: "EX", roles: ["owner", "admin"] },
    ],
  },
  {
    id: "system",
    label: "ระบบ",
    badge: "SY",
    roles: ["owner"],
    items: [
      { label: "ผู้ใช้งานและสิทธิ์", href: "/admin/users", badge: "US", roles: ["owner"] },
      { label: "ตั้งค่า", href: "/admin/settings", badge: "ST", roles: ["owner"] },
      { label: "Audit Logs", href: "/admin/audit-logs", badge: "AU", roles: ["owner"] },
    ],
  },
];

export function getVisibleSectionsByRole(role: AdminRole): AdminNavSection[] {
  return adminNavSections
    .filter((section) => section.roles.includes(role))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);
}

export function getAllowedRolesForPath(pathname: string): AdminRole[] {
  const normalized = pathname.replace(/\/$/, "") || "/";
  for (const section of adminNavSections) {
    for (const item of section.items) {
      if (normalized === item.href || normalized.startsWith(item.href + "/")) {
        return item.roles;
      }
    }
  }
  return ["owner", "admin", "staff"];
}
