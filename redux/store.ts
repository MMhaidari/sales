import { configureStore } from "@reduxjs/toolkit";
import { productApi } from "./api/productApi";
import { customersApi } from "./api/customersApi";
import { categoriesApi } from "./api/categoriesApi";
import { billsApi } from "./api/billsApi";
import { paymentsApi } from "./api/paymentsApi";
import { stocksApi } from "./api/stocksApi";

const store = configureStore({
  reducer: {
    [productApi.reducerPath]: productApi.reducer,
    [customersApi.reducerPath]: customersApi.reducer,
    [categoriesApi.reducerPath]: categoriesApi.reducer,
    [billsApi.reducerPath]: billsApi.reducer,
    [paymentsApi.reducerPath]: paymentsApi.reducer,
    [stocksApi.reducerPath]: stocksApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
        productApi.middleware,
        customersApi.middleware,
        categoriesApi.middleware,
        billsApi.middleware,
        paymentsApi.middleware,
        stocksApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
