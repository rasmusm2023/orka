export type CatalogName = {
  nummer: number;
  nameSv: string;
  nameEn: string | null;
};

function normalize(value: string): string {
  return value.toLocaleLowerCase("sv-SE").replace(/\s+/g, " ").trim();
}

function trigrams(value: string): Set<string> {
  const padded = `  ${value} `;
  const grams = new Set<string>();
  for (let index = 0; index < padded.length - 2; index += 1) {
    grams.add(padded.slice(index, index + 3));
  }
  return grams;
}

function similarity(left: string, right: string): number {
  const a = trigrams(left);
  const b = trigrams(right);
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const gram of a) {
    if (b.has(gram)) {
      shared += 1;
    }
  }
  return (2 * shared) / (a.size + b.size);
}

export function rankCatalog(
  foods: CatalogName[],
  query: string,
): CatalogName[] {
  const needle = normalize(query);
  if (needle.length < 2) {
    return [];
  }

  const ranked = foods.flatMap((food) => {
    const name = normalize(food.nameSv);
    const english = food.nameEn ? normalize(food.nameEn) : "";
    let score = 3;
    if (name.startsWith(needle) || english.startsWith(needle)) {
      score = 0;
    } else if (
      name.includes(` ${needle}`) ||
      english.includes(` ${needle}`)
    ) {
      score = 1;
    } else if (name.includes(needle) || english.includes(needle)) {
      score = 2;
    } else if (
      needle.length >= 4 &&
      (similarity(name, needle) > 0.45 ||
        (english && similarity(english, needle) > 0.45))
    ) {
      score = 3;
    } else {
      return [];
    }

    return [{ food, score, name }];
  });

  ranked.sort((left, right) => {
    if (left.score !== right.score) {
      return left.score - right.score;
    }
    if (left.name.length !== right.name.length) {
      return left.name.length - right.name.length;
    }
    return left.name.localeCompare(right.name, "sv");
  });

  return ranked.slice(0, 12).map((item) => item.food);
}
