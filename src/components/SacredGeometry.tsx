'use client';

import React from 'react';

/**
 * Animated Sacred Rose Window in Predominant Sacred Beige with Brown Details
 */
export function GothicRoseWindow({ className = 'w-96 h-96' }: { className?: string }) {
  return (
    <div className={`relative select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full animate-spin-slow"
      >
        <defs>
          <radialGradient id="storePaletteGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FAF4EB" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#E6D3BC" stopOpacity="0.65" />
            <stop offset="80%" stopColor="#8B5E3C" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#6B4226" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="200" cy="200" r="190" stroke="url(#storePaletteGrad)" strokeWidth="1.5" strokeDasharray="6 6" />
        <circle cx="200" cy="200" r="170" stroke="#8B5E3C" strokeOpacity="0.45" strokeWidth="1.2" />
        <circle cx="200" cy="200" r="140" stroke="#6B4226" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="4 5" />
        <circle cx="200" cy="200" r="106" stroke="#8B5E3C" strokeOpacity="0.5" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="64" stroke="#6B4226" strokeOpacity="0.55" strokeWidth="1.2" />

        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * 30;
          return (
            <g key={i} transform={`rotate(${angle} 200 200)`}>
              <path
                d="M200 28 C218 70, 218 115, 200 136 C182 115, 182 70, 200 28 Z"
                stroke="#6B4226"
                strokeOpacity="0.42"
                strokeWidth="1.2"
                fill="url(#storePaletteGrad)"
                fillOpacity="0.25"
              />
              <circle cx="200" cy="48" r="4.5" fill="#8B5E3C" fillOpacity="0.65" />
              <line x1="200" y1="136" x2="200" y2="190" stroke="#6B4226" strokeOpacity="0.38" strokeWidth="1" />
            </g>
          );
        })}

        <circle cx="200" cy="200" r="26" fill="url(#storePaletteGrad)" />
        <path
          d="M200 162 V238 M162 200 H238"
          stroke="#6B4226"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/**
 * Interactive Arched Sacred Beige Sanctuary Niche with Brown Wood Accent Frame
 */
export function AnimatedMonstrance() {
  return (
    <div className="relative w-76 h-88 sm:w-88 sm:h-96 mx-auto flex items-center justify-center select-none">
      {/* Outer Rotating Sacred Ring */}
      <svg
        viewBox="0 0 340 340"
        className="absolute inset-0 w-full h-full animate-spin-slow pointer-events-none"
      >
        <defs>
          <path
            id="storeCirclePath"
            d="M 170, 170 m -146, 0 a 146,146 0 1,1 292,0 a 146,146 0 1,1 -292,0"
          />
        </defs>
        <circle
          cx="170"
          cy="170"
          r="158"
          fill="none"
          stroke="#8B5E3C"
          strokeOpacity="0.45"
          strokeWidth="1.2"
          strokeDasharray="5 6"
        />
        <text fill="#5C3824" fontSize="9.5" fontWeight="700" letterSpacing="4">
          <textPath href="#storeCirclePath" startOffset="0%">
            ✦ AS AÇÕES FALAM MAIS ALTO QUE AS PALAVRAS ✦ PAZ E BEM ✦ SANTO ANTÔNIO ✦
          </textPath>
        </text>
      </svg>

      {/* Architectural Arched Beige Niche with Fine Brown Detail Border */}
      <div className="relative z-10 w-52 h-68 sm:w-60 sm:h-76 store-arch-niche bg-gradient-to-b from-[#E6D3BC] via-[#EFE2D0] to-[#D5B895] p-2.5 shadow-[0_20px_50px_rgba(107,66,38,0.18)] border-2 border-[#6B4226] animate-float-sacred">
        {/* Inner Predominant Sacred Beige Frame */}
        <div className="w-full h-full store-arch-niche bg-gradient-to-b from-[#FAF4EB] via-[#F5ECE0] to-[#EFE2D0] border border-[#8B5E3C]/50 relative overflow-hidden flex flex-col items-center justify-between py-6 px-4">
          {/* Top Warm Glow */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-32 h-24 rounded-full bg-[#FFFFFF]/80 blur-xl pointer-events-none" />

          {/* Resplendor do Divino Espírito Santo */}
          <div className="relative z-10 flex flex-col items-center">
            <svg viewBox="0 0 80 50" className="w-16 h-10">
              {Array.from({ length: 11 }).map((_, i) => {
                const angle = -75 + i * 15;
                return (
                  <line
                    key={i}
                    x1="40"
                    y1="28"
                    x2={40 + Math.sin((angle * Math.PI) / 180) * 26}
                    y2={28 - Math.cos((angle * Math.PI) / 180) * 22}
                    stroke="#8B5E3C"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                );
              })}
              <path
                d="M24 24 C31 21, 36 25, 40 28 C44 25, 49 21, 56 24 C51 30, 45 33, 40 38 C35 33, 29 30, 24 24 Z"
                fill="#6B4226"
              />
              <circle cx="40" cy="22" r="2.5" fill="#6B4226" />
            </svg>
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#6B4226] font-extrabold">
              Espírito Santo
            </span>
          </div>

          {/* Centerpiece: Brown Wood & Warm Beige Illuminated Cross */}
          <div className="relative z-10 my-auto flex items-center justify-center">
            <div className="absolute w-28 h-28 rounded-full bg-[#D5B895]/45 blur-2xl animate-pulse" />
            <svg
              viewBox="0 0 120 150"
              className="w-28 h-34 animate-led-cross"
            >
              <path
                d="M60 14 V136 M22 54 H98"
                stroke="#C8A98E"
                strokeWidth="11"
                strokeLinecap="round"
                opacity="0.6"
              />
              <path
                d="M60 14 V136 M22 54 H98"
                stroke="#6B4226"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              <circle cx="60" cy="54" r="4.5" fill="#FAF4EB" stroke="#6B4226" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Bottom Inscription */}
          <div className="relative z-10 text-center">
            <span className="text-[9px] font-serif tracking-[0.24em] text-[#3E2415] uppercase font-bold block">
              I H S • PAX ET BONUM
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sacred Catholic Vector Icon per Category
 */
export function SacredCategoryIcon({
  slug,
  className = 'w-8 h-8',
}: {
  slug?: string;
  className?: string;
}) {
  const s = slug || '';

  if (s.includes('terco') || s.includes('rosario')) {
    return (
      <svg viewBox="0 0 64 64" fill="none" className={className}>
        <circle cx="32" cy="24" r="15" stroke="currentColor" strokeWidth="2.2" strokeDasharray="3 5" />
        <path d="M32 39 V56 M26 48 H38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="32" cy="39" r="3" fill="currentColor" />
      </svg>
    );
  }

  if (s.includes('biblia') || s.includes('livro') || s.includes('catecismo')) {
    return (
      <svg viewBox="0 0 64 64" fill="none" className={className}>
        <path
          d="M14 14 C22 12, 30 14, 32 18 C34 14, 42 12, 50 14 V48 C42 46, 34 48, 32 52 C30 48, 22 46, 14 48 Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M32 18 V52" stroke="currentColor" strokeWidth="2" />
        <path d="M22 25 V37 M18 29 H26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (s.includes('liturgic') || s.includes('calice') || s.includes('ambula') || s.includes('galheta') || s.includes('vestimenta') || s.includes('celebrac')) {
    return (
      <svg viewBox="0 0 64 64" fill="none" className={className}>
        <circle cx="32" cy="16" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M32 12 V20 M28 16 H36" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M20 27 H44 C43 38, 37 42, 32 42 C27 42, 21 38, 20 27 Z" stroke="currentColor" strokeWidth="2.2" />
        <path d="M32 42 V53 M22 53 H42" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (s.includes('vela') || s.includes('castical') || s.includes('oratorio') || s.includes('quadro') || s.includes('decoracao')) {
    return (
      <svg viewBox="0 0 64 64" fill="none" className={className}>
        <path d="M32 10 C36 17, 37 22, 32 25 C27 22, 28 17, 32 10 Z" fill="currentColor" />
        <circle cx="32" cy="19" r="11" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="2 3" />
        <rect x="25" y="28" width="14" height="26" rx="2" stroke="currentColor" strokeWidth="2.2" />
        <path d="M20 54 H44" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (s.includes('medalha') || s.includes('escapulario') || s.includes('pingente')) {
    return (
      <svg viewBox="0 0 64 64" fill="none" className={className}>
        <ellipse cx="32" cy="34" rx="14" ry="18" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="32" cy="13" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M32 24 V44 M25 31 H39" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (s.includes('presente') || s.includes('kit') || s.includes('batizado') || s.includes('comunhao') || s.includes('crisma') || s.includes('casamento')) {
    return (
      <svg viewBox="0 0 64 64" fill="none" className={className}>
        <circle cx="32" cy="32" r="20" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="4 4" />
        <path
          d="M16 28 C23 26, 28 30, 32 34 C36 30, 41 26, 48 28 C43 35, 38 38, 32 44 C26 38, 21 35, 16 28 Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M32 14 V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <circle cx="32" cy="26" r="14" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.6" strokeDasharray="3 3" />
      <path d="M32 10 V54 M16 26 H48" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
