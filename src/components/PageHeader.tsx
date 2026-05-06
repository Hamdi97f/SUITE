import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description ? <p className="text-sm text-slate-500 mt-1">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
