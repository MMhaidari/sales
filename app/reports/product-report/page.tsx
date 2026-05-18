"use client";

import React, { useMemo, useState } from "react";
import { useGetProductsQuery } from "@/redux/api/productApi";
import { useLanguage } from "@/components/ui/LanguageProvider";
import { formatDualDate } from "@/lib/dateFormat";

type Row = {
  id: string;
  billNumber: string | null;
  billDate: string | null;
  customerName: string | null;
  numberOfPackages: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
};

export default function ProductReportPage() {
  const { t } = useLanguage();
  const { data: products = [] } = useGetProductsQuery();
  const [productId, setProductId] = useState<string | undefined>(undefined);
  const [fromDate, setFromDate] = useState(() =>
    new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [includeSherkat, setIncludeSherkat] = useState(true);
  const [includeMandawi, setIncludeMandawi] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ totalAFN: 0, totalUSD: 0, totalPackages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId),
    [products, productId]
  );

  const handlePrint = async () => {
    if (rows.length === 0) return;

    const escapeHtml = (value: string) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const formattedFromDate = formatDualDate(new Date(fromDate).toISOString());
    const formattedToDate = formatDualDate(new Date(toDate).toISOString());
    const selectedProductName = selectedProduct?.name ?? "-";

    const rowsHtml = rows
      .map(
        (row, index) =>
          `<tr>
            <td style="border:1px solid #e5e7eb;padding:10px;">${index + 1}</td>
            <td style="border:1px solid #e5e7eb;padding:10px;">${escapeHtml(row.customerName ?? "-")}</td>
            <td style="border:1px solid #e5e7eb;padding:10px;">${escapeHtml(row.billNumber ?? "-")}</td>
            <td style="border:1px solid #e5e7eb;padding:10px;">${row.numberOfPackages.toLocaleString()}</td>
            <td style="border:1px solid #e5e7eb;padding:10px;">${row.unitPrice.toLocaleString()}</td>
            <td style="border:1px solid #e5e7eb;padding:10px;">${row.totalAmount.toLocaleString()}</td>
            <td style="border:1px solid #e5e7eb;padding:10px;">${escapeHtml(row.currency)}</td>
            <td style="border:1px solid #e5e7eb;padding:10px;">${row.billDate ? escapeHtml(new Date(row.billDate).toLocaleDateString()) : "-"}</td>
          </tr>`
      )
      .join("");

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;padding:24px;">
        <div style="margin-bottom:24px;">
          <div style="font-size:14px;font-weight:700;margin-bottom:8px;">Product Report</div>
          <div style="font-size:12px;color:#475569;line-height:1.6;">
            <div><strong>Product:</strong> ${escapeHtml(selectedProductName)}</div>
            <div><strong>From date:</strong> ${escapeHtml(formattedFromDate)}</div>
            <div><strong>To date:</strong> ${escapeHtml(formattedToDate)}</div>
            <div><strong>Include Sherkat:</strong> ${includeSherkat ? "Yes" : "No"}</div>
            <div><strong>Include Mandawi:</strong> ${includeMandawi ? "Yes" : "No"}</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr>
              <th style="border:1px solid #e5e7eb;padding:10px;text-align:left;background:#f8fafc;">#</th>
              <th style="border:1px solid #e5e7eb;padding:10px;text-align:left;background:#f8fafc;">Customer</th>
              <th style="border:1px solid #e5e7eb;padding:10px;text-align:left;background:#f8fafc;">Bill #</th>
              <th style="border:1px solid #e5e7eb;padding:10px;text-align:left;background:#f8fafc;">Quantity</th>
              <th style="border:1px solid #e5e7eb;padding:10px;text-align:left;background:#f8fafc;">Unit Price</th>
              <th style="border:1px solid #e5e7eb;padding:10px;text-align:left;background:#f8fafc;">Total</th>
              <th style="border:1px solid #e5e7eb;padding:10px;text-align:left;background:#f8fafc;">Currency</th>
              <th style="border:1px solid #e5e7eb;padding:10px;text-align:left;background:#f8fafc;">Bill Date</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:20px;font-size:13px;">
          <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;">Total packages: ${totals.totalPackages.toLocaleString()}</div>
          <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;">Total AFN: ${totals.totalAFN.toLocaleString()}</div>
          <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;">Total USD: ${totals.totalUSD.toLocaleString()}</div>
        </div>
      </div>
    `;

    const { default: printJS } = await import("print-js");
    printJS({ printable: html, type: "raw-html" });
  };

  async function generate() {
    setError(null);
    if (!productId) {
      setError("Select a product");
      return;
    }
    if (new Date(fromDate).getTime() > new Date(toDate).getTime()) {
      setError("From date must be before or equal to To date");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("productId", productId);
      params.set("from", new Date(fromDate).toISOString());
      params.set("to", new Date(toDate).toISOString());
      params.set("includeSherkat", String(includeSherkat));
      params.set("includeMandawi", String(includeMandawi));

      const res = await fetch(`/api/reports/product?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch");
      const body = await res.json();
      setRows(body.items ?? []);
      setTotals(body.totals ?? { totalAFN: 0, totalUSD: 0, totalPackages: 0 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            {t("reports.title")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Product Report</h1>
        </div>
        <div className="text-sm text-slate-500">
          From: {formatDualDate(new Date(fromDate).toISOString())} · To: {formatDualDate(new Date(toDate).toISOString())}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Product</label>
          <select
            className="w-full rounded-md border p-2"
            value={productId ?? ""}
            onChange={(e) => setProductId(e.target.value || undefined)}
          >
            <option value="">Select product</option>
            {products.map((p: { id: string; name: string }) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-500">From date</label>
          <input type="date" className="w-full rounded-md border p-2" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-500">To date</label>
          <input type="date" className="w-full rounded-md border p-2" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-500">Include Sherkat Stock</label>
          <div>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={includeSherkat} onChange={(e) => setIncludeSherkat(e.target.checked)} />
              <span className="text-sm">Include</span>
            </label>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-500">Include Hesab Mandawi</label>
          <div>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={includeMandawi} onChange={(e) => setIncludeMandawi(e.target.checked)} />
              <span className="text-sm">Include</span>
            </label>
          </div>
        </div>

        <div className="flex items-end">
          <button
            onClick={generate}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Report</h2>
          <button
            type="button"
            onClick={handlePrint}
            disabled={rows.length === 0}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Print
          </button>
        </div>
        {rows.length === 0 ? (
          <div className="text-sm text-slate-500">No sales found for selected criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="pb-2">To</th>
                  <th className="pb-2">Bill #</th>
                  <th className="pb-2">Quantity</th>
                  <th className="pb-2">Unit Price</th>
                  <th className="pb-2">Total</th>
                  <th className="pb-2">Currency</th>
                  <th className="pb-2">Bill Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="text-slate-700">
                    <td className="py-2">{r.customerName ?? "-"}</td>
                    <td className="py-2">{r.billNumber ?? "-"}</td>
                    <td className="py-2">{r.numberOfPackages.toLocaleString()}</td>
                    <td className="py-2">{r.unitPrice.toLocaleString()}</td>
                    <td className="py-2">{r.totalAmount.toLocaleString()}</td>
                    <td className="py-2">{r.currency}</td>
                    <td className="py-2">{r.billDate ? new Date(r.billDate).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex gap-4">
              <div className="rounded-lg border px-4 py-2">Total packages: {totals.totalPackages.toLocaleString()}</div>
              <div className="rounded-lg border px-4 py-2">Total AFN: {totals.totalAFN.toLocaleString()}</div>
              <div className="rounded-lg border px-4 py-2">Total USD: {totals.totalUSD.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
