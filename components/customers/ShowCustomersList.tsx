"use client";

import Link from "next/link";
import { useState } from "react";
import { useGetCustomersPagedQuery } from "../../redux/api/customersApi";
import { useLanguage } from "@/components/ui/LanguageProvider";
import Pagination from "@/components/ui/Pagination";

export default function ShowCustomersList() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const {
    data,
    isLoading,
    error,
  } = useGetCustomersPagedQuery({ page, pageSize });
  const customers = data?.items ?? [];
  const total = data?.total ?? 0;

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="mb-4 h-5 w-40 rounded-full bg-slate-100" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div className="space-y-2">
                <div className="h-4 w-36 rounded-full bg-slate-200" />
                <div className="h-3 w-24 rounded-full bg-slate-100" />
              </div>
              <div className="h-7 w-20 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.35em]">{t("customers.title")}</p>
        <h2 className="mt-3 text-2xl font-semibold text-rose-900">
          {t("customers.loadErrorTitle")}
        </h2>
        <p className="mt-2 text-sm text-rose-700">
          {t("customers.loadErrorMessage")}
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
            {t("customers.title")}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">
            {t("customers.directoryTitle")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("customers.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
            {total} {t("customers.total")}
          </div>
          <Link
            href="/customers/create"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <span>{t("customers.create")}</span>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs font-semibold transition group-hover:bg-white/25">
              +
            </span>
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {customers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            {t("customers.noCustomers")}
          </div>
        ) : (
          customers.map((customer, index) => {
            const phone = customer.phoneNumber ?? customer.phone ?? "";
            const initials = customer.name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("");
            const formatAmount = (value?: string) => {
              const parsed = Number(value ?? 0);
              return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
            };
            const debtAFN = formatAmount(customer.debtAFN);
            const debtUSD = formatAmount(customer.debtUSD);
            const paidAFN = formatAmount(customer.paidAFN);
            const paidUSD = formatAmount(customer.paidUSD);

            return (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className="group flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-lg"
                aria-label={`View ${customer.name}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                    {initials || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {customer.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("customers.customerNumber")} #{String(index + 1).padStart(2, "0")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-slate-600">
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {t("customers.debt")}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-slate-700">
                      <span>AFN {debtAFN}</span>
                      <span>USD {debtUSD}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {t("customers.paid")}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-slate-700">
                      <span>AFN {paidAFN}</span>
                      <span>USD {paidUSD}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("customers.phone")}
                    </span>
                    <span className="font-medium text-slate-800">
                      {phone || t("customers.noPhone")}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {!isLoading && !error && total > pageSize && (
        <div className="mt-6">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        </div>
      )}
    </section>
  );
}
