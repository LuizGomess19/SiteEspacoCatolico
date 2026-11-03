'use client';

import React, { useState, useMemo, useEffect } from 'react';
import ProductCard from '@/components/ProductCard';
import { demoStore } from '@/lib/demo/service';
import { Search, Filter, SlidersHorizontal, Sparkles } from 'lucide-react';
import { SacredCategoryIcon } from '@/components/SacredGeometry';

export default function ProductsPage() {
  const allProducts = demoStore.getProducts();
  const mainCategories = demoStore.getMainCategories();
  const allCategories = demoStore.getCategories();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [priceRange, setPriceRange] = useState<number>(500);
  const [onlyOffers, setOnlyOffers] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const ofertas = params.get('ofertas');
    if (q) setSearch(q);
    if (ofertas === '1') setOnlyOffers(true);
  }, []);

  const categoryGroupMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const parent of mainCategories) {
      const children = allCategories
        .filter((c) => c.parent_id === `parent-${parent.slug}`)
        .map((c) => c.slug);
      map[parent.slug] = [parent.slug, ...children];
    }
    return map;
  }, [mainCategories, allCategories]);

  const filteredProducts = useMemo(() => {
    return allProducts
      .filter((p) => {
        const allowedSlugs = categoryGroupMap[selectedCategory] || [selectedCategory];
        const matchesCategory =
          selectedCategory === 'all' ||
          (p.category_slug && allowedSlugs.includes(p.category_slug));
        const matchesSearch =
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description?.toLowerCase().includes(search.toLowerCase()) ||
          p.category_slug?.toLowerCase().includes(search.toLowerCase());
        const effectivePrice = p.promo_price ?? p.price;
        const matchesPrice = effectivePrice <= priceRange;
        const matchesOffers = !onlyOffers || (p.promo_price && p.promo_price < p.price);
        return matchesCategory && matchesSearch && matchesPrice && matchesOffers;
      })
      .sort((a, b) => {
        const priceA = a.promo_price ?? a.price;
        const priceB = b.promo_price ?? b.price;
        if (sortBy === 'price-asc') return priceA - priceB;
        if (sortBy === 'price-desc') return priceB - priceA;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'sales') return (b.sales_count || 0) - (a.sales_count || 0);
        return 0;
      });
  }, [allProducts, selectedCategory, search, sortBy, priceRange, onlyOffers, categoryGroupMap]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Page Title */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border border-[#7C5236]/25">
        <div>
          <span className="text-xs font-bold tracking-[0.28em] text-[#2F523A] uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#7C5236]" /> Catálogo Completo
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-sacred-shimmer mt-1">
            Artigos Religiosos Católicos
          </h1>
        </div>
        <span className="text-xs text-[#3E2415] bg-[#E7F0EA] px-3.5 py-1.5 rounded-full border border-[#2F523A]/25 font-semibold">
          Exibindo <strong className="text-[#1E3A2B]">{filteredProducts.length}</strong> produtos
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="glass-card p-5 rounded-2xl border border-[#7C5236]/25">
            <h3 className="font-serif font-bold text-sm text-[#3E2415] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#2F523A]" /> Categorias
            </h3>
            <div className="flex flex-col gap-1.5 text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`text-left py-2 px-3 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white shadow-sm'
                    : 'text-[#3E2415] hover:bg-[#E7F0EA]'
                }`}
              >
                <span>✦</span> Todas as Categorias
              </button>
              {mainCategories.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => setSelectedCategory(c.slug)}
                  className={`text-left py-2 px-3 rounded-xl font-semibold transition flex items-center gap-2 cursor-pointer ${
                    selectedCategory === c.slug
                      ? 'bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white shadow-sm'
                      : 'text-[#3E2415] hover:bg-[#E7F0EA]'
                  }`}
                >
                  <SacredCategoryIcon slug={c.slug} className="w-4 h-4 shrink-0" />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-[#7C5236]/25 space-y-4">
            <h3 className="font-serif font-bold text-sm text-[#3E2415] uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#2F523A]" /> Preço Máximo
            </h3>
            <input
              type="range"
              min="20"
              max="500"
              step="10"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="w-full accent-[#2F523A] cursor-pointer"
            />
            <div className="flex justify-between items-center text-xs font-medium text-stone-600">
              <span>Até R$ 20</span>
              <span className="font-bold text-[#1E3A2B]">R$ {priceRange},00</span>
            </div>

            <label className="flex items-center gap-2 pt-3 border-t border-[#7C5236]/15 text-xs text-[#3E2415] font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={onlyOffers}
                onChange={(e) => setOnlyOffers(e.target.checked)}
                className="accent-[#2F523A] rounded"
              />
              <span>Apenas Ofertas Promocionais</span>
            </label>
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card p-4 rounded-2xl border border-[#7C5236]/25 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Filtrar por nome, santo ou material..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl py-2.5 pl-3.5 pr-9 text-xs focus:outline-hidden focus:border-[#2F523A]"
              />
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-[#2F523A]" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-stone-600 font-medium">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#FAF7F2] border border-[#7C5236]/30 rounded-xl py-2 px-3 text-xs font-bold text-[#3E2415] focus:outline-hidden"
              >
                <option value="featured">Destaques</option>
                <option value="sales">Mais Vendidos</option>
                <option value="price-asc">Menor Preço</option>
                <option value="price-desc">Maior Preço</option>
                <option value="name">Nome (A-Z)</option>
              </select>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center text-stone-600">
              <p className="text-sm font-medium">Nenhum artigo encontrado com os filtros selecionados.</p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearch('');
                  setPriceRange(500);
                  setOnlyOffers(false);
                }}
                className="mt-4 text-xs text-[#2F523A] font-bold underline cursor-pointer"
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
