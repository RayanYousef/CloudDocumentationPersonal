import { useEffect, useId, type ReactNode } from 'react';

/** Accessible modal shell: dialog semantics, labelled by its heading, Escape closes when a close handler is given. */
export function Modal({ title, onClose, children }: { title: string; onClose?: () => void; children: ReactNode }) {
  const headingId = useId();
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal">
      <div role="dialog" aria-modal="true" aria-labelledby={headingId}>
        <h2 id={headingId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
