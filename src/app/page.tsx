'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Sparkles,
  ArrowRight,
  Heart,
  Star,
  CheckCircle2,
  Flame,
  Copy,
  Check,
  BookOpen,
  Compass,
} from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { demoStore } from '@/lib/demo/service';
import {
  AnimatedMonstrance,
  GothicRoseWindow,
  SacredCategoryIcon,
} from '@/components/SacredGeometry';

const HERO_SLIDES = [
  {
    eyebrow: 'Arquitetura da Fé ✦ Espaço Católico Santo Antônio',
    latin: '“REZE, ESPERE E NÃO TE PREOCUPES” — SÃO PADRE PIO',
    title: 'Fé, Acolhimento e Tradição em Cada Detalhe.',
    subtitle:
      'Inspirada na harmonia em madeira, verde e luz do nosso espaço físico: encontre imagens sacras, Bíblias, terços, cálices e presentes que abençoam sua família.',
    ctaText: 'Explorar o Catálogo',
    ctaLink: '/produtos',
    secondaryText: 'Imagens Sacras',
    secondaryLink: '/categoria/imagens-sacras',
  },
  {
    eyebrow: 'Oração Diária ✦ Terços, Rosários e Escapulários',
    latin: '“A EUCARISTIA É A MINHA AUTOESTRADA PARA O CÉU” — SÃO CARLO ACUTIS',
    title: 'Terços em Madeira Nobre, Cristal e Devoção Mariana.',
    subtitle:
      'Modelos tradicionais, de madeira natural, cristal facetado, São Bento e terços personalizados para rezar todos os dias.',
    ctaText: 'Ver Terços e Rosários',
    ctaLink: '/categoria/tercos-e-rosarios',
    secondaryText: 'Medalhas & Escapulários',
    secondaryLink: '/categoria/medalhas-e-escapularios',
  },
  {
    eyebrow: 'Vida Sacramental ✦ Batizado, Comunhão, Crisma e Casamento',
    latin: '“A VIDA É UM INSTANTE ENTRE DUAS ETERNIDADES!” — SANTA TERESINHA',
    title: 'Presentes Católicos que Eternizam os Sacramentos.',
    subtitle:
      'Kits devocionais, oratórios em madeira, Bíblias de presente e artigos litúrgicos escolhidos com carinho.',
    ctaText: 'Escolher Presente',
    ctaLink: '/categoria/presentes-catolicos',
    secondaryText: 'Velas e Oratórios',
    secondaryLink: '/categoria/velas-e-decoracao',
  },
];

const DEVOTIONS = [
  {
    id: 'santo-antonio',
    name: 'Santo Antônio & São Padre Pio',
    title: 'Devoção Franciscana, Oração e Confiança',
    feast: '13 de Junho • 23 de Setembro',
    latin: 'Pax et Bonum • Ora, Spera et Noli Conturbari',
    prayer:
      '“Reze, espere e não te preocupes. Deus é misericordioso e ouvirá sua oração.” — São Padre Pio de Pietrelcina',
    keywords: ['antonio', 'santo', 'oratorio', 'madeira'],
  },
  {
    id: 'aparecida',
    name: 'Nossa Senhora Aparecida',
    title: 'Rainha e Padroeira do Brasil',
    feast: '12 de Outubro',
    latin: 'Totus Tuus Mariae',
    prayer:
      '“Ó incomparável Senhora da Conceição Aparecida, Mãe de Deus, Rainha dos Anjos, Advogada dos pecadores, refúgio e consolação dos aflitos.”',
    keywords: ['aparecida', 'nossa-senhora', 'fatima', 'gracas', 'carmo', 'milagrosa'],
  },
  {
    id: 'sao-bento',
    name: 'São Bento de Núrsia',
    title: 'A Cruz Sagrada Seja a Minha Luz',
    feast: '11 de Julho',
    latin: 'Crux Sacra Sit Mihi Lux',
    prayer:
      '“A Cruz Sagrada seja a minha Luz, não seja o dragão o meu guia. Retira-te, satanás! Nunca me aconselhes coisas vãs.”',
    keywords: ['bento', 'cruz', 'crucifixo', 'medalha'],
  },
  {
    id: 'sao-miguel',
    name: 'São Miguel & Anjos',
    title: 'Defesa Espiritual e Guarda da Família',
    feast: '29 de Setembro',
    latin: 'Quis ut Deus? — Quem como Deus?',
    prayer:
      '“São Miguel Arcanjo, defendei-nos no combate, sede o nosso refúgio contra as maldades e ciladas do demônio.”',
    keywords: ['miguel', 'anjo', 'espiritualidade', 'vela'],
  },
];

