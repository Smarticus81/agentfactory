import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    featured?: boolean;
  }
>(({ className, featured, style, ...props }, ref) => {
  const cardStyle = {
    fontFamily: 'Inter, sans-serif',
    ...style
  };

  if (featured) {
    return (
      <div
        ref={ref}
        className={cn("card relative p-1", className)}
        style={{
          background: 'linear-gradient(135deg, var(--primary-orange) 0%, #e55a2b 100%)',
          borderRadius: '16px',
          ...cardStyle
        }}
        {...props}
      >
        <div 
          className="card" 
          style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            margin: '0'
          }}
        >
          {props.children}
        </div>
      </div>
    );
  }
  
  return (
    <div
      ref={ref}
      className={cn("card", className)}
      style={cardStyle}
      {...props}
    />
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-2 mb-4", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("heading-sm", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("body-sm", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center mt-4", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };