import { createFileRoute } from "@tanstack/react-router";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";

export const Route = createFileRoute("/_editor/editor/$videoId")({
  component: EditorPage,
});

function EditorPage() {
  const { videoId } = Route.useParams();
  return <EditorWorkspace videoId={videoId} />;
}
