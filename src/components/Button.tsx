import React from 'react';
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        primary:   "bg-gradient-to-r from-cyan-600 to-teal-600 text-white hover:from-cyan-500 hover:to-teal-500 shadow-sm border border-transparent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        outline:   "border border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground",
        ghost:     "text-muted-foreground hover:bg-muted hover:text-foreground",
        danger:    "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200",
        default:   "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
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
