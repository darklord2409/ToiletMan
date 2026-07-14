import { Button, Form, Input, Toast } from "antd-mobile";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/PageHeader";
import { useCustomer, useUpdateProfile } from "@/hooks/useCustomer";
import { extractErrorMessage } from "@/api/client";

interface ContactsFormValues {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export default function ContactsPage() {
  const { t } = useTranslation("profile");
  const { t: tCommon } = useTranslation("common");
  const { data: customer } = useCustomer();
  const updateProfile = useUpdateProfile();
  const [form] = Form.useForm<ContactsFormValues>();

  async function handleFinish(values: ContactsFormValues) {
    updateProfile.mutate(values, {
      onSuccess: () => Toast.show({ content: t("contacts.saved") }),
      onError: (error) => Toast.show({ content: extractErrorMessage(error) }),
    });
  }

  return (
    <div className="scroll-page">
      <PageHeader title={t("contacts.title")} />

      <Form
        form={form}
        initialValues={{
          first_name: customer?.first_name ?? "",
          last_name: customer?.last_name ?? "",
          phone: customer?.phone ?? "",
        }}
        onFinish={handleFinish}
        footer={
          <Button block color="primary" type="submit" loading={updateProfile.isPending}>
            {tCommon("actions.save")}
          </Button>
        }
      >
        <Form.Item name="first_name" label={t("contacts.name")}>
          <Input />
        </Form.Item>
        <Form.Item name="last_name" label={t("contacts.lastName")}>
          <Input />
        </Form.Item>
        <Form.Item name="phone" label={t("contacts.phone")}>
          <Input type="tel" />
        </Form.Item>
      </Form>
    </div>
  );
}
