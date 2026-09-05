"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  GameSettingsFields,
  settingsErrors,
} from "@/components/game-settings-fields"
import type { GameSettings, GameState } from "@/lib/game/types"

export function GameSettingsSheet({
  open,
  onOpenChange,
  state,
  editable,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: GameState
  editable: boolean
  onSave: (settings: GameSettings) => void | Promise<void>
}) {
  const [draft, setDraft] = useState(state.settings)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(false)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setDraft(state.settings)
      setError(null)
      setBusy(false)
    }
  }

  const invalid = settingsErrors(draft)
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.settings)

  async function save() {
    if (!editable || invalid || !dirty) return
    setBusy(true)
    setError(null)
    try {
      await onSave(draft)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings")
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="felt-ui gap-0 border-white/15 bg-[#16352b] p-0 text-white sm:max-w-md"
      >
        <SheetHeader className="border-b border-white/10">
          <SheetTitle className="text-white">Settings</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <GameSettingsFields
            value={draft}
            onChange={setDraft}
            disabled={!editable}
          />
          {error && <p className="mt-6 text-sm text-destructive">{error}</p>}
        </div>
        {editable && (
          <SheetFooter className="border-t border-white/10">
            <Button
              size="lg"
              onClick={() => void save()}
              disabled={busy || Boolean(invalid) || !dirty}
            >
              {busy ? "Saving" : "Save settings"}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
