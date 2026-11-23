// 動きの演出：オープニング・キービジュアルのスライド・マウス追従・スクロールで出てくる演出
// すべて「動きを減らす」設定ではオフ。JS が動かなくても中身は全部見える。

const REVEAL_TARGETS = [
  '.section-title', '.profile-visual', '.profile-body', '.panel',
  '.link-card', '.hashtag', '.thumb-link', '.notices-list li', '.schedule-list li', '.gallery-item',
].join(',');

export const nextIndex = (i, n) => (n <= 1 ? 0 : (i + 1) % n);

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// まだ準備していない要素に reveal を付ける。付けた数を返す
export function prepareReveal(doc, { hasObserver, reduced }) {
  if (!hasObserver || reduced) return 0;
  let count = 0;
  for (const node of doc.querySelectorAll(REVEAL_TARGETS)) {
    if (node.classList.contains('reveal')) continue;
    // 同じ親の中で順番に少しずつ遅らせる
    const siblings = node.parentElement ? [...node.parentElement.children] : [node];
    node.style.setProperty('--d', `${Math.min(siblings.indexOf(node), 8) * 70}ms`);
    node.classList.add('reveal');
    count++;
  }
  return count;
}

let observer = null;
export function setupReveal(doc = document) {
  const hasObserver = typeof IntersectionObserver === 'function';
  if (!prepareReveal(doc, { hasObserver, reduced: reducedMotion() })) return;
  observer ??= new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); observer.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  doc.querySelectorAll('.reveal:not(.is-in)').forEach(n => observer.observe(n));
}

// オープニング（最初の1回だけ。読み込みが終わったら閉じる。CSS 側でも3秒で必ず消える）
export function setupLoader(doc = document) {
  const loader = doc.getElementById('loader');
  if (!loader) return;
  let seen = false;
  try { seen = sessionStorage.getItem('naopi-loader') === '1'; sessionStorage.setItem('naopi-loader', '1'); } catch {}
  if (seen || reducedMotion()) { loader.remove(); return; }
  const close = () => { loader.classList.add('is-done'); setTimeout(() => loader.remove(), 600); };
  const minShow = new Promise(r => setTimeout(r, 1400));
  const loaded = new Promise(r => (doc.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
  Promise.all([minShow, loaded]).then(close);
}

// キービジュアルのスライド（ゆっくりズームしながら切り替え）
export function setupSlides(doc = document, intervalMs = 6500) {
  const slides = [...doc.querySelectorAll('.hero-slide')];
  if (slides.length < 2 || reducedMotion()) return;
  let i = 0;
  setInterval(() => {
    if (doc.hidden) return;
    slides[i].classList.remove('is-active');
    i = nextIndex(i, slides.length);
    slides[i].classList.add('is-active');
  }, intervalMs);
}

// マウスに合わせて絵と飾りを少しずらす（パソコンのみ）
export function setupTilt(doc = document) {
  const hero = doc.querySelector('.hero');
  if (!hero || reducedMotion() || !matchMedia('(pointer: fine)').matches) return;
  let raf = 0;
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      hero.style.setProperty('--mx', x.toFixed(3));
      hero.style.setProperty('--my', y.toFixed(3));
    });
  });
  hero.addEventListener('pointerleave', () => { hero.style.setProperty('--mx', 0); hero.style.setProperty('--my', 0); });
}
