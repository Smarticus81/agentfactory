"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min: number;
  max: number;
  step: number;
  className?: string;
}

const Slider = React.forwardRef<
  HTMLInputElement,
  SliderProps
>(({ className, value, onValueChange, min, max, step, ...props }, ref) => (
  <input
    ref={ref}
    type="range"
    min={min}
    max={max}
    step={step}
    value={value[0]}
    onChange={(e) => onValueChange([parseFloat(e.target.value)])}
    className={cn(
      "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700",
      "slider:bg-blue-500 slider:rounded-lg slider:appearance-none slider:h-2",
      className
    )}
    {...props}
  />
))
Slider.displayName = "Slider"

export { Slider }
