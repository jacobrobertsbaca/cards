import type { ReactNode } from "react"
import type { TableEmote } from "@/lib/emotes"
import { cn } from "@/lib/utils"

type IconProps = {
  className?: string
  animated?: boolean
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

function HeartIcon({ className, animated }: IconProps) {
  const rest =
    "M16 27c-.4 0-8.8-5.3-11.4-10.2C2.6 13.5 3.7 8.8 7.4 7.2c2.2-.9 4.6-.2 6.1 1.5L16 11l2.5-2.3c1.5-1.7 3.9-2.4 6.1-1.5 3.7 1.6 4.8 6.3 2.8 9.6C24.8 21.7 16.4 27 16 27Z"
  // Same command structure — lobes swell outward on the beat.
  const soft =
    "M16 27c-.45 0-9.4-5.15-12-9.9C2.1 13.8 3.3 8.4 7.3 6.7c2.35-1 4.95 0 6.5 1.8L16 10.6l2.2-2.1c1.55-1.8 4.15-2.8 6.5-1.8 4 1.7 5.2 6.9 3 10.5C25.5 22 16.45 27 16 27Z"
  const thump =
    "M16 27.15c-.5 0-10-4.9-12.6-9.5C1.6 14.2 2.9 7.9 7.1 6c2.5-1.15 5.3.15 6.9 2.1L16 10.1l2.05-1.95c1.6-1.95 4.4-3.15 6.9-2 4.3 1.9 5.6 7.5 3.15 11.1C26.1 22.5 16.5 27.15 16 27.15Z"

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("size-[1em] overflow-visible", className)}
    >
      <path className="emote-heart-body" d={rest} fill="#F2557A">
        {animated && (
          <animate
            attributeName="d"
            dur="0.85s"
            begin="0.22s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.12;0.24;0.36;0.5;1"
            keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
            values={`${rest};${soft};${rest};${thump};${rest};${rest}`}
          />
        )}
      </path>
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
      <g className="emote-thumb-digit">
        <path
          d="M13.2 13.2V8.4c0-2 1.3-3.4 3-3.4 1.2 0 2.2 1.1 2.2 2.8v5.4h5.1c1.8 0 3.1 1.6 2.8 3.3l-1.3 7.2c-.3 1.5-1.6 2.5-3.1 2.5H12.4c-1.3 0-2.4-1-2.5-2.3l-.7-8.2c-.1-1.4 1-2.5 2.4-2.5h1.6Z"
          fill="#6FCF97"
        />
        <path
          d="M16.2 6.4c.7 0 1.3.7 1.3 1.8v4.2"
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.4"
        />
      </g>
      <path
        className="emote-thumb-base"
        d="M8.4 14.2h2.8v12.2H9.2c-1.3 0-2.4-1.1-2.4-2.4V16.6c0-1.3 1.1-2.4 2.4-2.4h-.8Z"
        fill="#57B87F"
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
        <g className="emote-thumb-digit">
          <path
            d="M13.2 13.2V8.4c0-2 1.3-3.4 3-3.4 1.2 0 2.2 1.1 2.2 2.8v5.4h5.1c1.8 0 3.1 1.6 2.8 3.3l-1.3 7.2c-.3 1.5-1.6 2.5-3.1 2.5H12.4c-1.3 0-2.4-1-2.5-2.3l-.7-8.2c-.1-1.4 1-2.5 2.4-2.5h1.6Z"
            fill="#F07167"
          />
        </g>
        <path
          className="emote-thumb-base"
          d="M8.4 14.2h2.8v12.2H9.2c-1.3 0-2.4-1.1-2.4-2.4V16.6c0-1.3 1.1-2.4 2.4-2.4h-.8Z"
          fill="#E0554C"
        />
      </g>
    </svg>
  )
}

