"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useLanguage } from "@/components/ui/LanguageProvider";

type BackupResponse = {
  meta: {
    exportedAt: string;
    version: number;
  };
  data: Record<string, unknown>;
};

type ImportResponse = {
  success: boolean;
  counts: Record<string, number>;
};

export default function BackupPage() {
  const { t } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState<BackupResponse | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await fetch("/api/backup");
      if (!response.ok) throw new Error("Export failed");
      const data = (await response.json()) as BackupResponse;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t("toast.backupDownloaded"));
    } catch (error) {
      console.error(error);
      toast.error(t("toast.failedExport"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      setFileName("");
      setFileContent(null);
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupResponse;
      setFileName(file.name);
      setFileContent(parsed);
    } catch (error) {
      console.error(error);
      setFileName("");
      setFileContent(null);
      toast.error(t("toast.invalidJson"));
    }
  };

  const handleImport = async () => {
    if (!fileContent) {
      toast.error(t("toast.selectBackup"));
      return;
    }

    try {
      setIsImporting(true);
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fileContent),
      });

      if (!response.ok) throw new Error("Import failed");
      const data = (await response.json()) as ImportResponse;
      toast.success(`${t("toast.importComplete")} (${Object.keys(data.counts).length} ${t("common.items")})`);
    } catch (error) {
      console.error(error);
      toast.error(t("toast.failedImport"));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          {t("backup.dataTools")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">{t("backup.title")}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t("backup.subtitle")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-slate-900">{t("backup.exportTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t("backup.exportDesc")}
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="mt-4 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isExporting ? t("backup.exporting") : t("backup.download")}
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-slate-900">{t("backup.importTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t("backup.importDesc")}
          </p>
          <div className="mt-4 space-y-3">
            <input
              type="file"
              accept="application/json"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900"
            />
            {fileName && (
              <p className="text-xs text-slate-500">{t("backup.selected")}: {fileName}</p>
            )}
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={isImporting || !fileContent}
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
            >
              {isImporting ? t("backup.importing") : t("backup.import")}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t("backup.confirmTitle")}
        description={t("backup.confirmDescription")}
        confirmLabel={isImporting ? t("backup.importing") : t("backup.confirmLabel")}
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void handleImport();
        }}
      />
    </section>
  );
}
