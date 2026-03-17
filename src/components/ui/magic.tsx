/**
 * Magic UI — Shimmer Button
 * A button with an animated shimmer sweep effect
 */
import React from "react"
import { cn } from "../../lib/utils"

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string
  shimmerSize?: string
  shimmerDuration?: string
  borderRadius?: string
  background?: string
  children: React.ReactNode
}

export function ShimmerButton({
  shimmerColor = "rgba(255,255,255,0.2)",
  shimmerSize = "0.1em",
  shimmerDuration = "2s",
  borderRadius = "8px",
  background = "hsl(142.1 76.2% 36.3%)",
  className,
  children,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      style={{
        "--shimmer-color": shimmerColor,
        "--shimmer-size": shimmerSize,
        "--shimmer-duration": shimmerDuration,
        "--border-radius": borderRadius,
        "--background": background,
        background: background,
      } as React.CSSProperties}
      className={cn(
        "group relative flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-[--border-radius] px-6 py-2.5 text-white text-sm font-semibold shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {/* Shimmer layer */}
      <span
        className="absolute inset-0 overflow-hidden rounded-[inherit]"
        style={{ borderRadius }}
      >
        <span
          className="absolute top-0 left-[-200%] h-full w-1/2 rotate-12 opacity-0 group-hover:opacity-100"
          style={{
            background: `linear-gradient(90deg, transparent, ${shimmerColor}, transparent)`,
            animation: `shimmerSweep ${shimmerDuration} ease-in-out infinite`,
          }}
        />
      </span>
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <style>{`
        @keyframes shimmerSweep {
          0%   { left: -200%; }
          100% { left: 200%;  }
        }
      `}</style>
    </button>
  )
}

/**
 * Magic UI — Animated Gradient Text
 */
interface AnimatedGradientTextProps {
  children: React.ReactNode
  className?: string
  gradient?: string
}

export function AnimatedGradientText({
  children,
  className,
  gradient = "linear-gradient(90deg, #10b981 0%, #34d399 25%, #6ee7b7 50%, #34d399 75%, #10b981 100%)",
}: AnimatedGradientTextProps) {
  return (
    <span
      className={cn("inline-block bg-clip-text text-transparent", className)}
      style={{
        backgroundImage: gradient,
        backgroundSize: "200% auto",
        animation: "shimmer 3s linear infinite",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      {children}
    </span>
  )
}

/**
 * Magic UI — Glow Card wrapper
 */
interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowColor?: string
}

export function GlowCard({ glowColor = "hsl(142.1 76.2% 36.3% / 0.3)", className, children, ...props }: GlowCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card p-px overflow-hidden transition-all duration-300 group hover:scale-[1.01]",
        className
      )}
      {...props}
    >
      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none"
        style={{ boxShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor}` }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

/**
 * Magic UI — Dot/Particle Background
 */
export function DotBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn("fixed inset-0 pointer-events-none z-0", className)}
      style={{
        backgroundImage: "radial-gradient(hsl(142.1 76.2% 36.3% / 0.06) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />
  )
}

/**
 * Magic UI — Number Badge
 */
export function MagicBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      "relative inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary before:absolute before:inset-0 before:rounded-full before:bg-primary/5",
      className
    )}>
      {children}
    </span>
  )
}
