import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Upload รูปภาพทั่วไป (ต้อง login — ใช้ได้ทั้งสมาชิก/ตัวแทน/แอดมิน)
 * เก็บไฟล์จริงไว้ที่ public/uploads/images แล้วคืน URL (ไม่ใช้ base64)
 * ใช้กับ: รูปสินค้า (admin) และรูปโปรไฟล์ (สมาชิกทั่วไป)
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD = 64 * 1024;
const UPLOAD_PUBLIC_DIR = "uploads/images";
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

type DetectedImage = {
  ext: "png" | "jpg" | "webp" | "gif";
  mime: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
};

function json(
  body: Record<string, unknown>,
  init: ResponseInit & { status: number }
) {
  return Response.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store", ...init.headers },
  });
}

function detectImage(buffer: Buffer): DetectedImage | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  if (
    buffer.length >= 6 &&
    (buffer.toString("ascii", 0, 6) === "GIF87a" ||
      buffer.toString("ascii", 0, 6) === "GIF89a")
  ) {
    return { ext: "gif", mime: "image/gif" };
  }
  return null;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user;

  if (!user) {
    return json(
      { ok: false, message: "กรุณาเข้าสู่ระบบก่อนอัปโหลดไฟล์" },
      { status: 401 }
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_FILE_SIZE + MAX_MULTIPART_OVERHEAD
  ) {
    return json(
      { ok: false, message: "ไฟล์ใหญ่เกินไป อัปโหลดได้สูงสุด 5 MB" },
      { status: 413 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json(
      { ok: false, message: "รูปแบบข้อมูลอัปโหลดไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return json(
      { ok: false, message: "ไม่พบไฟล์ที่ต้องการอัปโหลด" },
      { status: 400 }
    );
  }
  if (file.size <= 0) {
    return json({ ok: false, message: "ไฟล์ว่างเปล่า" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return json(
      { ok: false, message: "ไฟล์ใหญ่เกินไป อัปโหลดได้สูงสุด 5 MB" },
      { status: 413 }
    );
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return json(
      { ok: false, message: "รองรับเฉพาะไฟล์ PNG, JPG, WebP หรือ GIF" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectImage(buffer);
  if (!detected || detected.mime !== file.type) {
    return json(
      { ok: false, message: "ชนิดไฟล์ไม่ถูกต้องหรือข้อมูลไฟล์ไม่ปลอดภัย" },
      { status: 400 }
    );
  }

  const uploadRoot = path.resolve(process.cwd(), "public", UPLOAD_PUBLIC_DIR);
  const fileName = `${randomBytes(24).toString("hex")}.${detected.ext}`;
  const filePath = path.resolve(uploadRoot, fileName);
  const relativePath = path.relative(uploadRoot, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return json(
      { ok: false, message: "ตำแหน่งจัดเก็บไฟล์ไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  await mkdir(uploadRoot, { recursive: true });
  await writeFile(filePath, buffer, { flag: "wx" });

  return json(
    {
      ok: true,
      url: `/${UPLOAD_PUBLIC_DIR}/${fileName}`,
      fileName,
      size: file.size,
      contentType: detected.mime,
    },
    { status: 201 }
  );
}
