import Link from 'next/link';

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 border-b border-white/5 pb-4">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
    </div>
  );
}

export function EmptyState({ message, href, linkLabel }: { message: string; href?: string; linkLabel?: string }) {
  return (
    <div className="rounded bg-surface p-10 text-center text-muted">
      <p>{message}</p>
      {href && linkLabel && (
        <Link href={href} className="mt-3 inline-block text-brand underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export function ListRow({
  href,
  title,
  meta,
  trailing,
}: {
  href: string;
  title: string;
  meta?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <Link href={href} className="flex items-center justify-between rounded bg-surface px-4 py-3 hover:bg-surface-2">
      <div>
        <p className="font-medium text-ink">{title}</p>
        {meta && <p className="text-sm text-muted">{meta}</p>}
      </div>
      {trailing}
    </Link>
  );
}
