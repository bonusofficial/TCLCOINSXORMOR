export function formatDisplayID(
  memberNo?: number | null,
  fallbackId?: string | null
) {
  if (typeof memberNo === "number" && memberNo > 0) {
    return `OMTC-${String(memberNo).padStart(5, "0")}`;
  }

  if (fallbackId) {
    if (/^\d+$/.test(fallbackId)) return `OMTC-${fallbackId.padStart(5, "0")}`;
    const clean = fallbackId.replace(/[^a-zA-Z0-9]/g, "");
    return `OMTC-${clean.substring(0, 5).toUpperCase()}`;
  }

  return "";
}
