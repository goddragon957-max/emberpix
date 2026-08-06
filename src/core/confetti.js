// 완성 축하 컨페티 — 외부 라이브러리(canvas-confetti / magicui) 없이 직접 구현.
// 조각은 회전하는 납작한 사각형이라 픽셀아트 톤과 잘 맞고, 색은 호출부가 넘긴다
// (보석십자수는 방금 완성한 도안의 색을 그대로 뿌려 "내가 만든 것"이 터지게 한다).
//
// 순수 로직(입자 생성/한 스텝 진행)과 렌더를 나눠 두어 단위 테스트가 가능하다.

export const DEFAULT_COLORS = ["#ff7a2f", "#ffcd75", "#a7f070", "#41a6f6", "#f4f4f4"];

const GRAVITY = 900;    // px/s²
const DRAG = 0.86;      // 초당 속도 감쇠
const LIFE = 2.6;       // 초

// 결정론적 난수 — 같은 seed면 같은 연출(테스트 가능).
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// 화면 아래 양쪽 모서리에서 가운데 위로 쏘아 올린다(폭죽 두 발 느낌).
export function createParticles(width, height, colors = DEFAULT_COLORS, count = 90, seed = 1) {
  const rand = rng(seed);
  const list = colors.length ? colors : DEFAULT_COLORS;
  const out = [];
  for (let i = 0; i < count; i++) {
    const left = i % 2 === 0;
    const speed = 700 + rand() * 500;
    // 왼쪽 발사대는 오른쪽 위로, 오른쪽 발사대는 왼쪽 위로.
    const angle = (left ? -60 : -120) * (Math.PI / 180) + (rand() - 0.5) * 0.7;
    out.push({
      x: left ? width * 0.08 : width * 0.92,
      y: height * 0.98,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: 5 + rand() * 6,
      h: 3 + rand() * 4,
      rot: rand() * Math.PI * 2,
      spin: (rand() - 0.5) * 12,
      color: list[Math.floor(rand() * list.length)],
      life: LIFE * (0.7 + rand() * 0.3),
      age: 0,
    });
  }
  return out;
}

// dt초만큼 진행. 수명이 다한 조각은 걸러낸 새 배열을 반환한다.
export function stepParticles(particles, dt, height) {
  const k = Math.pow(DRAG, dt);
  const out = [];
  for (const p of particles) {
    const age = p.age + dt;
    if (age >= p.life) continue;
    const vx = p.vx * k;
    const vy = p.vy * k + GRAVITY * dt;
    const y = p.y + vy * dt;
    // 화면 아래로 충분히 벗어나면 버린다.
    if (y > height + 60) continue;
    out.push({ ...p, age, vx, vy, x: p.x + vx * dt, y, rot: p.rot + p.spin * dt });
  }
  return out;
}

// 남은 수명에 따라 서서히 사라진다.
export function particleAlpha(p) {
  const left = 1 - p.age / p.life;
  return left > 0.3 ? 1 : Math.max(0, left / 0.3);
}

export function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = particleAlpha(p);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// 캔버스에 붙여 애니메이션을 돌린다. 반환값을 호출하면 즉시 중단·정리.
// 움직임 최소화 설정(prefers-reduced-motion)이면 아무것도 하지 않는다.
export function runConfetti(canvas, { colors, count = 90, seed = 1, onDone } = {}) {
  const reduce =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!canvas || reduce) {
    if (onDone) onDone();
    return () => {};
  }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  let particles = createParticles(w, h, colors, count, seed);
  let raf = 0;
  let last = performance.now();
  let stopped = false;

  const frame = (now) => {
    if (stopped) return;
    // 탭 전환 등으로 프레임이 크게 밀리면 물리가 튀므로 상한을 둔다.
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    particles = stepParticles(particles, dt, h);
    ctx.clearRect(0, 0, w, h);
    drawParticles(ctx, particles);
    if (!particles.length) {
      stopped = true;
      if (onDone) onDone();
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, w, h);
  };
}
