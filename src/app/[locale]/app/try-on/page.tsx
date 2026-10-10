import { BeautyTryOn } from "@/components/beauty-try-on";

export default async function TryOnPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; look?: string }>;
}) {
  const { product, look } = await searchParams;
  return <BeautyTryOn initialSlug={product} initialLook={look} />;
}
