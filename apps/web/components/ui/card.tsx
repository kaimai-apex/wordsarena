import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('glass-bubble rounded-bubble-lg p-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({
  className,
  children,
  variant = 'default',
}: {
  className?: string;
  children: React.ReactNode;
  variant?: 'default' | 'rating' | 'combo';
}) {
  const variants = {
    default: 'bg-accent-soft text-accent',
    rating: 'bg-teal/15 text-teal font-mono',
    combo: 'bg-mango/30 text-ink font-mono animate-pulse-soft',
  };
  return (
    <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold', variants[variant], className)}>
      {children}
    </span>
  );
}
