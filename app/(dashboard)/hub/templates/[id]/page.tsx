import TemplateEditor from "@/components/hub/TemplateEditor";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TemplateEditor mode="edit" id={id} />;
}
