import * as React from "react"
import { cn } from "@/utils/cn"
import { Loader2 } from "lucide-react"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "glass" | "outline" | "destructive"
    size?: "sm" | "md" | "lg" | "icon"
    isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-full font-serif font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95",
                    {
                        // Variants
                        "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90":
                            variant === "primary",
                        "bg-secondary text-secondary-foreground hover:bg-secondary/80":
                            variant === "secondary",
                        "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
                        "glass-panel text-foreground hover:bg-white/40": variant === "glass",
                        "border border-input bg-transparent hover:bg-accent text-foreground": variant === "outline",
                        "bg-red-500 text-white hover:bg-red-600": variant === "destructive",

                        // Sizes
                        "h-9 px-4 text-sm": size === "sm",
                        "h-11 px-8 text-base": size === "md",
                        "h-14 px-10 text-lg": size === "lg",
                        "h-10 w-10": size === "icon",
                    },
                    className
                )}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
