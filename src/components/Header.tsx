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
    'São Francisco de Assis',
    'Nossa Senhora Aparecida',
    'São Miguel Arcanjo',
    'São Bento',
    'Terço de Madeira',
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FAF4EB]/95 backdrop-blur-2xl border-b border-[#8B5E3C]/25 shadow-[0_6px_24px_rgba(107,66,38,0.06)]">
      {/* Top Bar in Predominant Warm Beige with Brown Accent Details */}
      <div className="bg-gradient-to-r from-[#EFE2D0] via-[#E6D3BC] to-[#EFE2D0] text-[#3E2415] text-[11px] py-2 px-4 border-b border-[#8B5E3C]/25">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="hidden md:flex items-center gap-5 text-[#5C3824]">
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#6B4226]" />
              Frete Grátis acima de <strong className="text-[#3E2415]">R$ 299</strong>
            </span>
            <span className="text-[#8B5E3C]/50">✦</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#6B4226]" />
              PIX Instantâneo & Compra 100% Segura
            </span>
          </div>

          <div className="mx-auto md:mx-0 flex items-center gap-2 tracking-[0.16em] uppercase font-bold text-[10px] sm:text-[11px] text-[#3E2415]">
            <Flame className="w-3.5 h-3.5 text-[#6B4226] animate-pulse" />
            <span>&ldquo;As ações falam mais alto que as palavras&rdquo; — Santo Antônio • Paz e Bem</span>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://www.instagram.com/espacocatolicosantoantonio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FAF4EB] border border-[#6B4226]/35 hover:bg-[#6B4226] hover:text-[#FAF4EB] text-xs font-semibold text-[#3E2415] transition"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B4226] animate-ping" />
              @espacocatolicosantoantonio
            </a>
          </div>
        </div>
      </div>

      {/* Main Sacred Beige Header with Brown Details */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="lg:hidden p-2 rounded-xl bg-[#EFE2D0] border border-[#6B4226]/30 text-[#3E2415] hover:bg-[#6B4226] hover:text-[#FAF4EB] transition"
          aria-label="Abrir Menu"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Brand / Logo: ONLY "Santo Antônio" */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="relative w-11 h-11 rounded-full bg-[#EFE2D0] border-2 border-[#6B4226] flex items-center justify-center shadow-sm group-hover:scale-105 transition">
            <div className="absolute inset-0.5 rounded-full border border-[#6B4226]/40 border-dashed animate-spin-slow" />
            <svg viewBox="0 0 32 32" className="w-5 h-5 text-[#6B4226]">
              <path d="M16 4 V28 M8 12 H24" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-serif font-bold tracking-wider text-[#3E2415] leading-none group-hover:text-[#6B4226] transition">
              SANTO ANTÔNIO
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
              className="w-full bg-[#EFE2D0]/70 text-[#3E2415] placeholder-[#7C5236]/80 border border-[#8B5E3C]/35 rounded-full py-2.5 pl-5 pr-12 text-xs sm:text-sm focus:outline-hidden focus:border-[#6B4226] focus:bg-[#FAF4EB] focus:shadow-[0_0_20px_rgba(107,66,38,0.12)] transition"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 rounded-full bg-[#6B4226] text-[#FAF4EB] hover:bg-[#3E2415] transition flex items-center justify-center cursor-pointer"
              title="Pesquisar"
            >
              <Search className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>

          {/* Instant Devotional Suggestions Dropdown */}
          {searchFocused && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-[#FAF4EB] rounded-2xl p-4 z-50 border border-[#6B4226]/30 shadow-xl">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B4226] flex items-center gap-1.5 mb-2.5">
                <Sparkles className="w-3.5 h-3.5" /> Buscas Devocionais Rápidas
              </span>
              <div className="flex flex-wrap gap-2">
                {quickDevotions.map((item) => (
                  <Link
                    key={item}
                    href={`/produtos?q=${encodeURIComponent(item)}`}
                    className="text-xs px-3 py-1.5 rounded-full bg-[#EFE2D0] hover:bg-[#6B4226] hover:text-[#FAF4EB] text-[#3E2415] border border-[#8B5E3C]/30 transition font-semibold"
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
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#EFE2D0] border border-[#6B4226]/30 text-xs font-semibold text-[#3E2415] hover:border-[#6B4226] transition"
              >
                <User className="w-4 h-4 text-[#6B4226]" />
                <span className="hidden sm:inline">{user.name}</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="bg-[#EFE2D0] border border-[#6B4226] text-[#3E2415] text-xs px-3.5 py-1.5 rounded-full font-bold hover:bg-[#6B4226] hover:text-[#FAF4EB] transition"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={logout}
                className="text-xs text-[#7C5236] hover:text-red-700 transition px-1 cursor-pointer"
                title="Sair"
              >
                Sair
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#EFE2D0] hover:bg-[#E6D3BC] border border-[#6B4226]/35 text-xs font-bold text-[#3E2415] transition"
            >
              <User className="w-4 h-4 text-[#6B4226]" />
              <span className="hidden sm:inline">Entrar</span>
            </Link>
          )}

          <Link
            href="/carrinho"
            className="relative flex items-center gap-2.5 bg-[#EFE2D0] hover:bg-[#E6D3BC] text-[#3E2415] border-2 border-[#6B4226] px-4 py-2 rounded-full font-bold text-xs shadow-xs hover:shadow-md hover:scale-105 transition"
          >
            <div className="relative">
              <ShoppingBag className="w-4 h-4 stroke-[2.3] text-[#6B4226]" />
              {totalItems > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-[#6B4226] text-[#FAF4EB] text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="hidden sm:inline uppercase tracking-wider">Carrinho</span>
          </Link>
        </div>
      </div>

      {/* Categories Ribbon in Predominant Beige with Brown Accent Details */}
      <nav className="hidden lg:block border-t border-[#8B5E3C]/20 bg-[#F2E5D5]">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#3E2415] overflow-x-auto py-2.5 gap-1">
          <Link
            href="/produtos"
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#EFE2D0] border border-[#6B4226] text-[#3E2415] hover:bg-[#6B4226] hover:text-[#FAF4EB] transition whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#6B4226] group-hover:text-[#FAF4EB]" /> Catálogo Completo
          </Link>
          {mainCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categoria/${cat.slug}`}
              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-[#FAF4EB] hover:text-[#6B4226] transition whitespace-nowrap"
            >
              <SacredCategoryIcon
                slug={cat.slug}
                className="w-4 h-4 text-[#6B4226] group-hover:scale-125 transition"
              />
              <span>{cat.name}</span>
            </Link>
          ))}
          <Link
            href="/produtos?ofertas=1"
            className="px-3 py-1 rounded-full bg-[#FAF4EB] border border-[#6B4226]/40 text-[#6B4226] font-extrabold hover:bg-[#6B4226] hover:text-[#FAF4EB] transition whitespace-nowrap"
          >
            ✦ Ofertas
          </Link>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-[#8B5E3C]/25 bg-[#FAF4EB] px-4 py-6 shadow-2xl">
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
              className="w-full bg-[#EFE2D0]/60 border border-[#6B4226]/35 text-[#3E2415] rounded-full py-2.5 pl-4 pr-10 text-sm"
            />
            <button type="submit" className="absolute right-3 top-2.5 text-[#6B4226]">
              <Search className="w-5 h-5" />
            </button>
          </form>

          <div className="flex flex-col gap-2 font-semibold text-sm text-[#3E2415]">
            <Link
              href="/produtos"
              onClick={() => setIsMenuOpen(false)}
              className="py-2.5 px-3.5 rounded-xl bg-[#EFE2D0] border border-[#6B4226] text-[#3E2415] font-bold flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#6B4226]" /> Ver Todos os Produtos
            </Link>
            {mainCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categoria/${cat.slug}`}
                onClick={() => setIsMenuOpen(false)}
                className="py-2 px-3 rounded-xl hover:bg-[#EFE2D0] hover:text-[#3E2415] transition flex items-center gap-2.5"
              >
                <SacredCategoryIcon slug={cat.slug} className="w-4 h-4 text-[#6B4226]" />
                {cat.name}
              </Link>
            ))}
            <div className="pt-4 mt-2 border-t border-[#8B5E3C]/20 flex flex-col gap-2">
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className="py-2 px-3 rounded-xl bg-[#EFE2D0] border border-[#6B4226] text-[#3E2415] font-bold"
                >
                  Painel Administrativo
                </Link>
              )}
              <Link
                href="/perfil"
                onClick={() => setIsMenuOpen(false)}
                className="py-2 px-3 text-[#3E2415] hover:text-[#6B4226]"
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
