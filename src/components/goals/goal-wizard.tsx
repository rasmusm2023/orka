"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import { saveGoal, skipOnboarding } from "@/lib/account/actions";
import { isIsoDate } from "@/lib/dates/calendar";
import { formatKcal, formatGrams, formatSignedKg } from "@/lib/format";
import {
  activityLevels,
  ageOnDate,
  calculateTargets,
  goalTypes,
  sexes,
  targetRateKgPerWeek,
  type ActivityLevel,
  type GoalType,
  type Sex,
} from "@/lib/goals/calculator";
import { parseDecimal } from "@/lib/goals/input";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { focusRing } from "@/components/ui/focus";

export type GoalDraft = {
  sex: Sex | null;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  goalType: GoalType | null;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

type GoalWizardProps = {
  mode: "onboarding" | "edit";
  formatting: string;
  today: string;
  initial: GoalDraft;
};

type ErrorCode = "invalid" | "age" | "save";

function fieldText(value: number | null, locale: string, digits: number) {
  if (value == null) {
    return "";
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
  }).format(value);
}

export function GoalWizard({
  mode,
  formatting,
  today,
  initial,
}: GoalWizardProps) {
  const t = useTranslations("Onboarding");
  const locale = useLocale() as AppLocale;
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ErrorCode | null>(null);
  const [goalType, setGoalType] = useState<GoalType | null>(initial.goalType);
  const [sex, setSex] = useState<Sex | null>(initial.sex);
  const [birthDate, setBirthDate] = useState(initial.birthDate ?? "");
  const [height, setHeight] = useState(
    fieldText(initial.heightCm, formatting, 1),
  );
  const [weight, setWeight] = useState(
    fieldText(initial.weightKg, formatting, 1),
  );
  const [activity, setActivity] = useState<ActivityLevel | null>(
    initial.activityLevel,
  );
  const [kcalText, setKcalText] = useState(
    fieldText(initial.kcal, formatting, 0),
  );
  const [proteinText, setProteinText] = useState(
    fieldText(initial.proteinG, formatting, 1),
  );
  const [carbsText, setCarbsText] = useState(
    fieldText(initial.carbsG, formatting, 1),
  );
  const [fatText, setFatText] = useState(
    fieldText(initial.fatG, formatting, 1),
  );
  const [precise, setPrecise] = useState({
    kcal: initial.kcal,
    proteinG: initial.proteinG,
    carbsG: initial.carbsG,
    fatG: initial.fatG,
  });
  const [edited, setEdited] = useState({
    kcal: false,
    protein: false,
    carbs: false,
    fat: false,
  });
  const [reviewDirty, setReviewDirty] = useState(
    mode === "edit" && initial.kcal != null,
  );

  const goals = {
    cut: { title: t("cut"), body: t("cutBody") },
    maintain: { title: t("maintain"), body: t("maintainBody") },
    bulk: { title: t("bulk"), body: t("bulkBody") },
  } as const;
  const activities = {
    sedentary: { title: t("sedentary"), body: t("sedentaryBody") },
    light: { title: t("light"), body: t("lightBody") },
    moderate: { title: t("moderate"), body: t("moderateBody") },
    high: { title: t("high"), body: t("highBody") },
    very_high: { title: t("veryHigh"), body: t("veryHighBody") },
  } as const;

  function formula() {
    const heightCm = parseDecimal(height);
    const weightKg = parseDecimal(weight);
    if (
      !sex ||
      !activity ||
      !goalType ||
      heightCm == null ||
      weightKg == null ||
      !isIsoDate(birthDate)
    ) {
      return null;
    }

    const age = ageOnDate(birthDate, today);
    if (age < 15 || age > 100) {
      return null;
    }

    return calculateTargets({
      sex,
      ageYears: age,
      heightCm,
      weightKg,
      activityLevel: activity,
      goalType,
    });
  }

  function fillFromFormula() {
    const targets = formula();
    if (!targets) {
      setError("invalid");
      return false;
    }

    setPrecise({
      kcal: targets.kcal,
      proteinG: targets.proteinG,
      carbsG: targets.carbsG,
      fatG: targets.fatG,
    });
    setKcalText(formatKcal(targets.kcal, formatting));
    setProteinText(formatGrams(targets.proteinG, formatting));
    setCarbsText(formatGrams(targets.carbsG, formatting));
    setFatText(formatGrams(targets.fatG, formatting));
    setEdited({ kcal: false, protein: false, carbs: false, fat: false });
    setReviewDirty(false);
    setError(null);
    return true;
  }

  function goNext() {
    setError(null);
    if (step === 0 && !goalType) {
      setError("invalid");
      return;
    }
    if (step === 1) {
      const heightCm = parseDecimal(height);
      const weightKg = parseDecimal(weight);
      if (
        !sex ||
        heightCm == null ||
        weightKg == null ||
        !isIsoDate(birthDate)
      ) {
        setError("invalid");
        return;
      }
      const age = ageOnDate(birthDate, today);
      if (age < 15 || age > 100) {
        setError("age");
        return;
      }
    }
    if (step === 2 && !activity) {
      setError("invalid");
      return;
    }
    if (step === 2 && !reviewDirty && !fillFromFormula()) {
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  }

  function save() {
    const heightCm = parseDecimal(height);
    const weightKg = parseDecimal(weight);
    const kcal = edited.kcal ? parseDecimal(kcalText) : precise.kcal;
    const proteinG = edited.protein
      ? parseDecimal(proteinText)
      : precise.proteinG;
    const carbsG = edited.carbs ? parseDecimal(carbsText) : precise.carbsG;
    const fatG = edited.fat ? parseDecimal(fatText) : precise.fatG;
    if (
      !sex ||
      !activity ||
      !goalType ||
      heightCm == null ||
      weightKg == null ||
      kcal == null ||
      proteinG == null ||
      carbsG == null ||
      fatG == null
    ) {
      setError("invalid");
      return;
    }

    startTransition(async () => {
      const result = await saveGoal(
        {
          sex,
          birthDate,
          heightCm,
          weightKg,
          activityLevel: activity,
          goalType,
          kcal,
          proteinG,
          carbsG,
          fatG,
        },
        mode,
        locale,
      );
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  const targets = formula();
  const kcalValue = edited.kcal ? parseDecimal(kcalText) : precise.kcal;
  const proteinValue = edited.protein
    ? parseDecimal(proteinText)
    : precise.proteinG;
  const carbsValue = edited.carbs ? parseDecimal(carbsText) : precise.carbsG;
  const fatValue = edited.fat ? parseDecimal(fatText) : precise.fatG;
  const rate =
    targets && kcalValue != null
      ? targetRateKgPerWeek(targets.tdee, kcalValue)
      : null;
  const carbsFloored =
    kcalValue != null &&
    proteinValue != null &&
    fatValue != null &&
    carbsValue === 0 &&
    4 * proteinValue + 9 * fatValue > kcalValue;

  return (
    <div>
      <p className="text-muted text-sm font-medium">
        {t("step", { current: step + 1, total: 4 })}
      </p>
      <h1 className="font-display mt-2 text-4xl leading-none font-semibold tracking-tight">
        {step === 0 ? t("goalTitle") : null}
        {step === 1 ? t("bodyTitle") : null}
        {step === 2 ? t("activityTitle") : null}
        {step === 3 ? t("reviewTitle") : null}
      </h1>

      {step === 0 ? (
        <div className="mt-6 flex flex-col gap-3">
          {goalTypes.map((type) => (
            <Choice
              key={type}
              title={goals[type].title}
              body={goals[type].body}
              selected={goalType === type}
              onSelect={() => setGoalType(type)}
            />
          ))}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="mt-6 flex flex-col gap-5">
          <div>
            <p className="text-ink text-sm font-medium">{t("sex")}</p>
            <div className="mt-2 flex gap-2">
              {sexes.map((option) => (
                <Choice
                  key={option}
                  title={option === "male" ? t("male") : t("female")}
                  selected={sex === option}
                  onSelect={() => setSex(option)}
                />
              ))}
            </div>
          </div>
          <TextField
            label={t("birthDate")}
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
          <TextField
            label={t("height")}
            inputMode="decimal"
            value={height}
            hint={t("heightUnit")}
            onChange={(event) => setHeight(event.target.value)}
          />
          <TextField
            label={t("weight")}
            inputMode="decimal"
            value={weight}
            hint={t("weightUnit")}
            onChange={(event) => setWeight(event.target.value)}
          />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-6 flex flex-col gap-3">
          {activityLevels.map((level) => (
            <Choice
              key={level}
              title={activities[level].title}
              body={activities[level].body}
              selected={activity === level}
              onSelect={() => setActivity(level)}
            />
          ))}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-6 flex flex-col gap-5">
          <p className="text-muted text-base">{t("reviewBody")}</p>
          <TextField
            label={t("kcal")}
            inputMode="decimal"
            value={kcalText}
            onChange={(event) => {
              setKcalText(event.target.value);
              setEdited((current) => ({ ...current, kcal: true }));
              setReviewDirty(true);
            }}
          />
          <TextField
            label={t("protein")}
            inputMode="decimal"
            hint={t("grams")}
            value={proteinText}
            onChange={(event) => {
              setProteinText(event.target.value);
              setEdited((current) => ({ ...current, protein: true }));
              setReviewDirty(true);
            }}
          />
          <TextField
            label={t("carbs")}
            inputMode="decimal"
            hint={t("grams")}
            value={carbsText}
            onChange={(event) => {
              setCarbsText(event.target.value);
              setEdited((current) => ({ ...current, carbs: true }));
              setReviewDirty(true);
            }}
          />
          <TextField
            label={t("fat")}
            inputMode="decimal"
            hint={t("grams")}
            value={fatText}
            onChange={(event) => {
              setFatText(event.target.value);
              setEdited((current) => ({ ...current, fat: true }));
              setReviewDirty(true);
            }}
          />
          {rate != null ? (
            <p className="font-display text-2xl leading-none font-semibold tabular-nums">
              {t("rate", { rate: formatSignedKg(rate, formatting) })}
            </p>
          ) : null}
          {carbsFloored ? (
            <p className="text-warning text-sm">{t("carbsFloor")}</p>
          ) : null}
          <Button
            variant="secondary"
            onClick={fillFromFormula}
            disabled={pending}
          >
            {t("recalculate")}
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-over mt-4 text-sm">
          {error === "age" ? t("age") : null}
          {error === "save" ? t("saveError") : null}
          {error === "invalid" ? t("invalid") : null}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        {step === 3 ? (
          <Button onClick={save} disabled={pending}>
            {mode === "edit" ? t("saveGoal") : t("save")}
          </Button>
        ) : (
          <Button onClick={goNext} disabled={pending}>
            {t("next")}
          </Button>
        )}
        {step > 0 ? (
          <Button
            variant="secondary"
            onClick={() => setStep((current) => current - 1)}
            disabled={pending}
          >
            {t("back")}
          </Button>
        ) : null}
        {mode === "onboarding" ? (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await skipOnboarding(locale);
                if (result?.error) {
                  setError("save");
                }
              });
            }}
          >
            {t("skip")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Choice({
  title,
  body,
  selected,
  onSelect,
}: {
  title: string;
  body?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`rounded-card min-h-11 border px-4 py-3 text-left ${
        selected
          ? "border-ink bg-ink text-background"
          : "border-line bg-surface text-ink hover:bg-track"
      } ${focusRing}`}
    >
      <span className="block text-base font-medium">{title}</span>
      {body ? (
        <span
          className={`mt-1 block text-sm ${selected ? "text-background/80" : "text-muted"}`}
        >
          {body}
        </span>
      ) : null}
    </button>
  );
}
