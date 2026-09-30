import { useEffect, useRef, useState } from "react";
import { clampMosaicCamera, zoomMosaicAt } from "./mosaic-config.mjs";

const RESET = { scale: 1, x: 0, y: 0 };

export function useElementSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    let active = true;
    const measure = () => {
      if (!active || !element?.isConnected) return;
      const { width, height } = element.getBoundingClientRect();
      setSize(previous => Math.abs(previous.width - width) < .5 && Math.abs(previous.height - height) < .5 ? previous : { width, height });
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(element);
    return () => { active = false; observer.disconnect(); };
  }, []);
  return size;
}

export default function useMosaicPanZoom({ ref, viewport, content, enabled = true, onTap, maxScale = 12 }) {
  const [camera, setCamera] = useState(RESET);
  const current = useRef(camera), options = useRef(), pointers = useRef(new Map()), gesture = useRef({ moved: false, pinched: false });
  options.current = { viewport, content, onTap, maxScale };
  const apply = next => {
    const value = clampMosaicCamera(next, options.current.viewport, options.current.content, options.current.maxScale);
    current.current = value;
    setCamera(previous => previous.scale === value.scale && previous.x === value.x && previous.y === value.y ? previous : value);
  };
  const point = event => {
    const bounds = ref.current.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  const zoom = (factor, anchor = { x: options.current.viewport.width / 2, y: options.current.viewport.height / 2 }) => {
    const settings = options.current;
    apply(zoomMosaicAt(current.current, current.current.scale * factor, anchor, settings.viewport, settings.content, settings.maxScale));
  };
  const reset = () => apply(RESET);

  useEffect(() => { apply(current.current); }, [viewport.width, viewport.height, content.width, content.height]);
  useEffect(() => {
    if (!enabled) return;
    const element = ref.current;
    const wheel = event => { event.preventDefault(); zoom(Math.exp(-Math.max(-240, Math.min(240, event.deltaY)) * .003), point(event)); };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [enabled]);

  const pair = map => {
    const [a, b] = [...map.values()];
    return { center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) };
  };
  const handlers = enabled ? {
    onPointerDown(event) {
      if (event.button !== 0) return;
      event.preventDefault(); ref.current.focus({ preventScroll: true });
      ref.current.setPointerCapture(event.pointerId);
      const position = point(event);
      if (!pointers.current.size) gesture.current = { moved: false, pinched: false, start: position };
      pointers.current.set(event.pointerId, position);
      if (pointers.current.size > 1) gesture.current.pinched = true;
    },
    onPointerMove(event) {
      const before = pointers.current.get(event.pointerId);
      if (!before) return;
      const previousPair = pointers.current.size > 1 ? pair(pointers.current) : null;
      const next = point(event); pointers.current.set(event.pointerId, next);
      if (Math.hypot(next.x - gesture.current.start.x, next.y - gesture.current.start.y) > 6) gesture.current.moved = true;
      if (previousPair) {
        const nextPair = pair(pointers.current), settings = options.current;
        const enlarged = zoomMosaicAt(current.current, current.current.scale * nextPair.distance / previousPair.distance, previousPair.center, settings.viewport, settings.content, settings.maxScale);
        apply({ ...enlarged, x: enlarged.x + nextPair.center.x - previousPair.center.x, y: enlarged.y + nextPair.center.y - previousPair.center.y });
      } else apply({ ...current.current, x: current.current.x + next.x - before.x, y: current.current.y + next.y - before.y });
    },
    onPointerUp(event) {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.delete(event.pointerId);
      ref.current.releasePointerCapture?.(event.pointerId);
      if (!pointers.current.size && !gesture.current.moved && !gesture.current.pinched) options.current.onTap?.(point(event), current.current);
    },
    onPointerCancel(event) { pointers.current.delete(event.pointerId); gesture.current.moved = true; },
    onLostPointerCapture(event) { pointers.current.delete(event.pointerId); },
    onKeyDown(event) {
      if (["+", "=", "-", "0"].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        if (event.key === "0") reset(); else zoom(event.key === "-" ? 1 / 1.5 : 1.5);
      } else if (current.current.scale > 1 && event.key.startsWith("Arrow")) {
        event.preventDefault(); event.stopPropagation();
        const delta = { ArrowLeft: [70, 0], ArrowRight: [-70, 0], ArrowUp: [0, 70], ArrowDown: [0, -70] }[event.key];
        if (delta) apply({ ...current.current, x: current.current.x + delta[0], y: current.current.y + delta[1] });
      } else if (event.key === "Enter") {
        event.preventDefault(); options.current.onTap?.({ x: viewport.width / 2, y: viewport.height / 2 }, current.current);
      }
    },
  } : {};
  return { camera, zoom, reset, handlers };
}
