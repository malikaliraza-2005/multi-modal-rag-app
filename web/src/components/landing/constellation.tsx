"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/* The hero's 3D field. Every point is a chunk of a document. They drift in
   from scattered, settle into a slow disc, and the three brass stars of the
   mark are traced between them. Every few seconds a handful of chunks light
   up and reach for the nearest star, which is what retrieval does.

   Colours are read from the token layer rather than hard-coded, and re-read
   when the theme changes, so the scene never disagrees with the page. */

const VERT = /* glsl */ `
  attribute vec3 aStart;
  attribute float aSize;
  attribute float aSeed;
  attribute float aLit;
  uniform float uTime;
  uniform float uProgress;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying float vLit;

  void main() {
    float t = clamp((uProgress - aSeed * 0.45) / 0.55, 0.0, 1.0);
    t = 1.0 - pow(1.0 - t, 3.0);
    vec3 p = mix(aStart, position, t);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * (1.0 + aLit * 1.6) * uPixelRatio * (9.0 / -mv.z);
    float twinkle = 0.62 + 0.38 * sin(uTime * (0.4 + aSeed * 0.9) + aSeed * 40.0);
    vAlpha = twinkle * t;
    vLit = aLit;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uBrass;
  uniform float uInkAlpha;
  varying float vAlpha;
  varying float vLit;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    vec3 c = mix(uInk, uBrass, vLit);
    float a = core * vAlpha * mix(uInkAlpha, 1.0, vLit);
    gl_FragColor = vec4(c, a);
  }
`;

/** The mark's three stars, in scene units. Same proportions as the SVG. */
const ANCHORS = [
  new THREE.Vector3(-2.1, -1.55, 0.4),
  new THREE.Vector3(0, 1.85, 0.9),
  new THREE.Vector3(2.1, -1.55, 0.2),
];

const PULSE_EVERY = 2.6; // seconds
const PULSE_LIFE = 2.2;
const PULSE_COUNT = 5;

