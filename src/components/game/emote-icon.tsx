import type { ReactNode } from "react"
import type { TableEmote } from "@/lib/emotes"
import { cn } from "@/lib/utils"

type IconProps = {
  className?: string
}

function Face({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("size-[1em] overflow-visible", className)}
    >
      <circle cx="16" cy="16" r="14" fill="#F6C84C" />
      <circle cx="11" cy="11" r="5" fill="#fff" opacity="0.22" />
      {children}
    </svg>
  )
}

function HeartIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("size-[1em] overflow-visible", className)}
    >
      <path
        d="M16 27c-.4 0-8.8-5.3-11.4-10.2C2.6 13.5 3.7 8.8 7.4 7.2c2.2-.9 4.6-.2 6.1 1.5L16 11l2.5-2.3c1.5-1.7 3.9-2.4 6.1-1.5 3.7 1.6 4.8 6.3 2.8 9.6C24.8 21.7 16.4 27 16 27Z"
        fill="#F2557A"
      />
      <path
        d="M10.2 10.4c1.3-.7 2.8-.3 3.7.8"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  )
}

function ThumbsUpIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("size-[1em] overflow-visible", className)}
    >
      <path
        d="M13.2 13.2V8.4c0-2 1.3-3.4 3-3.4 1.2 0 2.2 1.1 2.2 2.8v5.4h5.1c1.8 0 3.1 1.6 2.8 3.3l-1.3 7.2c-.3 1.5-1.6 2.5-3.1 2.5H12.4c-1.3 0-2.4-1-2.5-2.3l-.7-8.2c-.1-1.4 1-2.5 2.4-2.5h1.6Z"
        fill="#6FCF97"
      />
      <path
        d="M8.4 14.2h2.8v12.2H9.2c-1.3 0-2.4-1.1-2.4-2.4V16.6c0-1.3 1.1-2.4 2.4-2.4h-.8Z"
        fill="#57B87F"
      />
      <path
        d="M16.2 6.4c.7 0 1.3.7 1.3 1.8v4.2"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  )
}

function ThumbsDownIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("size-[1em] overflow-visible", className)}
    >
      <g transform="rotate(180 16 16)">
        <path
          d="M13.2 13.2V8.4c0-2 1.3-3.4 3-3.4 1.2 0 2.2 1.1 2.2 2.8v5.4h5.1c1.8 0 3.1 1.6 2.8 3.3l-1.3 7.2c-.3 1.5-1.6 2.5-3.1 2.5H12.4c-1.3 0-2.4-1-2.5-2.3l-.7-8.2c-.1-1.4 1-2.5 2.4-2.5h1.6Z"
          fill="#F07167"
        />
        <path
          d="M8.4 14.2h2.8v12.2H9.2c-1.3 0-2.4-1.1-2.4-2.4V16.6c0-1.3 1.1-2.4 2.4-2.4h-.8Z"
          fill="#E0554C"
        />
      </g>
    </svg>
  )
}

function BubbleHa({ y }: { y: number }) {
  return (
    <g transform={`translate(4 ${y})`}>
      {/* H */}
      <rect x="0" y="1.2" width="3.6" height="12.2" rx="1.8" />
      <rect x="7.6" y="1.2" width="3.6" height="12.2" rx="1.8" />
      <rect x="1.8" y="5.3" width="7.6" height="3.6" rx="1.8" />
      {/* a — matches H baseline, sits at x-height */}
      <path
        fillRule="evenodd"
        d="M16.2 3.5c2.7 0 4.95 2.2 4.95 4.95s-2.25 4.95-4.95 4.95-4.95-2.2-4.95-4.95 2.25-4.95 4.95-4.95Zm0 3.15c-1.2 0-2 .9-2 1.8s.8 1.8 2 1.8 2.05-.9 2.05-1.8-.85-1.8-2.05-1.8Z"
      />
      <rect x="18" y="3.5" width="3.3" height="9.9" rx="1.65" />
    </g>
  )
}

function HahaIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="#6CCFFF"
      aria-hidden
      className={cn("size-[1em] overflow-visible", className)}
    >
      <BubbleHa y={0.4} />
      <BubbleHa y={16} />
    </svg>
  )
}

