import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Category {
	id: string;
	name: string;
}

export const categoriesApi = createApi({
	reducerPath: "categoriesApi",
	baseQuery: fetchBaseQuery({ baseUrl: "/api/categories" }),
	tagTypes: ["Category"],
	endpoints: (builder) => ({
		getCategories: builder.query<Category[], void>({
			query: () => "/",
			providesTags: (result) =>
				result
					? [
							...result.map(({ id }) => ({ type: "Category" as const, id })),
							{ type: "Category", id: "LIST" },
						]
					: [{ type: "Category", id: "LIST" }],
		}),
		addCategory: builder.mutation<Category, { name: string }>({
			query: (body) => ({
				url: "/",
				method: "POST",
				body,
			}),
			invalidatesTags: [{ type: "Category", id: "LIST" }],
		}),
		updateCategory: builder.mutation<Category, { id: string; name: string }>({
			query: ({ id, name }) => ({
				url: `/?id=${encodeURIComponent(id)}`,
				method: "PATCH",
				body: { name },
			}),
			invalidatesTags: (result, error, { id }) => [{ type: "Category", id }],
		}),
		deleteCategory: builder.mutation<Category, string>({
			query: (id) => ({
				url: `/?id=${encodeURIComponent(id)}`,
				method: "DELETE",
			}),
			invalidatesTags: (result, error, id) => [{ type: "Category", id }],
		}),
	}),
});

export const {
	useGetCategoriesQuery,
	useAddCategoryMutation,
	useUpdateCategoryMutation,
	useDeleteCategoryMutation,
} = categoriesApi;
