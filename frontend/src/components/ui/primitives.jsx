import { forwardRef, createContext, useContext, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ChevronDown, Search, Inbox, AlertCircle } from 'lucide-react';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

/* ─── Button ──────────────────────────────────────────────────────────────── */
const BTN_VARIANTS = {
  primary:   'bg-brand text-brand-ink hover:bg-brand-strong active:bg-brand-strong shadow-xs',
  secondary: 'bg-surface text-ink border border-line hover:bg-raised hover:border-line-strong shadow-xs',
  ghost:     'text-ink-2 hover:bg-sunken hover:text-ink',
  danger:    'bg-danger text-white hover:brightness-110 active:brightness-95 shadow-xs',
  subtle:    'bg-sunken text-ink-2 hover:bg-line hover:text-ink',
};
const BTN_SIZES = {
  xs: 'h-7  px-2.5 text-xs gap-1.5 rounded-sm',
  sm: 'h-8  px-3   text-sm gap-1.5 rounded',
  md: 'h-9  px-3.5 text-sm gap-2   rounded',
  lg: 'h-10 px-4   text-base gap-2 rounded-md',
};

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight,
    loading, disabled, className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center font-medium whitespace-nowrap',
        'transition-all duration-150 ease-swift select-none',
        'disabled:opacity-45 disabled:pointer-events-none',
        BTN_VARIANTS[variant], BTN_SIZES[size], className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={size === 'xs' ? 13 : 15} className="animate-spin" />
               : Icon && <Icon size={size === 'xs' ? 13 : 15} strokeWidth={2} />}
      {children}
      {IconRight && !loading && <IconRight size={15} strokeWidth={2} />}
    </button>
  );
});

export function IconButton({ icon: Icon, label, size = 'md', variant = 'ghost', className, ...rest }) {
  const dim = { xs: 'h-7 w-7', sm: 'h-8 w-8', md: 'h-9 w-9' }[size];
  return (
    <button
      aria-label={label} title={label}
      className={cx('inline-flex items-center justify-center rounded transition-all duration-150',
        'disabled:opacity-45 disabled:pointer-events-none', BTN_VARIANTS[variant], dim, className)}
      {...rest}
    >
      <Icon size={size === 'xs' ? 14 : 16} strokeWidth={2} />
    </button>
  );
}

/* ─── Surface / Card ──────────────────────────────────────────────────────── */
export function Card({ className, children, interactive, ...rest }) {
  return (
    <div
      className={cx('bg-surface border border-line rounded-lg shadow-sm',
        interactive && 'transition-all duration-150 hover:shadow-md hover:border-line-strong cursor-pointer',
        className)}
      {...rest}
    >{children}</div>
  );
}
export const CardHeader = ({ className, children }) => (
  <div className={cx('px-5 py-4 border-b border-line flex items-center justify-between gap-3 flex-wrap', className)}>{children}</div>
);
export const CardBody = ({ className, children }) => (
  <div className={cx('p-5', className)}>{children}</div>
);
export const CardTitle = ({ children, sub }) => (
  <div className="min-w-0">
    <h3 className="text-base font-semibold text-ink truncate">{children}</h3>
    {sub && <p className="text-xs text-ink-3 mt-0.5">{sub}</p>}
  </div>
);

/* ─── Badge ───────────────────────────────────────────────────────────────── */
const BADGE_TONES = {
  neutral: 'bg-sunken text-ink-2 border-line',
  brand:   'bg-brand-soft text-brand border-brand/25',
  ok:      'bg-ok-soft text-ok border-ok/25',
  warn:    'bg-warn-soft text-warn border-warn/25',
  danger:  'bg-danger-soft text-danger border-danger/25',
  info:    'bg-info-soft text-info border-info/25',
};
export function Badge({ tone = 'neutral', dot, icon: Icon, className, children }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border',
      'text-2xs font-semibold tracking-wide whitespace-nowrap', BADGE_TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />}
      {Icon && <Icon size={11} strokeWidth={2.5} />}
      {children}
    </span>
  );
}

/* ─── Form fields ─────────────────────────────────────────────────────────── */
export function Field({ label, hint, error, required, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="block text-xs font-medium text-ink-2 mb-1.5">
          {label}{required && <span className="text-danger ml-0.5">*</span>}
        </span>
      )}
      {children}
      {error ? <span className="flex items-center gap-1 text-xs text-danger mt-1.5"><AlertCircle size={12} />{error}</span>
             : hint && <span className="block text-xs text-ink-3 mt-1.5">{hint}</span>}
    </label>
  );
}

const CONTROL = 'w-full bg-surface border rounded text-sm text-ink placeholder:text-ink-3 ' +
  'transition-all duration-150 disabled:opacity-50 disabled:bg-sunken ' +
  'focus:outline-none focus:border-brand focus:shadow-focus';

