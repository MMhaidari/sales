"use client";

import { useEffect, useMemo, useState } from "react";
import { useGetBillsQuery } from "@/redux/api/billsApi";
import { useGetCustomersQuery } from "@/redux/api/customersApi";
import { useGetProductsQuery } from "@/redux/api/productApi";
import { formatDualDate } from "@/lib/dateFormat";
import { useLanguage } from "@/components/ui/LanguageProvider";
import Pagination from "@/components/ui/Pagination";

type FilterKey = "today" | "yesterday" | "week" | "month" | "all";

function startOfDay(date: Date) {
	const copy = new Date(date);
	copy.setHours(0, 0, 0, 0);
	return copy;
}

function toNumber(value: string | number | null | undefined) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string) {
	return formatDualDate(value);
}

export default function BillsPage() {
	const { t } = useLanguage();
	const { data: bills = [], isLoading: billsLoading } = useGetBillsQuery();
	const { data: customers = [], isLoading: customersLoading } =
		useGetCustomersQuery();
	const { data: products = [] } = useGetProductsQuery();

	const [filter, setFilter] = useState<FilterKey>("today");
	const [page, setPage] = useState(1);
	const [sherkatPage, setSherkatPage] = useState(1);
	const [mandawiPage, setMandawiPage] = useState(1);
	const pageSize = 10;

	const customerById = useMemo(
		() => new Map(customers.map((customer) => [customer.id, customer.name])),
		[customers]
	);

	const productById = useMemo(
		() => new Map(products.map((product) => [product.id, product.name])),
		[products]
	);

	const filteredBills = useMemo(() => {
		const now = new Date();
		const todayStart = startOfDay(now);
		const yesterdayStart = new Date(todayStart);
		yesterdayStart.setDate(yesterdayStart.getDate() - 1);
		const weekStart = new Date(todayStart);
		weekStart.setDate(weekStart.getDate() - 7);
		const monthStart = new Date(todayStart);
		monthStart.setDate(monthStart.getDate() - 30);

		return bills.filter((bill) => {
			const billDate = new Date(bill.billDate);
			if (Number.isNaN(billDate.getTime())) return false;

			switch (filter) {
				case "today":
					return billDate >= todayStart;
				case "yesterday":
					return billDate >= yesterdayStart && billDate < todayStart;
				case "week":
					return billDate >= weekStart;
				case "month":
					return billDate >= monthStart;
				default:
					return true;
			}
		});
	}, [bills, filter]);

	useEffect(() => {
		setPage(1);
	}, [filter]);

	const sherkatBills = useMemo(
		() => bills.filter((bill) => bill.sherkatStock),
		[bills]
	);

	const mandawiBills = useMemo(
		() => bills.filter((bill) => bill.mandawiCheck),
		[bills]
	);

	const pagedFilteredBills = useMemo(() => {
		const start = (page - 1) * pageSize;
		return filteredBills.slice(start, start + pageSize);
	}, [filteredBills, page]);

	const pagedSherkatBills = useMemo(() => {
		const start = (sherkatPage - 1) * pageSize;
		return sherkatBills.slice(start, start + pageSize);
	}, [sherkatBills, sherkatPage]);

	const pagedMandawiBills = useMemo(() => {
		const start = (mandawiPage - 1) * pageSize;
		return mandawiBills.slice(start, start + pageSize);
	}, [mandawiBills, mandawiPage]);

	return (
		<section className="space-y-8">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
						{t("bills.sectionLabel")}
					</p>
					<h1 className="mt-2 text-3xl font-semibold text-slate-900">{t("bills.title")}</h1>
					<p className="mt-1 text-sm text-slate-600">
						{t("bills.subtitle")}
					</p>
				</div>
				<div className="flex items-center gap-3">
					<div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
						{filteredBills.length} {t("common.bills")}
					</div>
					<select
						value={filter}
						onChange={(event) => setFilter(event.target.value as FilterKey)}
						className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
					>
						<option value="today">{t("bills.filter.today")}</option>
						<option value="yesterday">{t("bills.filter.yesterday")}</option>
						<option value="week">{t("bills.filter.week")}</option>
						<option value="month">{t("bills.filter.month")}</option>
						<option value="all">{t("bills.filter.all")}</option>
					</select>
				</div>
			</div>

			<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-slate-900">{t("bills.listTitle")}</h2>
					{(billsLoading || customersLoading) && (
						<span className="text-xs text-slate-400">{t("common.loading")}</span>
					)}
				</div>

				<div className="mt-4 space-y-3">
					{billsLoading && (
						<p className="text-sm text-slate-500">{t("bills.loadingBills")}</p>
					)}
					{!billsLoading && filteredBills.length === 0 && (
						<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
							{t("bills.noBills")}
						</div>
					)}
					{!billsLoading &&
						pagedFilteredBills.map((bill) => {
							let totalAFN = 0;
							let totalUSD = 0;
							bill.items.forEach((item) => {
								const amount = toNumber(item.totalAmount);
								if (item.currency === "AFN") totalAFN += amount;
								if (item.currency === "USD") totalUSD += amount;
							});

							const statusColor =
								bill.status === "PAID"
									? "bg-emerald-50 text-emerald-700 border-emerald-200"
									: bill.status === "PARTIAL"
										? "bg-amber-50 text-amber-700 border-amber-200"
										: "bg-rose-50 text-rose-700 border-rose-200";

							return (
								<details
									key={bill.id}
									className="rounded-2xl border border-slate-200 bg-slate-50"
								>
									<summary className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 text-left cursor-pointer list-none">
										<div>
											<p className="text-sm font-semibold text-slate-900">
												{t("bills.billLabel")} #{bill.billNumber ?? bill.id.slice(0, 6)}
											</p>
											<p className="text-xs text-slate-500">
												{formatDate(bill.billDate)}
											</p>
											<p className="text-xs text-slate-500">
												{t("bills.customer")}: {customerById.get(bill.customerId) ?? t("common.unknown")}
											</p>
										</div>
										<div className="flex flex-wrap items-center gap-3 text-right">
											<div className="text-sm font-semibold text-slate-700">
												{totalAFN > 0 && <div>AFN {totalAFN.toLocaleString()}</div>}
												{totalUSD > 0 && <div>USD {totalUSD.toLocaleString()}</div>}
											</div>
											{bill.sherkatStock && (
												<span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
													{t("bills.sherkatStock")}
												</span>
											)}
											{bill.mandawiCheck && (
												<span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
													{bill.mandawiCheckNumber ? t("bills.mandawiCheck") : t("bills.hesabMandawi")}
												</span>
											)}
											<span
												className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusColor}`}
											>
												{bill.status}
											</span>
											<span className="text-xs text-slate-500">
												{bill.items.length} {t("common.items")}
											</span>
										</div>
									</summary>
									<div className="border-t border-slate-200 px-4 py-3">
										<div className="space-y-2">
											{bill.items.map((item) => (
												<div
													key={item.id}
													className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2"
												>
													<div>
														<p className="text-sm font-semibold text-slate-900">
															{productById.get(item.productId) ?? t("common.unknown")}
														</p>
														<p className="text-xs text-slate-500">
															{item.numberOfPackages} {t("stocks.packages")} x {item.unitPrice}
														</p>
													</div>
													<div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
														<span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-semibold uppercase tracking-wide text-slate-500">
															{item.currency}
														</span>
														<span>{t("common.total")}: {item.totalAmount}</span>
													</div>
												</div>
											))}
										</div>
									</div>
								</details>
							);
						})}
				</div>

				{!billsLoading && filteredBills.length > pageSize && (
					<div className="mt-5">
						<Pagination
							page={page}
							pageSize={pageSize}
							total={filteredBills.length}
							onPageChange={setPage}
						/>
					</div>
				)}
			</div>

			<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-slate-900">
						{t("bills.sherkatStockBills")}
					</h2>
					<span className="text-xs text-slate-500">
						{sherkatBills.length} {t("common.bills")}
					</span>
				</div>

				<div className="mt-4 space-y-3">
					{billsLoading && (
						<p className="text-sm text-slate-500">{t("bills.loadingBills")}</p>
					)}
					{!billsLoading && sherkatBills.length === 0 && (
						<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
							{t("bills.noSherkatStock")}
						</div>
					)}
					{!billsLoading &&
						pagedSherkatBills.map((bill) => (
							<div
								key={bill.id}
								className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
							>
								<div>
									<p className="text-sm font-semibold text-slate-900">
										{t("bills.billLabel")} #{bill.billNumber ?? bill.id.slice(0, 6)}
									</p>
									<p className="text-xs text-slate-500">
											{formatDate(bill.billDate)}
									</p>
									<p className="text-xs text-slate-500">
										{t("bills.customer")}: {customerById.get(bill.customerId) ?? t("common.unknown")}
									</p>
								</div>
								<span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
									{t("bills.sherkatStock")}
								</span>
							</div>
						))}
				</div>

				{!billsLoading && sherkatBills.length > pageSize && (
					<div className="mt-5">
						<Pagination
							page={sherkatPage}
							pageSize={pageSize}
							total={sherkatBills.length}
							onPageChange={setSherkatPage}
						/>
					</div>
				)}
			</div>

			<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-slate-900">
						{t("bills.mandawiBills")}
					</h2>
					<span className="text-xs text-slate-500">
						{mandawiBills.length} {t("common.bills")}
					</span>
				</div>

				<div className="mt-4 space-y-3">
					{billsLoading && (
						<p className="text-sm text-slate-500">{t("bills.loadingBills")}</p>
					)}
					{!billsLoading && mandawiBills.length === 0 && (
						<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
							{t("bills.noMandawi")}
						</div>
					)}
					{!billsLoading &&
						pagedMandawiBills.map((bill) => (
							<div
								key={bill.id}
								className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
							>
								<div>
									<p className="text-sm font-semibold text-amber-900">
										{t("bills.billLabel")} #{bill.billNumber ?? bill.id.slice(0, 6)}
									</p>
									<p className="text-xs text-amber-700">
										{formatDate(bill.billDate)}
									</p>
									<p className="text-xs text-amber-700">
										{t("bills.customer")}: {customerById.get(bill.customerId) ?? t("common.unknown")}
									</p>
									{bill.mandawiCheckNumber && (
										<p className="text-xs text-amber-700">
											{t("bills.checkNumber")} #{bill.mandawiCheckNumber}
										</p>
									)}
								</div>
								<span className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
									{bill.mandawiCheckNumber ? t("bills.mandawiCheck") : t("bills.hesabMandawi")}
								</span>
							</div>
						))}
				</div>

				{!billsLoading && mandawiBills.length > pageSize && (
					<div className="mt-5">
						<Pagination
							page={mandawiPage}
							pageSize={pageSize}
							total={mandawiBills.length}
							onPageChange={setMandawiPage}
						/>
					</div>
				)}
			</div>
		</section>
	);
}
