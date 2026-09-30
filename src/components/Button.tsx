import React from 'react';
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:   "bg-primary text-primary-foreground hover:bg-primary/90 border border-transparent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-transparent",
        outline:   "border border-input bg-card text-primary hover:bg-accent",
        ghost:     "text-icon hover:bg-accent hover:text-foreground",
        danger:    "bg-danger-subtle text-danger hover:bg-danger-subtle/70 border border-danger/25",
        default:   "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-transparent",
      },
      size: {
        sm:      "h-8 px-3 text-xs",
        md:      "h-10 px-4 py-2 text-sm",
        lg:      "h-12 px-8 text-base",
        icon:    "h-10 w-10 p-2",
        default: "h-10 px-4 py-2 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  className?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant, size, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
