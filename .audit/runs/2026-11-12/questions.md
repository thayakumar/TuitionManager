# Business decisions still needed

Q2 (post-invoice corrections) is settled for this scope by your month-end workflow; it is not being asked again and no adjustment feature will be added.

Resolved replies are in decisions.json; earlier credential/deletion/resubmission decisions are inherited. These are recommendations, not assumed answers. No code fixes will start until applicable decisions and explicit fix approval.

## Q1. Attendance denominator (F17)

Now: Current admin counts present only; parents include late, and canceled absences may disappear from denominator.

A) Count present+late among marked held/absent lessons, track canceled-by-tutor separately; B) present only; C) define your own denominator.

Recommended: A, provided student absence remains distinguishable from tutor cancellation.

Affected: TRACE-F17; exact surfaces and refs in linked findings.

## Q3. Inactive student access (F15)

Now: Soft deletion preserves records, but existing tokens still authorize writes.

A) Revoke all student access on deactivation; B) retain read-only history, forbid writes/meetings; C) keep full access.

Recommended: A unless alumni portal access is required.

Affected: Deactivated existing session; exact surfaces and refs in linked findings.

## Q4. Regrading on resubmission (F21)

Now: Earlier decision allows latest submission to replace previous; new content currently retains old grade.

A) Clear grade/feedback and require regrade; B) keep prior grade explicitly labeled prior-version; C) disallow resubmission once graded.

Recommended: A.

Affected: TRACE-F21; exact surfaces and refs in linked findings.

## Q5. Revenue chart basis (F18)

Now: Paid KPI uses paid_at, chart groups paid invoices by issue month.

A) Cash collected by paid_at; B) invoice issue cohorts with clear labels.

Recommended: A if Revenue means collections.

Affected: October invoice paid in November; exact surfaces and refs in linked findings.

## Q6. Calendar gestures/trash (F22 and components C04)

Now: Drag/resize are enabled but do not persist; calendar Delete actually cancels.

A) Disable unsupported drag/resize and rename trash to Cancel with status guard; B) implement real drag rescheduling and separately defined deletion.

Recommended: A as small consistent correction.

Affected: Controlled gesture probe / delete trace; exact surfaces and refs in linked findings.

## Q7. Reminders (F31)

Now: Browser permission toggle promises upcoming-class reminders but none are scheduled.

A) Remove reminder promise for now; B) implement reminders (state lead time and whether browser may be closed).

Recommended: A until delivery behavior is specified.

Affected: TRACE-F31; exact surfaces and refs in linked findings.

## Q8. Numeric grade rules (F26)

Now: UI suggests0..max but backend permits arbitrary strings/negative/extra-credit values.

A) Enforce0..max for numeric rubrics and retain text grades only without numeric max; B) allow extra credit above max with explicit label.

Recommended: A.

Affected: TRACE-F26; exact surfaces and refs in linked findings.

## Q9. Future holiday effects / open-ended recurrence (F27)

Now: Adding holiday changes future generation only; existing generated classes remain. No-end recurrence generates56days with no replenishment job.

A) Show horizon and offer explicit future cancellation/regeneration on holiday changes; B) automatic future changes; C) retain generation-only behavior, clearly labeled.

Recommended: A.

Affected: Holiday additions and recurrence horizon; exact surfaces and refs in linked findings.

## Q10. Notification events (F27)

Now: Equivalent cancel/create/reschedule paths notify differently.

A) Notify students on every new/changed/canceled lesson, including recurrence, once after commit; B) only selected events (list them).

Recommended: A, in-app only; external delivery is outside audit scope.

Affected: TRACE-F27; exact surfaces and refs in linked findings.

## Q11. Rescheduled trial pricing (F07)

Now: Replacement lessons drop is_trial, while docs say trial free and rescheduled normal rate.

A) A moved trial remains a free trial; B) rescheduling intentionally converts it to a paid lesson, with explicit confirmation and customer notice.

Recommended: A to preserve classification unless conversion is intended.

Affected: Repeated approval/trial loss test; exact surfaces and refs in linked findings.
