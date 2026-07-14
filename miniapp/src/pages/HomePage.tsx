import { PullToRefresh, Swiper } from "antd-mobile";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { SearchBarLink } from "@/components/SearchBarLink";
import { ProductRow } from "@/components/ProductRow";
import { useBanners, useCategoriesTree, useProducts } from "@/hooks/useCatalog";
import { usePublicStoreSettings } from "@/hooks/useSettings";
import { hasDiscount } from "@/lib/format";
import type { CategoryTreeNode } from "@/types/entities";

function collectFeaturedCategories(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  const result: CategoryTreeNode[] = [];
  for (const node of nodes) {
    if (node.is_featured) result.push(node);
    result.push(...collectFeaturedCategories(node.children));
  }
  return result.sort((a, b) => a.sort_order - b.sort_order).slice(0, 3);
}

function flattenCategories(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  const result: CategoryTreeNode[] = [];
  for (const node of nodes) {
    result.push(node);
    result.push(...flattenCategories(node.children));
  }
  return result;
}

export default function HomePage() {
  const { t } = useTranslation("home");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: settings } = usePublicStoreSettings();
  const { data: banners } = useBanners();
  const { data: categoriesTree } = useCategoriesTree();
  const { data: featured } = useProducts({ is_featured: true, page_size: 10 });
  const { data: newArrivals } = useProducts({
    sort_by: "created_at",
    sort_order: "desc",
    page_size: 10,
  });
  const { data: saleCandidates } = useProducts({ page_size: 30 });

  const onSaleProducts = (saleCandidates?.items ?? []).filter((p) =>
    hasDiscount(p.price, p.compare_at_price),
  );
  const topCategories = collectFeaturedCategories(categoriesTree ?? []);
  const allCategories = flattenCategories(categoriesTree ?? []);

  async function handleRefresh() {
    await queryClient.invalidateQueries();
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="scroll-page" style={{ paddingTop: 12, paddingBottom: 12 }}>
        <div style={{ padding: "0 12px 12px" }}>
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.store_name}
              style={{ height: 44, maxWidth: "100%", objectFit: "contain", margin: "0 0 12px" }}
            />
          ) : (
            <h2 style={{ margin: "0 0 10px", fontSize: 20 }}>{settings?.store_name ?? "ToiletMan"}</h2>
          )}
          <SearchBarLink placeholder={t("search.placeholder")} />
        </div>

        {banners && banners.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <Swiper
              autoplay
              loop
              slideSize={banners.length > 1 ? 88 : 100}
              trackOffset={banners.length > 1 ? 6 : 0}
              indicatorProps={{ style: { "--dot-color": "rgba(255,255,255,0.5)" } }}
            >
              {banners.map((banner) => (
                <Swiper.Item key={banner.id}>
                  <div
                    role={banner.link_url ? "button" : undefined}
                    onClick={() => {
                      if (banner.link_url) navigate(banner.link_url);
                    }}
                    style={{
                      margin: banners.length > 1 ? "0 4px" : "0 12px",
                      borderRadius: 14,
                      overflow: "hidden",
                      aspectRatio: "16 / 7",
                      background: "var(--adm-color-fill)",
                    }}
                  >
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                </Swiper.Item>
              ))}
            </Swiper>
          </div>
        )}

        {topCategories.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <div style={{ padding: "0 12px", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{t("topCategories.title")}</h3>
            </div>
            <Swiper
              slideSize={topCategories.length > 1 ? 82 : 100}
              trackOffset={topCategories.length > 1 ? 6 : 0}
              indicatorProps={{ style: { "--dot-color": "rgba(255,255,255,0.5)" } }}
            >
              {topCategories.map((category) => (
                <Swiper.Item key={category.id}>
                  <div
                    role="button"
                    onClick={() => navigate(`/catalog/${category.id}`)}
                    style={{
                      margin: topCategories.length > 1 ? "0 4px" : "0 12px",
                      position: "relative",
                      borderRadius: 16,
                      overflow: "hidden",
                      aspectRatio: "16 / 9",
                      background: category.image_url
                        ? `var(--adm-color-fill)`
                        : "linear-gradient(135deg, var(--adm-color-primary), var(--adm-color-wathet))",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    }}
                  >
                    {category.image_url && (
                      <img
                        src={category.image_url}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0) 55%)",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: 14,
                        right: 14,
                        bottom: 12,
                        color: "#fff",
                        fontSize: 17,
                        fontWeight: 700,
                        textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                      }}
                    >
                      {category.name}
                    </span>
                  </div>
                </Swiper.Item>
              ))}
            </Swiper>
          </section>
        )}

        {categoriesTree && categoriesTree.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                padding: "0 12px",
              }}
            >
              {categoriesTree.map((category) => (
                <div
                  key={category.id}
                  role="button"
                  onClick={() => navigate(`/catalog/${category.id}`)}
                  style={{
                    flex: "0 0 auto",
                    padding: "8px 16px",
                    borderRadius: 20,
                    background: "var(--adm-color-box)",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                >
                  {category.name}
                </div>
              ))}
            </div>
          </section>
        )}

        <ProductRow
          title={t("featured.title")}
          products={featured?.items ?? []}
          seeAllLabel={t("seeAll")}
          onSeeAll={() => navigate("/catalog?is_featured=1")}
        />

        <ProductRow
          title={t("sale.title")}
          products={onSaleProducts}
          seeAllLabel={onSaleProducts.length > 0 ? t("seeAll") : undefined}
          onSeeAll={() => navigate("/catalog")}
        />

        <ProductRow
          title={t("newArrivals.title")}
          products={newArrivals?.items ?? []}
          seeAllLabel={t("seeAll")}
          onSeeAll={() => navigate("/catalog?sort_by=created_at&sort_order=desc")}
        />

        {allCategories.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <div style={{ padding: "0 12px", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{t("categories.title")}</h3>
            </div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "0 12px" }}>
              {allCategories.map((category) => (
                <div
                  key={category.id}
                  role="button"
                  onClick={() => navigate(`/catalog/${category.id}`)}
                  style={{
                    flex: "0 0 120px",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "var(--adm-color-box)",
                  }}
                >
                  <div
                    style={{
                      aspectRatio: "1 / 1",
                      background: "var(--adm-color-fill)",
                      backgroundImage: category.image_url ? `url(${category.image_url})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <div style={{ padding: 8, fontSize: 12, textAlign: "center" }}>{category.name}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </PullToRefresh>
  );
}
