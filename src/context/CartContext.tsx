'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Product, CartItem } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import { fetchUserCartFromCloud, saveUserCartToCloud } from '@/lib/cloud/sync';

type CartContextType = {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, variant_name?: string) => void;
  removeFromCart: (productId: string, variant_name?: string) => void;
  updateQuantity: (productId: string, quantity: number, variant_name?: string) => void;
  clearCart: () => void;
  subtotal: number;
  discount: number;
  appliedCoupon: string | null;
  couponMessage: string | null;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  totalItems: number;
};

const GUEST_CART_KEY = 'santo_antonio_cart_guest';
const COUPON_STORAGE_KEY = 'santo_antonio_active_coupon';

function getUserCartKey(userId: string) {
  return `santo_antonio_cart_user_${userId}`;
}

function mergeCartItems(base: CartItem[], incoming: CartItem[]): CartItem[] {
  const merged = [...base];
  for (const item of incoming) {
    const idx = merged.findIndex(
      (i) => i.product.id === item.product.id && i.variant_name === item.variant_name
    );
    if (idx > -1) {
      merged[idx] = {
        ...merged[idx],
        quantity: Math.min(99, merged[idx].quantity + item.quantity),
      };
    } else {
      merged.push(item);
    }
  }
  return merged;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [hydratedForKey, setHydratedForKey] = useState<string | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  const activeStorageKey = user ? getUserCartKey(user.id) : GUEST_CART_KEY;

  useEffect(() => {
    try {
      const savedCoupon = localStorage.getItem(COUPON_STORAGE_KEY);
      if (savedCoupon) {
        setAppliedCoupon(savedCoupon);
      }
    } catch {}
  }, []);

  // Load isolated cart whenever the active user changes (merges Local + Cloud Firestore + Supabase)
  useEffect(() => {
    if (authLoading) return;

    let isCancelled = false;

    const loadCartForCurrentScope = async () => {
      if (user) {
        const userKey = getUserCartKey(user.id);
        let userCart: CartItem[] = [];

        try {
          const rawUserCart = localStorage.getItem(userKey);
          if (rawUserCart) {
            userCart = JSON.parse(rawUserCart);
          }
        } catch (e) {
          console.error('Failed to read user cart', e);
        }

        // 1. Fetch from Cross-Device Cloud Firestore
        try {
          const cloudCart = await fetchUserCartFromCloud(user.id);
          if (cloudCart !== null) {
            userCart = cloudCart;
          }
        } catch {}

        // 2. Check if Supabase has a persisted cart_snapshot for this user
        const sb = getSupabaseClient();
        if (sb) {
          try {
            const { data: sessionData } = await sb.auth.getSession();
            if (sessionData?.session?.user?.id === user.id) {
              const { data: profileData } = await sb
                .from('profiles')
                .select('cart_snapshot')
                .eq('id', user.id)
                .maybeSingle();

              if (
                Array.isArray(profileData?.cart_snapshot) &&
                profileData.cart_snapshot.length > 0 &&
                userCart.length === 0
              ) {
                userCart = profileData.cart_snapshot as CartItem[];
              }
            }
          } catch {}
        }

        // 3. If user just logged in and had items in temporary guest cart, merge them into their personal account cart and clear guest cart
        if (previousUserIdRef.current === null) {
          try {
            const rawGuestCart = localStorage.getItem(GUEST_CART_KEY);
            if (rawGuestCart) {
              const guestItems: CartItem[] = JSON.parse(rawGuestCart);
              if (Array.isArray(guestItems) && guestItems.length > 0) {
                userCart = mergeCartItems(userCart, guestItems);
                localStorage.removeItem(GUEST_CART_KEY);
              }
            }
          } catch {}
        }

        if (!isCancelled) {
          setItems(userCart);
          setHydratedForKey(userKey);
          previousUserIdRef.current = user.id;
        }
      } else {
        // Guest session: load only guest cart
        let guestCart: CartItem[] = [];
        try {
          const rawGuest = localStorage.getItem(GUEST_CART_KEY);
          if (rawGuest) {
            guestCart = JSON.parse(rawGuest);
          }
        } catch {}

        if (!isCancelled) {
          setItems(guestCart);
          setHydratedForKey(GUEST_CART_KEY);
          previousUserIdRef.current = null;
        }
      }
    };

    loadCartForCurrentScope();

    return () => {
      isCancelled = true;
    };
  }, [user, authLoading]);

  // Persist cart changes strictly to the active user's storage key + Cross-Device Cloud Firestore + Supabase
  useEffect(() => {
    if (authLoading) return;
    if (hydratedForKey !== activeStorageKey) return;

    try {
      localStorage.setItem(activeStorageKey, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart', e);
    }

    if (user) {
      saveUserCartToCloud(user.id, items).catch(() => {});

      const sb = getSupabaseClient();
      if (sb) {
        sb.auth.getSession().then(({ data }) => {
          if (data?.session?.user?.id === user.id) {
            sb.from('profiles')
              .update({ cart_snapshot: items })
              .eq('id', user.id)
              .then(() => {});
          }
        });
      }
    }
  }, [items, activeStorageKey, hydratedForKey, user, authLoading]);

  const addToCart = (product: Product, quantity = 1, variant_name?: string) => {
    const safeQty = Math.max(1, Math.min(99, Number(quantity) || 1));

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.product.id === product.id && i.variant_name === variant_name
      );

      // Respect variant price_override when present!
      const matchedVariant = variant_name
        ? product.variants?.find((v) => v.name === variant_name)
        : undefined;
      const effectivePrice =
        matchedVariant?.price_override ?? product.promo_price ?? product.price;

      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          price: effectivePrice,
          quantity: Math.min(99, next[existingIndex].quantity + safeQty),
        };
        return next;
      }

      return [
        ...prev,
        {
          product,
          variant_name,
          quantity: safeQty,
          price: effectivePrice,
        },
      ];
    });
  };

  const removeFromCart = (productId: string, variant_name?: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.product.id === productId && i.variant_name === variant_name))
    );
  };

  const updateQuantity = (productId: string, quantity: number, variant_name?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, variant_name);
      return;
    }
    const safeQty = Math.min(99, quantity);
    setItems((prev) =>
      prev.map((i) => {
        if (i.product.id === productId && i.variant_name === variant_name) {
          return { ...i, quantity: safeQty };
        }
        return i;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    setCouponMessage(null);
    try {
      localStorage.removeItem(COUPON_STORAGE_KEY);
    } catch {}
  };

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  let discount = 0;
  if (appliedCoupon === 'BEMVINDO10' && subtotal > 0) {
    discount = subtotal * 0.1;
  } else if (appliedCoupon === 'SANTOANTONIO15' && subtotal >= 200) {
    discount = subtotal * 0.15;
  }

  const applyCoupon = (rawCode: string): boolean => {
    const code = rawCode.trim().toUpperCase();
    if (code === 'BEMVINDO10') {
      setAppliedCoupon('BEMVINDO10');
      setCouponMessage('✦ Cupom BEMVINDO10 (10% OFF) aplicado com sucesso!');
      try {
        localStorage.setItem(COUPON_STORAGE_KEY, 'BEMVINDO10');
      } catch {}
      return true;
    }
    if (code === 'SANTOANTONIO15') {
      if (subtotal < 200) {
        setAppliedCoupon(null);
        setCouponMessage('O cupom SANTOANTONIO15 requer compras acima de R$ 200,00.');
        try {
          localStorage.removeItem(COUPON_STORAGE_KEY);
        } catch {}
        return false;
      }
      setAppliedCoupon('SANTOANTONIO15');
      setCouponMessage('✦ Cupom SANTOANTONIO15 (15% OFF) aplicado com sucesso!');
      try {
        localStorage.setItem(COUPON_STORAGE_KEY, 'SANTOANTONIO15');
      } catch {}
      return true;
    }
    setAppliedCoupon(null);
    setCouponMessage('Cupom inválido ou expirado. Tente BEMVINDO10.');
    try {
      localStorage.removeItem(COUPON_STORAGE_KEY);
    } catch {}
    return false;
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponMessage(null);
    try {
      localStorage.removeItem(COUPON_STORAGE_KEY);
    } catch {}
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        discount,
        appliedCoupon,
        couponMessage,
        applyCoupon,
        removeCoupon,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