/** A token's value as written in the CSS. */
function readToken(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function Constellation({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 767px)").matches;
    const COUNT = small ? 650 : 1500;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return; // No WebGL: the hero stands on its type alone.
    }
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.4, 11);

    const world = new THREE.Group();
    scene.add(world);
    const field = new THREE.Group();
    world.add(field);

    /* ---- the chunks ---- */
    const pos = new Float32Array(COUNT * 3);
    const start = new Float32Array(COUNT * 3);
    const size = new Float32Array(COUNT);
    const seed = new Float32Array(COUNT);
    const lit = new Float32Array(COUNT);
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

    for (let i = 0; i < COUNT; i++) {
      // A thick, flattened disc, densest near the mark.
      const r = 0.6 + Math.pow(Math.random(), 0.75) * 6.2;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = gauss() * (1.5 - r * 0.12) + Math.sin(a) * r * 0.32;
      pos[i * 3 + 2] = Math.sin(a) * r * 0.9;
      // Arrive from far and scattered.
      const s = 9 + Math.random() * 10;
      const u = Math.random() * Math.PI * 2;
      const v = Math.acos(2 * Math.random() - 1);
      start[i * 3] = Math.sin(v) * Math.cos(u) * s;
      start[i * 3 + 1] = Math.sin(v) * Math.sin(u) * s * 0.6;
      start[i * 3 + 2] = Math.cos(v) * s - 4;
      size[i] = 1.4 + Math.pow(Math.random(), 3) * 4.2;
      seed[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const litAttr = new THREE.BufferAttribute(lit, 1);
    litAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("aLit", litAttr);

    const uniforms = {
      uTime: { value: 0 },
      uProgress: { value: reduced ? 2 : 0 },
      uPixelRatio: { value: dpr },
      uInk: { value: new THREE.Color() },
      uBrass: { value: new THREE.Color() },
      uInkAlpha: { value: 0.55 },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
    });
    field.add(new THREE.Points(geo, mat));

    /* ---- the three stars ---- */
    const starGeo = new THREE.BufferGeometry().setFromPoints(ANCHORS);
    const starMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        uniform float uPixelRatio; uniform float uScale;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 26.0 * uScale * uPixelRatio * (9.0 / -mv.z);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uBrass;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float core = smoothstep(0.22, 0.17, d);
          float halo = smoothstep(0.5, 0.2, d) * 0.18;
          gl_FragColor = vec4(uBrass, max(core, halo));
        }`,
      uniforms: { uPixelRatio: uniforms.uPixelRatio, uBrass: uniforms.uBrass, uScale: { value: reduced ? 1 : 0 } },
      transparent: true,
      depthWrite: false,
    });
    world.add(new THREE.Points(starGeo, starMat));

    /* The trace: an open path A → B → C, drawn on. */
    const traceArr = new Float32Array(9);
    const traceGeo = new THREE.BufferGeometry();
    traceGeo.setAttribute("position", new THREE.BufferAttribute(traceArr, 3));
    const traceMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.4 });
    world.add(new THREE.Line(traceGeo, traceMat));
    const setTrace = (p: number) => {
      const [a, b, c] = ANCHORS;
      const tmp = new THREE.Vector3();
      a.toArray(traceArr, 0);
      if (p <= 0.5) {
        tmp.lerpVectors(a, b, p / 0.5).toArray(traceArr, 3);
        tmp.toArray(traceArr, 6);
      } else {
        b.toArray(traceArr, 3);
        tmp.lerpVectors(b, c, (p - 0.5) / 0.5).toArray(traceArr, 6);
      }
      traceGeo.attributes.position.needsUpdate = true;
    };
    setTrace(reduced ? 1 : 0);

    /* ---- retrieval pulses: chunk → star ---- */
    const linkArr = new Float32Array(PULSE_COUNT * 6);
    const linkAlpha = new Float32Array(PULSE_COUNT * 2);
    const linkGeo = new THREE.BufferGeometry();
    linkGeo.setAttribute("position", new THREE.BufferAttribute(linkArr, 3));
    linkGeo.setAttribute("aAlpha", new THREE.BufferAttribute(linkAlpha, 1));
    const linkMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        attribute float aAlpha; varying float vA;
        void main() { vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uBrass; varying float vA;
        void main() { gl_FragColor = vec4(uBrass, vA * 0.55); }`,
      uniforms: { uBrass: uniforms.uBrass },
      transparent: true,
      depthWrite: false,
    });
    // Links live in the field's frame, so they turn with the chunks.
    field.add(new THREE.LineSegments(linkGeo, linkMat));

    type Pulse = { idx: number; anchor: number; born: number };
    let pulses: Pulse[] = [];
    let nextPulse = 3.2;
    const firePulse = (now: number) => {
      pulses = [];
      const target = Math.floor(Math.random() * 3);
      const anchor = ANCHORS[target];
      // The nearest few chunks to a random point near that star: a "query".
      const q = anchor.clone().add(new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(1.2));
      const best: { i: number; d: number }[] = [];
      for (let i = 0; i < COUNT; i++) {
        const d =
          (pos[i * 3] - q.x) ** 2 + (pos[i * 3 + 1] - q.y) ** 2 + (pos[i * 3 + 2] - q.z) ** 2;
        if (best.length < PULSE_COUNT || d < best[best.length - 1].d) {
          best.push({ i, d });
          best.sort((x, y) => x.d - y.d);
          if (best.length > PULSE_COUNT) best.pop();
        }
      }
      best.forEach(({ i }, k) => pulses.push({ idx: i, anchor: target, born: now + k * 0.12 }));
    };

    /* ---- colours from tokens ---- */
    const applyColours = () => {
      const ink = readToken("--n-12", "#f1efe8");
      const brass = readToken("--accent", "#c9a45c");
      // The custom shaders write straight to the screen with no colour-space
      // conversion, so they take the sRGB values untouched. The line material
      // is a built-in one and converts for itself.
      uniforms.uInk.value.setStyle(ink, THREE.LinearSRGBColorSpace);
      uniforms.uBrass.value.setStyle(brass, THREE.LinearSRGBColorSpace);
      traceMat.color.setStyle(brass);
      const dark = document.documentElement.getAttribute("data-theme") !== "light";
      uniforms.uInkAlpha.value = dark ? 0.55 : 0.42;
    };
    applyColours();
    const themeWatch = new MutationObserver(applyColours);
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    /* ---- size, pointer, scroll ---- */
    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      // Wide screens push the figure right, clear of the headline.
      const wide = w >= 900;
      world.position.x = w >= 1280 ? 3.6 : wide ? 3.1 : 0;
      world.position.y = wide ? 0 : -0.6;
      world.scale.setScalar(wide ? 1 : 0.82);
      camera.updateProjectionMatrix();
      if (reduced) render();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const scroller = el.closest("main");
    let scrollFade = 0;
    const onScroll = () => {
      if (!scroller) return;
      scrollFade = Math.min(1, scroller.scrollTop / Math.max(1, el.clientHeight));
    };
    scroller?.addEventListener("scroll", onScroll, { passive: true });

    /* ---- loop ---- */
    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;

    const render = () => renderer.render(scene, camera);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      uniforms.uTime.value = t;

      // Intro: chunks settle, then the stars appear and the trace is drawn.
      uniforms.uProgress.value = Math.min(2, t / 2.4);
      starMat.uniforms.uScale.value = THREE.MathUtils.smoothstep(t, 1.6, 2.4);
      setTrace(THREE.MathUtils.smoothstep(t, 2.0, 3.2));

      field.rotation.y += dt * 0.035;

      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      world.rotation.y = pointer.x * 0.22;
      world.rotation.x = 0.12 + pointer.y * 0.1;

      camera.position.z = 11 + scrollFade * 3;
      renderer.domElement.style.opacity = String(1 - scrollFade * 0.85);

      // Retrieval pulses.
      if (t > nextPulse) {
        firePulse(t);
        nextPulse = t + PULSE_EVERY;
      }
      lit.fill(0);
      linkAlpha.fill(0);
      field.updateMatrixWorld();
      const inv = new THREE.Matrix4().copy(field.matrix).invert();
      pulses.forEach((p, k) => {
        const age = t - p.born;
        if (age < 0 || age > PULSE_LIFE) return;
        const a = Math.min(age / 0.35, 1) * Math.min((PULSE_LIFE - age) / 0.6, 1);
        lit[p.idx] = a;
        // The star is fixed in world; bring it into the field's turning frame.
        const star = ANCHORS[p.anchor].clone().applyMatrix4(inv);
        linkArr.set([pos[p.idx * 3], pos[p.idx * 3 + 1], pos[p.idx * 3 + 2], star.x, star.y, star.z], k * 6);
        linkAlpha[k * 2] = a;
        linkAlpha[k * 2 + 1] = a * 0.2;
      });
      litAttr.needsUpdate = true;
      linkGeo.attributes.position.needsUpdate = true;
      linkGeo.attributes.aAlpha.needsUpdate = true;

      render();
    };

    resize();
    if (reduced) {
      render();
    } else {
      raf = requestAnimationFrame(tick);
    }

    // Stop drawing when the hero is off screen or the tab is hidden.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(el);
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) {
        clock.getDelta();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      themeWatch.disconnect();
      window.removeEventListener("pointermove", onPointer);
      scroller?.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      geo.dispose();
      mat.dispose();
      starGeo.dispose();
      starMat.dispose();
      traceGeo.dispose();
      traceMat.dispose();
      linkGeo.dispose();
      linkMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} aria-hidden="true" className={className} />;
}
