import { Button, Result } from "antd";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  const { t } = useTranslation("notFound");

  return (
    <Result
      status="404"
      title={t("title")}
      subTitle={t("subtitle")}
      extra={
        <Link to="/">
          <Button type="primary">{t("backHome")}</Button>
        </Link>
      }
    />
  );
}
