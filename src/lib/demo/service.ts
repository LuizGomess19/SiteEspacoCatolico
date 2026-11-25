import {
  demoProducts,
  demoCategories,
  demoReviews,
  demoBanners,
  demoCoupons,
  demoSettings,
} from './data';
import { Product, Category } from '@/types';
import { cloudGetJson, cloudSetJson } from '@/lib/cloud/sync';

const CUSTOM_CATALOG_KEY = 'santo_antonio_custom_catalog_v1';
const REMOVED_IDS_KEY = 'santo_antonio_removed_product_ids_v1';
const CLOUD_CATALOG_META_KEY = 'sa_catalog_meta_v1';
const CLOUD_ITEM_PREFIX = 'sa_prod_';

export const CATALOG_UPDATED_EVENT = 'santo_antonio_catalog_updated';

export interface CloudCatalogMeta {
  customIds: string[];
  removedIds: string[];
  updatedAt: string;
}

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

function writeCustomProducts(products: Product[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_CATALOG_KEY, JSON.stringify(products));
  } catch (e) {
    console.warn('localStorage writeCustomProducts warning:', e);
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

function writeRemovedIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REMOVED_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.warn('localStorage writeRemovedIds warning:', e);
  }
}

function notifyCatalogUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CATALOG_UPDATED_EVENT));
  }
}

