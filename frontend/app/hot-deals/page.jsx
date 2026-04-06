import { Suspense } from "react";
import ProductsListPage, {
  ProductsListPageSkeleton,
} from "@/components/product/ProductsListPage";

export default function HotDealsPage() {
  return (
    <Suspense fallback={<ProductsListPageSkeleton />}>
      <ProductsListPage
        title="Hot Deals"
        subtitle="Limited time offers at lower prices"
        headerTheme="deals"
        defaultSort="discount"
        fixedParams={{ has_discount: "true" }}
      />
    </Suspense>
  );
}
