
"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  useAddCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
} from "@/redux/api/categoriesApi";
import { useLanguage } from "@/components/ui/LanguageProvider";

export default function CategoriesPage() {
  const { t } = useLanguage();
  const [newCategory, setNewCategory] = useState("");
  const {
    data: categories = [],
    isLoading,
    error,
  } = useGetCategoriesQuery();
  const [addCategory, { isLoading: isAdding }] = useAddCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [pendingDelete, setPendingDelete] = useState<
    { id: string; name: string } | null
  >(null);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    try {
      await addCategory({ name }).unwrap();
      setNewCategory("");
      toast.success(t("toast.categoryAdded"));
    } catch (err) {
      toast.error(t("toast.failedAddCategory"));
      console.error(err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id).unwrap();
      toast.success(t("toast.categoryDeleted"));
    } catch (err) {
      toast.error(t("toast.failedDeleteCategory"));
      console.error(err);
    }
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            {t("categories.catalog")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">{t("categories.title")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {t("categories.subtitle")}
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
          {categories.length} {t("categories.title")}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <form
          onSubmit={handleAddCategory}
          className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t("categories.addCategory")}</h2>
            <p className="text-sm text-slate-500">
              {t("categories.addCategoryDesc")}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">{t("categories.name")}</label>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder={t("categories.namePlaceholder")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <button
            type="submit"
            disabled={isAdding}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isAdding ? t("categories.adding") : t("categories.add")}
          </button>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{t("categories.listTitle")}</h2>
            {(isLoading || error) && (
              <span className="text-xs text-slate-400">{t("common.loading")}</span>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {isLoading && (
              <p className="text-sm text-slate-500">{t("categories.loadingCategories")}</p>
            )}
            {error && (
              <p className="text-sm text-rose-600">{t("categories.failedLoad")}</p>
            )}
            {!isLoading && !error && categories.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                {t("categories.noCategories")}
              </div>
            )}
            {!isLoading &&
              !error &&
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm font-semibold text-slate-800">
                    {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDelete({ id: cat.id, name: cat.name })
                    }
                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
                  >
                    {t("categories.delete")}
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t("categories.confirmTitle")}
        description={
          pendingDelete
            ? t("categories.confirmDescription").replace("{name}", pendingDelete.name)
            : undefined
        }
        confirmLabel={t("categories.delete")}
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          const id = pendingDelete.id;
          setPendingDelete(null);
          void handleDeleteCategory(id);
        }}
      />
    </section>
  );
}
