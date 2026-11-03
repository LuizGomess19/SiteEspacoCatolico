'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Search,
  Menu,
  X,
  User,
  ShieldCheck,
  Truck,
  Sparkles,
  Flame,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { demoCategories } from '@/lib/demo/data';
import { SacredCategoryIcon } from './SacredGeometry';

export default function Header() {
  const { totalItems } = useCart();
  const { user, isAdmin, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const mainCategories = demoCategories.filter((c) => !c.parent);

  const quickDevotions = [
    'Santo Antônio',
    'São Padre Pio',
    'Nossa Senhora Aparecida',
    'São Miguel Arcanjo',
    'São Bento',
    'Terço de Madeira',
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-2xl border-b border-[#7C5236]/20 shadow-[0_8px_30px_rgba(44,26,16,0.08)]">
      {/* Top Bar in Deep Forest Green & Franciscan Brown */}
      <div className="bg-gradient-to-r from-[#1E3A2B] via-[#3E2415] to-[#1E3A2B] text-white text-[11px] py-2 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="hidden md:flex items-center gap-5 text-[#E7F0EA]">
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#C8A98E]" />
              Frete Grátis acima de <strong className="text-white">R$ 299</strong>
            </span>
            <span className="text-white/30">✦</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C8A98E]" />
              PIX Instantâneo & Compra 100% Segura
            </span>
          </div>

          <div className="mx-auto md:mx-0 flex items-center gap-2 tracking-[0.16em] uppercase font-semibold text-[10px] sm:text-[11px] text-[#EFE7DD]">
            <Flame className="w-3.5 h-3.5 text-[#C8A98E] animate-pulse" />
            <span>&ldquo;Reze, espere e não te preocupes&rdquo; • Paz e Bem</span>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://www.instagram.com/espacocatolicosantoantonio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 border border-white/25 hover:bg-white hover:text-[#1E3A2B] text-xs text-white transition"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
              @espacocatolicosantoantonio
            </a>
          </div>
        </div>
      </div>

      {/* Main White, Wood Brown & Sage Green Header */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="lg:hidden p-2 rounded-xl bg-[#EFE7DD] border border-[#7C5236]/25 text-[#3E2415] hover:bg-[#3E2415] hover:text-white transition"
          aria-label="Abrir Menu"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Brand / Animated Sacred Arched Emblem */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-[#2F523A] to-[#3E2415] border-2 border-[#C8A98E] flex items-center justify-center shadow-md group-hover:scale-105 transition">
            <div className="absolute inset-0.5 rounded-full border border-white/40 border-dashed animate-spin-slow" />
            <svg viewBox="0 0 32 32" className="w-5 h-5 text-white">
              <path d="M16 4 V28 M8 12 H24" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-2xl font-serif font-bold tracking-wider text-[#3E2415] leading-none group-hover:text-[#2F523A] transition">
              ESPAÇO CATÓLICO
            </span>
            <span className="text-[10px] sm:text-xs tracking-[0.28em] text-[#2F523A] font-bold uppercase mt-1 flex items-center gap-1.5">
              <span className="text-[#7C5236]">✦</span> Santo Antônio <span className="text-[#7C5236]">✦</span>
            </span>
          </div>
        </Link>

        {/* Search Bar with Devotional Suggestions */}
        <div className="hidden md:flex flex-1 max-w-xl mx-6 relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                window.location.href = `/produtos?q=${encodeURIComponent(searchQuery)}`;
              }
            }}
            className="relative w-full"
          >
            <input
              type="text"
              placeholder="Buscar imagens sacras, terços de madeira, bíblias, crucifixos..."
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF7F2] text-[#2C1A10] placeholder-[#7C5236]/70 border border-[#7C5236]/30 rounded-full py-2.5 pl-5 pr-12 text-xs sm:text-sm focus:outline-hidden focus:border-[#2F523A] focus:bg-white focus:shadow-[0_0_20px_rgba(47,82,58,0.15)] transition"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 rounded-full bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white hover:brightness-110 transition flex items-center justify-center cursor-pointer"
              title="Pesquisar"
            >
              <Search className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>

          {/* Instant Devotional Suggestions Dropdown */}
          {searchFocused && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl p-4 z-50 border border-[#7C5236]/30 shadow-xl">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#2F523A] flex items-center gap-1.5 mb-2.5">
                <Sparkles className="w-3.5 h-3.5" /> Buscas Devocionais Rápidas
              </span>
              <div className="flex flex-wrap gap-2">
                {quickDevotions.map((item) => (
                  <Link
                    key={item}
                    href={`/produtos?q=${encodeURIComponent(item)}`}
                    className="text-xs px-3 py-1.5 rounded-full bg-[#E7F0EA] hover:bg-[#2F523A] hover:text-white text-[#1E3A2B] border border-[#2F523A]/20 transition font-semibold"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/perfil"
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#FAF7F2] border border-[#7C5236]/30 text-xs font-semibold text-[#3E2415] hover:border-[#2F523A] transition"
              >
                <User className="w-4 h-4 text-[#2F523A]" />
                <span className="hidden sm:inline">{user.name}</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="bg-[#3E2415] text-white text-xs px-3.5 py-1.5 rounded-full font-bold hover:bg-[#2F523A] transition"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={logout}
                className="text-xs text-stone-500 hover:text-red-700 transition px-1 cursor-pointer"
                title="Sair"
              >
                Sair
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FAF7F2] hover:bg-[#E7F0EA] border border-[#7C5236]/25 text-xs font-bold text-[#3E2415] hover:text-[#1E3A2B] transition"
            >
              <User className="w-4 h-4 text-[#2F523A]" />
              <span className="hidden sm:inline">Entrar</span>
            </Link>
          )}

          <Link
            href="/carrinho"
            className="relative flex items-center gap-2.5 bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white px-4 py-2.5 rounded-full font-bold text-xs shadow-md hover:shadow-lg hover:scale-105 transition"
          >
            <div className="relative">
              <ShoppingBag className="w-4 h-4 stroke-[2.3]" />
              {totalItems > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-white text-[#3E2415] border border-[#3E2415] text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="hidden sm:inline uppercase tracking-wider">Carrinho</span>
          </Link>
        </div>
      </div>

      {/* Categories Ribbon in Soft Sage Green & Wood Accents */}
      <nav className="hidden lg:block border-t border-[#7C5236]/15 bg-[#EFE7DD]/75">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#3E2415] overflow-x-auto py-2.5 gap-1">
          <Link
            href="/produtos"
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#2F523A] text-white hover:bg-[#3E2415] transition whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" /> Catálogo Completo
          </Link>
          {mainCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categoria/${cat.slug}`}
              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-white hover:text-[#2F523A] transition whitespace-nowrap"
            >
              <SacredCategoryIcon
                slug={cat.slug}
                className="w-4 h-4 text-[#2F523A] group-hover:scale-125 transition"
              />
              <span>{cat.name}</span>
            </Link>
          ))}
          <Link
            href="/produtos?ofertas=1"
            className="px-3 py-1 rounded-full bg-[#3E2415]/10 border border-[#3E2415]/25 text-[#3E2415] font-extrabold hover:bg-[#3E2415] hover:text-white transition whitespace-nowrap"
          >
            ✦ Ofertas
          </Link>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-[#7C5236]/20 bg-white px-4 py-6 shadow-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                window.location.href = `/produtos?q=${encodeURIComponent(searchQuery)}`;
              }
            }}
            className="relative mb-6"
          >
            <input
              type="text"
              placeholder="Buscar artigos religiosos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF7F2] border border-[#7C5236]/30 text-[#2C1A10] rounded-full py-2.5 pl-4 pr-10 text-sm"
            />
            <button type="submit" className="absolute right-3 top-2.5 text-[#2F523A]">
              <Search className="w-5 h-5" />
            </button>
          </form>

          <div className="flex flex-col gap-2 font-semibold text-sm text-[#3E2415]">
            <Link
              href="/produtos"
              onClick={() => setIsMenuOpen(false)}
              className="py-2.5 px-3.5 rounded-xl bg-[#2F523A] text-white font-bold flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Ver Todos os Produtos
            </Link>
            {mainCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categoria/${cat.slug}`}
                onClick={() => setIsMenuOpen(false)}
                className="py-2 px-3 rounded-xl hover:bg-[#E7F0EA] hover:text-[#1E3A2B] transition flex items-center gap-2.5"
              >
                <SacredCategoryIcon slug={cat.slug} className="w-4 h-4 text-[#2F523A]" />
                {cat.name}
              </Link>
            ))}
            <div className="pt-4 mt-2 border-t border-[#7C5236]/20 flex flex-col gap-2">
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className="py-2 px-3 rounded-xl bg-[#3E2415] text-white font-bold"
                >
                  Painel Administrativo
                </Link>
              )}
              <Link
                href="/perfil"
                onClick={() => setIsMenuOpen(false)}
                className="py-2 px-3 text-[#3E2415] hover:text-[#2F523A]"
              >
                Minha Conta e Pedidos
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
