/**
 * Icon dictionary — one icon per meaning, one meaning per icon.
 * قاموس الأيقونات الموحّد: كل معنى له أيقونة واحدة، ولا تُستخدم أيقونة لمعنيين.
 * حارسه: `src/test/domainIconsGuard.test.ts`.
 */
import {
  Home, Building2, FileSignature, TrendingUp, TrendingDown, Users, BarChart3, Calculator,
  Share2, UserCog, Settings, MessageSquare, ReceiptText, ShieldCheck, BookOpen, FolderArchive,
  QrCode, Trophy, Headset, GitBranch, GitCompareArrows, Activity, Mail, Network, ScrollText,
  Wallet, ClipboardList, ArrowDownUp, Bell, Lock, Eye, Landmark,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const DOMAIN_ICONS = {
  home: Home,
  property: Building2,
  contract: FileSignature,
  income: TrendingUp,
  expense: TrendingDown,
  beneficiaries: Users,
  reports: BarChart3,
  accounts: Calculator,
  distribution: Share2,
  users: UserCog,
  settings: Settings,
  messages: MessageSquare,
  invoice: ReceiptText,
  audit: ShieldCheck,
  bylaws: BookOpen,
  archive: FolderArchive,
  zatca: QrCode,
  annualReport: Trophy,
  support: Headset,
  chartOfAccounts: GitBranch,
  comparison: GitCompareArrows,
  diagnostics: Activity,
  email: Mail,
  auditTree: Network,
  officialLetter: ScrollText,
  share: Wallet,
  disclosure: ClipboardList,
  carryforward: ArrowDownUp,
  notifications: Bell,
  closedYear: Lock,
  preview: Eye,
  bankAccount: Landmark,
} as const satisfies Record<string, LucideIcon>;

export type DomainIconKey = keyof typeof DOMAIN_ICONS;
