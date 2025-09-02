import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "btn-primary",
        primary: "btn-primary",
        secondary: "btn-secondary",
        ghost: "bg-transparent border-0 px-4 py-2 text-secondary hover:bg-secondary rounded-lg",
        destructive: "bg-red-500 text-white border-0 px-4 py-2 rounded-lg hover:bg-red-600 hover:transform hover:translate-y-[-1px] hover:shadow-lg",
        outline: "btn-secondary",
        link: "text-orange-500 underline-offset-4 hover:underline p-0 bg-transparent border-0",
        gradient: "bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg hover:shadow-xl hover:transform hover:translate-y-[-1px]",
      },
      size: {
        default: "text-base px-6 py-3",
        sm: "text-sm px-4 py-2",
        lg: "text-lg px-8 py-4",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={{
          fontFamily: 'Inter, sans-serif',
          ...style
        }}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };