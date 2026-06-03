import path from "path";

function envValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function normalizePublicPath(value: string) {
  const normalized = value.replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}` : "";
}

function defaultPublicRoot() {
  return path.resolve("..", "public");
}

export function getUploadPublicRoot() {
  const configuredRoot = envValue("UPLOAD_PUBLIC_ROOT");
  return path.resolve(configuredRoot || defaultPublicRoot());
}

export function getUploadPublicUrl(publicPath: string) {
  const normalizedPath = normalizePublicPath(publicPath);
  const baseUrl = envValue(
    "UPLOAD_PUBLIC_BASE_URL",
    "NEXT_PUBLIC_UPLOAD_BASE_URL",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SITE_URL"
  ).replace(/\/+$/, "");

  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

export function getUploadFileTarget(publicDir: string, fileName: string) {
  const cleanDir = publicDir.replace(/^\/+|\/+$/g, "");
  const uploadRoot = path.resolve(getUploadPublicRoot(), cleanDir);
  const filePath = path.resolve(uploadRoot, fileName);
  const relativePath = path.relative(uploadRoot, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Invalid upload target");
  }

  const publicPath = normalizePublicPath(`${cleanDir}/${fileName}`);

  return {
    uploadRoot,
    filePath,
    publicPath,
    publicUrl: getUploadPublicUrl(publicPath),
  };
}
