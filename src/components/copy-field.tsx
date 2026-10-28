"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/components/ui";

export function CopyField({ label, value, mono = true }: { label?: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  return (
    <div>
      {label ? <div className="mb-1.5 text-[12px] font-semibold text-muted-foreground">{label}</div> : null}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3 py-2">
        <code className={cn("min-w-0 flex-1 truncate text-[12.5px] text-foreground", mono && "font-mono")}>{value}</code>
        <button
          type="button"
          aria-label={`Copy ${label || "value"}`}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function CodeBlock({ caption, code }: { caption: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{caption}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-card hover:text-foreground"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[420px] overflow-auto bg-[#0d1b15] p-4 text-[11.5px] leading-relaxed text-emerald-50">
        <code>{code}</code>
      </pre>
    </div>
  );
}
