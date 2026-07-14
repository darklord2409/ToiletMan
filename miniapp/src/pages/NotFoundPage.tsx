import { Button } from "antd-mobile";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <h2>404</h2>
      <Button color="primary" shape="rounded" onClick={() => navigate("/")}>
        {t("nav.home")}
      </Button>
    </div>
  );
}
