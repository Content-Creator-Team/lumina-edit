import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

import { TemplateLibrary } from "@/components/app/template-library";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ApiError, api } from "@/lib/api-client";
import type { Video } from "@/lib/api-types";
import { videoTitle } from "@/lib/queries";

const errText = (e: unknown) => (e instanceof ApiError ? e.detail : String(e));

/** Rename / reprocess / delete for the video workspace header. */
export function VideoActionsMenu({ video }: { video: Video }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<"rename" | "reprocess" | "delete" | null>(null);
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState(video.template_id ?? "auto");
  const close = () => setDialog(null);

  const rename = useMutation({
    mutationFn: () => api.updateVideo(video.id, { title: title.trim() }),
    onSuccess: (v) => {
      qc.setQueryData(["video", video.id], v);
      void qc.invalidateQueries({ queryKey: ["videos"] });
      close();
    },
  });
  const reprocess = useMutation({
    mutationFn: () => api.reprocessVideo(video.id, { template_id: templateId }),
    onSuccess: () => {
      for (const key of [
        "video",
        "video-progress",
        "edit-plan",
        "edit-plans",
        "scenes",
        "transcript",
        "video-analysis",
        "thumbnails",
      ]) {
        void qc.invalidateQueries({ queryKey: [key, video.id] });
      }
      void qc.invalidateQueries({ queryKey: ["videos"] });
      close();
      void navigate({ to: "/videos/$id", params: { id: video.id } });
    },
  });
  const remove = useMutation({
    mutationFn: () => api.deleteVideo(video.id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["video", video.id] });
      void qc.invalidateQueries({ queryKey: ["videos"] });
      close();
      void navigate({ to: "/dashboard" });
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label="Video actions">
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setTitle(videoTitle(video));
              rename.reset();
              setDialog("rename");
            }}
          >
            <Pencil className="mr-2 size-4" aria-hidden="true" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              reprocess.reset();
              setDialog("reprocess");
            }}
          >
            <RotateCcw className="mr-2 size-4" aria-hidden="true" /> Reprocess…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => {
              remove.reset();
              setDialog("delete");
            }}
          >
            <Trash2 className="mr-2 size-4" aria-hidden="true" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === "rename"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename video</DialogTitle>
          </DialogHeader>
          <Input
            value={title}
            maxLength={200}
            aria-label="Video title"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) rename.mutate();
            }}
          />
          {rename.isError && <p className="text-xs text-destructive">{errText(rename.error)}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button disabled={!title.trim() || rename.isPending} onClick={() => rename.mutate()}>
              {rename.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "reprocess"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Reprocess video</DialogTitle>
            <DialogDescription>
              Runs the whole pipeline again and creates a fresh plan. Optionally pick a different
              template.
            </DialogDescription>
          </DialogHeader>
          <TemplateLibrary
            value={templateId}
            onChange={(id) => setTemplateId(id)}
            gridClassName="max-h-[45vh]"
          />
          {reprocess.isError && (
            <p className="text-xs text-destructive">{errText(reprocess.error)}</p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button disabled={reprocess.isPending} onClick={() => reprocess.mutate()}>
              {reprocess.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Reprocess
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={dialog === "delete"} onOpenChange={(o) => !o && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{videoTitle(video)}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The video, its plans, renders and thumbnails are removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.isError && <p className="text-xs text-destructive">{errText(remove.error)}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                remove.mutate();
              }}
            >
              {remove.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
