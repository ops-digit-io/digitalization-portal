import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import {
  getAllCategories, categoriesEditable, CATEGORY_LABEL,
  plantsInUse, plantScopeGroup, PROTECTED_PLANTS,
} from "@/lib/category-store";
import { CategoryEditor } from "./editor";

export const dynamic = "force-dynamic";

/**
 * Admin — manage the selectable categories offered in the portal's dropdowns
 * (plants, domains). Admin-only (`can(session,"all")`). Lanes are intentionally not
 * here: a lane is a structural enum wired into provisioning, triage, and RBAC, not a
 * free reference label.
 */
export default async function CategoriesAdminPage() {
  const session = await getSession();
  if (!can(session, "all")) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">Administration · Categories</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page is for administrators only.</p>
        <Link href="/" className="mt-3 inline-block text-sm underline">← Home</Link>
      </main>
    );
  }

  const categories = await getAllCategories();
  const editable = categoriesEditable();
  const inUse = await plantsInUse();
  const lockedPlants = [...new Set([...inUse, ...PROTECTED_PLANTS])];

  return (
    <main className="mx-auto max-w-[820px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Administration · Categories</span>
      </nav>
      <h1 className="text-lg font-semibold">Categories</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        The values offered in selection dropdowns across the portal — intake, editing, and filters.
        Changes take effect everywhere immediately. Lanes are governed in code and not editable here.
      </p>

      <div className="space-y-5">
        <CategoryEditor
          kind="plant"
          label={CATEGORY_LABEL.plant.plural}
          initial={categories.plant}
          editable={editable}
          locked={lockedPlants}
          scopeGroupFor={plantScopeGroup}
          note={`New plant = new RBAC scope: each plant maps to the IdP group ${plantScopeGroup("<plant>")}; grant that group to scope a champion to it, and the scope goes live once the plant is added here. 🔒 plants are in use by a demand (or the protected "ALL") and can't be removed until their demands are reassigned.`}
        />
        <CategoryEditor kind="domain" label={CATEGORY_LABEL.domain.plural} initial={categories.domain} editable={editable} />
      </div>
    </main>
  );
}
