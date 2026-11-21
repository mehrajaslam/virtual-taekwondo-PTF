import * as THREE from 'three';
import { HoloViewMode, InstructorGender } from '../types/taekwondo';
import { JointPose } from './poseEngine';

export type ArmorSide = 'none' | 'blue' | 'red';

export interface CharacterRig {
  root: THREE.Group;
  pelvis: THREE.Group;
  spine: THREE.Group;
  chest: THREE.Group;
  head: THREE.Group;
  lShoulder: THREE.Group;
  lElbow: THREE.Group;
  lHand: THREE.Group;
  rShoulder: THREE.Group;
  rElbow: THREE.Group;
  rHand: THREE.Group;
  lHip: THREE.Group;
  lKnee: THREE.Group;
  lAnkle: THREE.Group;
  lFootTip: THREE.Object3D;
  rHip: THREE.Group;
  rKnee: THREE.Group;
  rAnkle: THREE.Group;
  rFootTip: THREE.Object3D;
  beltTailLeft: THREE.Mesh;
  beltTailRight: THREE.Mesh;
  dobokMeshes: THREE.Mesh[];
  armorMeshes: THREE.Mesh[];
  hairMale: THREE.Group;
  hairFemale: THREE.Group;
  visorGroup: THREE.Group;
  skeletonMeshes: THREE.Mesh[];
  skeletonJoints: THREE.Mesh[];
  holoUniforms: { uTime: { value: number }; uImpact: { value: number } };
  setArmorSide: (side: ArmorSide) => void;
  dispose: () => void;
}

function createFresnelHoloMaterial(
  colorHex: number,
  opacity: number,
  uniforms: { uTime: { value: number }; uImpact: { value: number } },
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uTime: uniforms.uTime,
      uImpact: uniforms.uImpact,
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uImpact;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.1);
        float scan = 0.85 + 0.15 * sin(vWorldPos.y * 32.0 - uTime * 5.5);
        vec3 impactBoost = mix(uColor, vec3(0.96, 0.72, 0.15), uImpact * 0.6);
        vec3 finalCol = impactBoost * (0.48 + fresnel * 1.15) * scan;
        float alpha = clamp((0.4 + fresnel * 0.6) * uOpacity, 0.0, 1.0);
        gl_FragColor = vec4(finalCol, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function createDobokFabricTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#F3F6FA';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle ribbed martial arts dobok diamond weave
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
  ctx.lineWidth = 1;
  for (let i = -256; i < 512; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 256, 256);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i + 256, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createPtfCrestTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#064E3B';
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 6;
  ctx.strokeStyle = '#F59E0B';
  ctx.stroke();

  ctx.fillStyle = '#ECFDF5';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PTF', 64, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSculptedLatheLimb(
  profile: [number, number][],
  segments = 18,
): THREE.LatheGeometry {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, segments);
}

function createDobokCollarGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.095, 0.145);
  shape.lineTo(0, -0.065);
  shape.lineTo(0.095, 0.145);
  shape.lineTo(0.065, 0.165);
  shape.lineTo(0, -0.015);
  shape.lineTo(-0.065, 0.165);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.007,
    bevelSize: 0.006,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

