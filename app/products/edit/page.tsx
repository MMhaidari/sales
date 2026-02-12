"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import EditProduct from "@/components/products/EditProduct";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
	useDeleteProductMutation,
	useGetProductsQuery,
} from "@/redux/api/productApi";
import { useLanguage } from "@/components/ui/LanguageProvider";

export default function EditProductPage() {
	const { t } = useLanguage();
	const searchParams = useSearchParams();
	const router = useRouter();
	const productId = searchParams.get("id");
	const { data: products = [], isLoading, isError } = useGetProductsQuery();
	const [deleteProduct, { isLoading: isDeleting }] =
		useDeleteProductMutation();
	const [confirmOpen, setConfirmOpen] = useState(false);

	const product = products.find((item) => item.id === productId);

	const handleDelete = async () => {
		if (!product) return;
		try {
			await deleteProduct(product.id).unwrap();
			toast.success(t("toast.productDeleted"));
			router.push("/products");
		} catch (err: unknown) {
			toast.error(t("toast.failedDeleteProduct"));
            console.error(err)
		}
	};

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold text-slate-900">{t("productEditPage.title")}</h1>
					<p className="text-sm text-slate-500">
						{t("productEditPage.subtitle")}
					</p>
				</div>
				<div className="flex items-center gap-3">
					<Link
						href="/products"
						className="text-sm font-medium text-slate-600 hover:text-slate-900"
					>
						{t("productEditPage.back")}
					</Link>
					<button
						type="button"
						onClick={() => setConfirmOpen(true)}
						disabled={!product || isDeleting}
						className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:opacity-50"
					>
						{isDeleting ? t("productEditPage.deleting") : t("productEditPage.delete")}
					</button>
				</div>
			</div>

			{isLoading && (
				<p className="text-sm text-slate-500">{t("productEditPage.loading")}</p>
			)}

			{isError && !isLoading && (
				<p className="text-sm text-red-600">{t("productEditPage.failedLoad")}</p>
			)}

			{!isLoading && !isError && !product && (
				<div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
					{t("productEditPage.notFound")}
				</div>
			)}

			{!isLoading && !isError && product && <EditProduct product={product} />}

			<ConfirmDialog
				open={confirmOpen}
				title={t("productEditPage.confirmTitle")}
				description={t("productEditPage.confirmDescription")}
				confirmLabel={isDeleting ? t("productEditPage.deleting") : t("productEditPage.delete")}
				danger
				onCancel={() => setConfirmOpen(false)}
				onConfirm={() => {
					setConfirmOpen(false);
					void handleDelete();
				}}
			/>
		</section>
	);
}
