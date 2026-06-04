# UI Permissions & Button Audit

Generated: 2026-06-04T05:11:22.486Z

Files scanned: 449
Total GAPs: 27

## By status

- **GAP-NO-HANDLER**: 18
- **GAP-DEAD-TAB**: 9

## Top 25 files

- src/components/dashboard/widgets/DashboardAlerts.tsx: 6
- src/components/dashboard/widgets/PendingActionsTable.tsx: 4
- src/pages/beneficiary/AnnualReportViewPage.tsx: 3
- src/pages/beneficiary/InvoicesViewPage.tsx: 3
- src/pages/dashboard/InvoicesPage.tsx: 3
- src/pages/NotFound.tsx: 2
- src/pages/Unauthorized.tsx: 1
- src/components/audit/AuditLogTable.tsx: 1
- src/components/dashboard/views/accountant/OverdueInvoicesCard.tsx: 1
- src/components/dashboard/widgets/RecentContractsCard.tsx: 1
- src/components/layout/DesktopTopBar.tsx: 1
- src/components/layout/MobileHeader.tsx: 1

## All GAPs

- `src/pages/NotFound.tsx:40` — **GAP-NO-HANDLER** — Button — className="gradient-primary gap-2 rounded-xl px-6"
- `src/pages/NotFound.tsx:46` — **GAP-NO-HANDLER** — Button — variant="outline" className="gap-2 rounded-xl px-6"
- `src/pages/Unauthorized.tsx:66` — **GAP-NO-HANDLER** — Button — className="gradient-primary gap-2 rounded-xl px-6"
- `src/pages/beneficiary/AnnualReportViewPage.tsx:116` — **GAP-DEAD-TAB** — TabsTrigger — value=achievement
- `src/pages/beneficiary/AnnualReportViewPage.tsx:119` — **GAP-DEAD-TAB** — TabsTrigger — value=challenge
- `src/pages/beneficiary/AnnualReportViewPage.tsx:122` — **GAP-DEAD-TAB** — TabsTrigger — value=future_plan
- `src/pages/beneficiary/InvoicesViewPage.tsx:70` — **GAP-DEAD-TAB** — TabsTrigger — value=all
- `src/pages/beneficiary/InvoicesViewPage.tsx:71` — **GAP-DEAD-TAB** — TabsTrigger — value=rent
- `src/pages/beneficiary/InvoicesViewPage.tsx:72` — **GAP-DEAD-TAB** — TabsTrigger — value=purchase
- `src/pages/dashboard/InvoicesPage.tsx:59` — **GAP-DEAD-TAB** — TabsTrigger — value=all
- `src/pages/dashboard/InvoicesPage.tsx:60` — **GAP-DEAD-TAB** — TabsTrigger — value=rent
- `src/pages/dashboard/InvoicesPage.tsx:61` — **GAP-DEAD-TAB** — TabsTrigger — value=purchase
- `src/components/audit/AuditLogTable.tsx:97` — **GAP-NO-HANDLER** — Button — variant="ghost" size="icon" className="h-6 w-6" aria-label={isExpanded ? 'طي' : 
- `src/components/dashboard/views/accountant/OverdueInvoicesCard.tsx:66` — **GAP-NO-HANDLER** — Button — variant="outline" size="sm" className="w-full"
- `src/components/dashboard/widgets/DashboardAlerts.tsx:38` — **GAP-NO-HANDLER** — Button — variant="outline" size="sm" className="shrink-0"
- `src/components/dashboard/widgets/DashboardAlerts.tsx:52` — **GAP-NO-HANDLER** — Button — variant="outline" size="sm" className="gap-1 shrink-0"
- `src/components/dashboard/widgets/DashboardAlerts.tsx:69` — **GAP-NO-HANDLER** — Button — variant="outline" size="sm" className="shrink-0"
- `src/components/dashboard/widgets/DashboardAlerts.tsx:84` — **GAP-NO-HANDLER** — Button — variant="outline" size="sm" className="shrink-0"
- `src/components/dashboard/widgets/DashboardAlerts.tsx:101` — **GAP-NO-HANDLER** — Button — variant="outline" size="sm" className="shrink-0"
- `src/components/dashboard/widgets/DashboardAlerts.tsx:115` — **GAP-NO-HANDLER** — Button — variant="outline" size="sm" className="shrink-0"
- `src/components/dashboard/widgets/PendingActionsTable.tsx:98` — **GAP-NO-HANDLER** — Button — variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="الانتقال للإجراء
- `src/components/dashboard/widgets/PendingActionsTable.tsx:106` — **GAP-NO-HANDLER** — Button — variant="link" size="sm" className="text-xs text-muted-foreground"
- `src/components/dashboard/widgets/PendingActionsTable.tsx:139` — **GAP-NO-HANDLER** — Button — variant="ghost" size="icon" className="h-7 w-7" title="الانتقال للإجراء" aria-la
- `src/components/dashboard/widgets/PendingActionsTable.tsx:150` — **GAP-NO-HANDLER** — Button — variant="link" size="sm" className="text-xs text-muted-foreground"
- `src/components/dashboard/widgets/RecentContractsCard.tsx:74` — **GAP-NO-HANDLER** — Button — variant="ghost" size="sm"
- `src/components/layout/DesktopTopBar.tsx:42` — **GAP-NO-HANDLER** — Button — variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-
- `src/components/layout/MobileHeader.tsx:41` — **GAP-NO-HANDLER** — Button — variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-
