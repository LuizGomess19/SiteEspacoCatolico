'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabaseClient, isSupabaseActive } from '@/lib/supabase/client';
import {
  saveAccountToCloud,
  fetchAccountFromCloud,
  saveUserAddressesToCloud,
  fetchUserAddressesFromCloud,
  saveUserOrdersToCloud,
  fetchUserOrdersFromCloud,
  saveUserCartToCloud,
} from '@/lib/cloud/sync';

export type User = {
  id: string;
  email: string;
  name: string;
  cpf?: string;
  phone?: string;
  avatar_url?: string;
  provider: 'email' | 'google';
  role: 'customer' | 'admin';
  createdAt: string;
};

export type SavedAddress = {
  id: string;
  userId: string;
  label: string;
  recipientName: string;
  phone?: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  isDefault: boolean;
};

export type CustomerOrderItem = {
  productId: string;
  productName: string;
  productSlug: string;
  variantName?: string;
  quantity: number;
  price: number;
};

export type CustomerOrder = {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'awaiting_payment' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  customer: { name: string; email: string; cpf: string; phone: string };
  address: {
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    cep: string;
  };
  paymentMethod: 'pix' | 'credit' | 'boleto';
  subtotal: number;
  shipping: number;
  total: number;
  trackingCode?: string;
  items: CustomerOrderItem[];
  createdAt: string;
};

type StoredAccountRecord = User & {
  passwordHash: string;
};

