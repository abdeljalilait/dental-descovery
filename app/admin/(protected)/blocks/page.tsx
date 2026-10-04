import type { Metadata } from "next";
import { listPageBlocksDb } from "@/lib/repositories/blog";
import { PageBlockEditor } from "@/components/admin/page-block-editor";
import { AdminPageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Content Blocks" };

export default async function AdminBlocksPage() {
  const records = await listPageBlocksDb();

  return (
    <>
      <AdminPageHeader
        title="Content Blocks"
        description="Editable copy blocks for any page. Use routeKey like 'pricing', blockKey like 'hero' or 'plans.free'."
      />
      <PageBlockEditor records={records} />
    </>
  );
}
