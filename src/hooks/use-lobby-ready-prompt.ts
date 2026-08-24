"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const TOAST_ID = "lobby-ready";

export function useLobbyReadyPrompt({
  active,
  onStart,
}: {
  active: boolean;
  onStart: () => void;
}) {
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;

  useEffect(() => {
    if (!active) {
      toast.dismiss(TOAST_ID);
      return;
    }

    toast("Everyone's here", {
      id: TOAST_ID,
      duration: Infinity,
      dismissible: false,
      closeButton: false,
      description: "Click start when you're ready to play.",
      action: {
        label: "Start",
        onClick: (event) => {
          event.preventDefault();
          onStartRef.current();
        },
      },
    });

    return () => {
      toast.dismiss(TOAST_ID);
    };
  }, [active]);
}
