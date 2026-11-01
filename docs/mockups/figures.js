/* Liftria exercise figures: side view, muscle-shaped segments, highlighted from the exercise's muscles. */
const FIG = (() => {
  const lerp = (a, b, t) => a + (b - a) * t;
  // Smooth width at t from control points [[t,w],...] (cosine interpolation).
  function widthAt(profile, t) {
    for (let i = 0; i < profile.length - 1; i++) {
      const [t0, w0] = profile[i], [t1, w1] = profile[i + 1];
      if (t >= t0 && t <= t1) { const u = (t - t0) / (t1 - t0 || 1); return lerp(w0, w1, (1 - Math.cos(Math.PI * u)) / 2); }
    }
    return profile[profile.length - 1][1];
  }
  // One half (side = -1 or +1) of a segment of length L, between t0 and t1, as a closed path in local coords.
  function half(L, profile, side, t0 = 0, t1 = 1, n = 18) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = lerp(t0, t1, i / n); pts.push([t * L, side * widthAt(profile, t)]); }
    let d = `M${(t0 * L).toFixed(2)},0 `;
    // Smooth line through points with quadratic midpoints.
    d += `L${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)} `;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += `Q${pts[i][0].toFixed(2)},${pts[i][1].toFixed(2)} ${mx.toFixed(2)},${my.toFixed(2)} `;
    }
    d += `L${pts[n][0].toFixed(2)},${pts[n][1].toFixed(2)} L${(t1 * L).toFixed(2)},0 Z`;
    return d;
  }
  const PROFILE = {
    torsoFront: [[0, 6.2], [0.25, 5.6], [0.5, 6.0], [0.72, 8.4], [0.9, 7.2], [1, 4.4]],
    torsoBack: [[0, 7.6], [0.16, 7.2], [0.32, 5.6], [0.6, 6.6], [0.84, 7.4], [1, 4.4]],
    upperFront: [[0, 3.3], [0.45, 3.7], [0.85, 2.7], [1, 2.4]],
    upperBack: [[0, 3.6], [0.3, 3.9], [0.85, 2.6], [1, 2.4]],
    fore: [[0, 2.5], [0.28, 2.9], [0.8, 1.9], [1, 1.7]],
    thighFront: [[0, 5.4], [0.35, 5.6], [0.85, 3.6], [1, 3.2]],
    thighBack: [[0, 6.2], [0.25, 5.3], [0.8, 3.6], [1, 3.2]],
    shinFront: [[0, 3.0], [0.4, 2.4], [1, 1.7]],
    shinBack: [[0, 3.0], [0.3, 3.9], [0.75, 2.2], [1, 1.7]],
  };
  // Muscle groups the figure can light up (pack names on the right).
  const REGION = {
    chest: ['chest'], abs: ['abdominals'], back: ['lats', 'middle back', 'traps'], lowerBack: ['lower back'],
    glutes: ['glutes'], delts: ['shoulders'], biceps: ['biceps'], triceps: ['triceps'], forearms: ['forearms'],
    quads: ['quadriceps'], hamstrings: ['hamstrings'], calves: ['calves'],
  };
  function roleOf(region, muscles) {
    const names = REGION[region] || [];
    if (names.some(m => muscles.primary.includes(m))) return 'p';
    if (names.some(m => muscles.secondary.includes(m))) return 's';
    return '';
  }
  function fill(role, far) {
    if (role === 'p') return far ? 'var(--figP2)' : 'var(--figP)';
    if (role === 's') return far ? 'var(--figS2)' : 'var(--figS)';
    return far ? 'var(--fig2)' : 'var(--fig)';
  }
  function frame(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    return { L: Math.hypot(dx, dy), ang: Math.atan2(dy, dx) * 180 / Math.PI, rad: Math.atan2(dy, dx) };
  }
  // Which local side (+1/-1) faces "front" in world space.
  function frontSide(rad, facing) {
    const ny = [-Math.sin(rad), Math.cos(rad)]; // local +y in world
    return (ny[0] * facing[0] + ny[1] * facing[1]) >= 0 ? 1 : -1;
  }
  function seg(a, b, parts, facing, muscles, far) {
    const { L, ang, rad } = frame(a, b);
    const fs = frontSide(rad, facing);
    let out = `<g transform="translate(${a[0].toFixed(2)},${a[1].toFixed(2)}) rotate(${ang.toFixed(2)})">`;
    for (const p of parts) {
      const side = p.front ? fs : -fs;
      out += `<path d="${half(L, PROFILE[p.profile], side, p.t0 ?? 0, p.t1 ?? 1)}" fill="${fill(roleOf(p.region, muscles), far)}" class="m"/>`;
    }
    return out + '</g>';
  }
  function limbArm(J, facing, muscles, far) {
    const armFacing = J.armFacing || facing;
    return seg(J.shoulder, J.elbow, [
      { profile: 'upperFront', front: true, region: 'biceps' },
      { profile: 'upperBack', front: false, region: 'triceps' }], armFacing, muscles, far)
      + seg(J.elbow, J.hand, [
        { profile: 'fore', front: true, region: 'forearms' },
        { profile: 'fore', front: false, region: 'forearms' }], armFacing, muscles, far)
      + `<circle cx="${J.hand[0]}" cy="${J.hand[1]}" r="2.1" fill="${fill('', far)}" class="m"/>`
      + delt(J, armFacing, muscles, far);
  }
  function delt(J, facing, muscles, far) {
    const { ang } = frame(J.shoulder, J.elbow);
    return `<ellipse cx="${J.shoulder[0]}" cy="${J.shoulder[1]}" rx="5.2" ry="4.3" transform="rotate(${ang.toFixed(1)} ${J.shoulder[0]} ${J.shoulder[1]})" fill="${fill(roleOf('delts', muscles), far)}" class="m"/>`;
  }
  function limbLeg(J, facing, muscles, far) {
    const legFacing = J.legFacing || facing;
    return seg(J.hip, J.knee, [
      { profile: 'thighFront', front: true, region: 'quads' },
      { profile: 'thighBack', front: false, region: 'hamstrings' }], legFacing, muscles, far)
      + seg(J.knee, J.ankle, [
        { profile: 'shinFront', front: true, region: '' },
        { profile: 'shinBack', front: false, region: 'calves' }], legFacing, muscles, far)
      + foot(J, legFacing, far);
  }
  function foot(J, facing, far) {
    const toe = J.toe || [J.ankle[0] + facing[0] * 7 + (facing[0] === 0 ? 0 : 0), J.ankle[1] + 1.5];
    const { L, ang } = frame(J.ankle, toe);
    return `<g transform="translate(${J.ankle[0]},${J.ankle[1]}) rotate(${ang.toFixed(1)})"><path d="M-2,-2.2 Q${L * 0.5},-2.6 ${L},-0.6 Q${L + 1},1.6 ${L - 1},2 L-2.4,2 Q-3.4,0 -2,-2.2Z" fill="${fill('', far)}" class="m"/></g>`;
  }
  function torso(J, facing, muscles) {
    return seg(J.hip, J.neck, [
      { profile: 'torsoFront', front: true, region: 'abs', t0: 0, t1: 0.52 },
      { profile: 'torsoFront', front: true, region: 'chest', t0: 0.52, t1: 1 },
      { profile: 'torsoBack', front: false, region: 'glutes', t0: 0, t1: 0.2 },
      { profile: 'torsoBack', front: false, region: 'lowerBack', t0: 0.2, t1: 0.48 },
      { profile: 'torsoBack', front: false, region: 'back', t0: 0.48, t1: 1 }], facing, muscles, false);
  }
  function head(J) {
    const { ang } = frame(J.neck, J.head);
    return `<g transform="translate(${J.neck[0]},${J.neck[1]}) rotate(${ang.toFixed(1)})"><rect x="-0.5" y="-2.4" width="5" height="4.8" rx="2" fill="var(--fig)" class="m"/></g>`
      + `<ellipse cx="${J.head[0]}" cy="${J.head[1]}" rx="5.2" ry="5.8" fill="var(--fig)" class="m"/>`;
  }
  const off = (p, d) => p && [p[0] + d[0], p[1] + d[1]];
  function farJoints(J, d) {
    const o = {}; for (const k of Object.keys(J)) o[k] = Array.isArray(J[k]) && typeof J[k][0] === 'number' ? off(J[k], d) : J[k]; return o;
  }
  function figure(pose, muscles, size = 56) {
    const P = POSES[pose];
    const J = P.joints, far = farJoints(J, P.farOffset || [2.5, -1.5]);
    const farJ = Object.assign({}, far, P.farJoints || {});
    const body =
      (P.behind || '') +
      limbLeg(farJ, P.facing, muscles, true) + limbArm(farJ, P.facing, muscles, true) +
      (P.middle || '') +
      limbLeg(J, P.facing, muscles, false) + torso(J, P.facing, muscles) + head(J) +
      limbArm(J, P.facing, muscles, false) + (P.front || '');
    const vb = P.view || [0, 0, 100, 100];
    return `<svg viewBox="${vb.join(' ')}" width="${size}" height="${size}" class="fig" aria-hidden="true">${body}</svg>`;
  }
  // Equipment
  const plateSide = (x, y, r = 9) => `<circle cx="${x}" cy="${y}" r="${r}" class="plate"/><circle cx="${x}" cy="${y}" r="${r * 0.62}" class="plateIn"/><circle cx="${x}" cy="${y}" r="1.6" class="hub"/>`;
  const dumbSide = (x, y) => `<rect x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" rx="2.5" class="plate"/><rect x="${x - 2.6}" y="${y - 2.6}" width="5.2" height="5.2" rx="1.4" class="plateIn"/>`;
  const POSES = {
    bench: {
      facing: [0, -1],
      joints: { hip: [61, 58.5], neck: [33, 58.5], head: [24.5, 57], shoulder: [35, 56.5], elbow: [35.5, 44], hand: [34.5, 31],
        knee: [75, 59], ankle: [79, 81], toe: [86, 82], legFacing: [1, 0], armFacing: [1, 0] },
      farOffset: [3, -1.2], farJoints: { knee: [77, 61.5], ankle: [73, 82], toe: [80, 83] }, view: [8, 16, 82, 82],
      behind: `<rect x="14" y="64" width="62" height="5.5" rx="2.6" class="gear"/><rect x="22" y="69" width="4" height="19" class="gearDark"/><rect x="64" y="69" width="4" height="19" class="gearDark"/><rect x="10" y="88" width="70" height="2" rx="1" class="floor"/>`,
      front: plateSide(34.5, 30.5, 10),
    },
    ohp: {
      facing: [1, 0],
      joints: { hip: [49, 60], neck: [49.5, 31], head: [51, 22.5], shoulder: [49, 33], elbow: [50.5, 20], hand: [50, 8.5],
        knee: [50.5, 77.5], ankle: [49.5, 94], toe: [57, 95.5], armFacing: [1, 0] },
      farOffset: [-2, 0.5], view: [12, -2, 76, 101],
      behind: `<rect x="20" y="96" width="62" height="2" rx="1" class="floor"/>`,
      front: plateSide(50, 8.5, 9.5),
    },
    row: {
      facing: [1, 0],
      joints: { hip: [38, 67], neck: [35.5, 39], head: [35, 30.5], shoulder: [36.5, 41], elbow: [25, 50.5], hand: [43, 53.5],
        knee: [61, 59], ankle: [73.5, 68], toe: [79, 64], armFacing: [1, 0] },
      farOffset: [2, -1.5], view: [12, 18, 88, 74],
      behind: `<rect x="22" y="71" width="30" height="5" rx="2.5" class="gear"/><rect x="34" y="76" width="4" height="12" class="gearDark"/><rect x="76" y="56" width="5" height="22" rx="2" class="gear"/><circle cx="90" cy="54" r="3.4" class="gearDark"/><rect x="86" y="50" width="10" height="40" rx="2.5" class="gear"/><rect x="14" y="88" width="84" height="2" rx="1" class="floor"/>`,
      middle: `<line x1="45" y1="53.5" x2="88" y2="54" class="cable"/>`,
      front: `<rect x="41" y="50.5" width="5" height="7" rx="2" class="handle"/>`,
    },
    lat: {
      facing: [1, 0],
      joints: { hip: [47, 70], neck: [45.5, 42], head: [46, 33.5], shoulder: [46, 44], elbow: [38, 31], hand: [44, 17.5],
        knee: [66, 69.5], ankle: [66, 89], toe: [73, 90.5], armFacing: [1, 0] },
      farOffset: [2.5, -1], view: [14, -1, 80, 95],
      behind: `<rect x="44" y="0" width="1.4" height="17" class="cableLine"/><rect x="30" y="74" width="30" height="5" rx="2.5" class="gear"/><rect x="43" y="79" width="4" height="10" class="gearDark"/><rect x="58" y="62" width="14" height="5" rx="2.5" class="gearDark"/><rect x="20" y="90" width="66" height="2" rx="1" class="floor"/>`,
      front: `<rect x="30" y="15.5" width="36" height="3.4" rx="1.7" class="bar"/>`,
    },
    squat: {
      facing: [1, 0],
      joints: { hip: [36, 64], neck: [52, 38], head: [57, 30.5], shoulder: [51, 40], elbow: [44, 47], hand: [48.5, 38.5],
        knee: [61, 66], ankle: [52.5, 89], toe: [60, 90.5], armFacing: [1, 0] },
      farOffset: [2.5, -1.5], view: [16, 18, 64, 78],
      behind: `<rect x="22" y="91.5" width="56" height="2" rx="1" class="floor"/>`,
      middle: plateSide(47.5, 36.5, 8.5),
    },
    curl: {
      facing: [1, 0],
      joints: { hip: [49, 60], neck: [49.5, 31], head: [51, 22.5], shoulder: [49, 33], elbow: [49.5, 48.5], hand: [60, 39],
        knee: [50.5, 77.5], ankle: [49.5, 94], toe: [57, 95.5], armFacing: [1, 0] },
      farOffset: [-2, 0.5], farJoints: { hand: [49, 63] }, view: [14, 14, 76, 86],
      behind: `<rect x="20" y="96" width="62" height="2" rx="1" class="floor"/>`,
      middle: dumbSide(49, 64),
      front: dumbSide(61.5, 38),
    },
    incline: {
      facing: [0.55, -0.85],
      joints: { hip: [60, 64], neck: [38.5, 42], head: [32, 35.5], shoulder: [40, 43], elbow: [44, 31], hand: [40.5, 18.5],
        knee: [75, 63.5], ankle: [78, 85], toe: [85, 86.5], legFacing: [1, 0], armFacing: [1, 0] },
      farOffset: [2.5, -1.5], view: [16, 6, 82, 86],
      behind: `<path d="M64,69 L35,40 L40,36 L69,65 Z" class="gear"/><rect x="58" y="66" width="20" height="5" rx="2.5" class="gear"/><rect x="62" y="71" width="4" height="18" class="gearDark"/><rect x="20" y="89" width="68" height="2" rx="1" class="floor"/>`,
      front: dumbSide(40.5, 17),
    },
    pushdown: {
      facing: [1, 0],
      joints: { hip: [47, 60], neck: [46, 31], head: [47.5, 22.5], shoulder: [46, 33], elbow: [47, 48], hand: [56, 60],
        knee: [48.5, 77.5], ankle: [47.5, 94], toe: [55, 95.5], armFacing: [1, 0] },
      farOffset: [-2, 0.5], view: [14, 0, 76, 100],
      behind: `<rect x="72" y="0" width="8" height="98" rx="2.5" class="gear"/><rect x="20" y="96" width="62" height="2" rx="1" class="floor"/>`,
      middle: `<line x1="57" y1="59" x2="74" y2="6" class="cable"/>`,
      front: `<path d="M53.5,57.5 L58.5,57.5 L57.5,63 L54.5,63 Z" class="handle"/>`,
    },
  };
  return { figure, POSES };
})();
