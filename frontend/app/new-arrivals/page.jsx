import { Suspense } from "react";
import ProductsListPage, {
  ProductsListPageSkeleton,
} from "@/components/product/ProductsListPage";

export default function NewArrivalsPage() {
  return (
    <Suspense fallback={<ProductsListPageSkeleton />}>
      <ProductsListPage
        title="New Arrivals"
        subtitle="Fresh additions to our store"
        headerTheme="new"
        defaultSort="newest"
      />
    </Suspense>
  );
}
