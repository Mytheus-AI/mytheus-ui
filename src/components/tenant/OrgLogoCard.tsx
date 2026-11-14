"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowCounterClockwise, Check, ImageSquare, MagnifyingGlassMinus, MagnifyingGlassPlus, UploadSimple, WarningCircle } from "@phosphor-icons/react";
import { removeOrgLogo, uploadOrgLogo } from "@/app/actions/org-logo";
import { useOrgContext } from "@/lib/org-context";
import { exportSquare, loadImage, rasteriseSvg } from "@/lib/org-logo-browser";
import {
  CENTRED,
  LOGO_ACCEPT,
  LOGO_MIN_SIDE,
  MAX_ZOOM,
  clampCrop,
  drawnSize,
  logoFileError,
  logoKind,
  type Crop,
} from "@/lib/org-logo";
import { Button } from "@/components/ui/Button";
import { CardFoot, SectionCard, cardPad } from "@/components/ui/Card";
import { RemoveButton } from "@/components/ui/RemoveButton";
import { OrgMark } from "@/components/tenant/OrgMark";
import { notifyError, notifySuccess } from "@/lib/toast";

/* The workspace logo editor (ADR-0048), in the Workspace console's Overview beside the name.

   States, each drawn:
   - empty: the initial, a drop zone and "Choose an image";
   - has a logo: the logo, Replace and Remove (Remove asks first);
   - cropping: a square viewport to drag and zoom (mouse, touch or keyboard), with the logo previewed
     at the sizes the app draws it (the sidebar's 30 px, the chooser's 44 px);
   - saving: a progress bar through preparing, uploading and saving;
   - saved: a check and the new logo, then `router.refresh()` puts it in the sidebar;
   - error: what was wrong (type, size, a refusal) in a red note, with the drop zone still there;
   - read-only (anyone but a workspace admin): the logo or initial and who can change it.

   The crop is done here, on a canvas: the image the server stores is already a 512 px square,
   WebP where the browser can encode it (PNG otherwise). An SVG is drawn to a canvas first, so it
   is uploaded as an image and its markup never leaves the browser. */

const VIEW = 264; // the crop viewport, in CSS px
const KEY_STEP = 8;

type Draft = { src: string; natW: number; natH: number; name: string };
type Phase = "idle" | "crop" | "saving" | "saved";
type Stage = "preparing" | "uploading" | "saving";

const STAGE_LABEL: Record<Stage, string> = {
  preparing: "Preparing the image",
  uploading: "Uploading the logo",
  saving: "Saving",
};
const STAGE_VALUE: Record<Stage, number> = { preparing: 20, uploading: 65, saving: 90 };

/** The crop as a 512 px square (see `exportSquare`). */
async function exportCrop(draft: Draft, crop: Crop): Promise<Blob> {
  return exportSquare(draft.src, draft.natW, draft.natH, crop, VIEW);
}

