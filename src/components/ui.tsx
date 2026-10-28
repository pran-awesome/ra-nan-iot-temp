import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-foreground">{title}</h1>
        {description ? <div className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionTo,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">{icon}</span>
      <h3 className="mt-4 text-[15px] font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      {actionLabel && actionTo ? (
        <Link href={actionTo} className="mt-4 rounded-xl bg-primary px-4 py-2 text-[12.5px] font-semibold text-primary-foreground">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

const buttonClass = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border border-border bg-card text-foreground hover:bg-muted",
  danger: "border border-border bg-card text-destructive hover:bg-rose-50",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonClass }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold transition-colors disabled:opacity-60",
        buttonClass[variant],
        className,
      )}
    />
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-input bg-card px-3 py-2 text-[13.5px] text-foreground outline-none ring-ring focus:ring-2",
        props.className,
      )}
    />
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-input bg-card px-3 py-2 text-[13.5px] text-foreground outline-none ring-ring focus:ring-2",
        props.className,
      )}
    />
  );
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 block text-[12.5px] font-semibold text-foreground">
      {children}
      {hint ? <span className="ml-1 font-normal text-muted-foreground">{hint}</span> : null}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-primary/10", className)} />;
}
