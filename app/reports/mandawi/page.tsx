"use client";

import { useMemo, useState } from "react";
import { useGetBillsQuery } from "@/redux/api/billsApi";
import { useGetProductsQuery } from "@/redux/api/productApi";
import { useLanguage } from "@/components/ui/LanguageProvider";
import Pagination from "@/components/ui/Pagination";

type ReportRow = {
	productId: string;
	productName: string;
	packagesSold: number;
	totalAFN: number;
	totalUSD: number;
};

export default function MandawiReportPage() {
	const { t } = useLanguage();
	const { data: bills = [], isLoading: billsLoading } = useGetBillsQuery();
	const { data: products = [], isLoading: productsLoading } = useGetProductsQuery();
	const [page, setPage] = useState(1);
	const pageSize = 10;

	const reportRows = useMemo<ReportRow[]>(() => {
		const productsById = new Map(products.map((product) => [product.id, product]));
		const rows = new Map<string, ReportRow>();

		bills.forEach((bill) => {
			if (!bill.mandawiCheck) return;
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
	}, [bills, products, t]);
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

	const mandawiStats = useMemo(() => {
		let totalBills = 0;
		let checkBills = 0;
		let hesabBills = 0;
		bills.forEach((bill) => {
			if (!bill.mandawiCheck) return;
			totalBills += 1;
			if (bill.mandawiCheckNumber) {
				checkBills += 1;
			} else {
				hesabBills += 1;
			}
		});
		return { totalBills, checkBills, hesabBills };
	}, [bills]);

	const pagedRows = useMemo(() => {
		const start = (safePage - 1) * pageSize;
		return reportRows.slice(start, start + pageSize);
	}, [reportRows, safePage]);

	return (
		<section className="space-y-8">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
						{t("reports.title")}
					</p>
					<h1 className="mt-2 text-3xl font-semibold text-slate-900">
						{t("mandawiReport.title")}
					</h1>
					<p className="mt-1 text-sm text-slate-600">
						{t("mandawiReport.subtitle")}
					</p>
				</div>
				<div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
					{t("mandawiReport.allTime")}
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-4">
				<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
						{t("mandawiReport.totalBills")}
					</p>
					<p className="mt-2 text-2xl font-semibold text-slate-900">
						{mandawiStats.totalBills.toLocaleString()}
					</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
						{t("bills.mandawiCheck")}
					</p>
					<p className="mt-2 text-2xl font-semibold text-amber-600">
						{mandawiStats.checkBills.toLocaleString()}
					</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
						{t("bills.hesabMandawi")}
					</p>
					<p className="mt-2 text-2xl font-semibold text-slate-700">
						{mandawiStats.hesabBills.toLocaleString()}
					</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
						{t("reports.totalPackages")}
					</p>
					<p className="mt-2 text-2xl font-semibold text-slate-900">
						{totals.totalPackages.toLocaleString()}
					</p>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
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
						{t("mandawiReport.tableTitle")}
					</h2>
					{(billsLoading || productsLoading) && (
						<span className="text-xs text-slate-400">{t("mandawiReport.loading")}</span>
					)}
				</div>

				<div className="mt-4 space-y-3">
					{(billsLoading || productsLoading) && (
						<p className="text-sm text-slate-500">{t("mandawiReport.loading")}</p>
					)}
					{!billsLoading && !productsLoading && reportRows.length === 0 && (
						<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
							{t("mandawiReport.noBills")}
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
		</section>
	);
}
