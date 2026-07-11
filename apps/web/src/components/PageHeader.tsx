import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/** Cabeçalho padrão de tela — mesma hierarquia tipográfica em todo o app. */
export function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 px-5 pt-8">
      <div>
        <p className="font-sans text-xs font-bold uppercase tracking-[0.15em] text-azulejo-600">
          {eyebrow}
        </p>
        <h1 className="mt-1 font-display text-2xl text-noite">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-sm font-sans text-sm text-giz">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
