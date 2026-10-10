"use client";

import { hasLocale, useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
import { MacroBars } from "@/components/ui/macro-bars";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Stepper } from "@/components/ui/stepper";
import { TextField } from "@/components/ui/text-field";
import { Toast } from "@/components/ui/toast";
import { formattingLocale } from "@/i18n/formatting";
import { routing } from "@/i18n/routing";

const swatches = [
  { key: "food", className: "bg-food" },
  { key: "training", className: "bg-training" },
  { key: "body", className: "bg-body" },
  { key: "recovery", className: "bg-recovery" },
  { key: "good", className: "bg-good" },
  { key: "warning", className: "bg-warning" },
  { key: "over", className: "bg-over" },
] as const;

export function Gallery() {
  const t = useTranslations("Dev");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="max-w-xl">
        <h1 className="font-display text-5xl leading-none font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted mt-3 text-lg">{t("intro")}</p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ThemePanel theme="light" label={t("light")} />
        <ThemePanel theme="dark" label={t("dark")} />
      </div>
    </div>
  );
}

function ThemePanel({
  theme,
  label,
}: {
  theme: "light" | "dark";
  label: string;
}) {
  const t = useTranslations("Dev");
  const locale = useLocale();
  const numberLocale = hasLocale(routing.locales, locale)
    ? formattingLocale(locale)
    : "sv-SE";
  const [tenths, setTenths] = useState(824);
  const [chip, setChip] = useState("portion");
  const [toastVisible, setToastVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!sheetOpen) {
      return;
    }
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSheetOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sheetOpen]);

  const format = (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(numberLocale, options).format(value);

  return (
    <section
      data-theme={theme}
      aria-label={label}
      className="rounded-card border-line bg-background text-ink relative overflow-hidden border p-4 sm:p-6"
    >
      <p className="text-muted text-sm font-medium tracking-wide uppercase">
        {label}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {swatches.map((swatch) => (
          <div key={swatch.key} className="flex items-center gap-3">
            <span
              className={`rounded-control size-8 shrink-0 ${swatch.className}`}
            />
            <span className="text-sm">{t(swatch.key)}</span>
          </div>
        ))}
      </div>

      <Section title={t("sections.buttons")}>
        <div className="flex flex-wrap gap-2">
          <Button>{t("log")}</Button>
          <Button variant="secondary">{t("cancel")}</Button>
          <Button variant="ghost">{t("skip")}</Button>
        </div>
      </Section>

      <Section title={t("sections.inputs")}>
        <TextField
          label={t("weight")}
          hint={t("kilograms")}
          defaultValue={format(82.4, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
        />
      </Section>

      <Section title={t("sections.stepper")}>
        <Stepper
          label={t("weight")}
          value={format(tenths / 10, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
          unit={t("kg")}
          decrementLabel={t("decrease")}
          incrementLabel={t("increase")}
          decrementDisabled={tenths <= 0}
          onDecrement={() => setTenths((current) => Math.max(0, current - 1))}
          onIncrement={() => setTenths((current) => current + 1)}
        />
      </Section>

      <Section title={t("sections.cards")}>
        <Card
          title={t("today")}
          action={<Button variant="ghost">{t("logWeight")}</Button>}
        >
          <p className="text-muted text-base">{t("cardBody")}</p>
        </Card>
      </Section>

      <Section title={t("sections.rows")}>
        <ListRow
          title={t("weighIn")}
          detail={t("today")}
          value={format(82.4, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
        />
      </Section>

      <Section title={t("sections.ring")}>
        <ProgressRing
          ratio={0.64}
          value={format(1240)}
          unit={t("kcal")}
          label={t("remaining")}
        />
      </Section>

      <Section title={t("sections.macros")}>
        <MacroBars
          items={[
            {
              label: t("protein"),
              value: format(92),
              ratio: 0.82,
              prominent: true,
            },
            { label: t("carbs"), value: format(180), ratio: 0.7 },
            { label: t("fat"), value: format(48), ratio: 0.55 },
          ]}
        />
      </Section>

      <Section title={t("sections.chips")}>
        <div className="flex flex-wrap gap-2">
          {(["portion", "hundred", "last"] as const).map((id) => (
            <Chip
              key={id}
              label={t(id)}
              selected={chip === id}
              onSelect={() => setChip(id)}
            />
          ))}
        </div>
      </Section>

      <Section title={t("sections.toast")}>
        <div className="flex flex-col gap-3">
          <Button variant="secondary" onClick={() => setToastVisible(true)}>
            {t("showToast")}
          </Button>
          {toastVisible ? (
            <Toast
              message={t("removed")}
              actionLabel={t("undo")}
              onAction={() => setToastVisible(false)}
            />
          ) : null}
        </div>
      </Section>

      <Section title={t("sections.sheet")}>
        <Button onClick={() => setSheetOpen(true)}>{t("openSheet")}</Button>
      </Section>

      <Section title={t("sections.empty")}>
        <EmptyState
          title={t("emptyTitle")}
          body={t("emptyBody")}
          action={<Button>{t("logFood")}</Button>}
        />
      </Section>

      {sheetOpen ? (
        <BottomSheet
          title={t("add")}
          closeLabel={t("close")}
          onClose={() => setSheetOpen(false)}
          closeRef={closeRef}
        >
          <p className="text-muted text-base">{t("sheetBody")}</p>
        </BottomSheet>
      ) : null}
    </section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="font-display text-2xl leading-none font-semibold tracking-tight">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
