export type TimeTrackingId = string | number;

export interface TimeTrackingCustomer {
  _id?: TimeTrackingId;
  id?: TimeTrackingId;
  name?: string;
  displayName?: string;
  [key: string]: any;
}

export interface TimeTrackingUser {
  _id?: TimeTrackingId;
  id?: TimeTrackingId;
  userId?: TimeTrackingId;
  name?: string;
  email?: string;
  user?: string;
  userEmail?: string;
  [key: string]: any;
}

export interface TimeTrackingTask {
  _id?: TimeTrackingId;
  id?: TimeTrackingId;
  taskId?: TimeTrackingId;
  name?: string;
  taskName?: string;
  description?: string;
  billable?: boolean;
  budgetHours?: number | string;
  [key: string]: any;
}

export interface TimeTrackingUserBudget {
  _id?: TimeTrackingId;
  id?: TimeTrackingId;
  user?: TimeTrackingUser | string;
  userId?: TimeTrackingId;
  name?: string;
  budgetHours?: number | string;
  hours?: number | string;
  [key: string]: any;
}

export interface TimeTrackingProject {
  _id?: TimeTrackingId;
  id?: TimeTrackingId;
  projectId?: TimeTrackingId;
  name?: string;
  projectName?: string;
  projectNumber?: TimeTrackingId;
  projectCode?: string;
  customer?: TimeTrackingCustomer | string | null;
  customerName?: string;
  customerId?: TimeTrackingId;
  description?: string;
  startDate?: string | Date;
  endDate?: string | Date | null;
  status?: string;
  budget?: number | string;
  currency?: string;
  billable?: boolean;
  billingRate?: number | string;
  billingMethod?: string;
  assignedTo?: Array<TimeTrackingUser | string>;
  users?: TimeTrackingUser[];
  tags?: string[];
  tasks?: TimeTrackingTask[];
  hoursBudgetType?: string;
  totalBudgetHours?: number | string;
  userBudgetHours?: TimeTrackingUserBudget[];
  [key: string]: any;
}

export interface TimeTrackingEntry {
  _id?: TimeTrackingId;
  id?: TimeTrackingId;
  project?: {
    _id?: TimeTrackingId;
    id?: TimeTrackingId;
    name?: string;
    projectNumber?: TimeTrackingId;
  } | null;
  projectId?: TimeTrackingId;
  projectName?: string;
  projectNumber?: TimeTrackingId;
  user?: TimeTrackingUser | string | null;
  userId?: TimeTrackingId;
  userName?: string;
  userEmail?: string;
  date?: string | Date;
  hours?: number;
  minutes?: number;
  timeSpent?: string;
  description?: string;
  notes?: string;
  task?: string;
  taskName?: string;
  billable?: boolean;
  billingRate?: number | string;
  billingStatus?: string;
  [key: string]: any;
}

export interface TimeTrackingAttachment {
  id?: TimeTrackingId;
  name?: string;
  url?: string;
  size?: number;
  type?: string;
  file?: File;
  [key: string]: any;
}

export interface TimeTrackingAccount {
  _id?: TimeTrackingId;
  id?: TimeTrackingId;
  name?: string;
  category?: string;
  type?: string;
  accountType?: string;
  currency?: string;
  [key: string]: any;
}

export interface TimeTrackingExpense {
  _id?: TimeTrackingId;
  id?: TimeTrackingId;
  customerName?: string;
  projectName?: string;
  projectId?: TimeTrackingId;
  status?: string;
  [key: string]: any;
}

export interface TimeTrackingBill {
  _id?: TimeTrackingId;
  id?: TimeTrackingId;
  customerName?: string;
  projectName?: string;
  projectId?: TimeTrackingId;
  status?: string;
  [key: string]: any;
}

export interface TimeTrackingComment {
  id?: TimeTrackingId;
  author?: string;
  text?: string;
  content?: string;
  date?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface TimeTrackingCriterion {
  id: number;
  field: string;
  comparator: string;
  value: string;
}

export const sampleProjects: TimeTrackingProject[] = [
  { id: "PRJ-001", name: "Website Redesign" },
  { id: "PRJ-002", name: "Warehouse Setup" }
];

export const sampleTimeEntries: TimeTrackingEntry[] = [
  { id: "TE-001", project: "Website Redesign", date: "2025-12-01", hours: 3 },
  { id: "TE-002", project: "Warehouse Setup", date: "2025-12-02", hours: 5 }
];

