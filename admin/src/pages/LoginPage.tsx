import { useState } from "react";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";

interface LoginFormValues {
  username: string;
  password: string;
}

export default function LoginPage() {
  const { t } = useTranslation("auth");
  const { login, isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<LoginFormValues>({
    defaultValues: { username: "", password: "" },
  });

  if (!isInitializing && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(values: LoginFormValues) {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await login(values.username, values.password);
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("loginFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
        padding: 16,
      }}
    >
      <Card style={{ width: 380, borderRadius: 12 }} variant="borderless">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            {t("appName")}
          </Typography.Title>
          <Typography.Text type="secondary">{t("subtitle")}</Typography.Text>
        </div>

        {errorMessage && (
          <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />
        )}

        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <Form.Item label={t("username")} required>
            <Controller
              name="username"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Input {...field} prefix={<UserOutlined />} placeholder="admin" autoFocus />
              )}
            />
          </Form.Item>
          <Form.Item label={t("password")} required>
            <Controller
              name="password"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Input.Password {...field} prefix={<LockOutlined />} placeholder="••••••••" />
              )}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting} size="large">
            {t("signIn")}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
