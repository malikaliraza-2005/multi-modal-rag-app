import { Workspace } from "@/components/workspace/workspace";

export default async function WorkspacePage(props: PageProps<"/d/[docId]">) {
  const { docId } = await props.params;
  return <Workspace docId={docId} />;
}
