import { ActionSheet, InfiniteScroll, PullToRefresh, Popup, Button, Slider } from "antd-mobile";
import { FilterOutline } from "antd-mobile-icons";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";

import { CartHeaderLink } from "@/components/CartHeaderLink";
import { PageHeader } from "@/components/PageHeader";
import { ProductGrid } from "@/components/ProductRow";
import { EmptyState } from "@/components/EmptyState";
import { useCategoriesTree, useInfiniteProducts, useProductFilters } from "@/hooks/useCatalog";
import type { CategoryTreeNode } from "@/types/entities";

type SortValue = "newest" | "priceAsc" | "priceDesc" | "nameAsc" | "featured";

const SORT_TO_PARAMS: Record<SortValue, { sort_by?: string; sort_order?: "asc" | "desc" }> = {
  newest: { sort_by: "created_at", sort_order: "desc" },
  priceAsc: { sort_by: "price", sort_order: "asc" },
  priceDesc: { sort_by: "price", sort_order: "desc" },
  nameAsc: { sort_by: "name", sort_order: "asc" },
  featured: { sort_by: "is_featured", sort_order: "desc" },
};

function findCategory(nodes: CategoryTreeNode[], id: string): CategoryTreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findCategory(node.children, id);
    if (found) return found;
  }
  return undefined;
}

export default function CatalogPage() {
  const { t } = useTranslation("catalog");
  const { categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const { data: categoriesTree } = useCategoriesTree();

  const [sort, setSort] = useState<SortValue>(() => {
    if (searchParams.get("sort_by") === "created_at") return "newest";
    if (searchParams.get("is_featured")) return "featured";
    return "newest";
  });
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [filterPopupVisible, setFilterPopupVisible] = useState(false);
  const [manufacturerId, setManufacturerId] = useState<string | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);

  const collectionId = searchParams.get("collection_id") ?? undefined;
  const isFeaturedParam = searchParams.get("is_featured") === "1" ? true : undefined;

  const { data: filters } = useProductFilters({ category_id: categoryId });

  const queryParams = useMemo(
    () => ({
      category_id: categoryId,
      collection_id: collectionId,
      manufacturer_id: manufacturerId,
      is_featured: isFeaturedParam,
      ...SORT_TO_PARAMS[sort],
    }),
    [categoryId, collectionId, manufacturerId, isFeaturedParam, sort],
  );

  const { data, fetchNextPage, hasNextPage, isLoading, refetch } = useInfiniteProducts(queryParams);
  const products = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.meta.total_items ?? 0;

  const category = categoryId && categoriesTree ? findCategory(categoriesTree, categoryId) : undefined;

  const sortLabel: Record<SortValue, string> = {
    newest: t("sort.newest"),
    priceAsc: t("sort.priceAsc"),
    priceDesc: t("sort.priceDesc"),
    nameAsc: t("sort.nameAsc"),
    featured: t("sort.featured"),
  };

  return (
    <div className="scroll-page">
      {category ? (
        <PageHeader title={category.name} right={<CartHeaderLink />} />
      ) : (
        <div style={{ padding: "12px 12px 0" }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{t("title")}</h2>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: 12,
          alignItems: "center",
        }}
      >
        <Button size="small" fill="outline" onClick={() => setSortSheetVisible(true)} data-testid="sort-trigger">
          {sortLabel[sort]}
        </Button>
        <Button
          size="small"
          fill="outline"
          onClick={() => setFilterPopupVisible(true)}
          data-testid="filter-trigger"
        >
          <FilterOutline /> {t("filters.title")}
        </Button>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--adm-color-weak)" }}>
          {t("resultsCount", { count: total })}
        </span>
      </div>

      <PullToRefresh onRefresh={async () => void (await refetch())}>
        {products.length === 0 && !isLoading ? (
          <EmptyState title={t("empty")} />
        ) : (
          <>
            <ProductGrid products={products} />
            <InfiniteScroll loadMore={async () => void (await fetchNextPage())} hasMore={Boolean(hasNextPage)} />
          </>
        )}
      </PullToRefresh>

      <ActionSheet
        visible={sortSheetVisible}
        onClose={() => setSortSheetVisible(false)}
        actions={(Object.keys(sortLabel) as SortValue[]).map((value) => ({
          key: value,
          text: sortLabel[value],
          onClick: () => {
            setSort(value);
            setSortSheetVisible(false);
          },
        }))}
      />

      <Popup
        visible={filterPopupVisible}
        onMaskClick={() => setFilterPopupVisible(false)}
        bodyStyle={{ padding: 16, minHeight: "40vh" }}
      >
        <h3 style={{ marginTop: 0 }}>{t("filters.title")}</h3>

        {filters && (filters.price_min || filters.price_max) && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: "var(--adm-color-weak)" }}>
              {t("filters.price")}
            </div>
            <Slider
              range
              min={Number(filters.price_min ?? 0)}
              max={Number(filters.price_max ?? 0) || 100}
              value={priceRange ?? [Number(filters.price_min ?? 0), Number(filters.price_max ?? 0)]}
              onChange={(val) => setPriceRange(val as [number, number])}
            />
          </div>
        )}

        {filters && filters.manufacturers.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: "var(--adm-color-weak)" }}>
              {t("filters.manufacturer")}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {filters.manufacturers.map((m) => (
                <Button
                  key={m.id}
                  size="small"
                  color={manufacturerId === m.id ? "primary" : "default"}
                  fill={manufacturerId === m.id ? "solid" : "outline"}
                  onClick={() => setManufacturerId(manufacturerId === m.id ? undefined : m.id)}
                >
                  {m.name} ({m.count})
                </Button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <Button
            block
            fill="outline"
            onClick={() => {
              setManufacturerId(undefined);
              setPriceRange(null);
            }}
          >
            {t("filters.reset")}
          </Button>
          <Button block color="primary" onClick={() => setFilterPopupVisible(false)}>
            {t("filters.apply")}
          </Button>
        </div>
      </Popup>
    </div>
  );
}
