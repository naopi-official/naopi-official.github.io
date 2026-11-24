// スマホの ≡ メニューの開け閉め（トップとお知らせページで共通）
export function setupMenu(doc = globalThis.document) {
  const btn = doc.getElementById('menu-button');
  const nav = doc.getElementById('site-nav');
  if (!btn || !nav) return;
  const close = () => { btn.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); };
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  });
  nav.addEventListener('click', e => { if (e.target.closest('a')) close(); });
}
