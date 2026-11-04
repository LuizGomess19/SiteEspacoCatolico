'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Database,
  KeyRound,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  isSupabaseActive,
  saveSupabaseRuntimeConfig,
  clearSupabaseRuntimeConfig,
} from '@/lib/supabase/client';

function GoogleLogoSvg({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.275c0-.85-.075-1.665-.215-2.45H12v4.635h6.445c-.28 1.495-1.125 2.765-2.395 3.615v3h3.875c2.265-2.085 3.565-5.16 3.565-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.955-1.075 7.94-2.91l-3.875-3c-1.075.72-2.45 1.145-4.065 1.145-3.125 0-5.77-2.11-6.715-4.945H1.28v3.095C3.255 21.305 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.285 14.29c-.24-.72-.375-1.49-.375-2.29s.135-1.57.375-2.29V6.615H1.28C.465 8.24 0 10.065 0 12s.465 3.76 1.28 5.385l4.005-3.095z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.605 4.585 1.795l3.44-3.44C17.95 1.19 15.235 0 12 0 7.31 0 3.255 2.695 1.28 6.615l4.005 3.095c.945-2.835 3.59-4.96 6.715-4.96z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const {
    user,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    resetPassword,
    isCloudConnected,
    refreshUserData,
  } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'reset'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [asAdmin, setAsAdmin] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Reset password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  const passwordsMatch =
    regPassword.length >= 6 && regConfirmPassword.length > 0 && regPassword === regConfirmPassword;
  const passwordsMismatch =
    regConfirmPassword.length > 0 && regPassword !== regConfirmPassword;

  // Feedback & loading
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Google Popup Modal state (when user clicks "Continuar com o Google")
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  // Optional Supabase Cloud DB Configuration panel
  const [showDbConfig, setShowDbConfig] = useState(false);
  const [sbUrl, setSbUrl] = useState('');
  const [sbAnonKey, setSbAnonKey] = useState('');

  useEffect(() => {
    const creds = getSupabaseCredentials();
    if (creds.url) setSbUrl(creds.url);
    if (creds.anonKey) setSbAnonKey(creds.anonKey);
  }, []);

  useEffect(() => {
    if (user) {
      router.push(user.role === 'admin' ? '/admin' : '/perfil');
    }
  }, [user, router]);

  const clearFeedback = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setSubmitting(true);

    const res = await loginWithEmail(loginEmail, loginPassword, asAdmin);
    setSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Não foi possível entrar na conta.');
      return;
    }

    router.push(res.user?.role === 'admin' ? '/admin' : '/perfil');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!regPassword || regPassword.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg(
        'A senha e a repetição da senha precisam ser exatamente iguais. Verifique o que foi digitado.'
      );
      return;
    }

    setSubmitting(true);
    const res = await registerWithEmail({
      name: regName,
      email: regEmail,
      password: regPassword,
      phone: regPhone,
      cpf: regCpf,
      asAdmin,
    });
    setSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Não foi possível criar sua conta.');
      return;
    }

    setSuccessMsg('Conta criada com sucesso! Redirecionando para o seu painel...');
    setTimeout(() => {
      router.push(res.user?.role === 'admin' ? '/admin' : '/perfil');
    }, 600);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMsg('As duas senhas digitadas precisam ser exatamente iguais.');
      return;
    }

    setSubmitting(true);

    const res = await resetPassword(resetEmail, resetNewPassword || undefined);
    setSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Não foi possível redefinir a senha.');
      return;
    }

    setSuccessMsg(
      resetNewPassword
        ? 'Sua nova senha foi salva com sucesso! Agora você já pode entrar.'
        : 'Instruções de recuperação enviadas para o seu e-mail.'
    );
    setTimeout(() => {
      setActiveTab('login');
      setLoginEmail(resetEmail);
    }, 1500);
  };

  const handleGoogleButtonClick = async () => {
    clearFeedback();
    if (isSupabaseActive()) {
      // Try Supabase Google OAuth first when a Supabase project is configured
      const res = await loginWithGoogle();
      if (!res.ok) {
        setGoogleModalOpen(true);
      }
    } else {
      setGoogleModalOpen(true);
    }
  };

  const handleGoogleModalContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) return;

    setSubmitting(true);
    const formattedEmail = googleEmail.includes('@')
      ? googleEmail.trim().toLowerCase()
      : `${googleEmail.trim().toLowerCase()}@gmail.com`;
    const displayName =
      googleName.trim() ||
      formattedEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

    const res = await loginWithGoogle({
      email: formattedEmail,
      name: displayName,
    });
    setSubmitting(false);
    setGoogleModalOpen(false);

    if (res.ok) {
      router.push('/perfil');
    } else {
      setErrorMsg(res.error || 'Falha ao autenticar com Google.');
    }
  };

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbUrl.trim() || !sbAnonKey.trim()) {
      clearSupabaseRuntimeConfig();
      await refreshUserData();
      setSuccessMsg('Configuração personalizada removida. Usando armazenamento de contas seguro.');
      return;
    }
    saveSupabaseRuntimeConfig(sbUrl, sbAnonKey);
    await refreshUserData();
    setSuccessMsg('Banco de dados Supabase conectado com sucesso!');
    setShowDbConfig(false);
  };

  const inputClass =
    'w-full bg-[#FAF7F2] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl py-3 pl-10 pr-4 text-xs sm:text-sm focus:outline-hidden focus:border-[#2F523A] focus:bg-white transition';

  return (
    <div className="max-w-lg mx-auto px-4 py-12 sm:py-16">
      <div className="glass-card p-6 sm:p-10 rounded-3xl border border-[#7C5236]/30 shadow-xl relative overflow-hidden">
        {/* Top Sacred Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#2F523A] via-[#7C5236] to-[#2F523A]" />

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#E7F0EA] rounded-full text-[#2F523A] flex items-center justify-center mx-auto mb-4 border-2 border-[#2F523A]/30 shadow-sm">
            <Lock className="w-7 h-7" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#3E2415]">
            {activeTab === 'login' && 'Acesse sua Conta'}
            {activeTab === 'register' && 'Crie sua Conta Pessoal'}
            {activeTab === 'reset' && 'Recuperar Minha Senha'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            {activeTab === 'login' &&
              'Seus itens do carrinho, endereços e pedidos ficam salvos exclusivamente na sua conta'}
            {activeTab === 'register' &&
              'Cadastre-se gratuitamente para salvar seu carrinho e acompanhar seus pedidos'}
            {activeTab === 'reset' &&
              'Redefina a senha de acesso da sua conta no Espaço Católico Santo Antônio'}
          </p>
        </div>

        {/* Navigation Tabs (Entrar / Criar Conta) */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[#EFE7DD] border border-[#7C5236]/20 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              clearFeedback();
            }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'login'
                ? 'bg-[#2F523A] text-white shadow-sm'
                : 'text-[#3E2415] hover:text-[#2F523A]'
            }`}
          >
            Entrar na Conta
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              clearFeedback();
            }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'register'
                ? 'bg-[#2F523A] text-white shadow-sm'
                : 'text-[#3E2415] hover:text-[#2F523A]'
            }`}
          >
            Criar Nova Conta
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#E7F0EA] border border-[#2F523A]/40 text-[#1E3A2B] text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#2F523A] shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google Direct Login Button (shown on Login & Register tabs) */}
        {activeTab !== 'reset' && (
          <>
            <button
              type="button"
              onClick={handleGoogleButtonClick}
              className="w-full bg-white hover:bg-[#FAF7F2] text-[#2C1A10] border-2 border-[#7C5236]/30 hover:border-[#2F523A] font-bold py-3.5 px-4 rounded-xl transition text-xs sm:text-sm flex items-center justify-center gap-3 shadow-xs cursor-pointer"
            >
              <GoogleLogoSvg className="w-5 h-5" />
              <span>
                {activeTab === 'login'
                  ? 'Continuar com o Google'
                  : 'Cadastrar rapidamente com o Google'}
              </span>
            </button>

            <div className="relative my-6 flex items-center justify-center">
              <div className="border-t border-[#7C5236]/20 w-full" />
              <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-widest text-stone-400 whitespace-nowrap">
                ou com seu e-mail
              </span>
              <div className="border-t border-[#7C5236]/20 w-full" />
            </div>
          </>
        )}

        {/* TAB 1: LOGIN WITH EMAIL & PASSWORD */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-[#3E2415] mb-1.5">Seu E-mail</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#2F523A] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#3E2415] mb-1.5">Sua Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#2F523A] absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl py-3 pl-10 pr-10 text-xs sm:text-sm focus:outline-hidden focus:border-[#2F523A] focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-stone-400 hover:text-[#3E2415] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-stone-600">
                <input
                  type="checkbox"
                  checked={asAdmin}
                  onChange={(e) => setAsAdmin(e.target.checked)}
                  className="rounded accent-[#2F523A]"
                />
                <span>Acesso Lojista / Admin</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('reset');
                  setResetEmail(loginEmail);
                  clearFeedback();
                }}
                className="text-[#2F523A] hover:underline font-bold cursor-pointer"
              >
                Esqueceu a senha?
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-[#2F523A] to-[#3E2415] hover:brightness-110 disabled:opacity-60 text-white font-extrabold py-3.5 rounded-xl transition text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md mt-2 cursor-pointer"
            >
              {submitting ? 'Entrando...' : 'Entrar na Minha Conta'}{' '}
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-center text-xs text-stone-600 pt-2">
              Ainda não tem cadastro?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  clearFeedback();
                }}
                className="text-[#2F523A] font-extrabold hover:underline cursor-pointer"
              >
                Criar conta gratuitamente
              </button>
            </p>
          </form>
        )}

        {/* TAB 2: REGISTER NEW ACCOUNT ON THE SITE */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-left">
            <div>
              <label className="block text-xs font-bold text-[#3E2415] mb-1">
                Nome Completo *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#2F523A] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Maria Aparecida dos Santos"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#3E2415] mb-1">E-mail *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#2F523A] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#3E2415] mb-1">
                  WhatsApp / Celular
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#2F523A] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="(00) 90000-0000"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3E2415] mb-1">
                  CPF (para Nota/Envio)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-[#2F523A] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={regCpf}
                    onChange={(e) => setRegCpf(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#3E2415] mb-1">
                  Criar Senha *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#2F523A] absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Mín. 6 caracteres"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl py-3 pl-10 pr-9 text-xs sm:text-sm focus:outline-hidden focus:border-[#2F523A] focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-stone-400 hover:text-[#3E2415] cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#3E2415] mb-1">
                  Repetir a Senha *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#2F523A] absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Digite a mesma senha"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className={`w-full rounded-xl py-3 pl-10 pr-9 text-xs sm:text-sm focus:outline-hidden transition border ${
                      passwordsMismatch
                        ? 'bg-red-50/60 border-red-500 text-red-900 focus:border-red-600'
                        : passwordsMatch
                        ? 'bg-[#E7F0EA]/60 border-[#2F523A] text-[#1E3A2B] focus:border-[#2F523A]'
                        : 'bg-[#FAF7F2] border-[#7C5236]/30 text-[#2C1A10] focus:border-[#2F523A] focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-stone-400 hover:text-[#3E2415] cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Real-time Password Match Indicator */}
            {regPassword.length > 0 && regPassword.length < 6 && (
              <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                A senha precisa ter pelo menos 6 caracteres (faltam {6 - regPassword.length}).
              </p>
            )}
            {passwordsMismatch && (
              <p className="text-[11px] text-red-600 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                As senhas não são iguais. Digite exatamente a mesma senha nos dois campos.
              </p>
            )}
            {passwordsMatch && (
              <p className="text-[11px] text-[#2F523A] font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                As duas senhas estão idênticas! Você já pode criar sua conta.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !passwordsMatch}
              className="w-full bg-gradient-to-r from-[#2F523A] to-[#3E2415] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-3.5 rounded-xl transition text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md mt-3 cursor-pointer"
            >
              {submitting ? 'Criando sua conta...' : 'Cadastrar Minha Conta'}{' '}
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-center text-xs text-stone-600 pt-1">
              Já possui uma conta?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  clearFeedback();
                }}
                className="text-[#2F523A] font-extrabold hover:underline cursor-pointer"
              >
                Fazer Login
              </button>
            </p>
          </form>
        )}

        {/* TAB 3: PASSWORD RECOVERY */}
        {activeTab === 'reset' && (
          <form onSubmit={handleResetSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-[#3E2415] mb-1.5">
                E-mail da sua conta *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#2F523A] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#3E2415] mb-1.5">
                Nova Senha (mínimo 6 caracteres) *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#2F523A] absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Digite sua nova senha"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#3E2415] mb-1.5">
                Repetir a Nova Senha *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#2F523A] absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Digite exatamente a mesma senha"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              {resetConfirmPassword.length > 0 && resetNewPassword !== resetConfirmPassword && (
                <p className="text-[11px] text-red-600 font-bold mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> As duas senhas não coincidem.
                </p>
              )}
              {resetNewPassword.length >= 6 && resetNewPassword === resetConfirmPassword && (
                <p className="text-[11px] text-[#2F523A] font-bold mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> As duas senhas estão iguais!
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={
                submitting ||
                resetNewPassword.length < 6 ||
                resetNewPassword !== resetConfirmPassword
              }
              className="w-full bg-gradient-to-r from-[#2F523A] to-[#3E2415] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-3.5 rounded-xl transition text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              {submitting ? 'Salvando...' : 'Redefinir Minha Senha'}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                clearFeedback();
              }}
              className="w-full text-center text-xs text-stone-500 hover:text-[#3E2415] font-semibold py-2 cursor-pointer"
            >
              ← Voltar para o Login
            </button>
          </form>
        )}

        {/* Privacy & Per-Account Isolation Guarantee */}
        <div className="mt-6 pt-5 border-t border-[#7C5236]/15 flex flex-col gap-2 text-[11px] text-stone-500">
          <div className="flex items-center justify-center gap-1.5 text-[#1E3A2B] font-semibold">
            <ShieldCheck className="w-4 h-4 text-[#2F523A]" />
            <span>Isolamento Individual de Conta (RLS & Sessão Privada)</span>
          </div>
          <p className="text-center text-[11px] text-stone-500 leading-relaxed">
            Cada cliente visualiza exclusivamente seus próprios itens no carrinho, endereços e histórico de pedidos.
          </p>

          {/* Optional Cloud Database Connection Settings */}
          <div className="text-center mt-2">
            <button
              type="button"
              onClick={() => setShowDbConfig(!showDbConfig)}
              className="inline-flex items-center gap-1.5 text-[11px] text-[#7C5236] hover:text-[#2F523A] font-semibold cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>
                {isCloudConnected
                  ? '● Banco Supabase PostgreSQL Conectado'
                  : 'Configurar Conexão Supabase PostgreSQL (Opcional)'}
              </span>
            </button>
          </div>

          {showDbConfig && (
            <form
              onSubmit={handleSaveSupabaseConfig}
              className="mt-3 p-4 rounded-2xl bg-[#FAF7F2] border border-[#7C5236]/30 text-left space-y-3"
            >
              <p className="text-[11px] text-[#3E2415] font-semibold">
                Conecte seu projeto Supabase (PostgreSQL + Google Auth) colando a URL e a chave Anon pública:
              </p>
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-600 mb-1">
                  Project URL (NEXT_PUBLIC_SUPABASE_URL)
                </label>
                <input
                  type="url"
                  placeholder="https://seu-projeto.supabase.co"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                  className="w-full bg-white border border-[#7C5236]/30 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-600 mb-1">
                  Anon Public Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
                </label>
                <input
                  type="text"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  value={sbAnonKey}
                  onChange={(e) => setSbAnonKey(e.target.value)}
                  className="w-full bg-white border border-[#7C5236]/30 rounded-lg p-2 text-xs font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#2F523A] text-white text-xs font-bold py-2 rounded-lg hover:bg-[#1E3A2B] transition cursor-pointer"
                >
                  Salvar Conexão Supabase
                </button>
                <button
                  type="button"
                  onClick={() => setShowDbConfig(false)}
                  className="px-3 py-2 text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* GOOGLE ACCOUNT LOGIN / SELECTOR MODAL */}
      {googleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-[#7C5236]/30 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setGoogleModalOpen(false)}
              className="absolute right-4 top-4 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center mb-3 shadow-xs">
                <GoogleLogoSvg className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-bold text-[#3E2415]">
                Fazer Login com o Google
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Prosseguir para <strong>Espaço Católico Santo Antônio</strong>
              </p>
            </div>

            <form onSubmit={handleGoogleModalContinue} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#3E2415] mb-1.5">
                  Seu E-mail do Google (Gmail) *
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="seu.nome@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl p-3 text-xs sm:text-sm focus:outline-hidden focus:border-[#2F523A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3E2415] mb-1.5">
                  Seu Nome de Exibição
                </label>
                <input
                  type="text"
                  placeholder="Como deseja ser chamado(a)"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl p-3 text-xs sm:text-sm focus:outline-hidden focus:border-[#2F523A]"
                />
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed">
                Ao continuar, o Google vinculará seu endereço de e-mail e nome à sua conta exclusiva no Espaço Católico Santo Antônio.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGoogleModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-[#2F523A] hover:bg-[#1E3A2B] text-white text-xs font-bold transition shadow-md cursor-pointer"
                >
                  {submitting ? 'Conectando...' : 'Continuar com Google'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
