import { Trash2 } from "lucide-react";
import { getSetting, queryAll } from "@/lib/db";
import { saveSettings, addHoliday, deleteHoliday, saveDuitNowQR, removeDuitNowQR } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NotificationToggle } from "@/components/notification-toggle";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/form-field";
import type { Holiday } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [businessName, businessContact, currencyVal, paymentInstructions, duitnowQr, holidays] =
    await Promise.all([
      getSetting("business_name"),
      getSetting("business_contact"),
      getSetting("currency"),
      getSetting("payment_instructions"),
      getSetting("duitnow_qr"),
      queryAll<Holiday>("SELECT * FROM holidays ORDER BY date"),
    ]);

  return (
    <>
      <PageHeader title="Settings" subtitle="Configure your tutoring business" />

      <div className="max-w-xl space-y-8">
        {/* Business Settings */}
        <form action={saveSettings}>
          <Card>
            <CardHeader>
              <CardTitle>Business details</CardTitle>
              <CardDescription>Shown on invoices and shared pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                <Field label="Business / your name" name="business_name" defaultValue={businessName} />
                <TextAreaField
                  label="Contact details (address, phone, email)"
                  name="business_contact"
                  rows={3}
                  defaultValue={businessContact}
                />
                <Field
                  label="Currency symbol"
                  name="currency"
                  defaultValue={currencyVal || "RM"}
                />
                <TextAreaField
                  label="Payment instructions (shown on invoice)"
                  name="payment_instructions"
                  rows={3}
                  defaultValue={paymentInstructions}
                />
              </div>
              <div className="mt-6 flex justify-end">
                <Button type="submit">Save settings</Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Holidays */}
        <Card>
          <CardHeader>
            <CardTitle>Holidays</CardTitle>
            <CardDescription>Classes on these dates are auto-skipped in recurring schedules</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={addHoliday} className="flex gap-2 items-end mb-4">
              <div className="flex-1">
                <Field label="Holiday name" name="name" required placeholder="e.g. Hari Raya" />
              </div>
              <div className="w-44">
                <Field label="Date" name="date" type="date" required />
              </div>
              <Button type="submit" className="mb-0.5">Add</Button>
            </form>
            {holidays.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                No holidays added yet
              </div>
            ) : (
              <div className="space-y-1">
                {holidays.map((h) => (
                  <div key={h.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                    <div>
                      <span className="text-sm font-medium">{h.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{h.date}</span>
                    </div>
                    <form action={deleteHoliday.bind(null, h.id)}>
                      <Button type="submit" variant="ghost" size="icon-sm">
                        <Trash2 size={14} />
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* DuitNow QR */}
        <Card>
          <CardHeader>
            <CardTitle>DuitNow QR</CardTitle>
            <CardDescription>This QR code will appear on printed invoices for easy payment</CardDescription>
          </CardHeader>
          <CardContent>
            {duitnowQr ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={duitnowQr}
                  alt="DuitNow QR"
                  className="w-48 h-48 object-contain border rounded-lg mx-auto"
                />
                <div className="text-center">
                  <form action={removeDuitNowQR}>
                    <Button type="submit" variant="destructive" size="sm">
                      Remove QR
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <form action={saveDuitNowQR} encType="multipart/form-data" className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">Upload your DuitNow QR image</label>
                  <input
                    type="file"
                    name="qr_image"
                    accept="image/*"
                    required
                    className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/80"
                  />
                </div>
                <Button type="submit">Upload QR</Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Browser-based class reminders</CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationToggle />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
