import { RefObject } from "react";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  status?: string;
  overlayText?: string;
};

const CameraPreview = ({ videoRef, status, overlayText }: Props) => {
  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center overflow-hidden rounded-3xl border border-white/20 bg-slate-900 shadow-xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      />
      {overlayText ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60">
          <span className="rounded-full bg-emerald-500/20 px-6 py-3 text-lg font-semibold text-emerald-200">
            {overlayText}
          </span>
        </div>
      ) : null}
      {status ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-4 py-2 text-xs font-medium uppercase tracking-wide text-white/80">
          {status}
        </div>
      ) : null}
    </div>
  );
};

export default CameraPreview;

