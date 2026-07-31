"use client";

/**
 * Accessible modal dialog built on the native <dialog> element (showModal()).
 *
 * We lean on the platform for the a11y-critical behaviour rather than
 * re-implementing it: showModal() gives a focus trap, Esc-to-dismiss, an inert
 * background, top-layer stacking, and — crucially — focus returns to whatever was
 * focused before opening (the trigger button). We add: controlled open/close,
 * a labelled title, a backdrop click-to-close, and a body-scroll lock.
 */

import { useEffect, useRef, type ReactNode } from "react";

export function Dialog({
  open,
  onClose,
  labelledBy,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  /** id of the element that names the dialog (aria-labelledby). */
  labelledBy: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  // Drive the native dialog from the `open` prop.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // showModal() focuses the first tabbable (often the close button); prefer the
      // field the caller marks with [data-autofocus] so the user lands on the form.
      const target = d.querySelector<HTMLElement>("[data-autofocus]");
      if (target) target.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      // Esc fires "cancel"; keep React state in sync (default already closes).
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      // Close when the click lands outside the dialog box (on the ::backdrop).
      onClick={(e) => {
        const d = ref.current;
        if (!d) return;
        const r = d.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) onClose();
      }}
      className={`m-auto w-[min(92vw,520px)] rounded-xl border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/50 ${className}`}
    >
      {open && children}
    </dialog>
  );
}
