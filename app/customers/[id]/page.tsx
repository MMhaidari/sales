"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BillSummary, useGetCustomerByIdQuery, useUpdateCustomerMutation } from "@/redux/api/customersApi";
import { useAddPaymentMutation } from "@/redux/api/paymentsApi";
import { useUpdateBillMutation } from "@/redux/api/billsApi";
import { useGetProductsQuery } from "@/redux/api/productApi";
import { customersApi } from "@/redux/api/customersApi";
import { useDispatch } from "react-redux";
import { useState } from "react";
import toast from "react-hot-toast";
import { formatDualDate } from "@/lib/dateFormat";
import { useLanguage } from "@/components/ui/LanguageProvider";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

function formatDate(value: string) {
  return formatDualDate(value);
}

export default function CustomerDetailPage() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const {
    data: customer,
    isLoading,
    error,
  } = useGetCustomerByIdQuery(id ?? "", {
    skip: !id,
  });

  const { data: products = [], isLoading: isProductsLoading } = useGetProductsQuery();

  const [addPayment, { isLoading: isPaying }] = useAddPaymentMutation();
  const [updateCustomer, { isLoading: isUpdatingDebt }] = useUpdateCustomerMutation();
  const [updateBill, { isLoading: isUpdatingBill }] = useUpdateBillMutation();
  const dispatch = useDispatch();
  const [paymentCurrency, setPaymentCurrency] = useState<"AFN" | "USD">("AFN");
  const [paymentNumber, setPaymentNumber] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [editDebtOpen, setEditDebtOpen] = useState(false);
  const [confirmDebtOpen, setConfirmDebtOpen] = useState(false);
  const [initialDebtAFNInput, setInitialDebtAFNInput] = useState<string>("0");
  const [initialDebtUSDInput, setInitialDebtUSDInput] = useState<string>("0");
  const [editBill, setEditBill] = useState<BillSummary | null>(null);
  const [editBillNumber, setEditBillNumber] = useState<string>("");
  const [editBillDate, setEditBillDate] = useState<string>("");
  const [editSherkatStock, setEditSherkatStock] = useState(false);
  const [editMandawiCheck, setEditMandawiCheck] = useState(false);
  const [editMandawiCheckNumber, setEditMandawiCheckNumber] = useState<string>("");
  const [editNote, setEditNote] = useState<string>("");
  const [editItems, setEditItems] = useState<
    Array<{ productId: string; numberOfPackages: number }>
  >([]);

  const payments = customer?.payments ?? [];

  const formatDateInput = (value: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
  };

  const openEditBill = (bill: BillSummary) => {
    setEditBill(bill);
    setEditBillNumber(bill.billNumber ?? "");
    setEditBillDate(formatDateInput(bill.billDate));
    setEditSherkatStock(Boolean(bill.sherkatStock));
    setEditMandawiCheck(Boolean(bill.mandawiCheck));
    setEditMandawiCheckNumber(bill.mandawiCheckNumber ?? "");
    setEditNote(bill.note ?? "");
    setEditItems(
      bill.items.map((item) => ({
        productId: item.productId,
        numberOfPackages: item.numberOfPackages,
      }))
    );
  };

  const closeEditBill = () => {
    setEditBill(null);
  };

  const handleEditItemChange = (
    index: number,
    patch: Partial<{ productId: string; numberOfPackages: number }>
  ) => {
    setEditItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const handleAddEditItem = () => {
    setEditItems((prev) => [
      ...prev,
      { productId: "", numberOfPackages: 0 },
    ]);
  };

  const handleRemoveEditItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  if (!id || isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="h-6 w-40 rounded-full bg-slate-100" />
        <div className="mt-4 space-y-2">
          <div className="h-4 w-64 rounded-full bg-slate-100" />
          <div className="h-4 w-52 rounded-full bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !customer) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? (error as { status?: number }).status
        : undefined;
    const heading = status === 404 ? t("customer.notFound") : t("common.somethingWentWrong");
    const message =
      status === 404
        ? t("customer.notFoundMessage")
        : t("customer.errorMessage");

    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.35em]">{t("customer.detailLabel")}</p>
        <h2 className="mt-3 text-2xl font-semibold text-rose-900">
          {heading}
        </h2>
        <p className="mt-2 text-sm text-rose-700">
          {message}
        </p>
        <Link
          href="/customers"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700"
        >
          {t("customer.backToCustomers")}
        </Link>
      </div>
    );
  }

  const debtAFN = customer.debtAFN ?? "0";
  const debtUSD = customer.debtUSD ?? "0";
  const initialDebtAFN = customer.initialDebtAFN ?? "0";
  const initialDebtUSD = customer.initialDebtUSD ?? "0";
  const paidAFN = customer.paidAFN ?? "0";
  const paidUSD = customer.paidUSD ?? "0";
  const bills = customer.bills ?? [];

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const handlePrintProfile = async () => {
    const { default: printJS } = await import("print-js");
    const customerName = customer.name;
    const addressValue = customer.address ?? "--";
    const phoneValue = customer.phoneNumber ?? customer.phone ?? "--";

    const paymentsHtml = payments
      .map((payment) => {
        const label = payment.paymentNumber
          ? `${t("customer.paymentNumber")} ${payment.paymentNumber}`
          : `${t("payments.paymentLabel")} ${payment.id.slice(0, 6)}`;
        return `
          <tr>
            <td>${escapeHtml(label)}</td>
            <td>${escapeHtml(formatDate(payment.paymentDate))}</td>
            <td>${escapeHtml(payment.currency)}</td>
            <td>${escapeHtml(payment.amountPaid)}</td>
            <td>${escapeHtml(payment.paymentMethod)}</td>
          </tr>
        `;
      })
      .join("");

    const billsHtml = bills
      .map((bill) => {
        const billLabel = bill.billNumber
          ? `${t("bills.billLabel")} #${bill.billNumber}`
          : `${t("bills.billLabel")} #${bill.id.slice(0, 6)}`;
        const itemsHtml = bill.items
          .map((item) => {
            const name = item.product?.name || t("stocks.productLabel");
            return `
              <tr>
                <td>${escapeHtml(name)}</td>
                <td>${item.numberOfPackages}</td>
                <td>${escapeHtml(item.unitPrice)}</td>
                <td>${escapeHtml(item.currency)}</td>
                <td>${escapeHtml(item.totalAmount)}</td>
              </tr>
            `;
          })
          .join("");

        return `
          <div style="margin-top:16px;border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div style="font-weight:600;">${escapeHtml(billLabel)}</div>
              <div style="font-size:12px;color:#64748b;">${escapeHtml(formatDate(bill.billDate))}</div>
            </div>
            <div style="font-size:12px;color:#475569;margin-bottom:8px;">
              ${escapeHtml(t("customer.totalAFN"))}: ${escapeHtml(bill.totalAFN)} | ${escapeHtml(t("customer.totalUSD"))}: ${escapeHtml(bill.totalUSD)}
            </div>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr>
                  <th style="border:1px solid #e2e8f0;padding:6px;text-align:left;background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#475569;">${escapeHtml(t("billPrint.item"))}</th>
                  <th style="border:1px solid #e2e8f0;padding:6px;text-align:left;background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#475569;">${escapeHtml(t("billPrint.packages"))}</th>
                  <th style="border:1px solid #e2e8f0;padding:6px;text-align:left;background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#475569;">${escapeHtml(t("billPrint.unitPrice"))}</th>
                  <th style="border:1px solid #e2e8f0;padding:6px;text-align:left;background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#475569;">${escapeHtml(t("billPrint.currency"))}</th>
                  <th style="border:1px solid #e2e8f0;padding:6px;text-align:left;background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#475569;">${escapeHtml(t("billPrint.total"))}</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
        `;
      })
      .join("");

    const html = `
      <div style="font-family:'Segoe UI', Arial, sans-serif;color:#0f172a;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div>
            <div style="font-size:20px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(t("brand.title"))}</div>
            <div style="font-size:12px;color:#64748b;">${escapeHtml(t("brand.subtitle"))}</div>
          </div>
          <div style="border:1px solid #e2e8f0;padding:4px 10px;border-radius:999px;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#334155;">${escapeHtml(t("customer.printTitle"))}</div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.25em;color:#94a3b8;">${escapeHtml(t("customer.detailLabel"))}</div>
            <div style="font-size:14px;font-weight:600;margin-top:6px;">${escapeHtml(customerName)}</div>
            <div style="font-size:12px;color:#64748b;">${escapeHtml(t("customer.phoneLabel"))}: ${escapeHtml(phoneValue)}</div>
            <div style="font-size:12px;color:#64748b;">${escapeHtml(t("customer.addressLabel"))}: ${escapeHtml(addressValue)}</div>
          </div>
          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.25em;color:#94a3b8;">${escapeHtml(t("customer.debt"))}</div>
            <div style="font-size:12px;color:#64748b;">${escapeHtml(t("customer.totalAFN"))}: ${escapeHtml(debtAFN)}</div>
            <div style="font-size:12px;color:#64748b;">${escapeHtml(t("customer.totalUSD"))}: ${escapeHtml(debtUSD)}</div>
            <div style="font-size:12px;color:#64748b;">${escapeHtml(t("customer.paid"))}: AFN ${escapeHtml(paidAFN)} | USD ${escapeHtml(paidUSD)}</div>
          </div>
        </div>

        <div style="margin-top:10px;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.2em;color:#94a3b8;margin-bottom:8px;">${escapeHtml(t("customer.payments"))}</div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="border:1px solid #e2e8f0;padding:6px;text-align:left;background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#475569;">${escapeHtml(t("payments.paymentLabel"))}</th>
                <th style="border:1px solid #e2e8f0;padding:6px;text-align:left;background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#475569;">${escapeHtml(t("bills.billDate"))}</th>
                <th style="border:1px solid #e2e8f0;padding:6px;text-align:left;background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#475569;">${escapeHtml(t("customer.currency"))}</th>
                <th style="border:1px solid #e2e8f0;padding:6px;text-align:left;background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#475569;">${escapeHtml(t("customer.amountLabel"))}</th>
                <th style="border:1px solid #e2e8f0;padding:6px;text-align:left;background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:#475569;">${escapeHtml(t("payments.recordPayment"))}</th>
              </tr>
            </thead>
            <tbody>
              ${paymentsHtml || `<tr><td colspan="5" style="border:1px solid #e2e8f0;padding:8px;">${escapeHtml(t("customer.noPayments"))}</td></tr>`}
            </tbody>
          </table>
        </div>

        <div style="margin-top:18px;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.2em;color:#94a3b8;margin-bottom:8px;">${escapeHtml(t("customer.customerBills"))}</div>
          ${billsHtml || `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;">${escapeHtml(t("customer.noBills"))}</div>`}
        </div>
      </div>
    `;

    printJS({
      printable: html,
      type: "raw-html",
    });
  };

  const parseNonNegative = (value: string) => {
    if (!value.trim()) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };

  const handleDebtSave = async () => {
    if (!id) return;
    const nextAFN = parseNonNegative(initialDebtAFNInput);
    const nextUSD = parseNonNegative(initialDebtUSDInput);
    if (nextAFN == null || nextUSD == null) {
      toast.error(t("customerCreate.debtNonNegative"));
      return;
    }

    try {
      await updateCustomer({
        id,
        data: { initialDebtAFN: String(nextAFN), initialDebtUSD: String(nextUSD) },
      }).unwrap();

      toast.success(t("customer.saveDebt"));
      setEditDebtOpen(false);
      dispatch(
        customersApi.util.invalidateTags([
          { type: "Customer", id },
          { type: "Customer", id: "LIST" },
        ])
      );
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
          ((err as { data?: { error?: string } }).data as { error?: string })
            .error || t("common.somethingWentWrong")
        );
      } else {
        toast.error(t("common.somethingWentWrong"));
      }
    }
  };

  const handlePaymentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;

    if (!paymentNumber.trim()) {
      toast.error(t("toast.paymentNumberRequired"));
      return;
    }
    const parsedAmount = Number(paymentAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(t("toast.enterValidPayment"));
      return;
    }

    try {
      await addPayment({
        customerId: id,
        amountPaid: parsedAmount,
        currency: paymentCurrency,
        paymentNumber: paymentNumber.trim() || undefined,
        paymentMethod: "Manual",
      }).unwrap();

      toast.success(t("toast.paymentAdded"));
      setPaymentAmount("");
      setPaymentNumber("");
      dispatch(
        customersApi.util.invalidateTags([
          { type: "Customer", id },
          { type: "Customer", id: "LIST" },
        ])
      );
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
          ((err as { data?: { error?: string } }).data as { error?: string })
            .error || t("toast.failedAddPayment")
        );
      } else {
        toast.error(t("toast.failedAddPayment"));
      }
    }
  };

  const handleEditBillSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editBill) return;

    const sanitizedItems = editItems.map((item) => ({
      productId: item.productId,
      numberOfPackages: Number(item.numberOfPackages),
    }));

    if (sanitizedItems.length === 0) {
      toast.error(t("toast.selectProduct"));
      return;
    }

    if (sanitizedItems.some((item) => !item.productId)) {
      toast.error(t("toast.selectProduct"));
      return;
    }

    if (sanitizedItems.some((item) => !Number.isFinite(item.numberOfPackages) || item.numberOfPackages <= 0)) {
      toast.error(t("toast.enterNonZero"));
      return;
    }

    try {
      await updateBill({
        id: editBill.id,
        billNumber: editBillNumber.trim() || undefined,
        sherkatStock: editSherkatStock,
        mandawiCheck: editMandawiCheck,
        mandawiCheckNumber: editMandawiCheckNumber.trim() || undefined,
        billDate: editBillDate || undefined,
        note: editNote.trim() ? editNote.trim() : null,
        items: sanitizedItems,
      }).unwrap();

      toast.success(t("toast.billUpdated"));
      closeEditBill();
      dispatch(
        customersApi.util.invalidateTags([
          { type: "Customer", id },
          { type: "Customer", id: "LIST" },
        ])
      );
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
          ((err as { data?: { error?: string } }).data as { error?: string })
            .error || t("toast.failedUpdateBill")
        );
      } else {
        toast.error(t("toast.failedUpdateBill"));
      }
    }
  };

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
            {t("customer.detailLabel")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            {customer.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t("customer.phoneLabel")}: {customer.phoneNumber ?? customer.phone ?? t("customers.noPhone")}
          </p>
          {customer.address && (
            <p className="mt-1 text-sm text-slate-600">
              {t("customer.addressLabel")}: {customer.address}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handlePrintProfile}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            {t("customer.printProfile")}
          </button>
          <Link
            href="/customers"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            {t("customer.backToCustomers")}
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            {t("customer.debt")}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">AFN {debtAFN}</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">USD {debtUSD}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setInitialDebtAFNInput(initialDebtAFN);
                setInitialDebtUSDInput(initialDebtUSD);
                setEditDebtOpen((prev) => !prev);
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
            >
              {t("customer.editInitialDebt")}
            </button>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            {t("customer.initialDebt")}: AFN {initialDebtAFN} • USD {initialDebtUSD}
          </div>

          {editDebtOpen && (
            <div className="mt-4 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                {t("customer.editDebtTitle")}
              </p>
              <p className="text-xs text-amber-700">
                {t("customer.editDebtWarning")}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={initialDebtAFNInput}
                  onChange={(event) => setInitialDebtAFNInput(event.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder={t("customer.initialDebtAFN")}
                  inputMode="decimal"
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                />
                <input
                  value={initialDebtUSDInput}
                  onChange={(event) => setInitialDebtUSDInput(event.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder={t("customer.initialDebtUSD")}
                  inputMode="decimal"
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditDebtOpen(false)}
                  className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-700"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDebtOpen(true)}
                  className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white"
                >
                  {isUpdatingDebt ? t("common.saving") : t("customer.saveDebt")}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            {t("customer.paid")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">AFN {paidAFN}</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">USD {paidUSD}</span>
          </div>
        </div>
      </div>

      {customer.note && (
        <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            {t("customer.note")}
          </p>
          <p className="mt-2 text-sm text-slate-700">{customer.note}</p>
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              {t("customer.payments")}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">
              {t("customer.customerPayments")}
            </h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
            {payments.length} {t("common.total")}
          </span>
        </div>

        <form
          onSubmit={handlePaymentSubmit}
          className="mt-4 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[0.8fr_0.8fr_0.8fr_auto] md:items-end"
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t("customer.currency")}
            </label>
            <select
              value={paymentCurrency}
              onChange={(event) =>
                setPaymentCurrency(event.target.value as "AFN" | "USD")
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="AFN">AFN</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t("customer.paymentNumber")}
            </label>
            <input
              value={paymentNumber}
              onChange={(event) =>
                setPaymentNumber(event.target.value.replace(/\D/g, ""))
              }
              inputMode="numeric"
              placeholder="Digits only"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t("customer.amount")}
            </label>
            <input
              value={paymentAmount}
              onChange={(event) =>
                setPaymentAmount(event.target.value.replace(/[^0-9.]/g, ""))
              }
              inputMode="decimal"
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <button
            type="submit"
            disabled={isPaying}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isPaying ? t("common.saving") : t("customer.addPayment")}
          </button>
        </form>

        <div className="mt-4 space-y-2">
          {payments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
              {t("customer.noPayments")}
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {payment.paymentNumber
                      ? `${t("customer.paymentNumber")} ${payment.paymentNumber}`
                      : `${t("payments.paymentLabel")} ${payment.id.slice(0, 6)}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(payment.paymentDate)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-semibold uppercase tracking-wide text-slate-500">
                    {payment.currency}
                  </span>
                  <span>{t("customer.amountLabel")}: {payment.amountPaid}</span>
                  <span>{payment.paymentMethod}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              {t("customer.bills")}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">
              {t("customer.customerBills")}
            </h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
            {bills.length} {t("common.total")}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {bills.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              {t("customer.noBills")}
            </div>
          ) : (
            bills.map((bill) => (
              <details
                key={bill.id}
                className="rounded-2xl border border-slate-100 bg-slate-50"
              >
                <summary className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-left cursor-pointer list-none">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {bill.billNumber
                        ? `${t("bills.billLabel")} #${bill.billNumber}`
                        : `${t("bills.billLabel")} #${bill.id.slice(0, 6)}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(bill.billDate)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    {bill.sherkatStock && (
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-semibold uppercase tracking-wide text-slate-500">
                        {t("bills.sherkatStock")}
                      </span>
                    )}
                    {bill.mandawiCheck && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold uppercase tracking-wide text-amber-600">
                        {bill.mandawiCheckNumber ? t("bills.mandawiCheck") : t("bills.hesabMandawi")}
                      </span>
                    )}
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold uppercase tracking-wide text-slate-500">
                      {bill.status}
                    </span>
                    {bill.mandawiCheck && bill.mandawiCheckNumber && (
                      <span className="text-xs text-slate-500">
                        {t("bills.checkNumber")} #{bill.mandawiCheckNumber}
                      </span>
                    )}
                    <span>{t("customer.totalAFN")}: {bill.totalAFN}</span>
                    <span>{t("customer.totalUSD")}: {bill.totalUSD}</span>
                    <span className="text-xs text-slate-500">
                      {bill.items.length} {t("common.items")}
                    </span>
                    {bill.note !== "Initial debt adjustment" && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          openEditBill(bill);
                        }}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                      >
                        {t("common.edit")}
                      </button>
                    )}
                  </div>
                </summary>

                <div className="border-t border-slate-100 px-4 py-3">
                  <div className="space-y-2">
                    {bill.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.product?.name || t("stocks.productLabel")}
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
            ))
          )}
        </div>
      </div>

      {editBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  {t("bills.editTitle")}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  {editBill.billNumber
                    ? `${t("bills.billLabel")} #${editBill.billNumber}`
                    : `${t("bills.billLabel")} #${editBill.id.slice(0, 6)}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeEditBill}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {t("common.cancel")}
              </button>
            </div>

            <form onSubmit={handleEditBillSubmit} className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    {t("billCreate.billNumber")}
                  </label>
                  <input
                    value={editBillNumber}
                    onChange={(event) =>
                      setEditBillNumber(event.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder={t("billCreate.digitsOnly")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    {t("bills.billDate")}
                  </label>
                  <input
                    type="date"
                    value={editBillDate}
                    onChange={(event) => setEditBillDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editSherkatStock}
                    onChange={(event) => setEditSherkatStock(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {t("billCreate.sherkatStock")}
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editMandawiCheck}
                    onChange={(event) => setEditMandawiCheck(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {t("billCreate.mandawi")}
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  {t("billCreate.checkNumber")}
                </label>
                <input
                  value={editMandawiCheckNumber}
                  onChange={(event) => {
                    const nextValue = event.target.value.replace(/[^0-9]/g, "");
                    setEditMandawiCheckNumber(nextValue);
                    if (nextValue) setEditMandawiCheck(true);
                  }}
                  placeholder={t("billCreate.checkPlaceholder")}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  {t("customer.note")}
                </label>
                <textarea
                  rows={3}
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
                  placeholder={t("customerCreate.notePlaceholder")}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700">
                    {t("billCreate.products")}
                  </p>
                  <button
                    type="button"
                    onClick={handleAddEditItem}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {t("billCreate.addProduct")}
                  </button>
                </div>

                {editItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    {t("billCreate.addItems")}
                  </div>
                ) : (
                  editItems.map((item, index) => (
                    <div
                      key={`${editBill.id}-item-${index}`}
                      className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:grid-cols-[1.5fr_0.6fr_auto]"
                    >
                      <select
                        value={item.productId}
                        onChange={(event) =>
                          handleEditItemChange(index, { productId: event.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                      >
                        <option value="">{t("billCreate.product")}</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={item.numberOfPackages}
                        onChange={(event) =>
                          handleEditItemChange(index, {
                            numberOfPackages: Number(event.target.value),
                          })
                        }
                        placeholder={t("billCreate.packages")}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveEditItem(index)}
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600"
                      >
                        {t("billCreate.remove")}
                      </button>
                    </div>
                  ))
                )}
                {isProductsLoading && (
                  <p className="text-xs text-slate-500">{t("billCreate.loadingProducts")}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditBill}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingBill}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {isUpdatingBill ? t("common.saving") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDebtOpen}
        title={t("customer.editDebtTitle")}
        description={t("customer.editDebtWarning")}
        confirmLabel={t("customer.saveDebt")}
        danger
        onCancel={() => setConfirmDebtOpen(false)}
        onConfirm={() => {
          setConfirmDebtOpen(false);
          void handleDebtSave();
        }}
      />
    </section>
  );
}
