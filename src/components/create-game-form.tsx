"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  GameSettingsFields,
  settingsErrors,
} from "@/components/game-settings-fields"
import { gameCode } from "@/lib/codes"
import { createGame, joinGame } from "@/lib/game/actions"
import { getIdentity } from "@/lib/identity"
import { buildUpDown } from "@/lib/oh-hell/pattern"
import { DEFAULT_BRIDGE_SETTINGS } from "@/lib/bridge/types"
import {
  DEFAULT_FORMULA,
  type GameSettings,
} from "@/lib/game/types"
import { rememberGame } from "@/lib/history"
import { getGameStore } from "@/lib/store"
import { gameTooltip } from "@/lib/game/rules"

const items = [
  { value: "oh-hell", label: "Oh Hell" },
  { value: "bridge", label: "Bridge" },
] as const

function defaultSettings(kind: GameSettings["kind"]): GameSettings {
  if (kind === "bridge") return { ...DEFAULT_BRIDGE_SETTINGS }
  return {
    kind: "oh-hell",
    seatCount: 2,
    pattern: buildUpDown(10),
    leadTrump: "after-broken",
    hook: true,
    scoring: DEFAULT_FORMULA,
  }
}

export function CreateGameForm() {
  const router = useRouter()
  const [settings, setSettings] = useState<GameSettings>(defaultSettings("oh-hell"))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invalid = settingsErrors(settings)

  async function onCreate() {
    if (invalid) return
    setBusy(true)
    setError(null)
    try {
      const code = gameCode()
      const identity = getIdentity()
      const state = joinGame(createGame(settings), identity.id, identity.name)
      await getGameStore().create({ code, kind: settings.kind, state })
      rememberGame({
        code,
        kind: settings.kind,
        title: state.title,
        summary: gameTooltip(settings),
      })
      router.push(`/${code}`)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create the game"
      )
      setBusy(false)
    }
  }

  return (
    <div className="felt-ui mx-auto w-full max-w-lg space-y-8">
      <section className="space-y-3">
        <Label>Game</Label>
        <Select
          value={settings.kind}
          onValueChange={(value) =>
            value && setSettings(defaultSettings(value as GameSettings["kind"]))
          }
          items={[...items]}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Games</SelectLabel>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </section>

      <GameSettingsFields value={settings} onChange={setSettings} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between gap-4">
        <Button
          size="lg"
          onClick={() => void onCreate()}
          disabled={busy || Boolean(invalid)}
        >
          {busy ? "Creating" : "Create game"}
        </Button>
      </div>
    </div>
  )
}
