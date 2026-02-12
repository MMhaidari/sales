"use client";

import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAddCustomerMutation } from "./../../redux/api/customersApi";
import { useLanguage } from "@/components/ui/LanguageProvider";

type CustomerFormValues = {
  name: string;
  phoneNumber: string;
  address: string;
  note: string;
  initialDebtAFN: string;
  initialDebtUSD: string;
};

export default function CreateCustomerForm() {
  const { t } = useLanguage();
  const [createCustomer, { isLoading }] = useAddCustomerMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    defaultValues: {
      name: "",
      phoneNumber: "",
      address: "",
      note: "",
      initialDebtAFN: "",
      initialDebtUSD: "",
    },
  });

  const onSubmit = async (data: CustomerFormValues) => {
    const parseNonNegative = (value: string) => {
      if (!value.trim()) return 0;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    };

    const initialDebtAFN = parseNonNegative(data.initialDebtAFN);
    const initialDebtUSD = parseNonNegative(data.initialDebtUSD);

    if (initialDebtAFN == null || initialDebtUSD == null) {
      setError("root", { message: t("customerCreate.debtNonNegative") });
      return;
    }

    try {
      await createCustomer({
        name: data.name,
        phoneNumber: data.phoneNumber,
        address: data.address,
        note: data.note,
        initialDebtAFN,
        initialDebtUSD,
      }).unwrap();

      toast.success(t("toast.customerCreated"));
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
      className="max-w-lg space-y-4 rounded-xl bg-white p-6 shadow"
    >
      <h1 className="text-xl font-semibold">{t("customerCreate.title")}</h1>

      <input
        placeholder={t("customerCreate.namePlaceholder")}
        className="w-full rounded border p-2"
        {...register("name", { required: t("customerCreate.nameRequired") })}
      />
      {errors.name && (
        <p className="text-sm text-red-600">{errors.name.message}</p>
      )}

      <input
        placeholder={t("customerCreate.phonePlaceholder")}
        className="w-full rounded border p-2"
        {...register("phoneNumber", { required: t("customerCreate.phoneRequired") })}
      />
      {errors.phoneNumber && (
        <p className="text-sm text-red-600">{errors.phoneNumber.message}</p>
      )}

      <input
        placeholder={t("customerCreate.addressPlaceholder")}
        className="w-full rounded border p-2"
        {...register("address")}
      />

      <textarea
        placeholder={t("customerCreate.notePlaceholder")}
        className="w-full rounded border p-2"
        {...register("note")}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <input
          placeholder={t("customerCreate.initialDebtAFN")}
          className="w-full rounded border p-2"
          inputMode="decimal"
          {...register("initialDebtAFN")}
        />
        <input
          placeholder={t("customerCreate.initialDebtUSD")}
          className="w-full rounded border p-2"
          inputMode="decimal"
          {...register("initialDebtUSD")}
        />
      </div>
      <p className="text-xs text-slate-500">{t("customerCreate.initialDebtHint")}</p>
      {errors.root?.message && (
        <p className="text-sm text-red-600">{errors.root.message}</p>
      )}

      <button
        disabled={isLoading}
        className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
      >
        {isLoading ? t("common.saving") : t("customerCreate.save")}
      </button>
    </form>
  );
}
