import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import {
  auditLogsRepo,
  bannersRepo,
  caratsRepo,
  categoriesRepo,
  customerTypesRepo,
  customersRepo,
  inquiriesRepo,
  productsRepo,
  reorderCategories as reorderCategoriesRepo,
  sessionLogsRepo,
  staticPagesRepo,
} from '@/services/repositories'
import type {
  AuditLog,
  Banner,
  Carat,
  Category,
  Customer,
  CustomerType,
  Id,
  Inquiry,
  Product,
  SessionLog,
  StaticPage,
} from '@/types'

// Wrap a repository call so RTK Query gets `{ data }` or `{ error }`.
async function run<T>(fn: () => Promise<T>) {
  try {
    return { data: await fn() }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery<string>(),
  tagTypes: [
    'Customer',
    'CustomerType',
    'Category',
    'Carat',
    'Product',
    'Inquiry',
    'Banner',
    'StaticPage',
    'SessionLog',
    'AuditLog',
  ],
  endpoints: (build) => ({
    // ----- Customer Types (4.5) -------------------------------------------
    listCustomerTypes: build.query<CustomerType[], void>({
      queryFn: () => run(() => customerTypesRepo.list()),
      providesTags: ['CustomerType'],
    }),
    addCustomerType: build.mutation<CustomerType, Omit<CustomerType, 'id' | 'createdAt'>>({
      queryFn: (body) => run(() => customerTypesRepo.create(body)),
      invalidatesTags: ['CustomerType'],
    }),
    updateCustomerType: build.mutation<CustomerType, { id: Id; patch: Partial<CustomerType> }>({
      queryFn: ({ id, patch }) => run(() => customerTypesRepo.update(id, patch)),
      invalidatesTags: ['CustomerType'],
    }),
    deleteCustomerType: build.mutation<{ id: Id }, Id>({
      queryFn: (id) => run(() => customerTypesRepo.remove(id)),
      invalidatesTags: ['CustomerType'],
    }),

    // ----- Customers (4.4) ------------------------------------------------
    listCustomers: build.query<Customer[], void>({
      queryFn: () => run(() => customersRepo.list()),
      providesTags: ['Customer'],
    }),
    addCustomer: build.mutation<Customer, Omit<Customer, 'id' | 'createdAt'>>({
      queryFn: (body) => run(() => customersRepo.create(body)),
      invalidatesTags: ['Customer'],
    }),
    updateCustomer: build.mutation<Customer, { id: Id; patch: Partial<Customer> }>({
      queryFn: ({ id, patch }) => run(() => customersRepo.update(id, patch)),
      invalidatesTags: ['Customer'],
    }),
    deleteCustomer: build.mutation<{ id: Id }, Id>({
      queryFn: (id) => run(() => customersRepo.remove(id)),
      invalidatesTags: ['Customer'],
    }),

    // ----- Categories -----------------------------------------------------
    listCategories: build.query<Category[], void>({
      queryFn: () => run(() => categoriesRepo.list()),
      providesTags: ['Category'],
    }),
    addCategory: build.mutation<Category, Omit<Category, 'id' | 'createdAt'>>({
      queryFn: (body) => run(() => categoriesRepo.create(body)),
      invalidatesTags: ['Category'],
    }),
    updateCategory: build.mutation<Category, { id: Id; patch: Partial<Category> }>({
      queryFn: ({ id, patch }) => run(() => categoriesRepo.update(id, patch)),
      invalidatesTags: ['Category'],
    }),
    deleteCategory: build.mutation<{ id: Id }, Id>({
      queryFn: (id) => run(() => categoriesRepo.remove(id)),
      invalidatesTags: ['Category'],
    }),
    // Drag-to-reorder in the Categories grid. Takes every category id in its new
    // order; the order drives the pickers here and the customer app's listing.
    reorderCategories: build.mutation<Category[], Id[]>({
      queryFn: (ids) => run(() => reorderCategoriesRepo(ids)),
      invalidatesTags: ['Category'],
    }),

    // ----- Carats (purity master) -----------------------------------------
    listCarats: build.query<Carat[], void>({
      queryFn: () => run(() => caratsRepo.list()),
      providesTags: ['Carat'],
    }),
    addCarat: build.mutation<Carat, Omit<Carat, 'id' | 'createdAt'>>({
      queryFn: (body) => run(() => caratsRepo.create(body)),
      invalidatesTags: ['Carat'],
    }),
    // Renaming or removing a carat changes what the product grid displays, so
    // refresh products too — their purity is derived from the carat, not stored.
    updateCarat: build.mutation<Carat, { id: Id; patch: Partial<Carat> }>({
      queryFn: ({ id, patch }) => run(() => caratsRepo.update(id, patch)),
      invalidatesTags: ['Carat', 'Product'],
    }),
    deleteCarat: build.mutation<{ id: Id }, Id>({
      queryFn: (id) => run(() => caratsRepo.remove(id)),
      invalidatesTags: ['Carat', 'Product'],
    }),

    // ----- Products (3.5) -------------------------------------------------
    listProducts: build.query<Product[], void>({
      queryFn: () => run(() => productsRepo.list()),
      providesTags: ['Product'],
    }),
    addProduct: build.mutation<Product, Omit<Product, 'id' | 'createdAt'>>({
      queryFn: (body) => run(() => productsRepo.create(body)),
      invalidatesTags: ['Product'],
    }),
    updateProduct: build.mutation<Product, { id: Id; patch: Partial<Product> }>({
      queryFn: ({ id, patch }) => run(() => productsRepo.update(id, patch)),
      invalidatesTags: ['Product'],
    }),
    deleteProduct: build.mutation<{ id: Id }, Id>({
      queryFn: (id) => run(() => productsRepo.remove(id)),
      invalidatesTags: ['Product'],
    }),

    // ----- Inquiries (4.6) ------------------------------------------------
    listInquiries: build.query<Inquiry[], void>({
      queryFn: () => run(() => inquiriesRepo.list()),
      providesTags: ['Inquiry'],
    }),
    addInquiry: build.mutation<Inquiry, Omit<Inquiry, 'id' | 'createdAt'>>({
      queryFn: (body) => run(() => inquiriesRepo.create(body)),
      invalidatesTags: ['Inquiry'],
    }),
    updateInquiry: build.mutation<Inquiry, { id: Id; patch: Partial<Inquiry> }>({
      queryFn: ({ id, patch }) => run(() => inquiriesRepo.update(id, patch)),
      invalidatesTags: ['Inquiry'],
    }),
    deleteInquiry: build.mutation<{ id: Id }, Id>({
      queryFn: (id) => run(() => inquiriesRepo.remove(id)),
      invalidatesTags: ['Inquiry'],
    }),

    // ----- Banners (4.8) --------------------------------------------------
    listBanners: build.query<Banner[], void>({
      queryFn: () => run(() => bannersRepo.list()),
      providesTags: ['Banner'],
    }),
    addBanner: build.mutation<Banner, Omit<Banner, 'id' | 'createdAt'>>({
      queryFn: (body) => run(() => bannersRepo.create(body)),
      invalidatesTags: ['Banner'],
    }),
    updateBanner: build.mutation<Banner, { id: Id; patch: Partial<Banner> }>({
      queryFn: ({ id, patch }) => run(() => bannersRepo.update(id, patch)),
      invalidatesTags: ['Banner'],
    }),
    deleteBanner: build.mutation<{ id: Id }, Id>({
      queryFn: (id) => run(() => bannersRepo.remove(id)),
      invalidatesTags: ['Banner'],
    }),

    // ----- Static Pages (4.8) ---------------------------------------------
    listStaticPages: build.query<StaticPage[], void>({
      queryFn: () => run(() => staticPagesRepo.list()),
      providesTags: ['StaticPage'],
    }),
    updateStaticPage: build.mutation<StaticPage, { id: Id; patch: Partial<StaticPage> }>({
      queryFn: ({ id, patch }) => run(() => staticPagesRepo.update(id, patch)),
      invalidatesTags: ['StaticPage'],
    }),

    // ----- Logs (read-only) -----------------------------------------------
    listSessionLogs: build.query<SessionLog[], void>({
      queryFn: () => run(() => sessionLogsRepo.list()),
      providesTags: ['SessionLog'],
    }),
    listAuditLogs: build.query<AuditLog[], void>({
      queryFn: () => run(() => auditLogsRepo.list()),
      providesTags: ['AuditLog'],
    }),
  }),
})

export const {
  useListCustomerTypesQuery,
  useAddCustomerTypeMutation,
  useUpdateCustomerTypeMutation,
  useDeleteCustomerTypeMutation,
  useListCustomersQuery,
  useAddCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useListCategoriesQuery,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useReorderCategoriesMutation,
  useListCaratsQuery,
  useAddCaratMutation,
  useUpdateCaratMutation,
  useDeleteCaratMutation,
  useListProductsQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useListInquiriesQuery,
  useAddInquiryMutation,
  useUpdateInquiryMutation,
  useDeleteInquiryMutation,
  useListBannersQuery,
  useAddBannerMutation,
  useUpdateBannerMutation,
  useDeleteBannerMutation,
  useListStaticPagesQuery,
  useUpdateStaticPageMutation,
  useListSessionLogsQuery,
  useListAuditLogsQuery,
} = api
