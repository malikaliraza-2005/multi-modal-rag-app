"use client";

import { Check, ChevronsUpDown, Library } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { useDocuments } from "@/hooks/use-documents";
import { baseName } from "@/lib/format";
import { extentLabel } from "@/lib/locator";

export function DocumentSwitcher({
  docId,
  filename,
}: {
  docId: string;
  filename: string;
}) {
  const router = useRouter();
  const { data } = useDocuments();

  return (
    <Menu>
      <MenuTrigger asChild>
        {/* `shrink` undoes the Button's own `shrink-0`: without it the trigger
            holds its full max-content width and a long filename pushes the
            header — and the page with it — past the viewport. */}
        <Button variant="ghost" size="md" className="min-w-0 max-w-80 shrink">
          <span className="min-w-0 truncate text-sm text-n-11">
            {baseName(filename)}
          </span>
          <ChevronsUpDown size={14} strokeWidth={1.5} className="shrink-0 text-n-6" />
        </Button>
      </MenuTrigger>

      <MenuContent>
        <MenuLabel>Indexed documents</MenuLabel>
        {data?.map((doc) => (
          <MenuItem
            key={doc.doc_id}
            onSelect={() => router.push(`/d/${doc.doc_id}`)}
          >
            <Check
              size={14}
              strokeWidth={1.5}
              className={doc.doc_id === docId ? "text-accent" : "opacity-0"}
            />
            <span className="min-w-0 flex-1 truncate">
              {baseName(doc.filename)}
            </span>
            <span className="shrink-0 font-mono text-2xs tabular-nums text-n-6">
              {extentLabel(doc.locator, doc.pages)}
            </span>
          </MenuItem>
        ))}

        <MenuSeparator />
        <MenuItem onSelect={() => router.push("/library")}>
          <Library size={14} strokeWidth={1.5} />
          All documents
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
