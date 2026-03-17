/**
 * Aceternity UI — Background Beams, Spotlight, 3D Card
 * Handcrafted Aceternity-inspired components
 */
import React, { useEffect, useRef } from "react"
import { cn } from "../../lib/utils"
import { motion } from "motion/react"

/**
 * Aceternity — Background Beams
 * Animated light beams for login/hero backgrounds
 */
export function BackgroundBeams({ className }: { className?: string }) {
  const beams = Array.from({ length: 10 }, (_, i) => ({
    left: `${8 + i * 9}%`,
    delay: `${i * 0.6}s`,
    duration: `${5 + (i % 4) * 1.5}s`,
    opacity: 0.3 + (i % 3) * 0.15,
    height: `${30 + (i % 5) * 15}vh`,
  }))

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {beams.map((beam, i) => (
        <motion.div
          key={i}
          className="absolute top-0 w-px"
          style={{
            left: beam.left,
            height: beam.height,
            background: "linear-gradient(180deg, transparent 0%, hsl(142.1 76.2% 36.3%) 50%, transparent 100%)",
            opacity: beam.opacity,
          }}
          animate={{
            y: ["-100%", "200vh"],
            opacity: [0, beam.opacity, beam.opacity, 0],
          }}
          transition={{
            duration: parseFloat(beam.duration),
            delay: parseFloat(beam.delay),
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  )
}

/**
 * Aceternity — Spotlight
 */
export function Spotlight({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className={cn("absolute pointer-events-none", className)}
      style={{
        width: "140%",
        aspectRatio: "1",
        top: "-50%",
        left: "-20%",
        background: "radial-gradient(circle at center, hsl(142.1 76.2% 36.3% / 0.12) 0%, transparent 65%)",
        borderRadius: "50%",
        filter: "blur(40px)",
      }}
    />
  )
}

/**
 * Aceternity — 3D Card Effect
 */
interface Card3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Card3D({ children, className, ...props }: Card3DProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -6
    const rotateY = ((x - centerX) / centerX) * 6
    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
  }

  const handleMouseLeave = () => {
    if (!cardRef.current) return
    cardRef.current.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)"
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative rounded-xl border border-border bg-card transition-transform duration-300 ease-out will-change-transform",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transformStyle: "preserve-3d" }}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Aceternity — Moving Border Button
 */
interface MovingBorderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  borderColor?: string
}

export function MovingBorderButton({ children, borderColor = "#10b981", className, ...props }: MovingBorderButtonProps) {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span
        className="absolute inset-0 rounded-md"
        style={{
          padding: "1px",
          background: `linear-gradient(var(--angle, 0deg), transparent 40%, ${borderColor} 50%, transparent 60%)`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          animation: "border-rotate 3s linear infinite",
        }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  )
}

/**
 * Aceternity — Animated Background Grid
 */
export function BackgroundGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn("absolute inset-0 pointer-events-none", className)}
      style={{
        backgroundImage: `
          linear-gradient(hsl(142.1 76.2% 36.3% / 0.03) 1px, transparent 1px),
          linear-gradient(90deg, hsl(142.1 76.2% 36.3% / 0.03) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }}
    />
  )
}
