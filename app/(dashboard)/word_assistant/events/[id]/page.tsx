import EventTimeline from "@/components/hub/EventTimeline";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventTimeline eventId={id} />;
}
