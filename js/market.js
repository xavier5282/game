export function createMarket(THREE, scene, box, mat, makePerson, colliders, notify) {
  const shopDefinitions = [
    { type: 'grocery', category: 'মুদি দোকান', title: 'রহিম স্টোর', color: 0xc9a227, owner: 'Rahim Mia', hours: [8, 22] },
    { type: 'tea', category: 'চায়ের দোকান', title: 'মধুমিতা টি স্টল', color: 0x2f8f5b, owner: 'Kalam Mia', hours: [6, 23] },
    { type: 'clothing', category: 'কাপড়ের দোকান', title: 'তাজ ফ্যাশন', color: 0xd6402b, owner: 'Shirin Apa', hours: [10, 21] },
    { type: 'mobile', category: 'মোবাইল সামগ্রী', title: 'আনোয়ার টেলিকম', color: 0x2a6fb0, owner: 'Anwar', hours: [9, 22] },
    { type: 'pharmacy', category: 'ফার্মেসি', title: 'আরোগ্য ফার্মেসি', color: 0x3aa88f, owner: 'Dr. Babul', hours: [7, 23] },
    { type: 'restaurant', category: 'রেস্তোরাঁ', title: 'স্বাদ ঘর', color: 0x9b4f96, owner: 'Nasir', hours: [10, 23] },
    { type: 'vegetable', category: 'সবজি বাজার', title: 'কাঁচা বাজার', color: 0x7aa63a, owner: 'Jorina', hours: [6, 20] },
    { type: 'grocery', category: 'মুদি দোকান', title: 'সততা বিতান', color: 0xe07b2f, owner: 'Habib', hours: [8, 22] },
  ];
  const shops = [];
  const pedestrians = [];
  const vehicles = [];
  const cameraObstacles = [];
  const sharedMaterials = new Map();
  const sharedMaterial = color => {
    if (!sharedMaterials.has(color)) sharedMaterials.set(color, mat(color));
    return sharedMaterials.get(color);
  };
  const sharedBox = (w, h, d, color, x, y, z, parent = scene) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sharedMaterial(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const signMaterial = (category, title, color) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const context = canvas.getContext('2d');
    context.fillStyle = `#${new THREE.Color(color).getHexString()}`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#f2e6cf';
    context.textAlign = 'center';
    context.font = '700 54px "Hind Siliguri",sans-serif';
    context.fillText(title, 256, 68);
    context.font = '500 34px "Hind Siliguri",sans-serif';
    context.fillText(category, 256, 125);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: texture });
  };
  const streetLamps = [];
  const lampLights = [];
  let elapsed = 0;
  let density = 'normal';
  let dangerUntil = 0;
  let policeAlerted = false;
  let lastSprintStartle = -Infinity;
  let audioContext = null;
  let audioMaster = null;
  let hornTimer = 12;

  const createShop = (definition, index) => {
    const side = index < 4 ? -1 : 1;
    const x = [-30, -10, 10, 30][index % 4] + (side > 0 ? 5 : 0);
    const z = side * 13;
    const front = side * 9.1;
    const tint = definition.color;

    cameraObstacles.push(
      sharedBox(0.35, 5.5, 7.6, 0xd1c3a6, x - 3.82, 2.85, z),
      sharedBox(0.35, 5.5, 7.6, 0xd1c3a6, x + 3.82, 2.85, z),
      sharedBox(7.7, 5.5, 0.35, 0xe8dcc0, x, 2.85, z + side * 3.82),
      sharedBox(8.15, 0.4, 8.15, 0xb59a71, x, 5.65, z)
    );
    sharedBox(8, 0.18, 8, 0x9c8a6e, x, 0.12, z);
    sharedBox(0.18, 0.18, 8.1, tint, x, 3.75, front);
    sharedBox(8.15, 0.24, 2.2, tint, x, 3.75, side * 8.2);
    sharedBox(6, 0.9, 1.25, 0x7a5230, x, 0.62, side * 8.3);

    for (let shelf = -1; shelf <= 1; shelf++) {
      sharedBox(0.18, 2.4, 0.35, 0x684d34, x + shelf * 2.15, 1.5, side * 13.9);
      for (let level = 0; level < 2; level++) {
        sharedBox(0.8, 0.62, 0.35, [0xd98b35, 0x6da35a, 0xc94837][(index + shelf + level + 6) % 3],
          x + shelf * 2.15, 1.15 + level * 0.85, side * 13.55);
      }
    }

    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 2), signMaterial(definition.category, definition.title, tint));
    sign.position.set(x, 5, front + side * 0.03);
    sign.rotation.y = side > 0 ? Math.PI : 0;
    scene.add(sign);
    const awning = sharedBox(8.5, 0.18, 2.8, tint, x, 3.65, side * 8.15);
    awning.rotation.x = side * 0.16;

    for (let support = -1; support <= 1; support += 2) {
      sharedBox(0.18, 2.7, 0.18, 0x65472c, x + support * 4, 1.45, side * 8.1);
    }
    colliders.push({ x, z, hw: 3.75, hd: 3.75 });

    const shopkeeper = makePerson(0xe8c8a0, [0x2a6fb0, 0x7a3b2e, 0x3d7a4f, 0x8a6d1f][index % 4], 0xffffff);
    shopkeeper.position.set(x + 1.6, 0, side * 7.05);
    shopkeeper.rotation.y = side > 0 ? Math.PI : 0;
    scene.add(shopkeeper);

    const shop = {
      ...definition,
      x,
      z,
      side,
      owner: definition.owner,
      pos: shopkeeper.position,
      npc: shopkeeper,
      signMaterial: sign.material,
      isOpen: true,
      visited: false,
    };
    shops.push(shop);

    if (definition.type === 'tea' || definition.type === 'restaurant') {
      for (let table = 0; table < 2; table++) {
        const tx = x + (table ? 5.3 : -5.3);
        sharedBox(1.7, 0.18, 1.2, 0x835634, tx, 0.95, side * 7.2);
        for (const legX of [-0.65, 0.65]) {
          sharedBox(0.12, 0.9, 0.12, 0x55391f, tx + legX, 0.48, side * 7.2);
        }
        for (let seat = -1; seat <= 1; seat += 2) {
          sharedBox(0.65, 0.18, 0.65, 0x416b55, tx + seat * 1.2, 0.55, side * 7.2);
        }
      }
    }
  };

  const makeTree = (x, z) => {
    sharedBox(0.5, 2.6, 0.5, 0x6b4a2b, x, 1.3, z);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.9, 8, 6), sharedMaterial(0x2f7a3b));
    leaves.position.set(x, 3.7, z);
    leaves.castShadow = true;
    scene.add(leaves);
    cameraObstacles.push(leaves);
  };
  const makeLamp = (x, z) => {
    sharedBox(0.2, 6, 0.2, 0x333333, x, 3, z);
    sharedBox(0.9, 0.2, 0.2, 0x333333, x, 6, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff0b0 }));
    bulb.position.set(x + 0.4, 5.85, z);
    scene.add(bulb);
    streetLamps.push(bulb);
    if (lampLights.length < 6) {
      const light = new THREE.PointLight(0xffcc88, 0, 16, 2);
      light.position.set(x + 0.4, 5.75, z);
      scene.add(light);
      lampLights.push(light);
    }
  };

  const makeRickshaw = (x, lane, direction, color) => {
    const group = new THREE.Group();
    sharedBox(1.2, 0.2, 2, color, 0, 0.9, 0, group);
    sharedBox(1.2, 1.1, 0.2, color, 0, 1.5, -0.8, group);
    const canopy = sharedBox(1.5, 0.12, 1.7, 0xd6402b, 0, 2.25, -0.35, group);
    canopy.rotation.x = 0.25;
    const wheels = [];
    for (const position of [[-0.7, 0.45, 0.9], [0.7, 0.45, 0.9], [0, 0.45, -1.2]]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.055, 5, 12), sharedMaterial(0x171717));
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(...position);
      group.add(wheel);
      wheels.push(wheel);
    }
    group.position.set(x, 0, lane);
    group.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(group);
    vehicles.push({ group, wheels, x, lane, direction, speed: 3.1, length: 3, type: 'rickshaw' });
  };
  const makeCar = (x, lane, direction) => {
    const group = new THREE.Group();
    sharedBox(1.8, 0.75, 3.6, 0x315e80, 0, 0.85, 0, group);
    sharedBox(1.45, 0.8, 1.75, 0x91b3c2, 0, 1.55, -0.05, group);
    sharedBox(1.9, 0.14, 0.18, 0xe6d7a2, 0, 0.95, 1.83, group);
    const wheels = [];
    for (const position of [[-0.95, 0.46, 1.15], [0.95, 0.46, 1.15], [-0.95, 0.46, -1.15], [0.95, 0.46, -1.15]]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.11, 5, 12), sharedMaterial(0x171717));
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(...position);
      group.add(wheel);
      wheels.push(wheel);
    }
    group.position.set(x, 0, lane);
    group.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(group);
    vehicles.push({ group, wheels, x, lane, direction, speed: 5.4, length: 5, type: 'car' });
  };
  const makeMotorcycle = (x, lane, direction) => {
    const group = new THREE.Group();
    sharedBox(0.42, 0.5, 1.35, 0xd74a30, 0, 0.9, 0, group);
    sharedBox(0.5, 0.15, 0.8, 0x222222, 0, 1.25, -0.08, group);
    const wheels = [];
    for (const z of [-0.72, 0.72]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 5, 12), sharedMaterial(0x171717));
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(0, 0.35, z);
      group.add(wheel);
      wheels.push(wheel);
    }
    group.position.set(x, 0, lane);
    group.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(group);
    vehicles.push({ group, wheels, x, lane, direction, speed: 7.2, length: 2, type: 'motorcycle' });
  };

  const createPedestrian = (index, densityLevel) => {
    const roles = [
      'pedestrian', 'customer', 'tea customer', 'pedestrian', 'street vendor', 'security guard',
      'customer', 'pedestrian', 'tea customer', 'pedestrian', 'customer', 'pedestrian',
    ];
    const role = roles[index];
    const shirtColors = [0x387a65, 0x4d6096, 0x8b5239, 0x6b7b3d, 0x9b7332, 0x38414b];
    const npc = makePerson(0xc8956a, shirtColors[index % shirtColors.length], 0xffffff);
    const side = role === 'street vendor' ? -1 : index % 2 ? 1 : -1;
    const direction = index % 4 < 2 ? 1 : -1;
    const x = role === 'street vendor' ? -3 : -57 + (index * 19 % 114);
    const routeZ = side * 8.55;
    npc.position.set(x, 0, routeZ);
    npc.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    npc.userData.role = role;
    npc.userData.densityLevel = densityLevel;
    scene.add(npc);
    const targetShop = role === 'tea customer'
      ? shops.find(shop => shop.type === 'tea')
      : shops[(index * 3) % shops.length];
    pedestrians.push({
      npc, role, side, direction, routeZ, targetShop, state: 'walk',
      timer: 2 + (index % 5), fleeUntil: 0, speed: 1.15 + (index % 4) * 0.13,
    });
  };

  shopDefinitions.forEach(createShop);

  for (let x = -60; x <= 60; x += 15) {
    makeLamp(x, -5.4);
    makeLamp(x + 7, 5.4);
  }
  [-52, -20, 20, 52].forEach((x, index) => {
    makeTree(x, -6.6);
    makeTree(x + 9, 6.6);
  });
  const wireMaterial = new THREE.LineBasicMaterial({ color: 0x222222 });
  [-5.4, 5.4].forEach(z => {
    const points = [];
    for (let x = -60; x <= 60; x += 15) points.push(new THREE.Vector3(x, 6, z));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), wireMaterial));
  });
  for (const crossingX of [-27, 27]) {
    for (let stripe = -3; stripe <= 3; stripe++) {
      sharedBox(0.45, 0.025, 8, 0xe6ddc9, crossingX + stripe * 0.75, 0.13, 0);
    }
  }

  for (const x of [-47, -3, 43]) {
    const vendor = sharedBox(2.4, 0.95, 1.5, 0x9a6637, x, 0.75, -9.4);
    vendor.rotation.y = Math.PI / 2;
    for (let crate = 0; crate < 3; crate++) {
      sharedBox(0.45, 0.42, 0.45, [0xbf4937, 0x70a447, 0xd6a431][crate], x + (crate - 1) * 0.55, 1.43, -9.4);
    }
  }
  for (const x of [-38, -7, 24, 50]) {
    sharedBox(2.4, 0.16, 0.52, 0x78583c, x, 0.72, 8.7);
    for (const leg of [-0.9, 0.9]) sharedBox(0.12, 0.7, 0.12, 0x51391f, x + leg, 0.35, 8.7);
  }
  for (const [x, z] of [[-43, 9.2], [4, -9.5], [39, 9.2]]) {
    sharedBox(0.85, 1.1, 0.75, 0x3d4d4a, x, 0.55, z);
    sharedBox(0.95, 0.12, 0.85, 0x202c2a, x, 1.12, z);
  }

  makeRickshaw(-46, 2.2, 1, 0x2a8fb0);
  makeRickshaw(-6, -2.2, -1, 0xe0a030);
  makeRickshaw(39, 2.2, 1, 0x9b4f96);
  makeCar(-27, -2.2, -1);
  makeMotorcycle(18, 2.2, 1);
  for (let i = 0; i < 12; i++) createPedestrian(i, i);

  const getNearestShop = position => {
    let nearest = null;
    let distance = 4.7;
    for (const shop of shops) {
      const candidate = shop.pos.distanceTo(position);
      if (candidate < distance) {
        distance = candidate;
        nearest = shop;
      }
    }
    return nearest;
  };

  const notifyPolice = position => {
    if (policeAlerted) return;
    policeAlerted = true;
    window.dispatchEvent(new CustomEvent('market:police-notified', {
      detail: { x: position.x, z: position.z, witnessCount: 1 },
    }));
    notify('একজন সাক্ষী বাজারের নিরাপত্তাকে খবর দিয়েছেন।');
    window.setTimeout(() => { policeAlerted = false; }, 12000);
  };

  const startDanger = (position, duration = 7) => {
    dangerUntil = Math.max(dangerUntil, elapsed + duration);
    let witnesses = 0;
    for (const pedestrian of pedestrians) {
      const distance = Math.hypot(pedestrian.npc.position.x - position.x, pedestrian.npc.position.z - position.z);
      if (distance <= 22 && pedestrian.npc.visible) {
        pedestrian.state = pedestrian.role === 'security guard' ? 'respond' : 'flee';
        pedestrian.fleeUntil = dangerUntil;
        pedestrian.alertPosition = { x: position.x, z: position.z };
        pedestrian.direction = pedestrian.npc.position.x < position.x ? -1 : 1;
        witnesses++;
      }
    }
    if (witnesses) notifyPolice(position);
    notify(witnesses ? `${witnesses} জন NPC বিপদের প্রতিক্রিয়া দেখাচ্ছেন${policeAlerted ? ' · নিরাপত্তাকে জানানো হয়েছে' : ''}।` : 'বাজারে একটি বিপদের খবর পাওয়া গেছে।');
  };
  window.addEventListener('game:danger', event => {
    const position = event.detail?.position || { x: 0, z: 0 };
    startDanger(position, Math.min(20, Math.max(3, Number(event.detail?.duration) || 7)));
  });

  const createAudio = () => {
    if (audioContext) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      notify('এই ব্রাউজারে বাজারের অডিও সমর্থিত নয়।');
      return;
    }
    try {
      audioContext = new AudioContextClass();
      audioMaster = audioContext.createGain();
      audioMaster.gain.value = 0.045;
      audioMaster.connect(audioContext.destination);
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < channel.length; i++) channel[i] = (Math.random() * 2 - 1) * 0.035;
      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 430;
      const ambienceGain = audioContext.createGain();
      ambienceGain.gain.value = 0.32;
      noise.connect(filter).connect(ambienceGain).connect(audioMaster);
      noise.start();
      const engine = audioContext.createOscillator();
      engine.type = 'sawtooth';
      engine.frequency.value = 58;
      const engineGain = audioContext.createGain();
      engineGain.gain.value = 0.045;
      engine.connect(engineGain).connect(audioMaster);
      engine.start();
    } catch (error) {
      audioContext = null;
      notify(`বাজারের অডিও চালু করা যায়নি: ${error.message}`);
    }
  };
  const soundHorn = () => {
    if (!audioContext || !audioMaster) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(420, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(310, audioContext.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, audioContext.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.24);
    oscillator.connect(gain).connect(audioMaster);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.25);
  };

  const updateShopState = () => {
    const minute = (11 * 60 + elapsed * 6) % 1440;
    for (const shop of shops) {
      const hour = minute / 60;
      shop.isOpen = hour >= shop.hours[0] && hour < shop.hours[1];
        if (shop._lastOpen !== shop.isOpen) {
        const context = shop.signMaterial.map.image.getContext('2d');
        context.fillStyle = `#${new THREE.Color(shop.color).getHexString()}`;
        context.fillRect(0, 0, 512, 160);
        context.fillStyle = '#f2e6cf';
        context.textAlign = 'center';
        context.font = '700 54px "Hind Siliguri",sans-serif';
        context.fillText(shop.title, 256, 68);
        context.font = '500 34px "Hind Siliguri",sans-serif';
        context.fillText(`${shop.category} · ${shop.isOpen ? 'খোলা' : 'বন্ধ'}`, 256, 125);
        shop.signMaterial.map.needsUpdate = true;
        shop._lastOpen = shop.isOpen;
      }
    }
    const daylight = Math.max(0, Math.sin((minute / 1440) * Math.PI * 2 - Math.PI / 2));
    scene.background.setRGB(0.055 + daylight * 0.84, 0.075 + daylight * 0.62, 0.12 + daylight * 0.42);
    scene.fog.color.copy(scene.background);
    scene.fog.near = 35 + daylight * 15;
    scene.fog.far = 105 + daylight * 35;
    scene.children.find(object => object.isHemisphereLight).intensity = 0.22 + daylight * 0.92;
    const sun = scene.children.find(object => object.isDirectionalLight);
    sun.intensity = 0.08 + daylight * 0.96;
    sun.color.setHSL(0.09, 0.5, 0.42 + daylight * 0.22);
    const night = 1 - daylight;
    streetLamps.forEach(lamp => lamp.material.color.setRGB(0.35 + night * 0.65, 0.35 + night * 0.52, 0.32 + night * 0.2));
    lampLights.forEach(light => { light.intensity = night > 0.45 ? 0.6 : 0; });
  };

  const updateVehicles = (dt, player) => {
    for (const vehicle of vehicles) {
      let speed = vehicle.speed;
      for (const other of vehicles) {
        if (other === vehicle || other.direction !== vehicle.direction || Math.abs(other.lane - vehicle.lane) > 0.3) continue;
        const gap = ((other.x - vehicle.x) * vehicle.direction + 132) % 132;
        if (gap > 0 && gap < vehicle.length + other.length + 3) speed = Math.min(speed, (other.currentSpeed || other.speed) * 0.82);
      }
      if (Math.abs(player.position.z - vehicle.lane) < 1.7 && Math.abs(player.position.x - vehicle.x) < vehicle.length + 2) speed = 0;
      vehicle.currentSpeed = speed;
      vehicle.x += vehicle.direction * speed * dt;
      if (vehicle.x > 66) vehicle.x = -66;
      if (vehicle.x < -66) vehicle.x = 66;
      vehicle.group.position.x = vehicle.x;
      vehicle.wheels.forEach(wheel => { wheel.rotation.x += vehicle.direction * speed * dt; });
    }
    hornTimer -= dt;
    if (hornTimer <= 0) {
      if (Math.random() < 0.65) soundHorn();
      hornTimer = 13 + Math.random() * 11;
    }
  };

  const separateFromCrowd = (agent, index) => {
    const steer = new THREE.Vector3(agent.direction, 0, 0);
    for (let otherIndex = 0; otherIndex < pedestrians.length; otherIndex++) {
      if (otherIndex === index) continue;
      const other = pedestrians[otherIndex];
      if (other.npc.visible !== agent.npc.visible || other.state === 'flee') continue;
      const dx = agent.npc.position.x - other.npc.position.x;
      const dz = agent.npc.position.z - other.npc.position.z;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq > 0.01 && distanceSq < 1.8 * 1.8) {
        const inverseDistance = 1 / Math.sqrt(distanceSq);
        steer.x += dx * inverseDistance * 0.7;
        steer.z += dz * inverseDistance * 1.4;
      }
    }
    return steer.normalize();
  };
  const updatePedestrians = (dt, player, running) => {
    const maxCrowd = { low: 4, normal: 8, high: pedestrians.length }[density];
    pedestrians.forEach((agent, index) => {
      const enabled = index < maxCrowd;
      agent.npc.visible = enabled;
      if (!enabled) return;

      const npc = agent.npc;
      const playerDistance = Math.hypot(npc.position.x - player.position.x, npc.position.z - player.position.z);
      if (elapsed < dangerUntil && agent.state !== 'flee' && agent.state !== 'respond' && playerDistance < 22) {
        agent.state = 'flee';
        agent.fleeUntil = dangerUntil;
      }
      if (running && playerDistance < 3.4 && elapsed - lastSprintStartle > 10) {
        lastSprintStartle = elapsed;
        startDanger(player.position, 5);
      }

      if (agent.state === 'flee') {
        if (elapsed >= agent.fleeUntil) {
          agent.state = 'walk';
          agent.direction = agent.npc.position.x < 0 ? 1 : -1;
        } else {
          npc.position.x += agent.direction * dt * 4.2;
          npc.position.x = THREE.MathUtils.clamp(npc.position.x, -64, 64);
          npc.rotation.y = agent.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
          npc.userData.legL.rotation.x = Math.sin(elapsed * 12) * 0.75;
          npc.userData.legR.rotation.x = -npc.userData.legL.rotation.x;
          return;
        }
      }
      if (agent.state === 'respond') {
        if (elapsed >= agent.fleeUntil) {
          agent.state = 'walk';
        } else {
          const dx = agent.alertPosition.x - npc.position.x;
          const dz = agent.alertPosition.z - npc.position.z;
          const distance = Math.hypot(dx, dz);
          if (distance > 2.5) {
            npc.position.x += dx / distance * dt * 2.2;
            npc.position.z += dz / distance * dt * 2.2;
            npc.rotation.y = Math.atan2(dx, dz);
          }
          return;
        }
      }

      if (agent.state === 'visit') {
        const shop = agent.targetShop;
        const target = new THREE.Vector3(shop.x + (agent.direction > 0 ? -4.8 : 4.8), 0, shop.side * 8.55);
        const delta = target.sub(npc.position);
        if (delta.length() < 0.9) {
          npc.rotation.y = shop.side > 0 ? Math.PI : 0;
          agent.state = agent.role === 'tea customer' ? 'sit' : 'talk';
          agent.timer = 3 + Math.random() * 4;
        } else {
          delta.normalize();
          npc.position.addScaledVector(delta, dt * agent.speed);
          npc.rotation.y = Math.atan2(delta.x, delta.z);
        }
      } else if (agent.state === 'sit' || agent.state === 'talk') {
        agent.timer -= dt;
        if (agent.state === 'sit') {
          npc.position.y = -0.45;
          npc.userData.legL.rotation.x = -1.05;
          npc.userData.legR.rotation.x = -1.05;
          npc.userData.armL.rotation.x = 0.2;
          npc.userData.armR.rotation.x = 0.2;
        } else {
          const shop = agent.targetShop;
          npc.lookAt(shop.x, npc.position.y, shop.side * 8.55);
        }
        if (agent.timer <= 0) {
          npc.position.y = 0;
          agent.state = 'walk';
          agent.timer = 7 + Math.random() * 10;
        }
      } else {
        agent.timer -= dt;
        if (agent.timer <= 0) {
          if (agent.role.includes('customer') && Math.random() < 0.42) {
            agent.state = 'visit';
            agent.targetShop = agent.role === 'tea customer'
              ? shops.find(shop => shop.type === 'tea')
              : shops[Math.floor(Math.random() * shops.length)];
          } else {
            agent.state = 'walk';
            agent.timer = 7 + Math.random() * 10;
            if (npc.position.x > 58) agent.direction = -1;
            else if (npc.position.x < -58) agent.direction = 1;
            else if (Math.random() < 0.25) agent.direction *= -1;
            if (Math.random() < 0.5) agent.side *= -1;
            agent.routeZ = agent.side * 8.55;
          }
        }
        const direction = separateFromCrowd(agent, index);
        if (playerDistance < 1.6) {
          direction.x += (npc.position.x < player.position.x ? -1 : 1) * 1.8;
          direction.z += (npc.position.z < player.position.z ? -1 : 1) * 1.8;
          direction.normalize();
        }
        npc.position.x += direction.x * dt * agent.speed;
        npc.position.z = THREE.MathUtils.damp(npc.position.z, agent.routeZ, 1.8, dt);
        if (npc.position.x > 60) agent.direction = -1;
        if (npc.position.x < -60) agent.direction = 1;
        npc.rotation.y = Math.atan2(direction.x, direction.z);
      }

      const moving = agent.state === 'walk' || agent.state === 'visit' || agent.state === 'flee';
      const swing = moving ? Math.sin(elapsed * (agent.state === 'flee' ? 12 : 7) + index) * 0.45 : 0;
      npc.userData.legL.rotation.x = swing;
      npc.userData.legR.rotation.x = -swing;
      npc.userData.armL.rotation.x = -swing * 0.5;
      npc.userData.armR.rotation.x = swing * 0.5;
      if (playerDistance < 7) npc.lookAt(player.position.x, npc.position.y, player.position.z);
    });
    for (const shop of shops) {
      if (shop.pos.distanceTo(player.position) < 9) shop.npc.lookAt(player.position.x, shop.npc.position.y, player.position.z);
      else shop.npc.rotation.y = shop.side > 0 ? Math.PI : 0;
    }
  };

  const setDensity = value => {
    density = ['low', 'normal', 'high'].includes(value) ? value : 'normal';
    notify(`পথচারী: ${{ low: 'কম', normal: 'মাঝারি', high: 'বেশি' }[density]}`);
  };

  const interact = shop => {
    if (!shop) return '';
    shop.visited = true;
    if (!shop.isOpen) return `${shop.title} এখন বন্ধ। আবার সকাল হলে আসুন।`;
    const responses = {
      grocery: 'আজকের বাজার তাজা—কী লাগবে বলুন?',
      tea: 'এক কাপ গরম চা দেব? বাজারের খবরও আছে!',
      clothing: 'নতুন পাঞ্জাবি এসেছে, দেখে যাবেন?',
      mobile: 'চার্জার, কভার—কী খুঁজছেন?',
      pharmacy: 'কী ওষুধ লাগবে? প্রেসক্রিপশন থাকলে দেখান।',
      restaurant: 'বসুন ভাই, আজকের বিশেষ খাবার গরম আছে!',
      vegetable: 'তাজা সবজি নিন—আজকের দাম ভালো!',
    };
    return `${shop.owner}: “${responses[shop.type]}”`;
  };

  return {
    shops,
    cameraObstacles,
    getNearestShop,
    interact,
    setDensity,
    enableAudio: createAudio,
    update(dt, player, running) {
      elapsed += dt;
      updateShopState();
      updateVehicles(dt, player);
      updatePedestrians(dt, player, running);
    },
    getDebugState() {
      return {
        shops: shops.length,
        pedestrians: pedestrians.filter(agent => agent.npc.visible).length,
        vehicles: vehicles.length,
        movingPedestrians: pedestrians.filter(agent => agent.npc.visible && ['walk', 'visit', 'flee', 'respond'].includes(agent.state)).length,
        fleeing: pedestrians.filter(agent => agent.npc.visible && agent.state === 'flee').length,
        responding: pedestrians.filter(agent => agent.npc.visible && agent.state === 'respond').length,
        openShops: shops.filter(shop => shop.isOpen).length,
        pedestrianStates: pedestrians.filter(agent => agent.npc.visible).map(agent => ({
          role: agent.role,
          state: agent.state,
          x: Math.round(agent.npc.position.x * 10) / 10,
          z: Math.round(agent.npc.position.z * 10) / 10,
        })),
        vehiclePositions: vehicles.map(vehicle => ({ type: vehicle.type, x: Math.round(vehicle.x * 10) / 10, lane: vehicle.lane })),
        shopTypes: shops.map(shop => shop.type),
      };
    },
  };
}
