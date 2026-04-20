declare module "@tanstack/react-query" {
  export const keepPreviousData: typeof import("../features/sales/salesModel").keepPreviousData;

  export type QueryClient = import("../features/sales/salesModel").QueryClient;

  export const useQueryClient: typeof import("../features/sales/salesModel").useQueryClient;
  export const useQuery: typeof import("../features/sales/salesModel").useQuery;
  export const useMutation: typeof import("../features/sales/salesModel").useMutation;
}
