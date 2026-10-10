"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import {
  createUserFood,
  findFoods,
  foodAmount,
  logFood,
  logQuick,
  logSavedMeal,
  openBarcode,
  openLivsmedel,
  suggestFoods,
  toggleFavorite,
} from "@/lib/food/actions";
import type { FoodDay, FoodHit } from "@/lib/food/types";
import { formatGrams, formatKcal } from "@/lib/format";
import { parseDecimal } from "@/lib/goals/input";
import { foodLabel } from "@/lib/nutrition/names";
import { meals, type Meal } from "@/lib/nutrition/meals";
import { totalsFromGrams } from "@/lib/nutrition/entry";
import { defaultGrams } from "@/lib/nutrition/servings";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { TextField } from "@/components/ui/text-field";
import { focusRing } from "@/components/ui/focus";
import { BarcodeScan } from "./barcode-scan";

type Step = "search" | "amount" | "quick" | "create" | "scan";

type Draft = {
  name: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
};

type LogPanelProps = {
  date: string;
  meal: Meal;
  formatting: string;
  onMeal: (meal: Meal) => void;
  onClose: () => void;
  onDay: (day: FoodDay) => void;
};

const mealMessage = {
  frukost: "meals.frukost",
  lunch: "meals.lunch",
  middag: "meals.middag",
  mellanmal: "meals.mellanmal",
} as const;

