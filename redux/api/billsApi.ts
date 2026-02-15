import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type BillItemInput = {
	productId: string;
	numberOfPackages: number;
	unitPrice?: number;
};

export type CreateBillInput = {
	customerId?: string;
	tempCustomerName?: string;
	billNumber?: string;
	status?: "UNPAID" | "PARTIAL" | "PAID";
	sherkatStock?: boolean;
	mandawiCheck?: boolean;
	mandawiCheckNumber?: string;
	paidAFN?: string;
	paidUSD?: string;
	items: BillItemInput[];
	billDate?: string;
	note?: string | null;
};

export type BillItem = {
	id: string;
	productId: string;
	numberOfPackages: number;
	unitPrice: string;
	currency: "AFN" | "USD";
	totalAmount: string;
};

export type Bill = {
	id: string;
	customerId?: string | null;
	tempCustomerName?: string | null;
	billNumber?: string | null;
	status: "UNPAID" | "PARTIAL" | "PAID";
	sherkatStock: boolean;
	mandawiCheck: boolean;
	mandawiCheckNumber?: string | null;
	billDate: string;
	note?: string | null;
	items: BillItem[];
};

export type UpdateBillInput = {
	id: string;
	billNumber?: string | null;
	sherkatStock?: boolean;
	mandawiCheck?: boolean;
	mandawiCheckNumber?: string | null;
	billDate?: string;
	note?: string | null;
	items: BillItemInput[];
};

export type DeleteBillResponse = {
	success: boolean;
};

export const billsApi = createApi({
	reducerPath: "billsApi",
	baseQuery: fetchBaseQuery({ baseUrl: "/api/bills" }),
	tagTypes: ["Bill"],
	endpoints: (builder) => ({
		getBills: builder.query<Bill[], void>({
			query: () => "/",
			providesTags: (result) =>
				result
					? [
							...result.map(({ id }) => ({ type: "Bill" as const, id })),
							{ type: "Bill", id: "LIST" },
						]
					: [{ type: "Bill", id: "LIST" }],
		}),
		addBill: builder.mutation<Bill, CreateBillInput>({
			query: (body) => ({
				url: "/",
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "Bill", id: "LIST" }],
		}),
		updateBill: builder.mutation<Bill, UpdateBillInput>({
			query: ({ id, ...body }) => ({
				url: `/${id}`,
				method: "PUT",
				body,
			}),
			invalidatesTags: (result, error, { id }) => [
				{ type: "Bill", id },
				{ type: "Bill", id: "LIST" },
			],
		}),
		deleteBill: builder.mutation<DeleteBillResponse, string>({
			query: (id) => ({
				url: `/${id}`,
				method: "DELETE",
			}),
			invalidatesTags: (result, error, id) => [
				{ type: "Bill", id },
				{ type: "Bill", id: "LIST" },
			],
		}),
	}),
});

export const { useGetBillsQuery, useAddBillMutation, useUpdateBillMutation, useDeleteBillMutation } = billsApi;
