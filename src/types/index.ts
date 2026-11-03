export type UserRole = 'customer' | 'admin';

export type Product = {
  id: string;
  name: string;
  slug: string;
  category_id?: string;
  category_slug?: string;
  category_name?: string;
  short_description?: string;
  description?: string;
  sku?: string;
  price: number;
  promo_price?: number | null;
  stock: number;
  low_stock_threshold?: number;
  material?: string;
  weight_grams?: number;
  variant_label?: string;
  variants?: { id?: string; name: string; price_override?: number; stock: number }[];
  images?: string[];
  is_featured?: boolean;
  is_new?: boolean;
  is_demo?: boolean;
  sales_count?: number;
  rating_avg?: number;
  rating_count?: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  parent_id?: string | null;
  sort_order?: number;
};

export type CartItem = {
  product: Product;
  variant_name?: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: string;
  order_number: string;
  created_at: string;
  status: 'awaiting_payment' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  total: number;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  items: {
    product_name: string;
    variant_name?: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
  shipping_address: any;
  payment_method?: string;
  tracking_code?: string;
};

