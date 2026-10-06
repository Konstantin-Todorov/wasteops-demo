import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cx, Button } from './primitives';

const ToastCtx = createContext(null);

const TONE = {
  success: { icon: CheckCircle2,   bar: 'bg-ok',     fg: 'text-ok' },
  error:   { icon: XCircle,        bar: 'bg-danger', fg: 'text-danger' },
  warning: { icon: AlertTriangle,  bar: 'bg-warn',   fg: 'text-warn' },
  info:    { icon: Info,           bar: 'bg-info',   fg: 'text-info' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const seq = useRef(0);

  const dismiss = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);

  const push = useCallback((tone, message, opts = {}) => {
    const id = ++seq.current;
    const duration = opts.duration ?? (tone === 'error' ? 7000 : 4000);
    setToasts(t => [...t, { id, tone, message, title: opts.title }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const toast = useRef({
    success: (m, o) => push('success', m, o),
    error:   (m, o) => push('error', m, o),
    warning: (m, o) => push('warning', m, o),
    info:    (m, o) => push('info', m, o),
  }).current;

  // Промис-базиран диалог: await confirm({...}) връща true/false.
  const confirm = useCallback((opts) => new Promise((resolve) => {
    setConfirmState({ ...opts, resolve });
  }), []);

  const closeConfirm = (result) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  return (
    <ToastCtx.Provider value={{ toast, confirm }}>
      {children}
      {createPortal(
        <div className="fixed z-[100] bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => {
            const { icon: Icon, bar, fg } = TONE[t.tone];
            return (
              <div key={t.id} role="status"
                className="pointer-events-auto relative flex gap-3 items-start bg-surface border border-line
                           rounded-lg shadow-lg overflow-hidden pl-4 pr-3 py-3 animate-slide-in-right">
                <span className={cx('absolute left-0 inset-y-0 w-1', bar)} />
                <Icon size={17} className={cx('shrink-0 mt-0.5', fg)} strokeWidth={2} />
                <div className="min-w-0 grow">
                  {t.title && <p className="text-sm font-semibold text-ink">{t.title}</p>}
                  <p className={cx('text-sm text-ink-2 break-words', t.title && 'mt-0.5')}>{t.message}</p>
                </div>
                <button onClick={() => dismiss(t.id)} aria-label="Затвори"
                  className="shrink-0 text-ink-3 hover:text-ink transition-colors p-0.5 rounded">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>, document.body)}

      {confirmState && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade-in" onClick={() => closeConfirm(false)} />
          <div role="alertdialog" aria-modal="true"
            className="relative w-full max-w-sm bg-surface border border-line rounded-xl shadow-xl animate-slide-up p-5">
            <div className="flex gap-3.5">
              <div className={cx('h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                confirmState.tone === 'danger' ? 'bg-danger-soft' : 'bg-warn-soft')}>
                <AlertTriangle size={19} strokeWidth={2}
                  className={confirmState.tone === 'danger' ? 'text-danger' : 'text-warn'} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ink">{confirmState.title}</h2>
                {confirmState.description && (
                  <p className="text-sm text-ink-2 mt-1.5 leading-relaxed">{confirmState.description}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button size="sm" variant="secondary" onClick={() => closeConfirm(false)}>
                {confirmState.cancelLabel || 'Отказ'}
              </Button>
              <Button size="sm" variant={confirmState.tone === 'danger' ? 'danger' : 'primary'}
                onClick={() => closeConfirm(true)} autoFocus>
                {confirmState.confirmLabel || 'Потвърди'}
              </Button>
            </div>
          </div>
        </div>, document.body)}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast трябва да е вътре в <ToastProvider>');
  return ctx;
}
