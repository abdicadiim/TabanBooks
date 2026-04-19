# Advanced SWR Sync Flow

```mermaid
sequenceDiagram
  autonumber
  participant UI as React Component
  participant Hook as useSyncEngine / SyncEngine
  participant LS as LocalStorage
  participant IDB as IndexedDB
  participant API as Express Sync API
  participant BIN as Binary Download Endpoint

  UI->>Hook: mount()
  Hook->>LS: read cached payload
  LS-->>Hook: versioned snapshot
  Hook-->>UI: render immediately

  Hook->>Hook: debounce revalidate()
  Hook->>API: GET /documents/sync
  Note over Hook,API: Sends If-Modified-Since and last_updated
  API-->>Hook: 304 Not Modified
  Hook-->>UI: keep cached state

  API-->>Hook: 200 OK + payload + manifest
  Hook->>Hook: deep compare payloads
  Hook->>IDB: atomic cache write
  Hook-->>UI: reactive state update

  Hook->>IDB: compare local binary manifest
  Hook->>BIN: download only missing/changed hashes
  BIN-->>IDB: store binary blob + metadata

  Hook->>Hook: if offline or token invalid, skip sync
  Hook-->>UI: serve cached data + Pending Sync flag
```

## Flow Notes

1. Small datasets can live in `LocalStorage` with encrypted storage for sensitive payloads.
2. Larger file metadata and binary records are kept in `IndexedDB`.
3. Every cached payload, manifest entry, and pending operation carries `version_id` and `last_updated`.
4. The backend returns `304` when the client version is fresh enough, which avoids unnecessary payload transfer.
5. Binary assets are re-downloaded only when the server hash changes or the local cache is missing.

