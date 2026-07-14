import { useEffect, useRef, useState } from "react";
import { Modal, Table, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const GO_TO_MAP: Record<string, string> = {
  d: "/",
  p: "/catalog/products",
  o: "/commerce/orders",
  c: "/users/customers",
  u: "/users/admin-users",
  s: "/content/store-settings",
  a: "/system/audit-logs",
};

const GO_TO_SEQUENCE_TIMEOUT_MS = 900;

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable)
  );
}

/** Global "g then <letter>" navigation and a "?" shortcuts cheat-sheet —
 * mounted once in AppLayout so it's active across the whole panel. */
export function GlobalShortcuts() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const awaitingGoTo = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();

      if (awaitingGoTo.current) {
        awaitingGoTo.current = false;
        clearTimeout(timeoutRef.current);
        const path = GO_TO_MAP[key];
        if (path) {
          event.preventDefault();
          navigate(path);
        }
        return;
      }

      if (key === "g") {
        awaitingGoTo.current = true;
        timeoutRef.current = setTimeout(() => {
          awaitingGoTo.current = false;
        }, GO_TO_SEQUENCE_TIMEOUT_MS);
        return;
      }

      if (key === "?") {
        event.preventDefault();
        setHelpOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(timeoutRef.current);
    };
  }, [navigate]);

  const rows = [
    { combo: "Ctrl/Cmd + K", description: t("shortcuts.globalSearch") },
    { combo: "?", description: t("shortcuts.showHelp") },
    { combo: "N", description: t("shortcuts.createNew") },
    { combo: "/", description: t("shortcuts.focusSearch") },
    { combo: `G  D`, description: t("shortcuts.goDashboard") },
    { combo: `G  P`, description: t("shortcuts.goProducts") },
    { combo: `G  O`, description: t("shortcuts.goOrders") },
    { combo: `G  C`, description: t("shortcuts.goCustomers") },
    { combo: `G  U`, description: t("shortcuts.goAdminUsers") },
    { combo: `G  S`, description: t("shortcuts.goSettings") },
    { combo: `G  A`, description: t("shortcuts.goAuditLogs") },
    { combo: t("shortcuts.rightClick"), description: t("shortcuts.contextMenu") },
  ];

  return (
    <Modal
      open={helpOpen}
      onCancel={() => setHelpOpen(false)}
      title={t("shortcuts.title")}
      footer={null}
      width={480}
    >
      <Table
        size="small"
        pagination={false}
        showHeader={false}
        rowKey="combo"
        dataSource={rows}
        columns={[
          {
            dataIndex: "combo",
            width: 140,
            render: (v: string) => <Typography.Text keyboard>{v}</Typography.Text>,
          },
          { dataIndex: "description" },
        ]}
      />
    </Modal>
  );
}
