"use client";

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  GameSettingsFields,
  settingsErrors,
} from "@/components/game-settings-fields";
import type { GameSettings, GameState } from "@/lib/game/types";

export function GameSettingsSheet({
  state,
  editable,
  onSave,
}: {
  state: GameState;
  editable: boolean;
  onSave: (settings: GameSettings) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(state.settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(state.settings);
    setError(null);
    setBusy(false);
  }, [open, state.settings]);

  const invalid = settingsErrors(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.settings);

  async function save() {
    if (!editable || invalid || !dirty) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(draft);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Game settings"
        title="Settings"
        className="pointer-events-auto ml-auto flex size-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white md:size-6 md:text-white/55"
      >
        <Settings className="size-4" />
      </SheetTrigger>
      <SheetContent
        side="right"
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
  );
}
