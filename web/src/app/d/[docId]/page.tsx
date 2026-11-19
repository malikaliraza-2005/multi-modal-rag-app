import type { Metadata } from "next";
import { Workspace } from "@/components/workspace/workspace";

/* A workspace shows one visitor's uploaded document: never index it. */
export const metadata: Metadata = {
  title: "Workspace — Asterism",
  robots: { index: false, follow: false },
};

export default async function WorkspacePage(props: PageProps<"/d/[docId]">) {
  const { docId } = await props.params;
  return <Workspace docId={docId} />;
}
