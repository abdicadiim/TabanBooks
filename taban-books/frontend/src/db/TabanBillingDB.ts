import Dexie, { type Table } from "dexie";
import type { ClientRecord, InvoiceRecord, SyncQueueRecord } from "./types";

export class TabanBillingDB extends Dexie {
  invoices!: Table<InvoiceRecord, string>;
  clients!: Table<ClientRecord, string>;
  syncQueue!: Table<SyncQueueRecord, string>;

  constructor() {
    super("TabanBillingDB");

    this.version(1).stores({
      // id is the primary key. Additional fields are indexed for query/search.
      invoices: "id, clientName, status, dueDate",
      clients: "id, email, companyName",
      syncQueue: "id, entity, entityId, action, createdAt",
    });
  }
}

export const tabanBillingDB = new TabanBillingDB();