export function LogPanel({
  date,
  meal,
  formatting,
  onMeal,
  onClose,
  onDay,
}: LogPanelProps) {
  const t = useTranslations("Food");
  const locale = useLocale() as AppLocale;
  const searchRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<FoodHit[]>([]);
  const [branded, setBranded] = useState<FoodHit[]>([]);
  const [recent, setRecent] = useState<FoodHit[]>([]);
  const [favorites, setFavorites] = useState<FoodHit[]>([]);
  const [savedMeals, setSavedMeals] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [active, setActive] = useState(0);
  const [hit, setHit] = useState<FoodHit | null>(null);
  const [grams, setGrams] = useState("100");
  const [presets, setPresets] = useState<number[]>([100]);
  const [favorite, setFavorite] = useState(false);
  const [warning, setWarning] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    name: "",
    kcal: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [acknowledge, setAcknowledge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    searchRef.current?.focus();
  }, [step]);

  useEffect(() => {
    let cancelled = false;
    void suggestFoods(meal, locale).then((result) => {
      if (!cancelled) {
        setRecent(result.recent);
        setFavorites(result.favorites);
        setSavedMeals(result.savedMeals);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [meal, locale]);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void findFoods(query, locale).then((result) => {
        if (!cancelled) {
          setFoods(result.foods);
          setBranded(result.branded);
          setActive(0);
        }
      });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, locale]);

  const results = query.trim() ? foods : recent;
  const liveGrams = parseDecimal(grams);
  const live =
    hit && liveGrams != null
      ? totalsFromGrams(liveGrams, {
          kcal: hit.kcal,
          proteinG: hit.proteinG,
          carbsG: hit.carbsG,
          fatG: hit.fatG,
        })
      : null;

  async function openPackaged(code: string, missingStep: Step) {
    setPending(true);
    setError(null);
    const result = await openBarcode(code, locale);
    setPending(false);
    if ("food" in result && result.food) {
      await choose(result.food, result.warning === true);
      return;
    }
    if (result.error === "catalog" && result.draft) {
      setDraft({
        name: result.draft.name,
        kcal: String(result.draft.kcal),
        protein: String(result.draft.proteinG),
        carbs: String(result.draft.carbsG),
        fat: String(result.draft.fatG),
      });
      setWarning(true);
      setStep("create");
      return;
    }
    setError(result.error === "missing" ? t("missingBarcode") : t("saveError"));
    setStep(missingStep);
  }

  async function choose(food: FoodHit, flagged = false) {
    if (food.id.startsWith("off:")) {
      await openPackaged(food.id.slice(4), "search");
      return;
    }
    let selected = food;
    if (food.id.startsWith("slv:")) {
      setPending(true);
      const opened = await openLivsmedel(Number(food.id.slice(4)), locale);
      setPending(false);
      if (!("food" in opened) || !opened.food) {
        setError(t("saveError"));
        return;
      }
      selected = opened.food;
    }
    setHit(selected);
    setWarning(flagged);
    setError(null);
    setStep("amount");
    const detail = await foodAmount(selected.id, locale);
    const serving = detail?.servings[0]?.grams ?? null;
    const amount = defaultGrams(detail?.lastGrams ?? null, serving);
    const options = [100, amount, ...(detail?.servings.map((item) => item.grams) ?? [])];
    setPresets([...new Set(options.filter((value) => value > 0))]);
    setGrams(String(amount).replace(".", ","));
    setFavorite(detail?.favorite ?? false);
  }

  async function chooseBarcode(code: string) {
    await openPackaged(code, "scan");
  }

  async function submitAmount() {
    if (!hit || liveGrams == null || liveGrams <= 0) {
      setError(t("invalid"));
      return;
    }
    setPending(true);
    const result = await logFood(
      { foodId: hit.id, meal, date, grams: liveGrams },
      locale,
    );
    setPending(false);
    if ("day" in result) {
      onDay(result.day);
      onClose();
      return;
    }
    setError(t("saveError"));
  }

  return (
    <div className="bg-ink/40 fixed inset-0 z-40 flex items-end justify-center lg:items-stretch lg:justify-end">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("log")}
        className="bg-surface flex max-h-[88dvh] w-full flex-col overflow-y-auto rounded-t-card px-4 pt-3 pb-6 lg:max-h-none lg:w-[28rem] lg:rounded-none lg:px-6 lg:pt-6"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-3xl leading-none font-semibold">
            {step === "amount" && hit
              ? foodLabel(hit.nameSv, hit.nameEn, locale)
              : t("log")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`text-muted min-h-11 px-2 text-sm font-medium ${focusRing}`}
          >
            {t("close")}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {meals.map((option) => (
            <Chip
              key={option}
              label={t(mealMessage[option])}
              selected={meal === option}
              onSelect={() => onMeal(option)}
            />
          ))}
        </div>

        {error ? (
          <p className="text-over mb-3 text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {step === "search" ? (
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="sr-only">{t("searchLabel")}</span>
              <input
                ref={searchRef}
                value={query}
                placeholder={t("searchPlaceholder")}
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  const list = query.trim() ? [...foods, ...branded] : recent;
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActive((current) => Math.min(list.length - 1, current + 1));
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActive((current) => Math.max(0, current - 1));
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const food = list[active];
                    if (food) {
                      void choose(food);
                    }
                  }
                  if (event.key === "Escape") {
                    onClose();
                  }
                }}
                className={`rounded-control border-line bg-surface text-ink h-11 w-full border px-3 text-base ${focusRing}`}
              />
            </label>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep("scan")}>
                {t("barcode")}
              </Button>
              <Button variant="secondary" onClick={() => setStep("quick")}>
                {t("quick")}
              </Button>
              <Button variant="ghost" onClick={() => setStep("create")}>
                {t("create")}
              </Button>
            </div>
            {!query.trim() && favorites.length > 0 ? (
              <FoodList
                title={t("favorites")}
                foods={favorites}
                locale={locale}
                formatting={formatting}
                per100={t("serving100")}
                onChoose={(food) => void choose(food)}
              />
            ) : null}
            <FoodList
              title={query.trim() ? t("results") : t("recent")}
              foods={results}
              locale={locale}
              formatting={formatting}
              per100={t("serving100")}
              active={active}
              onChoose={(food) => void choose(food)}
            />
            {query.trim() ? (
              <FoodList
                title={t("products")}
                foods={branded}
                locale={locale}
                formatting={formatting}
                per100={t("serving100")}
                active={active - foods.length}
                onChoose={(food) => void choose(food)}
              />
            ) : null}
            {query.trim() && foods.length === 0 && branded.length === 0 ? (
              <p className="text-muted text-sm">{t("noResults")}</p>
            ) : null}
            {!query.trim() && savedMeals.length > 0 ? (
              <div>
                <h3 className="text-muted mb-2 text-sm font-medium">
                  {t("savedMeals")}
                </h3>
                {savedMeals.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPending(true);
                      void logSavedMeal(item.id, meal, date, locale).then(
                        (result) => {
                          setPending(false);
                          if (result && "day" in result) {
                            onDay(result.day);
                            onClose();
                          } else {
                            setError(t("saveError"));
                          }
                        },
                      );
                    }}
                    className={`border-line text-ink flex min-h-11 w-full items-center border-b py-2 text-left ${focusRing}`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "amount" && hit ? (
          <div className="flex flex-col gap-4">
            <p className="text-muted text-sm">
              {hit.source === "livsmedelsverket"
                ? t("sourceSlv")
                : hit.source === "openfoodfacts"
                  ? t("sourceOff")
                  : t("sourceUser")}
            </p>
            {warning ? (
              <p className="text-warning text-sm">{t("checkPackage")}</p>
            ) : null}
            <p className="font-display text-4xl leading-none font-semibold tabular-nums">
              {live
                ? t("liveLine", {
                    kcal: formatKcal(live.kcal, formatting),
                    protein: formatGrams(live.proteinG, formatting),
                  })
                : t("grams")}
            </p>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Chip
                  key={preset}
                  label={
                    preset === 100
                      ? t("serving100")
                      : t("gramsValue", {
                          grams: formatGrams(preset, formatting),
                        })
                  }
                  selected={parseDecimal(grams) === preset}
                  onSelect={() => setGrams(String(preset).replace(".", ","))}
                />
              ))}
            </div>
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submitAmount();
              }}
            >
              <TextField
                label={t("grams")}
                inputMode="decimal"
                autoFocus
                value={grams}
                onChange={(event) => setGrams(event.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  {t("logAmount")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const next = !favorite;
                    setFavorite(next);
                    void toggleFavorite(hit.id, next, locale);
                  }}
                >
                  {favorite ? t("unfavorite") : t("favorite")}
                </Button>
              </div>
            </form>
            <Button variant="ghost" onClick={() => setStep("search")}>
              {t("back")}
            </Button>
          </div>
        ) : null}

        {step === "quick" ? (
          <QuickForm
            pending={pending}
            onCancel={() => setStep("search")}
            onSubmit={async (values) => {
              setPending(true);
              const result = await logQuick({ ...values, meal, date }, locale);
              setPending(false);
              if ("day" in result) {
                onDay(result.day);
                onClose();
                return;
              }
              setError(t(result.error === "invalid" ? "invalid" : "saveError"));
            }}
          />
        ) : null}

        {step === "create" ? (
          <CreateForm
            draft={draft}
            warning={warning || acknowledge}
            pending={pending}
            onCancel={() => setStep("search")}
            onSubmit={async (values, accepted) => {
              setPending(true);
              const result = await createUserFood(
                { ...values, acknowledge: accepted },
                locale,
              );
              setPending(false);
              if ("food" in result) {
                await choose(result.food, accepted);
                return;
              }
              if (result.error === "check") {
                setAcknowledge(true);
                setWarning(true);
                return;
              }
              setError(t(result.error === "invalid" ? "invalid" : "saveError"));
            }}
          />
        ) : null}

        {step === "scan" ? (
          <div className="flex flex-col gap-4">
            <BarcodeScan onCode={(code) => void chooseBarcode(code)} />
            <Button variant="ghost" onClick={() => setStep("search")}>
              {t("back")}
            </Button>
          </div>
        ) : null}
        {pending ? <p className="sr-only">{t("working")}</p> : null}
      </div>
    </div>
  );
}

