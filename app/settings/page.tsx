import Link from "next/link";
import { StorageSetup } from "@/components/storage-setup";
import { FormBusy } from "@/components/action-busy";
import { ConfirmAction } from "@/components/confirm-action";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ArrowRight, Bot, Building2, QrCode } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import { saveSettings, saveDuitNowQR, removeDuitNowQR } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/form-field";
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  await requireAdminPage();
  const settings = await getSettings([
    "business_name",
    "business_contact",
    "currency",
    "payment_instructions",
    "duitnow_qr",
  ]);
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Your teaching business, account security, and connected tools."
      />
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 size={18} className="text-primary" aria-hidden="true" />
                Business details
              </CardTitle>
              <CardDescription>
                Shown on invoices and shared pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={saveSettings} className="space-y-5">
                <FormBusy />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Business / your name"
                    name="business_name"
                    defaultValue={settings.business_name}
                  />
                  <Field
                    label="Currency symbol"
                    name="currency"
                    defaultValue={settings.currency || "RM"}
                  />
                </div>
                <TextAreaField
                  label="Contact details (address, phone, email)"
                  name="business_contact"
                  rows={3}
                  defaultValue={settings.business_contact}
                />
                <TextAreaField
                  label="Payment instructions (shown on invoice)"
                  name="payment_instructions"
                  rows={3}
                  defaultValue={settings.payment_instructions}
                />
                <div className="flex justify-end">
                  <Button type="submit">Save settings</Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode size={18} className="text-primary" aria-hidden="true" />
                DuitNow QR
              </CardTitle>
              <CardDescription>
                Make your invoice payment instructions easy to follow
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settings.duitnow_qr ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5">
                    <img
                      src={settings.duitnow_qr}
                      alt="DuitNow payment QR"
                      className="mx-auto size-48 object-contain"
                    />
                  </div>
                  <ConfirmAction
                    action={removeDuitNowQR}
                    label="Remove QR"
                    message="Remove the saved DuitNow QR code? It will no longer appear on new or existing invoices until you upload another one."
                  />
                </div>
              ) : (
                <form
                  action={saveDuitNowQR}
                  encType="multipart/form-data"
                  className="space-y-4"
                >
                  <FormBusy />
                  <label className="flex min-h-44 flex-col justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-5">
                    <span className="text-sm font-medium">
                      Upload your DuitNow QR
                    </span>
                    <span className="text-xs text-muted-foreground">
                      PNG, JPG, WebP, or GIF up to 500KB
                    </span>
                    <input
                      type="file"
                      name="qr_image"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      required
                      className="max-w-full text-sm"
                    />
                  </label>
                  <Button type="submit">Upload QR</Button>
                </form>
              )}
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                Showing a QR does not mark an invoice paid. Update its status when
                you receive payment.
              </p>
            </CardContent>
          </Card>
        </div>

        <ChangePasswordForm />

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot size={18} className="text-primary" aria-hidden="true" />
                  AI connections
                </CardTitle>
                <CardDescription>
                  Connect Hermes or another MCP client with OAuth or a scoped bearer key
                </CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link href="/settings/agents">
                  Manage connections
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        <StorageSetup />
      </div>
    </>
  );
}
