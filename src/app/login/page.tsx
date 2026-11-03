'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [asAdmin, setAsAdmin] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    login(email, asAdmin ? 'admin' : 'customer');
    if (asAdmin) {
      router.push('/admin');
    } else {
      router.push('/perfil');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="glass-card p-8 sm:p-10 rounded-3xl border border-[#7C5236]/30 text-center">
        <div className="w-16 h-16 bg-[#E7F0EA] rounded-full text-[#2F523A] flex items-center justify-center mx-auto mb-5 border border-[#2F523A]/30 shadow-sm">
          <Lock className="w-7 h-7" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-sacred-shimmer mb-1">
          Acesse sua Conta
        </h1>
        <p className="text-xs text-stone-500 mb-6">
          Entre para acompanhar seus pedidos e gerenciar seu perfil
        </p>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-[#3E2415] mb-1.5">E-mail</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl py-3 pl-3.5 pr-9 text-xs focus:outline-hidden focus:border-[#2F523A]"
              />
              <Mail className="w-4 h-4 text-[#2F523A] absolute right-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3E2415] mb-1.5">Senha</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#FAF7F2] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl py-3 px-3.5 text-xs focus:outline-hidden focus:border-[#2F523A]"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-stone-600">
              <input
                type="checkbox"
                checked={asAdmin}
                onChange={(e) => setAsAdmin(e.target.checked)}
                className="rounded accent-[#2F523A]"
              />
              <span>Entrar como Administrador</span>
            </label>
            <a href="#" className="text-[#2F523A] hover:underline font-semibold">
              Esqueceu a senha?
            </a>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#2F523A] to-[#3E2415] hover:brightness-110 text-white font-extrabold py-3.5 rounded-xl transition text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md mt-2 cursor-pointer"
          >
            Entrar <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
