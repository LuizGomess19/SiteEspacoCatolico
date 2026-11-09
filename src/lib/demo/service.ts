import {
  demoProducts,
  demoCategories,
  demoReviews,
  demoBanners,
  demoCoupons,
  demoSettings,
} from './data';
import { Product, Category } from '@/types';

const CUSTOM_CATALOG_KEY = 'santo_antonio_custom_catalog_v1';
const REMOVED_IDS_KEY = 'santo_antonio_removed_product_ids_v1';

// Convert demo products to application Product format
export const getBaseDemoProducts = (): Product[] => {
  return demoProducts.map((p, idx) => ({
    id: `demo-${idx + 1}`,
    name: p.name,
    slug: p.slug,
    category_slug: p.category,
    short_description: p.short,
    description: p.description,
    price: p.price,
    promo_price: p.promo,
    stock: p.stock || (p.variants ? p.variants.reduce((acc, v) => acc + v.stock, 0) : 10),
    material: p.material,
    weight_grams: p.weight,
    variant_label: p.variantLabel,
    variants: p.variants?.map((v, vIdx) => ({
      id: `v-${idx}-${vIdx}`,
      name: v.name,
      price_override: v.price,
      stock: v.stock,
    })),
    images: [],
    is_featured: p.featured,
    is_new: p.isNew,
    is_demo: true,
    sales_count: p.sales || 0,
    rating_avg: 5,
    rating_count: 12,
  }));
};

function readCustomProducts(): Product[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_CATALOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readRemovedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(REMOVED_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export const getDemoProducts = (): Product[] => {
  const base = getBaseDemoProducts();
  if (typeof window === 'undefined') return base;
  const custom = readCustomProducts();
  const removed = readRemovedIds();
  return [...custom, ...base].filter((p) => !removed.has(p.id));
};

export const getDemoCategories = (): Category[] => {
  return demoCategories.map((c, idx) => ({
    id: `cat-${idx + 1}`,
    slug: c.slug,
    name: c.name,
    description: c.description,
    icon: c.icon,
    parent_id: c.parent ? `parent-${c.parent}` : null,
    sort_order: c.sort,
  }));
};

export const demoStore = {
  getProducts: () => getDemoProducts(),
  getProductBySlug: (slug: string) => getDemoProducts().find((p) => p.slug === slug),
  getCategories: () => getDemoCategories(),
  getMainCategories: () => demoCategories.filter((c) => !c.parent),
  getBanners: () => demoBanners,
  getReviews: (slug?: string) => demoReviews.filter((r) => !slug || r.product === slug),
  getSettings: () => demoSettings,
  getCoupons: () => demoCoupons,
  addCustomProduct: (product: Product): Product[] => {
    if (typeof window !== 'undefined') {
      const current = readCustomProducts();
      const updated = [product, ...current.filter((p) => p.id !== product.id)];
      localStorage.setItem(CUSTOM_CATALOG_KEY, JSON.stringify(updated));
    }
    return getDemoProducts();
  },
  deleteProduct: (id: string): Product[] => {
    if (typeof window !== 'undefined') {
      const current = readCustomProducts();
      localStorage.setItem(
        CUSTOM_CATALOG_KEY,
        JSON.stringify(current.filter((p) => p.id !== id))
      );
      const removed = readRemovedIds();
      removed.add(id);
      localStorage.setItem(REMOVED_IDS_KEY, JSON.stringify(Array.from(removed)));
    }
    return getDemoProducts();
  },
  removeDemoProducts: (): Product[] => {
    if (typeof window !== 'undefined') {
      const removed = readRemovedIds();
      for (const p of getBaseDemoProducts()) {
        removed.add(p.id);
      }
      localStorage.setItem(REMOVED_IDS_KEY, JSON.stringify(Array.from(removed)));
    }
    return getDemoProducts();
  },
  restoreDemoProducts: (): Product[] => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(REMOVED_IDS_KEY);
    }
    return getDemoProducts();
  },
};