function LaughIcon({ className }: IconProps) {
  return (
    <Face className={className}>
      <path
        d="M8.5 13.2c1.2-1.8 3-1.8 4.2 0"
        stroke="#5C3D14"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M19.3 13.2c1.2-1.8 3-1.8 4.2 0"
        stroke="#5C3D14"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.2 18.8c1.6 3.4 4 5.1 6.8 5.1s5.2-1.7 6.8-5.1"
        fill="#5C3D14"
      />
      <path
        d="M11.4 19.4c1.2 1.8 2.7 2.7 4.6 2.7s3.4-.9 4.6-2.7"
        fill="#F2557A"
      />
    </Face>
  )
}

function ExclaimIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("size-[1em] overflow-visible", className)}
    >
      <circle cx="16" cy="16" r="14" fill="#F6C84C" />
      <circle cx="11" cy="11" r="5" fill="#fff" opacity="0.22" />
      <path
        d="M11.4 8.8c0-.9.7-1.6 1.6-1.6h1.2c.9 0 1.6.7 1.6 1.6l-.5 10.2c0 .7-.6 1.3-1.3 1.3h-.8c-.7 0-1.3-.6-1.3-1.3l-.5-10.2Z"
        fill="#5C3D14"
      />
      <path
        d="M16.6 8.8c0-.9.7-1.6 1.6-1.6h1.2c.9 0 1.6.7 1.6 1.6l-.5 10.2c0 .7-.6 1.3-1.3 1.3h-.8c-.7 0-1.3-.6-1.3-1.3l-.5-10.2Z"
        fill="#5C3D14"
      />
      <circle cx="13.8" cy="24.2" r="1.7" fill="#5C3D14" />
      <circle cx="19" cy="24.2" r="1.7" fill="#5C3D14" />
    </svg>
  )
}

function QuestionIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("size-[1em] overflow-visible", className)}
    >
      <circle cx="16" cy="16" r="14" fill="#7EB6FF" />
      <circle cx="11" cy="11" r="5" fill="#fff" opacity="0.22" />
      <path
        d="M12.2 12.4c.3-2.4 2.2-4 4.4-4 2.4 0 4.3 1.5 4.3 3.8 0 1.7-1 2.7-2.6 3.6-1.2.7-1.8 1.4-1.8 2.7v.6"
        stroke="#1F3A5F"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="16.4" cy="23.4" r="1.7" fill="#1F3A5F" />
    </svg>
  )
}

function SobIcon({ className }: IconProps) {
  return (
    <Face className={className}>
      <path
        d="M8.8 13.6c1.3 1.5 3.2 1.5 4.5 0"
        stroke="#5C3D14"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M18.7 13.6c1.3 1.5 3.2 1.5 4.5 0"
        stroke="#5C3D14"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <ellipse cx="16" cy="22.2" rx="4.2" ry="3.2" fill="#5C3D14" />
      <ellipse cx="16" cy="22.8" rx="2.4" ry="1.5" fill="#F2557A" />
      <path
        d="M10.6 16c0 2.6-1.3 5-1.3 5s-1.3-2.4-1.3-5 1.3-2.4 1.3-2.4 1.3.9 1.3 2.4Z"
        fill="#6EC6FF"
      />
      <path
        d="M23.4 16c0 2.6-1.3 5-1.3 5s-1.3-2.4-1.3-5 1.3-2.4 1.3-2.4 1.3.9 1.3 2.4Z"
        fill="#6EC6FF"
      />
    </Face>
  )
}

const ICONS: Record<TableEmote, (props: IconProps) => ReactNode> = {
  heart: HeartIcon,
  "thumbs-up": ThumbsUpIcon,
  "thumbs-down": ThumbsDownIcon,
  haha: HahaIcon,
  laugh: LaughIcon,
  exclaim: ExclaimIcon,
  question: QuestionIcon,
  sob: SobIcon,
}

export function EmoteIcon({
  emote,
  className,
}: {
  emote: TableEmote
  className?: string
}) {
  const Icon = ICONS[emote]
  return <Icon className={className} />
}
