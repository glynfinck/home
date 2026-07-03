import { KindManager } from "@/components/admin/kind-manager";
import { adminListContentTags, adminListTagKinds } from "@/lib/data/admin";

export default async function AdminKindsPage() {
  const [kinds, contentTags] = await Promise.all([
    adminListTagKinds(),
    adminListContentTags(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <KindManager kinds={kinds} contentTags={contentTags} />
    </div>
  );
}
