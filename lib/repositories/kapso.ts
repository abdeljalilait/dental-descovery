import { db } from "@/src/prisma/db";
import { toInstant, toJson } from "@/src/prisma/codecs";

export interface KapsoAccountRow {
  id: string;
  name: string;
  phoneNumberId: string;
  businessAccountId: string | null;
  apiKey: string;
  baseUrl: string;
  status: string;
  isDefault: boolean;
  lastTestedAt: string | null;
  testResult: Record<string, unknown> | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  templatesCount?: number;
}

export interface WhatsAppTemplateRow {
  id: string;
  accountId: string;
  accountName?: string;
  externalId: string | null;
  name: string;
  language: string;
  category: string;
  status: string;
  bodyText: string;
  headerText: string | null;
  footerText: string | null;
  variables: string[];
  rawMeta: Record<string, unknown> | null;
  lastSyncedAt: string;
  createdAt: string;
}

export async function getKapsoAccountsDb(): Promise<KapsoAccountRow[]> {
  const accounts = await db.orm.public.KapsoAccount.all();
  const templates = await db.orm.public.WhatsAppTemplate.all();

  return accounts.map((acc) => {
    const count = templates.filter((t) => t.accountId === acc.id).length;
    return {
      id: acc.id,
      name: acc.name,
      phoneNumberId: acc.phoneNumberId,
      businessAccountId: acc.businessAccountId,
      apiKey: acc.apiKey,
      baseUrl: acc.baseUrl,
      status: acc.status,
      isDefault: acc.isDefault,
      lastTestedAt: acc.lastTestedAt ? String(acc.lastTestedAt) : null,
      testResult: (acc.testResult as Record<string, unknown>) ?? null,
      lastSyncedAt: acc.lastSyncedAt ? String(acc.lastSyncedAt) : null,
      createdAt: String(acc.createdAt),
      updatedAt: String(acc.updatedAt),
      templatesCount: count,
    };
  });
}

export async function getKapsoAccountByIdDb(id: string): Promise<KapsoAccountRow | null> {
  const acc = await db.orm.public.KapsoAccount.where({ id }).first();
  if (!acc) return null;

  return {
    id: acc.id,
    name: acc.name,
    phoneNumberId: acc.phoneNumberId,
    businessAccountId: acc.businessAccountId,
    apiKey: acc.apiKey,
    baseUrl: acc.baseUrl,
    status: acc.status,
    isDefault: acc.isDefault,
    lastTestedAt: acc.lastTestedAt ? String(acc.lastTestedAt) : null,
    testResult: (acc.testResult as Record<string, unknown>) ?? null,
    lastSyncedAt: acc.lastSyncedAt ? String(acc.lastSyncedAt) : null,
    createdAt: String(acc.createdAt),
    updatedAt: String(acc.updatedAt),
  };
}

export async function getDefaultKapsoAccountDb(): Promise<KapsoAccountRow | null> {
  // First look for marked default
  let acc = await db.orm.public.KapsoAccount.where({ isDefault: true }).first();
  // Otherwise first active account
  if (!acc) {
    acc = await db.orm.public.KapsoAccount.where({ status: "ACTIVE" }).first();
  }
  // Otherwise first account in DB
  if (!acc) {
    acc = await db.orm.public.KapsoAccount.first();
  }
  if (!acc) return null;

  return {
    id: acc.id,
    name: acc.name,
    phoneNumberId: acc.phoneNumberId,
    businessAccountId: acc.businessAccountId,
    apiKey: acc.apiKey,
    baseUrl: acc.baseUrl,
    status: acc.status,
    isDefault: acc.isDefault,
    lastTestedAt: acc.lastTestedAt ? String(acc.lastTestedAt) : null,
    testResult: (acc.testResult as Record<string, unknown>) ?? null,
    lastSyncedAt: acc.lastSyncedAt ? String(acc.lastSyncedAt) : null,
    createdAt: String(acc.createdAt),
    updatedAt: String(acc.updatedAt),
  };
}

export async function createKapsoAccountDb(data: {
  name: string;
  phoneNumberId: string;
  businessAccountId?: string | null;
  apiKey: string;
  baseUrl?: string;
  isDefault?: boolean;
}): Promise<string> {
  // If isDefault is true, unset default on other accounts
  if (data.isDefault) {
    const existing = await db.orm.public.KapsoAccount.where({ isDefault: true }).all();
    for (const item of existing) {
      await db.orm.public.KapsoAccount.where({ id: item.id }).update({ isDefault: false });
    }
  }

  const created = await db.orm.public.KapsoAccount.create({
    name: data.name.trim(),
    phoneNumberId: data.phoneNumberId.trim(),
    businessAccountId: data.businessAccountId?.trim() || null,
    apiKey: data.apiKey.trim(),
    baseUrl: data.baseUrl?.trim() || "https://app.kapso.ai/api/meta/",
    status: "INACTIVE",
    isDefault: Boolean(data.isDefault),
  });

  return created.id;
}

