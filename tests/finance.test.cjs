const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const filename = path.resolve(__dirname, "../lib/finance.ts");
const mod = new Module(filename, module);
mod.filename = filename;
mod.paths = Module._nodeModulePaths(path.dirname(filename));
mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { invoiceBillingMonth, financeTotals, monthlyRevenue } = mod.exports;
const invoice = (id, amount, status, month, paidAt = null) => ({ id, student_id: 1, invoice_number: `TEST-${id}`, period_start: `${month}-01T00:00:00+08:00`, period_end: `${month}-28T00:00:00+08:00`, billing_month: month, total_amount: amount, status, issued_at: "2026-11-01T00:00:00Z", paid_at: paidAt });

test("October invoice paid in November remains October revenue with paid/unpaid separated", () => {
  const rows = [invoice(1, 700, "paid", "2026-10", "2026-11-08T00:00:00Z"), invoice(2, 300, "sent", "2026-10")];
  assert.deepEqual(monthlyRevenue(rows), [{ month: "2026-10", paid: 700, outstanding: 300, revenue: 1000, count: 2 }]);
});

test("canceled invoices never increase revenue or outstanding, but remain countable history", () => {
  const totals = financeTotals([invoice(1, 80, "sent", "2026-10"), invoice(2, 200, "canceled", "2026-10")]);
  assert.deepEqual(totals, { revenue: 80, paid: 0, outstanding: 80, count: 1, canceledCount: 1 });
});

test("time series includes empty intervening months and preserves year boundaries", () => {
  const months = monthlyRevenue([invoice(1, 50, "paid", "2026-12"), invoice(2, 70, "draft", "2027-02")]);
  assert.deepEqual(months.map(row => [row.month, row.revenue]), [["2026-12", 50], ["2027-01", 0], ["2027-02", 70]]);
});

test("MYT midnight billing bounds use the business month, not previous UTC date", () => {
  assert.equal(invoiceBillingMonth({ billing_month: null, period_start: "2026-10-31T16:00:00Z" }), "2026-11");
});
