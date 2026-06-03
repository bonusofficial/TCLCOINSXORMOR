import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

/**
 * Server Component layout
 *
 * - middleware.ts บล็อกผู้ที่ไม่มี session cookie ไว้แล้ว
 * - ที่นี่เช็คเพิ่ม: session valid + role === "admin"
 * - ถ้าไม่ใช่ admin → redirect ออก (เช่น ไปหน้า /profile)
 *
 * เป็น Server Component → ไม่มี client JS overhead, ป้องกันก่อน UI render
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // ไม่มี session จริง ๆ — middleware น่าจะดักแล้ว แต่กันพลาด
  if (!session?.user) {
    redirect("/?auth=required&next=/dashboard");
  }

  // role check — admin only
  const role = ((session.user as { role?: string }).role ?? "")
    .toLowerCase()
    .trim();

  if (role !== "admin") {
    redirect("/?auth=forbidden&reason=admin-only");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
