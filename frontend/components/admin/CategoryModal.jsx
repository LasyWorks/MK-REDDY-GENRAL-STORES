"use client";
import { useState, useEffect } from "react";
import {
  XMarkIcon as X,
  ArrowPathIcon as Loader2,
  PlusIcon as Plus,
  TrashIcon as Trash2,
  PencilIcon as Pencil,
  CheckIcon as Check,
} from "@heroicons/react/24/outline";
import api from "@/lib/api";

/**
 * CategoryModal - Modal for adding/editing categories and subcategories
 * @param {Object} category - Category to edit (null for add new)
 * @param {Array} categories - All existing categories
 * @param {Function} onClose - Close modal callback
 * @param {Function} onSaved - Success callback
 */
export default function CategoryModal({
  category,
  categories,
  onClose,
  onSaved,
}) {
  const isEdit = !!category;
  const isSubcategory = !!category?.parent_id;

  const [form, setForm] = useState({
    name_en: category?.name || "",
    name_te: category?.name_te || "",
    description_en: category?.description || "",
    description_te: category?.description_te || "",
    image_url: category?.image_url || "",
    display_order: category?.display_order || 0,
    is_active: category?.is_active !== false,
    parent_id: category?.parent_id || "",
  });

  // For new parent categories, track subcategories
  const [subcategories, setSubcategories] = useState([
    { name_en: "", name_te: "", description_en: "", temp_id: 1 },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Get parent categories (no parent_id)
  const parentCategories = categories.filter((c) => !c.parent_id);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const isParentCategory = !form.parent_id && !isEdit;

  const addSubcategory = () => {
    setSubcategories((prev) => [
      ...prev,
      { name_en: "", name_te: "", description_en: "", temp_id: Date.now() },
    ]);
  };

  const removeSubcategory = (index) => {
    if (subcategories.length === 1) {
      setError("At least one subcategory is required for a new category");
      return;
    }
    setSubcategories((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSubcategory = (index, field, value) => {
    setSubcategories((prev) =>
      prev.map((sub, i) => (i === index ? { ...sub, [field]: value } : sub)),
    );
  };

  async function save(e) {
    e.preventDefault();
    setError("");

    // Validation
    if (!form.name_en.trim()) {
      setError("Category name (English) is required");
      return;
    }

    // If editing a parent category with children, don't allow parent_id change
    if (isEdit && category && !category.parent_id) {
      const hasChildren =
        categories.filter((c) => c.parent_id === category.id).length > 0;
      if (hasChildren && form.parent_id) {
        setError(
          "Cannot convert a parent category with subcategories into a subcategory. Please delete or move subcategories first.",
        );
        return;
      }
    }

    // If creating a new parent category, validate subcategories
    if (isParentCategory) {
      const validSubcategories = subcategories.filter((sub) =>
        sub.name_en.trim(),
      );
      if (validSubcategories.length === 0) {
        setError(
          "At least one subcategory is required when creating a new category",
        );
        return;
      }
    }

    setSaving(true);

    try {
      if (isEdit) {
        // Update existing category
        await api.put(`/categories/${category.id}`, form);
        onSaved();
      } else if (form.parent_id) {
        // Create new subcategory
        await api.post("/categories", form);
        onSaved();
      } else {
        // Create new parent category with subcategories
        const parentData = { ...form };
        const parentRes = await api.post("/categories", parentData);
        const parentId = parentRes.data.id;

        // Create all subcategories
        const validSubcategories = subcategories.filter((sub) =>
          sub.name_en.trim(),
        );
        for (const [index, sub] of validSubcategories.entries()) {
          await api.post("/categories", {
            ...sub,
            parent_id: parentId,
            display_order: index,
            is_active: true,
          });
        }

        onSaved();
      }
    } catch (e) {
      setError(e.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-lg text-gray-900">
            {isEdit
              ? `Edit ${isSubcategory ? "Subcategory" : "Category"}`
              : form.parent_id
                ? "Add Subcategory"
                : "Add New Category"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={save} className="p-6 space-y-5">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-3 border border-red-100">
              {error}
            </div>
          )}

          {/* Parent Category Selection (for subcategories) */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category Type
              </label>
              <select
                value={form.parent_id}
                onChange={(e) => set("parent_id", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">New Parent Category</option>
                <optgroup label="Add as Subcategory of:">
                  {parentCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="text-xs text-gray-500 mt-1.5">
                {form.parent_id
                  ? "This will be added as a subcategory"
                  : "Create a new parent category (you must add at least one subcategory)"}
              </p>
            </div>
          )}

          {/* Category Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category Name (English) *
              </label>
              <input
                value={form.name_en}
                onChange={(e) => set("name_en", e.target.value)}
                placeholder="e.g., Groceries, Beverages, Snacks"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category Name (Telugu)
              </label>
              <input
                value={form.name_te}
                onChange={(e) => set("name_te", e.target.value)}
                placeholder="తెలుగు పేరు"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for auto-translation
              </p>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description (English)
              </label>
              <textarea
                value={form.description_en}
                onChange={(e) => set("description_en", e.target.value)}
                rows={2}
                placeholder="Brief description..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Image URL
              </label>
              <input
                value={form.image_url}
                onChange={(e) => set("image_url", e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Display Order
              </label>
              <input
                type="number"
                value={form.display_order}
                onChange={(e) => set("display_order", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex items-center pt-8">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
                className="w-4 h-4 accent-green-600"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                Active (visible in store)
              </label>
            </div>
          </div>

          {/* Subcategories Section (only for new parent categories) */}
          {isParentCategory && (
            <div className="border-t border-gray-200 pt-5 mt-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  Subcategories <span className="text-red-500">*</span>
                </h3>
                <button
                  type="button"
                  onClick={addSubcategory}
                  className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-semibold"
                >
                  <Plus className="w-4 h-4" /> Add Subcategory
                </button>
              </div>

              <p className="text-xs text-gray-500 mb-4">
                Add at least one subcategory. These will be created
                automatically when you save the parent category.
              </p>

              <div className="space-y-3">
                {subcategories.map((sub, index) => (
                  <div
                    key={sub.temp_id}
                    className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500">
                        Subcategory {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSubcategory(index)}
                        className="text-gray-400 hover:text-red-500"
                        disabled={subcategories.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <input
                        value={sub.name_en}
                        onChange={(e) =>
                          updateSubcategory(index, "name_en", e.target.value)
                        }
                        placeholder="Subcategory name (English) *"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>

                    <div>
                      <input
                        value={sub.name_te || ""}
                        onChange={(e) =>
                          updateSubcategory(index, "name_te", e.target.value)
                        }
                        placeholder="Subcategory name (Telugu)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <textarea
                        value={sub.description_en || ""}
                        onChange={(e) =>
                          updateSubcategory(
                            index,
                            "description_en",
                            e.target.value,
                          )
                        }
                        placeholder="Description (optional)"
                        rows={1}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
