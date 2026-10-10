"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Camera, CameraOff, Check, Eye, EyeOff, Heart, Plus, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCatalog, useShelf } from "@/lib/shelf-store";
import { FARMASI_TRY_ON_PRODUCTS, type FarmasiProduct, type TryOnArea } from "@/lib/seed-data/farmasi-catalog";
import { useBeautyFavorites } from "@/lib/beauty-favorites";
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
        softFilter(ctx, blur(0.03));
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = hexToRgba(shade.hex, 0.55 * intensity);
        ctx.beginPath();
        path(ctx, FACE_OVAL.map(P));
        path(ctx, LEFT_EYE.map(P));
        path(ctx, RIGHT_EYE.map(P));
        path(ctx, LIPS_OUTER.map(P));
        ctx.fill("evenodd");
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = hexToRgba(shade.hex, 0.16 * intensity);
        ctx.fill("evenodd");
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
        if (area === "highlight") ctx.globalCompositeOperation = "screen";
        else ctx.globalCompositeOperation = "multiply";
        softFilter(ctx, blur(0.035));
        for (const { c, rx, ry, color, a } of spots) {
          ctx.fillStyle = hexToRgba(color, a * intensity);
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Palettes add their blush tone too.
        if (area === "cheeks" && colors.length > 1) {
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = hexToRgba(colors[2] ?? colors[0], 0.25 * intensity);
          for (const c of [P(117), P(346)]) {
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, faceWidth * 0.06, faceWidth * 0.03, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }
      case "eyeshadow": {
        softFilter(ctx, blur(0.012));
        for (const [lid, brow] of [
          [LEFT_UPPER_LID, LEFT_BROW_LOWER],
          [RIGHT_UPPER_LID, RIGHT_BROW_LOWER],
        ] as const) {
          const lidPts = lid.map(P);
          const browPts = sampleAlong(brow.map(P), lidPts.length);
          // brow lists run outer→inner, lids run outer→inner as well.
          const layers = colors.length > 1 ? [0.55, 0.32] : [0.5];
          layers.forEach((reach, index) => {
            const top = lidPts.map((pt, i) => lerp(pt, browPts[i], reach));
            const color = colors[Math.min(index + (colors.length > 1 ? 1 : 0), colors.length - 1)];
            ctx.beginPath();
            path(ctx, [...lidPts, ...top.reverse()]);
            ctx.globalCompositeOperation = "multiply";
            ctx.fillStyle = hexToRgba(color, (index === 0 ? 0.7 : 0.75) * intensity);
            ctx.fill();
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = hexToRgba(color, 0.22 * intensity);
            ctx.fill();
          });
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
        softFilter(ctx, blur(0.004));
        ctx.beginPath();
        path(ctx, LIPS_OUTER.map(P));
        path(ctx, LIPS_INNER.map(P));
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = hexToRgba(shade.hex, (area === "lipGloss" ? 0.5 : 0.78) * intensity);
        ctx.fill("evenodd");
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = hexToRgba(shade.hex, (area === "lipGloss" ? 0.18 : 0.32) * intensity);
        ctx.fill("evenodd");
        if (area === "lipGloss") {
          // Glossy highlight on the lower lip.
          ctx.globalCompositeOperation = "screen";
          softFilter(ctx, blur(0.01));
          const c = lerp(P(14), P(17), 0.45);
          ctx.fillStyle = `rgba(255,255,255,${0.35 * intensity})`;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, dist(P(61), P(291)) * 0.18, faceWidth * 0.012, 0, 0, Math.PI * 2);
          ctx.fill();
        }
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

export function BeautyTryOn({ initialSlug, initialLook }: { initialSlug?: string; initialLook?: string }) {
  const t = useTranslations("tryOn");
  const tCategories = useTranslations("categories");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const landmarkerRef = React.useRef<VideoLandmarker | null>(null);
  const frameRef = React.useRef<number | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const lookRef = React.useRef<Look>({});
  const intensityRef = React.useRef(0.85);
  const compareRef = React.useRef(false);

  const parsedLook = parseLook(initialLook);
  const firstLookSlug = Object.values(parsedLook)[0]?.slug;
  const initialProduct = FARMASI_TRY_ON_PRODUCTS.find((p) => p.slug === (initialSlug ?? firstLookSlug));
  const [status, setStatus] = React.useState<"idle" | "starting" | "live" | "denied" | "error">("idle");
  const [faceFound, setFaceFound] = React.useState(false);
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

  React.useEffect(() => stop, [stop]);

  const start = async () => {
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks("/face-model/wasm");
      const options = (delegate: "GPU" | "CPU") => ({
        baseOptions: { modelAssetPath: "/face-model/face_landmarker.task", delegate },
        runningMode: "VIDEO" as const,
        numFaces: 1,
      });
      try {
        landmarkerRef.current = (await FaceLandmarker.createFromOptions(vision, options("GPU"))) as unknown as VideoLandmarker;
      } catch {
        landmarkerRef.current = (await FaceLandmarker.createFromOptions(vision, options("CPU"))) as unknown as VideoLandmarker;
      }
      setStatus("live");
      loop();
    } catch (error) {
      stop();
      const name = (error as { name?: string })?.name;
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
    }
  };

  const loop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas || !landmarker) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastFound = false;
    const render = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w && h) {
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        ctx.save();
        ctx.setTransform(-1, 0, 0, 1, w, 0); // selfie mirror
        ctx.drawImage(video, 0, 0, w, h);
        let found = false;
        if (!compareRef.current) {
          const result = landmarker.detectForVideo(video, performance.now());
          const raw = result.faceLandmarks?.[0];
          if (raw?.length) {
            found = true;
            drawLook(ctx, raw.map((pt) => ({ x: pt.x * w, y: pt.y * h })), lookRef.current, intensityRef.current, 1);
          }
        } else {
          found = lastFound;
        }
        ctx.restore();
        if (found !== lastFound) {
          lastFound = found;
          setFaceFound(found);
        }
      }
      frameRef.current = requestAnimationFrame(render);
    };
    render();
  };

  const products = FARMASI_TRY_ON_PRODUCTS.filter((p) => p.category === tab || (tab === "lip-makeup" && p.category === "lip-care"));
  const active = FARMASI_TRY_ON_PRODUCTS.find((p) => p.slug === activeSlug) ?? products[0];
  const activePick = active?.tryOn ? look[active.tryOn] : undefined;
  const activeShade = activePick?.slug === active?.slug ? activePick.shade : -1;
  const dbProduct = catalog.find((p) => p.slug === active?.slug);
  const inShelf = Boolean(dbProduct && shelf.some((p) => p.id === dbProduct.id));
  const appliedCount = Object.keys(look).length;

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

  return (
    <div className="mx-auto flex w-full max-w-[min(94vw,560px)] flex-col gap-4">
      <div className="text-center">
        <h1 className="font-serif text-3xl">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card className="relative gap-0 overflow-hidden p-0">
        <div className="relative aspect-[3/4] w-full bg-black">
          <video ref={videoRef} playsInline muted className="hidden" />
          <canvas ref={canvasRef} className={cn("absolute inset-0 h-full w-full object-cover", status !== "live" && "hidden")} />
          {status !== "live" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              {status === "denied" || status === "error" ? (
                <CameraOff className="size-10 text-muted-foreground" />
              ) : (
                <Sparkles className="size-10 text-primary" />
              )}
              <p className="max-w-xs text-sm text-muted-foreground">
                {status === "denied" ? t("cameraDenied") : status === "error" ? t("cameraError") : t("intro")}
              </p>
              <Button onClick={start} disabled={status === "starting"} size="lg" className="rounded-full">
                <Camera className="size-4" />
                {status === "starting" ? t("starting") : t("start")}
              </Button>
            </div>
          )}
          {status === "live" && (
            <>
              <div className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs text-white backdrop-blur">
                {faceFound ? t("faceFound") : t("noFace")}
              </div>
              <button
                type="button"
                onPointerDown={() => setCompare(true)}
                onPointerUp={() => setCompare(false)}
                onPointerLeave={() => setCompare(false)}
                onContextMenu={(e) => e.preventDefault()}
                className="absolute right-3 top-3 flex select-none items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs text-white backdrop-blur [-webkit-touch-callout:none]"
              >
                {compare ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {t("compare")}
              </button>
              {appliedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setLook({})}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs text-white backdrop-blur"
                >
                  <RotateCcw className="size-3.5" />
                  {t("reset")}
                </button>
              )}
            </>
          )}
        </div>
      </Card>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
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
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
              tab === item.key ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-secondary"
            )}
          >
            {tCategories(item.key)}
          </button>
        ))}
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {products.map((product) => {
          const applied = product.tryOn && look[product.tryOn]?.slug === product.slug;
          return (
            <button
              key={product.slug}
              type="button"
              onClick={() => setActiveSlug(product.slug)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition",
                product.slug === active?.slug ? "border-primary bg-primary/10" : "border-border bg-card"
              )}
            >
              {applied && <Check className="size-3.5 text-primary" />}
              <span className="max-w-[11rem] truncate font-medium">{product.name}</span>
            </button>
          );
        })}
      </div>

      {active && (
        <Card className="gap-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{active.name}</p>
              <p className="text-xs text-muted-foreground">
                {active.brand} · {active.size} · {active.price != null ? `${active.price.toFixed(2).replace(".", ",")} €` : ""}
              </p>
            </div>
            <button
              type="button"
              aria-label={t("favorite")}
              onClick={() => activeShade >= 0 && favorites.toggle(active.slug, activeShade)}
              disabled={activeShade < 0}
              className="rounded-full p-2 text-primary disabled:opacity-40"
            >
              <Heart className={cn("size-5", activeShade >= 0 && favorites.has(active.slug, activeShade) && "fill-current")} />
            </button>
          </div>

          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {active.shades?.map((shade, index) => (
              <button
                key={shade.name}
                type="button"
                title={shade.name}
                aria-label={shade.name}
                aria-pressed={activeShade === index}
                onClick={() => chooseShade(active, index)}
                className={cn(
                  "aspect-square w-full rounded-full ring-2 ring-offset-2 ring-offset-card transition",
                  activeShade === index ? "ring-primary" : "ring-transparent"
                )}
                style={{
                  background: shade.palette
                    ? `conic-gradient(${shade.palette.map((c, i, arr) => `${c} ${(i / arr.length) * 100}% ${((i + 1) / arr.length) * 100}%`).join(", ")})`
                    : shade.hex,
                }}
              />
            ))}
          </div>
          <p className="min-h-5 text-sm text-muted-foreground">
            {activeShade >= 0 ? active.shades?.[activeShade]?.name : t("pickShade")}
            {activeShade >= 0 && active.shades?.[activeShade]?.code ? ` · réf. ${active.shades[activeShade].code}` : ""}
          </p>

          <label className="flex items-center gap-3 text-sm">
            <span className="shrink-0 text-muted-foreground">{t("intensity")}</span>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/product/${active.slug}`}>{t("productSheet")}</Link>
            </Button>
            {dbProduct && (
              <Button size="sm" variant={inShelf ? "secondary" : "default"} disabled={inShelf} onClick={() => addProduct(dbProduct)}>
                {inShelf ? <Check className="size-4" /> : <Plus className="size-4" />}
                {inShelf ? t("inRoutine") : t("addToRoutine")}
              </Button>
            )}
          </div>
        </Card>
      )}

      <p className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-left text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        {t("privacy")}
      </p>
    </div>
  );
}
