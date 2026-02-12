import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type StockSummary = {
  productId: string;
  productName: string;
  packagesAvailable: number;
};

export type StockHistoryItem = {
  id: string;
  quantityChange: number;
  movementType: "IN" | "OUT";
  sourceType: "MANUAL" | "CONTAINER" | "BILL";
  isContainer: boolean;
  containerNumber: string | null;
  driverName: string | null;
  billOfLadingNumber: string | null;
  arrivalDate: string | null;
  leakPackages: number | null;
  note: string | null;
  billId: string | null;
  createdAt: string;
};

export type StockHistoryResponse = {
  productId: string;
  productName: string;
  history: StockHistoryItem[];
};

export type CreateStockInput = {
  productId?: string;
  quantityChange?: number;
  note?: string | null;
  isContainer?: boolean;
  containerNumber?: string;
  driverName?: string;
  billOfLadingNumber?: string;
  arrivalDate?: string;
  leakPackages?: number;
  items?: Array<{
    productId: string;
    quantityChange: number;
    leakPackages?: number;
  }>;
};

export type StockMutationResult = {
  success: boolean;
  createdCount: number;
};

export const stocksApi = createApi({
  reducerPath: "stocksApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/stocks" }),
  tagTypes: ["Stock"],
  endpoints: (builder) => ({
    getStockSummary: builder.query<StockSummary[], void>({
      query: () => "/",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ productId }) => ({
                type: "Stock" as const,
                id: productId,
              })),
              { type: "Stock", id: "LIST" },
            ]
          : [{ type: "Stock", id: "LIST" }],
    }),
    getStockHistory: builder.query<StockHistoryResponse, string>({
      query: (productId) => `/${productId}`,
      providesTags: (_result, _error, productId) => [
        { type: "Stock", id: productId },
      ],
    }),
    addStock: builder.mutation<StockMutationResult, CreateStockInput>({
      query: (body) => ({
        url: "/",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => {
        const ids = new Set<string>();
        if (arg.productId) ids.add(arg.productId);
        if (Array.isArray(arg.items)) {
          arg.items.forEach((item) => {
            if (item?.productId) ids.add(item.productId);
          });
        }
        return [
          { type: "Stock", id: "LIST" },
          ...Array.from(ids).map((id) => ({ type: "Stock" as const, id })),
        ];
      },
    }),
  }),
});

export const {
  useGetStockSummaryQuery,
  useGetStockHistoryQuery,
  useAddStockMutation,
} = stocksApi;
