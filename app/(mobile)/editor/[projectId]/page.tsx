import EditorDeck from '@/components/mobile/EditorDeck';

export default function MobileEditorPage({ params }: { params: { projectId: string } }) {
  return <EditorDeck projectId={params.projectId} />;
}
