// ファンアートをタップ・クリックすると、画面いっぱいに大きく表示する（左右で前後の絵へ、Esc・背景タップで閉じる）

// 前後の番号（端まで行ったら反対側に回る）
export function stepIndex(i, delta, length) {
  if (!length) return 0;
  return ((i + delta) % length + length) % length;
}

export function setupLightbox(doc = document) {
  const list = doc.getElementById('gallery-list');
  if (!list || list.dataset.lightbox) return;
  list.dataset.lightbox = '1';

  const box = doc.createElement('dialog');
  box.className = 'lightbox';
  box.setAttribute('aria-label', 'ファンアートを拡大表示');
  box.innerHTML = `
    <figure class="lightbox-figure">
      <img class="lightbox-img" alt="">
      <figcaption class="lightbox-caption"></figcaption>
    </figure>
    <button type="button" class="lightbox-btn lightbox-close" aria-label="閉じる">×</button>
    <button type="button" class="lightbox-btn lightbox-prev" aria-label="前の絵">‹</button>
    <button type="button" class="lightbox-btn lightbox-next" aria-label="次の絵">›</button>`;
  doc.body.append(box);
  const img = box.querySelector('.lightbox-img');
  const cap = box.querySelector('.lightbox-caption');
  let items = [];
  let index = 0;

  const show = i => {
    index = stepIndex(i, 0, items.length);
    const src = items[index];
    const pic = src.querySelector('img');
    img.src = pic.currentSrc || pic.src;
    img.alt = pic.alt;
    cap.textContent = src.querySelector('figcaption')?.textContent || '';
    const many = items.length > 1;
    box.querySelector('.lightbox-prev').hidden = !many;
    box.querySelector('.lightbox-next').hidden = !many;
  };
  const open = item => {
    items = [...list.querySelectorAll('.gallery-item')];
    show(items.indexOf(item));
    if (!box.open) box.showModal();
  };

  list.addEventListener('click', e => {
    const item = e.target.closest('.gallery-item');
    if (item) open(item);
  });
  list.addEventListener('keydown', e => {
    const item = e.target.closest('.gallery-item');
    if (item && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(item); }
  });
  box.querySelector('.lightbox-close').addEventListener('click', () => box.close());
  box.querySelector('.lightbox-prev').addEventListener('click', () => show(stepIndex(index, -1, items.length)));
  box.querySelector('.lightbox-next').addEventListener('click', () => show(stepIndex(index, 1, items.length)));
  box.addEventListener('click', e => { if (e.target === box) box.close(); }); // 絵の外（背景）をタップで閉じる
  box.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') show(stepIndex(index, -1, items.length));
    if (e.key === 'ArrowRight') show(stepIndex(index, 1, items.length));
  });
  // スマホは左右にスワイプでも切り替え
  let startX = null;
  box.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', e => {
    if (startX == null || items.length < 2) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) show(stepIndex(index, dx < 0 ? 1 : -1, items.length));
  });
}
