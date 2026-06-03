export function getAdminDashboardHref(path = "/dashboard") {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL?.trim().replace(/\/+$/, "");

  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
}
