import React, {useEffect, useMemo, useRef} from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';
import * as THREE from 'three';
import {Language, locales} from './narration';

type PlanetSpec = {
  name: string;
  radius: number;
  distance: number;
  color: string;
  speed: number;
  tilt: number;
  moons?: number;
};

type PlanetRuntime = {
  group: THREE.Group;
  mesh: THREE.Mesh;
  spec: PlanetSpec;
  moons: THREE.Mesh[];
};

const planets: PlanetSpec[] = [
  {name: 'Mercury', radius: 0.28, distance: 3.0, color: '#9a8f84', speed: 4.1, tilt: 0.02},
  {name: 'Venus', radius: 0.42, distance: 4.2, color: '#d8a45f', speed: 3.1, tilt: 0.04},
  {name: 'Earth', radius: 0.46, distance: 5.6, color: '#2f84d6', speed: 2.5, tilt: 0.18, moons: 1},
  {name: 'Mars', radius: 0.34, distance: 7.0, color: '#c85b3a', speed: 2.0, tilt: 0.12},
  {name: 'Jupiter', radius: 0.9, distance: 9.3, color: '#d3a36d', speed: 1.35, tilt: 0.05, moons: 3},
  {name: 'Saturn', radius: 0.78, distance: 12.0, color: '#d9c082', speed: 1.05, tilt: 0.2, moons: 2},
  {name: 'Uranus', radius: 0.6, distance: 14.5, color: '#84d6df', speed: 0.78, tilt: 0.65},
  {name: 'Neptune', radius: 0.58, distance: 16.6, color: '#426ce4', speed: 0.62, tilt: 0.22}
];

const fontFamily =
  'Inter, "Noto Sans CJK SC", "Noto Sans CJK JP", "Noto Sans CJK KR", "Noto Sans SC", "Noto Sans JP", "Noto Sans KR", "Microsoft YaHei", "Yu Gothic", "Malgun Gothic", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const createRandom = (seed: number) => {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

const makePlanetTexture = (base: string, accent: string, seed: number) => {
  const random = createRandom(seed);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 36; i++) {
    const y = random() * canvas.height;
    const height = 3 + random() * 16;
    context.globalAlpha = 0.18 + random() * 0.25;
    context.fillStyle = i % 2 === 0 ? accent : '#ffffff';
    context.fillRect(0, y, canvas.width, height);
  }

  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const makeStarTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(190,220,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);

  return new THREE.CanvasTexture(canvas);
};

const createOrbitRing = (radius: number) => {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
  const points = curve.getPoints(192).map((point) => new THREE.Vector3(point.x, 0, point.y));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: '#6e7ea0',
    transparent: true,
    opacity: 0.25
  });

  return new THREE.LineLoop(geometry, material);
};

const disposeObject = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    }
  });
};

type SolarSystemProps = {
  language: Language;
};

const getActiveSegment = (frame: number, language: Language) => {
  const segments = locales[language].segments;

  return (
    segments.find((segment) => frame >= segment.start && frame < segment.end) ??
    segments[segments.length - 1]
  );
};

