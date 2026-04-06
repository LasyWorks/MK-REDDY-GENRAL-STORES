import { Suspense } from "react";
import ProductsListPage, {
  ProductsListPageSkeleton,
} from "@/components/product/ProductsListPage";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata = {
  title: `Hot Deals - Limited Time Offers | ${SITE_NAME}`,
  description: `Discover amazing hot deals and limited-time offers on groceries. Save big on fresh produce, household essentials, and daily needs.`,
  keywords: ["hot deals", "discounts", "limited time", "best prices", "savings", SITE_NAME].join(", "),
  alternates: {
    canonical: "/hot-deals",
  },
  openGraph: {
    title: `Hot Deals - Limited Time Offers | ${SITE_NAME}`,
    description: `Discover amazing hot deals on groceries and household items.`,
    url: "/hot-deals",
  },
};

export default function HotDealsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Hot Deals",
            description: "Limited-time offers and discounts",
            url: `${SITE_URL}hot-deals`,
          }),
        }}
      />
      <Suspense fallback={<ProductsListPageSkeleton />}>
        <ProductsListPage
          title="Hot Deals"
          subtitle="Limited time offers at lower prices"
          headerTheme="deals"
          defaultSort="discount"
          fixedParams={{ has_discount: "true" }}
        />
      </Suspense>
    </>
  );
}