function FoodList({
  title,
  foods,
  locale,
  formatting,
  per100,
  active = -1,
  onChoose,
}: {
  title: string;
  foods: FoodHit[];
  locale: AppLocale;
  formatting: string;
  per100: string;
  active?: number;
  onChoose: (food: FoodHit) => void;
}) {
  if (foods.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-muted mb-2 text-sm font-medium">{title}</h3>
      {foods.map((food, index) => (
        <button
          key={food.id}
          type="button"
          onClick={() => onChoose(food)}
          className={`border-line flex min-h-11 w-full items-center justify-between gap-3 border-b py-2 text-left ${
            index === active ? "bg-track" : ""
          } ${focusRing}`}
        >
          <span className="min-w-0">
            <span className="text-ink block truncate">
              {foodLabel(food.nameSv, food.nameEn, locale)}
            </span>
            {food.brand ? (
              <span className="text-muted block truncate text-sm">
                {food.brand}
              </span>
            ) : null}
          </span>
          <span className="text-right">
            <span className="font-display block text-xl leading-none font-semibold tabular-nums">
              {formatKcal(food.kcal, formatting)}
            </span>
            <span className="text-muted text-xs">{per100}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function QuickForm({
  pending,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    label: string;
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  }) => Promise<void>;
}) {
  const t = useTranslations("Food");
  const [label, setLabel] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const parsedKcal = parseDecimal(kcal);
        if (!label.trim() || parsedKcal == null) {
          return;
        }
        void onSubmit({
          label: label.trim(),
          kcal: parsedKcal,
          proteinG: parseDecimal(protein) ?? 0,
          carbsG: parseDecimal(carbs) ?? 0,
          fatG: parseDecimal(fat) ?? 0,
        });
      }}
    >
      <p className="text-muted text-sm">{t("quickBody")}</p>
      <TextField label={t("label")} value={label} onChange={(event) => setLabel(event.target.value)} />
      <TextField label={t("kcal")} inputMode="decimal" value={kcal} onChange={(event) => setKcal(event.target.value)} />
      <TextField label={t("protein")} inputMode="decimal" value={protein} onChange={(event) => setProtein(event.target.value)} />
      <TextField label={t("carbs")} inputMode="decimal" value={carbs} onChange={(event) => setCarbs(event.target.value)} />
      <TextField label={t("fat")} inputMode="decimal" value={fat} onChange={(event) => setFat(event.target.value)} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {t("logAmount")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("back")}
        </Button>
      </div>
    </form>
  );
}

