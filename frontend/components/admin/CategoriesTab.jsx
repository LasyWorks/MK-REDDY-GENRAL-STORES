"use client";
import { useState, useEffect, useCallback } from "react";
import {
  PlusIcon as Plus,
  PencilIcon as Pencil,
  TrashIcon as Trash2,
  ArrowPathIcon as Loader2,
  ChevronDownIcon as ChevronDown,
  ChevronRightIcon as ChevronRight,
  EyeIcon as Eye,
  EyeSlashIcon as EyeOff,
} from "@heroicons/react/24/outline";
import api from "@/lib/api";
import CategoryModal from "./CategoryModal";

/**
 * CategoriesTab - Manages categories and subcategories
 */
export default function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/categories", { limit: 500 });
      const allCategories = res.data || [];
      setCategories(allCategories);

      // Auto-expand all parent categories
      const parentIds = allCategories
        .filter((c) => !c.parent_id)
        .map((c) => c.id);
      setExpandedCategories(new Set(parentIds));
    } catch (e) {
      setError(e.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (category) => {
    const isParent = !category.parent_id;
    const subcategories = categories.filter((c) => c.parent_id === category.id);

    const confirmMsg =
      isParent && subcategories.length > 0
        ? `Delete "${category.name}" and all its ${subcategories.length} subcategories?`
        : `Delete "${category.name}"?`;

    if (!confirm(confirmMsg)) return;

    setDeleting(category.id);
    try {
      await api.delete(`/categories/${category.id}`);
      load();
    } catch (e) {
      alert(e.message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (category) => {
    try {
      await api.put(`/categories/${category.id}`, {
        ...category,
        is_active: !category.is_active,
      });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === category.id ? { ...c, is_active: !c.is_active } : c,
        ),
      );
    } catch (e) {
      alert(e.message || "Failed to toggle active status");
    }
  };

  const toggleExpand = (categoryId) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const onSaved = () => {
    setModal(null);
    load();
  };

  // Organize categories hierarchically
  const parentCategories = categories.filter((c) => !c.parent_id);
  const subcategoriesMap = categories
    .filter((c) => c.parent_id)
    .reduce((acc, sub) => {
      if (!acc[sub.parent_id]) acc[sub.parent_id] = [];
      acc[sub.parent_id].push(sub);
      return acc;
    }, {});

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Categories</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage product categories and subcategories
          </p>
        </div>
        <button
          onClick={() => setModal("add")}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-16 text-center">
          <Loader2 className="w-7 h-7 animate-spin text-green-600 inline" />
        </div>
      )}

      {!loading && categories.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <p className="text-gray-400">No categories yet</p>
          <button
            onClick={() => setModal("add")}
            className="mt-4 text-green-600 hover:text-green-700 font-semibold text-sm"
          >
            Create your first category
          </button>
        </div>
      )}

      {/* Categories List */}
      {!loading && parentCategories.length > 0 && (
        <div className="space-y-3">
          {parentCategories.map((parent) => {
            const subcategories = subcategoriesMap[parent.id] || [];
            const isExpanded = expandedCategories.has(parent.id);

            return (
              <div
                key={parent.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Parent Category */}
                <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-gray-50 to-white">
                  {/* Expand/Collapse Button */}
                  {subcategories.length > 0 && (
                    <button
                      onClick={() => toggleExpand(parent.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                  )}

                  {/* Category Image */}
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {parent.image_url ? (
                      <img
                        src={parent.image_url}
                        alt={parent.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-gray-400 text-xl">📁</span>
                    )}
                  </div>

                  {/* Category Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {parent.name}
                      </h3>
                      <span className="text-xs font-medium text-gray-400">
                        ({subcategories.length} subcategories)
                      </span>
                    </div>
                    {parent.description && (
                      <p className="text-sm text-gray-500 truncate">
                        {parent.description}
                      </p>
                    )}
                  </div>

                  {/* Active Status */}
                  <button
                    onClick={() => handleToggleActive(parent)}
                    className={`p-2 rounded-lg transition-colors ${
                      parent.is_active
                        ? "bg-green-100 text-green-600 hover:bg-green-200"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                    title={parent.is_active ? "Active" : "Inactive"}
                  >
                    {parent.is_active ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setModal({ mode: "edit", category: parent })
                      }
                      className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(parent)}
                      disabled={deleting === parent.id}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {deleting === parent.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Subcategories */}
                {isExpanded && subcategories.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    <div className="px-5 py-3 space-y-2">
                      {subcategories.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-100"
                        >
                          {/* Subcategory Image */}
                          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {sub.image_url ? (
                              <img
                                src={sub.image_url}
                                alt={sub.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-gray-300 text-sm">📄</span>
                            )}
                          </div>

                          {/* Subcategory Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-800 text-sm">
                              {sub.name}
                            </h4>
                            {sub.description && (
                              <p className="text-xs text-gray-500 truncate">
                                {sub.description}
                              </p>
                            )}
                          </div>

                          {/* Active Status */}
                          <button
                            onClick={() => handleToggleActive(sub)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              sub.is_active
                                ? "bg-green-100 text-green-600 hover:bg-green-200"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            }`}
                            title={sub.is_active ? "Active" : "Inactive"}
                          >
                            {sub.is_active ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                setModal({ mode: "edit", category: sub })
                              }
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(sub)}
                              disabled={deleting === sub.id}
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                            >
                              {deleting === sub.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Subcategory Button */}
                    <div className="px-5 pb-3">
                      <button
                        onClick={() =>
                          setModal({
                            mode: "add-sub",
                            parentId: parent.id,
                            parentName: parent.name,
                          })
                        }
                        className="w-full py-2.5 text-sm text-green-600 hover:text-green-700 font-semibold border-2 border-dashed border-green-200 hover:border-green-300 rounded-lg transition-colors"
                      >
                        + Add Subcategory to {parent.name}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Category Modal */}
      {modal && (
        <CategoryModal
          category={
            modal.category ||
            (modal.parentId ? { parent_id: modal.parentId } : null)
          }
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
