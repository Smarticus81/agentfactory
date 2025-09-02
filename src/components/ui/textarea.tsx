import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-DEFAULT px-4 py-3 text-body resize-none",
          "bg-panel border border-hairline",
          "text-text-primary dark:text-text-primary-dark",
          "placeholder:text-text-secondary dark:placeholder:text-text-secondary-dark",
          "transition-all duration-180 ease-smooth",
          "hover:shadow-button hover:border-accent-border",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:border-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };