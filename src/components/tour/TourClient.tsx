"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/icons";

/** The tour depends on WebGL, Web Audio and the URL, so it renders on the client only. */
const TourApp = dynamic(() => import("./TourApp"), {
  ssr: false,
  loading: () => (
    <div className="grid h-dvh w-full place-items-center bg-[#0b0b0c] text-white" role="status" aria-label="Loading">
      <Spinner size={44} />
    </div>
  ),
});

export default function TourClient() {
  return <TourApp />;
}