type AuthResult = {
  ok: boolean;
  error?: string;
  user?: User;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isCloudConnected: boolean;
  addresses: SavedAddress[];
  orders: CustomerOrder[];
  // Auth actions
  login: (email: string, role?: 'customer' | 'admin') => void;
  loginWithEmail: (email: string, password: string, asAdmin?: boolean) => Promise<AuthResult>;
  registerWithEmail: (params: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    cpf?: string;
    asAdmin?: boolean;
  }) => Promise<AuthResult>;
  loginWithGoogle: (googleProfile?: {
    email: string;
    name: string;
    avatar_url?: string;
  }) => Promise<AuthResult>;
  resetPassword: (email: string, newPassword?: string) => Promise<AuthResult>;
  updateProfile: (data: {
    name?: string;
    cpf?: string;
    phone?: string;
    avatar_url?: string;
  }) => Promise<AuthResult>;
  changePassword: (newPassword: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  // Per-user data actions
  addAddress: (address: Omit<SavedAddress, 'id' | 'userId'>) => Promise<SavedAddress | null>;
  removeAddress: (addressId: string) => Promise<void>;
  setDefaultAddress: (addressId: string) => Promise<void>;
  recordUserOrder: (
    orderData: Omit<CustomerOrder, 'id' | 'userId' | 'createdAt' | 'status'>
  ) => Promise<CustomerOrder>;
  cancelUserOrder: (orderId: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
};

const ACCOUNTS_DB_KEY = 'santo_antonio_accounts_db_v2';
const ACTIVE_SESSION_KEY = 'santo_antonio_active_session_v2';

function getAddressesKey(userId: string) {
  return `santo_antonio_addresses_user_${userId}`;
}

function getOrdersKey(userId: string) {
  return `santo_antonio_orders_user_${userId}`;
}

function simpleHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function deterministicUserId(email: string): string {
  const clean = email.trim().toLowerCase();
  const h1 = simpleHash(`sa_uid_1_${clean}`).padStart(8, '0');
  const h2 = simpleHash(`sa_uid_2_${clean}`).padStart(8, '0');
  return `usr_${h1}${h2}`;
}

function readAccountsDb(): Record<string, StoredAccountRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ACCOUNTS_DB_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAccountsDb(db: Record<string, StoredAccountRecord>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to save accounts DB', e);
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [isCloudConnected, setIsCloudConnected] = useState(true);

  // Sync any existing local accounts on this device up to the Cloud Database
  // so accounts created earlier on the computer become immediately available on mobile
  const pushLocalAccountsToCloud = useCallback(async () => {
    try {
      const db = readAccountsDb();
      for (const email of Object.keys(db)) {
        const acc = db[email];
        if (acc && acc.email) {
          await saveAccountToCloud(acc);
          // Also sync that user's local cart, addresses & orders to cloud if present
          const rawCart = localStorage.getItem(`santo_antonio_cart_user_${acc.id}`);
          if (rawCart) {
            const parsedCart = JSON.parse(rawCart);
            if (Array.isArray(parsedCart) && parsedCart.length > 0) {
              await saveUserCartToCloud(acc.id, parsedCart);
            }
          }
          const rawAddr = localStorage.getItem(getAddressesKey(acc.id));
          if (rawAddr) {
            const parsedAddr = JSON.parse(rawAddr);
            if (Array.isArray(parsedAddr) && parsedAddr.length > 0) {
              await saveUserAddressesToCloud(acc.id, parsedAddr);
            }
          }
          const rawOrd = localStorage.getItem(getOrdersKey(acc.id));
          if (rawOrd) {
            const parsedOrd = JSON.parse(rawOrd);
            if (Array.isArray(parsedOrd) && parsedOrd.length > 0) {
              await saveUserOrdersToCloud(acc.id, parsedOrd);
            }
          }
        }
      }
    } catch {}
  }, []);

  // Load strictly isolated data for a given userId (from Local + Cloud KV + Supabase)
  const loadIsolatedUserData = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setAddresses([]);
      setOrders([]);
      return;
    }

    // 1. Load from per-user localStorage namespace first (instant)
    let localAddresses: SavedAddress[] = [];
    let localOrders: CustomerOrder[] = [];

    try {
      const rawAddr = localStorage.getItem(getAddressesKey(currentUser.id));
      if (rawAddr) localAddresses = JSON.parse(rawAddr);
    } catch {}

    try {
      const rawOrd = localStorage.getItem(getOrdersKey(currentUser.id));
      if (rawOrd) localOrders = JSON.parse(rawOrd);
    } catch {}

    setAddresses(localAddresses);
    setOrders(localOrders);

    // 2. Sync from Cross-Device Cloud KV Store (Computer <-> Mobile)
    try {
      const [cloudAddresses, cloudOrders] = await Promise.all([
        fetchUserAddressesFromCloud(currentUser.id),
        fetchUserOrdersFromCloud(currentUser.id),
      ]);

      if (cloudAddresses && cloudAddresses.length > 0) {
        setAddresses(cloudAddresses);
        localStorage.setItem(getAddressesKey(currentUser.id), JSON.stringify(cloudAddresses));
      } else if (localAddresses.length > 0) {
        await saveUserAddressesToCloud(currentUser.id, localAddresses);
      }

      if (cloudOrders && cloudOrders.length > 0) {
        setOrders(cloudOrders);
        localStorage.setItem(getOrdersKey(currentUser.id), JSON.stringify(cloudOrders));
      } else if (localOrders.length > 0) {
        await saveUserOrdersToCloud(currentUser.id, localOrders);
      }
    } catch (e) {
      console.warn('Cloud KV user data sync skipped:', e);
    }

    // 3. If Supabase is configured & user has a UUID session, sync from Supabase RLS tables
    const sb = getSupabaseClient();
    if (sb) {
      try {
        const { data: sessionData } = await sb.auth.getSession();
        const sbUser = sessionData?.session?.user;
        if (sbUser && sbUser.id === currentUser.id) {
          const { data: dbAddresses } = await sb
            .from('addresses')
            .select('*')
            .eq('user_id', sbUser.id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });

          if (dbAddresses && dbAddresses.length > 0) {
            const mappedAddresses: SavedAddress[] = dbAddresses.map((a: any) => ({
              id: a.id,
              userId: a.user_id,
              label: a.label || 'Casa',
              recipientName: a.recipient_name || currentUser.name,
              phone: a.phone || currentUser.phone || '',
              cep: a.cep,
              street: a.street,
              number: a.number,
              complement: a.complement || '',
              district: a.district,
              city: a.city,
              state: a.state,
              isDefault: Boolean(a.is_default),
            }));
            setAddresses(mappedAddresses);
            localStorage.setItem(getAddressesKey(currentUser.id), JSON.stringify(mappedAddresses));
          }

          const { data: dbOrders } = await sb
            .from('orders')
            .select('*, order_items(*)')
            .eq('user_id', sbUser.id)
            .order('created_at', { ascending: false });

          if (dbOrders && dbOrders.length > 0) {
            const mappedOrders: CustomerOrder[] = dbOrders.map((o: any) => ({
              id: o.id,
              orderNumber: o.order_number,
              userId: o.user_id,
              status: o.status || 'awaiting_payment',
              customer: {
                name: o.customer_name || currentUser.name,
                email: o.customer_email || currentUser.email,
                cpf: o.customer_cpf || currentUser.cpf || '',
                phone: o.customer_phone || currentUser.phone || '',
              },
              address: {
                street: o.shipping_address?.street || '',
                number: o.shipping_address?.number || '',
                complement: o.shipping_address?.complement || '',
                district: o.shipping_address?.district || '',
                city: o.shipping_address?.city || '',
                state: o.shipping_address?.state || '',
                cep: o.shipping_address?.cep || '',
              },
              paymentMethod: (o.payment_method as 'pix' | 'credit' | 'boleto') || 'pix',
              subtotal: Number(o.subtotal || 0),
              shipping: Number(o.shipping_cost || 0),
              total: Number(o.total || 0),
              trackingCode: o.tracking_code || undefined,
              items: Array.isArray(o.order_items)
                ? o.order_items.map((item: any) => ({
                    productId: item.product_id || item.id,
                    productName: item.product_name,
                    productSlug: item.product_slug || '',
                    variantName: item.variant_name || undefined,
                    quantity: Number(item.quantity || 1),
                    price: Number(item.unit_price || 0),
                  }))
                : [],
              createdAt: o.created_at
                ? new Date(o.created_at).toLocaleDateString('pt-BR')
                : new Date().toLocaleDateString('pt-BR'),
            }));
            setOrders(mappedOrders);
            localStorage.setItem(getOrdersKey(currentUser.id), JSON.stringify(mappedOrders));
          }
        }
      } catch (e) {
        console.warn('Supabase user data sync skipped:', e);
      }
    }
  }, []);

  // Initialize session on mount & push any local accounts to cloud
  useEffect(() => {
    setIsCloudConnected(true);
    pushLocalAccountsToCloud();

    const initAuth = async () => {
      const sb = getSupabaseClient();

      if (sb) {
        try {
          const { data } = await sb.auth.getSession();
          const sbUser = data?.session?.user;
          if (sbUser) {
            const { data: profile } = await sb
              .from('profiles')
              .select('*')
              .eq('id', sbUser.id)
              .maybeSingle();

            const hydratedUser: User = {
              id: sbUser.id,
              email: sbUser.email || profile?.email || '',
              name:
                profile?.full_name ||
                sbUser.user_metadata?.full_name ||
                sbUser.user_metadata?.name ||
                (sbUser.email ? sbUser.email.split('@')[0] : 'Cliente'),
              cpf: profile?.cpf || sbUser.user_metadata?.cpf || '',
              phone: profile?.phone || sbUser.user_metadata?.phone || '',
              avatar_url:
                profile?.avatar_url ||
                sbUser.user_metadata?.avatar_url ||
                sbUser.user_metadata?.picture ||
                '',
              provider: sbUser.app_metadata?.provider === 'google' ? 'google' : 'email',
              role: profile?.role === 'admin' ? 'admin' : 'customer',
              createdAt: sbUser.created_at || new Date().toISOString(),
            };

            setUser(hydratedUser);
            localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(hydratedUser));
            await loadIsolatedUserData(hydratedUser);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Supabase session check failed, using local/cloud session:', e);
        }
      }

      // Check local active session
      try {
        const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
        if (saved) {
          const parsedUser: User = JSON.parse(saved);
          setUser(parsedUser);
          await loadIsolatedUserData(parsedUser);
        }
      } catch {}

      setLoading(false);
    };

    initAuth();

    const sb = getSupabaseClient();
    if (sb) {
      const { data: sub } = sb.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const sbUser = session.user;
          const { data: profile } = await sb
            .from('profiles')
            .select('*')
            .eq('id', sbUser.id)
            .maybeSingle();

          const hydratedUser: User = {
            id: sbUser.id,
            email: sbUser.email || '',
            name:
              profile?.full_name ||
              sbUser.user_metadata?.full_name ||
              sbUser.user_metadata?.name ||
              (sbUser.email ? sbUser.email.split('@')[0] : 'Cliente'),
            cpf: profile?.cpf || sbUser.user_metadata?.cpf || '',
            phone: profile?.phone || sbUser.user_metadata?.phone || '',
            avatar_url:
              profile?.avatar_url ||
              sbUser.user_metadata?.avatar_url ||
              sbUser.user_metadata?.picture ||
              '',
            provider: sbUser.app_metadata?.provider === 'google' ? 'google' : 'email',
            role: profile?.role === 'admin' ? 'admin' : 'customer',
            createdAt: sbUser.created_at || new Date().toISOString(),
          };
          setUser(hydratedUser);
          localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(hydratedUser));
          await loadIsolatedUserData(hydratedUser);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setAddresses([]);
          setOrders([]);
          localStorage.removeItem(ACTIVE_SESSION_KEY);
        }
      });

      return () => {
        sub.subscription.unsubscribe();
      };
    }
  }, [loadIsolatedUserData, pushLocalAccountsToCloud]);

  // Register a new user account via Email & Password (saves to Cloud KV + Supabase + Local)
  const registerWithEmail = async ({
    name,
    email,
    password,
    phone,
    cpf,
    asAdmin = false,
  }: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    cpf?: string;
    asAdmin?: boolean;
  }): Promise<AuthResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName || cleanName.length < 2) {
      return { ok: false, error: 'Informe seu nome completo.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Informe um e-mail válido.' };
    }
    if (!password || password.length < 6) {
      return { ok: false, error: 'A senha deve ter pelo menos 6 caracteres.' };
    }

    // Check if account already exists in Cloud KV or Local DB
    const existingCloud = await fetchAccountFromCloud(cleanEmail);
    const db = readAccountsDb();
    if (existingCloud || db[cleanEmail]) {
      return {
        ok: false,
        error: 'Este e-mail já possui cadastro. Acesse a aba "Entrar na Conta" para fazer login.',
      };
    }

    const sb = getSupabaseClient();
    let userId = deterministicUserId(cleanEmail);

    if (sb) {
      try {
        const { data, error } = await sb.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              phone: phone?.trim() || '',
              cpf: cpf?.trim() || '',
              accepted_terms: true,
            },
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes('already registered')) {
            return {
              ok: false,
              error: 'Este e-mail já possui cadastro. Faça login com sua senha.',
            };
          }
        } else if (data?.user?.id) {
          userId = data.user.id;
          await sb.from('profiles').upsert(
            {
              id: userId,
              email: cleanEmail,
              full_name: cleanName,
              phone: phone?.trim() || null,
              cpf: cpf?.trim() || null,
              auth_provider: 'email',
            },
            { onConflict: 'id' }
          );
        }
      } catch (e: any) {
        console.warn('Supabase signup fallback to Cloud KV:', e);
      }
    }

    const newUser: User = {
      id: userId,
      email: cleanEmail,
      name: cleanName,
      cpf: cpf?.trim() || '',
      phone: phone?.trim() || '',
      provider: 'email',
      role: asAdmin ? 'admin' : 'customer',
      createdAt: new Date().toISOString(),
    };

    const accountRecord: StoredAccountRecord = {
      ...newUser,
      passwordHash: simpleHash(password),
    };

    // Save locally AND to Cloud Database so computer & mobile phone share the account immediately!
    db[cleanEmail] = accountRecord;
    writeAccountsDb(db);
    await saveAccountToCloud(accountRecord);

    setUser(newUser);
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(newUser));
    await loadIsolatedUserData(newUser);

    return { ok: true, user: newUser };
  };

  // Sign in with Email & Password (checks Supabase + Cloud KV Database + Local DB)
  const loginWithEmail = async (
    email: string,
    password: string,
    asAdmin = false
  ): Promise<AuthResult> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { ok: false, error: 'Preencha seu e-mail e sua senha.' };
    }

    const sb = getSupabaseClient();
    if (sb) {
      try {
        const { data, error } = await sb.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!error && data?.user) {
          const sbUser = data.user;
          const { data: profile } = await sb
            .from('profiles')
            .select('*')
            .eq('id', sbUser.id)
            .maybeSingle();

          const loggedUser: User = {
            id: sbUser.id,
            email: sbUser.email || cleanEmail,
            name:
              profile?.full_name ||
              sbUser.user_metadata?.full_name ||
              cleanEmail.split('@')[0],
            cpf: profile?.cpf || sbUser.user_metadata?.cpf || '',
            phone: profile?.phone || sbUser.user_metadata?.phone || '',
            avatar_url: profile?.avatar_url || '',
            provider: 'email',
            role: asAdmin || profile?.role === 'admin' ? 'admin' : 'customer',
            createdAt: sbUser.created_at || new Date().toISOString(),
          };

          setUser(loggedUser);
          localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(loggedUser));
          await loadIsolatedUserData(loggedUser);
          return { ok: true, user: loggedUser };
        }
      } catch (e) {
        console.warn('Supabase login fallback to Cloud KV:', e);
      }
    }

    // 1. Check Cloud Database first (so an account created on the computer is found on the cell phone!)
    const db = readAccountsDb();
    let account: StoredAccountRecord | null = await fetchAccountFromCloud(cleanEmail);

    if (account) {
      // Cache cloud account into local device storage
      db[cleanEmail] = account;
      writeAccountsDb(db);
    } else if (db[cleanEmail]) {
      // Found in local device storage; upload it to Cloud so other devices can access it too
      account = db[cleanEmail];
      await saveAccountToCloud(account);
    }

    if (!account) {
      return {
        ok: false,
        error:
          'Nenhuma conta encontrada com este e-mail. Clique na aba "Criar Nova Conta" para se cadastrar.',
      };
    }

    if (account.passwordHash !== simpleHash(password)) {
      return {
        ok: false,
        error:
          'Senha incorreta para esta conta. Verifique sua senha ou clique em "Esqueceu a senha?".',
      };
    }

    const loggedUser: User = {
      id: account.id,
      email: account.email,
      name: account.name,
      cpf: account.cpf,
      phone: account.phone,
      avatar_url: account.avatar_url,
      provider: account.provider,
      role: asAdmin ? 'admin' : account.role,
      createdAt: account.createdAt,
    };

    setUser(loggedUser);
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(loggedUser));
    await loadIsolatedUserData(loggedUser);
    return { ok: true, user: loggedUser };
  };

  // Sign in or Register with Google Account (synced to Cloud Database across Computer & Mobile)
  const loginWithGoogle = async (googleProfile?: {
    email: string;
    name: string;
    avatar_url?: string;
  }): Promise<AuthResult> => {
    const sb = getSupabaseClient();

    if (sb && !googleProfile && isSupabaseActive()) {
      try {
        const redirectTo =
          typeof window !== 'undefined'
            ? `${window.location.origin}${window.location.pathname.replace(/\/login\/?$/, '/perfil')}`
            : undefined;

        const { error } = await sb.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account',
            },
          },
        });

        if (error) {
          return { ok: false, error: `Erro ao conectar com Google no Supabase: ${error.message}` };
        }
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e?.message || 'Erro ao iniciar login com Google.' };
      }
    }

    if (!googleProfile || !googleProfile.email) {
      return { ok: false, error: 'Selecione ou informe sua conta Google para continuar.' };
    }

    const cleanEmail = googleProfile.email.trim().toLowerCase();
    const cleanName = googleProfile.name?.trim() || cleanEmail.split('@')[0];

    const db = readAccountsDb();
    const cloudExisting = await fetchAccountFromCloud(cleanEmail);
    const existing = cloudExisting || db[cleanEmail];

    const googleUser: User = existing
      ? {
          id: existing.id,
          email: existing.email,
          name: cleanName || existing.name,
          cpf: existing.cpf,
          phone: existing.phone,
          avatar_url: googleProfile.avatar_url || existing.avatar_url,
          provider: 'google',
          role: existing.role,
          createdAt: existing.createdAt,
        }
      : {
          id: deterministicUserId(cleanEmail),
          email: cleanEmail,
          name: cleanName,
          cpf: '',
          phone: '',
          avatar_url: googleProfile.avatar_url || '',
          provider: 'google',
          role: 'customer',
          createdAt: new Date().toISOString(),
        };

    const accountRecord: StoredAccountRecord = {
      ...googleUser,
      passwordHash: existing?.passwordHash || simpleHash(`google_oauth_${cleanEmail}`),
    };

    db[cleanEmail] = accountRecord;
    writeAccountsDb(db);
    await saveAccountToCloud(accountRecord);

    setUser(googleUser);
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(googleUser));
    await loadIsolatedUserData(googleUser);

    return { ok: true, user: googleUser };
  };

  // Legacy quick login helper
  const login = (email: string, role: 'customer' | 'admin' = 'customer') => {
    const cleanEmail = email.trim().toLowerCase();
    const uid = deterministicUserId(cleanEmail);
    const db = readAccountsDb();
    const existing = db[cleanEmail];

    const activeUser: User = existing
      ? { ...existing, role }
      : {
          id: uid,
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          provider: 'email',
          role,
          createdAt: new Date().toISOString(),
        };

    setUser(activeUser);
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(activeUser));
    loadIsolatedUserData(activeUser);
  };

  // Password recovery / reset (updates Cloud Database + Local DB)
  const resetPassword = async (email: string, newPassword?: string): Promise<AuthResult> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Informe um e-mail válido.' };
    }

    const sb = getSupabaseClient();
    if (sb && !newPassword) {
      try {
        const { error } = await sb.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e?.message || 'Erro ao enviar e-mail de recuperação.' };
      }
    }

    const db = readAccountsDb();
    const cloudAccount = await fetchAccountFromCloud(cleanEmail);
    const account = cloudAccount || db[cleanEmail];

    if (!account) {
      return { ok: false, error: 'Nenhuma conta encontrada com este e-mail.' };
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return { ok: false, error: 'A nova senha deve ter pelo menos 6 caracteres.' };
      }
      account.passwordHash = simpleHash(newPassword);
      db[cleanEmail] = account;
      writeAccountsDb(db);
      await saveAccountToCloud(account);
    }

    return { ok: true };
  };

  // Update logged-in user's personal profile (updates Cloud Database + Supabase + Local)
  const updateProfile = async (data: {
    name?: string;
    cpf?: string;
    phone?: string;
    avatar_url?: string;
  }): Promise<AuthResult> => {
    if (!user) return { ok: false, error: 'Você precisa estar logado.' };

    const updatedUser: User = {
      ...user,
      name: data.name !== undefined ? data.name.trim() : user.name,
      cpf: data.cpf !== undefined ? data.cpf.trim() : user.cpf,
      phone: data.phone !== undefined ? data.phone.trim() : user.phone,
      avatar_url: data.avatar_url !== undefined ? data.avatar_url.trim() : user.avatar_url,
    };

    const sb = getSupabaseClient();
    if (sb) {
      try {
        await sb
          .from('profiles')
          .update({
            full_name: updatedUser.name,
            cpf: updatedUser.cpf || null,
            phone: updatedUser.phone || null,
            avatar_url: updatedUser.avatar_url || null,
          })
          .eq('id', user.id);
      } catch (e) {
        console.warn('Supabase profile update warning:', e);
      }
    }

    const db = readAccountsDb();
    const cleanEmail = user.email.toLowerCase();
    const existingRecord = db[cleanEmail] || (await fetchAccountFromCloud(cleanEmail));
    const updatedRecord: StoredAccountRecord = {
      ...updatedUser,
      passwordHash: existingRecord?.passwordHash || simpleHash(`usr_${cleanEmail}`),
    };
    db[cleanEmail] = updatedRecord;
    writeAccountsDb(db);
    await saveAccountToCloud(updatedRecord);

    setUser(updatedUser);
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(updatedUser));
    return { ok: true, user: updatedUser };
  };

  // Change password for logged-in user (updates Cloud Database + Supabase + Local)
  const changePassword = async (newPassword: string): Promise<AuthResult> => {
    if (!user) return { ok: false, error: 'Você precisa estar logado.' };
    if (!newPassword || newPassword.length < 6) {
      return { ok: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }

    const sb = getSupabaseClient();
    if (sb) {
      try {
        const { error } = await sb.auth.updateUser({ password: newPassword });
        if (error) return { ok: false, error: error.message };
      } catch {}
    }

    const db = readAccountsDb();
    const cleanEmail = user.email.toLowerCase();
    const updatedRecord: StoredAccountRecord = {
      ...(db[cleanEmail] || user),
      passwordHash: simpleHash(newPassword),
    };
    db[cleanEmail] = updatedRecord;
    writeAccountsDb(db);
    await saveAccountToCloud(updatedRecord);

    return { ok: true };
  };

  const logout = async () => {
    const sb = getSupabaseClient();
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch {}
    }
    setUser(null);
    setAddresses([]);
    setOrders([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      localStorage.removeItem('santo_antonio_user');
    }
  };

  const addAddress = async (
    addressInput: Omit<SavedAddress, 'id' | 'userId'>
  ): Promise<SavedAddress | null> => {
    if (!user) return null;

    const cleanCep = addressInput.cep.replace(/\D/g, '').padEnd(8, '0').slice(0, 8);
    let newId = `addr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const sb = getSupabaseClient();
    if (sb) {
      try {
        const { data: sessionData } = await sb.auth.getSession();
        if (sessionData?.session?.user?.id === user.id) {
          const { data: inserted } = await sb
            .from('addresses')
            .insert({
              user_id: user.id,
              label: addressInput.label || 'Casa',
              recipient_name: addressInput.recipientName || user.name,
              phone: addressInput.phone || user.phone || null,
              cep: cleanCep,
              street: addressInput.street,
              number: addressInput.number,
              complement: addressInput.complement || null,
              district: addressInput.district,
              city: addressInput.city,
              state: (addressInput.state || 'SP').toUpperCase().slice(0, 2),
              is_default: addressInput.isDefault || addresses.length === 0,
            })
            .select()
            .single();

          if (inserted?.id) {
            newId = inserted.id;
          }
        }
      } catch (e) {
        console.warn('Supabase address insert fallback:', e);
      }
    }

    const newAddr: SavedAddress = {
      ...addressInput,
      id: newId,
      userId: user.id,
      cep: addressInput.cep,
      isDefault: addressInput.isDefault || addresses.length === 0,
    };

    const nextAddresses = newAddr.isDefault
      ? [newAddr, ...addresses.map((a) => ({ ...a, isDefault: false }))]
      : [...addresses, newAddr];

    setAddresses(nextAddresses);
    localStorage.setItem(getAddressesKey(user.id), JSON.stringify(nextAddresses));
    await saveUserAddressesToCloud(user.id, nextAddresses);
    return newAddr;
  };

  const removeAddress = async (addressId: string) => {
    if (!user) return;
    const sb = getSupabaseClient();
    if (sb) {
      try {
        await sb.from('addresses').delete().eq('id', addressId).eq('user_id', user.id);
      } catch {}
    }
    const next = addresses.filter((a) => a.id !== addressId);
    setAddresses(next);
    localStorage.setItem(getAddressesKey(user.id), JSON.stringify(next));
    await saveUserAddressesToCloud(user.id, next);
  };

  const setDefaultAddress = async (addressId: string) => {
    if (!user) return;
    const sb = getSupabaseClient();
    if (sb) {
      try {
        await sb
          .from('addresses')
          .update({ is_default: true })
          .eq('id', addressId)
          .eq('user_id', user.id);
      } catch {}
    }
    const next = addresses.map((a) => ({ ...a, isDefault: a.id === addressId }));
    setAddresses(next);
    localStorage.setItem(getAddressesKey(user.id), JSON.stringify(next));
    await saveUserAddressesToCloud(user.id, next);
  };

  const recordUserOrder = async (
    orderData: Omit<CustomerOrder, 'id' | 'userId' | 'createdAt' | 'status'>
  ): Promise<CustomerOrder> => {
    const activeUserId = user?.id || 'guest';
    let orderId = `ord_${Date.now()}`;
    let orderNumber = orderData.orderNumber;
    let createdAt = new Date().toLocaleDateString('pt-BR');

    const sb = getSupabaseClient();
    if (sb && user) {
      try {
        const { data: sessionData } = await sb.auth.getSession();
        if (sessionData?.session?.user?.id === user.id) {
          const rpcItems = orderData.items.map((item) => ({
            product_id: item.productId,
            product_name: item.productName,
            product_slug: item.productSlug,
            variant_name: item.variantName || null,
            unit_price: item.price,
            quantity: item.quantity,
          }));

          const { data: rpcResult, error: rpcError } = await sb.rpc('create_customer_order', {
            p_items: rpcItems,
            p_customer: orderData.customer,
            p_address: orderData.address,
            p_shipping: {
              method: 'standard',
              name: orderData.shipping === 0 ? 'Frete Grátis' : 'Correios PAC',
              cost: orderData.shipping,
              days: 5,
            },
            p_payment_method: orderData.paymentMethod,
            p_notes: null,
          });

          if (!rpcError && Array.isArray(rpcResult) && rpcResult[0]) {
            orderId = rpcResult[0].order_id || orderId;
            orderNumber = rpcResult[0].order_number || orderNumber;
            if (rpcResult[0].created_at) {
              createdAt = new Date(rpcResult[0].created_at).toLocaleDateString('pt-BR');
            }
          }
        }
      } catch (e) {
        console.warn('Supabase order creation fallback to cloud user account:', e);
      }
    }

    const createdOrder: CustomerOrder = {
      ...orderData,
      id: orderId,
      orderNumber,
      userId: activeUserId,
      status: 'awaiting_payment',
      createdAt,
    };

    if (user) {
      const nextOrders = [createdOrder, ...orders];
      setOrders(nextOrders);
      localStorage.setItem(getOrdersKey(user.id), JSON.stringify(nextOrders));
      await saveUserOrdersToCloud(user.id, nextOrders);

      const addrExists = addresses.some(
        (a) =>
          a.cep.replace(/\D/g, '') === orderData.address.cep.replace(/\D/g, '') &&
          a.number.trim() === orderData.address.number.trim()
      );
      if (!addrExists && orderData.address.street && orderData.address.cep) {
        await addAddress({
          label: addresses.length === 0 ? 'Principal' : `Endereço ${addresses.length + 1}`,
          recipientName: orderData.customer.name || user.name,
          phone: orderData.customer.phone || user.phone || '',
          cep: orderData.address.cep,
          street: orderData.address.street,
          number: orderData.address.number,
          complement: orderData.address.complement || '',
          district: orderData.address.district,
          city: orderData.address.city,
          state: orderData.address.state,
          isDefault: addresses.length === 0,
        });
      }

      if (
        (orderData.customer.cpf && !user.cpf) ||
        (orderData.customer.phone && !user.phone)
      ) {
        await updateProfile({
          cpf: orderData.customer.cpf || user.cpf,
          phone: orderData.customer.phone || user.phone,
        });
      }
    }

    return createdOrder;
  };

  const cancelUserOrder = async (orderId: string) => {
    if (!user) return;
    const sb = getSupabaseClient();
    if (sb) {
      try {
        await sb.rpc('customer_cancel_order', { p_order_id: orderId });
      } catch {}
    }
    const next = orders.map((o) =>
      o.id === orderId ? { ...o, status: 'cancelled' as const } : o
    );
    setOrders(next);
    localStorage.setItem(getOrdersKey(user.id), JSON.stringify(next));
    await saveUserOrdersToCloud(user.id, next);
  };

  const refreshUserData = async () => {
    await loadIsolatedUserData(user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.role === 'admin',
        isCloudConnected,
        addresses,
        orders,
        login,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        resetPassword,
        updateProfile,
        changePassword,
        logout,
        addAddress,
        removeAddress,
        setDefaultAddress,
        recordUserOrder,
        cancelUserOrder,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
