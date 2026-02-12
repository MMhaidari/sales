"use client";

import { Provider } from "react-redux";
import store from "@/redux/store";
import { LanguageProvider } from "@/components/ui/LanguageProvider";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider store={store}>
      <LanguageProvider>{children}</LanguageProvider>
    </Provider>
  );
}
