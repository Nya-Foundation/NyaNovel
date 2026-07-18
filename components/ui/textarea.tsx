import { cn } from "@/lib/utils";
import { fieldBase } from "./input";

export function Textarea({ className, ref, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      ref={ref}
      className={cn(
        fieldBase,
        "min-h-[88px] resize-y rounded-[var(--radius-input)] p-3 text-[14px] leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}
