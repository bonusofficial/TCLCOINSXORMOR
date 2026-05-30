"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";

const Toaster = (props: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      richColors={false}
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4 text-brand-green" strokeWidth={2.5} />,
        info: <InfoIcon className="size-4 text-sky-400" strokeWidth={2.5} />,
        warning: <TriangleAlertIcon className="size-4 text-brand-gold" strokeWidth={2.5} />,
        error: <OctagonXIcon className="size-4 text-rose-400" strokeWidth={2.5} />,
        loading: <Loader2Icon className="size-4 animate-spin text-brand-green" strokeWidth={2.5} />,
      }}
      style={
        {
          "--normal-bg": "var(--color-brand-surface-soft)",
          "--normal-text": "var(--color-brand-ink)",
          "--normal-border": "var(--color-brand-green-100)",
          "--success-bg": "var(--color-brand-surface-soft)",
          "--success-text": "var(--color-brand-ink)",
          "--success-border": "var(--color-brand-green)",
          "--error-bg": "var(--color-brand-surface-soft)",
          "--error-text": "var(--color-brand-ink)",
          "--error-border": "#f43f5e",
          "--border-radius": "16px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "!font-sans !shadow-[0_18px_45px_-12px_rgba(8,238,32,0.25)] !backdrop-blur-md ring-1 ring-brand-green/15",
          title: "!font-display !font-extrabold !text-sm !text-brand-ink",
          description: "!text-[12px] !font-medium !text-brand-ink-soft",
          actionButton: "!bg-brand-green !text-white !font-extrabold",
          cancelButton: "!bg-brand-surface !text-brand-ink-soft",
          closeButton: "!bg-brand-surface !border-brand-green-100 !text-brand-ink-soft hover:!text-brand-green",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
