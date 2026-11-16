import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "ui-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-base font-semibold transition-[background-color,box-shadow,transform,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm shadow-orange-200/40 hover:bg-primary/90 hover:shadow-md hover:shadow-orange-200/50",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-primary/25 bg-card shadow-none hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-12 px-6 py-3",
        sm: "min-h-11 rounded-full px-5 text-sm",
        lg: "min-h-14 rounded-full px-8 text-lg",
        icon: "h-12 w-12",
        "icon-sm": "h-11 w-11 rounded-full [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  render?: React.ReactElement | ((...args: any[]) => React.ReactElement);
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, render, ...props }, ref) => {
    const useSlot = asChild || !!render;
    const Comp = useSlot ? Slot : "button";
    const finalProps = {
      className: cn(buttonVariants({ variant, size, className })),
      ref,
      ...props,
    };
    if (render) {
      const rendered =
        typeof render === "function" ? render(finalProps) : render;
      return <Slot {...finalProps}>{rendered}</Slot>;
    }
    return <Comp {...finalProps} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
