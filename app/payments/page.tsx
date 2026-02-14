"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useGetPaymentsQuery, useAddPaymentMutation } from "@/redux/api/paymentsApi";
import { useGetCustomersQuery } from "@/redux/api/customersApi";
import { useGetBillsQuery } from "@/redux/api/billsApi";
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

export default function PaymentsPage() {
	const { t } = useLanguage();
	const { data: paymentsResponse, isLoading: paymentsLoading } =
		useGetPaymentsQuery();
	const { data: customers = [], isLoading: customersLoading } =
		useGetCustomersQuery();
	const { data: bills = [], isLoading: billsLoading } = useGetBillsQuery();
	const [addPayment, { isLoading: isSaving }] = useAddPaymentMutation();

	const [filter, setFilter] = useState<FilterKey>("today");
	const [customerId, setCustomerId] = useState("");
	const [currency, setCurrency] = useState<"AFN" | "USD">("AFN");
	const [paymentNumber, setPaymentNumber] = useState("");
	const [amountPaid, setAmountPaid] = useState("");
	const [page, setPage] = useState(1);
	const pageSize = 10;

	const payments = useMemo(() => paymentsResponse?.payments ?? [], [paymentsResponse]);

	const customerById = useMemo(
		() => new Map(customers.map((customer) => [customer.id, customer.name])),
		[customers]
	);

	const customerByBillId = useMemo(() => {
		const map = new Map<
			string,
			{ customerId?: string | null; tempCustomerName?: string | null }
		>();
		bills.forEach((bill) => {
			map.set(bill.id, {
				customerId: bill.customerId,
				tempCustomerName: bill.tempCustomerName,
			});
		});
		return map;
	}, [bills]);

	const filteredPayments = useMemo(() => {
		const now = new Date();
		const todayStart = startOfDay(now);
		const yesterdayStart = new Date(todayStart);
		yesterdayStart.setDate(yesterdayStart.getDate() - 1);
		const weekStart = new Date(todayStart);
		weekStart.setDate(weekStart.getDate() - 7);
		const monthStart = new Date(todayStart);
		monthStart.setDate(monthStart.getDate() - 30);

		return payments.filter((payment) => {
			const paymentDate = new Date(payment.paymentDate);
			if (Number.isNaN(paymentDate.getTime())) return false;

			switch (filter) {
				case "today":
					return paymentDate >= todayStart;
				case "yesterday":
					return paymentDate >= yesterdayStart && paymentDate < todayStart;
				case "week":
					return paymentDate >= weekStart;
				case "month":
					return paymentDate >= monthStart;
				default:
					return true;
			}
		});
	}, [payments, filter]);

	useEffect(() => {
		setPage(1);
	}, [filter]);

	const pagedPayments = useMemo(() => {
		const start = (page - 1) * pageSize;
		return filteredPayments.slice(start, start + pageSize);
	}, [filteredPayments, page]);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		const parsedAmount = Number(amountPaid);

		if (!customerId) {
			toast.error(t("toast.selectCustomer"));
			return;
		}
		if (!paymentNumber.trim()) {
			toast.error(t("toast.paymentNumberRequired"));
			return;
		}
		if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
			toast.error(t("toast.enterValidAmount"));
			return;
		}

		try {
			await addPayment({
				customerId,
				amountPaid: parsedAmount,
				currency,
				paymentNumber: paymentNumber.trim() || undefined,
			}).unwrap();

			toast.success(t("toast.paymentRecorded"));
			setAmountPaid("");
			setPaymentNumber("");
		} catch (error) {
			console.error(error);
			toast.error(t("toast.failedRecordPayment"));
		}
	};

	return (
		<section className="space-y-8">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
						{t("payments.title")}
					</p>
					<h1 className="mt-2 text-3xl font-semibold text-slate-900">{t("payments.title")}</h1>
					<p className="mt-1 text-sm text-slate-600">
						{t("payments.subtitle")}
					</p>
				</div>
				<div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
					{filteredPayments.length} {t("common.payments")}
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
				<form
					onSubmit={handleSubmit}
					className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
				>
					<div>
						<h2 className="text-lg font-semibold text-slate-900">{t("payments.makePayment")}</h2>
						<p className="text-sm text-slate-500">
							{t("payments.applyPayments")}
						</p>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-semibold text-slate-700">{t("payments.customer")}</label>
						<select
							value={customerId}
							onChange={(event) => setCustomerId(event.target.value)}
							className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						>
							<option value="">{t("payments.selectCustomer")}</option>
							{customers.map((customer) => (
								<option key={customer.id} value={customer.id}>
									{customer.name}
								</option>
							))}
						</select>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<label className="text-sm font-semibold text-slate-700">{t("payments.currency")}</label>
							<select
								value={currency}
								onChange={(event) => setCurrency(event.target.value as "AFN" | "USD")}
								className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							>
								<option value="AFN">AFN</option>
								<option value="USD">USD</option>
							</select>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-semibold text-slate-700">{t("payments.paymentNumber")}</label>
							<input
								value={paymentNumber}
								onChange={(event) => setPaymentNumber(event.target.value.replace(/\D/g, ""))}
								placeholder={t("common.optional")}
								className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-semibold text-slate-700">{t("payments.amount")}</label>
						<input
							value={amountPaid}
							onChange={(event) => setAmountPaid(event.target.value.replace(/[^0-9.]/g, ""))}
							inputMode="decimal"
							placeholder="0.00"
							className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						/>
					</div>

					<div className="flex justify-end">
						<button
							type="submit"
							disabled={isSaving}
							className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
						>
							{isSaving ? t("common.saving") : t("payments.recordPayment")}
						</button>
					</div>
				</form>

				<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 className="text-lg font-semibold text-slate-900">{t("payments.paymentHistory")}</h2>
							<p className="text-sm text-slate-500">{t("payments.filterByPeriod")}</p>
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

					<div className="mt-4 space-y-3">
						{(paymentsLoading || billsLoading || customersLoading) && (
							<p className="text-sm text-slate-500">{t("payments.loadingPayments")}</p>
						)}
						{!paymentsLoading && filteredPayments.length === 0 && (
							<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
								{t("payments.noPayments")}
							</div>
						)}
						{!paymentsLoading &&
							pagedPayments.map((payment) => {
								const billCustomer = payment.billId
									? customerByBillId.get(payment.billId)
									: undefined;
								const customerName =
									billCustomer?.tempCustomerName ||
									(billCustomer?.customerId
										? customerById.get(billCustomer.customerId)
										: undefined) ||
									t("common.unknown");

								return (
									<div
										key={payment.id}
										className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
									>
										<div>
											<p className="text-sm font-semibold text-slate-900">
												{t("payments.paymentLabel")} #{payment.paymentNumber ?? payment.id.slice(0, 6)}
											</p>
											<p className="text-xs text-slate-500">
												{formatDate(payment.paymentDate)}
											</p>
											<p className="text-xs text-slate-500">{t("payments.customer")}: {customerName}</p>
										</div>
										<div className="text-right text-sm font-semibold text-slate-700">
											{payment.currency} {toNumber(payment.amountPaid).toLocaleString()}
										</div>
									</div>
								);
							})}
					</div>

					{!paymentsLoading && filteredPayments.length > pageSize && (
						<div className="mt-5">
							<Pagination
								page={page}
								pageSize={pageSize}
								total={filteredPayments.length}
								onPageChange={setPage}
							/>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
