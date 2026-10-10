import { FARMASI_CATALOG } from "./farmasi-catalog";

export type SeedProduct = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  ingredientIds: string[];
  fullIngredients: string;
  origin: string;
  description: string;
  usageSteps: string[];
  imageUrl?: string;
  officialUrl?: string;
  price: number | null;
  currency: string;
  skinTypes: string[];
  concerns: string[];
  featured?: boolean;
};

// Catalogue unique du site : uniquement les produits du catalogue Farmasi.
// Only the DB columns are kept (shades, codes, try-on data stay in farmasi-catalog.ts).
export const PRODUCTS: SeedProduct[] = FARMASI_CATALOG.map((product) => ({
  slug: product.slug,
  name: product.name,
  brand: product.brand,
  category: product.category,
  ingredientIds: product.ingredientIds,
  fullIngredients: product.fullIngredients,
  origin: product.origin,
  description: product.description,
  usageSteps: product.usageSteps,
  imageUrl: product.imageUrl,
  officialUrl: product.officialUrl,
  price: product.price,
  currency: product.currency,
  skinTypes: product.skinTypes,
  concerns: product.concerns,
  featured: product.featured ?? false,
}));
