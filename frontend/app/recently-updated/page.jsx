import { Suspense } from "react";
import ProductsListPage, {
  ProductsListPageSkeleton,
} from "@/components/product/ProductsListPage";

export default function RecentlyUpdatedPage() {
  return (
    <Suspense fallback={<ProductsListPageSkeleton />}>
      <ProductsListPage
        title="Recently Updated"
        subtitle="Latest price changes and restocks"
        headerTheme="updated"
        defaultSort="updated"
      />
    </Suspense>
  );
}
