'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth, SavedAddress } from '@/context/AuthContext';
import {
  ShieldCheck,
  CheckCircle2,
  QrCode,
  CreditCard,
  FileText,
  ArrowRight,
  Sparkles,
  MapPin,
  User as UserIcon,
  Building2,
  Lock,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { createSicrediPayment } from '@/lib/sicredi/client';
import { SicrediPaymentMethod } from '@/lib/sicredi/types';
import { detectCardBrand } from '@/lib/sicredi/pix-brcode';
import { SicrediPaymentResultCard } from '@/components/SicrediPaymentWidgets';

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user, addresses, recordUserOrder, confirmOrderPayment } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('MG');

  // Métodos de pagamento da API Sicredi
  const [paymentMethod, setPaymentMethod] = useState<SicrediPaymentMethod>('pix');

  // Dados do Cartão (Crédito / Débito Sicredi)
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState(1);

  const [orderCompleted, setOrderCompleted] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill personal data & default address from the logged-in user's account
  useEffect(() => {
    if (user) {
      setName((prev) => prev || user.name || '');
      setEmail((prev) => prev || user.email || '');
      setCpf((prev) => prev || user.cpf || '');
      setPhone((prev) => prev || user.phone || '');
      setCardHolder((prev) => prev || (user.name ? user.name.toUpperCase() : ''));
    }
  }, [user]);

  useEffect(() => {
    if (addresses.length > 0 && !street) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      if (def) {
        setCep(def.cep || '');
        setStreet(def.street || '');
        setNumber(def.number || '');
        setComplement(def.complement || '');
        setDistrict(def.district || '');
        setCity(def.city || '');
        setState(def.state || 'MG');
      }
    }
  }, [addresses, street]);

  const applySavedAddress = (addr: SavedAddress) => {
    setCep(addr.cep);
    setStreet(addr.street);
    setNumber(addr.number);
    setComplement(addr.complement || '');
    setDistrict(addr.district);
    setCity(addr.city);
    setState(addr.state);
  };

  // Busca automática de CEP via ViaCEP
  const handleCepChange = async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, '').slice(0, 8);
    const formatted =
      digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setCep(formatted);

    if (digits.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            if (data.logradouro) setStreet(data.logradouro);
            if (data.bairro) setDistrict(data.bairro);
            if (data.localidade) setCity(data.localidade);
            if (data.uf) setState(data.uf);
          }
        }
      } catch {}
    }
  };

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatCardExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    return digits;
  };

  const fillTestCard = () => {
    setCardNumber('6042 0174 8000 1234');
    setCardHolder((name || 'CLIENTE ESPACO CATOLICO').toUpperCase());
    setCardExpiry('12/30');
    setCardCvv('748');
  };

  const shipping = subtotal >= 299 ? 0 : 18.9;
  const total = subtotal + shipping;
  const detectedBrand = detectCardBrand(cardNumber);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name || !email || !cpf) {
      setErrorMessage('Por favor, preencha todos os campos pessoais obrigatórios.');
      return;
    }

    if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
      const cleanDigits = cardNumber.replace(/\D/g, '');
      const expParts = cardExpiry.split('/');
      if (cleanDigits.length < 13 || !cardHolder.trim() || expParts.length !== 2 || cardCvv.length < 3) {
        setErrorMessage(
          'Preencha corretamente os dados do seu Cartão (Número, Titular, Validade MM/AA e CVV).'
        );
        return;
      }
    }

    setSubmitting(true);
    const orderNumber = `SA-${Math.floor(100000 + Math.random() * 900000)}`;
    const [expMonth = '12', expYear = '30'] = cardExpiry.split('/');

    const sicrediRes = await createSicrediPayment({
      orderNumber,
      amount: total,
      method: paymentMethod,
      customer: {
        name,
        email,
        cpfCnpj: cpf,
        phone,
        address: {
          cep,
          street,
          number,
          complement,
          district,
          city,
          state,
        },
      },
      card:
        paymentMethod === 'credit_card' || paymentMethod === 'debit_card'
          ? {
              holderName: cardHolder.trim(),
              number: cardNumber,
              expiryMonth: expMonth,
              expiryYear: expYear,
              cvv: cardCvv,
              holderCpf: cpf,
              installments: paymentMethod === 'debit_card' ? 1 : installments,
              brand: detectedBrand,
            }
          : undefined,
      description: `Pedido ${orderNumber} - Espaço Católico Santo Antônio`,
    });

    if (!sicrediRes.ok) {
      setSubmitting(false);
      setErrorMessage(
        sicrediRes.error || 'Não foi possível processar o pagamento na API Sicredi.'
      );
      return;
    }

    const savedOrder = await recordUserOrder({
      orderNumber,
      status: sicrediRes.orderStatus,
      customer: { name, email, cpf, phone },
      address: { street, number, complement, district, city, state, cep },
      paymentMethod,
      subtotal,
      shipping,
      total,
      sicrediPayment: {
        mode: sicrediRes.mode,
        transactionId: sicrediRes.transactionId,
        pix: sicrediRes.pix,
        boleto: sicrediRes.boleto,
        cardTransaction: sicrediRes.cardTransaction,
      },
      items: items.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        productSlug: i.product.slug,
        variantName: i.variant_name,
        quantity: i.quantity,
        price: i.price,
      })),
    });

    setSubmitting(false);
    setOrderCompleted(savedOrder);
    clearCart();
  };

  const handleSimulateConfirmation = async () => {
    if (!orderCompleted) return;
    await confirmOrderPayment(orderCompleted.id);
    setOrderCompleted({
      ...orderCompleted,
      status: 'paid',
    });
  };

  if (orderCompleted) {
    const fullAddr = `${orderCompleted.address.street}, ${orderCompleted.address.number}${
      orderCompleted.address.complement ? ` (${orderCompleted.address.complement})` : ''
    } - ${orderCompleted.address.district}, ${orderCompleted.address.city}/${
      orderCompleted.address.state
    } - CEP ${orderCompleted.address.cep}`;

    return (
      <div className="max-w-3xl mx-auto px-4 py-14 text-center">
        <div className="w-20 h-20 rounded-full bg-[#E7F0EA] border-2 border-[#2F523A] text-[#2F523A] mx-auto flex items-center justify-center mb-5 shadow-md">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-sacred-shimmer mb-2">
          {orderCompleted.status === 'paid'
            ? 'Pagamento Aprovado e Pedido Confirmado!'
            : 'Pedido Gerado via Sicredi!'}
        </h1>
        <p className="text-stone-600 text-sm mb-6">
          Código do pedido:{' '}
          <strong className="text-[#3E2415] font-mono text-base">
            #{orderCompleted.orderNumber}
          </strong>
        </p>

        <SicrediPaymentResultCard
          orderNumber={orderCompleted.orderNumber}
          total={orderCompleted.total}
          customerName={orderCompleted.customer.name}
          customerCpf={orderCompleted.customer.cpf}
          customerAddress={fullAddr}
          paymentMethod={orderCompleted.paymentMethod}
          sicrediData={orderCompleted.sicrediPayment}
          orderStatus={orderCompleted.status}
          onSimulatePaid={handleSimulateConfirmation}
        />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {user && (
            <Link
              href="/perfil"
              className="inline-flex items-center gap-2 bg-[#2F523A] hover:bg-[#1E3A2B] text-white px-7 py-4 rounded-full text-xs font-extrabold uppercase tracking-wider transition shadow-md"
            >
              Ver Pedido na Minha Conta
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#EFE7DD] border border-[#7C5236]/30 text-[#3E2415] hover:bg-[#3E2415] hover:text-white px-7 py-4 rounded-full text-xs font-extrabold uppercase tracking-wider transition"
          >
            Voltar para o Início
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-serif font-bold text-[#3E2415] mb-2">
          Não há produtos no seu carrinho
        </h2>
        <Link href="/produtos" className="text-xs text-[#2F523A] font-semibold underline">
          Voltar para o catálogo
        </Link>
      </div>
    );
  }

  const inputClass =
    'w-full bg-[#FAF7F2] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl p-3 text-xs focus:outline-hidden focus:border-[#2F523A]';

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#2F523A] mb-1">
            <Building2 className="w-3.5 h-3.5" /> Checkout Oficial Integrado • Sicredi (Banco 748)
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-sacred-shimmer">
            Finalização da Compra
          </h1>
        </div>

        {!user ? (
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E7F0EA] border border-[#2F523A]/30 text-xs font-bold text-[#1E3A2B] hover:bg-[#2F523A] hover:text-white transition"
          >
            <UserIcon className="w-4 h-4" />
            <span>Entre ou crie sua conta para salvar este pedido no seu histórico</span>
          </Link>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E7F0EA] border border-[#2F523A]/30 text-xs text-[#1E3A2B]">
            <CheckCircle2 className="w-4 h-4 text-[#2F523A]" />
            <span>
              Comprando como <strong>{user.name}</strong> ({user.email})
            </span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Dados Pessoais */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25">
            <h3 className="font-serif font-bold text-lg text-[#3E2415] mb-5">1. Dados Pessoais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">E-mail *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  CPF / CNPJ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  WhatsApp / Telefone
                </label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* 2. Endereço de Entrega */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <h3 className="font-serif font-bold text-lg text-[#3E2415]">
                2. Endereço de Entrega
              </h3>
              {addresses.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {addresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => applySavedAddress(addr)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#E7F0EA] hover:bg-[#2F523A] text-[#1E3A2B] hover:text-white border border-[#2F523A]/30 text-[11px] font-bold transition cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" /> {addr.label} ({addr.street}, {addr.number})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">CEP *</label>
                <input
                  type="text"
                  required
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Rua / Logradouro *
                </label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Número *
                </label>
                <input
                  type="text"
                  required
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Complemento
                </label>
                <input
                  type="text"
                  placeholder="Apto, Bloco, Casa..."
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Bairro *
                </label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Cidade / UF *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    required
                    value={state}
                    maxLength={2}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-16 bg-[#FAF7F2] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl p-3 text-xs text-center font-bold focus:border-[#2F523A]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Forma de Pagamento via API Sicredi */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-serif font-bold text-lg text-[#3E2415]">
                3. Forma de Pagamento (API Sicredi)
              </h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7F0EA] text-[#1E3A2B] border border-[#2F523A]/30 text-[11px] font-bold">
                <Lock className="w-3 h-3 text-[#2F523A]" /> Ambiente Criptografado Sicredi 748
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  id: 'pix',
                  label: 'PIX Sicredi',
                  sub: 'QR Code + Copia e Cola',
                  icon: QrCode,
                },
                {
                  id: 'credit_card',
                  label: 'Cartão de Crédito',
                  sub: 'Até 6x sem juros',
                  icon: CreditCard,
                },
                {
                  id: 'debit_card',
                  label: 'Cartão de Débito',
                  sub: 'Débito à vista',
                  icon: Wallet,
                },
                {
                  id: 'boleto',
                  label: 'Boleto Híbrido',
                  sub: 'Sicredi 748 + PIX',
                  icon: FileText,
                },
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as SicrediPaymentMethod)}
                    className={`p-4 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'border-2 border-[#2F523A] bg-[#E7F0EA] text-[#1E3A2B] shadow-sm'
                        : 'border-[#7C5236]/25 bg-white text-stone-600 hover:border-[#2F523A]'
                    }`}
                  >
                    <Icon className="w-6 h-6 text-[#2F523A]" />
                    <span className="text-xs font-bold text-[#3E2415]">{m.label}</span>
                    <span className="text-[10px] text-[#2F523A] font-semibold">{m.sub}</span>
                  </button>
                );
              })}
            </div>

            {/* Resumo Informativo PIX Sicredi */}
            {paymentMethod === 'pix' && (
              <div className="bg-[#FAF7F2] border border-[#2F523A]/30 rounded-2xl p-4 flex items-start gap-3 text-xs text-stone-700">
                <QrCode className="w-8 h-8 text-[#2F523A] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-[#1E3A2B] block">
                    PIX Dinâmico Imediato — API Pix Sicredi (Padrão BACEN)
                  </strong>
                  <p className="text-stone-600 leading-relaxed">
                    Ao confirmar o pedido, será gerado instantaneamente o{' '}
                    <strong>QR Code Oficial</strong> e a chave <strong>PIX Copia e Cola</strong> com
                    identificador único de transação (TXID) Sicredi e confirmação automática via
                    Webhook.
                  </p>
                </div>
              </div>
            )}

            {/* Resumo Informativo Boleto Híbrido Sicredi */}
            {paymentMethod === 'boleto' && (
              <div className="bg-[#FAF7F2] border border-[#2F523A]/30 rounded-2xl p-4 flex items-start gap-3 text-xs text-stone-700">
                <FileText className="w-8 h-8 text-[#2F523A] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-[#1E3A2B] block">
                    Boleto Bancário Híbrido Registrado — Sicredi (Banco 748)
                  </strong>
                  <p className="text-stone-600 leading-relaxed">
                    Emissão imediata do Boleto Sicredi com <strong>Linha Digitável FEBRABAN</strong>
                    , <strong>Código de Barras</strong>, <strong>QR Code PIX Integrado</strong> no
                    próprio boleto e opção de impressão ou download em PDF (vencimento em 3 dias).
                  </p>
                </div>
              </div>
            )}

            {/* Formulário de Cartão de Crédito ou Débito Sicredi */}
            {(paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && (
              <div className="bg-[#FAF7F2] border border-[#7C5236]/25 rounded-2xl p-5 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#7C5236]/15 pb-3">
                  <div>
                    <strong className="text-xs sm:text-sm text-[#3E2415] block">
                      {paymentMethod === 'debit_card'
                        ? 'Dados do Cartão de Débito (Sicredi Pagamentos)'
                        : 'Dados do Cartão de Crédito (Sicredi Pagamentos)'}
                    </strong>
                    <span className="text-[11px] text-stone-500">
                      Aceitamos Sicredi, Cabal, Visa, Mastercard, Elo, Hipercard e Amex
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={fillTestCard}
                    className="px-3 py-1.5 rounded-full bg-[#E7F0EA] hover:bg-[#2F523A] text-[#1E3A2B] hover:text-white text-[11px] font-bold border border-[#2F523A]/30 transition cursor-pointer"
                  >
                    Preencher Cartão Teste Sicredi
                  </button>
                </div>

                {/* Representação Visual do Cartão */}
                <div className="bg-gradient-to-br from-[#1E3A2B] via-[#2F523A] to-[#3E2415] text-white rounded-2xl p-5 shadow-md max-w-md mx-auto space-y-5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold tracking-widest uppercase text-[#D8E8DC]">
                      {paymentMethod === 'debit_card' ? 'DÉBITO SICREDI' : 'CRÉDITO SICREDI'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-white/15 font-mono font-bold text-[11px]">
                      {detectedBrand}
                    </span>
                  </div>
                  <div className="font-mono text-base sm:text-lg tracking-[0.18em] font-bold">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>
                  <div className="flex justify-between items-end text-[11px]">
                    <div>
                      <span className="block text-[9px] uppercase text-white/70">
                        Nome no Cartão
                      </span>
                      <strong className="tracking-wider uppercase">
                        {cardHolder || 'NOME DO TITULAR'}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] uppercase text-white/70">Validade</span>
                      <strong className="font-mono">{cardExpiry || 'MM/AA'}</strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Número do Cartão *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className="w-full bg-white border border-[#7C5236]/30 text-[#2C1A10] rounded-xl p-3 text-xs font-mono focus:outline-hidden focus:border-[#2F523A]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nome Impresso no Cartão *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="COMO ESTÁ NO CARTÃO"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      className="w-full bg-white border border-[#7C5236]/30 text-[#2C1A10] rounded-xl p-3 text-xs uppercase focus:outline-hidden focus:border-[#2F523A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Validade (MM/AA) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="MM/AA"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatCardExpiry(e.target.value))}
                      className="w-full bg-white border border-[#7C5236]/30 text-[#2C1A10] rounded-xl p-3 text-xs font-mono focus:outline-hidden focus:border-[#2F523A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Código de Segurança (CVV) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="123"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full bg-white border border-[#7C5236]/30 text-[#2C1A10] rounded-xl p-3 text-xs font-mono focus:outline-hidden focus:border-[#2F523A]"
                    />
                  </div>

                  {paymentMethod === 'credit_card' ? (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Opções de Parcelamento (Sem Juros) *
                      </label>
                      <select
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                        className="w-full bg-white border border-[#7C5236]/30 text-[#2C1A10] rounded-xl p-3 text-xs font-semibold focus:outline-hidden focus:border-[#2F523A]"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n}x de R$ {(total / n).toFixed(2).replace('.', ',')} sem juros (Total:
                            R$ {total.toFixed(2).replace('.', ',')})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="sm:col-span-2 bg-[#E7F0EA] border border-[#2F523A]/30 rounded-xl p-3 text-xs text-[#1E3A2B] font-semibold">
                      Débito à Vista Sicredi: Cobrança única de{' '}
                      <strong>R$ {total.toFixed(2).replace('.', ',')}</strong> autorizada no ato.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coluna Lateral: Resumo do Pedido */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6 rounded-2xl border border-[#7C5236]/30 space-y-4 sticky top-24">
            <h3 className="font-serif font-bold text-lg text-sacred-shimmer border-b border-[#7C5236]/15 pb-3">
              Itens da Sua Conta ({items.length})
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto divide-y divide-[#7C5236]/15 pr-1">
              {items.map((i, idx) => (
                <div key={idx} className="pt-2.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-[#3E2415] line-clamp-1">
                      {i.product.name}
                    </span>
                    <span className="text-stone-500 text-[11px]">
                      {i.quantity}x R$ {i.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <strong className="text-[#1E3A2B] ml-2">
                    R$ {(i.price * i.quantity).toFixed(2).replace('.', ',')}
                  </strong>
                </div>
              ))}
            </div>

            <div className="border-t border-[#7C5236]/15 pt-3 space-y-2 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between">
                <span>Frete:</span>
                <span>
                  {shipping === 0 ? (
                    <strong className="text-[#2F523A]">GRÁTIS</strong>
                  ) : (
                    `R$ ${shipping.toFixed(2).replace('.', ',')}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-lg font-extrabold text-[#1E3A2B] border-t border-[#7C5236]/20 pt-2">
                <span>Total:</span>
                <span>R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-[#2F523A] to-[#3E2415] hover:brightness-110 disabled:opacity-60 text-white font-extrabold py-4 rounded-2xl transition text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md uppercase tracking-wider mt-4 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? 'Comunicando com Sicredi...' : 'Confirmar e Pagar via Sicredi'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 pt-2">
              <ShieldCheck className="w-4 h-4 text-[#2F523A]" />
              <span>Integrado com Sicredi (PIX, Cartão e Boleto 748)</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
