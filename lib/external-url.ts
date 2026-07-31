/** Normalize button URLs and reject unsafe custom schemes. */
export function normalizeExternalUrl(
  value: string | null | undefined
): string {
  const url = value?.trim() ?? "";
  if (!url) return "";
  if (url.startsWith("/")) return url;
  if (/^(https?:|line:|mailto:|tel:)/i.test(url)) return url;
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return "";
  return `https://${url}`;
}
