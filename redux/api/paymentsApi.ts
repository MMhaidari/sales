import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type CreatePaymentInput = {
  billId?: string;
  customerId?: string;
  amountPaid: number | string;
  currency: "AFN" | "USD";
  paymentNumber?: string;
  paymentMethod?: string;
  note?: string | null;
};

export type Payment = {
  id: string;
  billId: string;
  paymentNumber?: string | null;
  amountPaid: string;
  currency: "AFN" | "USD";
  paymentMethod: string;
  paymentDate: string;
  note?: string | null;
};

export type PaymentResponse = {
  payments: Payment[];
};

export type DeletePaymentResponse = {
  success: boolean;
};

export const paymentsApi = createApi({
  reducerPath: "paymentsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/payments" }),
  tagTypes: ["Payment"],
  endpoints: (builder) => ({
    getPayments: builder.query<PaymentResponse, void>({
      query: () => "/",
      providesTags: (result) =>
        result
          ? [
              ...result.payments.map(({ id }) => ({
                type: "Payment" as const,
                id,
              })),
              { type: "Payment", id: "LIST" },
            ]
          : [{ type: "Payment", id: "LIST" }],
    }),
    addPayment: builder.mutation<PaymentResponse, CreatePaymentInput>({
      query: (body) => ({
        url: "/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Payment", id: "LIST" }],
    }),
    deletePayment: builder.mutation<DeletePaymentResponse, string>({
      query: (id) => ({
        url: `/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Payment", id },
        { type: "Payment", id: "LIST" },
      ],
    }),
  }),
});

export const { useGetPaymentsQuery, useAddPaymentMutation, useDeletePaymentMutation } = paymentsApi;
