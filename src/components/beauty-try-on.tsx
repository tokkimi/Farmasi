"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Camera, CameraOff, Check, Download, Eye, EyeOff, Heart, Loader2, Plus, RotateCcw, ShoppingBag, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useCatalog, useShelf } from "@/lib/shelf-store";
import { FARMASI_TRY_ON_PRODUCTS, type FarmasiProduct, type TryOnArea } from "@/lib/seed-data/farmasi-catalog";
import { useBeautyFavorites } from "@/lib/beauty-favorites";
import { FaceGuideOverlay } from "@/components/face-guide-overlay";
import { smoothLandmarks, validateFacePosition } from "@/lib/face-mesh/faceMesh.utils";
import type { FaceLandmarkPoint, FacePositionInstruction } from "@/lib/face-mesh/faceMesh.types";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };
type VideoLandmarker = {
  detectForVideo: (video: HTMLVideoElement, timestamp: number) => { faceLandmarks?: Point[][] };
  close?: () => void;
};

// MediaPipe 468-point face mesh indices.
const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
const LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];
const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const LEFT_EYE = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
const RIGHT_EYE = [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249];
const LEFT_UPPER_LID = [33, 246, 161, 160, 159, 158, 157, 173, 133];
const RIGHT_UPPER_LID = [263, 466, 388, 387, 386, 385, 384, 398, 362];
const LEFT_BROW_LOWER = [46, 53, 52, 65, 55];
const RIGHT_BROW_LOWER = [276, 283, 282, 295, 285];
const LEFT_BROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
const RIGHT_BROW = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];

const AREA_ORDER: TryOnArea[] = ["complexion", "contour", "cheeks", "highlight", "eyeshadow", "eyeliner", "lashes", "brows", "lipLiner", "lips", "lipGloss"];

/** One product per face zone; lips/gloss/liner share the mouth but stack. */
type Look = Partial<Record<TryOnArea, { slug: string; shade: number }>>;

const CATEGORY_TABS = [
  { key: "lip-makeup", areas: ["lips", "lipGloss", "lipLiner"] as TryOnArea[] },
  { key: "eye-makeup", areas: ["eyeshadow", "eyeliner", "lashes", "brows"] as TryOnArea[] },
  { key: "face-makeup", areas: ["complexion", "cheeks", "contour", "highlight"] as TryOnArea[] },
];

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const n = parseInt(value.length === 3 ? value.split("").map((c) => c + c).join("") : value, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function path(ctx: CanvasRenderingContext2D, pts: Point[]) {
  if (!pts.length) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Resample a brow edge to the eyelid length so the lid polygon closes cleanly. */
function sampleAlong(pts: Point[], count: number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const t = (i / (count - 1)) * (pts.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(pts.length - 1, lo + 1);
    return lerp(pts[lo], pts[hi], t - lo);
  });
}

function softFilter(ctx: CanvasRenderingContext2D, px: number) {
  if ("filter" in ctx) ctx.filter = px > 0 ? `blur(${px}px)` : "none";
}

/**
 * Draw a feathered colour field rather than a hard ellipse.  Canvas radial
 * gradients are circular, so we scale the coordinate system to get a natural
 * cheek/temple shape without leaving a visible edge on the skin.
 */
function paintFeatheredSpot(
  ctx: CanvasRenderingContext2D,
  center: Point,
  rx: number,
  ry: number,
  color: string,
  alpha: number,
  rotation = 0,
) {
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(rotation);
  ctx.scale(rx, ry);
  const gradient = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1);
  gradient.addColorStop(0, hexToRgba(color, alpha));
  gradient.addColorStop(0.42, hexToRgba(color, alpha * 0.62));
  gradient.addColorStop(0.76, hexToRgba(color, alpha * 0.18));
  gradient.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A soft, buildable sweep used for contour instead of two visible stripes. */
function paintContourSweep(ctx: CanvasRenderingContext2D, from: Point, control: Point, to: Point, width: number, color: string, alpha: number) {
  for (const [multiplier, opacity] of [[1.8, 0.07], [1.2, 0.11], [0.72, 0.16]] as const) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.strokeStyle = hexToRgba(color, alpha * opacity);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = width * multiplier;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }
}

