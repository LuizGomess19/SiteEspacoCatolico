'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabaseClient, isSupabaseActive } from '@/lib/supabase/client';
import {
  getFirebaseInstances,
  isFirebaseConfigured,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  fbUpdateProfile,
  signOut as fbSignOut,
} from '@/lib/firebase/client';
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
  paymentMethod: 'pix' | 'credit' | 'credit_card' | 'debit_card' | 'boleto';
  sicrediPayment?: {
    mode?: 'sandbox' | 'production';
    transactionId?: string;
    pix?: any;
    boleto?: any;
    cardTransaction?: any;
  };
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
  addAddress: (address: Omit<SavedAddress, 'id' | 'userId'>) => Promise<SavedAddress | null>;
  removeAddress: (addressId: string) => Promise<void>;
  setDefaultAddress: (addressId: string) => Promise<void>;
  recordUserOrder: (
    orderData: Omit<CustomerOrder, 'id' | 'userId' | 'createdAt' | 'status'> & { status?: CustomerOrder['status'] }
  ) => Promise<CustomerOrder>;
  confirmOrderPayment: (orderId: string) => Promise<void>;
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

  const pushLocalAccountsToCloud = useCallback(async () => {
    try {
      const db = readAccountsDb();
      for (const email of Object.keys(db)) {
        const acc = db[email];
        if (acc && acc.email) {
          await saveAccountToCloud(acc);
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

  const loadIsolatedUserData = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setAddresses([]);
      setOrders([]);
      return;
    }

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

    // Sync from Cross-Device Cloud (Firestore or Cloud KV)
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
      console.warn('Cloud user data sync skipped:', e);
    }

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

  useEffect(() => {
    setIsCloudConnected(true);
    pushLocalAccountsToCloud();

    const initAuth = async () => {
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
  }, [loadIsolatedUserData, pushLocalAccountsToCloud]);

  // Register a new user account via Email & Password (saves to Firebase Auth + Firestore / Cloud KV)
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

    const existingCloud = await fetchAccountFromCloud(cleanEmail);
    const db = readAccountsDb();
    if (existingCloud || db[cleanEmail]) {
      return {
        ok: false,
        error: 'Este e-mail já possui cadastro. Acesse a aba "Entrar na Conta" para fazer login.',
      };
    }

    let userId = deterministicUserId(cleanEmail);

    // 1. Firebase Authentication (when configured)
    const fb = getFirebaseInstances();
    if (fb) {
      try {
        const cred = await createUserWithEmailAndPassword(fb.auth, cleanEmail, password);
        if (cred.user) {
          userId = cred.user.uid;
          await fbUpdateProfile(cred.user, { displayName: cleanName });
        }
      } catch (fbErr: any) {
        if (fbErr?.code === 'auth/email-already-in-use') {
          return {
            ok: false,
            error: 'Este e-mail já possui cadastro. Acesse a aba "Entrar na Conta" para fazer login.',
          };
        }
        console.warn('Firebase Auth signup fallback:', fbErr);
      }
    }

    // 2. Supabase Authentication (when configured)
    const sb = getSupabaseClient();
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
        if (!error && data?.user?.id) {
          userId = data.user.id;
        }
      } catch {}
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

    db[cleanEmail] = accountRecord;
    writeAccountsDb(db);
    await saveAccountToCloud(accountRecord);

    setUser(newUser);
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(newUser));
    await loadIsolatedUserData(newUser);

    return { ok: true, user: newUser };
  };

  // Sign in with Email & Password (checks Firebase Auth + Firestore / Cloud KV)
  const loginWithEmail = async (
    email: string,
    password: string,
    asAdmin = false
  ): Promise<AuthResult> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { ok: false, error: 'Preencha seu e-mail e sua senha.' };
    }

    // 1. Check Firebase Authentication first (when configured)
    const fb = getFirebaseInstances();
    if (fb) {
      try {
        const cred = await signInWithEmailAndPassword(fb.auth, cleanEmail, password);
        if (cred.user) {
          const cloudProfile = await fetchAccountFromCloud(cleanEmail);
          const loggedUser: User = {
            id: cloudProfile?.id || cred.user.uid,
            email: cred.user.email || cleanEmail,
            name: cloudProfile?.name || cred.user.displayName || cleanEmail.split('@')[0],
            cpf: cloudProfile?.cpf || '',
            phone: cloudProfile?.phone || '',
            avatar_url: cred.user.photoURL || cloudProfile?.avatar_url || '',
            provider: 'email',
            role: asAdmin || cloudProfile?.role === 'admin' ? 'admin' : 'customer',
            createdAt: cloudProfile?.createdAt || new Date().toISOString(),
          };
          setUser(loggedUser);
          localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(loggedUser));
          await loadIsolatedUserData(loggedUser);
          return { ok: true, user: loggedUser };
        }
      } catch (fbErr: any) {
        if (fbErr?.code === 'auth/wrong-password' || fbErr?.code === 'auth/invalid-credential') {
          return {
            ok: false,
            error: 'Senha incorreta para esta conta. Verifique sua senha.',
          };
        }
      }
    }

    // 2. Check Cloud Database (Firestore / Cloud KV)
    const db = readAccountsDb();
    let account: StoredAccountRecord | null = await fetchAccountFromCloud(cleanEmail);

    if (account) {
      db[cleanEmail] = account;
      writeAccountsDb(db);
    } else if (db[cleanEmail]) {
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

  // Sign in or Register with Google Account (supports native Firebase Google Popup + Cloud sync)
  const loginWithGoogle = async (googleProfile?: {
    email: string;
    name: string;
    avatar_url?: string;
  }): Promise<AuthResult> => {
    const fb = getFirebaseInstances();

    if (fb && !googleProfile && isFirebaseConfigured()) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const cred = await signInWithPopup(fb.auth, provider);
        if (cred.user && cred.user.email) {
          const gEmail = cred.user.email.trim().toLowerCase();
          const gName = cred.user.displayName || gEmail.split('@')[0];
          const existingCloud = await fetchAccountFromCloud(gEmail);
          const googleUser: User = {
            id: existingCloud?.id || cred.user.uid,
            email: gEmail,
            name: gName,
            cpf: existingCloud?.cpf || '',
            phone: existingCloud?.phone || '',
            avatar_url: cred.user.photoURL || existingCloud?.avatar_url || '',
            provider: 'google',
            role: existingCloud?.role || 'customer',
            createdAt: existingCloud?.createdAt || new Date().toISOString(),
          };
          await saveAccountToCloud({
            ...googleUser,
            passwordHash: existingCloud?.passwordHash || simpleHash(`google_oauth_${gEmail}`),
          });
          setUser(googleUser);
          localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(googleUser));
          await loadIsolatedUserData(googleUser);
          return { ok: true, user: googleUser };
        }
      } catch (fbErr: any) {
        return {
          ok: false,
          error: fbErr?.message || 'Não foi possível concluir o login com Google.',
        };
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

  const resetPassword = async (email: string, newPassword?: string): Promise<AuthResult> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Informe um e-mail válido.' };
    }

    const fb = getFirebaseInstances();
    if (fb && !newPassword) {
      try {
        await sendPasswordResetEmail(fb.auth, cleanEmail);
        return { ok: true };
      } catch {}
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

  const changePassword = async (newPassword: string): Promise<AuthResult> => {
    if (!user) return { ok: false, error: 'Você precisa estar logado.' };
    if (!newPassword || newPassword.length < 6) {
      return { ok: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
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
    const fb = getFirebaseInstances();
    if (fb) {
      try {
        await fbSignOut(fb.auth);
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

    const newId = `addr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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
    const next = addresses.filter((a) => a.id !== addressId);
    setAddresses(next);
    localStorage.setItem(getAddressesKey(user.id), JSON.stringify(next));
    await saveUserAddressesToCloud(user.id, next);
  };

  const setDefaultAddress = async (addressId: string) => {
    if (!user) return;
    const next = addresses.map((a) => ({ ...a, isDefault: a.id === addressId }));
    setAddresses(next);
    localStorage.setItem(getAddressesKey(user.id), JSON.stringify(next));
    await saveUserAddressesToCloud(user.id, next);
  };

  const recordUserOrder = async (
    orderData: Omit<CustomerOrder, 'id' | 'userId' | 'createdAt' | 'status'> & { status?: CustomerOrder['status'] }
  ): Promise<CustomerOrder> => {
    const activeUserId = user?.id || 'guest';
    const orderId = `ord_${Date.now()}`;
    const orderNumber = orderData.orderNumber;
    const createdAt = new Date().toLocaleDateString('pt-BR');

    const createdOrder: CustomerOrder = {
      ...orderData,
      id: orderId,
      orderNumber,
      userId: activeUserId,
      status: orderData.status || 'awaiting_payment',
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

  const confirmOrderPayment = async (orderId: string) => {
    if (!user) return;
    const next = orders.map((o) =>
      o.id === orderId ? { ...o, status: 'paid' as const } : o
    );
    setOrders(next);
    localStorage.setItem(getOrdersKey(user.id), JSON.stringify(next));
    await saveUserOrdersToCloud(user.id, next);
  };

  const cancelUserOrder = async (orderId: string) => {
    if (!user) return;
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
        confirmOrderPayment,
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