export const SolarSystem: React.FC<SolarSystemProps> = ({language}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sunRef = useRef<THREE.Mesh | null>(null);
  const planetRefs = useRef<PlanetRuntime[]>([]);
  const frame = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();
  const locale = locales[language];
  const activeSegment = getActiveSegment(frame, language);
  const segmentProgress = interpolate(
    frame,
    [activeSegment.start, activeSegment.start + 24, activeSegment.end - 24, activeSegment.end],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  const titleOpacity = interpolate(frame, [0, 45, 520, 580], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const titleY = interpolate(frame, [0, 55], [18, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const sceneSeed = useMemo(() => 112358, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#02040b');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);
    camera.position.set(0, 10, 24);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight('#5d7199', 0.6));

    const sunLight = new THREE.PointLight('#fff5c8', 9, 55);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const sunGeometry = new THREE.SphereGeometry(1.45, 72, 72);
    const sunMaterial = new THREE.MeshBasicMaterial({color: '#ffd15c'});
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    sunRef.current = sun;

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(1.9, 72, 72),
      new THREE.MeshBasicMaterial({
        color: '#ff8f3a',
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending
      })
    );
    scene.add(glow);

    const starTexture = makeStarTexture();
    const starGeometry = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    const random = createRandom(sceneSeed);
    for (let i = 0; i < 1800; i++) {
      const radius = 38 + random() * 70;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      starPositions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      map: starTexture ?? undefined,
      color: '#dce8ff',
      size: 0.12,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    scene.add(new THREE.Points(starGeometry, starMaterial));

    planetRefs.current = planets.map((spec, planetIndex) => {
      scene.add(createOrbitRing(spec.distance));

      const group = new THREE.Group();
      group.rotation.z = spec.tilt;
      scene.add(group);

      const texture = makePlanetTexture(
        spec.color,
        spec.name === 'Earth' ? '#70c779' : '#2f2f3a',
        sceneSeed + planetIndex * 97
      );
      const material = new THREE.MeshStandardMaterial({
        color: spec.color,
        map: texture ?? undefined,
        roughness: 0.72,
        metalness: 0.02
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(spec.radius, 48, 48), material);
      group.add(mesh);

      if (spec.name === 'Saturn') {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(spec.radius * 1.35, spec.radius * 2.1, 96),
          new THREE.MeshStandardMaterial({
            color: '#e5d49b',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.62
          })
        );
        ring.rotation.x = Math.PI / 2.4;
        mesh.add(ring);
      }

      const moons = Array.from({length: spec.moons ?? 0}, (_, index) => {
        const moon = new THREE.Mesh(
          new THREE.SphereGeometry(spec.radius * 0.16, 24, 24),
          new THREE.MeshStandardMaterial({color: '#d8dde8', roughness: 0.85})
        );
        moon.userData.moonOffset = index * 2.1;
        group.add(moon);
        return moon;
      });

      return {group, mesh, spec, moons};
    });

    return () => {
      disposeObject(scene);
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      sunRef.current = null;
      planetRefs.current = [];
    };
  }, [height, sceneSeed, width]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    if (!renderer || !scene || !camera) {
      return;
    }

    const active = getActiveSegment(frame, language);
    const progress = frame / durationInFrames;
    const cameraSweep = progress * Math.PI * 2;
    const target = new THREE.Vector3(0, 0, 0);
    let activeRadius = 1.45;

    if (sunRef.current) {
      sunRef.current.rotation.y = frame * 0.012;
      const sunIsActive = active.name === 'Sun' || active.name === 'Finale';
      const scale = (sunIsActive ? 1.1 : 1) + Math.sin(frame * 0.09) * 0.025;
      sunRef.current.scale.setScalar(scale);
    }

    planetRefs.current.forEach(({group, mesh, moons, spec}, index) => {
      const planetIsActive = spec.name === active.name || active.name === 'Finale';
      const angle = frame * 0.008 * spec.speed + index * 0.52;
      mesh.position.set(Math.cos(angle) * spec.distance, 0, Math.sin(angle) * spec.distance);
      mesh.rotation.y = frame * 0.035 * (1.2 + index * 0.08);
      mesh.scale.setScalar(planetIsActive ? 1.34 : 1);

      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.emissive.set(planetIsActive ? spec.color : '#000000');
        mesh.material.emissiveIntensity = planetIsActive ? 0.18 : 0;
      }

      if (spec.name === active.name) {
        target.copy(mesh.position);
        activeRadius = spec.radius;
      }

      moons.forEach((moon, moonIndex) => {
        const moonAngle = frame * 0.055 * (1 + moonIndex * 0.3) + moon.userData.moonOffset;
        const moonDistance = spec.radius * (2.4 + moonIndex * 0.6);
        moon.position.set(
          mesh.position.x + Math.cos(moonAngle) * moonDistance,
          Math.sin(moonAngle * 0.8) * spec.radius * 0.45,
          mesh.position.z + Math.sin(moonAngle) * moonDistance
        );
      });

      group.rotation.y = Math.sin(frame * 0.003 + index) * 0.03;
    });

    const activeIsPlanet = active.name !== 'Sun' && active.name !== 'Finale';
    const cameraRadius = activeIsPlanet
      ? Math.max(7, activeRadius * 8)
      : interpolate(frame, [0, 240, 1220, durationInFrames], [24, 19, 21, 25], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        });
    const wideOffset = active.name === 'Finale' ? 22 : 0;
    const orbitAngle = cameraSweep * (activeIsPlanet ? 2.2 : 0.7);

    camera.position.set(
      target.x + Math.sin(orbitAngle) * cameraRadius + wideOffset,
      target.y + (activeIsPlanet ? 2.8 + activeRadius * 3 : 9 + Math.sin(cameraSweep * 1.15) * 2.2),
      target.z + Math.cos(orbitAngle) * cameraRadius + (active.name === 'Finale' ? 18 : 0)
    );
    camera.lookAt(target);

    renderer.render(scene, camera);
  }, [durationInFrames, frame, language]);

  return (
    <AbsoluteFill style={{backgroundColor: '#02040b'}}>
      <Audio src={staticFile(locale.audioFile)} volume={0.96} />
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          padding: 72,
          background:
            'linear-gradient(180deg, rgba(2,4,11,0) 42%, rgba(2,4,11,0.58) 100%)',
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            color: '#f7fbff',
            fontFamily,
            textShadow: '0 10px 34px rgba(0,0,0,0.45)'
          }}
        >
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.2,
              letterSpacing: 0,
              color: '#9fb8d8',
              marginBottom: 14
            }}
          >
            {locale.heroKicker} / {locale.languageLabel}
          </div>
          <div
            style={{
              fontSize: 86,
              lineHeight: 0.95,
              fontWeight: 800,
              letterSpacing: 0
            }}
          >
            {locale.heroTitle}
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          padding: 72,
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            opacity: segmentProgress,
            transform: `translateY(${interpolate(segmentProgress, [0, 1], [12, 0])}px)`,
            width: 620,
            color: '#f7fbff',
            fontFamily,
            textShadow: '0 10px 32px rgba(0,0,0,0.5)'
          }}
        >
          <div
            style={{
              fontSize: 64,
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: 0,
              marginBottom: 18
            }}
          >
            {activeSegment.title}
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              letterSpacing: 0,
              color: '#c8d6ec'
            }}
          >
            {activeSegment.description}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
