"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import {
  createKapsoAccountDb,
  updateKapsoAccountDb,
  deleteKapsoAccountDb,
} from "@/lib/repositories/kapso";
import { testKapsoAccountConnection, syncKapsoTemplates } from "@/lib/services/kapso";

export async function createKapsoAccountAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const phoneNumberId = String(formData.get("phoneNumberId") ?? "").trim();
  const businessAccountId = String(formData.get("businessAccountId") ?? "").trim() || null;
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const baseUrl = String(formData.get("baseUrl") ?? "").trim() || "https://app.kapso.ai/api/meta/";
  const isDefault = formData.get("isDefault") === "on";

  if (!name || !phoneNumberId || !apiKey) {
    redirect("/admin/kapso?error=missing_fields");
  }

  const id = await createKapsoAccountDb({
    name,
    phoneNumberId,
    businessAccountId,
    apiKey,
    baseUrl,
    isDefault,
  });

  // Auto test connection on creation
  await testKapsoAccountConnection(id);

  revalidatePath("/admin/kapso");
  redirect("/admin/kapso?created=1");
}

export async function updateKapsoAccountAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phoneNumberId = String(formData.get("phoneNumberId") ?? "").trim();
  const businessAccountId = String(formData.get("businessAccountId") ?? "").trim() || null;
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const baseUrl = String(formData.get("baseUrl") ?? "").trim() || "https://app.kapso.ai/api/meta/";
  const isDefault = formData.get("isDefault") === "on";

  if (!id || !name || !phoneNumberId || !apiKey) {
    redirect("/admin/kapso?error=missing_fields");
  }

  await updateKapsoAccountDb(id, {
    name,
    phoneNumberId,
    businessAccountId,
    apiKey,
    baseUrl,
    isDefault,
  });

  revalidatePath("/admin/kapso");
  redirect("/admin/kapso?updated=1");
}

export async function deleteKapsoAccountAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/kapso?error=missing_id");

  await deleteKapsoAccountDb(id);
  revalidatePath("/admin/kapso");
  redirect("/admin/kapso?deleted=1");
}

export async function testKapsoAccountAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/kapso?error=missing_id");

  const res = await testKapsoAccountConnection(id);
  revalidatePath("/admin/kapso");

  if (res.ok) {
    redirect(`/admin/kapso?tested=1&msg=${encodeURIComponent(res.message)}`);
  } else {
    redirect(`/admin/kapso?error=test_failed&msg=${encodeURIComponent(res.message)}`);
  }
}

export async function syncKapsoTemplatesAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/kapso?error=missing_id");

  const res = await syncKapsoTemplates(id);
  revalidatePath("/admin/kapso");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/clinics");

  if (res.ok) {
    redirect(`/admin/kapso?synced=${res.synced}&msg=${encodeURIComponent(res.message)}`);
  } else {
    redirect(`/admin/kapso?error=sync_failed&msg=${encodeURIComponent(res.message)}`);
  }
}
