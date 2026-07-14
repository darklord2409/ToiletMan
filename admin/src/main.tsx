import React from "react";
import ReactDOM from "react-dom/client";
import { App as AntdApp } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import RootApp from "@/App";
import { AuthProvider } from "@/auth/AuthContext";
import { AppThemeProvider } from "@/theme/ThemeContext";

import "antd/dist/reset.css";
import "@/styles/global.css";
import "@/i18n";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <AntdApp>
          <AuthProvider>
            <RootApp />
          </AuthProvider>
        </AntdApp>
      </AppThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
