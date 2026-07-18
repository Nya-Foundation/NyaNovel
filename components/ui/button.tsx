import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold cursor-pointer transition-[filter,background-color,color,border-color,transform] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Every variant presses. Only `default` used to, so the same gesture felt responsive on the
        // Generate button and completely dead on the four buttons next to it.
        default: "bg-accent text-on-accent shadow-[var(--glow-accent)] hover:brightness-[1.07] active:brightness-[0.97] active:scale-[0.985]",
        secondary: "bg-surface-2 text-fg hover:bg-surface-3 active:bg-surface-3 active:scale-[0.985]",
        outline: "border border-border text-fg-2 hover:bg-surface-2 hover:text-fg active:bg-surface-3 active:scale-[0.985]",
        ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg active:bg-surface-3 active:scale-[0.985]",
        // `--on-accent` is the accent's foreground, correct here only by coincidence. Danger
        // backgrounds are saturated in both themes, so white is the deliberate choice.
        destructive: "bg-danger-bg text-white hover:brightness-[1.08] active:brightness-[0.95] active:scale-[0.985]",
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

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
