"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";

type Props = {
  initialWarnings?: string[];
  name?: string;
  value?: string[]; // controlled
  onChange?: (warnings: string[]) => void;
};

export default function GlobalWarningsEditor({
  initialWarnings = [],
  name = "globalWarnings",
  value,
  onChange,
}: Props) {
  const [warnings, setWarnings] = useState<string[]>(
    value !== undefined ? value : initialWarnings.length > 0 ? [...initialWarnings] : [""]
  );

  useEffect(() => {
    if (value !== undefined) setWarnings(value);
  }, [value]);

  const update = (idx: number, val: string) => {
    const next = [...warnings];
    next[idx] = val;
    if (value === undefined) setWarnings(next);
    onChange?.(next);
  };

  const add = () => {
    const next = [...warnings, ""];
    if (value === undefined) setWarnings(next);
    onChange?.(next);
  };

  const remove = (idx: number) => {
    const next = warnings.filter((_, i) => i !== idx);
    if (value === undefined) setWarnings(next);
    onChange?.(next);
  };

  return (
    <div className="space-y-2">
      {warnings.map((w, i) => (
        <div key={i} className="flex gap-2">
          <Input
            name={name}
            value={w}
            onChange={(e) => update(i, e.target.value)}
            placeholder="Ex: Gestion des erreurs incomplète"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => remove(i)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4 mr-2" /> Ajouter un warning
        </Button>
      </div>
    </div>
  );
}
