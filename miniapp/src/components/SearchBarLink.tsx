import { SearchOutline } from "antd-mobile-icons";
import { useNavigate } from "react-router-dom";

export function SearchBarLink({ placeholder }: { placeholder: string }) {
  const navigate = useNavigate();
  return (
    <div
      role="button"
      onClick={() => navigate("/search")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 36,
        padding: "0 12px",
        borderRadius: 18,
        background: "var(--adm-color-fill)",
        color: "var(--adm-color-weak)",
        fontSize: 14,
      }}
    >
      <SearchOutline />
      <span>{placeholder}</span>
    </div>
  );
}
