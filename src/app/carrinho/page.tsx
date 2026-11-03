'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { Trash2, ArrowRight, ShieldCheck, Tag, ShoppingBag, ArrowLeft } from 'lucide-react';
import { SacredCategoryIcon } from '@/components/SacredGeometry';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, clearCart, subtotal } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  const applyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === 'BEMVINDO10') {
      const disc = subtotal * 0.1;
      setDiscount(disc);
      setCouponMessage('✦ Cupom BEMVINDO10 (10%) aplicado com sucesso!');
    } else if (code === 'SANTOANTONIO15' && subtotal >= 200) {
      const disc = subtotal * 0.15;
      setDiscount(disc);
      setCouponMessage('✦ Cupom SANTOANTONIO15 (15%) aplicado com sucesso!');
    } else {
      setDiscount(0);
      setCouponMessage('Cupom inválido ou valor mínimo não atingido.');
    }
  };

  const shipping = subtotal >= 299 ? 0 : 18.9;
  const total = Math.max(0, subtotal - discount) + (items.length > 0 ? shipping : 0);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-full glass-card border border-[#7C5236]/30 text-[#2F523A] mx-auto flex items-center justify-center mb-5 shadow-sm">
          <ShoppingBag className="w-9 h-9" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-sacred-shimmer mb-2">
          Seu Carrinho está vazio
        </h1>
        <p className="text-stone-600 text-sm mb-8 max-w-md mx-auto">
          Explore nosso catálogo de imagens sacras, terços, bíblias e presentes católicos.
        </p>
        <Link
          href="/produtos"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white px-8 py-4 rounded-full text-xs font-extrabold uppercase tracking-wider hover:scale-105 transition shadow-md"
        >
          Explorar Catálogo <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="border-b border-[#7C5236]/20 pb-4 mb-8 flex items-center justify-between">
        <h1 className="text-2xl sm:text-4xl font-serif font-bold text-sacred-shimmer">
          Meu Carrinho de Compras
        </h1>
        <Link
          href="/produtos"
          className="text-xs font-bold uppercase tracking-wider text-[#2F523A] hover:underline flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Continuar comprando
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl border border-[#7C5236]/25 divide-y divide-[#7C5236]/15">
            {items.map((item, idx) => (
              <div
                key={`${item.product.id}-${item.variant_name || idx}`}
                className="p-4 sm:p-6 flex gap-4 items-center"
              >
                <div className="w-20 h-20 bg-[#E7F0EA] rounded-xl border border-[#2F523A]/25 flex items-center justify-center shrink-0 text-[#2F523A]">
                  <SacredCategoryIcon slug={item.product.category_slug} className="w-8 h-8" />
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/produto/${item.product.slug}`}
                    className="font-serif font-bold text-sm sm:text-base text-[#3E2415] hover:text-[#2F523A] truncate block"
                  >
                    {item.product.name}
                  </Link>
                  {item.variant_name && (
                    <span className="text-xs text-stone-500 block mt-0.5">
                      Opção: <strong className="text-[#3E2415]">{item.variant_name}</strong>
                    </span>
                  )}
                  <span className="text-xs font-bold text-[#2F523A] mt-1 block">
                    R$ {item.price.toFixed(2).replace('.', ',')} un.
                  </span>
                </div>

                <div className="flex items-center border border-[#7C5236]/30 rounded-xl overflow-hidden bg-white">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variant_name)}
                    className="px-3 py-1.5 text-[#3E2415] hover:bg-[#FAF7F2] text-xs font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-3.5 py-1.5 text-xs font-bold text-[#2C1A10]">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variant_name)}
                    className="px-3 py-1.5 text-[#3E2415] hover:bg-[#FAF7F2] text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="text-right min-w-[90px]">
                  <span className="text-sm font-extrabold text-[#1E3A2B] block">
                    R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.product.id, item.variant_name)}
                    className="text-stone-400 hover:text-red-600 transition mt-1.5 cursor-pointer"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={clearCart}
              className="text-xs text-stone-500 hover:text-red-600 transition underline cursor-pointer"
            >
              Esvaziar Carrinho
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl border border-[#7C5236]/30 p-6 space-y-5">
            <h3 className="font-serif font-bold text-xl text-sacred-shimmer border-b border-[#7C5236]/15 pb-3">
              Resumo do Pedido
            </h3>

            <div>
              <label className="block text-xs font-bold text-[#3E2415] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#2F523A]" /> Cupom de Desconto
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: BEMVINDO10"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="bg-[#FAF7F2] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl px-3.5 py-2.5 text-xs flex-1 uppercase focus:outline-hidden focus:border-[#2F523A]"
                />
                <button
                  onClick={applyCoupon}
                  className="bg-[#2F523A] text-white px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase hover:bg-[#3E2415] transition cursor-pointer"
                >
                  Aplicar
                </button>
              </div>
              {couponMessage && (
                <span
                  className={`text-xs mt-2 block font-semibold ${
                    discount > 0 ? 'text-[#2F523A]' : 'text-red-600'
                  }`}
                >
                  {couponMessage}
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs text-stone-600 border-t border-[#7C5236]/15 pt-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-[#3E2415]">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-[#2F523A] font-bold">
                  <span>Desconto:</span>
                  <span>- R$ {discount.toFixed(2).replace('.', ',')}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Frete (PAC):</span>
                <span>
                  {shipping === 0 ? (
                    <strong className="text-[#2F523A] uppercase">Grátis</strong>
                  ) : (
                    `R$ ${shipping.toFixed(2).replace('.', ',')}`
                  )}
                </span>
              </div>

              <div className="flex justify-between text-lg font-extrabold text-[#1E3A2B] border-t border-[#7C5236]/20 pt-3">
                <span>Total:</span>
                <span>R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
              <span className="text-[11px] text-stone-500 block text-right">
                ou até 6x de R$ {(total / 6).toFixed(2).replace('.', ',')} sem juros
              </span>
            </div>

            <Link
              href="/checkout"
              className="w-full bg-gradient-to-r from-[#2F523A] to-[#3E2415] hover:brightness-110 text-white font-extrabold py-4 rounded-2xl transition text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md uppercase tracking-wider"
            >
              Finalizar Pedido <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="flex items-center justify-center gap-2 text-[11px] text-stone-500 pt-2">
              <ShieldCheck className="w-4 h-4 text-[#2F523A]" />
              <span>Compra 100% segura e protegida</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
