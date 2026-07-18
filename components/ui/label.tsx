import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    // Sits *below* Section in the hierarchy — a field label must not outweigh the group heading
    // that contains it. text-muted is reserved for hint copy.
    <label className={cn("mb-1.5 block text-[12px] font-medium text-fg-2", className)} {...props} />
  );
}
