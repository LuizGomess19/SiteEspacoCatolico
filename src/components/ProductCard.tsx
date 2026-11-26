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
      {/* Top Sacred Beige & Brown Detail Accent Strip */}
      <div className="h-1 w-full bg-gradient-to-r from-[#D5B895] via-[#6B4226] to-[#D5B895] opacity-80 group-hover:opacity-100 transition" />

      <div>
        {/* Product Image / Store's Signature Arched Niche Placeholder */}
        <Link
          href={`/produto/${product.slug}`}
          className="block relative aspect-square bg-gradient-to-b from-[#FAF4EB] via-[#F5ECE0] to-[#EFE2D0]/60 overflow-hidden p-4"
        >
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition duration-500 relative z-10"
            />
          ) : (
            /* Store Arched Niche Blank Creative Slot (Predominant Beige with Brown Detail) */
            <div className="relative z-10 w-full h-full store-arch-niche border-2 border-[#8B5E3C]/50 group-hover:border-[#6B4226] bg-gradient-to-b from-[#FAF4EB] via-[#F5ECE0] to-[#EFE2D0] flex flex-col items-center justify-center text-center p-5 shadow-inner transition duration-500">
              <div className="relative w-16 h-16 rounded-full bg-[#EFE2D0] border-2 border-[#6B4226] text-[#6B4226] flex items-center justify-center mb-3 shadow-xs group-hover:scale-110 transition duration-500">
                <div className="absolute inset-1 rounded-full border border-[#6B4226]/35 border-dashed animate-spin-slow" />
                <SacredCategoryIcon slug={product.category_slug} className="w-8 h-8" />
              </div>

              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#3E2415]">
                Espaço para Criativo
              </span>
              <span className="text-[10px] text-[#6B4226] font-medium mt-1 max-w-[160px] line-clamp-1">
                Foto será adicionada depois
              </span>
            </div>
          )}

          {/* Floating Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
            {hasDiscount && (
              <span className="bg-[#EFE2D0] text-[#3E2415] border border-[#6B4226] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                -{discountPercent}% Oferta
              </span>
            )}
            {product.is_new && (
              <span className="bg-[#FAF4EB] text-[#6B4226] border border-[#6B4226]/50 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                <Sparkles className="w-2.5 h-2.5" /> Novo
              </span>
            )}
          </div>

          {product.is_demo && (
            <span className="absolute top-3 right-3 z-20 bg-[#FAF4EB]/95 border border-[#8B5E3C]/35 text-[#5C3824] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Exemplo
            </span>
          )}
        </Link>

        {/* Product Info */}
        <div className="p-4 pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1 text-[#6B4226]">
              <Star className="w-3.5 h-3.5 fill-[#6B4226]" />
              <span className="text-xs font-bold text-[#3E2415]">{product.rating_avg || '5.0'}</span>
              <span className="text-[10px] text-[#7C5236]">({product.rating_count || 12})</span>
            </div>
            {product.material && (
              <span className="text-[10px] font-semibold text-[#6B4226] bg-[#EFE2D0] border border-[#8B5E3C]/30 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                {product.material}
              </span>
            )}
          </div>

          <Link href={`/produto/${product.slug}`}>
            <h3 className="font-serif font-bold text-[#3E2415] text-sm leading-snug line-clamp-2 group-hover:text-[#6B4226] transition min-h-[40px]">
              {product.name}
            </h3>
          </Link>
        </div>
      </div>

      {/* Pricing & Actions */}
      <div className="p-4 pt-0">
        <div className="mb-3 pt-2 border-t border-[#8B5E3C]/20">
          {hasDiscount && (
            <span className="text-xs text-[#8B5E3C] line-through mr-2">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
          )}
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold text-[#3E2415]">
              R$ {effectivePrice.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[10px] text-[#6B4226] font-bold bg-[#EFE2D0] border border-[#6B4226]/35 px-1.5 py-0.5 rounded">
              no PIX
            </span>
          </div>
          <span className="text-[11px] text-[#6B4226] block">
            ou 6x de R$ {(effectivePrice / 6).toFixed(2).replace('.', ',')}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Link
            href={`/produto/${product.slug}`}
            className="col-span-1 bg-[#FAF4EB] hover:bg-[#EFE2D0] border border-[#8B5E3C]/35 hover:border-[#6B4226] text-[#3E2415] flex items-center justify-center rounded-xl py-2.5 transition"
            title="Ver Detalhes"
          >
            <Eye className="w-4 h-4 text-[#6B4226]" />
          </Link>
          <button
            onClick={handleQuickAdd}
            className={`col-span-3 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              justAdded
                ? 'bg-[#6B4226] text-[#FAF4EB] shadow-md'
                : 'bg-[#EFE2D0] hover:bg-[#6B4226] text-[#3E2415] hover:text-[#FAF4EB] border-2 border-[#6B4226] shadow-xs'
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
