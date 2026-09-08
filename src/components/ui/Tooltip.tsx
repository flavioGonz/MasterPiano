import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Capa única de tooltips para todo `[data-tip]`.
 *
 * Antes el tooltip era un `::after` dentro del propio botón: cualquier
 * contenedor con `overflow` lo recortaba. En el menú lateral contraído y en la
 * barra superior eso se veía todo el tiempo — el globo salía hacia arriba y
 * quedaba cortado por el borde.
 *
 * Acá se dibuja una sola vez en un portal a `position: fixed`, así que ningún
 * `overflow` lo puede tapar, y se elige el lado que entra en pantalla: se
 * prefiere el que pida `data-tip-pos`, y si no entra se da vuelta solo.
 */

type Place = 'top' | 'bottom' | 'left' | 'right';

const GAP = 8;
const EDGE = 8;
const DELAY = 110;

const isPlace = (v: string | null): v is Place =>
  v === 'top' || v === 'bottom' || v === 'left' || v === 'right';

export const TooltipLayer: React.FC = () => {
  const [tip, setTip] = useState<{ text: string; rect: DOMRect; prefer: Place } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number; place: Place } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const anchor = useRef<Element | null>(null);

  const hide = useCallback(() => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    anchor.current = null;
    setTip(null); setPos(null);
  }, []);

  const show = useCallback((el: Element) => {
    const text = el.getAttribute('data-tip');
    if (!text) return;
    const attr = el.getAttribute('data-tip-pos');
    const prefer: Place = isPlace(attr) ? attr : 'top';
    anchor.current = el;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (anchor.current !== el || !el.isConnected) return;
      setPos(null);
      setTip({ text, rect: el.getBoundingClientRect(), prefer });
    }, DELAY);
  }, []);

  useEffect(() => {
    const over = (e: Event) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (e instanceof PointerEvent && e.pointerType === 'touch') return;
      const el = t.closest('[data-tip]');
      if (!el) { if (anchor.current) hide(); return; }
      /* Al hacer clic el foco cae en el botón y volvería a abrir el globo
         encima de lo que el clic acaba de abrir. Con teclado sí queremos
         verlo, y eso es justo lo que distingue :focus-visible. */
      if (e.type === 'focusin' && !el.matches(':focus-visible')) return;
      if (el === anchor.current) return;
      show(el);
    };
    const out = (e: Event) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const el = t.closest('[data-tip]');
      if (el && el === anchor.current) {
        const to = (e as PointerEvent | FocusEvent & { relatedTarget?: EventTarget | null }).relatedTarget;
        if (to instanceof Node && el.contains(to)) return;
        hide();
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };

    document.addEventListener('pointerover', over, true);
    document.addEventListener('pointerout', out, true);
    document.addEventListener('focusin', over, true);
    document.addEventListener('focusout', out, true);
    document.addEventListener('pointerdown', hide, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerover', over, true);
      document.removeEventListener('pointerout', out, true);
      document.removeEventListener('focusin', over, true);
      document.removeEventListener('focusout', out, true);
      document.removeEventListener('pointerdown', hide, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      window.removeEventListener('keydown', onKey);
    };
  }, [show, hide]);

  /* La posición se calcula recién cuando el globo ya midió: sin el tamaño real
     no hay forma de saber si entra de un lado o del otro. */
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!tip || !box) return;
    const w = box.offsetWidth, h = box.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    const r = tip.rect;

    const fits = (p: Place) => {
      if (p === 'top') return r.top - GAP - h >= EDGE;
      if (p === 'bottom') return r.bottom + GAP + h <= vh - EDGE;
      if (p === 'left') return r.left - GAP - w >= EDGE;
      return r.right + GAP + w <= vw - EDGE;
    };
    const opposite: Record<Place, Place> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
    const order: Place[] = [tip.prefer, opposite[tip.prefer], 'bottom', 'top', 'right', 'left'];
    const place = order.find(fits) ?? tip.prefer;

    let x: number, y: number;
    if (place === 'top' || place === 'bottom') {
      x = r.left + r.width / 2 - w / 2;
      y = place === 'top' ? r.top - GAP - h : r.bottom + GAP;
    } else {
      x = place === 'left' ? r.left - GAP - w : r.right + GAP;
      y = r.top + r.height / 2 - h / 2;
    }
    x = Math.max(EDGE, Math.min(x, vw - w - EDGE));
    y = Math.max(EDGE, Math.min(y, vh - h - EDGE));
    setPos({ x, y, place });
  }, [tip]);

  if (!tip) return null;

  return createPortal(
    <div
      ref={boxRef}
      role="tooltip"
      className="tip-box"
      style={{
        transform: pos ? `translate3d(${Math.round(pos.x)}px, ${Math.round(pos.y)}px, 0)` : 'translate3d(-9999px, -9999px, 0)',
        opacity: pos ? 1 : 0,
      }}
    >
      {tip.text}
    </div>,
    document.body
  );
};
