import { cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal Slot: merges its props/className onto its single child element.
 * Lets components like Button render `asChild` without pulling in @radix-ui/react-slot.
 */
export function Slot({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  if (!isValidElement(children)) return null;
  const child = children as React.ReactElement<Record<string, unknown>>;
  return cloneElement(child, {
    ...props,
    ...child.props,
    className: cn(className, child.props.className as string | undefined),
  });
}
