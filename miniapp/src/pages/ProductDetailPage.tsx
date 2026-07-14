import { Button, ImageViewer, SpinLoading, Stepper, Swiper, Tabs, Toast } from "antd-mobile";
import { HeartFill, HeartOutline, SendOutline } from "antd-mobile-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { CartHeaderLink } from "@/components/CartHeaderLink";
import { PageHeader } from "@/components/PageHeader";
import { PriceTag } from "@/components/PriceTag";
import { ProductRow } from "@/components/ProductRow";
import { EmptyState } from "@/components/EmptyState";
import { useProductDetail } from "@/hooks/useCatalog";
import { useIsFavorite, useToggleFavorite } from "@/hooks/useFavorites";
import { useAddToCartAction } from "@/hooks/useProductActions";
import { useHaptics } from "@/telegram/hooks";

export default function ProductDetailPage() {
  const { t } = useTranslation("product");
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useProductDetail(id);
  const isFavorite = useIsFavorite(id);
  const toggleFavorite = useToggleFavorite();
  const { addToCart } = useAddToCartAction();
  const haptics = useHaptics();
  const [quantity, setQuantity] = useState(1);

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <SpinLoading />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="scroll-page">
        <PageHeader title="" />
        <EmptyState title={t("notFound")} actionLabel={t("goBack")} onAction={() => navigate("/catalog")} />
      </div>
    );
  }

  const { product, images, documents, videos, attributes, labels, recommendations } = data;
  const recommendationGroups: { key: keyof typeof recommendations; titleKey: string }[] = [
    { key: "frequently_bought_together", titleKey: "frequentlyBoughtTogether" },
    { key: "accessories", titleKey: "accessories" },
    { key: "related", titleKey: "related" },
    { key: "same_collection", titleKey: "sameCollection" },
    { key: "similar", titleKey: "similar" },
  ];
  const outOfStock = product.availability_status === "out_of_stock";
  const galleryUrls = images.map((image) => image.url);

  function openZoom(index: number) {
    if (galleryUrls.length === 0) return;
    ImageViewer.Multi.show({ images: galleryUrls, defaultIndex: index });
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
      } catch {
        // user cancelled — no-op
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      Toast.show({ content: t("common:actions.share") });
    }
  }

  return (
    <div className="scroll-page" style={{ paddingBottom: 88 }}>
      <PageHeader
        title=""
        right={
          <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 20 }}>
            <span role="button" onClick={handleShare}>
              <SendOutline />
            </span>
            <span
              role="button"
              onClick={() => {
                haptics.selection();
                toggleFavorite.mutate(product.id);
              }}
              style={{ color: isFavorite ? "var(--adm-color-danger)" : "inherit" }}
            >
              {isFavorite ? <HeartFill /> : <HeartOutline />}
            </span>
            <CartHeaderLink />
          </div>
        }
      />

      {galleryUrls.length > 0 ? (
        <Swiper indicatorProps={{ style: { "--dot-color": "rgba(0,0,0,0.2)" } }}>
          {galleryUrls.map((url, index) => (
            <Swiper.Item key={url}>
              <div
                role="button"
                onClick={() => openZoom(index)}
                style={{ aspectRatio: "1 / 1", background: "var(--adm-color-fill)" }}
              >
                <img src={url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            </Swiper.Item>
          ))}
        </Swiper>
      ) : (
        <div style={{ aspectRatio: "1 / 1", background: "var(--adm-color-fill)" }} />
      )}

      <div style={{ padding: 16 }}>
        {labels.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {labels.map((label) => (
              <span
                key={label.id}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 6,
                  color: "#fff",
                  background: label.badge_color ?? "var(--adm-color-primary)",
                }}
              >
                {label.code}
              </span>
            ))}
          </div>
        )}

        <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>{product.name}</h2>
        <div style={{ fontSize: 12, color: "var(--adm-color-weak)", marginBottom: 8 }}>
          {t("sku")}: {product.sku}
        </div>
        <PriceTag
          price={product.price}
          compareAtPrice={product.compare_at_price}
          currency={product.currency}
          size="large"
          showApprox
        />

        <div style={{ marginTop: 8, fontSize: 13 }}>
          {outOfStock ? (
            <span style={{ color: "var(--adm-color-danger)" }}>{t("outOfStock")}</span>
          ) : (
            <span style={{ color: "var(--adm-color-success)" }}>
              {product.availability_status === "low_stock" ? t("common:stock.lowStock") : t("common:stock.inStock")}
            </span>
          )}
        </div>

        {product.description && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 15 }}>{t("description")}</h3>
            <p style={{ fontSize: 14, color: "var(--adm-color-weak)", whiteSpace: "pre-line" }}>
              {product.description}
            </p>
          </div>
        )}

        {(attributes.length > 0 || documents.length > 0 || videos.length > 0) && (
          <Tabs style={{ marginTop: 16 }}>
            {attributes.length > 0 && (
              <Tabs.Tab title={t("specifications")} key="specs">
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <tbody>
                    {attributes.map((attr) => (
                      <tr key={attr.attribute_definition_id} style={{ borderBottom: "1px solid var(--adm-color-border)" }}>
                        <td style={{ padding: "8px 0", color: "var(--adm-color-weak)" }}>{attr.name}</td>
                        <td style={{ padding: "8px 0", textAlign: "right" }}>
                          {attr.reference_value?.code ??
                            attr.value_string ??
                            attr.value_number ??
                            (attr.value_boolean !== null ? String(attr.value_boolean) : "") ??
                            attr.value_date ??
                            "—"}
                          {attr.unit_symbol ? ` ${attr.unit_symbol}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Tabs.Tab>
            )}
            {documents.length > 0 && (
              <Tabs.Tab title={t("documents")} key="documents">
                {documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "block",
                      padding: "10px 0",
                      borderBottom: "1px solid var(--adm-color-border)",
                      color: "var(--adm-color-primary)",
                      fontSize: 14,
                    }}
                  >
                    {doc.title}
                  </a>
                ))}
              </Tabs.Tab>
            )}
            {videos.length > 0 && (
              <Tabs.Tab title={t("videos")} key="videos">
                {videos.map((video) => (
                  <div key={video.id} style={{ marginBottom: 12 }}>
                    {video.video_type === "youtube" ? (
                      <div style={{ aspectRatio: "16 / 9" }}>
                        <iframe
                          src={video.url}
                          title={video.title ?? product.name}
                          style={{ width: "100%", height: "100%", border: 0, borderRadius: 8 }}
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <video src={video.url} controls style={{ width: "100%", borderRadius: 8 }} />
                    )}
                  </div>
                ))}
              </Tabs.Tab>
            )}
          </Tabs>
        )}

        {recommendationGroups.map(
          ({ key, titleKey }) =>
            recommendations[key].length > 0 && (
              <div key={key} style={{ margin: "20px -16px 0" }}>
                <ProductRow title={t(titleKey)} products={recommendations[key]} />
              </div>
            ),
        )}
      </div>

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "10px 16px calc(10px + var(--safe-bottom))",
          background: "var(--adm-color-background)",
          borderTop: "1px solid var(--adm-color-border)",
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        {!outOfStock && (
          <Stepper min={1} max={product.available_quantity} value={quantity} onChange={(v) => setQuantity(v)} />
        )}
        <Button
          block
          color="primary"
          disabled={outOfStock}
          onClick={() => addToCart(product.id, quantity)}
          style={{ flex: 1 }}
          data-testid="add-to-cart-button"
        >
          {outOfStock ? t("outOfStock") : t("addToCart")}
        </Button>
      </div>
    </div>
  );
}
