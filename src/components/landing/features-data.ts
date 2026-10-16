import {
  Image, Link2, Scissors, MonitorSmartphone, ShieldCheck, Captions, Languages, Layers,
  type LucideIcon,
} from "lucide-react";

export type FeatureStatus = "available" | "integration";

export const FEATURES: {
  icon: LucideIcon;
  title: string;
  body: string;
  status: FeatureStatus;
  note: string;
}[] = [
  { icon: Scissors, title: "Long Video → Short Clips", body: "AI finds highlight moments in your footage and suggests editable clips.", status: "available", note: "Live in AI Highlights." },
  { icon: Layers, title: "Multi-Video Editing", body: "Upload footage, review the AI edit plan, trim, split and reorder on the timeline.", status: "available", note: "Upload, review and editor workspace." },
  { icon: Captions, title: "Auto Captions & Subtitles", body: "Edit captions per segment and in the caption editor, tied to your transcript.", status: "available", note: "Uses transcripts from your video backend." },
  { icon: Image, title: "AI Thumbnail Creation", body: "Pick frames and compose thumbnail concepts with text overlays.", status: "available", note: "Thumbnail screen per video." },
  { icon: MonitorSmartphone, title: "Platform & Resolution", body: "Export for YouTube, Instagram, TikTok and more — 720p to 4K.", status: "available", note: "Selectable in export." },
  { icon: Languages, title: "Translation", body: "Translate captions and subtitles into multiple languages.", status: "integration", note: "Needs a translation service connected." },
  { icon: Link2, title: "Reference Video Analysis", body: "Paste a link to match a style, pacing and structure.", status: "integration", note: "Needs a link-ingest service connected." },
  { icon: ShieldCheck, title: "Policy & Copyright Awareness", body: "Warnings about copyrighted audio and platform policy issues.", status: "integration", note: "Needs a content-ID provider connected." },
];