export const getDemoProducts = (): Product[] => {
  const base = getBaseDemoProducts();
  if (typeof window === 'undefined') return base;
  const custom = readCustomProducts();
  const removed = readRemovedIds();

  // Custom products can either be brand-new products OR edited overrides of base demo products
  const customMap = new Map<string, Product>();
  for (const cp of custom) {
    customMap.set(cp.id, cp);
  }

  const mergedBase = base
    .filter((p) => !removed.has(p.id))
    .map((p) => (customMap.has(p.id) ? customMap.get(p.id)! : p));

  const purelyNewCustom = custom.filter(
    (p) => !removed.has(p.id) && !base.some((b) => b.id === p.id)
  );

  return [...purelyNewCustom, ...mergedBase];
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

async function syncMetaToCloud(custom: Product[], removed: Set<string>): Promise<boolean> {
  const meta: CloudCatalogMeta = {
    customIds: custom.map((p) => p.id),
    removedIds: Array.from(removed),
    updatedAt: new Date().toISOString(),
  };
  return await cloudSetJson(CLOUD_CATALOG_META_KEY, meta);
}

async function syncProductItemToCloud(product: Product): Promise<boolean> {
  const safeId = product.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  return await cloudSetJson(`${CLOUD_ITEM_PREFIX}${safeId}`, product);
}

let cloudSyncInFlight: Promise<Product[]> | null = null;

export const demoStore = {
  getProducts: () => getDemoProducts(),
  getProductBySlug: (slug: string) => getDemoProducts().find((p) => p.slug === slug),
  getCategories: () => getDemoCategories(),
  getMainCategories: () => demoCategories.filter((c) => !c.parent),
  getBanners: () => demoBanners,
  getReviews: (slug?: string) => demoReviews.filter((r) => !slug || r.product === slug),
  getSettings: () => demoSettings,
  getCoupons: () => demoCoupons,

  /**
   * Pulls the shared store catalog from Firebase Cloud Firestore so any product
   * added, edited, or deleted by the Admin appears on the client's phone and PC.
   */
  syncFromCloud: async (): Promise<Product[]> => {
    if (typeof window === 'undefined') return getBaseDemoProducts();
    if (cloudSyncInFlight) return cloudSyncInFlight;

    cloudSyncInFlight = (async () => {
      try {
        const meta = await cloudGetJson<CloudCatalogMeta>(CLOUD_CATALOG_META_KEY);
        if (!meta) return getDemoProducts();

        const localCustom = readCustomProducts();
        const localMap = new Map<string, Product>(localCustom.map((p) => [p.id, p]));

        const fetchedProducts = await Promise.all(
          (meta.customIds || []).map(async (id) => {
            const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
            const remoteProd = await cloudGetJson<Product>(`${CLOUD_ITEM_PREFIX}${safeId}`);
            return remoteProd || localMap.get(id) || null;
          })
        );

        const validCustom = fetchedProducts.filter((p): p is Product => Boolean(p));
        writeCustomProducts(validCustom);
        writeRemovedIds(new Set(meta.removedIds || []));
        notifyCatalogUpdated();
      } catch (e) {
        console.warn('Catalog cloud sync warning:', e);
      } finally {
        cloudSyncInFlight = null;
      }
      return getDemoProducts();
    })();

    return cloudSyncInFlight;
  },

  /**
   * Adds a new product or updates an existing product, persisting locally and in Cloud Firestore.
   */
  saveProduct: async (product: Product): Promise<Product[]> => {
    if (typeof window !== 'undefined') {
      const current = readCustomProducts();
      const existingIdx = current.findIndex((p) => p.id === product.id);
      let updated: Product[];
      if (existingIdx >= 0) {
        updated = [...current];
        updated[existingIdx] = product;
      } else {
        updated = [product, ...current];
      }
      writeCustomProducts(updated);

      const removed = readRemovedIds();
      if (removed.has(product.id)) {
        removed.delete(product.id);
        writeRemovedIds(removed);
      }

      notifyCatalogUpdated();
      await Promise.all([
        syncProductItemToCloud(product),
        syncMetaToCloud(updated, removed),
      ]);
    }
    return getDemoProducts();
  },

  /**
   * Synchronous wrapper for backwards compatibility, also triggers background cloud sync.
   */
  addCustomProduct: (product: Product): Product[] => {
    if (typeof window !== 'undefined') {
      const current = readCustomProducts();
      const updated = [product, ...current.filter((p) => p.id !== product.id)];
      writeCustomProducts(updated);
      const removed = readRemovedIds();
      notifyCatalogUpdated();
      void Promise.all([
        syncProductItemToCloud(product),
        syncMetaToCloud(updated, removed),
      ]);
    }
    return getDemoProducts();
  },

  /**
   * Bulk imports multiple products at once and syncs them to Cloud Firestore.
   */
  bulkAddProducts: async (newProducts: Product[]): Promise<Product[]> => {
    if (typeof window !== 'undefined' && newProducts.length > 0) {
      const current = readCustomProducts();
      const newIds = new Set(newProducts.map((p) => p.id));
      const updated = [...newProducts, ...current.filter((p) => !newIds.has(p.id))];
      writeCustomProducts(updated);
      const removed = readRemovedIds();
      notifyCatalogUpdated();

      await Promise.all([
        ...newProducts.map((p) => syncProductItemToCloud(p)),
        syncMetaToCloud(updated, removed),
      ]);
    }
    return getDemoProducts();
  },

  deleteProduct: (id: string): Product[] => {
    if (typeof window !== 'undefined') {
      const current = readCustomProducts().filter((p) => p.id !== id);
      writeCustomProducts(current);
      const removed = readRemovedIds();
      removed.add(id);
      writeRemovedIds(removed);
      notifyCatalogUpdated();
      void syncMetaToCloud(current, removed);
    }
    return getDemoProducts();
  },

  removeDemoProducts: (): Product[] => {
    if (typeof window !== 'undefined') {
      const removed = readRemovedIds();
      for (const p of getBaseDemoProducts()) {
        removed.add(p.id);
      }
      writeRemovedIds(removed);
      const current = readCustomProducts();
      notifyCatalogUpdated();
      void syncMetaToCloud(current, removed);
    }
    return getDemoProducts();
  },

  restoreDemoProducts: (): Product[] => {
    if (typeof window !== 'undefined') {
      const emptyRemoved = new Set<string>();
      writeRemovedIds(emptyRemoved);
      const current = readCustomProducts();
      notifyCatalogUpdated();
      void syncMetaToCloud(current, emptyRemoved);
    }
    return getDemoProducts();
  },
};
