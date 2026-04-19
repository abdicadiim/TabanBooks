/**
 * Example: How to Use Permission System in Components
 * 
 * This file demonstrates various ways to implement permission-based
 * UI rendering in your React components.
 */

import React from "react";
import { usePermissions } from "../hooks/usePermissions";
import { PermissionGuard, PermissionButton } from "../components/PermissionGuard";

/**
 * Example 1: Using PermissionGuard Component
 * This is the simplest way to conditionally render based on permissions
 */
export function ItemListExample() {
    return (
        <div>
            <h1>Items</h1>

            {/* Only show Create button if user has create permission */}
            <PermissionGuard module="items" subModule="item" action="create">
                <button className="btn-primary">
                    Create New Item
                </button>
            </PermissionGuard>

            {/* Item list - only visible if user can view items */}
            <PermissionGuard module="items" subModule="item" action="view">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>SKU</th>
                            <th>Price</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Item rows */}
                    </tbody>
                </table>
            </PermissionGuard>

            {/* Show message if user can't view items */}
            <PermissionGuard
                module="items"
                subModule="item"
                action="view"
                hideIfNoPermission={false}
                fallback={<p>You don't have permission to view items.</p>}
            >
                {/* This won't show if no permission */}
            </PermissionGuard>
        </div>
    );
}

/**
 * Example 2: Using usePermissions Hook
 * More flexible for complex conditional logic
 */
export function InvoiceFormExample() {
    const { canCreate, canEdit, canDelete, canApprove, loading } = usePermissions();

    if (loading) {
        return <div>Loading permissions...</div>;
    }

    const canCreateInvoice = canCreate("sales", "invoices");
    const canEditInvoice = canEdit("sales", "invoices");
    const canDeleteInvoice = canDelete("sales", "invoices");
    const canApproveInvoice = canApprove("sales", "invoices");

    return (
        <div>
            <h1>Invoice</h1>

            {canCreateInvoice && (
                <button onClick={() => console.log("Create invoice")}>
                    Create Invoice
                </button>
            )}

            {canEditInvoice && (
                <button onClick={() => console.log("Edit invoice")}>
                    Edit Invoice
                </button>
            )}

            {canDeleteInvoice && (
                <button onClick={() => console.log("Delete invoice")}>
                    Delete Invoice
                </button>
            )}

            {canApproveInvoice && (
                <button onClick={() => console.log("Approve invoice")}>
                    Approve Invoice
                </button>
            )}

            {!canCreateInvoice && !canEditInvoice && (
                <p>You can only view invoices. Contact your administrator for edit access.</p>
            )}
        </div>
    );
}

/**
 * Example 3: Using PermissionButton Component
 * Automatically disables button if no permission
 */
export function CustomerActionsExample() {
    return (
        <div>
            <h1>Customer Actions</h1>

            {/* Button will be disabled if user doesn't have permission */}
            <PermissionButton
                module="contacts"
                subModule="customers"
                action="create"
                className="btn-primary"
                onClick={() => console.log("Create customer")}
            >
                Create Customer
            </PermissionButton>

            <PermissionButton
                module="contacts"
                subModule="customers"
                action="edit"
                className="btn-secondary"
                onClick={() => console.log("Edit customer")}
            >
                Edit Customer
            </PermissionButton>

            <PermissionButton
                module="contacts"
                subModule="customers"
                action="delete"
                className="btn-danger"
                onClick={() => console.log("Delete customer")}
                disabledMessage="You don't have permission to delete customers"
            >
                Delete Customer
            </PermissionButton>
        </div>
    );
}

/**
 * Example 4: Complex Permission Logic
 * Combining multiple permission checks
 */
