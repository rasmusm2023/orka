import { getTranslations } from "next-intl/server";
import { Gallery } from "./gallery";

export async function generateMetadata() {
  const t = await getTranslations("Dev");
  return { title: t("title") };
}

export default function ComponentsPage() {
  return (
    <main className="flex-1">
      <Gallery />
    </main>
  );
}
