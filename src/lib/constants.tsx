// ثابت‌های مشترک برنامه
import type { LucideIcon } from 'lucide-react'
import {
  Zap, Droplets, Wind, Hammer, PaintRoller, KeyRound,
  Refrigerator, Sparkles, MoreHorizontal,
  AlertCircle, AlertTriangle, ArrowUpCircle, ArrowDownCircle,
} from 'lucide-react'

export const CATEGORIES: { value: string; label: string; icon: LucideIcon; color: string }[] = [
  { value: 'ELECTRICAL', label: 'برق', icon: Zap, color: 'oklch(0.7 0.2 80)' },
  { value: 'PLUMBING', label: 'تأسیسات آب', icon: Droplets, color: 'oklch(0.6 0.17 250)' },
  { value: 'AIR_CONDITION', label: 'تهویه', icon: Wind, color: 'oklch(0.65 0.16 180)' },
  { value: 'CARPENTRY', label: 'نجاری', icon: Hammer, color: 'oklch(0.55 0.15 50)' },
  { value: 'PAINTING', label: 'رنگ‌آمیزی', icon: PaintRoller, color: 'oklch(0.65 0.2 330)' },
  { value: 'LOCKSMITH', label: 'قفل و یراق', icon: KeyRound, color: 'oklch(0.55 0.18 30)' },
  { value: 'APPLIANCE', label: 'لوازم خانگی', icon: Refrigerator, color: 'oklch(0.55 0.16 160)' },
  { value: 'CLEANING', label: 'نظافت عمومی', icon: Sparkles, color: 'oklch(0.7 0.18 200)' },
  { value: 'OTHER', label: 'سایر', icon: MoreHorizontal, color: 'oklch(0.6 0.02 220)' },
]

export const PRIORITIES: { value: string; label: string; color: string; bg: string; icon: LucideIcon }[] = [
  { value: 'LOW', label: 'کم', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40', icon: ArrowDownCircle },
  { value: 'MEDIUM', label: 'متوسط', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40', icon: ArrowUpCircle },
  { value: 'HIGH', label: 'زیاد', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/40', icon: AlertTriangle },
  { value: 'URGENT', label: 'فوری', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40', icon: AlertCircle },
]

export const STATUSES: { value: string; label: string; color: string; bg: string }[] = [
  { value: 'PENDING', label: 'در انتظار پذیرش', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  { value: 'IN_PROGRESS', label: 'در حال رسیدگی', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40' },
  { value: 'RESOLVED', label: 'رفع شده', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  { value: 'CANCELLED', label: 'لغو شده', color: 'text-zinc-500', bg: 'bg-zinc-200 dark:bg-zinc-800' },
]

export function categoryMeta(v: string) {
  return CATEGORIES.find(c => c.value === v) ?? CATEGORIES[CATEGORIES.length - 1]
}
export function priorityMeta(v: string) {
  return PRIORITIES.find(p => p.value === v) ?? PRIORITIES[1]
}
export function statusMeta(v: string) {
  return STATUSES.find(s => s.value === v) ?? STATUSES[0]
}

export function formatDateTime(iso?: string | Date | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d)
}

export function formatDate(iso?: string | Date | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(d)
}

export function formatTime(iso?: string | Date | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(d)
}

export function relativeTime(iso?: string | Date | null): string {
  if (!iso) return '-'
  const d = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'لحظاتی پیش'
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`
  if (diff < 604800) return `${Math.floor(diff / 86400)} روز پیش`
  return formatDate(iso)
}

export function formatDuration(minutes?: number | null): string {
  if (minutes == null) return '-'
  if (minutes < 60) return `${minutes} دقیقه`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} ساعت و ${m} دقیقه` : `${h} ساعت`
}

// تبدیل اعداد به فارسی
export function toFa(n: number | string): string {
  return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])
}
