import { List } from "antd-mobile";
import {
  InformationCircleOutline,
  PhonebookOutline,
  ReceiptOutline,
  RightOutline,
  SetOutline,
  UserCircleOutline,
} from "antd-mobile-icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useCustomer } from "@/hooks/useCustomer";

export default function ProfilePage() {
  const { t } = useTranslation("profile");
  const navigate = useNavigate();
  const { data: customer } = useCustomer();

  const displayName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "—";

  return (
    <div className="scroll-page">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 16,
        }}
      >
        <UserCircleOutline fontSize={48} color="var(--adm-color-primary)" />
        <div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{displayName}</div>
          {customer?.phone && (
            <div style={{ fontSize: 13, color: "var(--adm-color-weak)" }}>{customer.phone}</div>
          )}
        </div>
      </div>

      <List>
        <List.Item prefix={<ReceiptOutline />} arrow={<RightOutline />} onClick={() => navigate("/profile/orders")}>
          {t("menu.orders")}
        </List.Item>
        <List.Item prefix={<PhonebookOutline />} arrow={<RightOutline />} onClick={() => navigate("/profile/contacts")}>
          {t("menu.contacts")}
        </List.Item>
        <List.Item prefix={<SetOutline />} arrow={<RightOutline />} onClick={() => navigate("/profile/settings")}>
          {t("menu.settings")}
        </List.Item>
        <List.Item prefix={<InformationCircleOutline />} arrow={<RightOutline />} onClick={() => navigate("/profile/about")}>
          {t("menu.about")}
        </List.Item>
      </List>
    </div>
  );
}
