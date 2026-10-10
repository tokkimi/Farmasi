"use client";

import * as React from "react";

const STORAGE_KEY = "haru:beauty-favorites:v1";
const EVENT = "haru:beauty-favorites";

export type BeautyFavorite = { slug: string; shade: number; addedAt: number };

function read(): BeautyFavorite[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BeautyFavorite[]) : [];
  } catch {
    return [];
  }
}

function write(list: BeautyFavorite[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Private mode / storage blocked: favourites simply don't persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Favourite makeup shades picked in the virtual try-on (kept on this device). */
export function useBeautyFavorites() {
  const [list, setList] = React.useState<BeautyFavorite[]>([]);

  React.useEffect(() => {
    const sync = () => setList(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const has = React.useCallback((slug: string, shade: number) => list.some((f) => f.slug === slug && f.shade === shade), [list]);

  const toggle = React.useCallback((slug: string, shade: number) => {
    const current = read();
    const exists = current.some((f) => f.slug === slug && f.shade === shade);
    write(exists ? current.filter((f) => !(f.slug === slug && f.shade === shade)) : [...current, { slug, shade, addedAt: Date.now() }]);
  }, []);

  return { list, has, toggle };
}
