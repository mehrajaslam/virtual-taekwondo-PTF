import * as THREE from 'three';

export interface DojoEnvironment {
  group: THREE.Group;
  trailLine: THREE.Line;
  trailPointsMesh: THREE.Points;
  impactRing: THREE.Mesh;
  updateTrail: (
    points: THREE.Vector3[],
    colorHex: string,
    visible: boolean,
  ) => void;
  updateImpact: (
    active: boolean,
    worldPos: THREE.Vector3,
    intensity: number,
    colorHex: string,
  ) => void;
  dispose: () => void;
}

const MAX_TRAIL_POINTS = 48;

function createDojoMatTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0B1220';
  ctx.fillRect(0, 0, size, size);

  // Interlocking EVA Taekwondo tatami mat seams
  const step = size / 8;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.09)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  // Olympic Kyorugi outer red border + inner blue contest area
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.43;
  const innerR = size * 0.36;

  const drawOctagon = (r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  drawOctagon(outerR);
  ctx.fillStyle = '#581C28'; // Olympic warning boundary crimson
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#10B981';
  ctx.stroke();

  drawOctagon(innerR);
  ctx.fillStyle = '#112746'; // Olympic Cheong contest mat blue
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#38BDF8';
  ctx.stroke();

  // Center holographic ring
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.21, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Cheong / Hong starting stance marks
  ctx.fillStyle = '#38BDF8';
  ctx.fillRect(cx - 88, cy - 5, 44, 10);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(cx + 44, cy - 5, 44, 10);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

function createHoloPanelTexture(
  title: string,
  subtitle: string,
  accentColor: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#08101D';
  ctx.fillRect(0, 0, 512, 320);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 320);
    ctx.stroke();
  }
  for (let y = 0; y <= 320; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 492, 300);

  ctx.fillStyle = accentColor;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(title, 26, 44);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '14px sans-serif';
  ctx.fillText(subtitle, 26, 68);

  // Kinetic kick arc diagram
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(150, 205, 76, -Math.PI * 0.85, 0.08);
  ctx.stroke();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(150, 205);
  ctx.lineTo(205, 140);
  ctx.lineTo(268, 134);
  ctx.stroke();

  [
    [150, 205],
    [205, 140],
    [268, 134],
  ].forEach(([nx, ny]) => {
    ctx.beginPath();
    ctx.arc(nx, ny, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#F8FAFC';
    ctx.fill();
  });

  // Sensor spectrum bars
  for (let i = 0; i < 6; i++) {
    const h = 34 + ((i * 41) % 98);
    ctx.fillStyle = i % 2 === 0 ? accentColor : 'rgba(148, 163, 184, 0.35)';
    ctx.fillRect(322 + i * 25, 252 - h, 15, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 122);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function buildDojoEnvironment(maxAnisotropy: number): DojoEnvironment {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  // 1. Extended Arena Floor
  const outerFloorGeo = new THREE.CircleGeometry(22, 48);
  geometries.push(outerFloorGeo);
  const outerFloorMat = new THREE.MeshStandardMaterial({
    color: 0x070b12,
    roughness: 0.88,
    metalness: 0.14,
  });
  materials.push(outerFloorMat);
  const outerFloor = new THREE.Mesh(outerFloorGeo, outerFloorMat);
  outerFloor.rotation.x = -Math.PI / 2;
  outerFloor.position.y = -0.03;
  outerFloor.receiveShadow = true;
  group.add(outerFloor);

  // 2. Olympic PTF Octagonal Tatami Mat
  const matTex = createDojoMatTexture(maxAnisotropy);
  textures.push(matTex);
  const matGeo = new THREE.CylinderGeometry(3.45, 3.55, 0.045, 8);
  geometries.push(matGeo);
  const matMat = new THREE.MeshStandardMaterial({
    map: matTex,
    roughness: 0.74,
    metalness: 0.06,
  });
  materials.push(matMat);
  const matMesh = new THREE.Mesh(matGeo, matMat);
  matMesh.position.y = -0.022;
  matMesh.rotation.y = Math.PI / 8;
  matMesh.receiveShadow = true;
  group.add(matMesh);

  // 3. Recessed Holographic Emitter Ring
  const ringGeo = new THREE.TorusGeometry(2.8, 0.018, 10, 72);
  geometries.push(ringGeo);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.55,
  });
  materials.push(ringMat);
  const holoRing = new THREE.Mesh(ringGeo, ringMat);
  holoRing.rotation.x = Math.PI / 2;
  holoRing.position.y = 0.008;
  group.add(holoRing);

  // 4. Architectural Dojo Pillars & Warm Timber Accents (instanced)
  const pillarGeo = new THREE.BoxGeometry(0.24, 4.2, 0.24);
  geometries.push(pillarGeo);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x131c2e,
    metalness: 0.65,
    roughness: 0.35,
  });
  materials.push(pillarMat);

  const woodSlatGeo = new THREE.BoxGeometry(0.18, 3.8, 0.08);
  geometries.push(woodSlatGeo);
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a21,
    roughness: 0.72,
    metalness: 0.05,
  });
  materials.push(woodMat);

  const pillarPositions: [number, number][] = [
    [-4.2, -3.5],
    [4.2, -3.5],
    [-4.8, 0.4],
    [4.8, 0.4],
  ];
  for (const [px, pz] of pillarPositions) {
    const p = new THREE.Mesh(pillarGeo, pillarMat);
    p.position.set(px, 2.05, pz);
    group.add(p);

    const w = new THREE.Mesh(woodSlatGeo, woodMat);
    w.position.set(px * 0.96, 1.9, pz + 0.14);
    group.add(w);
  }

  // 5. Overhead Stadium Light Truss Ring
  const trussGeo = new THREE.TorusGeometry(3.7, 0.045, 10, 48);
  geometries.push(trussGeo);
  const trussMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.25,
    emissive: 0x0891b2,
    emissiveIntensity: 0.25,
  });
  materials.push(trussMat);
  const truss = new THREE.Mesh(trussGeo, trussMat);
  truss.rotation.x = Math.PI / 2;
  truss.position.y = 3.65;
  group.add(truss);

  // 6. Perimeter Holo Emitter Pods (8 around octagon corners)
  const podGeo = new THREE.CylinderGeometry(0.065, 0.095, 0.085, 8);
  geometries.push(podGeo);
  const podMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.25,
    emissive: 0x10b981,
    emissiveIntensity: 0.4,
  });
  materials.push(podMat);
  const pods = new THREE.InstancedMesh(podGeo, podMat, 8);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    dummy.position.set(Math.cos(a) * 2.95, 0.02, Math.sin(a) * 2.95);
    dummy.updateMatrix();
    pods.setMatrixAt(i, dummy.matrix);
  }
  pods.instanceMatrix.needsUpdate = true;
  pods.computeBoundingSphere();
  group.add(pods);

  // 7. Contact Shadow Grounding
  const shadowTex = createContactShadowTexture();
  textures.push(shadowTex);
  const shadowGeo = new THREE.PlaneGeometry(1.5, 1.5);
  geometries.push(shadowGeo);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });
  materials.push(shadowMat);
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.006;
  group.add(contactShadow);

  // 8. Background Holographic Dojo Display Screens
  const panelConfigs = [
    {
      title: 'BIOMECHANICS TELEMETRY',
      subtitle: 'Joint Angle & Pivot Velocity',
      accent: '#22D3EE',
      pos: [-2.3, 1.65, -2.75] as [number, number, number],
      rotY: 0.36,
    },
    {
      title: 'PAKISTAN TAEKWONDO FEDERATION',
      subtitle: 'Virtual Kyorugi & Poomsae Arena',
      accent: '#10B981',
      pos: [0, 1.75, -3.1] as [number, number, number],
      rotY: 0,
    },
    {
      title: 'KINETIC SCORING MATRIX',
      subtitle: 'Hogu & Headgear Sensor Planes',
      accent: '#F59E0B',
      pos: [2.3, 1.65, -2.75] as [number, number, number],
      rotY: -0.36,
    },
  ];

  const screenGeo = new THREE.PlaneGeometry(1.85, 1.15);
  geometries.push(screenGeo);
  for (const cfg of panelConfigs) {
    const tex = createHoloPanelTexture(
      cfg.title,
      cfg.subtitle,
      cfg.accent,
      maxAnisotropy,
    );
    textures.push(tex);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    });
    materials.push(mat);
    const screen = new THREE.Mesh(screenGeo, mat);
    screen.position.set(...cfg.pos);
    screen.rotation.y = cfg.rotY;
    group.add(screen);
  }

  // 9. Dynamic 3D Movement Trail
  const trailPositions = new Float32Array(MAX_TRAIL_POINTS * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeo.setDrawRange(0, 0);
  geometries.push(trailGeo);

  const trailMat = new THREE.LineBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.95,
  });
  materials.push(trailMat);
  const trailLine = new THREE.Line(trailGeo, trailMat);
  trailLine.frustumCulled = false;
  trailLine.renderOrder = 5;
  group.add(trailLine);

  const pointsMat = new THREE.PointsMaterial({
    color: 0x22d3ee,
    size: 0.052,
    transparent: true,
    opacity: 0.92,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.push(pointsMat);
  const trailPointsMesh = new THREE.Points(trailGeo, pointsMat);
  trailPointsMesh.frustumCulled = false;
  trailPointsMesh.renderOrder = 6;
  group.add(trailPointsMesh);

  // 10. Impact Shockwave Ring
  const impactGeo = new THREE.RingGeometry(0.06, 0.15, 32);
  geometries.push(impactGeo);
  const impactMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.push(impactMat);
  const impactRing = new THREE.Mesh(impactGeo, impactMat);
  impactRing.visible = false;
  impactRing.renderOrder = 7;
  group.add(impactRing);

  const updateTrail = (
    points: THREE.Vector3[],
    colorHex: string,
    visible: boolean,
  ) => {
    trailLine.visible = visible && points.length > 1;
    trailPointsMesh.visible = visible && points.length > 1;
    if (!visible || points.length < 2) {
      trailGeo.setDrawRange(0, 0);
      return;
    }

    const count = Math.min(points.length, MAX_TRAIL_POINTS);
    const attr = trailGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      attr.setXYZ(i, points[i].x, points[i].y, points[i].z);
    }
    attr.needsUpdate = true;
    trailGeo.setDrawRange(0, count);
    trailMat.color.set(colorHex);
    pointsMat.color.set(colorHex);
  };

  const updateImpact = (
    active: boolean,
    worldPos: THREE.Vector3,
    intensity: number,
    colorHex: string,
  ) => {
    if (!active || intensity <= 0.02) {
      impactRing.visible = false;
      return;
    }
    impactRing.visible = true;
    impactRing.position.copy(worldPos);
    const scale = 1 + (1 - intensity) * 2.3;
    impactRing.scale.setScalar(scale);
    impactMat.opacity = intensity * 0.9;
    impactMat.color.set(colorHex);
  };

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return {
    group,
    trailLine,
    trailPointsMesh,
    impactRing,
    updateTrail,
    updateImpact,
    dispose,
  };
}