export const Input = forwardRef(function Input({ className, invalid, ...rest }, ref) {
  return <input ref={ref} className={cx(CONTROL, 'h-9 px-3', invalid ? 'border-danger' : 'border-line', className)} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ className, invalid, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cx(CONTROL, 'px-3 py-2 resize-y', invalid ? 'border-danger' : 'border-line', className)} {...rest} />;
});

export const Select = forwardRef(function Select({ className, invalid, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cx(CONTROL, 'h-9 pl-3 pr-9 appearance-none cursor-pointer',
        invalid ? 'border-danger' : 'border-line', className)} {...rest}>{children}</select>
      <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
    </div>
  );
});

export function SearchInput({ className, ...rest }) {
  return (
    <div className={cx('relative', className)}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
      <input className={cx(CONTROL, 'h-9 pl-9 pr-3 border-line')} {...rest} />
    </div>
  );
}

/* ─── Modal ───────────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, sub, size = 'md', footer, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink/35 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div role="dialog" aria-modal="true"
        className={cx('relative w-full bg-surface border border-line shadow-xl animate-slide-up',
          'rounded-t-xl sm:rounded-xl max-h-[92vh] flex flex-col', width)}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-line shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink truncate">{title}</h2>
            {sub && <p className="text-xs text-ink-3 mt-0.5">{sub}</p>}
          </div>
          <IconButton icon={X} label="Затвори" size="sm" onClick={onClose} />
        </div>
        <div className="px-5 py-4 overflow-y-auto grow">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-line bg-raised rounded-b-xl flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>, document.body);
}

/* ─── Table ───────────────────────────────────────────────────────────────── */
export const Table = ({ children, className }) => (
  <div className="table-scroll"><table className={cx('w-full text-sm', className)}>{children}</table></div>
);
export const THead = ({ children }) => <thead className="bg-raised">{children}</thead>;
export const TH = ({ children, align = 'left', className }) => (
  <th className={cx('px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-ink-3',
    'border-b border-line whitespace-nowrap', align === 'right' && 'text-right',
    align === 'center' && 'text-center', align === 'left' && 'text-left', className)}>{children}</th>
);
export const TBody = ({ children }) => <tbody className="divide-y divide-line">{children}</tbody>;
export const TR = ({ children, onClick, className }) => (
  <tr onClick={onClick} className={cx('transition-colors', onClick && 'cursor-pointer hover:bg-raised', className)}>{children}</tr>
);
export const TD = ({ children, align = 'left', className }) => (
  <td className={cx('px-4 py-3 text-ink-2 align-middle',
    align === 'right' && 'text-right tabular', align === 'center' && 'text-center', className)}>{children}</td>
);

/* ─── States ──────────────────────────────────────────────────────────────── */
export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="h-12 w-12 rounded-xl bg-sunken border border-line flex items-center justify-center mb-4">
        <Icon size={22} className="text-ink-3" strokeWidth={1.75} />
      </div>
      <p className="text-base font-semibold text-ink">{title}</p>
      {description && <p className="text-sm text-ink-3 mt-1.5 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export const Skeleton = ({ className }) => <div className={cx('skeleton', className)} />;

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cx('h-4', c === 0 ? 'w-1/4' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Page header ─────────────────────────────────────────────────────────── */
export function PageHeader({ title, sub, actions, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">{title}</h1>
          {sub && <p className="text-sm text-ink-3 mt-1">{sub}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/* ─── Stat tile ───────────────────────────────────────────────────────────── */
export function Stat({ label, value, unit, icon: Icon, tone = 'neutral', trend, className }) {
  const toneRing = {
    neutral: 'text-ink-3 bg-sunken', brand: 'text-brand bg-brand-soft',
    ok: 'text-ok bg-ok-soft', warn: 'text-warn bg-warn-soft',
    danger: 'text-danger bg-danger-soft', info: 'text-info bg-info-soft',
  }[tone];
  return (
    <Card className={cx('p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-wider text-ink-3">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-ink tabular leading-none">
            {value}{unit && <span className="text-sm font-medium text-ink-3 ml-1">{unit}</span>}
          </p>
          {trend && <p className="text-xs text-ink-3 mt-1.5">{trend}</p>}
        </div>
        {Icon && (
          <div className={cx('h-9 w-9 rounded-md flex items-center justify-center shrink-0', toneRing)}>
            <Icon size={17} strokeWidth={2} />
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─── Tabs ────────────────────────────────────────────────────────────────── */
export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('flex items-center gap-1 border-b border-line overflow-x-auto', className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button key={t.value} onClick={() => onChange(t.value)}
            className={cx('relative px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              active ? 'text-brand' : 'text-ink-3 hover:text-ink')}>
            <span className="flex items-center gap-2">
              {t.label}
              {t.count != null && (
                <span className={cx('px-1.5 py-0.5 rounded-full text-2xs font-semibold tabular',
                  active ? 'bg-brand-soft text-brand' : 'bg-sunken text-ink-3')}>{t.count}</span>
              )}
            </span>
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand rounded-full" />}
          </button>
        );
      })}
    </div>
  );
}
