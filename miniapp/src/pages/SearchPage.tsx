import { SearchBar, Tag } from "antd-mobile";
import { ClockCircleOutline, CloseOutline } from "antd-mobile-icons";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ProductGrid } from "@/components/ProductRow";
import { EmptyState } from "@/components/EmptyState";
import { useCategoriesTree, useProducts } from "@/hooks/useCatalog";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { addSearchHistoryEntry, clearSearchHistory, getSearchHistory } from "@/lib/searchHistory";

export default function SearchPage() {
  const { t } = useTranslation("catalog");
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState(getSearchHistory);
  const debouncedQuery = useDebouncedValue(query, 300);
  const { data: categoriesTree } = useCategoriesTree();

  const { data, isFetching } = useProducts({
    search: debouncedQuery || undefined,
    page_size: 30,
  });

  const popularSuggestions = useMemo(
    () => (categoriesTree ?? []).slice(0, 8).map((c) => c.name),
    [categoriesTree],
  );

  function commitSearch(value: string) {
    if (!value.trim()) return;
    addSearchHistoryEntry(value);
    setHistory(getSearchHistory());
  }

  function selectSuggestion(value: string) {
    setQuery(value);
    commitSearch(value);
  }

  return (
    <div className="scroll-page">
      <div style={{ padding: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <SearchBar
            autoFocus
            value={query}
            placeholder={t("search.placeholder")}
            onChange={setQuery}
            onSearch={commitSearch}
            showCancelButton
            onCancel={() => navigate(-1)}
          />
        </div>
      </div>

      {!debouncedQuery && (
        <div style={{ padding: "0 12px" }}>
          {history.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <h4 style={{ margin: 0 }}>{t("search.recent")}</h4>
                <span
                  role="button"
                  onClick={() => {
                    clearSearchHistory();
                    setHistory([]);
                  }}
                  style={{ fontSize: 12, color: "var(--adm-color-weak)", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <CloseOutline /> {t("search.clearHistory")}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {history.map((entry) => (
                  <Tag key={entry} onClick={() => selectSuggestion(entry)} style={{ padding: "6px 10px" }}>
                    <ClockCircleOutline style={{ marginRight: 4 }} />
                    {entry}
                  </Tag>
                ))}
              </div>
            </section>
          )}

          {popularSuggestions.length > 0 && (
            <section>
              <h4 style={{ margin: "0 0 8px" }}>{t("search.popular")}</h4>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {popularSuggestions.map((entry) => (
                  <Tag key={entry} color="primary" onClick={() => selectSuggestion(entry)} style={{ padding: "6px 10px" }}>
                    {entry}
                  </Tag>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {debouncedQuery && (
        <div style={{ marginTop: 12 }}>
          {!isFetching && data?.items.length === 0 ? (
            <EmptyState title={t("search.noResults", { query: debouncedQuery })} />
          ) : (
            <ProductGrid products={data?.items ?? []} />
          )}
        </div>
      )}
    </div>
  );
}
