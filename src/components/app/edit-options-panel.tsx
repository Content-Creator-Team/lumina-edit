import { useQuery } from "@tanstack/react-query";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AspectRatio, EditOptions } from "@/lib/api-types";
import { musicStylesQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const DEFAULT_EDIT_OPTIONS: EditOptions = {
  aspect_ratio: null,
  target_duration: null,
  music_preference: "auto",
  captions: true,
  intensity: 0.5,
  keep_original_audio: true,
  instructions: "",
  auto_render: false,
};

const ASPECTS: Array<{ id: AspectRatio | "template"; label: string }> = [
  { id: "template", label: "Template" },
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
  { id: "1:1", label: "1:1" },
  { id: "4:5", label: "4:5" },
];

const LENGTHS = [
  { id: "template", label: "Template default" },
  { id: "15", label: "15 seconds" },
  { id: "30", label: "30 seconds" },
  { id: "60", label: "1 minute" },
  { id: "180", label: "3 minutes" },
  { id: "600", label: "10 minutes" },
];

/** Compact creative options (aspect, length, music, captions, intensity…). */
export function EditOptionsPanel({
  value,
  onChange,
  disabled,
}: {
  value: EditOptions;
  onChange: (next: EditOptions) => void;
  disabled?: boolean;
}) {
  const { data: music } = useQuery(musicStylesQuery());
  const set = (patch: Partial<EditOptions>) => onChange({ ...value, ...patch });
  const styles = music?.styles?.length
    ? music.styles
    : [
        { id: "auto", label: "Auto" },
        { id: "none", label: "No music" },
      ];

  return (
    <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label className="text-xs">Aspect ratio</Label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {ASPECTS.map((a) => {
            const active = (value.aspect_ratio ?? "template") === a.id;
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={active}
                onClick={() => set({ aspect_ratio: a.id === "template" ? null : a.id })}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs",
                  active
                    ? "border-primary bg-accent/50 text-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label className="text-xs">Target length</Label>
        <Select
          value={value.target_duration ? String(value.target_duration) : "template"}
          onValueChange={(v) => set({ target_duration: v === "template" ? null : Number(v) })}
        >
          <SelectTrigger className="mt-1.5 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LENGTHS.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Music</Label>
        <Select
          value={value.music_preference ?? "auto"}
          onValueChange={(v) => set({ music_preference: v })}
        >
          <SelectTrigger className="mt-1.5 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {styles.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="sm:col-span-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Edit intensity</Label>
          <span className="text-xs text-muted-foreground">
            {(value.intensity ?? 0.5) < 0.34
              ? "Gentle"
              : (value.intensity ?? 0.5) < 0.67
                ? "Balanced"
                : "Aggressive"}
          </span>
        </div>
        <Slider
          className="mt-2"
          min={0}
          max={1}
          step={0.05}
          value={[value.intensity ?? 0.5]}
          onValueChange={([v]) => set({ intensity: v ?? 0.5 })}
          aria-label="Edit intensity"
        />
      </div>

      <ToggleRow
        label="Burned-in captions"
        checked={value.captions ?? true}
        onChange={(v) => set({ captions: v })}
      />
      <ToggleRow
        label="Keep original audio"
        checked={value.keep_original_audio ?? true}
        onChange={(v) => set({ keep_original_audio: v })}
      />
      <ToggleRow
        label="Render automatically when the plan is ready"
        checked={value.auto_render ?? false}
        onChange={(v) => set({ auto_render: v })}
        className="sm:col-span-2"
      />

      <div className="sm:col-span-2">
        <Label htmlFor="edit-instructions" className="text-xs">
          Instructions (optional)
        </Label>
        <Textarea
          id="edit-instructions"
          className="mt-1.5 min-h-16 text-sm"
          placeholder="e.g. Keep the product demo, cut the intro small talk"
          value={value.instructions ?? ""}
          maxLength={1000}
          onChange={(e) => set({ instructions: e.target.value })}
        />
      </div>
    </fieldset>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  className,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <label className={cn("flex items-center justify-between gap-3 text-sm", className)}>
      <span className="text-xs text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** Drops empty values so the backend applies its own defaults. */
export function cleanEditOptions(options: EditOptions): EditOptions {
  const out: EditOptions = {};
  (Object.entries(options) as Array<[keyof EditOptions, unknown]>).forEach(([k, v]) => {
    if (v === null || v === undefined || v === "") return;
    (out as Record<string, unknown>)[k] = v;
  });
  if (out.music_preference === "auto") delete out.music_preference;
  return out;
}
