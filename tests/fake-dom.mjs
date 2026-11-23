// テスト用の最小限のDOMの代わり（textContent は文字としてだけ保持する）
class Node {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this._text = ''; this.className = ''; this.hidden = false; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  append(...cs) { for (const c of cs) this.children.push(typeof c === 'string' ? Object.assign(new Node('#text'), { _text: c }) : c); }
  replaceChildren(...cs) { this.children = []; this._text = ''; this.append(...cs); }
  all() { return this.children.flatMap(c => [c, ...c.all()]); }
}
export function makeDoc(ids = []) {
  const byId = Object.fromEntries(ids.map(id => [id, new Node('div')]));
  return {
    createElement: t => new Node(t),
    getElementById: id => byId[id] || null,
    querySelectorAll: () => [],
    byId,
  };
}
