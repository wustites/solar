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
  halo: THREE.Sprite;
  orbit: THREE.LineLoop;
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

const makeGlowTexture = (inner: string, outer: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.38, inner);
  gradient.addColorStop(1, outer);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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

const createStarField = (count: number, size: number, opacity: number, seed: number) => {
  const starGeometry = new THREE.BufferGeometry();
  const starPositions: number[] = [];
  const random = createRandom(seed);

  for (let i = 0; i < count; i++) {
    const radius = 38 + random() * 80;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    starPositions.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const starTexture = makeStarTexture();
  const starMaterial = new THREE.PointsMaterial({
    map: starTexture ?? undefined,
    color: '#dce8ff',
    size,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  return new THREE.Points(starGeometry, starMaterial);
};

const disposeObject = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (
      child instanceof THREE.Mesh ||
      child instanceof THREE.Points ||
      child instanceof THREE.Line ||
      child instanceof THREE.Sprite
    ) {
      if ('geometry' in child) {
        child.geometry.dispose();
      }
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

const smoothstep = (value: number) => {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#02040b');
    scene.fog = new THREE.FogExp2('#02040b', 0.012);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);
    camera.position.set(0, 10, 24);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight('#60789f', 0.48));

    const sunLight = new THREE.PointLight('#fff2bf', 12, 64);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight('#7eb6ff', 1.4);
    rimLight.position.set(-12, 9, 16);
    scene.add(rimLight);

    const sunGeometry = new THREE.SphereGeometry(1.45, 72, 72);
    const sunMaterial = new THREE.MeshBasicMaterial({color: '#ffe36d'});
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    sunRef.current = sun;

    const sunGlowTexture = makeGlowTexture('rgba(255,232,120,0.85)', 'rgba(255,122,30,0)');
    const sunGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sunGlowTexture ?? undefined,
        color: '#ffbf58',
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    sunGlow.scale.setScalar(5.6);
    scene.add(sunGlow);

    const outerGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sunGlowTexture ?? undefined,
        color: '#ff7b35',
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    outerGlow.scale.setScalar(9.5);
    scene.add(outerGlow);

    scene.add(createStarField(1700, 0.105, 0.62, sceneSeed));
    scene.add(createStarField(420, 0.22, 0.48, sceneSeed + 41));

    planetRefs.current = planets.map((spec, planetIndex) => {
      const orbit = createOrbitRing(spec.distance);
      scene.add(orbit);

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
        roughness: 0.62,
        metalness: spec.name === 'Mercury' ? 0.12 : 0.04
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(spec.radius, 48, 48), material);
      group.add(mesh);

      const haloTexture = makeGlowTexture('rgba(255,255,255,0.52)', 'rgba(255,255,255,0)');
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: haloTexture ?? undefined,
          color: spec.color,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      group.add(halo);

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

      return {group, mesh, halo, orbit, spec, moons};
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

    const segments = locale.segments;
    const active = getActiveSegment(frame, language);
    const activeIndex = segments.findIndex((segment) => segment.name === active.name);
    const progress = frame / durationInFrames;
    const cameraSweep = progress * Math.PI * 2;
    const target = new THREE.Vector3(0, 0, 0);
    const previousTarget = new THREE.Vector3(0, 0, 0);
    let activeRadius = 1.45;
    let previousRadius = 1.45;
    const planetPositions = new Map<string, THREE.Vector3>();

    if (sunRef.current) {
      sunRef.current.rotation.y = frame * 0.012;
      const sunIsActive = active.name === 'Sun' || active.name === 'Finale';
      const scale = (sunIsActive ? 1.16 : 1) + Math.sin(frame * 0.09) * 0.035;
      sunRef.current.scale.setScalar(scale);
    }

    planetRefs.current.forEach(({group, mesh, halo, moons, orbit, spec}, index) => {
      const planetIsActive = spec.name === active.name || active.name === 'Finale';
      const angle = frame * 0.008 * spec.speed + index * 0.52;
      mesh.position.set(Math.cos(angle) * spec.distance, 0, Math.sin(angle) * spec.distance);
      mesh.rotation.y = frame * 0.035 * (1.2 + index * 0.08);
      planetPositions.set(spec.name, mesh.position.clone());

      const pulse = 1 + Math.sin(frame * 0.08) * 0.035;
      mesh.scale.setScalar(planetIsActive ? 1.32 * pulse : 1);
      halo.position.copy(mesh.position);
      halo.scale.setScalar(spec.radius * (planetIsActive ? 5.4 + Math.sin(frame * 0.07) * 0.3 : 3.2));
      if (halo.material instanceof THREE.SpriteMaterial) {
        halo.material.opacity = planetIsActive ? 0.46 : 0.05;
      }

      if (orbit.material instanceof THREE.LineBasicMaterial) {
        orbit.material.color.set(planetIsActive ? spec.color : '#6e7ea0');
        orbit.material.opacity = planetIsActive ? 0.76 : 0.18;
      }

      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.emissive.set(planetIsActive ? spec.color : '#000000');
        mesh.material.emissiveIntensity = planetIsActive ? 0.22 : 0;
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

      group.rotation.y = Math.sin(frame * 0.003 + index) * 0.04;
    });

    const previousSegment = activeIndex > 0 ? segments[activeIndex - 1] : active;
    const previousPlanetPosition = planetPositions.get(previousSegment.name);
    if (previousPlanetPosition) {
      previousTarget.copy(previousPlanetPosition);
      previousRadius = planets.find((planet) => planet.name === previousSegment.name)?.radius ?? 1.45;
    }

    const transitionFrames = 30;
    const transitionProgress = smoothstep((frame - active.start) / transitionFrames);
    if (activeIndex > 0 && active.name !== 'Sun') {
      target.lerpVectors(previousTarget, target, transitionProgress);
      activeRadius = previousRadius + (activeRadius - previousRadius) * transitionProgress;
    }

    const activeIsPlanet = active.name !== 'Sun' && active.name !== 'Finale';
    const cameraRadius = activeIsPlanet
      ? Math.max(6.2, activeRadius * 7.4)
      : interpolate(frame, [0, 240, durationInFrames * 0.58, durationInFrames], [24, 18.5, 21, 26], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        });
    const wideOffset = active.name === 'Finale' ? 22 : 0;
    const orbitAngle =
      cameraSweep * (activeIsPlanet ? 2.05 : 0.7) + Math.sin(frame * 0.004) * 0.18;

    camera.position.set(
      target.x + Math.sin(orbitAngle) * cameraRadius + wideOffset,
      target.y + (activeIsPlanet ? 2.4 + activeRadius * 2.8 : 8.8 + Math.sin(cameraSweep * 1.15) * 2.4),
      target.z + Math.cos(orbitAngle) * cameraRadius + (active.name === 'Finale' ? 18 : 0)
    );
    camera.lookAt(target);
    camera.fov = activeIsPlanet ? 40 : 46;
    camera.updateProjectionMatrix();

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
          background:
            'radial-gradient(circle at 50% 44%, rgba(48,86,140,0.08) 0%, rgba(2,4,11,0) 42%), radial-gradient(circle at 0% 100%, rgba(255,163,72,0.12) 0%, rgba(2,4,11,0) 34%), linear-gradient(90deg, rgba(2,4,11,0.28) 0%, rgba(2,4,11,0) 34%, rgba(2,4,11,0.22) 100%)',
          boxShadow: 'inset 0 0 180px rgba(0,0,0,0.72)',
          pointerEvents: 'none'
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
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          padding: '0 72px 44px',
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            width: 360,
            height: 3,
            borderRadius: 999,
            background: 'rgba(176,199,232,0.16)',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, (frame / durationInFrames) * 100))}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #8bb8ff, #ffe08a)',
              borderRadius: 999
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
