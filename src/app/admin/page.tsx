'use client';

import React, { useState, useEffect } from 'react';
import { demoStore } from '@/lib/demo/service';
import { Product, Category } from '@/types';
import {
  Plus,
  Trash2,
  Sparkles,
  Building2,
  QrCode,
  CreditCard,
  FileText,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { createSicrediPayment } from '@/lib/sicredi/client';
import { SicrediPaymentMethod, SicrediPaymentResponse } from '@/lib/sicredi/types';
import { SicrediPaymentResultCard } from '@/components/SicrediPaymentWidgets';

const SICREDI_ADMIN_SETTINGS_KEY = 'santo_antonio_sicredi_admin_config';

export default function AdminPage() {
  const [tab, setTab] = useState<'dashboard' | 'products' | 'categories' | 'sicredi'>('dashboard');

  const [productsList, setProductsList] = useState<Product[]>(demoStore.getProducts());
  const [categoriesList] = useState<Category[]>(demoStore.getCategories());

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCategory, setNewProdCategory] = useState(categoriesList[0]?.slug || '');
  const [newProdStock, setNewProdStock] = useState('10');
  const [newProdImageUrl, setNewProdImageUrl] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');

  // Configurações das 3 APIs da Sicredi no Painel Admin
  const [sicrediEnv, setSicrediEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [pixChave, setPixChave] = useState('financeiro@espacocatolicosantoantonio.com.br');
  const [pixClientId, setPixClientId] = useState('');
  const [pixClientSecret, setPixClientSecret] = useState('');
  const [cooperativa, setCooperativa] = useState('0101');
  const [posto, setPosto] = useState('02');
  const [codigoBeneficiario, setCodigoBeneficiario] = useState('12345');
  const [cobrancaApiKey, setCobrancaApiKey] = useState('');
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [ecommerceMerchantId, setEcommerceMerchantId] = useState('');
  const [ecommerceMerchantKey, setEcommerceMerchantKey] = useState('');
  const [savedSicrediMsg, setSavedSicrediMsg] = useState<string | null>(null);

  // Simulador de Teste Rápido Sicredi no Painel Admin
  const [testResult, setTestResult] = useState<SicrediPaymentResponse | null>(null);
  const [testingMethod, setTestingMethod] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SICREDI_ADMIN_SETTINGS_KEY);
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg.sicrediEnv) setSicrediEnv(cfg.sicrediEnv);
        if (cfg.pixChave) setPixChave(cfg.pixChave);
        if (cfg.pixClientId) setPixClientId(cfg.pixClientId);
        if (cfg.pixClientSecret) setPixClientSecret(cfg.pixClientSecret);
        if (cfg.cooperativa) setCooperativa(cfg.cooperativa);
        if (cfg.posto) setPosto(cfg.posto);
        if (cfg.codigoBeneficiario) setCodigoBeneficiario(cfg.codigoBeneficiario);
        if (cfg.cobrancaApiKey) setCobrancaApiKey(cfg.cobrancaApiKey);
        if (cfg.codigoAcesso) setCodigoAcesso(cfg.codigoAcesso);
        if (cfg.ecommerceMerchantId) setEcommerceMerchantId(cfg.ecommerceMerchantId);
        if (cfg.ecommerceMerchantKey) setEcommerceMerchantKey(cfg.ecommerceMerchantKey);
      }
    } catch {}
  }, []);

  const handleSaveSicrediConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(
        SICREDI_ADMIN_SETTINGS_KEY,
        JSON.stringify({
          sicrediEnv,
          pixChave,
          pixClientId,
          pixClientSecret,
          cooperativa,
          posto,
          codigoBeneficiario,
          cobrancaApiKey,
          codigoAcesso,
          ecommerceMerchantId,
          ecommerceMerchantKey,
        })
      );
      setSavedSicrediMsg('Configurações da API Sicredi (Banco 748) salvas com sucesso!');
      setTimeout(() => setSavedSicrediMsg(null), 4000);
    } catch {}
  };

  const handleTestSicrediApi = async (method: SicrediPaymentMethod) => {
    setTestingMethod(true);
    const res = await createSicrediPayment({
      orderNumber: `TESTE-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: 149.9,
      method,
      customer: {
        name: 'Cliente Teste Sicredi',
        email: 'teste@espacocatolicosantoantonio.com.br',
        cpfCnpj: '123.456.789-00',
        phone: '(31) 99999-0000',
        address: {
          cep: '30140-071',
          street: 'Av. Brasil',
          number: '1000',
          district: 'Funcionários',
          city: 'Belo Horizonte',
          state: 'MG',
        },
      },
      card:
        method === 'credit_card' || method === 'debit_card'
          ? {
              holderName: 'CLIENTE TESTE SICREDI',
              number: '6042017480001234',
              expiryMonth: '12',
              expiryYear: '30',
              cvv: '748',
              installments: method === 'debit_card' ? 1 : 3,
            }
          : undefined,
    });
    setTestResult(res);
    setTestingMethod(false);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) return;

    const newP: Product = {
      id: `custom-${Date.now()}`,
      name: newProdName,
      slug: newProdName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      price: parseFloat(newProdPrice),
      stock: parseInt(newProdStock) || 0,
      description: newProdDesc,
      category_slug: newProdCategory,
      images: newProdImageUrl.trim() ? [newProdImageUrl.trim()] : [],
      is_demo: false,
    };

    setProductsList([newP, ...productsList]);
    setShowAddProduct(false);
    setNewProdName('');
    setNewProdPrice('');
    setNewProdImageUrl('');
    setNewProdDesc('');
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      setProductsList(productsList.filter((p) => p.id !== id));
    }
  };

  const removeDemoProducts = () => {
    if (confirm('Deseja remover todos os produtos de demonstração?')) {
      setProductsList(productsList.filter((p) => !p.is_demo));
    }
  };

  const inputClass =
    'w-full bg-[#FAF7F2] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl p-2.5 text-xs focus:outline-hidden focus:border-[#2F523A]';

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="glass-card rounded-2xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#7C5236]/25">
        <div>
          <span className="text-xs font-bold tracking-[0.28em] text-[#2F523A] uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#7C5236]" /> Painel de Gestão
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-sacred-shimmer mt-1">
            Área Administrativa
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'sicredi', label: 'Pagamentos Sicredi (748)' },
            { id: 'products', label: `Produtos (${productsList.length})` },
            { id: 'categories', label: 'Categorias' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                tab === t.id
                  ? 'bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white shadow-sm'
                  : 'bg-[#FAF7F2] border border-[#7C5236]/25 text-[#3E2415] hover:bg-[#E7F0EA]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'dashboard' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-card p-6 rounded-2xl border border-[#7C5236]/25">
              <span className="text-xs text-stone-500 font-medium">Faturamento no Período</span>
              <div className="text-3xl font-extrabold text-[#1E3A2B] mt-1">R$ 14.890,50</div>
              <span className="text-[11px] text-[#2F523A] font-bold mt-2 block">
                ✦ Liquidado via Sicredi 748
              </span>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-[#7C5236]/25">
              <span className="text-xs text-stone-500 font-medium">Pedidos Realizados</span>
              <div className="text-3xl font-extrabold text-[#3E2415] mt-1">84</div>
              <span className="text-[11px] text-stone-500 mt-2 block">12 aguardando pagamento</span>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-[#7C5236]/25">
              <span className="text-xs text-stone-500 font-medium">Artigos no Catálogo</span>
              <div className="text-3xl font-extrabold text-[#1E3A2B] mt-1">
                {productsList.length}
              </div>
              <span className="text-[11px] text-[#7C5236] font-bold mt-2 block">
                5 com estoque baixo
              </span>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-[#7C5236]/25">
              <span className="text-xs text-stone-500 font-medium">Gateway Ativo</span>
              <div className="text-2xl font-extrabold text-[#2F523A] mt-1 flex items-center gap-1.5">
                <Building2 className="w-6 h-6" /> SICREDI 748
              </div>
              <span className="text-[11px] text-[#2F523A] font-bold mt-2 block">
                PIX • Crédito/Débito • Boleto
              </span>
            </div>
          </div>

          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25">
            <h3 className="font-serif font-bold text-lg text-[#3E2415] mb-4">
              Ações Rápidas do Administrador
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setTab('sicredi')}
                className="bg-[#2F523A] hover:bg-[#1E3A2B] text-white font-extrabold px-5 py-3 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-sm"
              >
                <Building2 className="w-4 h-4" /> Configurar API Sicredi (PIX / Cartão / Boleto)
              </button>
              <button
                onClick={() => {
                  setTab('products');
                  setShowAddProduct(true);
                }}
                className="bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white font-extrabold px-5 py-3 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Cadastrar Novo Produto
              </button>
              <button
                onClick={removeDemoProducts}
                className="bg-[#FAF7F2] hover:bg-red-50 hover:border-red-300 hover:text-red-700 text-[#3E2415] font-semibold px-5 py-3 rounded-xl text-xs transition border border-[#7C5236]/25 cursor-pointer"
              >
                Remover Produtos de Demonstração
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'sicredi' && (
        <div className="space-y-8">
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#7C5236]/15 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#2F523A] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Portal do Desenvolvedor Sicredi (Banco 748)
                </span>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#3E2415] mt-0.5">
                  Configuração das APIs de Pagamento Sicredi
                </h2>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-[#E7F0EA] border border-[#2F523A]/30 text-xs font-bold text-[#1E3A2B] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2F523A]" />
                Modo Atual: {sicrediEnv === 'production' ? 'Produção Sicredi' : 'Sandbox / Homologação'}
              </span>
            </div>

            {savedSicrediMsg && (
              <div className="p-4 rounded-xl bg-[#E7F0EA] border border-[#2F523A] text-[#1E3A2B] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2F523A]" />
                <span>{savedSicrediMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSicrediConfig} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#3E2415] mb-1">
                    Ambiente da Integração
                  </label>
                  <select
                    value={sicrediEnv}
                    onChange={(e) => setSicrediEnv(e.target.value as 'sandbox' | 'production')}
                    className={inputClass}
                  >
                    <option value="sandbox">Sandbox / Homologação (Simulação Ativa)</option>
                    <option value="production">Produção (API Oficial Sicredi)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#3E2415] mb-1">
                    Chave PIX Sicredi Recebedora (CNPJ, E-mail, Telefone ou EVP)
                  </label>
                  <input
                    type="text"
                    value={pixChave}
                    onChange={(e) => setPixChave(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* 1. API Pix Sicredi */}
              <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#7C5236]/20 space-y-4">
                <h3 className="font-serif font-bold text-sm text-[#1E3A2B] flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#2F523A]" /> 1. API Pix Sicredi (Padrão BACEN —
                  Cobrança Imediata & Webhook)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Client ID (SICREDI_PIX_CLIENT_ID)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: cli_sicredi_pix_..."
                      value={pixClientId}
                      onChange={(e) => setPixClientId(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Client Secret (SICREDI_PIX_CLIENT_SECRET)
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••••••"
                      value={pixClientSecret}
                      onChange={(e) => setPixClientSecret(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* 2. API de Cobrança / Boleto Híbrido Sicredi */}
              <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#7C5236]/20 space-y-4">
                <h3 className="font-serif font-bold text-sm text-[#1E3A2B] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2F523A]" /> 2. API de Cobrança / Boleto
                  Híbrido Sicredi (Banco 748)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Cooperativa (4 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={cooperativa}
                      onChange={(e) => setCooperativa(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Posto / Agência (2 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={posto}
                      onChange={(e) => setPosto(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Código do Beneficiário (5 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      value={codigoBeneficiario}
                      onChange={(e) => setCodigoBeneficiario(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Token x-api-key (Portal Developer)
                    </label>
                    <input
                      type="password"
                      placeholder="x-api-key da Cobrança"
                      value={cobrancaApiKey}
                      onChange={(e) => setCobrancaApiKey(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Código de Acesso (Gerado no Internet Banking Sicredi)
                    </label>
                    <input
                      type="password"
                      placeholder="Código de Acesso da API Cobrança"
                      value={codigoAcesso}
                      onChange={(e) => setCodigoAcesso(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* 3. API Cartão Crédito / Débito Sicredi */}
              <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#7C5236]/20 space-y-4">
                <h3 className="font-serif font-bold text-sm text-[#1E3A2B] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#2F523A]" /> 3. API E-commerce Cartão de
                  Crédito e Débito (Sicredi Pagamentos)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Merchant ID (Estabelecimento Sicredi)
                    </label>
                    <input
                      type="text"
                      placeholder="ID do Estabelecimento"
                      value={ecommerceMerchantId}
                      onChange={(e) => setEcommerceMerchantId(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Merchant Key (Chave E-commerce Sicredi)
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••••••"
                      value={ecommerceMerchantKey}
                      onChange={(e) => setEcommerceMerchantKey(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white font-extrabold px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-sm cursor-pointer"
                >
                  Salvar Credenciais Sicredi
                </button>
              </div>
            </form>
          </div>

          {/* Simulador de Teste Rápido da Integração Sicredi */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25 space-y-5">
            <div>
              <h3 className="font-serif font-bold text-lg text-[#3E2415]">
                Simulador e Teste de Emissão Sicredi (Sandbox)
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Clique em uma das modalidades abaixo para testar a geração de cobrança (R$ 149,90) e
                visualizar o retorno real da integração:
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={testingMethod}
                onClick={() => handleTestSicrediApi('pix')}
                className="bg-[#2F523A] hover:bg-[#1E3A2B] text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition"
              >
                <QrCode className="w-4 h-4" /> Testar PIX Dinâmico Sicredi
              </button>
              <button
                type="button"
                disabled={testingMethod}
                onClick={() => handleTestSicrediApi('boleto')}
                className="bg-[#3E2415] hover:bg-[#2C1A10] text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition"
              >
                <FileText className="w-4 h-4" /> Testar Boleto Híbrido 748
              </button>
              <button
                type="button"
                disabled={testingMethod}
                onClick={() => handleTestSicrediApi('credit_card')}
                className="bg-[#FAF7F2] hover:bg-[#E7F0EA] text-[#1E3A2B] border border-[#2F523A]/40 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition"
              >
                <CreditCard className="w-4 h-4" /> Testar Cartão de Crédito (3x)
              </button>
              <button
                type="button"
                disabled={testingMethod}
                onClick={() => handleTestSicrediApi('debit_card')}
                className="bg-[#FAF7F2] hover:bg-[#E7F0EA] text-[#1E3A2B] border border-[#2F523A]/40 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition"
              >
                <CreditCard className="w-4 h-4" /> Testar Cartão de Débito
              </button>
            </div>

            {testResult && (
              <div className="pt-3">
                <SicrediPaymentResultCard
                  orderNumber={testResult.orderNumber}
                  total={testResult.amount}
                  customerName="Cliente Teste Sicredi"
                  customerCpf="123.456.789-00"
                  customerAddress="Av. Brasil, 1000 - Funcionários, Belo Horizonte/MG"
                  paymentMethod={testResult.method}
                  sicrediData={{
                    mode: testResult.mode,
                    pix: testResult.pix,
                    boleto: testResult.boleto,
                    cardTransaction: testResult.cardTransaction,
                  }}
                  orderStatus={testResult.orderStatus}
                  onSimulatePaid={() =>
                    setTestResult({ ...testResult, orderStatus: 'paid' })
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-serif font-bold text-xl text-[#3E2415]">Gerenciar Produtos</h3>
            <button
              onClick={() => setShowAddProduct(true)}
              className="bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white text-xs font-extrabold px-5 py-2.5 rounded-full flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Novo Produto
            </button>
          </div>

          {showAddProduct && (
            <form
              onSubmit={handleAddProduct}
              className="glass-card p-6 rounded-2xl border-2 border-[#2F523A] space-y-4"
            >
              <h4 className="font-serif font-bold text-base text-[#3E2415]">
                Cadastrar Novo Produto
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Estoque</label>
                  <input
                    type="number"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className={inputClass}
                  >
                    {categoriesList.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  URL da Imagem / Criativo (opcional — deixe em branco para adicionar depois)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newProdImageUrl}
                  onChange={(e) => setNewProdImageUrl(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="px-4 py-2 text-xs text-stone-500 hover:text-[#3E2415] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#2F523A] to-[#3E2415] font-extrabold text-white px-5 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          )}

          <div className="glass-card rounded-2xl border border-[#7C5236]/25 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-[#EFE7DD] uppercase font-bold text-[#3E2415] border-b border-[#7C5236]/20">
                  <tr>
                    <th className="p-4">Nome</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Preço</th>
                    <th className="p-4">Estoque</th>
                    <th className="p-4">Criativo</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#7C5236]/15">
                  {productsList.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAF7F2]">
                      <td className="p-4 font-bold text-[#2C1A10]">{p.name}</td>
                      <td className="p-4 text-stone-500">{p.category_slug}</td>
                      <td className="p-4 font-bold text-[#1E3A2B]">
                        R$ {p.price.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold ${
                            p.stock < 5
                              ? 'bg-[#EFE7DD] text-[#3E2415] border border-[#7C5236]/30'
                              : 'bg-[#E7F0EA] text-[#1E3A2B] border border-[#2F523A]/30'
                          }`}
                        >
                          {p.stock} un.
                        </span>
                      </td>
                      <td className="p-4">
                        {p.images && p.images.length > 0 ? (
                          <span className="text-[10px] bg-[#E7F0EA] text-[#1E3A2B] font-bold px-2.5 py-0.5 rounded-full">
                            Com Foto
                          </span>
                        ) : (
                          <span className="text-[10px] bg-[#FAF7F2] text-[#7C5236] font-semibold px-2.5 py-0.5 rounded-full border border-[#7C5236]/25">
                            Aguardando Criativo
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="text-stone-400 hover:text-red-600 transition p-1 cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25">
          <h3 className="font-serif font-bold text-xl text-[#3E2415] mb-5">
            Estrutura de Categorias Cadastradas ({categoriesList.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categoriesList.map((c) => (
              <div
                key={c.slug}
                className="p-3.5 bg-[#FAF7F2] rounded-xl border border-[#7C5236]/25 flex justify-between items-center text-xs"
              >
                <div>
                  <span className="font-bold text-[#3E2415] block">{c.name}</span>
                  <span className="text-[#2F523A] text-[10px] font-mono">{c.slug}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
