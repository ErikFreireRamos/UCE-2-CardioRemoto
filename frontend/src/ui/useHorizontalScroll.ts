import { useEffect, useRef } from 'react';

/** Converte o delta da roda para pixels (alguns mouses reportam linhas/páginas). */
function toPixels(delta: number, mode: number, viewport: number): number {
  if (mode === 1) return delta * 16; // DOM_DELTA_LINE
  if (mode === 2) return delta * viewport; // DOM_DELTA_PAGE
  return delta;
}

/**
 * Permite rolar um container horizontal com a RODA do mouse (que só emite deltaY) — para a
 * direita e para a esquerda. Gestos laterais de touchpad (deltaX) continuam nativos.
 *
 * O listener precisa ser registrado com `passive: false`: o React anexa `onWheel` de forma
 * passiva, e aí `preventDefault()` seria ignorado. Só bloqueamos o evento quando de fato houve
 * rolagem lateral — nas extremidades o evento segue para a página, preservando a rolagem vertical.
 */
export function useHorizontalScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      const node = ref.current;
      if (!node) return;
      if (node.scrollWidth <= node.clientWidth) return; // nada a rolar
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // gesto já é horizontal

      const antes = node.scrollLeft;
      node.scrollLeft += toPixels(e.deltaY, e.deltaMode, node.clientWidth);
      if (node.scrollLeft !== antes) e.preventDefault();
    }

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return ref;
}
