'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { demoStore } from '@/lib/demo/service';
import { useCart } from '@/context/CartContext';
import {
  ShoppingBag,
  Star,
  Truck,
  Sparkles,
  Check,
} from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { SacredCategoryIcon, GothicRoseWindow } from '@/components/SacredGeometry';

export default function ProductClient({ slug }: { slug: string }) {

  const product = demoStore.getProductBySlug(slug);
  const { addToCart } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string>(
    product?.variants && product.variants.length > 0 ? product.variants[0].name : ''
  );
  const [cep, setCep] = useState('');
  const [freightCalculated, setFreightCalculated] = useState(false);
  const [addedMessage, setAddedMessage] = useState(false);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-serif font-bold text-[#3E2415]">Produto nÃ£o encontrado</h1>
        <Link href="/produtos" className="mt-4 inline-block text-[#2F523A] font-semibold text-sm underline">
          Voltar para todos os produtos
        </Link>
      </div>
    );
  }

  const effectivePrice = product.promo_price ?? product.price;
  const hasDiscount = product.promo_price && product.promo_price < product.price;

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedVariant || undefined);
    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 3000);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedVariant || undefined);
    window.location.href = '/carrinho';
  };

  const related = demoStore
    .getProducts()
    .filter((p) => p.category_slug === product.category_slug && p.id !== product.id)
    .slice(0, 4);

  const reviews = demoStore.getReviews(product.slug);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="text-xs text-stone-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-[#2F523A]">InÃ­cio</Link>
        <span className="text-[#7C5236]">âœ¦</span>
        <Link href="/produtos" className="hover:text-[#2F523A]">Produtos</Link>
        <span className="text-[#7C5236]">âœ¦</span>
        <span className="text-[#3E2415] font-semibold truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main product view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 glass-card p-6 sm:p-10 rounded-3xl border border-[#7C5236]/25 mb-14 relative overflow-hidden">
        {/* Left: Store Arched Niche Creative Slot */}
        <div className="relative">
          <div className="relative aspect-square bg-gradient-to-b from-[#E7F0EA] via-[#FAF7F2] to-white rounded-2xl overflow-hidden border border-[#7C5236]/25 flex flex-col items-center justify-center text-center p-8">
            <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
              <GothicRoseWindow className="w-80 h-80" />
            </div>

            {product.images && product.images.length > 0 ? (
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover relative z-10 rounded-xl" />
            ) : (
              <div className="relative z-10 w-full h-full store-arch-niche border-2 border-[#C8A98E] bg-white/85 flex flex-col items-center justify-center p-6 shadow-inner">
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#2F523A] to-[#3E2415] text-white flex items-center justify-center mb-4 shadow-lg animate-float-sacred">
                  <SacredCategoryIcon slug={product.category_slug} className="w-12 h-12" />
                </div>
                <span className="text-xs uppercase tracking-[0.22em] font-extrabold text-[#3E2415] mb-1">
                  EspaÃ§o Reservado para Criativo Real
                </span>
                <span className="text-xs text-stone-500 max-w-xs">
                  A foto oficial deste artigo religioso serÃ¡ adicionada no Painel Administrativo.
                </span>
              </div>
            )}

            {product.is_demo && (
              <span className="absolute top-4 left-4 z-20 bg-white border border-[#7C5236]/30 text-[#3E2415] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                âœ¦ Artigo Exemplo
              </span>
            )}
          </div>
        </div>

        {/* Right: Info & Actions */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[#7C5236] mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-[#7C5236]" />
              ))}
              <span className="text-xs font-bold text-[#3E2415] ml-1">5.0</span>
              <span className="text-xs text-stone-500">({reviews.length || 1} avaliaÃ§Ãµes)</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-serif font-bold text-sacred-shimmer leading-snug mb-3">
              {product.name}
            </h1>

            {product.short_description && (
              <p className="text-stone-600 text-sm mb-5 leading-relaxed">{product.short_description}</p>
            )}

            {/* Price section */}
            <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#7C5236]/25 mb-6">
              {hasDiscount && (
                <span className="text-sm text-stone-400 line-through block">
                  De: R$ {product.price.toFixed(2).replace('.', ',')}
                </span>
              )}
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#1E3A2B]">
                  R$ {effectivePrice.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs font-bold text-[#1E3A2B] bg-[#E7F0EA] border border-[#2F523A]/30 px-2.5 py-1 rounded-full">
                  âœ¦ PIX com aprovaÃ§Ã£o imediata
                </span>
              </div>
              <span className="text-xs text-[#7C5236] mt-1.5 block font-medium">
                ou em atÃ© 6x de R$ {(effectivePrice / 6).toFixed(2).replace('.', ',')} sem juros no cartÃ£o
              </span>
            </div>

            {/* Variant selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-[#3E2415] uppercase tracking-wider mb-2.5">
                  {product.variant_label || 'Selecione uma opÃ§Ã£o'}:
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => setSelectedVariant(v.name)}
                      className={`text-xs px-4 py-2.5 rounded-xl border font-bold transition cursor-pointer ${
                        selectedVariant === v.name
                          ? 'border-[#2F523A] bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white shadow-sm'
                          : 'border-[#7C5236]/30 bg-white text-[#3E2415] hover:border-[#2F523A]'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity and Actions */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-[#7C5236]/35 rounded-xl overflow-hidden bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2.5 text-[#3E2415] hover:bg-[#FAF7F2] text-sm font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-5 py-2.5 text-sm font-bold text-[#2C1A10]">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2.5 text-[#3E2415] hover:bg-[#FAF7F2] text-sm font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-[#2F523A] font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Em estoque ({product.stock} un.)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-white border-2 border-[#3E2415] text-[#3E2415] hover:bg-[#3E2415] hover:text-white font-extrabold py-4 px-5 rounded-2xl transition text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-5 h-5" /> Adicionar ao Carrinho
                </button>
                <button
                  onClick={handleBuyNow}
                  className="w-full bg-gradient-to-r from-[#2F523A] to-[#3E2415] hover:brightness-110 text-white font-extrabold py-4 px-5 rounded-2xl transition text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Sparkles className="w-5 h-5" /> Comprar Agora
                </button>
              </div>

              {addedMessage && (
                <div className="p-3.5 bg-[#E7F0EA] border border-[#2F523A]/40 text-[#1E3A2B] rounded-xl text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2F523A]" />
                  Produto adicionado ao seu carrinho com sucesso!
                </div>
              )}
            </div>

            {/* Freight Simulator */}
            <div className="border-t border-[#7C5236]/20 pt-6">
              <h4 className="text-xs font-bold text-[#3E2415] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#2F523A]" /> Simular Entrega e Prazo
              </h4>
              <div className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  placeholder="Digite seu CEP (8 dÃ­gitos)"
                  value={cep}
                  onChange={(e) => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="bg-[#FAF7F2] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl px-3.5 py-2.5 text-xs flex-1 focus:outline-hidden focus:border-[#2F523A]"
                />
                <button
                  onClick={() => setFreightCalculated(cep.length === 8)}
                  className="bg-[#2F523A] text-white px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider hover:bg-[#3E2415] transition cursor-pointer"
                >
                  Calcular
                </button>
              </div>

              {freightCalculated && (
                <div className="mt-3 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#7C5236]/25 text-xs space-y-2">
                  <div className="flex justify-between items-center text-stone-700">
                    <span>PAC (Correios) â€¢ 4 a 7 dias Ãºteis:</span>
                    <strong className="text-[#1E3A2B]">R$ 18,90</strong>
                  </div>
                  <div className="flex justify-between items-center text-stone-700">
                    <span>SEDEX (Correios) â€¢ 1 a 3 dias Ãºteis:</span>
                    <strong className="text-[#1E3A2B]">R$ 29,90</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description & Technical details */}
      <div className="glass-card p-6 sm:p-10 rounded-3xl border border-[#7C5236]/25 mb-14">
        <h3 className="text-xl font-serif font-bold text-sacred-shimmer border-b border-[#7C5236]/15 pb-3 mb-6">
          DescriÃ§Ã£o & Significado Devocional
        </h3>
        <div className="text-sm text-stone-700 leading-relaxed space-y-4 max-w-3xl">
          <p>{product.description}</p>
          {product.material && (
            <p>
              <strong className="text-[#3E2415]">Material:</strong> {product.material}
            </p>
          )}
          {product.weight_grams && (
            <p>
              <strong className="text-[#3E2415]">Peso estimado:</strong> {product.weight_grams}g
            </p>
          )}
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="mb-12">
          <div className="border-b border-[#7C5236]/20 pb-4 mb-6">
            <span className="text-xs font-bold tracking-[0.28em] text-[#2F523A] uppercase">
              SugestÃµes da Loja
            </span>
            <h2 className="text-2xl font-serif font-bold text-sacred-shimmer mt-1">
              Artigos Relacionados
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

