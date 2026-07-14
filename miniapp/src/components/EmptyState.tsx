import { Button } from "antd-mobile";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "64px 32px",
        gap: 12,
        color: "var(--adm-color-weak)",
      }}
    >
      {icon}
      <h3 style={{ margin: 0, color: "var(--adm-color-text)" }}>{title}</h3>
      {description && <p style={{ margin: 0 }}>{description}</p>}
      {actionLabel && onAction && (
        <Button color="primary" shape="rounded" onClick={onAction} style={{ marginTop: 8 }}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
