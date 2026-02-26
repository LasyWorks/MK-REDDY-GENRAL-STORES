import { notFound } from "next/navigation";
import CategoryClientView from "../../../components/category/CategoryClientView";
import { getAllCategories } from "../../data/categories";
export const dynamic = "force-static";
export const revalidate = 3600;
export const dynamicParams = true;
export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((c) => ({ id: c.id }));
}
export async function generateMetadata({ params }) {
  const { id } = await params;
  const categories = await getAllCategories();
  const category = categories.find((c) => c.id === id);
  return {
    title: category?.name
      ? `${category.name} | MK Reddy General Stores`
      : "Category | MK Reddy General Stores",
    description:
      category?.description ||
      `Shop ${category?.name || "products"} at MK Reddy General Stores`,
    openGraph: {
      title: category?.name ?? "Category",
      description: category?.description ?? "",
      images: category?.image_url ? [{ url: category.image_url }] : [],
    },
  };
}
export default async function CategoryPage({ params }) {
  const { id } = await params;
  const allCategories = await getAllCategories();
  const category = allCategories.find((c) => c.id === id);
  if (!category) notFound();
  let mainCategory;
  let subcategories;
  let initialActiveSubcategory;
  if (!category.parent_id) {
    mainCategory = category;
    subcategories = allCategories.filter((c) => c.parent_id === mainCategory.id);
    initialActiveSubcategory = subcategories[0] ?? null;
  } else {
    mainCategory = allCategories.find((c) => c.id === category.parent_id) ?? category;
    subcategories = allCategories.filter((c) => c.parent_id === mainCategory.id);
    initialActiveSubcategory = category;
  }
  return (
    <CategoryClientView
      mainCategory={mainCategory}
      subcategories={subcategories}
      initialActiveSubcategory={initialActiveSubcategory}
    />
  );
}