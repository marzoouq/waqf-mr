/**
 * أيقونات Lucide المستخدمة في عناصر التنقل
 * ───────────────────────────────────────────
 * مفصولة عن `navigation.ts` لأن ملفات الثوابت كثيرة الاستيراد، وفصل الأيقونات
 * يسمح لأي مستهلِك يحتاج فقط إلى المفاتيح/الصلاحيات/العناوين بتجنّب سحب
 * مكتبة Lucide إلى bundle الخاص به (#22 / #68 من تقرير الفحص العميق).
 *
 * `navigation.ts` يستورد هذا الملف فقط حيث يحتاج للأيقونات في `allAdminLinks`
 * و`allBeneficiaryLinks`، بينما باقي الملفات (Sidebar headers, route guards,
 * permission maps) تستورد من `navigation.ts` بدون تحميل Lucide.
 */
export {
  Building2, Home, FileText, Wallet, Users, BarChart3,
  DollarSign, Receipt, UserCog, Eye, Settings, MessageSquare,
  Bell, ShieldCheck, BookOpen, Lock, ArrowDownUp,
  ClipboardList, Calculator, Headset, GitBranch, GitCompareArrows, Activity, Mail,
} from 'lucide-react';
