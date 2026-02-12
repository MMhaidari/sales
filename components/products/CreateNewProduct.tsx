"use client";

import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useGetCategoriesQuery } from "@/redux/api/categoriesApi";
import { useAddProductMutation } from "@/redux/api/productApi";
import { useLanguage } from "@/components/ui/LanguageProvider";

type ProductFormValues = {
	name: string;
	currentPricePerPackage: string;
	currencyType: "AFN" | "USD";
	categoryId: string;
};

const currencyOptions: Array<ProductFormValues["currencyType"]> = [
	"AFN",
	"USD",
];

export default function CreateNewProduct() {
	const { t } = useLanguage();
	const [createProduct, { isLoading }] = useAddProductMutation();
	const { data: categories = [], isLoading: isCategoriesLoading } =
		useGetCategoriesQuery();

	const {
		register,
		handleSubmit,
		reset,
		setError,
		formState: { errors },
	} = useForm<ProductFormValues>({
		defaultValues: {
			name: "",
			currentPricePerPackage: "",
			currencyType: "AFN",
			categoryId: "",
		},
	});

	const onSubmit = async (data: ProductFormValues) => {
		const parsedPrice = Number(data.currentPricePerPackage);
		if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
			setError("currentPricePerPackage", {
				message: t("productCreate.pricePositive"),
			});
			return;
		}

		try {
			await createProduct({
				name: data.name,
				currentPricePerPackage: parsedPrice,
				currencyType: data.currencyType,
				categoryId: data.categoryId.trim() || null,
			}).unwrap();

			toast.success(t("toast.productCreated"));
			reset();
		} catch (err: unknown) {
			if (
				typeof err === "object" &&
				err !== null &&
				"data" in err &&
				typeof (err as { data?: { error?: string } }).data === "object" &&
				(err as { data?: { error?: string } }).data !== null &&
				"error" in (err as { data?: { error?: string } }).data!
			) {
				setError("root", {
					message:
						((err as { data?: { error?: string } }).data as { error?: string })
							.error || t("common.somethingWentWrong"),
				});
			} else {
				setError("root", { message: t("common.somethingWentWrong") });
			}
		}
	};

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
		>
			<div>
				<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
					{t("categories.catalog")}
				</p>
				<h1 className="mt-2 text-2xl font-semibold text-slate-900">
					{t("productCreate.title")}
				</h1>
				<p className="mt-1 text-sm text-slate-600">
					{t("productCreate.subtitle")}
				</p>
			</div>

			<div className="space-y-2">
				<label className="text-sm font-semibold text-slate-700">
					{t("productCreate.name")}
				</label>
				<input
					placeholder={t("productCreate.name")}
					className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
					{...register("name", { required: t("productCreate.nameRequired") })}
				/>
				{errors.name && (
					<p className="text-sm text-rose-600">{errors.name.message}</p>
				)}
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2">
						<label className="text-sm font-semibold text-slate-700">
							{t("productCreate.price")}
						</label>
					<input
						type="number"
						min="0"
						step="0.01"
						placeholder="0.00"
						className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							{...register("currentPricePerPackage", {
								required: t("productCreate.priceRequired"),
							})}
					/>
					{errors.currentPricePerPackage && (
						<p className="text-sm text-rose-600">
							{errors.currentPricePerPackage.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
						<label className="text-sm font-semibold text-slate-700">
							{t("productCreate.currency")}
						</label>
					<select
						className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							{...register("currencyType", { required: t("productCreate.currencyRequired") })}
					>
						{currencyOptions.map((currency) => (
							<option key={currency} value={currency}>
								{currency}
							</option>
						))}
					</select>
					{errors.currencyType && (
						<p className="text-sm text-rose-600">
							{errors.currencyType.message}
						</p>
					)}
				</div>
			</div>

			<div className="space-y-2">
				<label className="text-sm font-semibold text-slate-700">
					{t("productCreate.category")}
				</label>
				<select
					className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
					{...register("categoryId")}
					disabled={isCategoriesLoading}
				>
					<option value="">{t("productCreate.noCategory")}</option>
					{categories.map((category) => (
						<option key={category.id} value={category.id}>
							{category.name}
						</option>
					))}
				</select>
				<p className="text-xs text-slate-500">
					{isCategoriesLoading ? t("productCreate.loadingCategories") : t("productCreate.categoryOptional")}
				</p>
			</div>

			{errors.root?.message && (
				<p className="text-sm text-rose-600">{errors.root.message}</p>
			)}

			<button
				disabled={isLoading}
				className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
			>
				{isLoading ? t("common.saving") : t("productCreate.save")}
			</button>
		</form>
	);
}
