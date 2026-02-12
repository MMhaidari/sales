
"use client";

import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useGetCustomersQuery } from "@/redux/api/customersApi";
import { useGetProductsQuery } from "@/redux/api/productApi";
import { useAddBillMutation } from "@/redux/api/billsApi";
import { customersApi } from "@/redux/api/customersApi";
import { useDispatch } from "react-redux";
import { useLanguage } from "@/components/ui/LanguageProvider";

type BillProduct = {
    productId: string;
    numberOfPackages: number;
};

type Bill = {
    customerId: string;
    items: BillProduct[];
    totalAFN: string;
    totalUSD: string;
};

type BillStatus = "UNPAID" | "PARTIAL" | "PAID";

const CreateNewBill: React.FC = () => {
    const { t } = useLanguage();
    const { data: customers = [], isLoading: isCustomersLoading } =
        useGetCustomersQuery();
    const { data: products = [], isLoading: isProductsLoading } =
        useGetProductsQuery();
    const [addBill, { isLoading: isSaving }] = useAddBillMutation();
    const dispatch = useDispatch();
    const [selectedCustomer, setSelectedCustomer] = useState<string>("");
    const [billNumber, setBillNumber] = useState<string>("");
    const [billStatus, setBillStatus] = useState<BillStatus>("UNPAID");
    const [sherkatStock, setSherkatStock] = useState(false);
    const [mandawiCheck, setMandawiCheck] = useState(false);
    const [mandawiCheckNumber, setMandawiCheckNumber] = useState("");
    const [paidAFN, setPaidAFN] = useState<string>("");
    const [paidUSD, setPaidUSD] = useState<string>("");
    const [selectedProducts, setSelectedProducts] = useState<BillProduct[]>([
        { productId: "", numberOfPackages: 0 },
    ]);
    const [bills, setBills] = useState<Bill[]>([]);

    const productsById = useMemo(() => {
        return new Map(products.map((product) => [product.id, product]));
    }, [products]);

    const getItemTotal = (productId: string, numberOfPackages: number) => {
        const product = productsById.get(productId);
        if (!product) return 0;
        const unitPrice = Number(product.currentPricePerPackage);
        return Number.isFinite(unitPrice) ? unitPrice * numberOfPackages : 0;
    };

    const handleRowChange = (
        index: number,
        patch: Partial<BillProduct>
    ) => {
        setSelectedProducts((prev) =>
            prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
        );
    };

    const addRow = () => {
        setSelectedProducts((prev) => [
            ...prev,
            { productId: "", numberOfPackages: 0 },
        ]);
    };

    const removeRow = (index: number) => {
        setSelectedProducts((prev) =>
            prev.filter((_, idx) => idx !== index)
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const filteredItems = selectedProducts.filter(
            (item) => item.productId && item.numberOfPackages > 0
        );
        if (!selectedCustomer || filteredItems.length === 0) return;
        if (!billNumber.trim()) {
            toast.error(t("toast.billNumberRequired"));
            return;
        }

        const parsePaid = (value: string) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        };

        const totalAFN = previewTotals.totalAFN;
        const totalUSD = previewTotals.totalUSD;

        const paidAFNValue = billStatus === "PAID" ? totalAFN : parsePaid(paidAFN);
        const paidUSDValue = billStatus === "PAID" ? totalUSD : parsePaid(paidUSD);

        if (billStatus === "PARTIAL") {
            if (paidAFNValue == null || paidUSDValue == null) {
                toast.error(t("toast.paidAmountsRequired"));
                return;
            }
            if (paidAFNValue < 0 || paidUSDValue < 0) {
                toast.error(t("toast.paidNegative"));
                return;
            }
            if (paidAFNValue > totalAFN || paidUSDValue > totalUSD) {
                toast.error(t("toast.paidExceed"));
                return;
            }
            if (paidAFNValue === 0 && paidUSDValue === 0) {
                toast.error(t("toast.paidAtLeastOne"));
                return;
            }
        }

        try {
            const normalizedMandawiCheckNumber = mandawiCheckNumber.trim();
            const finalMandawiCheck =
                mandawiCheck || Boolean(normalizedMandawiCheckNumber);

            const created = await addBill({
                customerId: selectedCustomer,
                billNumber: billNumber.trim() || undefined,
                status: billStatus,
                sherkatStock,
                mandawiCheck: finalMandawiCheck,
                mandawiCheckNumber: normalizedMandawiCheckNumber || undefined,
                paidAFN:
                    billStatus === "UNPAID"
                        ? undefined
                        : String(paidAFNValue ?? 0),
                paidUSD:
                    billStatus === "UNPAID"
                        ? undefined
                        : String(paidUSDValue ?? 0),
                items: filteredItems,
            }).unwrap();

            let savedTotalAFN = 0;
            let savedTotalUSD = 0;
            for (const item of created.items) {
                const amount = Number(item.totalAmount);
                if (!Number.isFinite(amount)) continue;
                if (item.currency === "AFN") savedTotalAFN += amount;
                if (item.currency === "USD") savedTotalUSD += amount;
            }

            setBills((prev) => [
                ...prev,
                {
                    customerId: created.customerId,
                    items: created.items.map((item) => ({
                        productId: item.productId,
                        numberOfPackages: item.numberOfPackages,
                    })),
                    totalAFN: savedTotalAFN.toString(),
                    totalUSD: savedTotalUSD.toString(),
                },
            ]);

            toast.success(t("toast.billCreated"));
            dispatch(
                customersApi.util.invalidateTags([
                    { type: "Customer", id: created.customerId },
                    { type: "Customer", id: "LIST" },
                ])
            );
            setSelectedCustomer("");
            setBillNumber("");
            setBillStatus("UNPAID");
            setSherkatStock(false);
            setMandawiCheck(false);
            setMandawiCheckNumber("");
            setPaidAFN("");
            setPaidUSD("");
            setSelectedProducts([{ productId: "", numberOfPackages: 0 }]);
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
                    ((err as { data?: { error?: string } }).data as {
                        error?: string;
                    }).error || t("toast.failedCreateBill")
                );
            } else {
                toast.error(t("toast.failedCreateBill"));
            }
        }
    };

    const previewItems = selectedProducts.filter(
        (item) => item.productId && item.numberOfPackages > 0
    );

    const previewTotals = previewItems.reduce(
        (acc, item) => {
            const product = productsById.get(item.productId);
            if (!product) return acc;
            const itemTotal = getItemTotal(item.productId, item.numberOfPackages);
            if (product.currencyType === "AFN") acc.totalAFN += itemTotal;
            if (product.currencyType === "USD") acc.totalUSD += itemTotal;
            return acc;
        },
        { totalAFN: 0, totalUSD: 0 }
    );

    return (
        <div className="space-y-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        {t("bills.sectionLabel")}
                    </p>
                    <h2 className="text-3xl font-semibold text-slate-900">
                        {t("billCreate.title")}
                    </h2>
                    <p className="text-sm text-slate-600">
                        {t("billCreate.subtitle")}
                    </p>
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                    {bills.length} {t("common.bills")}
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                <form
                    onSubmit={handleSubmit}
                    className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
                >
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                            {t("billCreate.customer")}
                        </label>
                        <select
                            value={selectedCustomer}
                            onChange={(e) => setSelectedCustomer(e.target.value)}
                            required
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        >
                            <option value="">{t("billCreate.selectCustomer")}</option>
                            {customers.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        {isCustomersLoading && (
                            <p className="text-xs text-slate-500">{t("billCreate.loadingCustomers")}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                            {t("billCreate.billNumber")}
                        </label>
                        <input
                            value={billNumber}
                            onChange={(e) =>
                                setBillNumber(e.target.value.replace(/\D/g, ""))
                            }
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder={t("billCreate.digitsOnly")}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        />
                        <p className="text-xs text-slate-500">
                            {t("billCreate.billNumberHint")}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                            {t("billCreate.status")}
                        </label>
                        <select
                            value={billStatus}
                            onChange={(e) => setBillStatus(e.target.value as BillStatus)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        >
                            <option value="UNPAID">{t("billCreate.unpaid")}</option>
                            <option value="PARTIAL">{t("billCreate.partial")}</option>
                            <option value="PAID">{t("billCreate.paid")}</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-700">
                                {t("billCreate.sherkatStock")}
                            </p>
                            <p className="text-xs text-slate-500">
                                {t("billCreate.sherkatDesc")}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSherkatStock((prev) => !prev)}
                            className={`h-7 w-14 rounded-full border transition ${
                                sherkatStock
                                    ? "border-slate-900 bg-slate-900"
                                    : "border-slate-200 bg-white"
                            }`}
                        >
                            <span
                                className={`block h-6 w-6 rounded-full bg-white shadow transition ${
                                    sherkatStock ? "translate-x-7" : "translate-x-1"
                                }`}
                            />
                        </button>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-700">
                                    {t("billCreate.mandawi")}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {t("billCreate.mandawiDesc")}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMandawiCheck((prev) => !prev)}
                                className={`h-7 w-14 rounded-full border transition ${
                                    mandawiCheck
                                        ? "border-slate-900 bg-slate-900"
                                        : "border-slate-200 bg-white"
                                }`}
                            >
                                <span
                                    className={`block h-6 w-6 rounded-full bg-white shadow transition ${
                                        mandawiCheck ? "translate-x-7" : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {t("billCreate.checkNumber")}
                            </label>
                            <input
                                value={mandawiCheckNumber}
                                onChange={(e) =>
                                    setMandawiCheckNumber(e.target.value.replace(/\D/g, ""))
                                }
                                inputMode="numeric"
                                placeholder={t("billCreate.checkPlaceholder")}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                    </div>

                    {billStatus !== "UNPAID" && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">
                                    {t("billCreate.paidAFN")}
                                </label>
                                <input
                                    value={
                                        billStatus === "PAID"
                                            ? previewTotals.totalAFN.toString()
                                            : paidAFN
                                    }
                                    onChange={(e) =>
                                        setPaidAFN(e.target.value.replace(/[^0-9.]/g, ""))
                                    }
                                    readOnly={billStatus === "PAID"}
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">
                                    {t("billCreate.paidUSD")}
                                </label>
                                <input
                                    value={
                                        billStatus === "PAID"
                                            ? previewTotals.totalUSD.toString()
                                            : paidUSD
                                    }
                                    onChange={(e) =>
                                        setPaidUSD(e.target.value.replace(/[^0-9.]/g, ""))
                                    }
                                    readOnly={billStatus === "PAID"}
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                />
                            </div>
                            <p className="text-xs text-slate-500 sm:col-span-2">
                                {billStatus === "PAID"
                                    ? t("billCreate.paidAuto")
                                    : t("billCreate.paidManual")}
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-700">
                                {t("billCreate.products")}
                            </label>
                            <span className="text-xs text-slate-500">
                                {t("billCreate.quantityHint")}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {selectedProducts.map((item, index) => {
                                const product = item.productId
                                    ? productsById.get(item.productId)
                                    : undefined;
                                return (
                                    <div
                                        key={`${item.productId || "row"}-${index}`}
                                        className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-[1.6fr_0.6fr_auto] sm:items-center"
                                    >
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                {t("billCreate.product")}
                                            </label>
                                            <select
                                                value={item.productId}
                                                onChange={(e) =>
                                                    handleRowChange(index, {
                                                        productId: e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                            >
                                                <option value="">{t("stocks.selectProduct")}</option>
                                                {products.map((productOption) => (
                                                    <option key={productOption.id} value={productOption.id}>
                                                        {productOption.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {product && (
                                                <p className="text-xs text-slate-500">
                                                    {product.currencyType} {product.currentPricePerPackage} {t("products.perPackage")}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                {t("billCreate.packages")}
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={item.numberOfPackages}
                                                onChange={(e) =>
                                                    handleRowChange(index, {
                                                        numberOfPackages: Math.max(
                                                            0,
                                                            Number(e.target.value)
                                                        ),
                                                    })
                                                }
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                                                {product?.currencyType ?? "--"}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeRow(index)}
                                                className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                                                disabled={selectedProducts.length === 1}
                                            >
                                                {t("billCreate.remove")}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {isProductsLoading && (
                                <p className="text-xs text-slate-500">{t("billCreate.loadingProducts")}</p>
                            )}
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={addRow}
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                            >
                                + {t("billCreate.addProduct")}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                        <p className="text-xs text-slate-500">
                            {t("billCreate.sessionHint")}
                        </p>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-800"
                        >
                            {isSaving ? t("common.saving") : t("billCreate.create")}
                        </button>
                    </div>
                </form>

                <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-xl">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900">{t("billCreate.preview")}</h3>
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                            {t("billCreate.draft")}
                        </span>
                    </div>
                    <div className="mt-5 space-y-3 text-sm text-slate-600">
                        <p>
                            {t("billCreate.customer")}: {selectedCustomer || t("billCreate.notSelected")}
                        </p>
                        <div className="space-y-2">
                            {previewItems.map((item) => {
                                    const prod = productsById.get(item.productId);
                                    const itemTotal = getItemTotal(
                                        item.productId,
                                        item.numberOfPackages
                                    );
                                    return (
                                        <div
                                            key={`${item.productId}-${item.numberOfPackages}`}
                                            className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm"
                                        >
                                            <span className="text-slate-700">
                                                {prod?.name}
                                            </span>
                                            <span className="font-semibold text-slate-900">
                                                {item.numberOfPackages} {t("stocks.packages")}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {prod?.currencyType ?? "--"} {itemTotal}
                                            </span>
                                        </div>
                                    );
                                })}
                            {previewItems.length === 0 && (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
                                    {t("billCreate.addItems")}
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold">
                                {t("billCreate.afnTotal")}: {previewTotals.totalAFN}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold">
                                {t("billCreate.usdTotal")}: {previewTotals.totalUSD}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">{t("billCreate.existing")}</h3>
                    <span className="text-xs text-slate-500">
                        {bills.length} {t("common.total")}
                    </span>
                </div>
                <div className="mt-4 space-y-4">
                    {bills.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                            {t("billCreate.noBills")}
                        </div>
                    )}
                    {bills.map((bill, idx) => {
                        const customer = customers.find(
                            (c) => c.id === bill.customerId
                        );
                        return (
                            <div
                                key={idx}
                                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {customer?.name}
                                    </p>
                                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                        <span>{t("billCreate.afnTotal")}: {bill.totalAFN}</span>
                                        <span>{t("billCreate.usdTotal")}: {bill.totalUSD}</span>
                                    </div>
                                </div>
                                <div className="mt-3 grid gap-2">
                                    {bill.items
                                        .filter((p) => p.numberOfPackages > 0)
                                        .map((p) => {
                                            const prod = productsById.get(p.productId);
                                            const itemTotal = getItemTotal(
                                                p.productId,
                                                p.numberOfPackages
                                            );
                                            return (
                                                <div
                                                    key={p.productId}
                                                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm"
                                                >
                                                    <span className="text-slate-700">
                                                        {prod?.name}
                                                    </span>
                                                    <span className="font-semibold text-slate-900">
                                                        {p.numberOfPackages} {t("stocks.packages")}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {prod?.currencyType ?? "--"} {itemTotal}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CreateNewBill;