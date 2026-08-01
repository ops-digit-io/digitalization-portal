import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import {
  getAllCategories, categoriesEditable, CATEGORY_LABEL,
  plantUsageCounts, plantScopeGroup, PROTECTED_PLANTS,
} from "@/lib/category-store";
import { getT } from "@/lib/i18n-server";
import { CategoryEditor } from "./editor";
import { PlantRetire } from "./plant-retire";

export const dynamic = "force-dynamic";

/**
 * Admin — manage the selectable categories offered in the portal's dropdowns
 * (plants, domains). Admin-only (`can(session,"all")`). Lanes are intentionally not
 * here: a lane is a structural enum wired into provisioning, triage, and RBAC, not a
 * free reference label.
 */
export default async function CategoriesAdminPage() {
  const t = getT();
  const session = await getSession();
  if (!can(session, "all")) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">{t("categories.adminHeading", "Administration · Categories")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("admin.adminOnly", "This page is for administrators only.")}</p>
        <Link href="/" className="mt-3 inline-block text-sm underline">{t("admin.backHome", "← Home")}</Link>
      </main>
    );
  }

  const categories = await getAllCategories();
  const editable = categoriesEditable();
  const usageCounts = await plantUsageCounts();
  const inUse = Object.keys(usageCounts);
  const lockedPlants = [...new Set([...inUse, ...PROTECTED_PLANTS])];
  // In-use, non-protected plants are the ones that can be retired via reassignment.
  const retirable = inUse
    .filter((p) => !PROTECTED_PLANTS.has(p.toUpperCase()))
    .map((p) => ({ plant: p, count: usageCounts[p]! }))
    .sort((a, b) => a.plant.localeCompare(b.plant));
  // Precompute plant → RBAC scope group as a plain map (functions can't cross the
  // server→client boundary).
  const plantScopeGroups = Object.fromEntries(categories.plant.map((p) => [p, plantScopeGroup(p)]));

  return (
    <main className="mx-auto max-w-[820px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("nav.home", "Home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("categories.adminHeading", "Administration · Categories")}</span>
      </nav>
      <h1 className="text-lg font-semibold">{t("categories.title", "Categories")}</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        {t("categories.intro", "The values offered in selection dropdowns across the portal — intake, editing, and filters. Changes take effect everywhere immediately. Lanes are governed in code and not editable here.")}
      </p>

      <div className="space-y-5">
        <CategoryEditor
          kind="plant"
          label={CATEGORY_LABEL.plant.plural}
          initial={categories.plant}
          editable={editable}
          locked={lockedPlants}
          scopeGroups={plantScopeGroups}
          note={`${t("categories.plantNote1", "New plant = new RBAC scope: each plant maps to the IdP group")} ${plantScopeGroup("<plant>")}${t("categories.plantNote2", "; grant that group to scope a champion to it, and the scope goes live once the plant is added here. 🔒 plants are in use by a demand (or the protected \"ALL\") and can't be removed until their demands are reassigned.")}`}
        />
        <PlantRetire usage={retirable} allPlants={categories.plant} editable={editable} />

        <CategoryEditor kind="domain" label={CATEGORY_LABEL.domain.plural} initial={categories.domain} editable={editable} />
      </div>
    </main>
  );
}
