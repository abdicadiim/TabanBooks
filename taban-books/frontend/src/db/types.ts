export type InvoiceStatus = "paid" | "pending" | "overdue" | "draft" | "void" | string;

export interface InvoiceRecord {
  id: string;
  clientId: string;
  clientName: string;
  status: InvoiceStatus;
  amount: number;
  issueDate?: string;
  dueDate?: string;
  updatedAt: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface ClientRecord {
  id: string;
  companyName: string;
  email: string;
  phone?: string;
  address?: string;
  updatedAt: string;
  createdAt: string;
  [key: string]: unknown;
}

export type SyncQueueAction = "create" | "update" | "delete";
export type SyncQueueEntity = "invoice" | "client";

export interface SyncQueueRecord {
  id: string;
  entity: SyncQueueEntity;
  entityId: string;
  action: SyncQueueAction;
  payload?: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export interface InvoiceSearchParams {
  status?: InvoiceStatus;
  dueDateFrom?: string;
  dueDateTo?: string;
}

