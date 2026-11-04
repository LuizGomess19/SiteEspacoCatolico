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
} from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user, addresses, recordUserOrder } = useAuth();

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
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit' | 'boleto'>('pix');
  const [orderCompleted, setOrderCompleted] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill personal data & default address from the logged-in user's account
  useEffect(() => {
    if (user) {
      setName((prev) => prev || user.name || '');
      setEmail((prev) => prev || user.email || '');
      setCpf((prev) => prev || user.cpf || '');
      setPhone((prev) => prev || user.phone || '');
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

  const shipping = subtotal >= 299 ? 0 : 18.9;
  const total = subtotal + shipping;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !cpf) {
      alert('Por favor preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    const orderNumber = `SA-${Math.floor(100000 + Math.random() * 900000)}`;

    const savedOrder = await recordUserOrder({
      orderNumber,
      customer: { name, email, cpf, phone },
      address: { street, number, complement, district, city, state, cep },
      paymentMethod,
      subtotal,
      shipping,
      total,
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

  if (orderCompleted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-[#E7F0EA] border-2 border-[#2F523A] text-[#2F523A] mx-auto flex items-center justify-center mb-5 shadow-md">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-sacred-shimmer mb-2">
          Pedido Realizado e Salvo na Sua Conta!
        </h1>
        <p className="text-stone-600 text-sm mb-6">
          Código do pedido:{' '}
          <strong className="text-[#3E2415] font-mono text-base">
            {orderCompleted.orderNumber}
          </strong>
        </p>

        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-[#7C5236]/30 text-left mb-8 space-y-4">
          <h3 className="font-serif font-bold text-base text-[#3E2415] border-b border-[#7C5236]/15 pb-2">
            Instruções de Pagamento
          </h3>
          {orderCompleted.paymentMethod === 'pix' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-44 h-44 bg-white border-2 border-[#2F523A] mx-auto flex items-center justify-center rounded-2xl shadow-md">
                <QrCode className="w-28 h-28 text-[#1E3A2B]" />
              </div>
              <p className="text-xs text-stone-600">
                Escaneie o QR Code acima no aplicativo do seu banco ou utilize a chave PIX Copia-e-Cola abaixo:
              </p>
              <div className="bg-[#FAF7F2] border border-[#7C5236]/30 text-[#3E2415] p-3 rounded-xl text-[11px] font-mono select-all break-all">
                00020126580014br.gov.bcb.pix0136espacocatolicosantoantonio@pix.com.br5204000053039865802BR5925ESPACO CATOLICO SANTO AN6009SAO PAULO62070503***6304E2B1
              </div>
            </div>
          )}

          {orderCompleted.paymentMethod === 'credit' && (
            <p className="text-xs text-stone-600">
              Pagamento em processamento seguro via Mercado Pago. Você receberá a confirmação por e-mail em instantes.
            </p>
          )}

          {orderCompleted.paymentMethod === 'boleto' && (
            <p className="text-xs text-stone-600">
              O boleto bancário foi emitido com vencimento para 3 dias úteis.
            </p>
          )}

          <div className="border-t border-[#7C5236]/15 pt-3 text-xs text-stone-600 flex justify-between">
            <span>Total do Pedido:</span>
            <strong className="text-[#1E3A2B] text-base">
              R$ {orderCompleted.total.toFixed(2).replace('.', ',')}
            </strong>
          </div>
        </div>

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
        <h1 className="text-2xl sm:text-4xl font-serif font-bold text-sacred-shimmer">
          Finalização da Compra
        </h1>

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

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
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
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">CPF *</label>
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
                  onChange={(e) => setCep(e.target.value)}
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

          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25">
            <h3 className="font-serif font-bold text-lg text-[#3E2415] mb-5">
              3. Forma de Pagamento
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'pix', label: 'PIX', sub: 'Aprovação imediata', icon: QrCode },
                {
                  id: 'credit',
                  label: 'Cartão de Crédito',
                  sub: 'Até 6x sem juros',
                  icon: CreditCard,
                },
                {
                  id: 'boleto',
                  label: 'Boleto Bancário',
                  sub: 'Vencimento em 3 dias',
                  icon: FileText,
                },
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as typeof paymentMethod)}
                    className={`p-5 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                      active
                        ? 'border-[#2F523A] bg-[#E7F0EA] text-[#1E3A2B] shadow-sm'
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
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="glass-card p-6 rounded-2xl border border-[#7C5236]/30 space-y-4">
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
              {submitting ? 'Processando...' : 'Confirmar e Pagar'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 pt-2">
              <ShieldCheck className="w-4 h-4 text-[#2F523A]" />
              <span>Salvo com segurança na sua conta pessoal</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
