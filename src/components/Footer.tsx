import React from 'react';
import Link from 'next/link';
import { Phone, Mail, ShieldCheck, Heart, Sparkles, Flame } from 'lucide-react';
import { demoCategories } from '@/lib/demo/data';
import { GothicRoseWindow } from './SacredGeometry';

export default function Footer() {
  const mainCategories = demoCategories.filter((c) => !c.parent).slice(0, 6);

  return (
    <footer className="relative bg-gradient-to-b from-[#EFE2D0] via-[#E6D3BC] to-[#DFC8AB] text-[#3E2415] pt-20 pb-10 border-t-4 border-[#6B4226] overflow-hidden">
      {/* Rotating Rose Window Watermark */}
      <div className="absolute -right-32 -bottom-32 opacity-25 pointer-events-none">
        <GothicRoseWindow className="w-[460px] h-[460px]" />
      </div>
      <div className="absolute -left-32 top-0 opacity-20 pointer-events-none">
        <GothicRoseWindow className="w-[360px] h-[360px]" />
      </div>

      {/* Top Padre Pio Quote Card in Soft Beige with Brown Detail Border */}
      <div className="max-w-7xl mx-auto px-4 mb-14 relative z-10">
        <div className="rounded-3xl p-6 sm:p-9 bg-[#FAF4EB]/90 backdrop-blur-xl border-2 border-[#6B4226]/45 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#EFE2D0] border border-[#6B4226] text-[#6B4226] flex items-center justify-center shrink-0 shadow-xs">
              <Flame className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#6B4226] block mb-1">
                Inscrição da Nossa Loja Física • São Padre Pio
              </span>
              <h3 className="text-lg sm:text-2xl font-serif font-bold text-[#3E2415]">
                &ldquo;Reze, espere e não te preocupes. Deus é misericordioso e ouvirá sua oração.&rdquo;
              </h3>
            </div>
          </div>
          <a
            href="https://www.instagram.com/espacocatolicosantoantonio"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-full bg-[#6B4226] text-[#FAF4EB] font-extrabold text-xs uppercase tracking-wider hover:bg-[#3E2415] hover:scale-105 transition shadow-md shrink-0"
          >
            Siga @espacocatolicosantoantonio
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#6B4226]/25 relative z-10">
        {/* About - Logo ONLY Santo Antônio */}
        <div>
          <span className="block text-2xl font-serif font-bold text-[#3E2415] tracking-wider mb-4">
            SANTO ANTÔNIO
          </span>
          <p className="text-xs sm:text-sm text-[#5C3824] leading-relaxed mb-6">
            Inspirada no bege sagrado das vestes e nos detalhes em marrom franciscano de Santo Antônio, levamos imagens sacras, bíblias, terços e presentes abençoados até o seu lar.
          </p>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF4EB] border border-[#6B4226]/35 text-xs font-semibold text-[#3E2415]">
            <Sparkles className="w-3.5 h-3.5 text-[#6B4226]" />
            <span>Paz e Bem em cada detalhe!</span>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h4 className="text-xs font-extrabold text-[#3E2415] tracking-[0.2em] uppercase mb-4 border-b border-[#6B4226]/25 pb-2">
            Categorias Principais
          </h4>
          <ul className="space-y-2.5 text-sm">
            {mainCategories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/categoria/${c.slug}`}
                  className="hover:text-[#6B4226] transition text-[#5C3824] font-medium flex items-center gap-1.5"
                >
                  <span className="text-[#6B4226] text-xs">✦</span> {c.name}
                </Link>
              </li>
            ))}
            <li className="pt-1">
              <Link
                href="/produtos"
                className="text-[#6B4226] hover:text-[#3E2415] hover:underline font-extrabold text-xs uppercase tracking-wider"
              >
                Explorar todas as 9 categorias &rarr;
              </Link>
            </li>
          </ul>
        </div>

        {/* Customer Service & Help */}
        <div>
          <h4 className="text-xs font-extrabold text-[#3E2415] tracking-[0.2em] uppercase mb-4 border-b border-[#6B4226]/25 pb-2">
            Atendimento & Segurança
          </h4>
          <ul className="space-y-3 text-sm text-[#5C3824]">
            <li className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-[#6B4226] shrink-0 mt-0.5" />
              <span className="break-all text-xs font-medium">contato@espacocatolicosantoantonio.com.br</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-[#6B4226] shrink-0 mt-0.5" />
              <span className="text-xs font-medium">Atendimento Fraterno via WhatsApp</span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#6B4226] shrink-0 mt-0.5" />
              <span className="text-xs font-medium">Checkout Criptografado & Proteção LGPD</span>
            </li>
          </ul>
        </div>

        {/* Payment Methods */}
        <div>
          <h4 className="text-xs font-extrabold text-[#3E2415] tracking-[0.2em] uppercase mb-4 border-b border-[#6B4226]/25 pb-2">
            Formas de Pagamento
          </h4>
          <p className="text-xs text-[#5C3824] mb-4 leading-relaxed">
            PIX com confirmação imediata, Cartões de Crédito (até 6x sem juros), Débito e Boleto Híbrido via API Sicredi (748).
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="bg-[#FAF4EB] text-[#3E2415] border border-[#6B4226] px-3 py-1.5 rounded-lg">
              ✦ PIX Sicredi
            </span>
            <span className="bg-[#FAF4EB]/75 text-[#5C3824] px-3 py-1.5 rounded-lg border border-[#6B4226]/35">
              Crédito 6x / Débito
            </span>
            <span className="bg-[#FAF4EB]/75 text-[#5C3824] px-3 py-1.5 rounded-lg border border-[#6B4226]/35">
              Boleto Híbrido 748
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-[#5C3824] font-medium gap-4 relative z-10">
        <p>&copy; {new Date().getFullYear()} Santo Antônio. Todos os direitos reservados.</p>
        <p className="flex items-center gap-1.5 text-[#3E2415] font-semibold">
          Feito com <Heart className="w-3.5 h-3.5 text-[#6B4226] fill-[#6B4226]" /> para evangelizar.
        </p>
      </div>
    </footer>
  );
}
