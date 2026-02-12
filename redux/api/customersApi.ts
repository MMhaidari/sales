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
        getCustomersPaged: builder.query<PaginatedResponse<Customer>, { page: number; pageSize: number }>({
            query: ({ page, pageSize }) => `paged?page=${page}&pageSize=${pageSize}`,
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
    }),
});

export const {
    useGetCustomersQuery,
    useGetCustomersPagedQuery,
    useGetCustomerByIdQuery,
    useAddCustomerMutation,
    useUpdateCustomerMutation,
    useDeleteCustomerMutation,
} = customersApi;