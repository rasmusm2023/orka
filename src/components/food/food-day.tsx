"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import {
  copyMeal,
  deleteEntry,
  refreshFoodDay,
  restoreEntry,
  saveMeal,
  updateEntryGrams,
} from "@/lib/food/actions";
import type { FoodDay, FoodEntry, Restorable } from "@/lib/food/types";
import { formatGrams, formatKcal } from "@/lib/format";
import { parseDecimal } from "@/lib/goals/input";
import { sumTotals } from "@/lib/nutrition/entry";
import { hourInTimeZone, mealForHour, meals, type Meal } from "@/lib/nutrition/meals";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { Toast } from "@/components/ui/toast";
import { focusRing } from "@/components/ui/focus";
import { LogPanel } from "./log-panel";

const mealMessage = {
  frukost: "meals.frukost",
  lunch: "meals.lunch",
  middag: "meals.middag",
  mellanmal: "meals.mellanmal",
} as const;

type FoodDayViewProps = {
  day: FoodDay;
  timeZone: string;
  formatting: string;
};

export function FoodDayView({ day, timeZone, formatting }: FoodDayViewProps) {
  const t = useTranslations("Food");
  const locale = useLocale() as AppLocale;
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["food-day", day.date],
    queryFn: () => refreshFoodDay(day.date, locale),
    initialData: day,
  });
  const entries = query.data?.entries ?? day.entries;
  const [open, setOpen] = useState(false);
  const [meal, setMeal] = useState<Meal>(() =>
    mealForHour(hourInTimeZone(timeZone, new Date())),
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [grams, setGrams] = useState("");
  const [savingMeal, setSavingMeal] = useState<Meal | null>(null);
  const [mealName, setMealName] = useState("");
  const [undo, setUndo] = useState<Restorable | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function apply(next: FoodDay) {
    queryClient.setQueryData(["food-day", day.date], next);
  }

  async function remove(entry: FoodEntry) {
    const previous = entries;
    apply({
      date: day.date,
      entries: previous.filter((item) => item.id !== entry.id),
    });
    const result = await deleteEntry(entry.id, entry.kind, day.date, locale);
    if ("removed" in result) {
      apply(result.day);
      setUndo(result.removed);
      setNotice(null);
      return;
    }
    apply({ date: day.date, entries: previous });
    setNotice(t("saveError"));
  }

  return (
    <div>
      <Button className="mt-6 w-full lg:w-auto" onClick={() => setOpen(true)}>
        {t("log")}
      </Button>
      <div className="mt-6 flex flex-col gap-4">
        {meals.map((option) => {
          const rows = entries.filter((entry) => entry.meal === option);
          const total = sumTotals(rows);
          return (
            <Card
              key={option}
              title={t(mealMessage[option])}
              action={
                <span className="font-display text-2xl leading-none font-semibold tabular-nums">
                  {t("mealKcal", { kcal: formatKcal(total.kcal, formatting) })}
                </span>
              }
            >
              {rows.length === 0 ? (
                <p className="text-muted text-sm">{t("mealEmpty")}</p>
              ) : (
                rows.map((entry) => (
                  <div
                    key={entry.id}
                    className="border-line border-b py-2 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(entry.id);
                          setGrams(
                            entry.grams == null
                              ? ""
                              : formatGrams(entry.grams, formatting),
                          );
                        }}
                        className={`min-w-0 flex-1 text-left ${focusRing}`}
                      >
                        <span className="text-ink block truncate">
                          {entry.name}
                        </span>
                        <span className="text-muted text-sm">
                          {entry.grams == null
                            ? t("quick")
                            : t("gramsValue", {
                                grams: formatGrams(entry.grams, formatting),
                              })}
                        </span>
                      </button>
                      <span className="font-display text-2xl leading-none font-semibold tabular-nums">
                        {formatKcal(entry.kcal, formatting)}
                      </span>
                      <button
                        type="button"
                        aria-label={t("delete")}
                        onClick={() => void remove(entry)}
                        className={`text-muted min-h-11 px-2 text-sm ${focusRing}`}
                      >
                        {t("delete")}
                      </button>
                    </div>
                    {editing === entry.id && entry.kind === "food" ? (
                      <form
                        className="mt-2 flex items-end gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const next = parseDecimal(grams);
                          if (next == null) {
                            return;
                          }
                          void updateEntryGrams(
                            entry.id,
                            next,
                            day.date,
                            locale,
                          ).then((result) => {
                            if (result && "day" in result) {
                              apply(result.day);
                              setEditing(null);
                            } else {
                              setNotice(t("saveError"));
                            }
                          });
                        }}
                      >
                        <div className="flex-1">
                          <TextField
                            label={t("grams")}
                            inputMode="decimal"
                            value={grams}
                            onChange={(event) => setGrams(event.target.value)}
                          />
                        </div>
                        <Button type="submit">{t("save")}</Button>
                      </form>
                    ) : null}
                  </div>
                ))
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    void copyMeal(day.date, option, locale).then((result) => {
                      if (result && "day" in result && result.day) {
                        apply(result.day);
                        const count = result.copied ?? 0;
                        setNotice(
                          count > 0
                            ? t("copied", { count })
                            : t("nothingYesterday"),
                        );
                      } else {
                        setNotice(t("saveError"));
                      }
                    });
                  }}
                >
                  {t("copyYesterday")}
                </Button>
                {rows.some((entry) => entry.kind === "food") ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSavingMeal(option);
                      setMealName("");
                    }}
                  >
                    {t("saveMeal")}
                  </Button>
                ) : null}
              </div>
              {savingMeal === option ? (
                <form
                  className="mt-3 flex items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveMeal(day.date, option, mealName, locale).then(
                      (result) => {
                        if (result && "error" in result && result.error) {
                          setNotice(
                            result.error === "empty"
                              ? t("mealEmpty")
                              : t("saveError"),
                          );
                          return;
                        }
                        setSavingMeal(null);
                        setNotice(t("mealSaved"));
                      },
                    );
                  }}
                >
                  <div className="flex-1">
                    <TextField
                      label={t("mealName")}
                      value={mealName}
                      onChange={(event) => setMealName(event.target.value)}
                    />
                  </div>
                  <Button type="submit">{t("save")}</Button>
                </form>
              ) : null}
            </Card>
          );
        })}
      </div>
      {notice ? (
        <p className="text-muted mt-4 text-sm" role="status">
          {notice}
        </p>
      ) : null}
      {undo ? (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4 lg:bottom-6">
          <div className="mx-auto max-w-3xl">
            <Toast
              message={t("deleted")}
              actionLabel={t("undo")}
              onAction={() => {
                const removed = undo;
                setUndo(null);
                void restoreEntry(day.date, removed, locale).then((result) => {
                  if (result && "day" in result) {
                    apply(result.day);
                  } else {
                    setNotice(t("saveError"));
                  }
                });
              }}
            />
          </div>
        </div>
      ) : null}
      {open ? (
        <LogPanel
          date={day.date}
          meal={meal}
          formatting={formatting}
          onMeal={setMeal}
          onClose={() => setOpen(false)}
          onDay={apply}
        />
      ) : null}
    </div>
  );
}
