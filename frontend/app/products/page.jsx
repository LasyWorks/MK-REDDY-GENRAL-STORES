import { Suspense } from "react";
import ProductsListPage, {
  ProductsListPageSkeleton,
} from "@/components/product/ProductsListPage";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata = {
  title: `All Products | ${SITE_NAME}`,
  description: `Browse all products from ${SITE_NAME}. Find fresh groceries, daily essentials, household items with best prices and free delivery.`,
  keywords: [
    "all products",
    "grocery products",
    "online shopping",
    "best prices",
    "free delivery",
    SITE_NAME,
  ].join(", "),
  alternates: {
    canonical: "/products",
  },
  openGraph: {
    title: `All Products | ${SITE_NAME}`,
    description: `Browse all products from ${SITE_NAME}. Find fresh groceries, daily essentials, household items with best prices and free delivery.`,
    url: "/products",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `All Products | ${SITE_NAME}`,
    description: `Browse all products from ${SITE_NAME}.`,
  },
};

export default function ProductsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "All Products",
            description: SITE_DESCRIPTION,
            url: `${SITE_URL}products`,
          }),
        }}
      />
      <Suspense fallback={<ProductsListPageSkeleton />}>
        <ProductsListPage title="All Products" />
      </Suspense>
    </>
  );
}
