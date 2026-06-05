"use client";

import { useMemo, useState } from "react";
import { useGetBillsQuery } from "@/redux/api/billsApi";
import { useGetProductsQuery } from "@/redux/api/productApi";
import { useGetStockSummaryQuery } from "@/redux/api/stocksApi";
import { useLanguage } from "@/components/ui/LanguageProvider";
import { formatDualDate } from "@/lib/dateFormat";
import Pagination from "@/components/ui/Pagination";

type ReportRow = {
	productId: string;
	productName: string;
	packagesSold: number;
	totalAFN: number;
	totalUSD: number;
};

type StockReportRow = {
	productId: string;
	productName: string;
	openingPackages: number;
	soldPackages: number;
	closingPackages: number;
};

function startOfDay(date: Date) {
	const copy = new Date(date);
	copy.setHours(0, 0, 0, 0);
	return copy;
}

export default function ReportsPage() {
	const { t } = useLanguage();
	const { data: bills = [], isLoading: billsLoading } = useGetBillsQuery();
	const { data: products = [], isLoading: productsLoading } =
		useGetProductsQuery();
	const { data: stockSummary = [], isLoading: stockLoading } =
		useGetStockSummaryQuery();
	const [page, setPage] = useState(1);
	const [showStockSnapshot, setShowStockSnapshot] = useState(false);
	const [isPrinting, setIsPrinting] = useState(false);
	const pageSize = 10;

	const today = useMemo(() => new Date(), []);
	const todayStart = useMemo(() => startOfDay(today), [today]);
	const tomorrowStart = useMemo(() => {
		const next = new Date(todayStart);
		next.setDate(next.getDate() + 1);
		return next;
	}, [todayStart]);

	const stockSoldTodayByProduct = useMemo(() => {
		const sold = new Map<string, number>();

		bills.forEach((bill) => {
			const billDate = new Date(bill.billDate);
			if (Number.isNaN(billDate.getTime())) return;
			if (billDate < todayStart || billDate >= tomorrowStart) return;
			if (bill.sherkatStock) return;

			bill.items.forEach((item) => {
				sold.set(
					item.productId,
					(sold.get(item.productId) ?? 0) + item.numberOfPackages
				);
			});
		});

		return sold;
	}, [bills, todayStart, tomorrowStart]);

	const openingStockRows = useMemo(
		() =>
			stockSummary.map((stockRow) => ({
				...stockRow,
				openingPackages:
					stockRow.packagesAvailable +
					(stockSoldTodayByProduct.get(stockRow.productId) ?? 0),
			})),
		[stockSummary, stockSoldTodayByProduct]
	);

	const totalOpeningStock = useMemo(
		() =>
			openingStockRows.reduce(
				(total, row) => total + row.openingPackages,
				0
			),
		[openingStockRows]
	);

	const stockReportRows = useMemo<StockReportRow[]>(() => {
		const productsById = new Map(products.map((product) => [product.id, product]));
		const stockByProductId = new Map(
			stockSummary.map((stockRow) => [stockRow.productId, stockRow])
		);
		const allProductIds = new Set([
			...products.map((product) => product.id),
			...stockSummary.map((stockRow) => stockRow.productId),
		]);

		return Array.from(allProductIds)
			.map((productId) => {
				const product = productsById.get(productId);
				const stockRow = stockByProductId.get(productId);
				const closingPackages = stockRow?.packagesAvailable ?? 0;
				const soldPackages = stockSoldTodayByProduct.get(productId) ?? 0;

				return {
					productId,
					productName:
						product?.name ?? stockRow?.productName ?? t("common.unknown"),
					openingPackages: closingPackages + soldPackages,
					soldPackages,
					closingPackages,
				};
			})
			.sort((a, b) => a.productName.localeCompare(b.productName));
	}, [products, stockSummary, stockSoldTodayByProduct, t]);

	const totalClosingStock = useMemo(
		() =>
			stockSummary.reduce(
				(total, stockRow) => total + stockRow.packagesAvailable,
				0
			),
		[stockSummary]
	);

	const reportRows = useMemo<ReportRow[]>(() => {
		const productsById = new Map(products.map((product) => [product.id, product]));
		const rows = new Map<string, ReportRow>();

		bills.forEach((bill) => {
			const billDate = new Date(bill.billDate);
			if (Number.isNaN(billDate.getTime())) return;
			if (billDate < todayStart || billDate >= tomorrowStart) return;

			bill.items.forEach((item) => {
				const existing = rows.get(item.productId);
				const product = productsById.get(item.productId);
				const name = product?.name ?? t("common.unknown");
				const amount = Number(item.totalAmount);
				const normalizedAmount = Number.isFinite(amount) ? amount : 0;

				if (!existing) {
					rows.set(item.productId, {
						productId: item.productId,
						productName: name,
						packagesSold: item.numberOfPackages,
						totalAFN: item.currency === "AFN" ? normalizedAmount : 0,
						totalUSD: item.currency === "USD" ? normalizedAmount : 0,
					});
					return;
				}

				existing.packagesSold += item.numberOfPackages;
				if (item.currency === "AFN") existing.totalAFN += normalizedAmount;
				if (item.currency === "USD") existing.totalUSD += normalizedAmount;
			});
		});

		return Array.from(rows.values()).sort(
			(a, b) => b.packagesSold - a.packagesSold
		);
	}, [bills, products, t, todayStart, tomorrowStart]);
	const totalPages = Math.max(1, Math.ceil(reportRows.length / pageSize));
	const safePage = Math.min(page, totalPages);

	const totals = useMemo(() => {
		return reportRows.reduce(
			(acc, row) => {
				acc.totalPackages += row.packagesSold;
				acc.totalAFN += row.totalAFN;
				acc.totalUSD += row.totalUSD;
				return acc;
			},
			{ totalPackages: 0, totalAFN: 0, totalUSD: 0 }
		);
	}, [reportRows]);

	const pagedRows = useMemo(() => {
		const start = (safePage - 1) * pageSize;
		return reportRows.slice(start, start + pageSize);
	}, [reportRows, safePage]);

	const printableStockRows = stockReportRows.filter(
		(row) =>
			row.openingPackages !== 0 ||
			row.soldPackages !== 0 ||
			row.closingPackages !== 0
	);
	const printableSalesRows = reportRows.filter(
		(row) => row.packagesSold !== 0 || row.totalAFN !== 0 || row.totalUSD !== 0
	);
	const hasPrintableData = printableStockRows.length > 0 || printableSalesRows.length > 0;

	const handlePrint = async () => {
		if (!hasPrintableData || isPrinting) return;
		setIsPrinting(true);

		try {
			const openingRows = printableStockRows.filter((row) => row.openingPackages !== 0);
			const closingRows = printableStockRows.filter((row) => row.closingPackages !== 0);

			const escapeHtml = (value: string) =>
				value
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;")
					.replace(/"/g, "&quot;")
					.replace(/'/g, "&#39;");

			const openingHtml = openingRows.length
				? `<div style="margin-top:24px;"><div style="font-size:14px;font-weight:600;margin-bottom:10px;">${escapeHtml(
					t("reports.openingStockTitle")
				)}</div><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr><th style="border:1px solid #e5e7eb;padding:10px;text-align:left;background:#f8fafc;">${escapeHtml(
					t("reports.product")
				)}</th><th style="border:1px solid #e5e7eb;padding:10px;text-align:right;background:#f8fafc;">${escapeHtml(
					t("reports.openingStockTitle")
				)}</th></tr></thead><tbody>${openingRows
					.map(
						(row) =>
							`<tr><td style="border:1px solid #e5e7eb;padding:8px;">${escapeHtml(
								row.productName
							)}</td><td style="border:1px solid #e5e7eb;padding:8px;text-align:right;">${row.openingPackages.toLocaleString()}</td></tr>`
						)
						.join("")}<tbody></table></div>`
				: "";

			const salesHtml = printableSalesRows.length
				? `<div style="margin-top:24px;"><div style="font-size:14px;font-weight:600;margin-bottom:10px;">${escapeHtml(
					t("reports.dailyTitle")
				)}</div><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr><th style="border:1px solid #e5e7eb;padding:10px;text-align:left;background:#f8fafc;">${escapeHtml(
					t("reports.product")
				)}</th><th style="border:1px solid #e5e7eb;padding:10px;text-align:right;background:#f8fafc;">${escapeHtml(
					t("reports.packagesSold")
				)}</th><th style="border:1px solid #e5e7eb;padding:10px;text-align:right;background:#f8fafc;">${escapeHtml(
					t("reports.totalAFN")
				)}</th><th style="border:1px solid #e5e7eb;padding:10px;text-align:right;background:#f8fafc;">${escapeHtml(
					t("reports.totalUSD")
				)}</th></tr></thead><tbody>${printableSalesRows
					.map(
						(row) =>
							`<tr><td style="border:1px solid #e5e7eb;padding:8px;">${escapeHtml(
								row.productName
							)}</td><td style="border:1px solid #e5e7eb;padding:8px;text-align:right;">${row.packagesSold.toLocaleString()}</td><td style="border:1px solid #e5e7eb;padding:8px;text-align:right;">${row.totalAFN.toLocaleString()}</td><td style="border:1px solid #e5e7eb;padding:8px;text-align:right;">${row.totalUSD.toLocaleString()}</td></tr>`
						)
						.join("")}<tbody></table></div>`
				: "";

			const closingHtml = closingRows.length
				? `<div style="margin-top:24px;"><div style="font-size:14px;font-weight:600;margin-bottom:10px;">${escapeHtml(
					t("reports.closingStockTitle")
				)}</div><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr><th style="border:1px solid #e5e7eb;padding:10px;text-align:left;background:#f8fafc;">${escapeHtml(
					t("reports.product")
				)}</th><th style="border:1px solid #e5e7eb;padding:10px;text-align:right;background:#f8fafc;">${escapeHtml(
					t("reports.closingStockTitle")
				)}</th></tr></thead><tbody>${closingRows
					.map(
						(row) =>
							`<tr><td style="border:1px solid #e5e7eb;padding:8px;">${escapeHtml(
								row.productName
							)}</td><td style="border:1px solid #e5e7eb;padding:8px;text-align:right;">${row.closingPackages.toLocaleString()}</td></tr>`
						)
						.join("")}<tbody></table></div>`
				: "";

			const html = `
				<div style="font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
					<div style="margin-bottom:20px;">
						<div style="font-size:16px;font-weight:700;margin-bottom:4px;">${escapeHtml(
							t("reports.title")
						)}</div>
						<div style="font-size:13px;color:#64748b;">${escapeHtml(
							`${t("reports.dateLabel")}: ${formatDualDate(today.toISOString())}`
						)}</div>
					</div>
					${openingHtml}
					${salesHtml}
					${closingHtml}
				</div>`;

			const { default: printJS } = await import("print-js");
			printJS({ printable: html, type: "raw-html" });
		} finally {
			setIsPrinting(false);
		}
	};

	return (
		<section className="space-y-8">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
						{t("reports.title")}
					</p>
					<h1 className="mt-2 text-3xl font-semibold text-slate-900">
						{t("reports.dailyTitle")}
					</h1>
					<p className="mt-1 text-sm text-slate-600">
						{t("reports.dailySubtitle")}
					</p>
				</div>
				<div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
					{t("reports.dateLabel")}: {formatDualDate(today.toISOString())}
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-4">
			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={() => setShowStockSnapshot((prev) => !prev)}
					className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
				>
					{showStockSnapshot
						? t("reports.hideStockSnapshot")
						: t("reports.showStockSnapshot")}
				</button>
				<button
					type="button"
					onClick={handlePrint}
					disabled={!hasPrintableData || isPrinting}
					className="rounded-full border border-slate-200 bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isPrinting ? t("reports.printing") : t("reports.printReport")}
				</button>
			</div>
			<p className="text-sm text-slate-500">
				{t("reports.stockSnapshotHint")}
			</p>
		</div>

		{showStockSnapshot && (
				<div className="space-y-4">
					<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-semibold text-slate-900">
								{t("reports.stockSnapshotTitle")}
							</h2>
							{(billsLoading || stockLoading) && (
								<span className="text-xs text-slate-400">
									{t("reports.loading")}
								</span>
							)}
						</div>

						<div className="mt-4 grid gap-4 sm:grid-cols-2">
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
									{t("reports.dateLabel")}
								</p>
								<p className="mt-2 text-2xl font-semibold text-slate-900">
									{formatDualDate(today.toISOString())}
								</p>
							</div>
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
									{t("reports.openingStockTitle")}
								</p>
								<p className="mt-2 text-2xl font-semibold text-slate-900">
									{totalOpeningStock.toLocaleString()}
								</p>
							</div>
						</div>

						<div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
							<div className="grid grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr] gap-2 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
								<span>{t("reports.product")}</span>
								<span>{t("reports.openingStockTitle")}</span>
								<span>{t("reports.soldToday")}</span>
								<span>{t("reports.closingStockTitle")}</span>
							</div>
							<div className="divide-y divide-slate-100 bg-white">
								{stockReportRows.map((row) => (
									<div
										key={row.productId}
										className="grid grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr] gap-2 px-4 py-3 text-sm text-slate-700"
									>
										<span className="font-semibold text-slate-900">
											{row.productName}
										</span>
										<span>{row.openingPackages.toLocaleString()}</span>
										<span>{row.soldPackages.toLocaleString()}</span>
										<span>{row.closingPackages.toLocaleString()}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}

			<div className="grid gap-4 md:grid-cols-3">
				<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
						{t("reports.totalPackages")}
					</p>
					<p className="mt-2 text-2xl font-semibold text-slate-900">
						{totals.totalPackages.toLocaleString()}
					</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
						{t("reports.totalAFN")}
					</p>
					<p className="mt-2 text-2xl font-semibold text-rose-600">
						{totals.totalAFN.toLocaleString()}
					</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
						{t("reports.totalUSD")}
					</p>
					<p className="mt-2 text-2xl font-semibold text-amber-600">
						{totals.totalUSD.toLocaleString()}
					</p>
				</div>
			</div>

			<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-slate-900">
						{t("reports.dailyTitle")}
					</h2>
					{(billsLoading || productsLoading) && (
						<span className="text-xs text-slate-400">{t("reports.loading")}</span>
					)}
				</div>

				<div className="mt-4 space-y-3">
					{(billsLoading || productsLoading) && (
						<p className="text-sm text-slate-500">{t("reports.loading")}</p>
					)}
					{!billsLoading && !productsLoading && reportRows.length === 0 && (
						<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
							{t("reports.noSales")}
						</div>
					)}
					{!billsLoading && !productsLoading && reportRows.length > 0 && (
						<div className="overflow-hidden rounded-2xl border border-slate-100">
							<div className="grid grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr] gap-2 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
								<span>{t("reports.product")}</span>
								<span>{t("reports.packagesSold")}</span>
								<span>{t("reports.totalAFN")}</span>
								<span>{t("reports.totalUSD")}</span>
							</div>
							<div className="divide-y divide-slate-100">
								{pagedRows.map((row) => (
									<div
										key={row.productId}
										className="grid grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr] gap-2 px-4 py-3 text-sm text-slate-700"
									>
										<span className="font-semibold text-slate-900">{row.productName}</span>
										<span>{row.packagesSold.toLocaleString()}</span>
										<span>{row.totalAFN.toLocaleString()}</span>
										<span>{row.totalUSD.toLocaleString()}</span>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{!billsLoading && !productsLoading && reportRows.length > pageSize && (
					<div className="mt-5">
						<Pagination
							page={safePage}
							pageSize={pageSize}
							total={reportRows.length}
							onPageChange={setPage}
						/>
					</div>
				)}
			</div>
		{showStockSnapshot && (
			<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-slate-900">
						{t("reports.closingStockTitle")}
					</h2>
					{stockLoading && (
						<span className="text-xs text-slate-400">
							{t("reports.loading")}
						</span>
					)}
				</div>

				<div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
						{t("reports.closingStockTitle")}
					</p>
					<p className="mt-2 text-2xl font-semibold text-slate-900">
						{totalClosingStock.toLocaleString()}
					</p>
				</div>
			</div>
		)}
	</section>
	);
}
