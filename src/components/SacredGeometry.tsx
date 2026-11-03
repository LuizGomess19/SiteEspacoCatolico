'use client';

import React from 'react';

/**
 * Animated Sacred Rose Window in Sage Green, Warm Wood Brown & Pure White
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
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#5E856D" stopOpacity="0.5" />
            <stop offset="80%" stopColor="#8B5E3C" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2C1A10" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="200" cy="200" r="190" stroke="url(#storePaletteGrad)" strokeWidth="1.5" strokeDasharray="6 6" />
        <circle cx="200" cy="200" r="170" stroke="#5E856D" strokeOpacity="0.4" strokeWidth="1.2" />
        <circle cx="200" cy="200" r="140" stroke="#8B5E3C" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="4 5" />
        <circle cx="200" cy="200" r="106" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="64" stroke="#5E856D" strokeOpacity="0.5" strokeWidth="1.2" />

        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * 30;
          return (
            <g key={i} transform={`rotate(${angle} 200 200)`}>
              <path
                d="M200 28 C218 70, 218 115, 200 136 C182 115, 182 70, 200 28 Z"
                stroke="#FFFFFF"
                strokeOpacity="0.4"
                strokeWidth="1.2"
                fill="url(#storePaletteGrad)"
                fillOpacity="0.16"
              />
              <circle cx="200" cy="48" r="4.5" fill="#FFFFFF" fillOpacity="0.7" />
              <line x1="200" y1="136" x2="200" y2="190" stroke="#8B5E3C" strokeOpacity="0.35" strokeWidth="1" />
            </g>
          );
        })}

        <circle cx="200" cy="200" r="26" fill="url(#storePaletteGrad)" />
        <path
          d="M200 162 V238 M162 200 H238"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/**
 * Interactive Arched Wood & Green Sanctuary Niche with the Store's Iconic
 * Glowing White LED Cross & Holy Spirit Dove (Resplendor do Divino)
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
          stroke="#DCE7DF"
          strokeOpacity="0.35"
          strokeWidth="1.2"
          strokeDasharray="5 6"
        />
        <text fill="#E7F0EA" fontSize="9.5" fontWeight="700" letterSpacing="4">
          <textPath href="#storeCirclePath" startOffset="0%">
            ✦ REZE, ESPERE E NÃO TE PREOCUPES ✦ PAZ E BEM ✦ AD MAIOREM DEI GLORIAM ✦
          </textPath>
        </text>
      </svg>

      {/* Architectural Arched Wooden Niche with Illuminated White LED Cross (from Store Photo 2) */}
      <div className="relative z-10 w-52 h-68 sm:w-60 sm:h-76 store-arch-niche bg-gradient-to-b from-[#6B4423] via-[#4A2C1B] to-[#2C1A10] p-2.5 shadow-[0_25px_60px_rgba(0,0,0,0.55)] border-2 border-[#C8A98E]/60 animate-float-sacred">
        {/* Inner Sage Green & Wood Frame */}
        <div className="w-full h-full store-arch-niche bg-gradient-to-b from-[#3E2415] via-[#2C1A10] to-[#1E3A2B] border border-white/30 relative overflow-hidden flex flex-col items-center justify-between py-6 px-4">
          {/* Top LED Spotlight Glow */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-32 h-24 rounded-full bg-white/30 blur-xl pointer-events-none" />

          {/* Resplendor do Divino Espírito Santo (Wooden Sunburst + White Dove) */}
          <div className="relative z-10 flex flex-col items-center">
            <svg viewBox="0 0 80 50" className="w-16 h-10">
              {/* Wooden Sunburst Rays */}
              {Array.from({ length: 11 }).map((_, i) => {
                const angle = -75 + i * 15;
                return (
                  <line
                    key={i}
                    x1="40"
                    y1="28"
                    x2={40 + Math.sin((angle * Math.PI) / 180) * 26}
                    y2={28 - Math.cos((angle * Math.PI) / 180) * 22}
                    stroke="#C8A98E"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                );
              })}
              {/* White Dove of the Holy Spirit */}
              <path
                d="M24 24 C31 21, 36 25, 40 28 C44 25, 49 21, 56 24 C51 30, 45 33, 40 38 C35 33, 29 30, 24 24 Z"
                fill="#FFFFFF"
              />
              <circle cx="40" cy="22" r="2.5" fill="#FFFFFF" />
            </svg>
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#DCE7DF] font-semibold">
              Espírito Santo
            </span>
          </div>

          {/* Centerpiece: The Store's Iconic Glowing White LED Cross */}
          <div className="relative z-10 my-auto flex items-center justify-center">
            <div className="absolute w-28 h-28 rounded-full bg-white/20 blur-2xl animate-pulse" />
            <svg
              viewBox="0 0 120 150"
              className="w-28 h-34 animate-led-cross"
            >
              {/* Outer White Halo Glow */}
              <path
                d="M60 14 V136 M22 54 H98"
                stroke="#5E856D"
                strokeWidth="10"
                strokeLinecap="round"
                opacity="0.45"
              />
              {/* Pure White LED Bar Cross */}
              <path
                d="M60 14 V136 M22 54 H98"
                stroke="#FFFFFF"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              <circle cx="60" cy="54" r="4" fill="#FFFFFF" />
            </svg>
          </div>

          {/* Bottom Inscription */}
          <div className="relative z-10 text-center">
            <span className="text-[9px] font-serif tracking-[0.24em] text-white/90 uppercase font-bold block">
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
