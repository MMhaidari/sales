"use client";

import Link from "next/link";
import { useState } from "react";
import { useGetProductsPagedQuery } from "@/redux/api/productApi";
import { useLanguage } from "@/components/ui/LanguageProvider";
import Pagination from "@/components/ui/Pagination";

export default function ListAllProducts() {
	const { t } = useLanguage();
	const [page, setPage] = useState(1);
	const pageSize = 10;
	const { data, isLoading, isError } = useGetProductsPagedQuery({ page, pageSize });
	const products = data?.items ?? [];
	const total = data?.total ?? 0;

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold text-slate-900">{t("products.title")}</h1>
					<p className="text-sm text-slate-500">{t("products.subtitle")}</p>
				</div>
				<Link
					href="/products/new"
					className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
				>
					{t("products.new")}
				</Link>
			</div>

			<div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
				{isLoading && (
					<p className="text-sm text-slate-500">{t("products.loading")}</p>
				)}

				{isError && !isLoading && (
					<p className="text-sm text-red-600">{t("products.failedLoad")}</p>
				)}

				{!isLoading && !isError && products.length === 0 && (
					<div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
						{t("products.noProducts")}
					</div>
				)}

				{!isLoading && !isError && products.length > 0 && (
					<div className="grid gap-4 md:grid-cols-2">
						{products.map((product) => (
							<div
								key={product.id}
								className="rounded-xl border border-slate-100 bg-slate-50 p-4"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-base font-semibold text-slate-900">
											{product.name}
										</p>
										<p className="text-xs text-slate-500">
											{product.categoryId ? t("products.hasCategory") : t("products.noCategory")}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
											{product.currencyType}
										</span>
										<Link
											href={`/products/edit?id=${encodeURIComponent(product.id)}`}
											className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
										>
											{t("products.edit")}
										</Link>
									</div>
								</div>
								<p className="mt-3 text-sm font-medium text-slate-700">
									{product.currentPricePerPackage} {t("products.perPackage")}
								</p>
							</div>
						))}
					</div>
				)}

				{!isLoading && !isError && total > pageSize && (
					<div className="mt-6">
						<Pagination
							page={page}
							pageSize={pageSize}
							total={total}
							onPageChange={setPage}
						/>
					</div>
				)}
			</div>
		</section>
	);
}
