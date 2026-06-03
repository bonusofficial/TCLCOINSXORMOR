/**
 * อัปโหลดรูปไปเก็บเป็นไฟล์จริงใน configured public/uploads/images แล้วคืน URL
 * (แทนการเก็บเป็น base64 data URL)
 */
export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch("/api/v1/upload/image", {
    method: "POST",
    body: fd,
    credentials: "include",
  });

  let data: { ok?: boolean; url?: string; message?: string } = {};
  try {
    data = await res.json();
  } catch {
    /* ignore parse error */
  }

  if (!res.ok || !data.ok || !data.url) {
    throw new Error(data.message ?? "อัปโหลดรูปไม่สำเร็จ");
  }
  return data.url;
}
