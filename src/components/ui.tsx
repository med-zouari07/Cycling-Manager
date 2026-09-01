import { type ReactNode } from 'react';
import { X } from 'lucide-react';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const w = size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-4xl' : 'max-w-lg';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative ${w} w-full card max-h-[90vh] overflow-hidden flex flex-col animate-scale-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof X;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card p-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 grid place-items-center mb-4">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      {description && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'primary',
}: {
  label: string;
  value: string | number;
  icon: typeof X;
  trend?: string;
  color?: 'primary' | 'success' | 'warning' | 'accent';
}) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-50 dark:bg-primary-600/10 text-primary-600 dark:text-primary-400',
    success: 'bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400',
    warning: 'bg-warning-50 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400',
    accent: 'bg-accent-50 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400',
  };
  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500 dark:text-slate-400">{label}</div>
          <div className="text-3xl font-bold mt-1">{value}</div>
        </div>
        <div className={`w-11 h-11 rounded-xl grid place-items-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && <div className="mt-3 text-xs text-gray-400">{trend}</div>}
    </div>
  );
}

export function Badge({
  children,
  color = 'gray',
}: {
  children: ReactNode;
  color?: 'gray' | 'green' | 'yellow' | 'red' | 'blue';
}) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300',
    green: 'bg-success-100 dark:bg-success-500/15 text-success-700 dark:text-success-400',
    yellow: 'bg-warning-100 dark:bg-warning-500/15 text-warning-700 dark:text-warning-400',
    red: 'bg-error-100 dark:bg-error-500/15 text-error-700 dark:text-error-400',
    blue: 'bg-primary-100 dark:bg-primary-600/15 text-primary-700 dark:text-primary-300',
  };
  return <span className={`badge ${colors[color]}`}>{children}</span>;
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card p-6 text-center text-error-600 dark:text-error-400">
      {message}
    </div>
  );
}
