"use client";

import React from "react";
import { useLanguage } from "@/components/ui/LanguageProvider";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildPages(current: number, totalPages: number) {
  const pages: Array<number | string> = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    return pages;
  }

  const windowSize = 2;
  const start = clamp(current - windowSize, 2, totalPages - 1);
  const end = clamp(current + windowSize, 2, totalPages - 1);

  pages.push(1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < totalPages - 1) pages.push("...");
  pages.push(totalPages);
  return pages;
}

export default function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const { t } = useLanguage();
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const safePage = clamp(page, 1, totalPages);
  const pages = buildPages(safePage, totalPages);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {t("pagination.page")} {safePage} {t("pagination.of")} {totalPages}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("pagination.prev")}
        </button>
        {pages.map((item, index) =>
          typeof item === "number" ? (
            <button
              key={`${item}-${index}`}
              type="button"
              onClick={() => onPageChange(item)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                item === safePage
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {item}
            </button>
          ) : (
            <span key={`ellipsis-${index}`} className="px-2 text-xs text-slate-400">
              {item}
            </span>
          )
        )}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("pagination.next")}
        </button>
      </div>
    </div>
  );
}
