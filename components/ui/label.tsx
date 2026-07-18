import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label className={cn("mb-1.5 block text-[13px] font-semibold text-fg-2", className)} {...props} />
  );
}