export default function HomePage() {
  const products = demoStore.getProducts();
  const mainCategories = demoStore.getMainCategories();
  const allCategories = demoStore.getCategories();
  const reviews = demoStore.getReviews().slice(0, 6);

  const [activeSlide, setActiveSlide] = useState(0);
  const [activeTab, setActiveTab] = useState<'featured' | 'bestsellers' | 'new' | 'offers'>('featured');
  const [activeDevotion, setActiveDevotion] = useState(DEVOTIONS[0]);
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7500);
    return () => clearInterval(timer);
  }, []);

  const displayedProducts = React.useMemo(() => {
    if (activeTab === 'featured') return products.filter((p) => p.is_featured).slice(0, 8);
    if (activeTab === 'bestsellers')
      return [...products].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0)).slice(0, 8);
    if (activeTab === 'new') return products.filter((p) => p.is_new).slice(0, 8);
    return products.filter((p) => p.promo_price && p.promo_price < p.price).slice(0, 8);
  }, [products, activeTab]);

  const devotionProducts = React.useMemo(() => {
    const matches = products.filter((p) =>
      activeDevotion.keywords.some(
        (kw) => p.slug.includes(kw) || p.name.toLowerCase().includes(kw)
      )
    );
    return (matches.length >= 4 ? matches : products.slice(0, 4)).slice(0, 4);
  }, [products, activeDevotion]);

  const handleCopyCoupon = () => {
    navigator.clipboard?.writeText('BEMVINDO10');
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 2500);
  };

  const slide = HERO_SLIDES[activeSlide];

  return (
    <div className="relative">
      {/* =====================================================================
          1. HERO IN SAGE GREEN, WARM WOOD BROWN & WHITE LED LIGHT
      ===================================================================== */}
      <section className="relative min-h-[620px] bg-sanctuary-hero text-white overflow-hidden py-14 lg:py-20 border-b-4 border-[#5E856D] flex items-center">
        {/* Background Rotating Rose Window */}
        <div className="absolute -top-28 -left-28 opacity-20 pointer-events-none">
          <GothicRoseWindow className="w-[520px] h-[520px]" />
        </div>
        <div className="absolute -bottom-40 right-0 opacity-15 pointer-events-none">
          <GothicRoseWindow className="w-[460px] h-[460px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] bg-white/15 backdrop-blur-md text-white border border-white/30 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#E7F0EA] animate-spin-slow" />
              <span>{slide.eyebrow}</span>
            </div>

            <p className="text-xs font-serif tracking-[0.22em] text-[#E7F0EA] uppercase mb-3">
              {slide.latin}
            </p>

            <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-serif font-bold leading-[1.12] mb-6 text-light-shimmer">
              {slide.title}
            </h1>

            <p className="text-stone-200 text-sm sm:text-base lg:text-lg leading-relaxed mb-8 max-w-2xl mx-auto lg:mx-0">
              {slide.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Link
                href={slide.ctaLink}
                className="w-full sm:w-auto bg-white text-[#1E3A2B] hover:bg-[#E7F0EA] font-extrabold px-8 py-4 rounded-full transition transform hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.35)] flex items-center justify-center gap-2.5 text-xs sm:text-sm uppercase tracking-wider"
              >
                {slide.ctaText} <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
              <Link
                href={slide.secondaryLink}
                className="w-full sm:w-auto bg-[#3E2415]/80 hover:bg-[#3E2415] border border-[#C8A98E]/60 text-white font-semibold px-7 py-4 rounded-full transition text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2"
              >
                {slide.secondaryText}
              </Link>
            </div>

            {/* Slide Selector */}
            <div className="flex items-center justify-center lg:justify-start gap-3 mt-10">
              {HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    activeSlide === idx
                      ? 'w-12 bg-white shadow-[0_0_12px_#FFFFFF]'
                      : 'w-3 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
              <span className="text-[11px] text-stone-300 ml-2 font-mono">
                0{activeSlide + 1} / 0{HERO_SLIDES.length}
              </span>
            </div>
          </div>

          {/* Right Column: The Store's Arched Wooden Niche & Glowing White LED Cross */}
          <div className="lg:col-span-5 relative flex flex-col items-center justify-center">
            <AnimatedMonstrance />

            {/* Floating Store Quote Badges */}
            <div className="hidden sm:flex items-center gap-2.5 bg-white/95 text-[#2C1A10] px-4 py-2.5 rounded-2xl border border-[#7C5236]/30 shadow-xl absolute -top-2 left-0 animate-float-sacred">
              <Flame className="w-4 h-4 text-[#2F523A]" />
              <div className="text-left">
                <span className="text-[9px] uppercase tracking-widest text-[#2F523A] block font-extrabold">
                  São Carlo Acutis
                </span>
                <span className="text-xs font-serif text-[#3E2415] font-bold">
                  &ldquo;A Eucaristia é minha autoestrada&rdquo;
                </span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2.5 bg-[#2F523A] text-white px-4 py-2.5 rounded-2xl border border-white/30 shadow-xl absolute bottom-2 right-0 animate-float-sacred">
              <Sparkles className="w-4 h-4 text-[#E7F0EA]" />
              <div className="text-left">
                <span className="text-[9px] uppercase tracking-widest text-[#E7F0EA] block font-bold">
                  Santa Teresinha
                </span>
                <span className="text-xs font-serif text-white font-semibold">
                  &ldquo;Entre duas eternidades!&rdquo;
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. INFINITE SACRED MARQUEE (BROWN, GREEN & WHITE)
      ===================================================================== */}
      <div className="bg-[#3E2415] border-b border-[#7C5236]/40 py-3 overflow-hidden">
        <div className="animate-marquee flex items-center gap-8 text-xs font-serif tracking-[0.24em] uppercase text-white">
          {[1, 2].map((loop) => (
            <React.Fragment key={loop}>
              <span>✦ REZE, ESPERE E NÃO TE PREOCUPES (SÃO PADRE PIO)</span>
              <span className="text-[#C8A98E]">•</span>
              <span>✦ A EUCARISTIA É A MINHA AUTOESTRADA PARA O CÉU (SÃO CARLO ACUTIS)</span>
              <span className="text-[#C8A98E]">•</span>
              <span>✦ A VIDA É UM INSTANTE ENTRE DUAS ETERNIDADES (SANTA TERESINHA)</span>
              <span className="text-[#C8A98E]">•</span>
              <span>✦ ESPAÇO CATÓLICO SANTO ANTÔNIO</span>
              <span className="text-[#C8A98E]">•</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* =====================================================================
          3. THE 3 ARCHED QUOTE NICHES FROM THE PHYSICAL STORE FACADE & WALL
      ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 pt-14 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Arch 1: São Carlo Acutis (Sage Green Arch from Exterior Photo) */}
          <div className="store-arch-niche bg-gradient-to-b from-[#E7F0EA] to-white border-2 border-[#5E856D]/50 pt-10 pb-6 px-6 text-center shadow-sm hover:shadow-md transition">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#2F523A] block mb-2">
              ✦ Eucaristia & Juventude ✦
            </span>
            <p className="font-serif font-bold text-base sm:text-lg text-[#1E3A2B] italic leading-snug">
              &ldquo;A Eucaristia é a minha autoestrada para o Céu.&rdquo;
            </p>
            <span className="text-xs font-bold text-[#7C5236] mt-3 block">
              — São Carlo Acutis
            </span>
          </div>

          {/* Arch 2: São Padre Pio (Warm Wood Brown Arch from Main Wall Photo) */}
          <div className="store-arch-niche bg-gradient-to-b from-[#3E2415] to-[#2C1A10] border-2 border-[#C8A98E] pt-10 pb-6 px-6 text-center text-white shadow-md hover:shadow-lg transition">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#C8A98E] block mb-2">
              ✦ Confiança na Providência ✦
            </span>
            <p className="font-serif font-bold text-base sm:text-lg text-white italic leading-snug">
              &ldquo;Reze, espere e não te preocupes. Deus é misericordioso e ouvirá sua oração.&rdquo;
            </p>
            <span className="text-xs font-bold text-[#E7F0EA] mt-3 block">
              — São Padre Pio
            </span>
          </div>

          {/* Arch 3: Santa Teresinha (Sage Green Arch from Exterior Photo) */}
          <div className="store-arch-niche bg-gradient-to-b from-[#E7F0EA] to-white border-2 border-[#5E856D]/50 pt-10 pb-6 px-6 text-center shadow-sm hover:shadow-md transition">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#2F523A] block mb-2">
              ✦ Pequena Via de Amor ✦
            </span>
            <p className="font-serif font-bold text-base sm:text-lg text-[#1E3A2B] italic leading-snug">
              &ldquo;A vida é um instante entre duas eternidades!&rdquo;
            </p>
            <span className="text-xs font-bold text-[#7C5236] mt-3 block">
              — Santa Teresinha
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. TRUST PILLARS
      ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="glass-card rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 border border-[#7C5236]/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#E7F0EA] border border-[#2F523A]/25 text-[#2F523A] flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-[#3E2415] uppercase tracking-wider">
                Envio Seguro a Todo o Brasil
              </h4>
              <p className="text-xs text-stone-600 mt-0.5">
                Frete grátis acima de R$ 299 via PAC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#EFE7DD] border border-[#7C5236]/25 text-[#3E2415] flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-[#3E2415] uppercase tracking-wider">
                PIX Imediato ou 6x no Cartão
              </h4>
              <p className="text-xs text-stone-600 mt-0.5">
                Checkout seguro Mercado Pago
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#E7F0EA] border border-[#2F523A]/25 text-[#2F523A] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-[#3E2415] uppercase tracking-wider">
                Tradição & Curadoria Fiel
              </h4>
              <p className="text-xs text-stone-600 mt-0.5">
                Artigos sacros de alta qualidade
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#EFE7DD] border border-[#7C5236]/25 text-[#3E2415] flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-[#3E2415] uppercase tracking-wider">
                Acolhimento Fraterno
              </h4>
              <p className="text-xs text-stone-600 mt-0.5">
                Para o seu lar, paróquia ou presente
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. INTERACTIVE "CAPELA DIGITAL: ESCOLHA SUA DEVOÇÃO"
      ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold tracking-[0.28em] text-[#2F523A] uppercase flex items-center justify-center gap-2">
            <Flame className="w-4 h-4 text-[#7C5236]" /> Capela Interativa & Devoções
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-sacred-shimmer mt-2">
            Escolha seu Santo de Devoção
          </h2>
          <p className="text-stone-600 text-sm mt-2">
            Selecione uma devoção para ler sua oração e ver os artigos dedicados.
          </p>
        </div>

        {/* Devotion Selector Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {DEVOTIONS.map((dev) => {
            const isSelected = activeDevotion.id === dev.id;
            return (
              <button
                key={dev.id}
                onClick={() => setActiveDevotion(dev)}
                className={`px-5 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white shadow-lg scale-105'
                    : 'bg-white text-[#3E2415] border border-[#7C5236]/25 hover:border-[#2F523A] hover:bg-[#E7F0EA]'
                }`}
              >
                <span>✦</span> {dev.name}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-4 rounded-3xl p-8 flex flex-col justify-between bg-gradient-to-b from-[#1E3A2B] via-[#2F523A] to-[#3E2415] text-white shadow-xl border border-[#C8A98E]/40">
            <div>
              <div className="flex items-center justify-between text-xs text-[#E7F0EA] mb-4">
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/25 font-semibold">
                  Festa: {activeDevotion.feast}
                </span>
                <BookOpen className="w-5 h-5 text-[#C8A98E]" />
              </div>

              <p className="text-[11px] font-serif uppercase tracking-[0.22em] text-[#C8A98E] mb-1">
                {activeDevotion.latin}
              </p>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2">
                {activeDevotion.name}
              </h3>
              <p className="text-xs text-[#E7F0EA] font-medium mb-6">
                {activeDevotion.title}
              </p>

              <blockquote className="p-5 rounded-2xl bg-black/25 border border-white/20 text-sm font-serif italic text-white leading-relaxed">
                {activeDevotion.prayer}
              </blockquote>
            </div>

            <div className="mt-8 pt-4 border-t border-white/15 flex items-center justify-between">
              <span className="text-xs text-[#E7F0EA]">Artigos desta devoção</span>
              <Link
                href="/produtos"
                className="text-xs font-bold uppercase tracking-wider text-white hover:underline flex items-center gap-1"
              >
                Ver todos &rarr;
              </Link>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {devotionProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. DYNAMIC PRODUCT SHOWCASE WITH ANIMATED TABS
      ===================================================================== */}
      <section className="py-20 bg-gradient-to-b from-[#E7F0EA]/70 via-[#EFE7DD]/60 to-[#FAF7F2] border-y border-[#7C5236]/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div>
              <span className="text-xs font-bold tracking-[0.28em] text-[#2F523A] uppercase">
                Nossas Estantes Iluminadas
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-sacred-shimmer mt-1">
                Vitrine de Artigos Religiosos
              </h2>
            </div>

            {/* Interactive Tab Switcher */}
            <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-full border border-[#7C5236]/25 shadow-xs">
              {[
                { id: 'featured', label: '✦ Destaques' },
                { id: 'bestsellers', label: '🔥 Mais Vendidos' },
                { id: 'new', label: '✨ Lançamentos' },
                { id: 'offers', label: '🏷️ Em Oferta' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as typeof activeTab)}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white shadow-sm'
                      : 'text-[#3E2415] hover:bg-[#E7F0EA]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/produtos"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#3E2415] to-[#2F523A] text-white text-xs font-extrabold uppercase tracking-widest hover:scale-105 transition shadow-md"
            >
              Ver Todos os {products.length} Produtos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. THE 9 CANONICAL CATHOLIC CATEGORIES (ARCHED WOOD & SAGE CARDS)
      ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold tracking-[0.28em] text-[#2F523A] uppercase flex items-center justify-center gap-2">
            <Compass className="w-4 h-4 text-[#7C5236]" /> Organização por Categorias
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-sacred-shimmer mt-2">
            As 9 Categorias da Loja
          </h2>
          <p className="text-stone-600 text-sm mt-2">
            Acesse rapidamente cada seção de produtos e suas subcategorias.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mainCategories.map((cat, idx) => {
            const subcats = allCategories
              .filter((sc) => sc.parent_id === `parent-${cat.slug}`)
              .slice(0, 4);
            return (
              <div
                key={cat.slug}
                className="group glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#E7F0EA] border border-[#2F523A]/30 text-[#2F523A] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#2F523A] group-hover:text-white transition duration-300">
                      <SacredCategoryIcon slug={cat.slug} className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-mono font-bold text-[#7C5236]">0{idx + 1}</span>
                  </div>

                  <Link href={`/categoria/${cat.slug}`}>
                    <h3 className="text-xl font-serif font-bold text-[#3E2415] group-hover:text-[#2F523A] transition mb-2">
                      {cat.name}
                    </h3>
                  </Link>
                  <p className="text-xs text-stone-600 leading-relaxed mb-4">
                    {cat.description}
                  </p>

                  {subcats.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {subcats.map((sub) => (
                        <Link
                          key={sub.slug}
                          href={`/categoria/${sub.slug}`}
                          className="text-[10px] px-2.5 py-1 rounded-full bg-[#FAF7F2] hover:bg-[#2F523A] hover:text-white text-[#3E2415] border border-[#7C5236]/25 transition font-medium"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  href={`/categoria/${cat.slug}`}
                  className="pt-3 border-t border-[#7C5236]/15 text-xs font-extrabold uppercase tracking-wider text-[#2F523A] flex items-center justify-between group-hover:translate-x-1 transition"
                >
                  <span>Explorar Categoria</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          8. COUPON BANNER IN WOOD & SAGE GREEN
      ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 bg-gradient-to-r from-[#1E3A2B] via-[#2F523A] to-[#3E2415] text-white shadow-xl border-2 border-[#C8A98E]/50">
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-xl text-center lg:text-left">
              <span className="inline-block text-[11px] font-bold uppercase tracking-[0.25em] text-white bg-white/15 border border-white/30 px-3.5 py-1 rounded-full mb-3">
                ✦ Presente de Boas-Vindas ✦
              </span>
              <h3 className="text-2xl sm:text-4xl font-serif font-bold text-white mb-3">
                Ganhe <span className="text-[#E7F0EA] underline">10% de Desconto</span> na Primeira Compra
              </h3>
              <p className="text-stone-200 text-sm">
                Utilize o cupom especial no carrinho e receba seus artigos religiosos em casa com toda segurança.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={handleCopyCoupon}
                className="px-6 py-4 rounded-2xl bg-white text-[#1E3A2B] font-mono font-extrabold text-base flex items-center gap-3 hover:bg-[#E7F0EA] transition cursor-pointer shadow-lg"
              >
                <span>BEMVINDO10</span>
                {copiedCoupon ? (
                  <span className="text-xs font-sans bg-[#2F523A] text-white px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Copiado!
                  </span>
                ) : (
                  <span className="text-xs font-sans bg-[#E7F0EA] text-[#1E3A2B] px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </span>
                )}
              </button>

              <Link
                href="/produtos?ofertas=1"
                className="px-7 py-4 rounded-2xl bg-[#3E2415] hover:bg-[#2C1A10] border border-[#C8A98E] text-white font-extrabold text-xs uppercase tracking-wider transition"
              >
                Ver Ofertas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          9. CUSTOMER TESTIMONIALS
      ===================================================================== */}
      <section className="py-20 bg-[#EFE7DD]/70 border-t border-[#7C5236]/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-bold tracking-[0.28em] text-[#2F523A] uppercase">
              Avaliações Reais
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-sacred-shimmer mt-1">
              O que Dizem Nossos Clientes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((rev, idx) => (
              <div
                key={idx}
                className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1 text-[#7C5236] mb-3">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#7C5236]" />
                    ))}
                  </div>
                  <h4 className="text-base font-serif font-bold text-[#3E2415] mb-2">
                    &ldquo;{rev.title}&rdquo;
                  </h4>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-6">
                    {rev.comment}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-[#7C5236]/15">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2F523A]" />
                    <span className="text-xs font-bold text-[#3E2415]">{rev.author}</span>
                  </div>
                  <span className="text-[10px] text-[#2F523A] bg-[#E7F0EA] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                    Verificado
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
