'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { demoStore, CATALOG_UPDATED_EVENT } from '@/lib/demo/service';
import { Product } from '@/types';
import ProductCard from '@/components/ProductCard';
import { SacredCategoryIcon } from '@/components/SacredGeometry';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function CategoryClient({ slug }: { slug: string }) {
  const categories = demoStore.getCategories();
  const currentCategory = categories.find((c) => c.slug === slug);
  const [allProducts, setAllProducts] = useState<Product[]>(() => demoStore.getProducts());

  useEffect(() => {
    setAllProducts(demoStore.getProducts());
    const onCatalogUpdate = () => setAllProducts(demoStore.getProducts());
    window.addEventListener(CATALOG_UPDATED_EVENT, onCatalogUpdate);
    void demoStore.syncFromCloud().then((list) => setAllProducts(list));
    return () => {
      window.removeEventListener(CATALOG_UPDATED_EVENT, onCatalogUpdate);
    };
  }, []);

  if (!currentCategory) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-serif font-bold text-[#3E2415]">Categoria não encontrada</h1>
        <Link
          href="/produtos"
          className="mt-4 inline-block text-[#6B4226] font-semibold text-sm underline"
        >
          Voltar para todos os produtos
        </Link>
      </div>
    );
  }

  const subcategories = categories.filter((c) => c.parent_id === `parent-${slug}`);
  const validSlugs = new Set([slug, ...subcategories.map((s) => s.slug)]);

  const products = allProducts.filter((p) => {
    return p.category_slug && validSlugs.has(p.category_slug);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Category Header */}
      <div className="glass-card rounded-3xl p-6 sm:p-10 mb-8 border border-[#7C5236]/25 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#F3E9DC] border border-[#6B4226]/30 text-[#6B4226] flex items-center justify-center shrink-0">
              <SacredCategoryIcon slug={slug} className="w-9 h-9" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-[0.28em] text-[#6B4226] uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#7C5236]" /> Categoria da Loja
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-sacred-shimmer mt-1">
                {currentCategory.name}
              </h1>
              {currentCategory.description && (
                <p className="text-stone-600 text-sm mt-2 max-w-2xl">
                  {currentCategory.description}
                </p>
              )}
            </div>
          </div>

          <Link
            href="/produtos"
            className="text-xs font-bold uppercase tracking-wider text-[#6B4226] hover:underline flex items-center gap-1.5 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> Ver Todo o Catálogo
          </Link>
        </div>

        {subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-[#7C5236]/15">
            <span className="text-xs text-stone-500 self-center mr-2 font-medium">
              Subcategorias:
            </span>
            {subcategories.map((sub) => (
              <Link
                key={sub.slug}
                href={`/categoria/${sub.slug}`}
                className="text-xs px-3.5 py-1.5 rounded-full bg-[#FAF5EE] hover:bg-[#6B4226] hover:text-white text-[#3E2415] border border-[#7C5236]/25 transition font-semibold"
              >
                ✦ {sub.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-stone-600">
          <p className="text-sm">Nenhum produto cadastrado nesta categoria no momento.</p>
          <Link
            href="/produtos"
            className="mt-4 inline-block text-xs text-[#6B4226] font-semibold underline"
          >
            Ver outros artigos da loja
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
