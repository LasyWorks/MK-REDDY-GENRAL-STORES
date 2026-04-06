import { Suspense } from "react";
import ProductsListPage, {
  ProductsListPageSkeleton,
} from "@/components/product/ProductsListPage";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const metadata = {
  title: `All Products | ${SITE_NAME}`,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/products",
  },
  openGraph: {
    title: `All Products | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    url: "/products",
  },
  twitter: {
    card: "summary",
    title: `All Products | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
  },
};

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsListPageSkeleton />}>
      <ProductsListPage title="All Products" />
    </Suspense>
  );
}