export function buildTaekwondoCharacter(): CharacterRig {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const holoUniforms = {
    uTime: { value: 0 },
    uImpact: { value: 0 },
  };

  const dobokTex = createDobokFabricTexture();
  textures.push(dobokTex);
  const ptfCrestTex = createPtfCrestTexture();
  textures.push(ptfCrestTex);

  const dobokWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf4f7fb,
      map: dobokTex,
      roughness: 0.82,
      metalness: 0.03,
      transparent: true,
      opacity: 1,
    }),
  );

  const dobokTrimBlackMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.42,
      metalness: 0.12,
      transparent: true,
      opacity: 1,
    }),
  );

  const beltSatinMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x090e1a,
      roughness: 0.28,
      metalness: 0.22,
      transparent: true,
      opacity: 1,
    }),
  );

  const goldStripeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.9,
      transparent: true,
      opacity: 1,
    }),
  );

  const ptfCrestMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: ptfCrestTex,
      roughness: 0.45,
      metalness: 0.15,
      transparent: true,
      opacity: 1,
    }),
  );

  const ptfEmeraldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0x059669,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 1,
    }),
  );

  const skinMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd79b76,
      roughness: 0.56,
      metalness: 0.02,
      transparent: true,
      opacity: 1,
    }),
  );

  const lipMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb06d58,
      roughness: 0.5,
      metalness: 0.02,
      transparent: true,
      opacity: 1,
    }),
  );

  const hairMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1b1512,
      roughness: 0.65,
      metalness: 0.08,
      transparent: true,
      opacity: 1,
    }),
  );

  const scleraMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.02,
      transparent: true,
      opacity: 1,
    }),
  );

  const irisMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 1,
    }),
  );

  const visorMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.75,
      roughness: 0.12,
      metalness: 0.85,
      transparent: true,
      opacity: 0.78,
    }),
  );

  const armorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.38,
      metalness: 0.2,
      transparent: true,
      opacity: 0.94,
    }),
  );

  const holoBoneMat = trackMat(createFresnelHoloMaterial(0x22d3ee, 0.92, holoUniforms));
  const holoJointMat = trackMat(createFresnelHoloMaterial(0x10b981, 1.0, holoUniforms));

  const dobokMeshes: THREE.Mesh[] = [];
  const armorMeshes: THREE.Mesh[] = [];
  const skeletonMeshes: THREE.Mesh[] = [];
  const skeletonJoints: THREE.Mesh[] = [];

  const addDobokMesh = (
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    pos?: [number, number, number],
    rot?: [number, number, number],
  ) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    dobokMeshes.push(m);
    return m;
  };

  const addArmorMesh = (
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    pos?: [number, number, number],
    rot?: [number, number, number],
  ) => {
    const m = new THREE.Mesh(geo, armorMat);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    m.visible = false;
    m.castShadow = true;
    parent.add(m);
    armorMeshes.push(m);
    return m;
  };

  const addHoloBone = (
    parent: THREE.Object3D,
    radiusTop: number,
    radiusBottom: number,
    length: number,
    pos: [number, number, number],
    rot?: [number, number, number],
  ) => {
    const geo = trackGeo(new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 10));
    const mesh = new THREE.Mesh(geo, holoBoneMat);
    mesh.position.set(...pos);
    if (rot) mesh.rotation.set(...rot);
    mesh.renderOrder = 2;
    parent.add(mesh);
    skeletonMeshes.push(mesh);
    return mesh;
  };

  const addHoloJoint = (
    parent: THREE.Object3D,
    radius: number,
    pos: [number, number, number] = [0, 0, 0],
  ) => {
    const geo = trackGeo(new THREE.SphereGeometry(radius, 14, 12));
    const mesh = new THREE.Mesh(geo, holoJointMat);
    mesh.position.set(...pos);
    mesh.renderOrder = 3;
    parent.add(mesh);
    skeletonJoints.push(mesh);
    return mesh;
  };

  // Root & Skeleton Hierarchy
  const root = new THREE.Group();
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.9, 0);
  root.add(pelvis);

  // Sculpted Dobok Skirt & Pelvis via LatheGeometry
  const pelvisSkirtGeo = trackGeo(
    createSculptedLatheLimb([
      [0.215, -0.17],
      [0.19, -0.08],
      [0.155, 0.0],
      [0.148, 0.09],
      [0.0, 0.09],
    ]),
  );
  const skirtMesh = addDobokMesh(pelvis, pelvisSkirtGeo, dobokWhiteMat, [0, 0, 0]);
  skirtMesh.scale.set(1.06, 1, 0.82);

  // Black Belt + Sculpted Knot + Tails + Gold Dan Bars
  const beltGeo = trackGeo(new THREE.TorusGeometry(0.158, 0.022, 12, 32));
  const beltRing = addDobokMesh(pelvis, beltGeo, beltSatinMat, [0, 0.045, 0], [Math.PI / 2, 0, 0]);
  beltRing.scale.set(1.04, 0.82, 1);

  const knotGeo = trackGeo(new THREE.SphereGeometry(0.036, 12, 10));
  const knotMesh = addDobokMesh(pelvis, knotGeo, beltSatinMat, [0, 0.045, 0.145]);
  knotMesh.scale.set(1.25, 0.95, 0.85);

  const tailGeo = trackGeo(new THREE.BoxGeometry(0.036, 0.25, 0.01));
  const beltTailLeft = addDobokMesh(
    pelvis,
    tailGeo,
    beltSatinMat,
    [-0.035, -0.075, 0.152],
    [-0.1, 0, -0.2],
  );
  const beltTailRight = addDobokMesh(
    pelvis,
    tailGeo,
    beltSatinMat,
    [0.035, -0.085, 0.152],
    [-0.1, 0, 0.2],
  );
  const danGeo = trackGeo(new THREE.BoxGeometry(0.038, 0.013, 0.013));
  addDobokMesh(pelvis, danGeo, goldStripeMat, [0.066, -0.165, 0.16], [-0.1, 0, 0.2]);
  addDobokMesh(pelvis, danGeo, goldStripeMat, [0.072, -0.185, 0.16], [-0.1, 0, 0.2]);

  // Holographic Pelvis Frame
  addHoloJoint(pelvis, 0.036, [0, 0.02, 0]);
  addHoloBone(pelvis, 0.014, 0.014, 0.2, [0, -0.02, 0], [0, 0, Math.PI / 2]);

  // Spine & Chest
  const spine = new THREE.Group();
  spine.position.set(0, 0.08, 0);
  pelvis.add(spine);

  const abdomenGeo = trackGeo(
    createSculptedLatheLimb([
      [0.142, 0],
      [0.138, 0.11],
      [0.152, 0.22],
    ]),
  );
  const abdomenMesh = addDobokMesh(spine, abdomenGeo, dobokWhiteMat, [0, 0, 0]);
  abdomenMesh.scale.set(1.04, 1, 0.78);
  addHoloBone(spine, 0.016, 0.016, 0.22, [0, 0.11, -0.02]);
  addHoloJoint(spine, 0.024, [0, 0.11, -0.02]);

  const chest = new THREE.Group();
  chest.position.set(0, 0.22, 0);
  spine.add(chest);

  const torsoGeo = trackGeo(
    createSculptedLatheLimb([
      [0.15, 0],
      [0.182, 0.14],
      [0.188, 0.21],
      [0.13, 0.25],
      [0, 0.25],
    ]),
  );
  const torsoMesh = addDobokMesh(chest, torsoGeo, dobokWhiteMat, [0, 0, 0]);
  torsoMesh.scale.set(1.08, 1, 0.76);

  const collarGeo = trackGeo(createDobokCollarGeometry());
  addDobokMesh(chest, collarGeo, dobokTrimBlackMat, [0, 0.148, 0.132], [-0.18, 0, 0]);

  const crestGeo = trackGeo(new THREE.CylinderGeometry(0.034, 0.034, 0.01, 20));
  addDobokMesh(chest, crestGeo, ptfCrestMat, [0.095, 0.14, 0.138], [Math.PI / 2 - 0.1, 0.18, 0]);

  // Kyorugi Electronic Hogu (Chest Protector)
  const hoguGeo = trackGeo(new THREE.CylinderGeometry(0.196, 0.168, 0.34, 20, 1, false));
  const hoguMesh = addArmorMesh(chest, hoguGeo, [0, 0.03, 0]);
  hoguMesh.scale.set(1.06, 1, 0.8);

  // Holographic Ribcage & Spine
  addHoloBone(chest, 0.016, 0.016, 0.24, [0, 0.12, -0.02]);
  addHoloBone(chest, 0.012, 0.012, 0.38, [0, 0.18, 0], [0, 0, Math.PI / 2]);
  const ribGeo = trackGeo(new THREE.TorusGeometry(0.11, 0.008, 8, 20));
  const ribMesh1 = new THREE.Mesh(ribGeo, holoBoneMat);
  ribMesh1.position.set(0, 0.15, 0);
  ribMesh1.rotation.x = Math.PI / 2;
  chest.add(ribMesh1);
  skeletonMeshes.push(ribMesh1);
  const ribMesh2 = new THREE.Mesh(ribGeo, holoBoneMat);
  ribMesh2.position.set(0, 0.08, 0);
  ribMesh2.rotation.x = Math.PI / 2;
  ribMesh2.scale.setScalar(0.9);
  chest.add(ribMesh2);
  skeletonMeshes.push(ribMesh2);

  // Neck & Sculpted Athletic Head
  const head = new THREE.Group();
  head.position.set(0, 0.24, 0);
  chest.add(head);

  const neckGeo = trackGeo(
    createSculptedLatheLimb([
      [0.062, 0],
      [0.052, 0.05],
      [0.05, 0.11],
    ]),
  );
  addDobokMesh(head, neckGeo, skinMat, [0, 0, 0]);
  addHoloBone(head, 0.012, 0.012, 0.12, [0, 0.05, 0]);

  const craniumGeo = trackGeo(new THREE.SphereGeometry(0.116, 26, 22));
  const craniumMesh = addDobokMesh(head, craniumGeo, skinMat, [0, 0.18, 0]);
  craniumMesh.scale.set(0.88, 1.04, 0.96);

  // Jawline & Chin taper
  const jawGeo = trackGeo(new THREE.SphereGeometry(0.086, 18, 14));
  const jawMesh = addDobokMesh(head, jawGeo, skinMat, [0, 0.125, 0.018]);
  jawMesh.scale.set(0.88, 0.85, 0.92);

  // Ears
  const earGeo = trackGeo(new THREE.SphereGeometry(0.022, 10, 10));
  const earL = addDobokMesh(head, earGeo, skinMat, [0.102, 0.175, -0.005]);
  earL.scale.set(0.45, 1.15, 0.75);
  const earR = addDobokMesh(head, earGeo, skinMat, [-0.102, 0.175, -0.005]);
  earR.scale.set(0.45, 1.15, 0.75);

  // Sculpted Nose & Mouth
  const noseGeo = trackGeo(new THREE.ConeGeometry(0.014, 0.036, 8));
  addDobokMesh(head, noseGeo, skinMat, [0, 0.168, 0.112], [1.18, 0, 0]);
  const mouthGeo = trackGeo(new THREE.BoxGeometry(0.034, 0.007, 0.01));
  addDobokMesh(head, mouthGeo, lipMat, [0, 0.125, 0.095]);

  // Layered Eyes (Sclera + Iris + Brows)
  const scleraGeo = trackGeo(new THREE.SphereGeometry(0.017, 12, 12));
  const irisGeo = trackGeo(new THREE.SphereGeometry(0.011, 10, 10));
  const browGeo = trackGeo(new THREE.BoxGeometry(0.038, 0.008, 0.014));
  [1, -1].forEach((s) => {
    const sc = addDobokMesh(head, scleraGeo, scleraMat, [s * 0.039, 0.19, 0.098]);
    sc.scale.set(1.15, 0.85, 0.65);
    addDobokMesh(head, irisGeo, irisMat, [s * 0.039, 0.19, 0.106]);
    addDobokMesh(head, browGeo, hairMat, [s * 0.04, 0.214, 0.102], [0, 0, -s * 0.14]);
  });

  addHoloJoint(head, 0.056, [0, 0.175, 0]);

  // Sculpted Male Hair (athletic layered spikes + side fades)
  const hairMale = new THREE.Group();
  const hairCapGeo = trackGeo(
    new THREE.SphereGeometry(0.12, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
  );
  const mCap = addDobokMesh(hairMale, hairCapGeo, hairMat, [0, 0.188, -0.008], [-0.2, 0, 0]);
  mCap.scale.set(0.9, 1.04, 0.98);
  const tuftGeo = trackGeo(new THREE.ConeGeometry(0.038, 0.095, 7));
  addDobokMesh(hairMale, tuftGeo, hairMat, [0, 0.305, 0.038], [0.46, 0, 0]);
  addDobokMesh(hairMale, tuftGeo, hairMat, [0.048, 0.295, 0.02], [0.36, 0, -0.34]);
  addDobokMesh(hairMale, tuftGeo, hairMat, [-0.048, 0.295, 0.02], [0.36, 0, 0.34]);
  addDobokMesh(hairMale, tuftGeo, hairMat, [0.025, 0.305, -0.02], [-0.15, 0, -0.22]);
  addDobokMesh(hairMale, tuftGeo, hairMat, [-0.025, 0.305, -0.02], [-0.15, 0, 0.22]);
  head.add(hairMale);

  // Sculpted Female Hair (layered front waves + athletic high ponytail braid)
  const hairFemale = new THREE.Group();
  const fCap = addDobokMesh(hairFemale, hairCapGeo, hairMat, [0, 0.188, -0.008], [-0.15, 0, 0]);
  fCap.scale.set(0.92, 1.05, 0.99);
  const waveGeo = trackGeo(new THREE.SphereGeometry(0.052, 14, 10));
  const waveL = addDobokMesh(hairFemale, waveGeo, hairMat, [0.062, 0.24, 0.076], [0, 0, -0.25]);
  waveL.scale.set(1.15, 0.65, 0.8);
  const waveR = addDobokMesh(hairFemale, waveGeo, hairMat, [-0.062, 0.24, 0.076], [0, 0, 0.25]);
  waveR.scale.set(1.15, 0.65, 0.8);
  const ponyKnotGeo = trackGeo(new THREE.TorusGeometry(0.026, 0.009, 8, 16));
  addDobokMesh(hairFemale, ponyKnotGeo, ptfEmeraldMat, [0, 0.23, -0.118], [0.6, 0, 0]);
  const braidGeo = trackGeo(new THREE.CapsuleGeometry(0.032, 0.22, 8, 12));
  addDobokMesh(hairFemale, braidGeo, hairMat, [0, 0.125, -0.155], [0.36, 0, 0]);
  hairFemale.visible = false;
  head.add(hairFemale);

  // Sleek Holographic VR / Motion-Capture Visor
  const visorGroup = new THREE.Group();
  const visorFrameGeo = trackGeo(new THREE.BoxGeometry(0.188, 0.052, 0.068));
  addDobokMesh(visorGroup, visorFrameGeo, dobokTrimBlackMat, [0, 0.192, 0.095]);
  const visorLensGeo = trackGeo(new THREE.BoxGeometry(0.174, 0.038, 0.018));
  addDobokMesh(visorGroup, visorLensGeo, visorMat, [0, 0.192, 0.126]);
  const strapGeo = trackGeo(new THREE.TorusGeometry(0.112, 0.009, 8, 28));
  const strapMesh = addDobokMesh(visorGroup, strapGeo, dobokTrimBlackMat, [0, 0.192, -0.005], [Math.PI / 2, 0, 0]);
  strapMesh.scale.set(0.92, 1.0, 1);
  head.add(visorGroup);

  // Kyorugi Headgear
  const headgearGeo = trackGeo(new THREE.SphereGeometry(0.142, 20, 16));
  const headgearMesh = addArmorMesh(head, headgearGeo, [0, 0.19, -0.008]);
  headgearMesh.scale.set(0.94, 1.04, 1.02);

  // Sculpted Arm Builder
  const upperArmGeo = trackGeo(
    createSculptedLatheLimb([
      [0.052, -0.25],
      [0.058, -0.13],
      [0.065, -0.02],
      [0.052, 0.02],
    ]),
  );
  const forearmSleeveGeo = trackGeo(
    createSculptedLatheLimb([
      [0.046, -0.18],
      [0.052, -0.08],
      [0.054, 0],
    ]),
  );

  const buildArm = (side: 1 | -1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.21, 0.185, 0);
    chest.add(shoulder);

    addDobokMesh(shoulder, upperArmGeo, dobokWhiteMat, [0, 0, 0]);
    const shoulderCapGeo = trackGeo(new THREE.SphereGeometry(0.064, 14, 12));
    addDobokMesh(shoulder, shoulderCapGeo, dobokWhiteMat, [0, -0.005, 0]);
    addHoloJoint(shoulder, 0.03);
    addHoloBone(shoulder, 0.013, 0.012, 0.25, [0, -0.125, 0]);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.25, 0);
    shoulder.add(elbow);

    addDobokMesh(elbow, forearmSleeveGeo, dobokWhiteMat, [0, 0, 0]);
    const wristSkinGeo = trackGeo(new THREE.CylinderGeometry(0.034, 0.03, 0.065, 12));
    addDobokMesh(elbow, wristSkinGeo, skinMat, [0, -0.205, 0]);
    const sensorRingGeo = trackGeo(new THREE.TorusGeometry(0.04, 0.006, 8, 18));
    addDobokMesh(elbow, sensorRingGeo, ptfEmeraldMat, [0, -0.182, 0], [Math.PI / 2, 0, 0]);

    addHoloJoint(elbow, 0.026);
    addHoloBone(elbow, 0.011, 0.01, 0.23, [0, -0.115, 0]);

    const hand = new THREE.Group();
    hand.position.set(0, -0.24, 0);
    elbow.add(hand);

    // Multi-part clenched Taekwondo fist (palm + folded fingers + thumb)
    const palmGeo = trackGeo(new THREE.BoxGeometry(0.058, 0.062, 0.052));
    addDobokMesh(hand, palmGeo, skinMat, [0, -0.022, 0]);
    const knuckleBarGeo = trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.056, 10));
    addDobokMesh(hand, knuckleBarGeo, skinMat, [0, -0.044, 0.014], [0, 0, Math.PI / 2]);
    const thumbGeo = trackGeo(new THREE.CapsuleGeometry(0.011, 0.026, 4, 8));
    addDobokMesh(hand, thumbGeo, skinMat, [-side * 0.022, -0.028, 0.026], [0.4, 0, side * 0.8]);
    addHoloJoint(hand, 0.024, [0, -0.025, 0]);

    return { shoulder, elbow, hand };
  };

  const leftArm = buildArm(1);
  const rightArm = buildArm(-1);

  // Sculpted Leg Builder (Wide pleated Dobok trousers + tapered ankle + electronic sensor foot)
  const thighDobokGeo = trackGeo(
    createSculptedLatheLimb([
      [0.076, -0.41],
      [0.088, -0.2],
      [0.098, -0.02],
      [0.07, 0.02],
    ]),
  );
  const shinDobokGeo = trackGeo(
    createSculptedLatheLimb([
      [0.062, -0.34],
      [0.072, -0.18],
      [0.076, 0],
    ]),
  );

  const buildLeg = (side: 1 | -1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.105, -0.04, 0);
    pelvis.add(hip);

    addDobokMesh(hip, thighDobokGeo, dobokWhiteMat, [0, 0, 0]);
    addHoloJoint(hip, 0.034);
    addHoloBone(hip, 0.016, 0.014, 0.41, [0, -0.205, 0]);

    const knee = new THREE.Group();
    knee.position.set(0, -0.41, 0);
    hip.add(knee);

    addDobokMesh(knee, shinDobokGeo, dobokWhiteMat, [0, 0, 0]);
    const ankleSkinGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.036, 0.07, 12));
    addDobokMesh(knee, ankleSkinGeo, skinMat, [0, -0.37, 0]);
    const ankleSensorGeo = trackGeo(new THREE.TorusGeometry(0.047, 0.007, 8, 18));
    addDobokMesh(knee, ankleSensorGeo, ptfEmeraldMat, [0, -0.355, 0], [Math.PI / 2, 0, 0]);

    addHoloJoint(knee, 0.03);
    addHoloBone(knee, 0.013, 0.011, 0.4, [0, -0.2, 0]);

    const ankle = new THREE.Group();
    ankle.position.set(0, -0.4, 0);
    knee.add(ankle);

    // Sculpted Bare Foot + Electronic E-Foot Sensor Sock
    const heelGeo = trackGeo(new THREE.SphereGeometry(0.042, 12, 10));
    addDobokMesh(ankle, heelGeo, skinMat, [0, -0.025, -0.01]);
    const midFootGeo = trackGeo(new THREE.BoxGeometry(0.078, 0.048, 0.165));
    addDobokMesh(ankle, midFootGeo, skinMat, [0, -0.026, 0.068]);
    const forefootGeo = trackGeo(new THREE.SphereGeometry(0.04, 12, 10));
    const ff = addDobokMesh(ankle, forefootGeo, skinMat, [0, -0.028, 0.145]);
    ff.scale.set(1.02, 0.62, 0.95);

    const eSockGeo = trackGeo(new THREE.BoxGeometry(0.084, 0.028, 0.135));
    addDobokMesh(ankle, eSockGeo, dobokTrimBlackMat, [0, -0.004, 0.065]);
    const sensorDotGeo = trackGeo(new THREE.BoxGeometry(0.042, 0.008, 0.048));
    addDobokMesh(ankle, sensorDotGeo, ptfEmeraldMat, [0, 0.011, 0.072]);

    addHoloJoint(ankle, 0.024);
    addHoloBone(ankle, 0.01, 0.01, 0.17, [0, -0.02, 0.07], [Math.PI / 2, 0, 0]);

    const footTip = new THREE.Object3D();
    footTip.position.set(0, -0.022, 0.165);
    ankle.add(footTip);
    addHoloJoint(footTip, 0.018);

    return { hip, knee, ankle, footTip };
  };

  const leftLeg = buildLeg(1);
  const rightLeg = buildLeg(-1);

  const setArmorSide = (side: ArmorSide) => {
    const active = side !== 'none';
    if (side === 'blue') {
      armorMat.color.setHex(0x0284c7);
    } else if (side === 'red') {
      armorMat.color.setHex(0xdc2626);
    }
    for (const m of armorMeshes) {
      m.visible = active;
    }
  };

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return {
    root,
    pelvis,
    spine,
    chest,
    head,
    lShoulder: leftArm.shoulder,
    lElbow: leftArm.elbow,
    lHand: leftArm.hand,
    rShoulder: rightArm.shoulder,
    rElbow: rightArm.elbow,
    rHand: rightArm.hand,
    lHip: leftLeg.hip,
    lKnee: leftLeg.knee,
    lAnkle: leftLeg.ankle,
    lFootTip: leftLeg.footTip,
    rHip: rightLeg.hip,
    rKnee: rightLeg.knee,
    rAnkle: rightLeg.ankle,
    rFootTip: rightLeg.footTip,
    beltTailLeft,
    beltTailRight,
    dobokMeshes,
    armorMeshes,
    hairMale,
    hairFemale,
    visorGroup,
    skeletonMeshes,
    skeletonJoints,
    holoUniforms,
    setArmorSide,
    dispose,
  };
}

