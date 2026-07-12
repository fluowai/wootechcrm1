import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getDatabaseUrl() {
  const sanitizeUrl = (value?: string) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    return trimmed.replace(/^(['"])(.*)\1$/, '$2').trim();
  };

  const candidates = [
    sanitizeUrl(process.env.DATABASE_URL),
    sanitizeUrl(process.env.DIRECT_URL),
    sanitizeUrl(process.env.SUPABASE_DB_URL),
  ].filter((value): value is string => Boolean(value));

  const rawUrl = candidates.find((value) => value.startsWith('postgresql://') || value.startsWith('postgres://'));
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    const usesSupabasePooler =
      url.hostname.includes('pooler.supabase.com') ||
      url.port === '6543' ||
      url.searchParams.has('pgbouncer');

    if (usesSupabasePooler) {
      if (!url.searchParams.has('pgbouncer')) {
        url.searchParams.set('pgbouncer', 'true');
      }
      if (!url.searchParams.has('statement_cache_size')) {
        url.searchParams.set('statement_cache_size', '0');
      }
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

const databaseUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
