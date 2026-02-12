"use client";
import ShowCustomersList from "@/components/customers/ShowCustomersList";
import React from "react";
import { useLanguage } from "@/components/ui/LanguageProvider";

export default function CustomersPage(): React.JSX.Element {
  const { t } = useLanguage();
  return (
    <div>
      <h1>{t("customers.title")}</h1>

      <ShowCustomersList />
    </div>
  );
}