export function setCharacterAppearance(
  rig: CharacterRig,
  gender: InstructorGender,
  viewMode: HoloViewMode,
  showVisor: boolean,
) {
  rig.hairMale.visible = gender === 'male';
  rig.hairFemale.visible = gender === 'female';
  rig.visorGroup.visible = showVisor && viewMode !== 'skeleton';

  if (gender === 'female') {
    rig.chest.scale.set(0.92, 0.98, 0.92);
    rig.pelvis.scale.set(0.96, 1, 0.96);
  } else {
    rig.chest.scale.set(1.03, 1, 1.0);
    rig.pelvis.scale.set(1, 1, 1);
  }

  const showDobok = viewMode !== 'skeleton';
  const dobokOpacity = viewMode === 'xray' ? 0.28 : 1.0;
  const showSkeleton = viewMode !== 'dobok';

  for (const mesh of rig.dobokMeshes) {
    mesh.visible = showDobok;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.opacity = dobokOpacity;
    mat.depthWrite = viewMode === 'dobok';
    mat.transparent = viewMode !== 'dobok';
  }

  for (const m of rig.skeletonMeshes) {
    m.visible = showSkeleton;
  }
  for (const j of rig.skeletonJoints) {
    j.visible = showSkeleton;
  }
}

export function applyPoseToCharacter(
  rig: CharacterRig,
  pose: JointPose,
  idleSway = 0,
) {
  rig.pelvis.position.set(
    pose.hipPos[0],
    pose.hipPos[1] + Math.sin(idleSway * 2) * 0.008,
    pose.hipPos[2],
  );
  rig.pelvis.rotation.set(...pose.pelvisRot);
  rig.spine.rotation.set(
    pose.spineRot[0] + Math.sin(idleSway * 2) * 0.012,
    pose.spineRot[1],
    pose.spineRot[2],
  );
  rig.chest.rotation.set(...pose.chestRot);
  rig.head.rotation.set(...pose.headRot);

  // Dynamic subtle black belt tail swing during kicks/rotations
  const swayAngle = Math.sin(idleSway * 3.5) * 0.06 + Math.abs(pose.pelvisRot[1]) * 0.08;
  rig.beltTailLeft.rotation.z = -0.2 - swayAngle;
  rig.beltTailRight.rotation.z = 0.2 + swayAngle;

  rig.lShoulder.rotation.set(...pose.lShoulderRot);
  rig.lElbow.rotation.set(...pose.lElbowRot);
  rig.rShoulder.rotation.set(...pose.rShoulderRot);
  rig.rElbow.rotation.set(...pose.rElbowRot);

  rig.lHip.rotation.set(...pose.lHipRot);
  rig.lKnee.rotation.set(...pose.lKneeRot);
  rig.lAnkle.rotation.set(...pose.lAnkleRot);

  rig.rHip.rotation.set(...pose.rHipRot);
  rig.rKnee.rotation.set(...pose.rKneeRot);
  rig.rAnkle.rotation.set(...pose.rAnkleRot);
}
