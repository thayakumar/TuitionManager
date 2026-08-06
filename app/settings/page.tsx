import { getSetting } from "@/lib/db";
import { saveSettings } from "@/lib/actions";
import { PageHeader, Card, Field, TextArea, Button } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Business details shown on invoices" />
      <form action={saveSettings} className="max-w-xl">
        <Card>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Business / your name" name="business_name" defaultValue={getSetting("business_name")} />
            <TextArea
              label="Contact details (address, phone, email)"
              name="business_contact"
              rows={3}
              defaultValue={getSetting("business_contact")}
            />
            <Field
              label="Currency symbol"
              name="currency"
              defaultValue={getSetting("currency") || "RM"}
            />
            <TextArea
              label="Payment instructions (shown on invoice)"
              name="payment_instructions"
              rows={3}
              defaultValue={getSetting("payment_instructions")}
            />
          </div>
          <div className="mt-6 flex justify-end">
            <Button type="submit" variant="primary">
              Save settings
            </Button>
          </div>
        </Card>
      </form>
    </>
  );
}
