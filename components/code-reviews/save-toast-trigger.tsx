"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/components/hooks/use-toast";

export default function SaveToastTrigger() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const saved = searchParams.get("saved");
    if (saved === "1") {
      toast({ title: "Audit enregistré", description: "Les modifications ont été sauvegardées." });
      // Optionally remove the param from URL without reload
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("saved");
        window.history.replaceState({}, "", url.toString());
      } catch (e) {
        // ignore
      }
    }
  }, [searchParams]);

  return null;
}
