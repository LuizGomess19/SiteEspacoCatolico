import { demoProducts, demoCategories, demoReviews, demoBanners, demoCoupons, demoSettings } from './data';
import { Product, Category } from '@/types';

// Convert demo products to application Product format
export const getDemoProducts = (): Product[] => {
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
    images: [], // Conforme instrução: criativos não estão prontos, campo em branco com placeholder
    is_featured: p.featured,
    is_new: p.isNew,
    is_demo: true,
    sales_count: p.sales || 0,
    rating_avg: 5,
    rating_count: 12,
  }));
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

// Client-side state simulation for cart and mock storage when offline
export const demoStore = {
  getProducts: () => getDemoProducts(),
  getProductBySlug: (slug: string) => getDemoProducts().find((p) => p.slug === slug),
  getCategories: () => getDemoCategories(),
  getMainCategories: () => demoCategories.filter((c) => !c.parent),
  getBanners: () => demoBanners,
  getReviews: (slug?: string) => demoReviews.filter((r) => !slug || r.product === slug),
  getSettings: () => demoSettings,
};

