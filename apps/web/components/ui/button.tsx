import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bouncy-hover',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-sunset text-white shadow-bubble hover:shadow-lg',
        secondary: 'bg-teal/15 text-teal border-2 border-teal/30 hover:bg-teal/25',
        ghost: 'hover:bg-accent-soft/50 text-ink-soft hover:text-ink',
        destructive: 'bg-danger text-white hover:bg-danger/90',
        ocean: 'bg-gradient-ocean text-white shadow-bubble',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-6 text-base',
        lg: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
