"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { ViewerError, ViewerToolbar, ZOOM_STEPS } from "./viewer-chrome";

/** An uploaded picture is its own viewer: the browser already renders every
    format we accept except HEIC, and the API hands back the original bytes.

    There is nothing to page through, so the toolbar carries zoom alone. */
export function ImagePane({
  docId,
  filename,
}: {
  docId: string;
  filename: string;
}) {
  const [zoomIndex, setZoomIndex] = useState(2);
  const [failed, setFailed] = useState(false);

  const src = useMemo(() => api.fileUrl(docId), [docId]);
  const scale = ZOOM_STEPS[zoomIndex];

  return (
    <div className="relative flex h-full flex-col bg-n-1">
      <div className="flex-1 overflow-auto p-6">
        {failed ? (
          <ViewerError
            title="Could not display this image"
            message="The file is indexed and answerable, but this browser has no decoder for its format."
          />
        ) : (
          <div className="flex min-h-full items-center justify-center">
            <div
              className="overflow-hidden rounded-lg border border-n-3 bg-n-0"
              style={{ width: `${scale * 100}%` }}
            >
              {/* Plain <img>: the source is an arbitrary user upload on another
                  origin, which next/image would need configuring for and would
                  gain nothing from optimising. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={filename}
                onError={() => setFailed(true)}
                className="block h-auto w-full"
              />
            </div>
          </div>
        )}
      </div>

      {!failed && (
        <ViewerToolbar
          pages={[1]}
          current={1}
          locator="image"
          onGo={() => {}}
          zoom={{ index: zoomIndex, onChange: setZoomIndex }}
        />
      )}
    </div>
  );
}
