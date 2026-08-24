import { PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export function SidebarToggleIcon({
  pinned,
  className,
}: {
  pinned?: boolean
  className?: string
}) {
  if (!pinned) {
    return <PanelLeft className={cn("size-3.5", className)} aria-hidden />
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-3.5", className)}
      aria-hidden
    >
      <path
        d="M5 3h4v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
        fill="currentColor"
        stroke="none"
      />
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
  )
}
