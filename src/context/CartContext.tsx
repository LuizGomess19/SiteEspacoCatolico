'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from '@/types';

type CartContextType = {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, variant_name?: string) => void;
  removeFromCart: (productId: string, variant_name?: string) => void;
  updateQuantity: (productId: string, quantity: number, variant_name?: string) => void;
  clearCart: () => void;
  subtotal: number;
  totalItems: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('santo_antonio_cart');
      if (saved) setItems(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load cart', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('santo_antonio_cart', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart', e);
    }
  }, [items]);

  const addToCart = (product: Product, quantity = 1, variant_name?: string) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.product.id === product.id && i.variant_name === variant_name
      );

      const effectivePrice = product.promo_price ?? product.price;

      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += quantity;
        return next;
      }

      return [
        ...prev,
        {
          product,
          variant_name,
          quantity,
          price: effectivePrice,
        },
      ];
    });
  };

  const removeFromCart = (productId: string, variant_name?: string) => {
    setItems((prev) => prev.filter((i) => !(i.product.id === productId && i.variant_name === variant_name)));
  };

  const updateQuantity = (productId: string, quantity: number, variant_name?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, variant_name);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.product.id === productId && i.variant_name === variant_name) {
          return { ...i, quantity };
        }
        return i;
      })
    );
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
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

