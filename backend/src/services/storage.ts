import { PrismaClient } from "@prisma/client";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "files.fluowai.com.br";
const MINIO_PORT = parseInt(process.env.MINIO_PORT || "443", 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || "";
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || "";
const MINIO_USE_SSL = process.env.MINIO_USE_SSL !== "false";
const MINIO_REGION = process.env.MINIO_REGION || "us-east-1";
const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL || MINIO_ENDPOINT;
const NEXUS360_BUCKET = "nexus360";

let minioClient: any = null;

async function getMinioClient() {
  if (minioClient) return minioClient;
  try {
    const { Client } = await import("minio");
    minioClient = new Client({
      endPoint: MINIO_ENDPOINT,
      port: MINIO_PORT,
      useSSL: MINIO_USE_SSL,
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY,
      region: MINIO_REGION,
    });
    return minioClient;
  } catch (error: any) {
    throw new Error(`MinIO nao configurado: ${error.message}`);
  }
}

function getPrefix(orgSlug: string) {
  const safe = orgSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return `${safe}/`;
}

export function getStorageConfig() {
  return {
    endpoint: MINIO_ENDPOINT,
    port: MINIO_PORT,
    useSSL: MINIO_USE_SSL,
    bucket: NEXUS360_BUCKET,
    publicUrl: MINIO_PUBLIC_URL,
    configured: !!(MINIO_ACCESS_KEY && MINIO_SECRET_KEY),
  };
}

export function getFileUrl(orgSlug: string, filePath: string) {
  return `${MINIO_USE_SSL ? "https" : "http"}://${MINIO_PUBLIC_URL}/${NEXUS360_BUCKET}/${getPrefix(orgSlug)}${filePath}`;
}

export async function uploadFile(
  orgSlug: string,
  filePath: string,
  buffer: Buffer,
  mimeType: string,
) {
  const key = `${getPrefix(orgSlug)}${filePath}`;
  const client = await getMinioClient();
  await client.putObject(NEXUS360_BUCKET, key, buffer, buffer.length, { "Content-Type": mimeType });
  return { bucket: NEXUS360_BUCKET, key, url: getFileUrl(orgSlug, filePath) };
}

export async function deleteFile(orgSlug: string, filePath: string) {
  const key = `${getPrefix(orgSlug)}${filePath}`;
  const client = await getMinioClient();
  await client.removeObject(NEXUS360_BUCKET, key);
}

export async function getPresignedUrl(orgSlug: string, filePath: string, expiry = 3600) {
  const key = `${getPrefix(orgSlug)}${filePath}`;
  const client = await getMinioClient();
  return client.presignedGetObject(NEXUS360_BUCKET, key, expiry);
}

export async function getPresignedUploadUrl(orgSlug: string, filePath: string, expiry = 3600) {
  const key = `${getPrefix(orgSlug)}${filePath}`;
  const client = await getMinioClient();
  return client.presignedPutObject(NEXUS360_BUCKET, key, expiry);
}

export async function listFiles(orgSlug: string, subdir = "") {
  const client = await getMinioClient();
  const prefix = `${getPrefix(orgSlug)}${subdir}`;
  const objects: any[] = [];
  const stream = client.listObjects(NEXUS360_BUCKET, prefix, true);
  return new Promise<any[]>((resolve, reject) => {
    stream.on("data", (obj: any) => objects.push(obj));
    stream.on("error", reject);
    stream.on("end", () => resolve(objects));
  });
}

export async function getOrgUsage(orgSlug: string) {
  const objects = await listFiles(orgSlug);
  let totalBytes = 0;
  let totalFiles = 0;
  for (const obj of objects as any[]) {
    totalBytes += obj.size || 0;
    totalFiles += 1;
  }
  return { bucket: NEXUS360_BUCKET, prefix: getPrefix(orgSlug), totalBytes, totalFiles, totalMB: +(totalBytes / (1024 * 1024)).toFixed(2) };
}

export async function syncOrgStorageUsage(prisma: PrismaClient, orgId: string, orgSlug: string) {
  try {
    const usage = await getOrgUsage(orgSlug);
    const current = await prisma.organization.findUnique({ where: { id: orgId }, select: { limitsUsage: true } });
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        limitsUsage: {
          ...(current?.limitsUsage as any || {}),
          storageBytes: usage.totalBytes,
          storageFiles: usage.totalFiles,
          storageUpdatedAt: new Date().toISOString(),
        },
      },
    });
    return usage;
  } catch {
    return null;
  }
}
