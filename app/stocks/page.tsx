"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useGetProductsQuery } from "@/redux/api/productApi";
import { useAddStockMutation, useGetStockSummaryQuery } from "@/redux/api/stocksApi";
import { useLanguage } from "@/components/ui/LanguageProvider";
import Pagination from "@/components/ui/Pagination";

export default function StocksPage() {
    const { t } = useLanguage();
    const { data: products = [] } = useGetProductsQuery();
    const {
        data: stockSummary = [],
        isLoading: isStockLoading,
        isError: isStockError,
    } = useGetStockSummaryQuery();
    const [addStock, { isLoading: isSaving }] = useAddStockMutation();

    const [productId, setProductId] = useState("");
    const [quantityChange, setQuantityChange] = useState("");
    const [note, setNote] = useState("");
    const [isContainer, setIsContainer] = useState(false);
    const [containerNumber, setContainerNumber] = useState("");
    const [driverName, setDriverName] = useState("");
    const [billOfLadingNumber, setBillOfLadingNumber] = useState("");
    const [arrivalDate, setArrivalDate] = useState("");
    const [leakPackages, setLeakPackages] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const productsById = useMemo(
        () => new Map(products.map((product) => [product.id, product])),
        [products]
    );

    const pagedStockSummary = useMemo(() => {
        const start = (page - 1) * pageSize;
        return stockSummary.slice(start, start + pageSize);
    }, [stockSummary, page]);

    const resetForm = () => {
        setProductId("");
        setQuantityChange("");
        setNote("");
        setIsContainer(false);
        setContainerNumber("");
        setDriverName("");
        setBillOfLadingNumber("");
        setArrivalDate("");
        setLeakPackages("");
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const parsedQuantity = Number(quantityChange);

        if (!productId) {
            toast.error(t("toast.selectProduct"));
            return;
        }
        if (!Number.isFinite(parsedQuantity) || parsedQuantity === 0) {
            toast.error(t("toast.enterNonZero"));
            return;
        }

        const parsedLeak = leakPackages ? Number(leakPackages) : undefined;
        if (parsedLeak !== undefined && (!Number.isFinite(parsedLeak) || parsedLeak < 0)) {
            toast.error(t("toast.leakPositive"));
            return;
        }

        try {
            await addStock({
                productId,
                quantityChange: Math.trunc(parsedQuantity),
                note: note.trim() || undefined,
                isContainer,
                containerNumber: containerNumber.trim() || undefined,
                driverName: driverName.trim() || undefined,
                billOfLadingNumber: billOfLadingNumber.trim() || undefined,
                arrivalDate: arrivalDate || undefined,
                leakPackages: parsedLeak !== undefined ? Math.trunc(parsedLeak) : undefined,
            }).unwrap();

            toast.success(t("toast.stockAdded"));
            resetForm();
        } catch (err) {
            if (
                typeof err === "object" &&
                err !== null &&
                "data" in err &&
                typeof (err as { data?: { error?: string } }).data === "object" &&
                (err as { data?: { error?: string } }).data !== null &&
                "error" in (err as { data?: { error?: string } }).data!
            ) {
                toast.error(
                    ((err as { data?: { error?: string } }).data as { error?: string })
                        .error || t("toast.failedAddStock")
                );
            } else {
                toast.error(t("toast.failedAddStock"));
            }
        }
    };

    return (
        <section className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        {t("stocks.inventory")}
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold text-slate-900">{t("stocks.title")}</h1>
                    <p className="mt-1 text-sm text-slate-600">
                        {t("stocks.subtitle")}
                    </p>
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                    {stockSummary.length} {t("common.products")}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <form
                    onSubmit={handleSubmit}
                    className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
                >
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">{t("stocks.addStock")}</h2>
                        <p className="text-sm text-slate-500">
                            {t("stocks.addStockDesc")}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">{t("stocks.product")}</label>
                        <select
                            value={productId}
                            onChange={(event) => setProductId(event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        >
                            <option value="">{t("stocks.selectProduct")}</option>
                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name}
                                </option>
                            ))}
                        </select>
                        {productId && productsById.get(productId) && (
                            <p className="text-xs text-slate-500">
                                {productsById.get(productId)?.currencyType} {productsById.get(productId)?.currentPricePerPackage} {t("products.perPackage")}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">
                                {t("stocks.packageChange")}
                            </label>
                            <input
                                value={quantityChange}
                                onChange={(event) => setQuantityChange(event.target.value.replace(/[^0-9-]/g, ""))}
                                inputMode="numeric"
                                placeholder="e.g. 120"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            />
                            <p className="text-xs text-slate-500">{t("stocks.packageChangeHint")}</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">{t("stocks.leakPackages")}</label>
                            <input
                                value={leakPackages}
                                onChange={(event) => setLeakPackages(event.target.value.replace(/\D/g, ""))}
                                inputMode="numeric"
                                placeholder="0"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">{t("stocks.note")}</label>
                        <textarea
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            placeholder={t("stocks.notePlaceholder")}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-700">{t("stocks.containerShipment")}</p>
                            <p className="text-xs text-slate-500">
                                {t("stocks.containerShipmentDesc")}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsContainer((prev) => !prev)}
                            className={`h-7 w-14 rounded-full border transition ${
                                isContainer
                                    ? "border-slate-900 bg-slate-900"
                                    : "border-slate-200 bg-white"
                            }`}
                        >
                            <span
                                className={`block h-6 w-6 rounded-full bg-white shadow transition ${
                                    isContainer ? "translate-x-7" : "translate-x-1"
                                }`}
                            />
                        </button>
                    </div>

                    {isContainer && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">
                                    {t("stocks.containerNumber")}
                                </label>
                                <input
                                    value={containerNumber}
                                    onChange={(event) => setContainerNumber(event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">{t("stocks.driverName")}</label>
                                <input
                                    value={driverName}
                                    onChange={(event) => setDriverName(event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">
                                    {t("stocks.billOfLading")}
                                </label>
                                <input
                                    value={billOfLadingNumber}
                                    onChange={(event) => setBillOfLadingNumber(event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">
                                    {t("stocks.arrivalDate")}
                                </label>
                                <input
                                    type="date"
                                    value={arrivalDate}
                                    onChange={(event) => setArrivalDate(event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                        >
                            {isSaving ? t("common.saving") : t("stocks.addStock")}
                        </button>
                    </div>
                </form>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">{t("stocks.stockLevels")}</h2>
                        <span className="text-xs text-slate-500">
                            {stockSummary.length} {t("common.items")}
                        </span>
                    </div>

                    <div className="mt-4 space-y-3">
                        {isStockLoading && (
                            <p className="text-sm text-slate-500">{t("stocks.loadingStock")}</p>
                        )}
                        {isStockError && !isStockLoading && (
                            <p className="text-sm text-red-600">{t("stocks.failedLoadStock")}</p>
                        )}
                        {!isStockLoading && !isStockError && stockSummary.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                                {t("stocks.noStockData")}
                            </div>
                        )}
                        {!isStockLoading && !isStockError && stockSummary.length > 0 && (
                            <div className="space-y-2">
                                {pagedStockSummary.map((stock) => (
                                    <Link
                                        key={stock.productId}
                                        href={`/stocks/${stock.productId}`}
                                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                                            "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white"
                                        }`}
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {stock.productName}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {t("stocks.productLabel")} #{stock.productId.slice(0, 6)}
                                            </p>
                                        </div>
                                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                            {stock.packagesAvailable} {t("stocks.packages")}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {!isStockLoading && !isStockError && stockSummary.length > pageSize && (
                        <div className="mt-5">
                            <Pagination
                                page={page}
                                pageSize={pageSize}
                                total={stockSummary.length}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}