function fillFaceBase(ctx: CanvasRenderingContext2D, lm: Point[], shade: string, intensity: number) {
  const P = (i: number) => lm[i];
  // The face mask deliberately cuts out eyes and mouth before compositing. It
  // avoids the grey/black halo that a blurred full-face overlay created around
  // those openings with darker foundation shades.
  ctx.save();
  ctx.beginPath();
  path(ctx, FACE_OVAL.map(P));
  path(ctx, LEFT_EYE.map(P));
  path(ctx, RIGHT_EYE.map(P));
  path(ctx, LIPS_OUTER.map(P));
  ctx.clip("evenodd");
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = hexToRgba(shade, 0.3 * intensity);
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = hexToRgba(shade, 0.045 * intensity);
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

function paintEyeshadow(ctx: CanvasRenderingContext2D, lidPts: Point[], browPts: Point[], colors: string[], intensity: number) {
  const top = lidPts.map((pt, i) => lerp(pt, browPts[i], 0.72));
  const center = lidPts.reduce((sum, pt) => ({ x: sum.x + pt.x / lidPts.length, y: sum.y + pt.y / lidPts.length }), { x: 0, y: 0 });
  const lidWidth = dist(lidPts[0], lidPts[lidPts.length - 1]);
  const lidHeight = Math.max(2, Math.abs(top[Math.floor(top.length / 2)].y - lidPts[Math.floor(lidPts.length / 2)].y));

  ctx.save();
  ctx.beginPath();
  path(ctx, [...lidPts, ...[...top].reverse()]);
  ctx.clip();
  // A pair of diffuse fields blends into the lid instead of drawing a band
  // between two landmark polylines.
  paintFeatheredSpot(ctx, center, lidWidth * 0.64, lidHeight * 1.25, colors[0], 0.62 * intensity);
  if (colors.length > 1) {
    const accent = lerp(lidPts[0], lidPts[lidPts.length - 1], 0.22);
    paintFeatheredSpot(ctx, accent, lidWidth * 0.44, lidHeight * 1.1, colors[1], 0.44 * intensity);
  }
  ctx.restore();
}

function drawLook(ctx: CanvasRenderingContext2D, lm: Point[], look: Look, intensity: number, scale: number) {
  const P = (i: number) => lm[i];
  const faceWidth = dist(P(234), P(454));
  const blur = (k: number) => Math.max(1, faceWidth * k);

  for (const area of AREA_ORDER) {
    const pick = look[area];
    if (!pick) continue;
    const product = FARMASI_TRY_ON_PRODUCTS.find((p) => p.slug === pick.slug);
    const shade = product?.shades?.[pick.shade];
    if (!shade) continue;
    const colors = shade.palette ?? [shade.hex];
    ctx.save();

    switch (area) {
      case "complexion": {
        fillFaceBase(ctx, lm, shade.hex, intensity);
        break;
      }
      case "cheeks":
      case "contour":
      case "highlight": {
        const spots =
          area === "cheeks"
            ? [P(50), P(280)].map((c) => ({ c, rx: faceWidth * 0.13, ry: faceWidth * 0.1, color: colors[0], a: 0.5 }))
            : area === "contour"
              ? [lerp(P(132), P(207), 0.55), lerp(P(361), P(427), 0.55)].map((c) => ({ c, rx: faceWidth * 0.12, ry: faceWidth * 0.05, color: colors[1] ?? colors[0], a: 0.5 }))
              : [P(117), P(346), lerp(P(6), P(4), 0.5)].map((c, i) => ({ c, rx: faceWidth * (i === 2 ? 0.03 : 0.08), ry: faceWidth * (i === 2 ? 0.09 : 0.04), color: colors[2] ?? colors[0], a: 0.6 }));
        for (const { c, rx, ry, color, a } of spots) {
          if (area === "contour") continue;
          ctx.globalCompositeOperation = area === "highlight" ? "screen" : "source-over";
          paintFeatheredSpot(ctx, c, rx, ry, color, a * intensity, area === "cheeks" ? -0.18 : 0);
        }
        if (area === "contour") {
          const leftStart = lerp(P(132), P(50), 0.24);
          const leftEnd = lerp(P(207), P(172), 0.58);
          const rightStart = lerp(P(361), P(280), 0.24);
          const rightEnd = lerp(P(427), P(397), 0.58);
          paintContourSweep(ctx, leftStart, lerp(P(50), P(207), 0.58), leftEnd, faceWidth * 0.085, colors[1] ?? colors[0], intensity);
          paintContourSweep(ctx, rightStart, lerp(P(280), P(427), 0.58), rightEnd, faceWidth * 0.085, colors[1] ?? colors[0], intensity);
        }
        // Palettes add their blush tone too.
        if (area === "cheeks" && colors.length > 1) {
          ctx.globalCompositeOperation = "screen";
          for (const c of [P(117), P(346)]) {
            paintFeatheredSpot(ctx, c, faceWidth * 0.06, faceWidth * 0.03, colors[2] ?? colors[0], 0.25 * intensity);
          }
        }
        break;
      }
      case "eyeshadow": {
        for (const [lid, brow] of [
          [LEFT_UPPER_LID, LEFT_BROW_LOWER],
          [RIGHT_UPPER_LID, RIGHT_BROW_LOWER],
        ] as const) {
          const lidPts = lid.map(P);
          const browPts = sampleAlong(brow.map(P), lidPts.length);
          paintEyeshadow(ctx, lidPts, browPts, colors, intensity);
        }
        break;
      }
      case "eyeliner":
      case "lashes": {
        softFilter(ctx, area === "lashes" ? blur(0.004) : 0.6);
        ctx.strokeStyle = hexToRgba(shade.hex, (area === "lashes" ? 0.65 : 0.9) * intensity);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = Math.max(1.5, faceWidth * (area === "lashes" ? 0.012 : 0.009)) * scale;
        for (const lid of [LEFT_UPPER_LID, RIGHT_UPPER_LID]) {
          const pts = lid.map(P);
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (const pt of pts.slice(1)) ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
          if (area === "eyeliner") {
            // Small wing from the outer corner.
            const outer = pts[0];
            const dir = { x: outer.x - pts[2].x, y: outer.y - pts[2].y };
            const len = Math.hypot(dir.x, dir.y) || 1;
            ctx.beginPath();
            ctx.moveTo(outer.x, outer.y);
            ctx.lineTo(outer.x + (dir.x / len) * faceWidth * 0.045, outer.y + (dir.y / len) * faceWidth * 0.045 - faceWidth * 0.018);
            ctx.stroke();
          }
        }
        break;
      }
      case "brows": {
        softFilter(ctx, blur(0.006));
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = hexToRgba(shade.hex, 0.5 * intensity);
        for (const brow of [LEFT_BROW, RIGHT_BROW]) {
          ctx.beginPath();
          path(ctx, brow.map(P));
          ctx.fill();
        }
        break;
      }
      case "lips":
      case "lipGloss":
      case "lipLiner": {
        if (area === "lipLiner") {
          softFilter(ctx, 0.8);
          ctx.strokeStyle = hexToRgba(shade.hex, 0.85 * intensity);
          ctx.lineWidth = Math.max(1.2, faceWidth * 0.006) * scale;
          ctx.beginPath();
          path(ctx, LIPS_OUTER.map(P));
          ctx.stroke();
          break;
        }
        const mouth = LIPS_OUTER.map(P);
        const minY = Math.min(...mouth.map((point) => point.y));
        const maxY = Math.max(...mouth.map((point) => point.y));
        const lipGradient = ctx.createLinearGradient(0, minY, 0, maxY);
        const baseAlpha = (area === "lipGloss" ? 0.42 : 0.7) * intensity;
        lipGradient.addColorStop(0, hexToRgba(shade.hex, baseAlpha * 0.62));
        lipGradient.addColorStop(0.48, hexToRgba(shade.hex, baseAlpha));
        lipGradient.addColorStop(1, hexToRgba(shade.hex, baseAlpha * 0.74));
        // Keep colour within the actual lip outline; a gradient over a clipped
        // organic shape reads as pigment, not as a flat, sticker-like fill.
        ctx.save();
        ctx.beginPath();
        path(ctx, mouth);
        path(ctx, LIPS_INNER.map(P));
        ctx.clip("evenodd");
        ctx.globalCompositeOperation = area === "lipGloss" ? "screen" : "multiply";
        ctx.fillStyle = lipGradient;
        ctx.fillRect(0, minY, ctx.canvas.width, maxY - minY);
        if (area === "lipGloss") {
          // Two feathered reflections follow the lower lip instead of a single
          // obvious white oval, giving shiny formulas a wet, moving-light feel.
          ctx.globalCompositeOperation = "screen";
          const width = dist(P(61), P(291));
          paintFeatheredSpot(ctx, lerp(P(14), P(17), 0.42), width * 0.2, faceWidth * 0.018, "#ffffff", 0.36 * intensity, -0.05);
          paintFeatheredSpot(ctx, lerp(P(14), P(17), 0.7), width * 0.1, faceWidth * 0.011, "#ffffff", 0.24 * intensity, -0.05);
        }
        ctx.restore();
        break;
      }
    }
    ctx.restore();
  }
}

function parseLook(raw?: string): Look {
  const look: Look = {};
  for (const part of raw?.split(",") ?? []) {
    const [slug, shadeRaw] = part.split(":");
    const product = FARMASI_TRY_ON_PRODUCTS.find((p) => p.slug === slug);
    const shade = Number(shadeRaw);
    if (product?.tryOn && Number.isInteger(shade) && product.shades?.[shade]) look[product.tryOn] = { slug: product.slug, shade };
  }
  return look;
}

const ZONE_CHIPS: Array<{ key: string; areas: TryOnArea[] }> = [
  { key: "lips", areas: ["lips", "lipGloss", "lipLiner"] },
  { key: "cheeks", areas: ["cheeks", "contour", "highlight"] },
  { key: "eyes", areas: ["eyeshadow", "eyeliner", "lashes"] },
  { key: "brows", areas: ["brows"] },
  { key: "complexion", areas: ["complexion"] },
];

export function BeautyTryOn({ initialSlug, initialLook }: { initialSlug?: string; initialLook?: string }) {
  const t = useTranslations("tryOn");
  const tPosition = useTranslations("faceScanPage.position");
  const tCategories = useTranslations("categories");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const landmarkerRef = React.useRef<VideoLandmarker | null>(null);
  const frameRef = React.useRef<number | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const smoothedRef = React.useRef<FaceLandmarkPoint[] | null>(null);
  const stableSinceRef = React.useRef<number | null>(null);
  const lookRef = React.useRef<Look>({});
  const intensityRef = React.useRef(0.85);
  const compareRef = React.useRef(false);
  const frozenRef = React.useRef<{ frame: HTMLCanvasElement; landmarks: FaceLandmarkPoint[] } | null>(null);

  const parsedLook = React.useMemo(() => parseLook(initialLook), [initialLook]);
  const firstLookSlug = Object.values(parsedLook)[0]?.slug;
  const initialProduct = FARMASI_TRY_ON_PRODUCTS.find((p) => p.slug === (initialSlug ?? firstLookSlug));

  const [status, setStatus] = React.useState<"loading" | "live" | "denied" | "error">("loading");
  const [instruction, setInstruction] = React.useState<FacePositionInstruction>("holdStill");
  const [progress, setProgress] = React.useState(0);
  const [faceFound, setFaceFound] = React.useState(false);
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [frozen, setFrozen] = React.useState(false);
  const [tab, setTab] = React.useState(
    initialProduct?.category === "lip-care" ? "lip-makeup" : (initialProduct?.category ?? "lip-makeup")
  );
  const [activeSlug, setActiveSlug] = React.useState(
    initialProduct?.slug ?? FARMASI_TRY_ON_PRODUCTS.find((p) => p.category === "lip-makeup")!.slug
  );
  const [look, setLook] = React.useState<Look>(() =>
    Object.keys(parsedLook).length
      ? parsedLook
      : initialProduct?.tryOn
        ? { [initialProduct.tryOn]: { slug: initialProduct.slug, shade: 0 } }
        : {}
  );
  const [intensity, setIntensity] = React.useState(0.85);
  const [compare, setCompare] = React.useState(false);

  const { catalog } = useCatalog();
  const { shelf, addProduct } = useShelf();
  const favorites = useBeautyFavorites();

  React.useEffect(() => {
    lookRef.current = look;
  }, [look]);
  React.useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);
  React.useEffect(() => {
    compareRef.current = compare;
  }, [compare]);

  const stop = React.useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close?.();
    landmarkerRef.current = null;
  }, []);

  const start = React.useCallback(async () => {
    stop();
    setStatus("loading");
    setInstruction("holdStill");
    setProgress(0);
    smoothedRef.current = null;
    stableSinceRef.current = null;
    try {
      // Same camera setup as the Haru skin scanner (front camera, portrait).
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("missing_video");
      video.srcObject = stream;
      await video.play();

      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks("/face-model/wasm");
      const options = (delegate: "GPU" | "CPU") => ({
        baseOptions: { modelAssetPath: "/face-model/face_landmarker.task", delegate },
        runningMode: "VIDEO" as const,
        numFaces: 2,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
      try {
        landmarkerRef.current = (await FaceLandmarker.createFromOptions(vision, options("GPU"))) as unknown as VideoLandmarker;
      } catch {
        landmarkerRef.current = (await FaceLandmarker.createFromOptions(vision, options("CPU"))) as unknown as VideoLandmarker;
      }
      setStatus("live");

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      let lastInference = 0;
      let lastFound = false;
      const render = (time: number) => {
        const currentVideo = videoRef.current;
        const landmarker = landmarkerRef.current;
        if (!currentVideo || !landmarker) return;
        const w = currentVideo.videoWidth;
        const h = currentVideo.videoHeight;
        if (w && h && currentVideo.readyState >= 2 && document.visibilityState !== "hidden") {
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          const frozen = frozenRef.current;
          // Detect at the scanner's cadence (~20 fps), draw at full frame rate.
          if (!frozen && time - lastInference >= 50) {
            lastInference = time;
            const result = landmarker.detectForVideo(currentVideo, performance.now());
            const faceCount = result.faceLandmarks?.length ?? 0;
            const raw = result.faceLandmarks?.[0] ?? null;
            const next = raw ? smoothLandmarks(smoothedRef.current, raw, 0.55) : null;
            smoothedRef.current = next;
            const preliminary = validateFacePosition(next, faceCount, stableSinceRef.current, time);
            if (preliminary.instruction !== "faceDetected") stableSinceRef.current = null;
            else if (!stableSinceRef.current) stableSinceRef.current = time;
            const stable = validateFacePosition(next, faceCount, stableSinceRef.current, time);
            setInstruction(stable.instruction);
            setProgress(stable.progress);
            const found = Boolean(next) && faceCount === 1;
            if (found !== lastFound) {
              lastFound = found;
              setFaceFound(found);
            }
          }
          ctx.save();
          ctx.setTransform(-1, 0, 0, 1, w, 0); // selfie mirror, like the scanner preview
          ctx.drawImage(frozen?.frame ?? currentVideo, 0, 0, w, h);
          const lm = frozen?.landmarks ?? smoothedRef.current;
          if (lm && (frozen || lastFound) && !compareRef.current) {
            drawLook(ctx, lm.map((pt) => ({ x: pt.x * w, y: pt.y * h })), lookRef.current, intensityRef.current, 1);
          }
          ctx.restore();
        }
        frameRef.current = requestAnimationFrame(render);
      };
      frameRef.current = requestAnimationFrame(render);
    } catch (error) {
      stop();
      const name = (error as { name?: string })?.name;
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
    }
  }, [stop]);

  // The camera opens on arrival and stays open, exactly like the skin scanner.
  React.useEffect(() => {
    const timer = window.setTimeout(() => void start(), 0);
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, [start, stop]);

  /** Photo mode: freeze the current frame and keep trying shades on it. */
  const toggleFreeze = () => {
    const video = videoRef.current;
    if (frozenRef.current) {
      frozenRef.current = null;
      setFrozen(false);
      return;
    }
    const landmarks = smoothedRef.current;
    if (!video || !landmarks || status !== "live") return;
    const frame = document.createElement("canvas");
    frame.width = video.videoWidth;
    frame.height = video.videoHeight;
    frame.getContext("2d")?.drawImage(video, 0, 0);
    frozenRef.current = { frame, landmarks };
    setFrozen(true);
  };

  const savePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas || status !== "live") return;
    setPhoto(canvas.toDataURL("image/jpeg", 0.92));
  };

  // Full-screen mirror: lock the page underneath like a native app screen.
  React.useEffect(() => {
    const { overflow } = document.body.style;
    const html = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = overflow;
      document.documentElement.style.overscrollBehavior = html;
    };
  }, []);

  const products = FARMASI_TRY_ON_PRODUCTS.filter((p) => p.category === tab || (tab === "lip-makeup" && p.category === "lip-care"));
  const active = FARMASI_TRY_ON_PRODUCTS.find((p) => p.slug === activeSlug) ?? products[0];
  const activePick = active?.tryOn ? look[active.tryOn] : undefined;
  const activeShade = activePick?.slug === active?.slug ? activePick.shade : -1;
  const dbProduct = catalog.find((p) => p.slug === active?.slug);
  const inShelf = Boolean(dbProduct && shelf.some((p) => p.id === dbProduct.id));
  const appliedCount = Object.keys(look).length;
  const aligned = faceFound && instruction === "faceDetected";

  const chooseShade = (product: FarmasiProduct, shade: number) => {
    if (!product.tryOn) return;
    setLook((prev) => {
      const current = prev[product.tryOn!];
      if (current?.slug === product.slug && current.shade === shade) {
        const next = { ...prev };
        delete next[product.tryOn!];
        return next;
      }
      return { ...prev, [product.tryOn!]: { slug: product.slug, shade } };
    });
  };

  const activeShadeData = activeShade >= 0 ? active?.shades?.[activeShade] : undefined;

  return (
    <div className="fixed inset-0 z-[70] flex h-[100dvh] touch-manipulation select-none flex-col overflow-hidden overscroll-none bg-black text-white">
      {/* ── Mirror: the face stays big and centred, live camera ── */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video ref={videoRef} muted playsInline className="absolute inset-0 size-full scale-x-[-1] object-cover opacity-0" />
        <canvas ref={canvasRef} className="absolute inset-0 size-full object-cover" />

        {(status === "denied" || status === "error") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <CameraOff className="size-10 text-white/60" />
            <p className="max-w-xs text-sm text-white/75">{status === "denied" ? t("cameraDenied") : t("cameraError")}</p>
            <Button onClick={() => void start()} size="lg" className="rounded-full">
              <Camera className="size-4" />
              {t("start")}
            </Button>
          </div>
        )}

        {status !== "denied" && status !== "error" && !frozen && !faceFound && <FaceGuideOverlay active={progress >= 0.2} className="text-white" />}

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-4 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/app/routine"
              aria-label={t("close")}
              className="flex size-10 items-center justify-center rounded-full border border-white/40 bg-black/30 backdrop-blur-md"
            >
              <X className="size-5" />
            </Link>
            <p className="font-serif text-lg">{t("title")}</p>
            <div className="flex rounded-full border border-white/40 bg-black/30 p-0.5 text-xs font-medium backdrop-blur-md">
              <button type="button" onClick={() => frozen && toggleFreeze()} className={cn("rounded-full px-3 py-1.5", !frozen && "bg-white text-black")}>
                {t("modeLive")}
              </button>
              <button type="button" onClick={() => !frozen && toggleFreeze()} disabled={!faceFound && !frozen} className={cn("rounded-full px-3 py-1.5 disabled:opacity-40", frozen && "bg-white text-black")}>
                {t("modePhoto")}
              </button>
            </div>
          </div>
          <div className="mx-1 mt-3 h-1 rounded-full bg-white/18">
            <span
              className="block h-full rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.9)] transition-all"
              style={{ width: `${frozen ? 100 : Math.max(4, (faceFound ? Math.max(progress, 0.35) : 0) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {ZONE_CHIPS.map((zone) => {
              const applied = zone.areas.some((area) => look[area]);
              const detected = faceFound || frozen;
              return (
                <span
                  key={zone.key}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-md transition",
                    detected ? "border-white/55 bg-black/30 text-white" : "border-white/20 bg-black/15 text-white/45"
                  )}
                >
                  {detected ? <Check className="size-3" /> : <span className="size-1.5 rounded-full bg-white/40" />}
                  {t(`zones.${zone.key}`)}
                  {applied && <span className="ml-0.5 size-1.5 rounded-full bg-primary" />}
                </span>
              );
            })}
          </div>
        </div>

        {/* Instruction + mirror controls */}
        {status !== "denied" && status !== "error" && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/55 to-transparent px-4 pb-3 pt-10">
            <div className="max-w-[86vw] rounded-full border border-white/45 bg-black/25 px-4 py-1.5 text-center text-xs font-medium backdrop-blur-md">
              {status === "loading" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {tPosition("holdStill")}
                </span>
              ) : frozen ? (
                t("photoHint")
              ) : aligned ? (
                t("faceFound")
              ) : (
                tPosition(instruction)
              )}
            </div>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onPointerDown={() => setCompare(true)}
                onPointerUp={() => setCompare(false)}
                onPointerLeave={() => setCompare(false)}
                onPointerCancel={() => setCompare(false)}
                onContextMenu={(e) => e.preventDefault()}
                aria-label={t("compare")}
                className="flex size-11 items-center justify-center rounded-full border border-white/50 bg-black/30 backdrop-blur-md [-webkit-touch-callout:none]"
              >
                {compare ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
              <button
                type="button"
                onClick={savePhoto}
                disabled={status !== "live"}
                aria-label={t("takePhoto")}
                className={cn(
                  "flex size-14 items-center justify-center rounded-full border border-white/70 bg-white/10 backdrop-blur-md transition",
                  faceFound || frozen ? "shadow-[0_0_28px_rgba(255,255,255,0.8)]" : "opacity-45"
                )}
              >
                <Camera className="size-6" />
              </button>
              <button
                type="button"
                onClick={() => setLook({})}
                disabled={appliedCount === 0}
                aria-label={t("reset")}
                className="flex size-11 items-center justify-center rounded-full border border-white/50 bg-black/30 backdrop-blur-md disabled:opacity-40"
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
          </div>
        )}

        {photo && (
          <div className="absolute inset-0 z-10 flex flex-col bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={t("photoAlt")} className="min-h-0 flex-1 object-cover" />
            <div className="flex items-center justify-center gap-2 p-3">
              <Button asChild size="sm" className="rounded-full">
                <a href={photo} download="haru-farmasi-look.jpg">
                  <Download className="size-4" />
                  {t("savePhoto")}
                </a>
              </Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setPhoto(null)}>
                <Camera className="size-4" />
                {t("backToCamera")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom sheet: products & shades, applied instantly ── */}
      <div className="shrink-0 rounded-t-[1.75rem] border-t border-white/15 bg-[#120f0e] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        {active && (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{active.name}</p>
              <p className="truncate text-xs text-white/60">
                {activeShadeData ? `${activeShadeData.name}${activeShadeData.code ? ` · réf. ${activeShadeData.code}` : ""}` : t("pickShade")}
                {active.price != null ? ` · ${active.price.toFixed(2).replace(".", ",")} €` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={t("favorite")}
                onClick={() => activeShade >= 0 && favorites.toggle(active.slug, activeShade)}
                disabled={activeShade < 0}
                className="flex size-10 items-center justify-center rounded-full text-primary disabled:opacity-40"
              >
                <Heart className={cn("size-5", activeShade >= 0 && favorites.has(active.slug, activeShade) && "fill-current")} />
              </button>
              {dbProduct && (
                <button
                  type="button"
                  aria-label={inShelf ? t("inRoutine") : t("addToRoutine")}
                  disabled={inShelf}
                  onClick={() => addProduct(dbProduct)}
                  className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:bg-white/10 disabled:text-white"
                >
                  {inShelf ? <Check className="size-4" /> : <Plus className="size-4" />}
                </button>
              )}
              <Link
                href={`/app/product/${active.slug}`}
                aria-label={t("productSheet")}
                className="flex size-10 items-center justify-center rounded-full border border-white/25"
              >
                <ShoppingBag className="size-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Shades: tap = applied live on the face */}
        <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 py-1">
          {active?.shades?.map((shade, index) => (
            <button
              key={shade.name}
              type="button"
              aria-label={shade.name}
              aria-pressed={activeShade === index}
              onClick={() => chooseShade(active, index)}
              className={cn(
                "size-11 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-[#120f0e] transition",
                activeShade === index ? "scale-110 ring-white" : "ring-transparent"
              )}
              style={{
                background: shade.palette
                  ? `conic-gradient(${shade.palette.map((c, i, arr) => `${c} ${(i / arr.length) * 100}% ${((i + 1) / arr.length) * 100}%`).join(", ")})`
                  : shade.hex,
              }}
            />
          ))}
        </div>

        {/* Products of the selected zone */}
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {products.map((product) => {
            const applied = product.tryOn && look[product.tryOn]?.slug === product.slug;
            return (
              <button
                key={product.slug}
                type="button"
                onClick={() => setActiveSlug(product.slug)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  product.slug === active?.slug ? "border-white bg-white text-black" : "border-white/20 bg-white/[0.06]"
                )}
              >
                {applied && <span className="size-1.5 rounded-full bg-primary" />}
                <span className="max-w-[10rem] truncate">{product.name}</span>
              </button>
            );
          })}
        </div>

        {/* Zones: lips / eyes / complexion + intensity */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex flex-1 gap-1 rounded-full bg-white/[0.06] p-1">
            {CATEGORY_TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setTab(item.key);
                  const first = FARMASI_TRY_ON_PRODUCTS.find((p) => p.category === item.key);
                  if (first) setActiveSlug(first.slug);
                }}
                className={cn(
                  "flex-1 rounded-full py-2 text-sm font-medium transition",
                  tab === item.key ? "bg-primary text-primary-foreground" : "text-white/75"
                )}
              >
                {tCategories(item.key)}
              </button>
            ))}
          </div>
          <input
            type="range"
            aria-label={t("intensity")}
            min={0.2}
            max={1}
            step={0.05}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-20 accent-[var(--primary)]"
          />
        </div>
      </div>
    </div>
  );
}
