import DesktopIDE from "@/components/desktop/DesktopIDE";

export default function ProjectPage({ params }: { params: { id: string } }) {
  return <DesktopIDE projectId={params.id} />;
}
