import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";

export const instant = false;

export default async function ProgressPage() {
  const t = await getTranslations("Progress");

  return (
    <div>
      <h1 className="font-display text-4xl leading-none font-semibold tracking-tight">
        {t("title")}
      </h1>
      <div className="mt-8">
        <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />
      </div>
    </div>
  );
}
