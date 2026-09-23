---
name: offline-crud-module
description: Guide for creating offline-first CRUD modules (repository, react-query hooks, and UI) with sync engine integration, based on the Category module pattern.
---
# Offline-First CRUD Module Implementation

This skill describes the exact flow and requirements for creating a new offline-first CRUD module (e.g., SubCategory, Brand, Unit) matching the Category module pattern. Follow these layers precisely when generating or modifying CRUD modules.

## 1. Repository Layer (src/core/repositories/<Module>Repository.ts)

- **Extend BaseRepository<ModelType>**.
- **insert / update / delete Overrides**:
  - Perform local SQLite changes via super.
  - Set syncStatus to pending_insert or pending_update (unless shouldSync is false).
  - Queue operations into outboxRepo and 	ombstoneRepo when shouldSync = true.
  - Trigger 	his.requestSync() (which calls syncEngine.syncNow()) to wake up background sync.
- **syncWithApi(entity, operation)**:
  - Build API payload: remove internal fields (like syncStatus), map id if needed.
  - Perform API call based on operation (insert/update/delete).
  - **Crucial**: On insert, if the API returns a server ID, update the local SQLite row to replace the temporary local ID with the server ID, and mark syncStatus = 'synced'.
  - Mark syncStatus = 'synced' on successful update.
- **syncOutboxItem(item: OutboxItem)**:
  - Read payload, check 	ombstoneRepo for deleted records to avoid syncing stale updates.
  - Forward to syncWithApi based on item.operation.
- **etchFromApi()**:
  - Call GET endpoint. Find the data array in the API response payload dynamically (e.g., checking .data, .items).
  - Normalize data to local schema. Map API ID fields (categoryId, _id, etc.) to the local id and ackendId.
  - Insert or update local records and set their syncStatus = 'synced'.
  - Purge any local synced records that are no longer present in the API response.
- **Export**: export const moduleRepository = new ModuleRepository();

## 2. API Hooks Layer (src/features/<module>/api/use<Module>.ts)

- **Query (use<Module>s)**:
  - queryFn: Read all local records via repository (epository.getAll()).
  - If any record has offline changes (syncStatus !== 'synced'), trigger a background epository.fetchFromApi(), then use queryClient.setQueryData to push fresh data to the cache.
  - Return local offline data immediately.
- **Mutations (useAdd<Module>, useUpdate<Module>, useDelete<Module>)**:
  - **Insert**: Generate temporary ID (Math.random().toString(36).substring(7)). Call epository.insert with syncStatus: 'pending_insert'.
  - **Update/Delete**: Call repository methods.
  - **onSuccess**: Optimistically update queryClient using setQueryData (e.g., append new item, update existing item, filter out deleted) and call queryClient.invalidateQueries.

## 3. UI Layer (src/features/<module>/screens/<Module>ListScreen.tsx)

- **State & Hooks**: Use Tanstack hooks, search state, and modal visibility state.
- **AdvancedTable**: 
  - Pass the offline-first data array.
  - Render a "Status" column displaying Online (green) if syncStatus === 'synced', else Offline (yellow).
- **Manual Sync Button**: Provide a header action to trigger sync manually:
  `	ypescript
  import('../../../core/sync/SyncEngine').then(m => m.syncEngine.syncNow().then(() => refetch()));
  `
- **Modals**: Form for add/edit, confirm alerts for delete. Handle validation before firing mutations.

## 4. Module Export (src/features/<module>/<Module>Module.tsx)

- Wrap the screen component inside a simple View and export it.
