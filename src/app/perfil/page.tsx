'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { SicrediPaymentResultCard } from '@/components/SicrediPaymentWidgets';
import Link from 'next/link';
import {
  User,
  Package,
  LogOut,
  ShoppingBag,
  MapPin,
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Lock,
  Sparkles,
  XCircle,
} from 'lucide-react';

const STATUS_LABELS: Record<
  string,
  { label: string; className: string }
> = {
  awaiting_payment: {
    label: 'Aguardando Pagamento',
    className: 'bg-amber-50 border-amber-300 text-amber-800',
  },
  paid: {
    label: 'Pagamento Aprovado',
    className: 'bg-[#E7F0EA] border-[#2F523A]/30 text-[#1E3A2B]',
  },
  preparing: {
    label: 'Em Preparação',
    className: 'bg-blue-50 border-blue-200 text-blue-800',
  },
  shipped: {
    label: 'Enviado',
    className: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  },
  delivered: {
    label: 'Entregue',
    className: 'bg-[#E7F0EA] border-[#2F523A] text-[#1E3A2B]',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-red-50 border-red-200 text-red-700',
  },
};

export default function ProfilePage() {
  const {
    user,
    loading,
    logout,
    orders,
    addresses,
    addAddress,
    removeAddress,
    setDefaultAddress,
    updateProfile,
    changePassword,
    confirmOrderPayment,
    cancelUserOrder,
  } = useAuth();
  const { items: cartItems, subtotal, removeFromCart, updateQuantity } = useCart();

  const [activeTab, setActiveTab] = useState<'orders' | 'cart' | 'addresses' | 'settings'>(
    'orders'
  );

  // Profile form states
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [expandedPaymentOrderId, setExpandedPaymentOrderId] = useState<string | null>(null);

  // New Address form states
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrLabel, setAddrLabel] = useState('Casa');
  const [addrCep, setAddrCep] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrNumber, setAddrNumber] = useState('');
  const [addrComplement, setAddrComplement] = useState('');
  const [addrDistrict, setAddrDistrict] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('MG');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setCpf(user.cpf || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-xs text-stone-500">
        Carregando os dados exclusivos da sua conta...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="glass-card p-8 sm:p-10 rounded-3xl border border-[#7C5236]/30">
          <div className="w-16 h-16 bg-[#E7F0EA] rounded-full text-[#2F523A] flex items-center justify-center mx-auto mb-4 border border-[#2F523A]/30">
            <User className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#3E2415] mb-2">
            Acesse sua Conta Exclusiva
          </h2>
          <p className="text-stone-600 text-xs sm:text-sm mb-6 leading-relaxed">
            Entre com sua conta Google ou com seu e-mail e senha para visualizar seus pedidos, seu carrinho salvo e seus endereços de entrega.
          </p>
          <Link
            href="/login"
            className="bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white px-8 py-3.5 rounded-full text-xs font-extrabold uppercase tracking-wider hover:scale-105 transition inline-block shadow-md"
          >
            Entrar ou Criar Conta
          </Link>
        </div>
      </div>
    );
  }

  const formatCpf = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 11);
    if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
    return d;
  };

  const formatPhone = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 11);
    if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return d;
  };

  const handleAddrCepChange = async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, '').slice(0, 8);
    const formatted =
      digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setAddrCep(formatted);

    if (digits.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            if (data.logradouro) setAddrStreet(data.logradouro);
            if (data.bairro) setAddrDistrict(data.bairro);
            if (data.localidade) setAddrCity(data.localidade);
            if (data.uf) setAddrState(data.uf);
          }
        }
      } catch {}
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);
    setProfileError(null);

    if (newPassword.trim()) {
      if (newPassword !== confirmNewPassword) {
        setProfileError('As senhas digitadas não coincidem. Repita exatamente a mesma nova senha.');
        return;
      }
      const pwRes = await changePassword(newPassword.trim());
      if (!pwRes.ok) {
        setProfileError(pwRes.error || 'Erro ao alterar senha.');
        return;
      }
      setNewPassword('');
      setConfirmNewPassword('');
    }

    const res = await updateProfile({ name, cpf, phone });
    if (res.ok) {
      setProfileFeedback('Dados da sua conta atualizados e salvos com sucesso!');
      setTimeout(() => setProfileFeedback(null), 4000);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrCep || !addrStreet || !addrNumber || !addrCity) return;

    await addAddress({
      label: addrLabel || 'Casa',
      recipientName: user.name,
      phone: user.phone || phone,
      cep: addrCep,
      street: addrStreet,
      number: addrNumber,
      complement: addrComplement,
      district: addrDistrict,
      city: addrCity,
      state: addrState.toUpperCase(),
      isDefault: addresses.length === 0,
    });

    setAddrCep('');
    setAddrStreet('');
    setAddrNumber('');
    setAddrComplement('');
    setAddrDistrict('');
    setAddrCity('');
    setShowAddressForm(false);
  };

  const inputClass =
    'w-full bg-[#FAF7F2] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl p-3 text-xs sm:text-sm focus:outline-hidden focus:border-[#2F523A]';

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="border-b border-[#7C5236]/20 pb-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-[0.28em] text-[#2F523A] uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Conta Pessoal Isolada
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#3E2415] mt-1">
            Olá, {user.name}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Todos os itens abaixo pertencem exclusivamente à conta <strong>{user.email}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user.role === 'admin' && (
            <Link
              href="/admin"
              className="px-4 py-2 rounded-full bg-[#3E2415] text-white text-xs font-bold hover:bg-[#2F523A] transition"
            >
              Painel Admin
            </Link>
          )}
          <button
            onClick={logout}
            className="px-4 py-2 rounded-full bg-white border border-[#7C5236]/25 text-xs text-stone-600 hover:text-red-700 hover:border-red-300 transition flex items-center gap-1.5 cursor-pointer font-bold"
          >
            <LogOut className="w-4 h-4" /> Sair da Conta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar: Account Card & Navigation */}
        <div className="space-y-4">
          <div className="glass-card p-6 rounded-2xl border border-[#7C5236]/25 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2F523A] to-[#3E2415] rounded-full flex items-center justify-center text-white font-serif font-bold text-lg shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#3E2415] truncate">
                  {user.name}
                </h3>
                <span className="text-xs text-stone-500 block truncate">{user.email}</span>
              </div>
            </div>

            <div className="border-t border-[#7C5236]/15 pt-3 text-xs text-stone-600 space-y-2">
              <div className="flex justify-between">
                <span>Método de Login:</span>
                <strong className="text-[#2F523A] uppercase text-[11px]">
                  {user.provider === 'google' ? 'Google OAuth' : 'E-mail e Senha'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Meus Pedidos:</span>
                <strong className="text-[#3E2415]">{orders.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Itens no Meu Carrinho:</span>
                <strong className="text-[#2F523A]">{cartItems.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Endereços Salvos:</span>
                <strong className="text-[#3E2415]">{addresses.length}</strong>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="glass-card p-2 rounded-2xl border border-[#7C5236]/25 flex flex-col gap-1">
            {[
              {
                id: 'orders',
                label: `Meus Pedidos (${orders.length})`,
                icon: Package,
              },
              {
                id: 'cart',
                label: `Meu Carrinho Salvo (${cartItems.length})`,
                icon: ShoppingBag,
              },
              {
                id: 'addresses',
                label: `Meus Endereços (${addresses.length})`,
                icon: MapPin,
              },
              {
                id: 'settings',
                label: 'Meus Dados e Senha',
                icon: Settings,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                    active
                      ? 'bg-[#2F523A] text-white shadow-xs'
                      : 'text-[#3E2415] hover:bg-[#E7F0EA]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3">
          {/* TAB 1: MEUS PEDIDOS (Strictly isolated to user.id) */}
          {activeTab === 'orders' && (
            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25 space-y-5">
              <div className="flex items-center justify-between border-b border-[#7C5236]/15 pb-4">
                <h2 className="font-serif font-bold text-lg sm:text-xl text-[#3E2415] flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#2F523A]" /> Histórico de Pedidos da Sua Conta
                </h2>
                <span className="text-xs text-stone-500">
                  {orders.length} {orders.length === 1 ? 'pedido registrado' : 'pedidos registrados'}
                </span>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-12 px-4 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#7C5236]/30">
                  <Package className="w-10 h-10 text-[#7C5236]/60 mx-auto mb-3" />
                  <h3 className="font-serif font-bold text-base text-[#3E2415] mb-1">
                    Você ainda não realizou pedidos nesta conta
                  </h3>
                  <p className="text-xs text-stone-500 max-w-md mx-auto mb-5">
                    Assim que você finalizar uma compra, seu pedido ficará salvo aqui exclusivamente para você acompanhar o status e a entrega.
                  </p>
                  <Link
                    href="/produtos"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:scale-105 transition"
                  >
                    <Sparkles className="w-4 h-4" /> Explorar Catálogo da Loja
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const st = STATUS_LABELS[order.status] || STATUS_LABELS.awaiting_payment;
                    return (
                      <div
                        key={order.id}
                        className="border border-[#7C5236]/25 rounded-2xl p-5 bg-[#FAF7F2] space-y-3 text-xs"
                      >
                        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#7C5236]/15 pb-3">
                          <div>
                            <span className="font-bold text-[#3E2415] font-mono text-sm">
                              #{order.orderNumber}
                            </span>
                            <span className="text-stone-500 ml-3">Data: {order.createdAt}</span>
                          </div>
                          <span
                            className={`border font-bold px-3 py-1 rounded-full text-[11px] ${st.className}`}
                          >
                            {st.label}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <span className="font-bold text-[#3E2415] block">Itens do Pedido:</span>
                          {order.items.map((item, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-stone-700 bg-white/80 px-3 py-2 rounded-xl border border-[#7C5236]/10"
                            >
                              <span>
                                <strong>{item.quantity}x</strong> {item.productName}
                                {item.variantName ? ` (${item.variantName})` : ''}
                              </span>
                              <strong className="text-[#1E3A2B]">
                                R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                              </strong>
                            </div>
                          ))}
                        </div>

                        {order.address?.street && (
                          <div className="text-[11px] text-stone-600 pt-1">
                            <strong>Entrega:</strong> {order.address.street}, {order.address.number}
                            {order.address.complement ? ` - ${order.address.complement}` : ''} —{' '}
                            {order.address.district}, {order.address.city}/{order.address.state} (CEP:{' '}
                            {order.address.cep})
                          </div>
                        )}

                        <div className="flex flex-wrap justify-between items-center pt-3 border-t border-[#7C5236]/15 gap-2">
                          <div className="flex items-center gap-3 text-[11px] text-stone-500">
                            <span>
                              Pagamento:{' '}
                              <strong className="uppercase text-[#3E2415]">
                                {order.paymentMethod === 'pix'
                                  ? 'PIX Sicredi'
                                  : order.paymentMethod === 'credit_card' || order.paymentMethod === 'credit'
                                  ? 'Cartão de Crédito Sicredi'
                                  : order.paymentMethod === 'debit_card'
                                  ? 'Cartão de Débito Sicredi'
                                  : 'Boleto Híbrido Sicredi (748)'}
                                {order.sicrediPayment?.transactionId
                                  ? ` • ID: ${order.sicrediPayment.transactionId}`
                                  : ''}
                              </strong>
                            </span>
                            {order.trackingCode && (
                              <span>
                                Rastreio:{' '}
                                <strong className="text-[#2F523A]">{order.trackingCode}</strong>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            {order.sicrediPayment && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedPaymentOrderId(
                                    expandedPaymentOrderId === order.id ? null : order.id
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E7F0EA] hover:bg-[#2F523A] text-[#1E3A2B] hover:text-white border border-[#2F523A]/30 text-[11px] font-bold transition cursor-pointer"
                              >
                                {expandedPaymentOrderId === order.id
                                  ? 'Ocultar Dados Sicredi'
                                  : order.paymentMethod === 'pix'
                                  ? 'Ver QR Code PIX Sicredi'
                                  : order.paymentMethod === 'boleto'
                                  ? '2ª Via Boleto Sicredi 748'
                                  : 'Ver Comprovante Sicredi'}
                              </button>
                            )}
                            {order.status === 'awaiting_payment' && (
                              <button
                                type="button"
                                onClick={() => cancelUserOrder(order.id)}
                                className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:underline font-semibold cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Cancelar pedido
                              </button>
                            )}
                            <strong className="text-[#1E3A2B] text-sm sm:text-base">
                              Total: R$ {order.total.toFixed(2).replace('.', ',')}
                            </strong>
                          </div>
                        </div>

                        {expandedPaymentOrderId === order.id && order.sicrediPayment && (
                          <div className="pt-3">
                            <SicrediPaymentResultCard
                              orderNumber={order.orderNumber}
                              total={order.total}
                              customerName={order.customer.name}
                              customerCpf={order.customer.cpf}
                              customerAddress={`${order.address.street}, ${order.address.number} - ${order.address.district}, ${order.address.city}/${order.address.state}`}
                              paymentMethod={order.paymentMethod}
                              sicrediData={order.sicrediPayment}
                              orderStatus={order.status === 'paid' ? 'paid' : 'awaiting_payment'}
                              onSimulatePaid={() => confirmOrderPayment(order.id)}
                            />
                          </div>
                        )}
                        <div className="hidden">
                          <div>
                            <strong>
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MEU CARRINHO SALVO (Strictly isolated to user.id) */}
          {activeTab === 'cart' && (
            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25 space-y-5">
              <div className="flex items-center justify-between border-b border-[#7C5236]/15 pb-4">
                <h2 className="font-serif font-bold text-lg sm:text-xl text-[#3E2415] flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#2F523A]" /> Itens Salvos no Carrinho da Sua Conta
                </h2>
                <span className="text-xs font-bold text-[#2F523A]">
                  Subtotal: R$ {subtotal.toFixed(2).replace('.', ',')}
                </span>
              </div>

              {cartItems.length === 0 ? (
                <div className="text-center py-12 px-4 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#7C5236]/30">
                  <ShoppingBag className="w-10 h-10 text-[#7C5236]/60 mx-auto mb-3" />
                  <h3 className="font-serif font-bold text-base text-[#3E2415] mb-1">
                    Seu carrinho pessoal está vazio
                  </h3>
                  <p className="text-xs text-stone-500 max-w-md mx-auto mb-5">
                    Qualquer produto que você adicionar ao carrinho enquanto estiver conectado ficará salvo na sua conta.
                  </p>
                  <Link
                    href="/produtos"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider"
                  >
                    Adicionar Produtos
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {cartItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#FAF7F2] border border-[#7C5236]/20"
                      >
                        <div>
                          <Link
                            href={`/produto/${item.product.slug}`}
                            className="font-serif font-bold text-sm text-[#3E2415] hover:text-[#2F523A]"
                          >
                            {item.product.name}
                          </Link>
                          {item.variant_name && (
                            <span className="block text-[11px] text-stone-500">
                              Opção: {item.variant_name}
                            </span>
                          )}
                          <span className="text-xs font-bold text-[#2F523A]">
                            R$ {item.price.toFixed(2).replace('.', ',')} cada
                          </span>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="flex items-center border border-[#7C5236]/30 rounded-xl bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity - 1,
                                  item.variant_name
                                )
                              }
                              className="px-3 py-1 text-xs font-bold text-[#3E2415] cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-bold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity + 1,
                                  item.variant_name
                                )
                              }
                              className="px-3 py-1 text-xs font-bold text-[#3E2415] cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <strong className="text-sm text-[#1E3A2B] min-w-[85px] text-right">
                            R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                          </strong>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id, item.variant_name)}
                            className="p-2 text-stone-400 hover:text-red-600 cursor-pointer"
                            title="Remover item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-3">
                    <Link
                      href="/checkout"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-[#2F523A] to-[#3E2415] text-white px-7 py-3.5 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-md hover:brightness-110 transition"
                    >
                      Finalizar Compra Agora <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MEUS ENDEREÇOS (Strictly isolated to user.id) */}
          {activeTab === 'addresses' && (
            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25 space-y-5">
              <div className="flex items-center justify-between border-b border-[#7C5236]/15 pb-4">
                <h2 className="font-serif font-bold text-lg sm:text-xl text-[#3E2415] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#2F523A]" /> Meus Endereços de Entrega
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAddressForm(!showAddressForm)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#2F523A] text-white text-xs font-bold hover:bg-[#1E3A2B] transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Novo Endereço
                </button>
              </div>

              {showAddressForm && (
                <form
                  onSubmit={handleAddAddress}
                  className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#7C5236]/30 space-y-4"
                >
                  <h4 className="font-serif font-bold text-sm text-[#3E2415]">
                    Cadastrar Novo Endereço na Sua Conta
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#3E2415] mb-1">
                        Identificação (Ex: Casa, Trabalho)
                      </label>
                      <input
                        type="text"
                        required
                        value={addrLabel}
                        onChange={(e) => setAddrLabel(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#3E2415] mb-1">CEP *</label>
                      <input
                        type="text"
                        required
                        placeholder="00000-000"
                        value={addrCep}
                        onChange={(e) => handleAddrCepChange(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#3E2415] mb-1">
                        Número *
                      </label>
                      <input
                        type="text"
                        required
                        value={addrNumber}
                        onChange={(e) => setAddrNumber(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[#3E2415] mb-1">
                        Rua / Logradouro *
                      </label>
                      <input
                        type="text"
                        required
                        value={addrStreet}
                        onChange={(e) => setAddrStreet(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#3E2415] mb-1">
                        Complemento
                      </label>
                      <input
                        type="text"
                        value={addrComplement}
                        onChange={(e) => setAddrComplement(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#3E2415] mb-1">
                        Bairro *
                      </label>
                      <input
                        type="text"
                        required
                        value={addrDistrict}
                        onChange={(e) => setAddrDistrict(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#3E2415] mb-1">
                        Cidade *
                      </label>
                      <input
                        type="text"
                        required
                        value={addrCity}
                        onChange={(e) => setAddrCity(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#3E2415] mb-1">
                        Estado (UF) *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={2}
                        value={addrState}
                        onChange={(e) => setAddrState(e.target.value.toUpperCase())}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-200 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#2F523A] text-white text-xs font-bold hover:bg-[#1E3A2B] cursor-pointer"
                    >
                      Salvar Endereço
                    </button>
                  </div>
                </form>
              )}

              {addresses.length === 0 ? (
                <div className="text-center py-10 px-4 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#7C5236]/30 text-xs text-stone-500">
                  Nenhum endereço salvo na sua conta ainda. Clique em <strong>Novo Endereço</strong> acima ou finalize um pedido para salvar automaticamente.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-5 rounded-2xl border text-xs space-y-2 ${
                        addr.isDefault
                          ? 'bg-[#E7F0EA]/60 border-[#2F523A]'
                          : 'bg-[#FAF7F2] border-[#7C5236]/25'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-sm text-[#3E2415]">
                          {addr.label}
                        </span>
                        {addr.isDefault ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#2F523A] text-white text-[10px] font-bold">
                            Padrão
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDefaultAddress(addr.id)}
                            className="text-[11px] text-[#2F523A] hover:underline font-semibold cursor-pointer"
                          >
                            Tornar padrão
                          </button>
                        )}
                      </div>
                      <p className="text-stone-700">
                        {addr.street}, {addr.number}
                        {addr.complement ? ` - ${addr.complement}` : ''}
                      </p>
                      <p className="text-stone-500">
                        {addr.district} — {addr.city}/{addr.state} • CEP: {addr.cep}
                      </p>
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeAddress(addr.id)}
                          className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:underline cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MEUS DADOS E SENHA */}
          {activeTab === 'settings' && (
            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25 space-y-6">
              <div className="border-b border-[#7C5236]/15 pb-4">
                <h2 className="font-serif font-bold text-lg sm:text-xl text-[#3E2415] flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#2F523A]" /> Dados Pessoais e Segurança
                </h2>
              </div>

              {profileError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  {profileError}
                </div>
              )}

              {profileFeedback && (
                <div className="p-3.5 rounded-xl bg-[#E7F0EA] border border-[#2F523A]/40 text-[#1E3A2B] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2F523A]" />
                  <span>{profileFeedback}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#3E2415] mb-1.5">
                      Nome Completo
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
                    <label className="block text-xs font-bold text-[#3E2415] mb-1.5">
                      E-mail da Conta (Identificador Único)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full bg-stone-100 border border-stone-300 text-stone-500 rounded-xl p-3 text-xs sm:text-sm cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#3E2415] mb-1.5">CPF</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatCpf(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#3E2415] mb-1.5">
                      WhatsApp / Telefone
                    </label>
                    <input
                      type="text"
                      placeholder="(00) 90000-0000"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#7C5236]/15 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#3E2415] mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#2F523A]" /> Nova Senha (deixe em branco para manter)
                    </label>
                    <input
                      type="password"
                      minLength={6}
                      placeholder="Nova senha (mín. 6 caracteres)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#3E2415] mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#2F523A]" /> Repetir a Nova Senha
                    </label>
                    <input
                      type="password"
                      minLength={6}
                      placeholder="Digite exatamente a mesma senha"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-[#2F523A] to-[#3E2415] hover:brightness-110 text-white font-extrabold px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-md cursor-pointer"
                  >
                    Salvar Alterações na Minha Conta
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
