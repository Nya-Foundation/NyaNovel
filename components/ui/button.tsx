import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "./slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold cursor-pointer transition-[filter,background-color,color,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-on-accent shadow-[var(--glow-accent)] hover:brightness-[1.07] active:brightness-[0.97]",
        secondary: "bg-surface-2 text-fg hover:bg-surface-3",
        outline: "border border-border text-fg-2 hover:bg-surface-2 hover:text-fg",
        ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg",
        destructive: "bg-danger-bg text-on-accent hover:brightness-[1.08]",
      },
      size: {
        default: "h-11 px-[18px] text-[14px] rounded-[var(--radius-button)]",
        sm: "h-9 px-3 text-[13px] rounded-[9px]",
        lg: "h-12 px-6 text-[15px] rounded-[11px]",
        icon: "h-10 w-10 rounded-[10px]",
        "icon-sm": "h-8 w-8 rounded-[8px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
