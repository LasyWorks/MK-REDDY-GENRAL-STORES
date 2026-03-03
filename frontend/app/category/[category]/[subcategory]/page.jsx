import { notFound } from "next/navigation";
import { getFreshCategories } from "@/app/data/categories";
import CategoryLayout from "@/components/category/CategoryLayout";
import Link from "next/link";
import { ChevronRightIcon as ChevronRight } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fetchProducts(categoryId, searchParams) {
  const PAGE_SIZE = 20;
  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const params = new URLSearchParams();
  params.append("category_id", categoryId);
  params.append("limit", PAGE_SIZE);
  params.append("page", page);
  params.append("is_active", "true");

  if (searchParams.min_price)
    params.append("min_price", searchParams.min_price);
  if (searchParams.max_price)
    params.append("max_price", searchParams.max_price);
  if (searchParams.brand) params.append("brand", searchParams.brand);
  if (searchParams.in_stock === "true") params.append("in_stock", "true");
  if (searchParams.has_discount === "true")
    params.append("has_discount", "true");

  if (searchParams.sort) {
    switch (searchParams.sort) {
      case "price_asc":
        params.append("sort_by", "price");
        params.append("sort_order", "asc");
        break;
      case "price_desc":
        params.append("sort_by", "price");
        params.append("sort_order", "desc");
        break;
      case "newest":
        params.append("sort_by", "created_at");
        params.append("sort_order", "desc");
        break;
      case "discount":
        params.append("has_discount", "true");
        break;
      case "rating":
        params.append("sort_by", "avg_rating");
        params.append("sort_order", "desc");
        break;
      default:
        break;
    }
  }

  const res = await fetch(`${API_URL}/products?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) return { data: [], total: 0, page, pageSize: PAGE_SIZE };
  const json = await res.json();
  return {
    data: json.data || [],
    total: json.pagination?.totalItems || 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export default async function SubcategoryPage({ params, searchParams }) {
  const { category: categorySlug, subcategory: subcategorySlug } = await params;
  const searchParamsResolved = await searchParams;

  const allCategories = await getFreshCategories();

  // Find main category — also requires at least 1 active product
  const mainCategory = allCategories.find(
    (c) => generateSlug(c.name) === categorySlug && !c.parent_id,
  );
  if (!mainCategory || parseInt(mainCategory.product_count || 0) === 0) notFound();

  // Find subcategory — only among those with at least 1 product
  const allSubcategories = allCategories.filter(
    (c) => c.parent_id === mainCategory.id,
  );
  const activeSubcategory = allSubcategories.find(
    (c) => generateSlug(c.name) === subcategorySlug,
  );

  if (!activeSubcategory || parseInt(activeSubcategory.product_count || 0) === 0) notFound();

  // Only show subcategories with products in the sidebar
  const subcategories = allSubcategories.filter(
    (c) => parseInt(c.product_count || 0) > 0,
  );

  // Fetch products for subcategory
  const productsData = await fetchProducts(
    activeSubcategory.id,
    searchParamsResolved,
  );

  // Extract unique brands
  const brands = [
    ...new Set(productsData.data.map((p) => p.brand).filter(Boolean)),
  ];

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center text-sm text-gray-500 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400 shrink-0" />
            <Link
              href={`/category/${categorySlug}`}
              className="hover:text-blue-600 transition-colors"
            >
              {mainCategory.name}
            </Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400 shrink-0" />
            <span className="text-gray-900 font-medium">
              {activeSubcategory.name}
            </span>
          </nav>
        </div>
      </div>

      <CategoryLayout
        category={mainCategory}
        subcategories={subcategories}
        activeSubcategory={activeSubcategory}
        products={productsData.data}
        totalCount={productsData.total}
        brands={brands}
        currentPage={productsData.page}
        pageSize={productsData.pageSize}
      />
    </div>
  );
}
