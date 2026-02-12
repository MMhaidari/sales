import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Product {
    id: string;
    name: string;
    currentPricePerPackage: string;
    currencyType: "AFN" | "USD";
    categoryId?: string | null;
}

export type PaginatedResponse<T> = {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
};

export const productApi = createApi({
    reducerPath: "productApi",
    baseQuery: fetchBaseQuery({ baseUrl: "/api/products" }),
    tagTypes: ["Product"],
    endpoints: (builder) => ({
        getProducts: builder.query<Product[], void>({
            query: () => "/",
            providesTags: (result) =>
                result
                    ? [
                            ...result.map(({ id }) => ({ type: "Product" as const, id })),
                            { type: "Product", id: "LIST" },
                        ]
                    : [{ type: "Product", id: "LIST" }],
        }),
        getProductsPaged: builder.query<PaginatedResponse<Product>, { page: number; pageSize: number }>({
            query: ({ page, pageSize }) => `paged?page=${page}&pageSize=${pageSize}`,
            providesTags: (result) =>
                result
                    ? [
                            ...result.items.map(({ id }) => ({ type: "Product" as const, id })),
                            { type: "Product", id: "LIST" },
                        ]
                    : [{ type: "Product", id: "LIST" }],
        }),
        addProduct: builder.mutation<
            Product,
            {
                name: string;
                currentPricePerPackage: number;
                currencyType: "AFN" | "USD";
                categoryId?: string | null;
            }
        >({
            query: (body) => ({
                url: "/",
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "Product", id: "LIST" }],
        }),
        updateProduct: builder.mutation<
            Product,
            Partial<Product> & { id: string }
        >({
            query: (body) => ({
                url: "/",
                method: "PUT",
                body,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: "Product", id }],
        }),
        deleteProduct: builder.mutation<{ success: boolean }, string>({
            query: (id) => ({
                url: "/",
                method: "DELETE",
                body: { id },
            }),
            invalidatesTags: (result, error, id) => [{ type: "Product", id }],
        }),
    }),
});

export const {
    useGetProductsQuery,
    useGetProductsPagedQuery,
    useAddProductMutation,
    useUpdateProductMutation,
    useDeleteProductMutation,
} = productApi;