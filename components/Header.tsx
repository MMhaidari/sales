"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/ui/LanguageProvider";

const Header: React.FC = () => {
    const { lang, setLang, t } = useLanguage();

    const [theme, setTheme] = useState<"light" | "dark">(() => {
        if (typeof window !== "undefined") {
            const stored = window.localStorage.getItem("theme");
            const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
            return stored === "dark" || (!stored && prefersDark) ? "dark" : "light";
        }
        return "light";
    });

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.classList.toggle("theme-dark", theme === "dark");
    }, [theme]);

    const toggleTheme = () => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        document.documentElement.dataset.theme = next;
        document.documentElement.classList.toggle("theme-dark", next === "dark");
        window.localStorage.setItem("theme", next);
    };

    const toggleLanguage = () => {
        setLang(lang === "fa" ? "en" : "fa");
    };

    return (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
                        S
                    </div>
                    <div>
                        <p className="text-base font-semibold text-slate-900">{t("brand.title")}</p>
                        <p className="text-xs text-slate-500">{t("header.subtitle")}</p>
                    </div>
                </div>

                <div className="hidden items-center gap-10 sm:flex">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-pressed={theme === "dark"}
                        className="group relative inline-flex h-9 w-26 items-center rounded-full border border-slate-200 bg-slate-100 p-1 transition hover:border-slate-300"
                    >
                        <span className="sr-only">{t("header.toggleTheme")}</span>
                        <span
                            className={`absolute left-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700 shadow transition-transform ${
                                theme === "dark" ? "translate-x-7" : "translate-x-0"
                            }`}
                        >
                            {theme === "dark" ? (
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                >
                                    <circle cx="12" cy="12" r="4" />
                                    <path
                                        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            )}
                        </span>
                        <span className="flex w-full items-center justify-between px-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                            <span className={theme === "dark" ? "opacity-40" : "opacity-100"}>
                                {t("header.light")}
                            </span>
                            <span className={theme === "dark" ? "opacity-100" : "opacity-40"}>
                                {t("header.dark")}
                            </span>
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={toggleLanguage}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300"
                    >
                        <span>{t("header.language")}</span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700">
                            {lang === "fa" ? "FA" : "EN"}
                        </span>
                    </button>
                    <Link
                        href="/createnewbill"
                        className="rounded-md bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        {t("header.newBill")}
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default Header;