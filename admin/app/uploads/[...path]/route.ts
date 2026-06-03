import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments || pathSegments.length === 0) {
      return new Response("Not Found", { status: 404 });
    }

    // Resolve path to the physical file in public/uploads
    const uploadRoot = path.resolve(process.cwd(), "public", "uploads");
    const filePath = path.resolve(uploadRoot, ...pathSegments);

    // Safeguard against Directory Traversal attacks
    const relativePath = path.relative(uploadRoot, filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return new Response("Forbidden", { status: 403 });
    }

    // Check if the file exists on the disk
    if (!existsSync(filePath)) {
      return new Response("File Not Found", { status: 404 });
    }

    // Read the file and detect mime-type
    const fileBuffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase().replace(".", "");
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to serve uploaded file:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
