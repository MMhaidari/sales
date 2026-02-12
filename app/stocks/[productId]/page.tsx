"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useGetStockHistoryQuery } from "@/redux/api/stocksApi";
import { useLanguage } from "@/components/ui/LanguageProvider";

export default function StockHistoryPage() {
    const { t } = useLanguage();
    const params = useParams<{ productId: string }>();
    const productId = typeof params?.productId === "string" ? params.productId : "";

    const {
        data: stockHistory,
        isLoading,
        isError,
    } = useGetStockHistoryQuery(productId, { skip: !productId });
    const inCount = stockHistory
        ? stockHistory.history.filter((entry) => entry.movementType === "IN").length
        : 0;
    const outCount = stockHistory
        ? stockHistory.history.filter((entry) => entry.movementType === "OUT").length
        : 0;

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        {t("stocks.inventory")}
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                        {stockHistory?.productName || t("stockHistory.title")}
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                        {t("stockHistory.subtitle")}
                    </p>
                </div>
                <Link
                    href="/stocks"
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                >
                    {t("stockHistory.backToStocks")}
                </Link>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">{t("stockHistory.history")}</h2>
                    {stockHistory && (
                        <span className="text-xs text-slate-500">
                            {stockHistory.history.length} {t("common.entries")}
                        </span>
                    )}
                </div>

                <div className="mt-4 space-y-3">
                    {!productId && (
                        <p className="text-sm text-slate-500">{t("stockHistory.missingProduct")}</p>
                    )}
                    {productId && isLoading && (
                        <p className="text-sm text-slate-500">{t("stockHistory.loadingHistory")}</p>
                    )}
                    {productId && isError && !isLoading && (
                        <p className="text-sm text-red-600">{t("stockHistory.failedLoadHistory")}</p>
                    )}
                    {productId &&
                        !isLoading &&
                        !isError &&
                        stockHistory &&
                        stockHistory.history.length === 0 && (
                            <p className="text-sm text-slate-500">{t("stockHistory.noHistory")}</p>
                        )}
                    {productId &&
                        !isLoading &&
                        !isError &&
                        stockHistory &&
                        stockHistory.history.length > 0 && (
                            <div className="grid gap-4 md:grid-cols-2">
                                <Link
                                    href={`/stocks/${productId}/in`}
                                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 transition hover:border-emerald-300"
                                >
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">
                                        IN
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold text-emerald-700">
                                        {inCount}
                                    </p>
                                    <p className="mt-1 text-sm text-emerald-700">{t("stockHistory.incomingEntries")}</p>
                                </Link>
                                <Link
                                    href={`/stocks/${productId}/out`}
                                    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 transition hover:border-rose-300"
                                >
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">
                                        OUT
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold text-rose-700">
                                        {outCount}
                                    </p>
                                    <p className="mt-1 text-sm text-rose-700">{t("stockHistory.outgoingEntries")}</p>
                                </Link>
                            </div>
                        )}
                </div>
            </div>
        </section>
    );
}
