'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Eye, Star, Check, Sparkles } from 'lucide-react';
import { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { SacredCategoryIcon } from './SacredGeometry';

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const effectivePrice = product.promo_price ?? product.price;
  const hasDiscount = Boolean(product.promo_price && product.promo_price < product.price);
  const discountPercent = hasDiscount
    ? Math.round(((product.price - (product.promo_price || product.price)) / product.price) * 100)
    : 0;

  const handleQuickAdd = () => {
    addToCart(product, 1, product.variants?.[0]?.name);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  };

  return (
    <div className="group relative glass-card glass-card-hover rounded-2xl overflow-hidden flex flex-col justify-between">
      {/* Top Wood & Sage Green Accent Strip */}
      <div className="h-1 w-full bg-gradient-to-r from-[#2F523A] via-[#8B5E3C] to-[#2F523A] opacity-75 group-hover:opacity-100 transition" />

      <div>
        {/* Product Image / Store's Signature Arched Niche Placeholder */}
        <Link
          href={`/produto/${product.slug}`}
          className="block relative aspect-square bg-gradient-to-b from-[#E7F0EA] via-[#F4EFEA] to-[#FFFFFF] overflow-hidden p-4"
        >
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition duration-500 relative z-10"
            />
          ) : (
            /* Store Arched Niche Blank Creative Slot (Wood, Sage Green & White) */
            <div className="relative z-10 w-full h-full store-arch-niche border-2 border-[#C8A98E]/60 group-hover:border-[#2F523A] bg-gradient-to-b from-[#FAF7F2] via-[#FFFFFF] to-[#E7F0EA]/60 flex flex-col items-center justify-center text-center p-5 shadow-inner transition duration-500">
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#2F523A] to-[#3E2415] text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition duration-500">
                <div className="absolute inset-1 rounded-full border border-white/35 border-dashed animate-spin-slow" />
                <SacredCategoryIcon slug={product.category_slug} className="w-8 h-8" />
              </div>

              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#3E2415]">
                Espaço para Criativo
              </span>
              <span className="text-[10px] text-[#5E856D] font-medium mt-1 max-w-[160px] line-clamp-1">
                Foto será adicionada depois
              </span>
            </div>
          )}

          {/* Floating Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
            {hasDiscount && (
              <span className="bg-[#2F523A] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                -{discountPercent}% Oferta
              </span>
            )}
            {product.is_new && (
              <span className="bg-[#3E2415] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <Sparkles className="w-2.5 h-2.5" /> Novo
              </span>
            )}
          </div>

          {product.is_demo && (
            <span className="absolute top-3 right-3 z-20 bg-white/90 border border-[#7C5236]/25 text-[#5C3824] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Exemplo
            </span>
          )}
        </Link>

        {/* Product Info */}
        <div className="p-4 pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1 text-[#7C5236]">
              <Star className="w-3.5 h-3.5 fill-[#7C5236]" />
              <span className="text-xs font-bold text-[#3E2415]">{product.rating_avg || '5.0'}</span>
              <span className="text-[10px] text-stone-500">({product.rating_count || 12})</span>
            </div>
            {product.material && (
              <span className="text-[10px] font-semibold text-[#2F523A] bg-[#E7F0EA] border border-[#2F523A]/20 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                {product.material}
              </span>
            )}
          </div>

          <Link href={`/produto/${product.slug}`}>
            <h3 className="font-serif font-bold text-[#2C1A10] text-sm leading-snug line-clamp-2 group-hover:text-[#2F523A] transition min-h-[40px]">
              {product.name}
            </h3>
          </Link>
        </div>
      </div>

      {/* Pricing & Actions */}
      <div className="p-4 pt-0">
        <div className="mb-3 pt-2 border-t border-[#7C5236]/15">
          {hasDiscount && (
            <span className="text-xs text-stone-400 line-through mr-2">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
          )}
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold text-[#1E3A2B]">
              R$ {effectivePrice.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[10px] text-[#2F523A] font-bold bg-[#E7F0EA] px-1.5 py-0.5 rounded">
              no PIX
            </span>
          </div>
          <span className="text-[11px] text-[#7C5236] block">
            ou 6x de R$ {(effectivePrice / 6).toFixed(2).replace('.', ',')}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Link
            href={`/produto/${product.slug}`}
            className="col-span-1 bg-[#FAF7F2] hover:bg-[#E7F0EA] border border-[#7C5236]/25 hover:border-[#2F523A] text-[#3E2415] flex items-center justify-center rounded-xl py-2.5 transition"
            title="Ver Detalhes"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <button
            onClick={handleQuickAdd}
            className={`col-span-3 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              justAdded
                ? 'bg-[#2F523A] text-white shadow-md'
                : 'bg-gradient-to-r from-[#3E2415] to-[#2F523A] hover:from-[#2F523A] hover:to-[#3E2415] text-white shadow-sm'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" /> Adicionado!
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4 stroke-[2.2]" /> Comprar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
