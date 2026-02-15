import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Customer {
    id: string;
    name: string;
    phone?: string;
    phoneNumber?: string;
    initialDebtAFN?: string;
    initialDebtUSD?: string;
    debtAFN?: string;
    debtUSD?: string;
    paidAFN?: string;
    paidUSD?: string;
    note?: string | null;
    address?: string;
    bills?: BillSummary[];
    payments?: PaymentSummary[];
}

export interface BillSummary {
    id: string;
    billNumber?: string | null;
    sherkatStock?: boolean;
    mandawiCheck?: boolean;
    mandawiCheckNumber?: string | null;
    items: BillItemSummary[];
    totalAFN: string;
    totalUSD: string;
    status: string;
    billDate: string;
    note?: string | null;
}

export interface BillItemSummary {
    id: string;
    productId: string;
    product?: {
        name: string;
        currentPricePerPackage: string;
        currency: string;
    } | null;
    numberOfPackages: number;
    unitPrice: string;
    currency: string;
    totalAmount: string;
}

export interface PaymentSummary {
    id: string;
    billId: string;
    paymentNumber?: string | null;
    amountPaid: string;
    currency: string;
    paymentDate: string;
    paymentMethod: string;
    note?: string | null;
}

export interface CreateCustomerInput {
    name: string;
    phoneNumber: string;
    address?: string;
    note?: string | null;
    initialDebtAFN?: number;
    initialDebtUSD?: number;
}

export type PaginatedResponse<T> = {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
};
export type UpdateCustomerOrderInput = {
    orderedIds: string[];
};

export type UpdateCustomerOrderResponse = {
    success: boolean;
};

export const customersApi = createApi({
    reducerPath: 'customersApi',
    baseQuery: fetchBaseQuery({ baseUrl: '/api/customers' }),
    tagTypes: ['Customer'],
    endpoints: (builder) => ({
        getCustomers: builder.query<Customer[], void>({
            query: () => '/',
            providesTags: (result) =>
                result
                    ? [
                            ...result.map(({ id }) => ({ type: 'Customer' as const, id })),
                            { type: 'Customer', id: 'LIST' },
                        ]
                    : [{ type: 'Customer', id: 'LIST' }],
        }),
        getCustomersPaged: builder.query<
            PaginatedResponse<Customer>,
            { page: number; pageSize: number; search?: string }
        >({
            query: ({ page, pageSize, search }) => {
                const params = new URLSearchParams({
                    page: String(page),
                    pageSize: String(pageSize),
                });
                if (search?.trim()) {
                    params.set('search', search.trim());
                }
                return `paged?${params.toString()}`;
            },
            providesTags: (result) =>
                result
                    ? [
                            ...result.items.map(({ id }) => ({ type: 'Customer' as const, id })),
                            { type: 'Customer', id: 'LIST' },
                        ]
                    : [{ type: 'Customer', id: 'LIST' }],
        }),
        getCustomerById: builder.query<Customer, string>({
            query: (id) => `/${id}`,
            providesTags: (result, error, id) => [{ type: 'Customer', id }],
        }),
        addCustomer: builder.mutation<Customer, CreateCustomerInput>({
            query: (body) => ({
                url: '/',
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
        }),
        updateCustomer: builder.mutation<Customer, { id: string; data: Partial<Customer> }>({
            query: ({ id, data }) => ({
                url: `/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Customer', id }],
        }),
        deleteCustomer: builder.mutation<{ success: boolean; id: string }, string>({
            query: (id) => ({
                url: `/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Customer', id }],
        }),
        updateCustomerOrder: builder.mutation<
            UpdateCustomerOrderResponse,
            UpdateCustomerOrderInput
        >({
            query: (body) => ({
                url: '/order',
                method: 'PUT',
                body,
            }),
            invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetCustomersQuery,
    useGetCustomersPagedQuery,
    useGetCustomerByIdQuery,
    useAddCustomerMutation,
    useUpdateCustomerMutation,
    useDeleteCustomerMutation,
    useUpdateCustomerOrderMutation,
} = customersApi;