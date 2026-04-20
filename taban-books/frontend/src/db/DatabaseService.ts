import Dexie from "dexie";
import { tabanBillingDB } from "./TabanBillingDB";
import type {
  ClientRecord,
  InvoiceRecord,
  InvoiceSearchParams,
  SyncQueueRecord,
} from "./types";

const isQuotaExceededError = (error: unknown) => {
  const message = String((error as any)?.message || "").toLowerCase();
  return (
    (error as any)?.name === "QuotaExceededError" ||
    message.includes("quota") ||
    message.includes("disk full")
  );
};

const isVersionChangeError = (error: unknown) => {
  const message = String((error as any)?.message || "").toLowerCase();
  return (
    (error as any)?.name === "VersionError" ||
    (error as any)?.name === "InvalidStateError" ||
    message.includes("version") ||
    message.includes("blocked")
  );
};

export class DatabaseService {
  // ----------------------------
  // Invoices CRUD
  // ----------------------------
  async addInvoice(invoice: InvoiceRecord): Promise<string> {
    try {
      await tabanBillingDB.invoices.add(invoice);
      return invoice.id;
    } catch (error) {
      this.handleDatabaseError(error, "addInvoice");
      throw error;
    }
  }

  async updateInvoice(id: string, patch: Partial<InvoiceRecord>): Promise<number> {
    try {
      return await tabanBillingDB.invoices.update(id, patch);
    } catch (error) {
      this.handleDatabaseError(error, "updateInvoice");
      throw error;
    }
  }

  async deleteInvoice(id: string): Promise<void> {
    try {
      await tabanBillingDB.invoices.delete(id);
    } catch (error) {
      this.handleDatabaseError(error, "deleteInvoice");
      throw error;
    }
  }

  async getInvoiceById(id: string): Promise<InvoiceRecord | undefined> {
    try {
      return await tabanBillingDB.invoices.get(id);
    } catch (error) {
      this.handleDatabaseError(error, "getInvoiceById");
      throw error;
    }
  }

  // ----------------------------
  // Clients CRUD
  // ----------------------------
  async addClient(client: ClientRecord): Promise<string> {
    try {
      await tabanBillingDB.clients.add(client);
      return client.id;
    } catch (error) {
      this.handleDatabaseError(error, "addClient");
      throw error;
    }
  }

  async updateClient(id: string, patch: Partial<ClientRecord>): Promise<number> {
    try {
      return await tabanBillingDB.clients.update(id, patch);
    } catch (error) {
      this.handleDatabaseError(error, "updateClient");
      throw error;
    }
  }

  async deleteClient(id: string): Promise<void> {
    try {
      await tabanBillingDB.clients.delete(id);
    } catch (error) {
      this.handleDatabaseError(error, "deleteClient");
      throw error;
    }
  }

  async getClientById(id: string): Promise<ClientRecord | undefined> {
    try {
      return await tabanBillingDB.clients.get(id);
    } catch (error) {
      this.handleDatabaseError(error, "getClientById");
      throw error;
    }
  }

  // ----------------------------
  // Sync queue CRUD
  // ----------------------------
  async enqueueSyncChange(change: SyncQueueRecord): Promise<string> {
    try {
      await tabanBillingDB.syncQueue.add(change);
      return change.id;
    } catch (error) {
      this.handleDatabaseError(error, "enqueueSyncChange");
      throw error;
    }
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    try {
      await tabanBillingDB.syncQueue.delete(id);
    } catch (error) {
      this.handleDatabaseError(error, "removeSyncQueueItem");
      throw error;
    }
  }

  async getPendingSyncQueue(): Promise<SyncQueueRecord[]> {
    try {
      return await tabanBillingDB.syncQueue.orderBy("createdAt").toArray();
    } catch (error) {
      this.handleDatabaseError(error, "getPendingSyncQueue");
      throw error;
    }
  }

  // ----------------------------
  // Search invoices
  // ----------------------------
  async searchInvoices(params: InvoiceSearchParams): Promise<InvoiceRecord[]> {
    try {
      let rows = params.status
        ? await tabanBillingDB.invoices.where("status").equals(params.status).toArray()
        : await tabanBillingDB.invoices.toArray();

      if (params.dueDateFrom) {
        const min = new Date(params.dueDateFrom).getTime();
        rows = rows.filter((row) => {
          if (!row.dueDate) return false;
          return new Date(row.dueDate).getTime() >= min;
        });
      }

      if (params.dueDateTo) {
        const max = new Date(params.dueDateTo).getTime();
        rows = rows.filter((row) => {
          if (!row.dueDate) return false;
          return new Date(row.dueDate).getTime() <= max;
        });
      }

      return rows;
    } catch (error) {
      this.handleDatabaseError(error, "searchInvoices");
      throw error;
    }
  }

  // ----------------------------
  // Bulk import (initial sync)
  // ----------------------------
  async bulkImport(payload: {
    invoices?: InvoiceRecord[];
    clients?: ClientRecord[];
    syncQueue?: SyncQueueRecord[];
  }): Promise<void> {
    try {
      // Transaction flow:
      // 1) Open a single read-write transaction spanning all stores.
      // 2) Bulk put records into each target store.
      // 3) Commit atomically; if any step fails Dexie rolls back.
      await tabanBillingDB.transaction(
        "rw",
        tabanBillingDB.invoices,
        tabanBillingDB.clients,
        tabanBillingDB.syncQueue,
        async () => {
          if (payload.invoices?.length) {
            await tabanBillingDB.invoices.bulkPut(payload.invoices);
          }
          if (payload.clients?.length) {
            await tabanBillingDB.clients.bulkPut(payload.clients);
          }
          if (payload.syncQueue?.length) {
            await tabanBillingDB.syncQueue.bulkPut(payload.syncQueue);
          }
        },
      );
    } catch (error) {
      this.handleDatabaseError(error, "bulkImport");
      throw error;
    }
  }

  // ----------------------------
  // Maintenance
  // ----------------------------
  async clearCache(): Promise<void> {
    try {
      await tabanBillingDB.delete();
      await tabanBillingDB.open();
    } catch (error) {
      this.handleDatabaseError(error, "clearCache");
      throw error;
    }
  }

  private handleDatabaseError(error: unknown, operation: string) {
    if (isQuotaExceededError(error)) {
      console.error(`[IndexedDB:${operation}] Quota exceeded`, error);
      return;
    }
    if (isVersionChangeError(error)) {
      console.error(`[IndexedDB:${operation}] Version change / blocked`, error);
      return;
    }
    if (error instanceof Dexie.DexieError) {
      console.error(`[IndexedDB:${operation}] Dexie error`, error);
      return;
    }
    console.error(`[IndexedDB:${operation}] Unknown database error`, error);
  }
}

export const databaseService = new DatabaseService();