export async function updateKapsoAccountDb(
  id: string,
  data: Partial<{
    name: string;
    phoneNumberId: string;
    businessAccountId: string | null;
    apiKey: string;
    baseUrl: string;
    status: string;
    isDefault: boolean;
    lastTestedAt: Date | null;
    testResult: Record<string, unknown> | null;
    lastSyncedAt: Date | null;
  }>
): Promise<void> {
  if (data.isDefault) {
    const existing = await db.orm.public.KapsoAccount.where({ isDefault: true }).all();
    for (const item of existing) {
      if (item.id !== id) {
        await db.orm.public.KapsoAccount.where({ id: item.id }).update({ isDefault: false });
      }
    }
  }

  await db.orm.public.KapsoAccount.where({ id }).update({
    name: data.name !== undefined ? data.name.trim() : undefined,
    phoneNumberId: data.phoneNumberId !== undefined ? data.phoneNumberId.trim() : undefined,
    businessAccountId: data.businessAccountId !== undefined ? data.businessAccountId : undefined,
    apiKey: data.apiKey !== undefined ? data.apiKey.trim() : undefined,
    baseUrl: data.baseUrl !== undefined ? data.baseUrl.trim() : undefined,
    status: data.status,
    isDefault: data.isDefault,
    lastTestedAt: data.lastTestedAt ? toInstant(data.lastTestedAt) : undefined,
    testResult: data.testResult !== undefined ? (data.testResult ? toJson(data.testResult) : null) : undefined,
    lastSyncedAt: data.lastSyncedAt ? toInstant(data.lastSyncedAt) : undefined,
  });
}

export async function deleteKapsoAccountDb(id: string): Promise<void> {
  await db.orm.public.KapsoAccount.where({ id }).delete();
}

export async function getWhatsAppTemplatesDb(options?: {
  accountId?: string;
  status?: string;
  language?: string;
}): Promise<WhatsAppTemplateRow[]> {
  let list = await db.orm.public.WhatsAppTemplate.all();

  if (options?.accountId) {
    list = list.filter((t) => t.accountId === options.accountId);
  }
  if (options?.status) {
    list = list.filter((t) => t.status === options.status);
  }
  if (options?.language) {
    list = list.filter((t) => t.language === options.language);
  }

  const accounts = await db.orm.public.KapsoAccount.all();
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));

  return list.map((t) => ({
    id: t.id,
    accountId: t.accountId,
    accountName: accMap.get(t.accountId) ?? "Unknown",
    externalId: t.externalId,
    name: t.name,
    language: t.language,
    category: t.category,
    status: t.status,
    bodyText: t.bodyText,
    headerText: t.headerText,
    footerText: t.footerText,
    variables: Array.isArray(t.variables) ? (t.variables as string[]) : [],
    rawMeta: (t.rawMeta as Record<string, unknown>) ?? null,
    lastSyncedAt: String(t.lastSyncedAt),
    createdAt: String(t.createdAt),
  }));
}

export async function getWhatsAppTemplateByIdDb(id: string): Promise<WhatsAppTemplateRow | null> {
  const t = await db.orm.public.WhatsAppTemplate.where({ id }).first();
  if (!t) return null;

  return {
    id: t.id,
    accountId: t.accountId,
    externalId: t.externalId,
    name: t.name,
    language: t.language,
    category: t.category,
    status: t.status,
    bodyText: t.bodyText,
    headerText: t.headerText,
    footerText: t.footerText,
    variables: Array.isArray(t.variables) ? (t.variables as string[]) : [],
    rawMeta: (t.rawMeta as Record<string, unknown>) ?? null,
    lastSyncedAt: String(t.lastSyncedAt),
    createdAt: String(t.createdAt),
  };
}

export async function upsertWhatsAppTemplateDb(
  accountId: string,
  data: {
    externalId?: string | null;
    name: string;
    language: string;
    category?: string;
    status?: string;
    bodyText: string;
    headerText?: string | null;
    footerText?: string | null;
    variables: string[];
    rawMeta?: Record<string, unknown> | null;
  }
): Promise<string> {
  const existing = await db.orm.public.WhatsAppTemplate.where({
    accountId,
    name: data.name,
    language: data.language,
  }).first();

  const now = toInstant(new Date());

  if (existing) {
    await db.orm.public.WhatsAppTemplate.where({ id: existing.id }).update({
      externalId: data.externalId ?? existing.externalId,
      category: data.category ?? existing.category,
      status: data.status ?? existing.status,
      bodyText: data.bodyText,
      headerText: data.headerText !== undefined ? data.headerText : existing.headerText,
      footerText: data.footerText !== undefined ? data.footerText : existing.footerText,
      variables: data.variables,
      rawMeta: data.rawMeta ? toJson(data.rawMeta) : (existing.rawMeta ? toJson(existing.rawMeta) : null),
      lastSyncedAt: now,
    });
    return existing.id;
  }

  const created = await db.orm.public.WhatsAppTemplate.create({
    accountId,
    externalId: data.externalId || null,
    name: data.name,
    language: data.language,
    category: data.category || "MARKETING",
    status: data.status || "APPROVED",
    bodyText: data.bodyText,
    headerText: data.headerText || null,
    footerText: data.footerText || null,
    variables: data.variables,
    rawMeta: data.rawMeta ? toJson(data.rawMeta) : null,
    lastSyncedAt: now,
  });

  return created.id;
}
