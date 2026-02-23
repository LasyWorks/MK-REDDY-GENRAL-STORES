"use client";

import { memo } from "react";

function SubcategoryItem({ subcat, isActive, onClick }) {
  return (
    <button
      onClick={() => onClick(subcat)}
      className={`flex flex-col items-center justify-center gap-2 p-3 md:py-4 md:px-2 text-center transition-colors min-w-[80px] md:min-w-0 border-b border-gray-50 last:border-0
        ${
          isActive
            ? "bg-green-50 border-l-4 border-l-green-600"
            : "hover:bg-gray-50 border-l-4 border-l-transparent"
        }`}
    >
      <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex-shrink-0 flex items-center justify-center">
        {subcat.image_url ? (
          <img
            src={subcat.image_url}
            alt={subcat.name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-gray-400 text-xs font-bold">
            {subcat.name.charAt(0)}
          </span>
        )}
      </div>
      <span
        className={`text-[11px] leading-tight font-medium ${
          isActive ? "text-green-700 font-bold" : "text-gray-600"
        }`}
      >
        {subcat.name}
      </span>
    </button>
  );
}

const SubcategoryItemMemo = memo(SubcategoryItem);

function SubcategorySidebar({
  mainCategory,
  subcategories,
  activeSubcategory,
  onSubcategoryClick,
}) {
  return (
    <div className="w-full md:w-64 flex-shrink-0">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-900">{mainCategory?.name}</h3>
        </div>
        <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-hide">
          {subcategories.map((subcat) => (
            <SubcategoryItemMemo
              key={subcat.id}
              subcat={subcat}
              isActive={activeSubcategory?.id === subcat.id}
              onClick={onSubcategoryClick}
            />
          ))}
          {subcategories.length === 0 && (
            <div className="p-4 text-sm text-gray-500 text-center">
              No subcategories found
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

export default memo(SubcategorySidebar);
