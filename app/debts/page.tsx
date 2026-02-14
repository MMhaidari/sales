"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
	DndContext,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useGetCustomersQuery } from "@/redux/api/customersApi";
import { useLanguage } from "@/components/ui/LanguageProvider";

function toNumber(value: string | number | null | undefined) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

export default function DebtsPage() {
	const { t } = useLanguage();
	const { data: customers = [], isLoading, isError } = useGetCustomersQuery();
	const [orderIds, setOrderIds] = useState<string[]>([]);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	);

	const debtRows = useMemo(() => {
		return customers
			.map((customer) => {
				const debtAFN = toNumber(customer.debtAFN);
				const debtUSD = toNumber(customer.debtUSD);
				return {
					id: customer.id,
					name: customer.name,
					debtAFN,
					debtUSD,
					total: debtAFN + debtUSD,
				};
			})
			.sort((a, b) => b.total - a.total);
	}, [customers]);

	const baseIds = useMemo(() => debtRows.map((row) => row.id), [debtRows]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const stored = window.localStorage.getItem("debtsOrder");
		const parsed = stored ? JSON.parse(stored) : null;
		const storedIds = Array.isArray(parsed)
			? parsed.filter((value) => typeof value === "string")
			: [];
		const merged = [
			...storedIds.filter((id) => baseIds.includes(id)),
			...baseIds.filter((id) => !storedIds.includes(id)),
		];
		const isSame =
			merged.length === orderIds.length &&
			merged.every((id, index) => id === orderIds[index]);
		if (isSame) return;
		setOrderIds(merged);
		window.localStorage.setItem("debtsOrder", JSON.stringify(merged));
	}, [baseIds, orderIds]);

	const orderedRows = useMemo(() => {
		if (orderIds.length === 0) return debtRows;
		const indexById = new Map(orderIds.map((id, index) => [id, index]));
		return [...debtRows].sort((a, b) => {
			const indexA = indexById.get(a.id) ?? Number.MAX_SAFE_INTEGER;
			const indexB = indexById.get(b.id) ?? Number.MAX_SAFE_INTEGER;
			return indexA - indexB;
		});
	}, [debtRows, orderIds]);

	const totals = useMemo(() => {
		return debtRows.reduce(
			(acc, row) => {
				acc.totalAFN += row.debtAFN;
				acc.totalUSD += row.debtUSD;
				return acc;
			},
			{ totalAFN: 0, totalUSD: 0 }
		);
	}, [debtRows]);

	const handlePrint = async () => {
		if (orderedRows.length === 0) return;
		const printable = orderedRows.map((row) => ({
			name: row.name,
			debtAFN: row.debtAFN.toLocaleString(),
			debtUSD: row.debtUSD.toLocaleString(),
		}));
		const { default: printJS } = await import("print-js");
		printJS({
			printable,
			type: "json",
			header: t("debts.printTitle"),
			properties: [
				{ field: "name", displayName: t("debts.customer") },
				{ field: "debtAFN", displayName: t("debts.afn") },
				{ field: "debtUSD", displayName: t("debts.usd") },
			],
			style: "table{width:100%;border-collapse:collapse}th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}th{background:#f8fafc}",
		});
	};

	const handleDragEnd = (event: DragEndEvent) => {
		if (!event.over) return;
		const activeId = String(event.active.id);
		const overId = String(event.over.id);
		if (activeId === overId) return;

		setOrderIds((prev) => {
			const oldIndex = prev.indexOf(activeId);
			const newIndex = prev.indexOf(overId);
			if (oldIndex === -1 || newIndex === -1) return prev;
			const next = arrayMove(prev, oldIndex, newIndex);
			if (typeof window !== "undefined") {
				window.localStorage.setItem("debtsOrder", JSON.stringify(next));
			}
			return next;
		});
	};

	return (
		<section className="space-y-8">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
						{t("customers.debt")}
					</p>
					<h1 className="mt-2 text-3xl font-semibold text-slate-900">
						{t("debts.title")}
					</h1>
					<p className="mt-1 text-sm text-slate-600">
						{t("debts.subtitle")}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<button
						type="button"
						onClick={handlePrint}
						disabled={orderedRows.length === 0}
						className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{t("debts.print")}
					</button>
					<div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
						{orderedRows.length} {t("common.customers")}
					</div>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
						{t("debts.totalAFN")}
					</p>
					<p className="mt-3 text-3xl font-semibold text-slate-900">
						AFN {totals.totalAFN.toLocaleString()}
					</p>
				</div>
				<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
						{t("debts.totalUSD")}
					</p>
					<p className="mt-3 text-3xl font-semibold text-slate-900">
						USD {totals.totalUSD.toLocaleString()}
					</p>
				</div>
			</div>

			<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-slate-900">
						{t("debts.listTitle")}
					</h2>
					{isLoading && (
						<span className="text-xs text-slate-400">{t("common.loading")}</span>
					)}
				</div>

				<div className="mt-4 space-y-3">
					{isLoading && (
						<p className="text-sm text-slate-500">{t("debts.loading")}</p>
					)}
					{!isLoading && isError && (
						<p className="text-sm text-rose-600">{t("debts.failedLoad")}</p>
					)}
					{!isLoading && !isError && orderedRows.length === 0 && (
						<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
							{t("debts.noCustomers")}
						</div>
					)}
					{!isLoading && !isError && orderedRows.length > 0 && (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={orderedRows.map((row) => row.id)}
								strategy={verticalListSortingStrategy}
							>
								<div className="space-y-2">
									{orderedRows.map((row) => (
										<SortableDebtRow key={row.id} row={row} t={t} />
									))}
								</div>
							</SortableContext>
						</DndContext>
					)}
				</div>
			</div>
		</section>
	);
}

function SortableDebtRow({
	row,
	t,
}: {
	row: { id: string; name: string; debtAFN: number; debtUSD: number };
	t: (key: string) => string;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: row.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.85 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} {...attributes} {...listeners}>
			<Link
				href={`/customers/${row.id}`}
				className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white"
			>
				<div className="flex items-center gap-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-500">
						::
					</div>
					<div>
						<p className="text-sm font-semibold text-slate-900">
							{row.name}
						</p>
						<p className="text-xs text-slate-500">
							{t("customers.customerNumber")} #{row.id.slice(0, 6)}
						</p>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
					<span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold">
						AFN {row.debtAFN.toLocaleString()}
					</span>
					<span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold">
						USD {row.debtUSD.toLocaleString()}
					</span>
				</div>
			</Link>
		</div>
	);
}
