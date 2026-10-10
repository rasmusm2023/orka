const base = "https://dataportal.livsmedelsverket.se/livsmedel";

async function listAll(language) {
  const foods = [];
  let offset = 0;
  while (true) {
    const response = await fetch(
      `${base}/api/v1/livsmedel?offset=${offset}&limit=100&sprak=${language}`,
    );
    if (!response.ok) {
      throw new Error(`List failed: ${response.status}`);
    }
    const page = await response.json();
    foods.push(...(page.livsmedel ?? []));
    if (foods.length >= page._meta.totalRecords || (page.livsmedel ?? []).length === 0) {
      break;
    }
    offset += 100;
  }
  return foods;
}

const [swedish, english] = await Promise.all([listAll(1), listAll(2)]);
const englishNames = new Map(
  english.flatMap((food) => (food.namn ? [[food.nummer, food.namn]] : [])),
);
const rows = swedish.flatMap((food) =>
  food.namn
    ? [
        {
          nummer: food.nummer,
          nameSv: food.namn,
          nameEn: englishNames.get(food.nummer) ?? null,
        },
      ]
    : [],
);

const { writeFileSync, mkdirSync } = await import("node:fs");
mkdirSync("data", { recursive: true });
writeFileSync("data/livsmedel-names.json", JSON.stringify(rows));
console.log(`Wrote ${rows.length} foods`);
