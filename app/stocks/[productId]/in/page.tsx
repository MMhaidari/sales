"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useGetStockHistoryQuery } from "@/redux/api/stocksApi";
import { formatDualDate } from "@/lib/dateFormat";
import { useLanguage } from "@/components/ui/LanguageProvider";

export default function StockHistoryInPage() {
    const { t } = useLanguage();
    const params = useParams<{ productId: string }>();
    const productId = typeof params?.productId === "string" ? params.productId : "";

    const {
        data: stockHistory,
        isLoading,
        isError,
    } = useGetStockHistoryQuery(productId, { skip: !productId });

    const formatDate = (value: string) => formatDualDate(value);

    const entries = stockHistory
        ? stockHistory.history.filter((entry) => entry.movementType === "IN")
        : [];

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
                    <p className="mt-1 text-sm text-slate-600">{t("stockHistory.incomingTitle")}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href={`/stocks/${productId}`}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                    >
                        {t("stockHistory.overview")}
                    </Link>
                    <Link
                        href="/stocks"
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                    >
                        {t("stockHistory.backToStocks")}
                    </Link>
                </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">{t("stockHistory.inHistory")}</h2>
                    {stockHistory && (
                        <span className="text-xs text-slate-500">{entries.length} {t("common.entries")}</span>
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
                    {productId && !isLoading && !isError && entries.length === 0 && (
                        <p className="text-sm text-slate-500">{t("stockHistory.noIncoming")}</p>
                    )}
                    {productId && !isLoading && !isError && entries.length > 0 && (
                        <div className="space-y-2">
                            {entries.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {formatDate(entry.createdAt)}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {entry.sourceType} • {entry.movementType}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-emerald-600">
                                            +{entry.quantityChange} {t("stocks.packages")}
                                        </p>
                                        {entry.leakPackages !== null && (
                                            <p className="text-xs text-slate-500">
                                                {t("stockHistory.leak")}: {entry.leakPackages}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
