import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { BottomTabBar } from "@/layout/BottomTabBar";
import { isTabRootPath } from "@/layout/tabs";
import { useTelegramBackButton } from "@/telegram/hooks";

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRoot = isTabRootPath(location.pathname);

  useTelegramBackButton(!isRoot, () => navigate(-1));

  return (
    <div className={`app-shell ${isRoot ? "app-shell--with-tabbar" : ""}`}>
      <Outlet />
      {isRoot && <BottomTabBar />}
    </div>
  );
}
