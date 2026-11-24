import React from 'react';
import Link from 'next/link';
import { Phone, Mail, ShieldCheck, Heart, Sparkles, Flame } from 'lucide-react';
import { demoCategories } from '@/lib/demo/data';
import { GothicRoseWindow } from './SacredGeometry';

export default function Footer() {
  const mainCategories = demoCategories.filter((c) => !c.parent).slice(0, 6);

  return (
    <footer className="relative bg-gradient-to-b from-[#3E2415] via-[#2C1A10] to-[#1A0F09] text-[#F3E9DC] pt-20 pb-10 border-t-4 border-[#C8A98E] overflow-hidden">
      {/* Rotating Rose Window Watermark */}
      <div className="absolute -right-32 -bottom-32 opacity-15 pointer-events-none">
        <GothicRoseWindow className="w-[460px] h-[460px]" />
      </div>
      <div className="absolute -left-32 top-0 opacity-10 pointer-events-none">
        <GothicRoseWindow className="w-[360px] h-[360px]" />
      </div>

      {/* Top Padre Pio Quote Card */}
      <div className="max-w-7xl mx-auto px-4 mb-14 relative z-10">
        <div className="rounded-3xl p-6 sm:p-9 bg-[#F3E9DC]/10 backdrop-blur-xl border border-[#E6D2B5]/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F3E9DC] text-[#3E2415] flex items-center justify-center shrink-0 shadow-md">
              <Flame className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#E6D2B5] block mb-1">
                Inscrição da Nossa Loja Física • São Padre Pio
              </span>
              <h3 className="text-lg sm:text-2xl font-serif font-bold text-white">
                &ldquo;Reze, espere e não te preocupes. Deus é misericordioso e ouvirá sua oração.&rdquo;
              </h3>
            </div>
          </div>
          <a
            href="https://www.instagram.com/espacocatolicosantoantonio"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-full bg-[#F3E9DC] text-[#3E2415] font-extrabold text-xs uppercase tracking-wider hover:bg-[#E6D2B5] hover:scale-105 transition shadow-lg shrink-0"
          >
            Siga @espacocatolicosantoantonio
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#E6D2B5]/15 relative z-10">
        {/* About - Logo ONLY Santo Antônio */}
        <div>
          <span className="block text-2xl font-serif font-bold text-[#F3E9DC] tracking-wider mb-4">
            SANTO ANTÔNIO
          </span>
          <p className="text-xs sm:text-sm text-[#EADAC6] leading-relaxed mb-6">
            Inspirada nas cores do hábito franciscano de Santo Antônio e no bege sagrado das vestes de Jesus, levamos imagens sacras, bíblias, terços e presentes abençoados até o seu lar.
          </p>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3E9DC]/10 border border-[#E6D2B5]/25 text-xs text-[#F3E9DC]">
            <Sparkles className="w-3.5 h-3.5 text-[#C8A98E]" />
            <span>Paz e Bem em cada detalhe!</span>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h4 className="text-xs font-bold text-[#F3E9DC] tracking-[0.2em] uppercase mb-4 border-b border-[#E6D2B5]/15 pb-2">
            Categorias Principais
          </h4>
          <ul className="space-y-2.5 text-sm">
            {mainCategories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/categoria/${c.slug}`}
                  className="hover:text-white transition text-[#EADAC6] flex items-center gap-1.5"
                >
                  <span className="text-[#C8A98E] text-xs">✦</span> {c.name}
                </Link>
              </li>
            ))}
            <li className="pt-1">
              <Link
                href="/produtos"
                className="text-[#E6D2B5] hover:underline font-bold text-xs uppercase tracking-wider"
              >
                Explorar todas as 9 categorias &rarr;
              </Link>
            </li>
          </ul>
        </div>

        {/* Customer Service & Help */}
        <div>
          <h4 className="text-xs font-bold text-[#F3E9DC] tracking-[0.2em] uppercase mb-4 border-b border-[#E6D2B5]/15 pb-2">
            Atendimento & Segurança
          </h4>
          <ul className="space-y-3 text-sm text-[#EADAC6]">
            <li className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-[#C8A98E] shrink-0 mt-0.5" />
              <span className="break-all text-xs">contato@espacocatolicosantoantonio.com.br</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-[#C8A98E] shrink-0 mt-0.5" />
              <span className="text-xs">Atendimento Fraterno via WhatsApp</span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#C8A98E] shrink-0 mt-0.5" />
              <span className="text-xs">Checkout Criptografado & Proteção LGPD</span>
            </li>
          </ul>
        </div>

        {/* Payment Methods */}
        <div>
          <h4 className="text-xs font-bold text-[#F3E9DC] tracking-[0.2em] uppercase mb-4 border-b border-[#E6D2B5]/15 pb-2">
            Formas de Pagamento
          </h4>
          <p className="text-xs text-[#EADAC6] mb-4 leading-relaxed">
            PIX com confirmação imediata, Cartões de Crédito (até 6x sem juros), Débito e Boleto Híbrido via API Sicredi (748).
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="bg-[#F3E9DC] text-[#3E2415] px-3 py-1.5 rounded-lg">
              ✦ PIX Sicredi
            </span>
            <span className="bg-[#F3E9DC]/10 text-[#F3E9DC] px-3 py-1.5 rounded-lg border border-[#E6D2B5]/25">
              Crédito 6x / Débito
            </span>
            <span className="bg-[#F3E9DC]/10 text-[#F3E9DC] px-3 py-1.5 rounded-lg border border-[#E6D2B5]/25">
              Boleto Híbrido 748
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-[#C8A98E] gap-4 relative z-10">
        <p>&copy; {new Date().getFullYear()} Santo Antônio. Todos os direitos reservados.</p>
        <p className="flex items-center gap-1.5 text-[#EADAC6]">
          Feito com <Heart className="w-3.5 h-3.5 text-[#C8A98E] fill-[#C8A98E]" /> para evangelizar.
        </p>
      </div>
    </footer>
  );
}
