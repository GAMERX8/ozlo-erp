"use client"

import * as React from "react"
import { Eye, EyeOff, ArrowUpFromLine } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface PasswordInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ className, ...props }, ref) => {
        const [showPassword, setShowPassword] = React.useState(false)
        const [capsLock, setCapsLock] = React.useState(false)

        const handleCapsLock = (
            e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>
        ) => {
            if (e.getModifierState) {
                setCapsLock(e.getModifierState("CapsLock"))
            }
        }

        return (
            <div className="relative">
                <Input
                    type={showPassword ? "text" : "password"}
                    className={cn("pr-20", className)}
                    ref={ref}
                    {...props}
                    onKeyDown={(e) => {
                        handleCapsLock(e)
                        props.onKeyDown?.(e)
                    }}
                    onKeyUp={(e) => {
                        handleCapsLock(e)
                        props.onKeyUp?.(e)
                    }}
                    onClick={(e) => {
                        handleCapsLock(e)
                        props.onClick?.(e)
                    }}
                />
                {capsLock && (
                    <div className="absolute right-9 top-0 h-full flex items-center px-2 pointer-events-none">
                        <ArrowUpFromLine className="h-4 w-4 text-amber-500" aria-hidden="true" />
                    </div>
                )}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                >
                    {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span className="sr-only">
                        {showPassword ? "Hide password" : "Show password"}
                    </span>
                </Button>
            </div>
        )
    }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
