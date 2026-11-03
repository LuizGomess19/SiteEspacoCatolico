'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { User, Package, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-serif font-bold text-sacred-shimmer mb-2">
          Você precisa estar conectado
        </h2>
        <p className="text-stone-600 text-xs mb-6">
          Entre com seu e-mail para acessar seu perfil e histórico de pedidos.
        </p>
        <Link
          href="/login"
          className="bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white px-8 py-3.5 rounded-full text-xs font-extrabold uppercase tracking-wider hover:scale-105 transition inline-block shadow-md"
        >
          Fazer Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="border-b border-[#7C5236]/20 pb-4 mb-8 flex justify-between items-center">
        <div>
          <span className="text-xs font-bold tracking-[0.28em] text-[#2F523A] uppercase">
            Minha Conta
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-sacred-shimmer mt-1">
            Painel do Cliente
          </h1>
        </div>
        <button
          onClick={logout}
          className="text-xs text-stone-500 hover:text-red-600 transition flex items-center gap-1.5 cursor-pointer font-semibold"
        >
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass-card p-6 rounded-2xl border border-[#7C5236]/25 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#E7F0EA] rounded-full flex items-center justify-center text-[#2F523A] border border-[#2F523A]/30">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#3E2415]">{user.name}</h3>
              <span className="text-xs text-stone-500">{user.email}</span>
            </div>
          </div>

          <div className="border-t border-[#7C5236]/15 pt-3 text-xs text-stone-600 space-y-2">
            <div className="flex justify-between">
              <span>Nível de Acesso:</span>
              <strong className="capitalize text-[#3E2415]">{user.role}</strong>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="text-[#2F523A] font-bold">✦ Conta Ativa</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 glass-card p-6 rounded-2xl border border-[#7C5236]/25 space-y-4">
          <h3 className="font-serif font-bold text-lg text-[#3E2415] flex items-center gap-2 border-b border-[#7C5236]/15 pb-3">
            <Package className="w-5 h-5 text-[#2F523A]" /> Meus Pedidos Recentes
          </h3>

          <div className="border border-[#7C5236]/20 rounded-2xl p-5 bg-[#FAF7F2] space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#3E2415] font-mono text-sm">#SA-849201</span>
              <span className="bg-[#E7F0EA] border border-[#2F523A]/30 text-[#1E3A2B] font-bold px-3 py-0.5 rounded-full">
                Entregue
              </span>
            </div>
            <p className="text-stone-600">
              Imagem de Santo Antônio com Menino Jesus 20 cm, Terço Tradicional de Contas Pretas
            </p>
            <div className="flex justify-between items-center pt-3 text-[11px] text-stone-500 border-t border-[#7C5236]/15">
              <span>
                Rastreio: <strong className="text-[#3E2415]">BR98471923BR</strong>
              </span>
              <strong className="text-[#1E3A2B] text-sm">Total: R$ 174,80</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
