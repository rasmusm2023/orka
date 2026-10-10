import "server-only";
import {
  offProductSchema,
  offSearchSchema,
  parseOffProduct,
  soldInSweden,
  swedishProductSearchUrl,
} from "@/lib/nutrition/off";
import type { OffProduct } from "@/lib/nutrition/off";

const userAgent = "Kondis/0.1 (personal nutrition log)";

async function offJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": userAgent },
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function fetchOffBarcode(
  barcode: string,
): Promise<OffProduct | null> {
  if (!/^\d{8,14}$/.test(barcode)) {
    return null;
  }

  const json = await offJson(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=code,product_name,product_name_sv,product_name_en,brands,nutriments`,
  );
  if (!json) {
    return null;
  }

  const parsed = offProductSchema.safeParse(json);
  if (!parsed.success || parsed.data.status !== 1 || !parsed.data.product) {
    return null;
  }

  return parseOffProduct({ ...parsed.data.product, code: barcode });
}

export async function searchOffProducts(query: string): Promise<OffProduct[]> {
  const url = swedishProductSearchUrl(query);
  if (!url) {
    return [];
  }

  try {
    const json = await offJson(url);
    if (!json) {
      return [];
    }

    const parsed = offSearchSchema.safeParse(json);
    if (!parsed.success) {
      return [];
    }

    return (parsed.data.products ?? [])
      .flatMap((product) => {
        if (
          !soldInSweden(product.countries_tags) ||
          !/^\d{8,14}$/.test(product.code ?? "")
        ) {
          return [];
        }
        const item = parseOffProduct(product);
        return item ? [item] : [];
      })
      .slice(0, 8);
  } catch {
    return [];
  }
}