/** The cropped image at `size` px, drawn with CSS from the same geometry as the viewport. */
function CropPreview({ draft, crop, size, round = false }: { draft: Draft; crop: Crop; size: number; round?: boolean }) {
  const k = size / VIEW;
  const { w, h } = drawnSize(draft.natW, draft.natH, VIEW, crop.zoom);
  return (
    <span
      aria-hidden
      className={`relative block shrink-0 overflow-hidden bg-surface ${round ? "rounded-full" : "rounded-ctl"}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL */}
      <img
        src={draft.src}
        alt=""
        draggable={false}
        className="absolute max-w-none select-none"
        style={{ width: w * k, height: h * k, left: ((VIEW - w) / 2 + crop.x) * k, top: ((VIEW - h) / 2 + crop.y) * k }}
      />
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-line-2" />
    </span>
  );
}

export function OrgLogoCard({ canEdit: canEditProp }: { canEdit?: boolean } = {}) {
  const { org, user } = useOrgContext();
  const router = useRouter();
  const canEdit = canEditProp ?? user.role === "admin";

  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState<Stage>("preparing");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [crop, setCrop] = useState<Crop>(CENTRED);
  const [dragOver, setDragOver] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  // What the card shows until the refreshed context arrives: the just-saved crop, or "removed".
  const [local, setLocal] = useState<{ src: string | null } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; start: Crop } | null>(null);
  const urls = useRef<string[]>([]);

  const track = (url: string) => {
    urls.current.push(url);
    return url;
  };
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  // Once the server's logo changes (the refresh landed), drop the local stand-in.
  useEffect(() => setLocal(null), [org.logoUrl]);

  const shown = local ? local.src ?? undefined : org.logoUrl;
  const hasLogo = Boolean(shown);

  const pick = () => input.current?.click();

  const open = useCallback(async (file: File) => {
    setError(null);
    const problem = logoFileError(file);
    if (problem) {
      setError(problem);
      return;
    }
    setLoadingFile(true);
    try {
      const src = logoKind(file) === "svg" ? track(await rasteriseSvg(file)) : track(URL.createObjectURL(file));
      const img = await loadImage(src);
      if (Math.min(img.naturalWidth, img.naturalHeight) < LOGO_MIN_SIDE) {
        setError(`That image is only ${img.naturalWidth} by ${img.naturalHeight} pixels. Use one at least ${LOGO_MIN_SIDE} pixels on each side.`);
        return;
      }
      setDraft({ src, natW: img.naturalWidth, natH: img.naturalHeight, name: file.name });
      setCrop(CENTRED);
      setPhase("crop");
    } catch {
      setError("That image could not be opened. Try exporting it again as a PNG.");
    } finally {
      setLoadingFile(false);
    }
  }, []);

  useEffect(() => {
    if (phase === "crop") viewport.current?.focus({ preventScroll: true });
  }, [phase]);

  const setClamped = (next: Crop) => draft && setCrop(clampCrop(next, draft.natW, draft.natH, VIEW));

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!draft) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, start: crop };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    setClamped({ ...d.start, x: d.start.x + e.clientX - d.x, y: d.start.y + e.clientY - d.y });
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };
  const onViewportKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      setClamped({ ...crop, x: crop.x + dx, y: crop.y + dy });
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setClamped({ ...crop, zoom: crop.zoom + 0.1 });
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      setClamped({ ...crop, zoom: crop.zoom - 0.1 });
    } else if (e.key === "0") {
      e.preventDefault();
      setCrop(CENTRED);
    }
  };

  const cancel = () => {
    setDraft(null);
    setPhase("idle");
    setError(null);
  };

  const save = async () => {
    if (!draft) return;
    setPhase("saving");
    setStage("preparing");
    setError(null);
    let blob: Blob;
    try {
      blob = await exportCrop(draft, crop);
    } catch {
      setPhase("crop");
      setError("The image could not be prepared in this browser. Try a PNG or JPEG.");
      return;
    }
    setStage("uploading");
    const form = new FormData();
    form.append("file", blob, `logo.${blob.type.split("/")[1] ?? "png"}`);
    const uploading = uploadOrgLogo(form);
    const later = setTimeout(() => setStage("saving"), 450);
    const result = await uploading;
    clearTimeout(later);
    if (!result.ok) {
      setPhase("crop");
      setError(result.message);
      notifyError("Logo not saved", { description: result.message });
      return;
    }
    setLocal({ src: track(URL.createObjectURL(blob)) });
    setDraft(null);
    setPhase("saved");
    notifySuccess("Logo saved", { description: `Shown for everyone in ${org.name || "the workspace"}.` });
    router.refresh();
  };

  const remove = async () => {
    setRemoving(true);
    setError(null);
    const result = await removeOrgLogo();
    setRemoving(false);
    if (!result.ok) {
      setError(result.message);
      notifyError("Logo not removed", { description: result.message });
      return;
    }
    setLocal({ src: null });
    setPhase("idle");
    notifySuccess("Logo removed", { description: "The workspace shows its initial again." });
    router.refresh();
  };

  // Leave the "saved" check up for a moment, then settle back to the normal view.
  useEffect(() => {
    if (phase !== "saved") return;
    const t = setTimeout(() => setPhase("idle"), 2400);
    return () => clearTimeout(t);
  }, [phase]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void open(file);
  };

  const description = canEdit
    ? "Shown in the sidebar, the workspace chooser and wherever the workspace appears."
    : "Shown in the sidebar and wherever the workspace appears.";

  const errorNote = error ? (
    <p role="alert" className="flex items-start gap-2 rounded-ctl bg-priority-high-soft px-3 py-2.5 text-[14px] leading-snug text-ink">
      {/* The icon carries the red; the text stays ink, since red on its soft fill is 4.49:1 at 14px. */}
      <WarningCircle size={18} weight="fill" aria-hidden className="mt-px shrink-0 text-priority-high" />
      <span>{error}</span>
    </p>
  ) : null;

  /* ---- read-only ---- */
  if (!canEdit) {
    return (
      <SectionCard title="Workspace logo" headingId="org-logo-h" description={description}>
        <div className={`flex items-center gap-4 ${cardPad}`}>
          <OrgMark name={org.name} logoUrl={shown} size={96} />
          <div className="min-w-0">
            <p className="truncate text-[16px] font-semibold text-ink">{org.name || "Your workspace"}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-3">
              {hasLogo ? "Only workspace admins can change the logo." : "No logo yet. A workspace admin can add one."}
            </p>
          </div>
        </div>
      </SectionCard>
    );
  }

  /* ---- cropping and saving ---- */
  if ((phase === "crop" || phase === "saving") && draft) {
    const saving = phase === "saving";
    const { w, h } = drawnSize(draft.natW, draft.natH, VIEW, crop.zoom);
    return (
      <SectionCard title="Workspace logo" headingId="org-logo-h" description="Drag to position it, then zoom until it fills the square the way you want.">
        <div className={`grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] ${cardPad}`}>
          <div className="mx-auto flex flex-col items-center gap-3 sm:mx-0">
            <div
              ref={viewport}
              role="group"
              tabIndex={saving ? -1 : 0}
              aria-label="Logo position. Drag, or use the arrow keys to move it and plus or minus to zoom."
              aria-describedby="org-logo-crop-help"
              onPointerDown={saving ? undefined : onPointerDown}
              onPointerMove={saving ? undefined : onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={saving ? undefined : onViewportKey}
              className={`relative touch-none select-none overflow-hidden rounded-card bg-[repeating-conic-gradient(var(--bg-2)_0%_25%,var(--surface)_0%_50%)] [background-size:16px_16px] outline-none ring-1 ring-line-2 focus-visible:ring-2 focus-visible:ring-signal ${saving ? "cursor-progress opacity-80" : "cursor-grab active:cursor-grabbing"}`}
              style={{ width: VIEW, height: VIEW }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL */}
              <img
                src={draft.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none"
                style={{ width: w, height: h, left: (VIEW - w) / 2 + crop.x, top: (VIEW - h) / 2 + crop.y }}
              />
            </div>
            <div className="flex w-full items-center gap-2" style={{ maxWidth: VIEW }}>
              <button
                type="button"
                aria-label="Zoom out"
                disabled={saving || crop.zoom <= 1}
                onClick={() => setClamped({ ...crop, zoom: crop.zoom - 0.25 })}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink disabled:opacity-40"
              >
                <MagnifyingGlassMinus size={18} aria-hidden />
              </button>
              <label htmlFor="org-logo-zoom" className="sr-only">
                Zoom
              </label>
              <input
                id="org-logo-zoom"
                type="range"
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                value={crop.zoom}
                disabled={saving}
                aria-valuetext={`${Math.round(crop.zoom * 100)} percent`}
                onChange={(e) => setClamped({ ...crop, zoom: Number(e.target.value) })}
                className="h-10 min-w-0 flex-1 cursor-pointer accent-[var(--signal)]"
              />
              <button
                type="button"
                aria-label="Zoom in"
                disabled={saving || crop.zoom >= MAX_ZOOM}
                onClick={() => setClamped({ ...crop, zoom: crop.zoom + 0.25 })}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink disabled:opacity-40"
              >
                <MagnifyingGlassPlus size={18} aria-hidden />
              </button>
            </div>
            <p id="org-logo-crop-help" className="sr-only">
              Arrow keys move the logo by a little, with Shift by more. Plus and minus zoom. Zero centres it again.
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <p className="text-[14px] font-semibold text-ink">How it will look</p>
              <div className="mt-3 flex flex-wrap items-end gap-4">
                <div className="flex min-w-0 items-center gap-2.5 rounded-ctl border border-line bg-surface px-2.5 py-2">
                  <CropPreview draft={draft} crop={crop} size={30} />
                  <span className="min-w-0">
                    <span className="block max-w-[14ch] truncate text-[14px] font-semibold leading-tight text-ink">{org.name || "Your workspace"}</span>
                    <span className="block text-[12.5px] text-ink-3">Sidebar</span>
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <CropPreview draft={draft} crop={crop} size={44} />
                  <span className="text-[12.5px] text-ink-3">Chooser</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <CropPreview draft={draft} crop={crop} size={56} />
                  <span className="text-[12.5px] text-ink-3">Large</span>
                </div>
              </div>
            </div>
            <p className="text-[14px] leading-relaxed text-ink-3">
              Saved as a 512 pixel square. Transparent backgrounds stay transparent.
            </p>
            {saving ? (
              <div className="grid gap-2" aria-live="polite">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="font-semibold text-ink">{STAGE_LABEL[stage]}</span>
                  <span className="tabular-nums text-ink-3">{STAGE_VALUE[stage]}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Saving the logo"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={STAGE_VALUE[stage]}
                  aria-valuetext={STAGE_LABEL[stage]}
                  className="h-1.5 overflow-hidden rounded-full bg-bg-2"
                >
                  <div className="h-full rounded-full bg-signal transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${STAGE_VALUE[stage]}%` }} />
                </div>
              </div>
            ) : null}
            {errorNote}
          </div>
        </div>
        <CardFoot>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving logo" : "Save logo"}
          </Button>
          <Button variant="ghost" onClick={cancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="ghost" onClick={() => setCrop(CENTRED)} disabled={saving || (crop.zoom === 1 && crop.x === 0 && crop.y === 0)} className="sm:ml-auto">
            <ArrowCounterClockwise size={16} aria-hidden />
            Reset
          </Button>
        </CardFoot>
      </SectionCard>
    );
  }

  /* ---- empty, has a logo, saved, error ---- */
  return (
    <SectionCard title="Workspace logo" headingId="org-logo-h" description={description}>
      <div className={`grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center ${cardPad}`}>
        <div className="relative mx-auto sm:mx-0">
          <OrgMark name={org.name} logoUrl={shown} size={96} />
          {phase === "saved" ? (
            <span className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full bg-ok text-surface ring-2 ring-surface">
              <Check size={15} weight="bold" aria-hidden />
            </span>
          ) : null}
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          data-dropzone=""
          className={`flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-card border border-dashed px-4 py-5 text-center transition-colors duration-150 ${
            dragOver ? "border-signal bg-signal-soft" : error ? "border-[color:color-mix(in_srgb,var(--priority-high)_45%,var(--line))] bg-surface-2" : "border-line-2 bg-surface-2"
          }`}
        >
          {dragOver ? (
            <p className="flex items-center gap-2 text-[15px] font-semibold text-signal-ink">
              <ImageSquare size={20} aria-hidden />
              Drop to use this image
            </p>
          ) : (
            <>
              <p className="text-[15px] font-semibold text-ink">{hasLogo ? "Drop a new logo here" : "Drop your logo here"}</p>
              <p className="text-[13px] text-ink-3">PNG, JPEG, WebP or SVG, up to 2 MB. Square images fit best.</p>
            </>
          )}
        </div>
      </div>
      {error ? <div className={`${cardPad} !pt-0`}>{errorNote}</div> : null}
      <CardFoot>
        <input
          ref={input}
          type="file"
          accept={LOGO_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void open(file);
          }}
        />
        <Button onClick={pick} disabled={loadingFile || removing} variant={hasLogo ? "outline" : "primary"}>
          <UploadSimple size={16} aria-hidden />
          {loadingFile ? "Opening image" : hasLogo ? "Replace logo" : "Choose an image"}
        </Button>
        {hasLogo ? <RemoveButton what="the workspace logo" onConfirm={() => void remove()} disabled={removing || loadingFile} /> : null}
        {phase === "saved" ? (
          <p className="text-[14px] text-ok" role="status">
            Logo saved
          </p>
        ) : removing ? (
          <p className="text-[14px] text-ink-3" role="status">
            Removing logo
          </p>
        ) : null}
      </CardFoot>
    </SectionCard>
  );
}