function BubbleHa({ y, className }: { y: number; className?: string }) {
  return (
    <g transform={`translate(4 ${y})`}>
      <g className={className}>
        <rect x="0" y="1.2" width="3.6" height="12.2" rx="1.8" />
        <rect x="7.6" y="1.2" width="3.6" height="12.2" rx="1.8" />
        <rect x="1.8" y="5.3" width="7.6" height="3.6" rx="1.8" />
        <path
          fillRule="evenodd"
          d="M16.2 3.5c2.7 0 4.95 2.2 4.95 4.95s-2.25 4.95-4.95 4.95-4.95-2.2-4.95-4.95 2.25-4.95 4.95-4.95Zm0 3.15c-1.2 0-2 .9-2 1.8s.8 1.8 2 1.8 2.05-.9 2.05-1.8-.85-1.8-2.05-1.8Z"
        />
        <rect x="18" y="3.5" width="3.3" height="9.9" rx="1.65" />
      </g>
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
      <BubbleHa y={0.4} className="emote-haha-line" />
      <BubbleHa y={16} className="emote-haha-line emote-haha-line--late" />
    </svg>
  )
}

function LaughIcon({ className }: IconProps) {
  return (
    <Face className={className}>
      <path
        className="emote-laugh-eye emote-laugh-eye--left"
        d="M8.5 13.2c1.2-1.8 3-1.8 4.2 0"
        stroke="#5C3D14"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        className="emote-laugh-eye emote-laugh-eye--right"
        d="M19.3 13.2c1.2-1.8 3-1.8 4.2 0"
        stroke="#5C3D14"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <g className="emote-laugh-mouth">
        <path
          d="M9.2 18.8c1.6 3.4 4 5.1 6.8 5.1s5.2-1.7 6.8-5.1"
          fill="#5C3D14"
        />
        <path
          className="emote-laugh-tongue"
          d="M11.4 19.4c1.2 1.8 2.7 2.7 4.6 2.7s3.4-.9 4.6-2.7"
          fill="#F2557A"
        />
      </g>
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
      <g className="emote-bang emote-bang--left">
        <path
          d="M11.4 8.8c0-.9.7-1.6 1.6-1.6h1.2c.9 0 1.6.7 1.6 1.6l-.5 10.2c0 .7-.6 1.3-1.3 1.3h-.8c-.7 0-1.3-.6-1.3-1.3l-.5-10.2Z"
          fill="#5C3D14"
        />
        <circle cx="13.8" cy="24.2" r="1.7" fill="#5C3D14" />
      </g>
      <g className="emote-bang emote-bang--right">
        <path
          d="M16.6 8.8c0-.9.7-1.6 1.6-1.6h1.2c.9 0 1.6.7 1.6 1.6l-.5 10.2c0 .7-.6 1.3-1.3 1.3h-.8c-.7 0-1.3-.6-1.3-1.3l-.5-10.2Z"
          fill="#5C3D14"
        />
        <circle cx="19" cy="24.2" r="1.7" fill="#5C3D14" />
      </g>
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
        className="emote-question-mark"
        d="M12.2 12.4c.3-2.4 2.2-4 4.4-4 2.4 0 4.3 1.5 4.3 3.8 0 1.7-1 2.7-2.6 3.6-1.2.7-1.8 1.4-1.8 2.7v.6"
        stroke="#1F3A5F"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle
        className="emote-question-dot"
        cx="16.4"
        cy="23.4"
        r="1.7"
        fill="#1F3A5F"
      />
    </svg>
  )
}

function SobIcon({ className }: IconProps) {
  return (
    <Face className={className}>
      <path
        className="emote-sob-eye emote-sob-eye--left"
        d="M8.8 13.6c1.3 1.5 3.2 1.5 4.5 0"
        stroke="#5C3D14"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        className="emote-sob-eye emote-sob-eye--right"
        d="M18.7 13.6c1.3 1.5 3.2 1.5 4.5 0"
        stroke="#5C3D14"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <g className="emote-sob-mouth">
        <ellipse cx="16" cy="22.2" rx="4.2" ry="3.2" fill="#5C3D14" />
        <ellipse cx="16" cy="22.8" rx="2.4" ry="1.5" fill="#F2557A" />
      </g>
      <path
        className="emote-tear"
        d="M10.6 16c0 2.6-1.3 5-1.3 5s-1.3-2.4-1.3-5 1.3-2.4 1.3-2.4 1.3.9 1.3 2.4Z"
        fill="#6EC6FF"
      />
      <path
        className="emote-tear emote-tear--late"
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
  animated,
}: {
  emote: TableEmote
  className?: string
  animated?: boolean
}) {
  const Icon = ICONS[emote]
  return <Icon className={className} animated={animated} />
}
