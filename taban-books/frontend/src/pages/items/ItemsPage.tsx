// src/pages/items/ItemsPage.tsx
import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { itemsAPI, tagAssignmentsAPI } from "../../services/api";
import { readCachedListResponse, writeCachedListResponse } from "../../services/swrListCache";
import { Item, DeleteConfirmModal } from "./itemsModel";

// Import extracted components
import ItemsList from "./ItemsList";
import ItemSidebar from "./components/ItemSidebar";
import ItemDetails from "./components/ItemDetails";
import NewItemForm from "./components/NewItemForm";
import EditItemForm from "./components/EditItemForm";
import BulkUpdateModal from "./components/modals/BulkUpdateModal";
import { useCurrency } from "../../hooks/useCurrency";
import { usePermissions } from "../../hooks/usePermissions";

function ItemsPageContent() {
  const location = useLocation();
  const searchQuery = new URLSearchParams(location.search).get("search") || "";
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [view, setView] = useState<string>("list"); // list | new | detail | edit
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<DeleteConfirmModal>({
    open: false, itemId: null, itemName: null, count: 1, itemIds: null
  });
  const [bulkUpdateModal, setBulkUpdateModal] = useState<{ open: boolean, itemIds: string[] }>({
    open: false, itemIds: []
  });
  const [clonedItem, setClonedItem] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const loadSequenceRef = useRef(0);

  const { baseCurrency } = useCurrency();
  const { canView, canCreate, canEdit, canDelete, loading: permissionsLoading } = usePermissions();
  const canViewItems = canView("items", "item");
  const canCreateItems = canCreate("items", "item");
  const canEditItems = canEdit("items", "item");
  const canDeleteItems = canDelete("items", "item");

  const normalizeItem = (item: Item): Item => ({
    ...item,
    images: Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []),
    id: item.id || item._id,
    active: item.active !== undefined ? item.active : item.isActive,
  });

  const mergeItems = (current: Item[], nextItems: Item[]) => {
    if (!nextItems.length) return current;
    const byId = new Map<string, Item>();
    current.forEach((item) => {
      const id = String(item.id || item._id || "").trim();
      if (id) byId.set(id, item);
    });
    nextItems.forEach((item) => {
      const id = String(item.id || item._id || "").trim();
      if (id) byId.set(id, item);
    });
    return Array.from(byId.values());
  };

  const waitForBrowserPaint = () =>
    new Promise<void>((resolve) => {
      if (typeof window === "undefined") {
        resolve();
        return;
      }
      window.requestAnimationFrame(() => resolve());
    });

  const fetchItems = async (options: { quiet?: boolean } = {}) => {
    const { quiet = false } = options;
    const requestId = ++loadSequenceRef.current;

    if (!quiet && items.length === 0) {
      setLoading(true);
    }

    try {
      const cached = await readCachedListResponse<any>("/items");
      if (loadSequenceRef.current !== requestId) return;

      const cachedItems = Array.isArray(cached?.data) ? cached.data : Array.isArray(cached) ? cached : [];
      if (cachedItems.length > 0) {
        startTransition(() => {
          setItems(cachedItems.map((item: Item) => normalizeItem(item)));
        });
        if (!quiet) {
          setLoading(false);
        }
      }

      const firstPage = await itemsAPI.getAll({ page: 1, limit: 100, _ts: Date.now() });
      if (loadSequenceRef.current !== requestId) return;

      const firstPageItems = (Array.isArray(firstPage?.data) ? firstPage.data : []).map((item: Item) => normalizeItem(item));
      const pagination = firstPage?.pagination || {};
      const totalPages = Math.max(1, Number(pagination.pages || 1));

      startTransition(() => {
        setItems((current) => mergeItems(current, firstPageItems));
      });
      setLoading(false);

      let mergedItems = firstPageItems.slice();
      for (let page = 2; page <= totalPages; page += 1) {
        const response = await itemsAPI.getAll({ page, limit: 100, _ts: Date.now() });
        if (loadSequenceRef.current !== requestId) return;

        const nextPageItems = (Array.isArray(response?.data) ? response.data : []).map((item: Item) => normalizeItem(item));
        mergedItems = mergeItems(mergedItems, nextPageItems);

        startTransition(() => {
          setItems((current) => mergeItems(current, nextPageItems));
        });

        if (page < totalPages) {
          await waitForBrowserPaint();
        }
      }

      void writeCachedListResponse("/items", { data: mergedItems }, {
        version_id: firstPage?.version_id,
        last_updated: firstPage?.last_updated,
      });
    } catch (error) {
      console.error("Failed to fetch items:", error);
      if (!quiet && items.length === 0) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canViewItems) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const hydrateFromCache = async () => {
      try {
        const cached = await readCachedListResponse<any>("/items");
        if (cancelled) return;

        const cachedItems = Array.isArray(cached?.data) ? cached.data : Array.isArray(cached) ? cached : [];
        if (cachedItems.length > 0) {
          const normalizedCachedItems = cachedItems.map((item: Item) => ({
            ...item,
            images: Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []),
            id: item.id || item._id,
            active: item.active !== undefined ? item.active : item.isActive,
          }));
          setItems(normalizedCachedItems);
          setLoading(false);
        }
      } catch {
        // Ignore cache hydration failures and continue with the live fetch.
      }

      void fetchItems({ quiet: true });
    };

    void hydrateFromCache();

    return () => {
      cancelled = true;
    };
  }, [permissionsLoading, canViewItems]);

  useEffect(() => {
    const itemFromState = (location.state as any)?.selectedItemId;
    const requestedView = (location.state as any)?.initialView;
    const pathParts = location.pathname.split("/").filter(Boolean);
    const itemIdFromPath = pathParts[0] === "items" && pathParts[1] ? pathParts[1] : null;

    if (itemFromState) {
      setSelectedId(String(itemFromState));
      setView(requestedView === "edit" ? "edit" : "detail");
      window.scrollTo(0, 0);
      return;
    }

    if (itemIdFromPath) {
      setSelectedId(String(itemIdFromPath));
      setView("detail");
      window.scrollTo(0, 0);
      return;
    }

    if (location.pathname === "/items") {
      setView("list");
      setSelectedId(null);
      setClonedItem(null);
    }
  }, [location.pathname, location.state]);

  const selectedItem = useMemo(
    () => items.find((x: Item) => x.id === selectedId || x._id === selectedId) || null,
    [items, selectedId]
  );

  const handleCreateItem = async (data: any, tagIds: string[] = []) => {
    if (!canCreateItems) {
      toast.error("You do not have permission to create items.");
      return;
    }
    try {
      const response = await itemsAPI.create(data);
      const newItem = response.data || response;
      const itemId = newItem._id || newItem.id;
      const normalizedNewItem = {
        ...newItem,
        images: Array.isArray(newItem.images) ? newItem.images : (newItem.image ? [newItem.image] : []),
        id: newItem.id || newItem._id || itemId,
        active: newItem.active !== undefined ? newItem.active : newItem.isActive,
      };

      if (tagIds && tagIds.length > 0 && itemId) {
        void tagAssignmentsAPI.assignTags({
          entityType: "Item",
          entityId: itemId,
          tagIds: tagIds,
        }).catch((tagError) => {
          console.error("Failed to assign tags:", tagError);
        });
      }

      setItems(prev => [normalizedNewItem, ...prev]);
      setView("list");
      setClonedItem(null);
      toast.success("Item created successfully");
      void fetchItems();
    } catch (error: any) {
      console.error("Failed to create item:", error);
      toast.error("Failed to create item: " + (error.message || "Unknown error"));
    }
  };

  const handleUpdateItem = async (data: any) => {
    if (!canEditItems) {
      toast.error("You do not have permission to edit items.");
      return;
    }
    if (!selectedId) return;
    try {
      await itemsAPI.update(selectedId, data);
      await fetchItems();
      setView("detail");
      toast.success("Item updated successfully");
    } catch (error: any) {
      console.error("Failed to update item:", error);
      toast.error("Failed to update item: " + (error.message || "Unknown error"));
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!canDeleteItems) {
      toast.error("You do not have permission to delete items.");
      return;
    }
    const item = items.find(i => i.id === id || i._id === id);
    setDeleteConfirmModal({ open: true, itemId: id, itemName: item?.name || "this item", count: 1, itemIds: null });
  };

  const confirmDeleteItem = async () => {
    if (!canDeleteItems) {
      toast.error("You do not have permission to delete items.");
      return;
    }
    if (!deleteConfirmModal.itemId) return;
    try {
      await itemsAPI.delete(deleteConfirmModal.itemId);
      await fetchItems();
      if (selectedId === deleteConfirmModal.itemId) {
        setSelectedId(null);
        setView("list");
      }
      toast.success("Item deleted successfully");
      setDeleteConfirmModal({ open: false, itemId: null, itemName: null, count: 1, itemIds: null });
    } catch (error: any) {
      toast.error("Failed to delete item");
    }
  };

  const confirmBulkDelete = async () => {
    if (!canDeleteItems) {
      toast.error("You do not have permission to delete items.");
      return;
    }
    if (!deleteConfirmModal.itemIds || deleteConfirmModal.itemIds.length === 0) return;
    try {
      await Promise.all(deleteConfirmModal.itemIds.map(id => itemsAPI.delete(id)));
      await fetchItems();
      toast.success(`${deleteConfirmModal.itemIds.length} item(s) deleted successfully`);
      setDeleteConfirmModal({ open: false, itemId: null, itemName: null, count: 1, itemIds: null });
    } catch (error: any) {
      toast.error("Bulk delete failed");
    }
  };

  const handleBulkMarkActive = async (ids: string[]) => {
    if (!canEditItems) {
      toast.error("You do not have permission to edit items.");
      return;
    }
    try {
      await Promise.all(ids.map(id => itemsAPI.update(id, { active: true, isActive: true, status: "Active" })));
      await fetchItems();
      toast.success(`${ids.length} item(s) marked as active`);
    } catch (e) { toast.error("Bulk action failed"); }
  };

  const handleBulkMarkInactive = async (ids: string[]) => {
    if (!canEditItems) {
      toast.error("You do not have permission to edit items.");
      return;
    }
    try {
      await Promise.all(ids.map(id => itemsAPI.update(id, { active: false, isActive: false, status: "Inactive" })));
      await fetchItems();
      toast.success(`${ids.length} item(s) marked as inactive`);
    } catch (e) { toast.error("Bulk action failed"); }
  };

  const handleBulkUpdate = async (field: string, value: any) => {
    if (!canEditItems) {
      toast.error("You do not have permission to edit items.");
      return;
    }
    try {
      setLoading(true);
      await Promise.all(bulkUpdateModal.itemIds.map(id => itemsAPI.update(id, { [field]: value })));
      await fetchItems();
      toast.success(`${bulkUpdateModal.itemIds.length} item(s) updated successfully`);
      setBulkUpdateModal({ open: false, itemIds: [] });
    } catch (e) {
      toast.error("Bulk update failed");
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedId(null);
    setClonedItem(null);
  };

  const handleCloneItem = (data: any) => {
    if (!canCreateItems) {
      toast.error("You do not have permission to create items.");
      return;
    }
    setClonedItem(data);
    setView("new");
    setSelectedId(null);
  };

  if (permissionsLoading) {
    return (
      <div className="w-full p-8 text-center text-gray-500">Loading permissions...</div>
    );
  }

  if (!canViewItems) {
    return (
      <div className="w-full p-8">
        <div className="max-w-xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          You do not have permission to view Items.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {view === "detail" && selectedItem ? (
        <div className="flex flex-col md:flex-row gap-0" style={{ minHeight: "calc(100vh - 56px)" }}>
          <div className="hidden md:flex w-full md:w-1/5 border-r border-gray-200 bg-white flex-col z-20">
            <ItemSidebar
              items={items}
              selectedId={selectedId}
              onSelect={(id: string) => { setSelectedId(id); setView("detail"); window.scrollTo(0, 0); }}
              onFilterChange={(viewName: string) => {
                if (viewName === "All") return;
                const selected = items.find((x: Item) => x.id === selectedId || x._id === selectedId);
                if (!selected) return;

                const isInactive = selected.active === false || selected.isActive === false || selected.status === "Inactive";
                const shouldHideDetail =
                  (viewName === "Active Items" && isInactive) ||
                  (viewName === "Inactive Items" && !isInactive);

                if (shouldHideDetail) {
                  setSelectedId(null);
                  setView("list");
                }
              }}
              onNew={() => { if (canCreateItems) { setView("new"); setSelectedId(null); } }}
              baseCurrency={baseCurrency}
              onBulkMarkActive={handleBulkMarkActive}
              onBulkMarkInactive={handleBulkMarkInactive}
              onBulkDelete={async (ids: string[]) => setDeleteConfirmModal({ open: true, itemId: null, itemName: null, count: ids.length, itemIds: ids })}
              onBulkUpdate={(ids: string[]) => setBulkUpdateModal({ open: true, itemIds: ids })}
              canCreate={canCreateItems}
              canEdit={canEditItems}
              canDelete={canDeleteItems}
            />
          </div>
          <div className="flex-1 bg-white overflow-auto w-full">
            <ItemDetails
              item={selectedItem as Item}
              onBack={handleBackToList}
              onEdit={() => { if (canEditItems) setView("edit"); }}
              onUpdate={handleUpdateItem}
              items={items}
              setItems={setItems}
              onDelete={handleDeleteItem}
              setSelectedId={setSelectedId}
              setView={setView}
              onClone={handleCloneItem}
              baseCurrency={baseCurrency}
              canCreate={canCreateItems}
              canEdit={canEditItems}
              canDelete={canDeleteItems}
            />
          </div>
        </div>
      ) : (
        <div className="w-full">
          {view === "list" && (
            <ItemsList
              items={items}
              initialSearchTerm={searchQuery}
              onSelect={(id: string) => { setSelectedId(id); setView("detail"); window.scrollTo(0, 0); }}
              onNew={() => { if (canCreateItems) { setView("new"); setSelectedId(null); } }}
              onDelete={handleDeleteItem}
              onBulkDelete={async (ids: string[]) => setDeleteConfirmModal({ open: true, itemId: null, itemName: null, count: ids.length, itemIds: ids })}
              onBulkUpdate={(ids: string[]) => setBulkUpdateModal({ open: true, itemIds: ids })}
              onBulkMarkActive={handleBulkMarkActive}
              onBulkMarkInactive={handleBulkMarkInactive}
              onRefresh={fetchItems}
              baseCurrency={baseCurrency}
              isLoading={loading || isPending}
              canCreate={canCreateItems}
              canEdit={canEditItems}
              canDelete={canDeleteItems}
            />
          )}

          {view === "new" && canCreateItems && (
            <NewItemForm
              onCancel={handleBackToList}
              onCreate={handleCreateItem}
              baseCurrency={baseCurrency}
              initialData={clonedItem}
            />
          )}

          {view === "edit" && selectedItem && canEditItems && (
            <EditItemForm
              item={selectedItem}
              onCancel={() => setView("detail")}
              onUpdate={handleUpdateItem}
              baseCurrency={baseCurrency}
            />
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Item{deleteConfirmModal.count > 1 ? 's' : ''}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete {deleteConfirmModal.count > 1
                ? `${deleteConfirmModal.count} item(s)?`
                : `"${deleteConfirmModal.itemName}"?`}
              <br />
              <span className="text-red-600 font-medium">This action cannot be undone.</span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmModal({ open: false, itemId: null, itemName: null, count: 1, itemIds: null })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirmModal.itemIds ? confirmBulkDelete() : confirmDeleteItem()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {bulkUpdateModal.open && (
        <BulkUpdateModal
          selectedCount={bulkUpdateModal.itemIds.length}
          onClose={() => setBulkUpdateModal({ open: false, itemIds: [] })}
          onUpdate={handleBulkUpdate}
        />
      )}
    </div>
  );
}

export default function ItemsPage() {
  return <ItemsPageContent />;
}
