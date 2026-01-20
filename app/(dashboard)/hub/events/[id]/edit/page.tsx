import EventEditor from "@/components/hub/EventEditor";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventEditor mode="edit" id={id} />;
}
