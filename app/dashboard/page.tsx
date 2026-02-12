"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGetBillsQuery } from "@/redux/api/billsApi";
import { useGetCustomersQuery } from "@/redux/api/customersApi";
import { useGetStockSummaryQuery } from "@/redux/api/stocksApi";
import { useGetPaymentsQuery } from "@/redux/api/paymentsApi";
import { useGetProductsQuery } from "@/redux/api/productApi";
import { formatDualDate, formatDualDateShort } from "@/lib/dateFormat";
import { useLanguage } from "@/components/ui/LanguageProvider";
import Pagination from "@/components/ui/Pagination";

type SalesPoint = {
  label: string;
  afn: number;
  usd: number;
};

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getWeekStart(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = (day + 6) % 7; // Monday as start of week
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatShortDate(date: Date) {
  return formatDualDateShort(date);
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [recentPage, setRecentPage] = useState(1);
  const recentPageSize = 5;
  const { data: bills = [], isLoading: billsLoading } = useGetBillsQuery();
  const { data: customers = [], isLoading: customersLoading } =
    useGetCustomersQuery();
  const { data: stockSummary = [], isLoading: stockLoading } =
    useGetStockSummaryQuery();
  const { data: paymentsResponse, isLoading: paymentsLoading } =
    useGetPaymentsQuery();
  const { data: products = [], isLoading: productsLoading } =
    useGetProductsQuery();

  const weeklySales = useMemo<SalesPoint[]>(() => {
    const currentWeekStart = getWeekStart(new Date());
    const weekStarts: Date[] = [];
    for (let i = 3; i >= 0; i -= 1) {
      const week = new Date(currentWeekStart);
      week.setDate(week.getDate() - i * 7);
      weekStarts.push(week);
    }

    const salesMap = new Map(
      weekStarts.map((start) => [
        start.toISOString(),
        { label: formatShortDate(start), afn: 0, usd: 0 },
      ])
    );

    bills.forEach((bill) => {
      const billDate = new Date(bill.billDate);
      if (Number.isNaN(billDate.getTime())) return;
      const weekStart = getWeekStart(billDate);
      const key = weekStart.toISOString();
      const target = salesMap.get(key);
      if (!target) return;

      bill.items.forEach((item) => {
        const amount = toNumber(item.totalAmount);
        if (item.currency === "AFN") target.afn += amount;
        if (item.currency === "USD") target.usd += amount;
      });
    });

    return Array.from(salesMap.values());
  }, [bills]);

  const totals = useMemo(() => {
    let debtAFN = 0;
    let debtUSD = 0;
    customers.forEach((customer) => {
      debtAFN += toNumber(customer.debtAFN);
      debtUSD += toNumber(customer.debtUSD);
    });

    let paidAFN = 0;
    let paidUSD = 0;
    customers.forEach((customer) => {
      paidAFN += toNumber(customer.paidAFN);
      paidUSD += toNumber(customer.paidUSD);
    });

    const totalPackages = stockSummary.reduce(
      (sum, item) => sum + item.packagesAvailable,
      0
    );

    const lowStock = stockSummary.filter((item) => item.packagesAvailable <= 5);

    return {
      debtAFN,
      debtUSD,
      paidAFN,
      paidUSD,
      totalPackages,
      lowStockCount: lowStock.length,
    };
  }, [customers, stockSummary]);

  const paymentSummary = useMemo(() => {
    const payments = paymentsResponse?.payments ?? [];
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const weekStart = getWeekStart(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const totalsByRange = {
      dailyAFN: 0,
      dailyUSD: 0,
      weeklyAFN: 0,
      weeklyUSD: 0,
      monthlyAFN: 0,
      monthlyUSD: 0,
      yearlyAFN: 0,
      yearlyUSD: 0,
    };

    payments.forEach((payment) => {
      const date = new Date(payment.paymentDate);
      if (Number.isNaN(date.getTime())) return;
      const amount = toNumber(payment.amountPaid);
      const isAFN = payment.currency === "AFN";

      if (date >= dayStart) {
        if (isAFN) totalsByRange.dailyAFN += amount;
        else totalsByRange.dailyUSD += amount;
      }
      if (date >= weekStart) {
        if (isAFN) totalsByRange.weeklyAFN += amount;
        else totalsByRange.weeklyUSD += amount;
      }
      if (date >= monthStart) {
        if (isAFN) totalsByRange.monthlyAFN += amount;
        else totalsByRange.monthlyUSD += amount;
      }
      if (date >= yearStart) {
        if (isAFN) totalsByRange.yearlyAFN += amount;
        else totalsByRange.yearlyUSD += amount;
      }
    });

    return totalsByRange;
  }, [paymentsResponse]);

  const topStock = useMemo(
    () =>
      [...stockSummary]
        .sort((a, b) => b.packagesAvailable - a.packagesAvailable)
        .slice(0, 6)
        .map((item) => ({
          name: item.productName,
          packages: item.packagesAvailable,
        })),
    [stockSummary]
  );

  const topDebtAFN = useMemo(
    () =>
      [...customers]
        .map((customer) => ({
          id: customer.id,
          name: customer.name,
          amount: toNumber(customer.debtAFN),
        }))
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    [customers]
  );

  const topDebtUSD = useMemo(
    () =>
      [...customers]
        .map((customer) => ({
          id: customer.id,
          name: customer.name,
          amount: toNumber(customer.debtUSD),
        }))
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    [customers]
  );

  const recentBills = useMemo(() => {
    const start = (recentPage - 1) * recentPageSize;
    return bills.slice(start, start + recentPageSize);
  }, [bills, recentPage]);

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          {t("dashboard.overview")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          {t("dashboard.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {t("dashboard.customers")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {customersLoading ? "..." : customers.length}
          </p>
          <p className="text-sm text-slate-500">{t("dashboard.activeCustomers")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {t("dashboard.products")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {productsLoading ? "..." : products.length}
          </p>
          <p className="text-sm text-slate-500">{t("dashboard.itemsForSale")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {t("dashboard.outstandingAFN")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">
            {customersLoading ? "..." : totals.debtAFN.toLocaleString()}
          </p>
          <p className="text-sm text-slate-500">{t("dashboard.totalDueAFN")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {t("dashboard.outstandingUSD")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">
            {customersLoading ? "..." : totals.debtUSD.toLocaleString()}
          </p>
          <p className="text-sm text-slate-500">{t("dashboard.totalDueUSD")}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {t("dashboard.totalStock")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {stockLoading ? "..." : totals.totalPackages.toLocaleString()}
          </p>
          <p className="text-sm text-slate-500">
            {stockLoading ? "" : `${totals.lowStockCount} ${t("dashboard.lowStockItems")}`}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {t("dashboard.salesLast4Weeks")}
              </h2>
              <p className="text-sm text-slate-500">
                {t("dashboard.weeklyTotalsByCurrency")}
              </p>
            </div>
            {billsLoading && (
              <span className="text-xs text-slate-400">{t("common.loading")}</span>
            )}
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklySales} barCategoryGap={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#E2E8F0",
                  }}
                />
                <Legend />
                <Bar dataKey="afn" name="AFN" fill="#0F766E" radius={[6, 6, 0, 0]} />
                <Bar dataKey="usd" name="USD" fill="#F97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("dashboard.stockByProduct")}</h2>
              <p className="text-sm text-slate-500">{t("dashboard.topInventoryCounts")}</p>
            </div>
            {stockLoading && (
              <span className="text-xs text-slate-400">{t("common.loading")}</span>
            )}
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topStock} layout="vertical" barCategoryGap={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" stroke="#94A3B8" />
                <YAxis dataKey="name" type="category" width={90} stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#E2E8F0",
                  }}
                />
                <Bar dataKey="packages" fill="#2563EB" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("dashboard.recentBills")}</h2>
              <p className="text-sm text-slate-500">{t("dashboard.lastFiveTransactions")}</p>
            </div>
            <a
              href="/bills"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
            >
              {t("dashboard.viewAll")}
            </a>
          </div>
          <div className="mt-4 space-y-3">
            {billsLoading && (
              <p className="text-sm text-slate-500">{t("dashboard.loadingBills")}</p>
            )}
            {!billsLoading && recentBills.length === 0 && (
              <p className="text-sm text-slate-500">{t("dashboard.noBillsYet")}</p>
            )}
            {!billsLoading &&
              recentBills.map((bill) => {
                let totalAFN = 0;
                let totalUSD = 0;
                bill.items.forEach((item) => {
                  const amount = toNumber(item.totalAmount);
                  if (item.currency === "AFN") totalAFN += amount;
                  if (item.currency === "USD") totalUSD += amount;
                });

                return (
                  <div
                    key={bill.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {t("bills.billLabel")} #{bill.billNumber ?? bill.id.slice(0, 6)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDualDate(bill.billDate)}
                      </p>
                    </div>
                    <div className="text-right text-sm font-semibold text-slate-700">
                      {totalAFN > 0 && <div>AFN {totalAFN.toLocaleString()}</div>}
                      {totalUSD > 0 && <div>USD {totalUSD.toLocaleString()}</div>}
                    </div>
                  </div>
                );
              })}
          </div>

          {!billsLoading && bills.length > recentPageSize && (
            <div className="mt-5">
              <Pagination
                page={recentPage}
                pageSize={recentPageSize}
                total={bills.length}
                onPageChange={setRecentPage}
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{t("dashboard.customerDebt")}</h2>
            <p className="text-sm text-slate-500">{t("dashboard.topOutstandingBalances")}</p>
            <div className="mt-4 space-y-3">
              {customersLoading && (
                <p className="text-sm text-slate-500">{t("dashboard.loadingCustomers")}</p>
              )}
              {!customersLoading && topDebtAFN.length === 0 && topDebtUSD.length === 0 && (
                <p className="text-sm text-slate-500">{t("dashboard.noOutstandingBalances")}</p>
              )}
              {topDebtAFN.map((entry) => (
                <div
                  key={`afn-${entry.id}`}
                  className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50 px-3 py-2"
                >
                  <span className="text-sm text-slate-800">{entry.name}</span>
                  <span className="text-sm font-semibold text-rose-600">
                    AFN {entry.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              {topDebtUSD.map((entry) => (
                <div
                  key={`usd-${entry.id}`}
                  className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-3 py-2"
                >
                  <span className="text-sm text-slate-800">{entry.name}</span>
                  <span className="text-sm font-semibold text-amber-600">
                    USD {entry.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{t("dashboard.paymentsSummary")}</h2>
            <p className="text-sm text-slate-500">{t("dashboard.collectionsByPeriod")}</p>
            <div className="mt-3">
              <a
                href="/payments"
                className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
              >
                {t("dashboard.viewPayments")}
              </a>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>{t("dashboard.today")}</span>
                  {paymentsLoading && <span className="text-xs text-slate-400">{t("common.loading")}</span>}
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">AFN</span>
                  <span className="font-semibold text-slate-900">
                    {paymentSummary.dailyAFN.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">USD</span>
                  <span className="font-semibold text-slate-900">
                    {paymentSummary.dailyUSD.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>{t("dashboard.thisWeek")}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">AFN</span>
                  <span className="font-semibold text-slate-900">
                    {paymentSummary.weeklyAFN.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">USD</span>
                  <span className="font-semibold text-slate-900">
                    {paymentSummary.weeklyUSD.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>{t("dashboard.thisMonth")}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">AFN</span>
                  <span className="font-semibold text-slate-900">
                    {paymentSummary.monthlyAFN.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">USD</span>
                  <span className="font-semibold text-slate-900">
                    {paymentSummary.monthlyUSD.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>{t("dashboard.thisYear")}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">AFN</span>
                  <span className="font-semibold text-slate-900">
                    {paymentSummary.yearlyAFN.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">USD</span>
                  <span className="font-semibold text-slate-900">
                    {paymentSummary.yearlyUSD.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>{t("dashboard.allTime")}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">AFN</span>
                  <span className="font-semibold text-slate-900">
                    {totals.paidAFN.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">USD</span>
                  <span className="font-semibold text-slate-900">
                    {totals.paidUSD.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
