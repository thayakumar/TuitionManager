import {
  Trash2, Building2, CalendarDays, QrCode, Bell,
  CreditCard, Phone, Coins, FileText, Plus, Sparkles,
} from "lucide-react";
import { getSetting, queryAll } from "@/lib/db";
import { saveSettings, addHoliday, deleteHoliday, saveDuitNowQR, removeDuitNowQR } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NotificationToggle } from "@/components/notification-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Sparkles size={22} className="text-indigo-500" />
            Settings
          </span>
        }
        subtitle="Configure your tutoring business"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Details */}
        <form action={saveSettings} className="lg:col-span-2">
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50">
                  <Building2 size={16} className="text-blue-500" />
                </div>
                Business Details
              </CardTitle>
              <CardDescription>Shown on invoices and shared pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Business / your name" name="business_name" defaultValue={businessName} />
                <Field
                  label="Currency symbol"
                  name="currency"
                  defaultValue={currencyVal || "RM"}
                />
                <div className="md:col-span-2">
                  <TextAreaField
                    label="Contact details (address, phone, email)"
                    name="business_contact"
                    rows={3}
                    defaultValue={businessContact}
                  />
                </div>
                <div className="md:col-span-2">
                  <TextAreaField
                    label="Payment instructions (shown on invoice)"
                    name="payment_instructions"
                    rows={3}
                    defaultValue={paymentInstructions}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button type="submit">Save settings</Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Holidays */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50">
                <CalendarDays size={16} className="text-amber-500" />
              </div>
              Holidays
            </CardTitle>
            <CardDescription>Classes on these dates are auto-skipped in recurring schedules</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={addHoliday} className="flex flex-col sm:flex-row gap-2 items-end mb-5">
              <div className="flex-1 w-full">
                <Field label="Holiday name" name="name" required placeholder="e.g. Hari Raya" />
              </div>
              <div className="w-full sm:w-40">
                <Field label="Date" name="date" type="date" required />
              </div>
              <Button type="submit" className="mb-0.5 shrink-0">
                <Plus size={14} /> Add
              </Button>
            </form>
            {holidays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                <CalendarDays size={28} className="mb-2 opacity-40" />
                <p className="text-sm">No holidays added yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5 transition-all hover:bg-secondary/50 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50">
                        <CalendarDays size={14} className="text-amber-500" />
                      </div>
                      <div>
                        <span className="text-sm font-medium">{h.name}</span>
                        <div className="mt-0.5">
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {h.date}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <form action={deleteHoliday.bind(null, h.id)}>
                      <Button type="submit" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-red-500">
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
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50">
                <QrCode size={16} className="text-emerald-500" />
              </div>
              DuitNow QR
            </CardTitle>
            <CardDescription>This QR code will appear on printed invoices for easy payment</CardDescription>
          </CardHeader>
          <CardContent>
            {duitnowQr ? (
              <div className="space-y-4">
                <div className="flex justify-center rounded-xl border-2 border-dashed border-border/60 bg-secondary/30 p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={duitnowQr}
                    alt="DuitNow QR"
                    className="w-48 h-48 object-contain rounded-lg"
                  />
                </div>
                <div className="text-center">
                  <form action={removeDuitNowQR}>
                    <Button type="submit" variant="destructive" size="sm">
                      <Trash2 size={14} /> Remove QR
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <form action={saveDuitNowQR} encType="multipart/form-data">
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-secondary/20 p-8 transition-colors hover:bg-secondary/40">
                  <QrCode size={36} className="text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">Upload your DuitNow QR</p>
                  <p className="text-xs text-muted-foreground mb-4">PNG, JPG or SVG up to 2MB</p>
                  <input
                    type="file"
                    name="qr_image"
                    accept="image/*"
                    required
                    className="block w-full max-w-xs text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                <div className="mt-4 flex justify-end">
                  <Button type="submit">Upload QR</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="shadow-sm border-0 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50">
                <Bell size={16} className="text-violet-500" />
              </div>
              Notifications
            </CardTitle>
            <CardDescription>Browser-based class reminders to keep you on track</CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationToggle />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