function CreateForm({
  draft,
  warning,
  pending,
  onCancel,
  onSubmit,
}: {
  draft: Draft;
  warning: boolean;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (
    values: {
      name: string;
      kcal: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
      fiberG: null;
      sugarG: null;
      saltG: null;
      alcoholG: null;
    },
    acknowledge: boolean,
  ) => Promise<void>;
}) {
  const t = useTranslations("Food");
  const [name, setName] = useState(draft.name);
  const [kcal, setKcal] = useState(draft.kcal);
  const [protein, setProtein] = useState(draft.protein);
  const [carbs, setCarbs] = useState(draft.carbs);
  const [fat, setFat] = useState(draft.fat);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = {
          kcal: parseDecimal(kcal),
          proteinG: parseDecimal(protein),
          carbsG: parseDecimal(carbs),
          fatG: parseDecimal(fat),
        };
        const kcalValue = parsed.kcal;
        const proteinValue = parsed.proteinG;
        const carbsValue = parsed.carbsG;
        const fatValue = parsed.fatG;
        if (
          !name.trim() ||
          kcalValue == null ||
          proteinValue == null ||
          carbsValue == null ||
          fatValue == null
        ) {
          return;
        }
        void onSubmit(
          {
            name: name.trim(),
            kcal: kcalValue,
            proteinG: proteinValue,
            carbsG: carbsValue,
            fatG: fatValue,
            fiberG: null,
            sugarG: null,
            saltG: null,
            alcoholG: null,
          },
          warning,
        );
      }}
    >
      <p className="text-muted text-sm">{t("per100")}</p>
      {warning ? <p className="text-warning text-sm">{t("checkPackage")}</p> : null}
      <TextField label={t("label")} value={name} onChange={(event) => setName(event.target.value)} />
      <TextField label={t("kcal")} inputMode="decimal" value={kcal} onChange={(event) => setKcal(event.target.value)} />
      <TextField label={t("protein")} inputMode="decimal" value={protein} onChange={(event) => setProtein(event.target.value)} />
      <TextField label={t("carbs")} inputMode="decimal" value={carbs} onChange={(event) => setCarbs(event.target.value)} />
      <TextField label={t("fat")} inputMode="decimal" value={fat} onChange={(event) => setFat(event.target.value)} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {warning ? t("saveAnyway") : t("save")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("back")}
        </Button>
      </div>
    </form>
  );
}
