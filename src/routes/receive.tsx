import { createFileRoute } from "@tanstack/react-router";
import { ReceiverView } from "@/components/sable/ReceiverView";

type Search = { room?: string };

export const Route = createFileRoute("/receive")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    room: typeof search.room === "string" ? search.room : "SABLE1",
  }),
  component: ReceivePage,
});

function ReceivePage() {
  const { room } = Route.useSearch();
  return <ReceiverView initialRoom={room || "SABLE1"} />;
}
