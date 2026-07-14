import { useCallback, useMemo, useState } from "react";

export interface SavedFilterPreset {
  name: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  pageSize?: number;
}

interface TableLayout {
  hiddenColumns: string[];
  columnOrder: string[];
}

interface StoredTablePrefs {
  layout?: TableLayout;
  presets?: SavedFilterPreset[];
}

function readStorage(key: string): StoredTablePrefs {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredTablePrefs) : {};
  } catch {
    return {};
  }
}

function writeStorage(key: string, value: StoredTablePrefs): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is a convenience (private browsing / quota exhaustion
    // shouldn't break the page) — silently skip the write.
  }
}

/**
 * Per-resource, per-browser persistence for two CrudPage conveniences:
 * a sticky column layout (visibility + order, saved automatically) and
 * named filter presets (search/sort/pageSize, saved on request).
 */
export function useTablePreferences(resourceKey: string) {
  const storageKey = `tipobot_admin_table:${resourceKey}`;
  const [prefs, setPrefs] = useState<StoredTablePrefs>(() => readStorage(storageKey));

  const hiddenColumns = useMemo(() => new Set(prefs.layout?.hiddenColumns ?? []), [prefs.layout]);
  const columnOrder = prefs.layout?.columnOrder;
  const presets = useMemo(() => prefs.presets ?? [], [prefs.presets]);

  const persist = useCallback(
    (next: StoredTablePrefs) => {
      setPrefs(next);
      writeStorage(storageKey, next);
    },
    [storageKey],
  );

  const setLayout = useCallback(
    (layout: TableLayout) => persist({ ...prefs, layout }),
    [persist, prefs],
  );

  const resetLayout = useCallback(() => persist({ ...prefs, layout: undefined }), [persist, prefs]);

  const savePreset = useCallback(
    (preset: SavedFilterPreset) => {
      const next = [...presets.filter((p) => p.name !== preset.name), preset];
      persist({ ...prefs, presets: next });
    },
    [persist, prefs, presets],
  );

  const removePreset = useCallback(
    (name: string) => persist({ ...prefs, presets: presets.filter((p) => p.name !== name) }),
    [persist, prefs, presets],
  );

  return { hiddenColumns, columnOrder, presets, setLayout, resetLayout, savePreset, removePreset };
}
