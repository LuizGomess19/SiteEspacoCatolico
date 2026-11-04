import { demoStore } from '@/lib/demo/service';
import CategoryClient from './CategoryClient';

export function generateStaticParams() {
  const categories = demoStore.getCategories();
  return categories.map((cat) => ({
    slug: cat.slug,
  }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CategoryClient slug={slug} />;
}