export function DashboardExample() {
    const { hasPermission, isOwner, isAdmin } = usePermissions();

    const canViewSales = hasPermission("sales", "invoices", "view");
    const canViewPurchases = hasPermission("purchases", "bills", "view");
    const canViewAccounting = hasPermission("accountant", "chartOfAccounts", "view");
    const canViewReports = hasPermission("reports");

    return (
        <div>
            <h1>Dashboard</h1>

            {/* Show admin panel only to owners and admins */}
            {(isOwner || isAdmin) && (
                <div className="admin-panel">
                    <h2>Admin Panel</h2>
                    <p>System settings and user management</p>
                </div>
            )}

            {/* Sales widget */}
            {canViewSales && (
                <div className="widget">
                    <h3>Sales Summary</h3>
                    <p>Total sales this month: $10,000</p>
                </div>
            )}

            {/* Purchases widget */}
            {canViewPurchases && (
                <div className="widget">
                    <h3>Purchases Summary</h3>
                    <p>Total purchases this month: $5,000</p>
                </div>
            )}

            {/* Accounting widget */}
            {canViewAccounting && (
                <div className="widget">
                    <h3>Account Balance</h3>
                    <p>Current balance: $25,000</p>
                </div>
            )}

            {/* Reports link */}
            {canViewReports && (
                <div className="widget">
                    <h3>Reports</h3>
                    <a href="/reports">View All Reports</a>
                </div>
            )}

            {/* Show message if user has no dashboard permissions */}
            {!canViewSales && !canViewPurchases && !canViewAccounting && !canViewReports && (
                <div className="no-access">
                    <p>You don't have access to any dashboard widgets.</p>
                    <p>Contact your administrator to request access.</p>
                </div>
            )}
        </div>
    );
}

/**
 * Example 5: Navigation Menu with Permissions
 * Hide menu items based on permissions
 */
export function NavigationExample() {
    const { hasPermission } = usePermissions();

    const menuItems = [
        {
            label: "Dashboard",
            path: "/dashboard",
            permission: { module: "dashboard" }
        },
        {
            label: "Items",
            path: "/items",
            permission: { module: "items", subModule: "item", action: "view" }
        },
        {
            label: "Customers",
            path: "/customers",
            permission: { module: "contacts", subModule: "customers", action: "view" }
        },
        {
            label: "Invoices",
            path: "/invoices",
            permission: { module: "sales", subModule: "invoices", action: "view" }
        },
        {
            label: "Bills",
            path: "/bills",
            permission: { module: "purchases", subModule: "bills", action: "view" }
        },
        {
            label: "Chart of Accounts",
            path: "/accounts",
            permission: { module: "accountant", subModule: "chartOfAccounts", action: "view" }
        },
        {
            label: "Reports",
            path: "/reports",
            permission: { module: "reports" }
        },
        {
            label: "Settings",
            path: "/settings",
            permission: { module: "settings" }
        }
    ];

    return (
        <nav>
            <ul>
                {menuItems.map((item) => {
                    const { module, subModule, action } = item.permission;
                    const canAccess = hasPermission(module, subModule, action);

                    if (!canAccess) return null;

                    return (
                        <li key={item.path}>
                            <a href={item.path}>{item.label}</a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

/**
 * Example 6: Table Row Actions with Permissions
 * Show/hide action buttons based on permissions
 */
export function ItemTableExample({ items }: { items: any[] }) {
    const { canEdit, canDelete } = usePermissions();

    const canEditItem = canEdit("items", "item");
    const canDeleteItem = canDelete("items", "item");

    return (
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Price</th>
                    {(canEditItem || canDeleteItem) && <th>Actions</th>}
                </tr>
            </thead>
            <tbody>
                {items.map((item) => (
                    <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.sku}</td>
                        <td>${item.price}</td>
                        {(canEditItem || canDeleteItem) && (
                            <td>
                                {canEditItem && (
                                    <button onClick={() => console.log("Edit", item.id)}>
                                        Edit
                                    </button>
                                )}
                                {canDeleteItem && (
                                    <button onClick={() => console.log("Delete", item.id)}>
                                        Delete
                                    </button>
                                )}
                            </td>
                        )}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/**
 * Example 7: Form Fields with Permissions
 * Disable form fields based on permissions
 */
export function InvoiceFormFieldsExample() {
    const { canEdit } = usePermissions();

    const canEditInvoice = canEdit("sales", "invoices");

    return (
        <form>
            <div>
                <label>Customer</label>
                <select disabled={!canEditInvoice}>
                    <option>Select Customer</option>
                </select>
            </div>

            <div>
                <label>Invoice Date</label>
                <input type="date" disabled={!canEditInvoice} />
            </div>

            <div>
                <label>Amount</label>
                <input type="number" disabled={!canEditInvoice} />
            </div>

            <div>
                <label>Notes</label>
                <textarea disabled={!canEditInvoice} />
            </div>

            {canEditInvoice ? (
                <button type="submit">Save Invoice</button>
            ) : (
                <p className="warning">
                    You don't have permission to edit invoices. This form is read-only.
                </p>
            )}
        </form>
    );
}

export default {
    ItemListExample,
    InvoiceFormExample,
    CustomerActionsExample,
    DashboardExample,
    NavigationExample,
    ItemTableExample,
    InvoiceFormFieldsExample,
};
