import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui-style button: variants via cva, classes merged with cn().
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none",
  {
    variants: {
      variant: {
        solid: "bg-white text-black hover:bg-white/90",
        quiet: "bg-sunken text-ink hover:bg-line",
        outline: "border border-line text-ink hover:border-line-strong hover:bg-fill",
        attention: "bg-act text-black hover:brightness-110",
        handoff: "bg-white text-black hover:brightness-110",
        ghost: "text-ink-2 hover:text-ink hover:bg-fill",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-[8px]",
        md: "h-11 px-4 text-[15px] rounded-control",
        icon: "size-11 rounded-full",
      },
    },
    defaultVariants: { variant: "quiet", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
