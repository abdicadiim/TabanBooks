import { lazy } from "react";
import type { QueryClient } from "@tanstack/react-query";

import { customerQueryKeys, fetchCustomersList } from "./customerQueries";

export const loadCustomersIndexRoute = () => import("./Customers");
export const loadNewCustomerRoute = () => import("./NewCustomer/NewCustomer");
export const loadCustomerDetailRoute = () => import("./CustomerDetail/CustomerDetail");
export const loadImportCustomersRoute = () => import("./ImportCustomers/ImportCustomers");
export const loadRequestReviewRoute = () => import("./RequestReview/RequestReview");
export const loadSendEmailStatementRoute = () => import("./CustomerDetail/SendEmailStatement/SendEmailStatement");

export const CustomersIndexRoute = lazy(loadCustomersIndexRoute);
export const NewCustomerRoute = lazy(loadNewCustomerRoute);
export const CustomerDetailRoute = lazy(loadCustomerDetailRoute);
export const ImportCustomersRoute = lazy(loadImportCustomersRoute);
export const RequestReviewRoute = lazy(loadRequestReviewRoute);
export const SendEmailStatementRoute = lazy(loadSendEmailStatementRoute);

export const preloadCustomersIndexRoute = () => loadCustomersIndexRoute();
export const preloadNewCustomerRoute = () => loadNewCustomerRoute();
export const preloadCustomerDetailRoute = () => loadCustomerDetailRoute();
export const preloadSendEmailStatementRoute = () => loadSendEmailStatementRoute();
export const preloadCustomersRoutes = () => import("./CustomersRoutes");

export const preloadCustomersIndexData = (queryClient: QueryClient) => {
  void preloadCustomersIndexRoute();

  void queryClient.prefetchQuery({
    queryKey: customerQueryKeys.list({ page: 1, limit: 10, search: "" }),
    queryFn: () => fetchCustomersList({ page: 1, limit: 10, search: "" }),
  });

  void queryClient.prefetchQuery({
    queryKey: customerQueryKeys.list({ page: 1, limit: 1000, search: "" }),
    queryFn: () => fetchCustomersList({ page: 1, limit: 1000, search: "" }),
  });
};
