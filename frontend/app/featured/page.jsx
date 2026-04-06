import { Suspense } from "react";
import ProductsListPage, {
  ProductsListPageSkeleton,
} from "@/components/product/ProductsListPage";

export default function FeaturedPage() {
  return (
    <Suspense fallback={<ProductsListPageSkeleton />}>
      <ProductsListPage
        title="Featured Products"
        subtitle="Curated essentials our community trusts, refreshed daily"
        headerTheme="featured"
        shuffleOnDefault
        fixedParams={{ is_featured: "true" }}
      />
    </Suspense>
  );
}
