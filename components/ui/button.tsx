import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "ui-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-[background-color,box-shadow,transform,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-border bg-card text-foreground shadow-none hover:border-primary/40 hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-none hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-4 py-2.5",
        sm: "min-h-10 rounded-lg px-3.5 text-sm",
        lg: "min-h-12 rounded-lg px-6 text-base",
        icon: "h-11 w-11",
        "icon-sm": "h-10 w-10 rounded-lg [&_svg]:size-4",
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
