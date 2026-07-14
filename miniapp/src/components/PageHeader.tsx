import { NavBar } from "antd-mobile";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: ReactNode;
  right?: ReactNode;
  onBack?: () => void;
}

export function PageHeader({ title, right, onBack }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <NavBar
      onBack={onBack ?? (() => navigate(-1))}
      right={right}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--adm-color-background)",
      }}
    >
      {title}
    </NavBar>
  );
}
