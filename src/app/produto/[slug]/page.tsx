import { demoStore } from '@/lib/demo/service';
import ProductClient from './ProductClient';

export function generateStaticParams() {
  const products = demoStore.getProducts();
  return products.map((prod) => ({
    slug: prod.slug,
  }));
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductClient slug={slug} />;
}
