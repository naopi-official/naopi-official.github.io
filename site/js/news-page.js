// お知らせページ（news.html）。?id=行番号 なら1件の詳細、無ければ全部の一覧
import { fetchNotices, renderNotices, renderNoticeDetail } from './notices.js?v=202611250750';
import { setupMenu } from './menu.js?v=202611250750';

const SITE = 'なおぴを探せ 公式サイト';

async function start() {
  setupMenu();
  let profile = null;
  try { profile = await (await fetch('data/profile.json', { cache: 'no-cache' })).json(); } catch { /* 読めないときは下で案内 */ }
  const items = (await fetchNotices(profile?.noticesCsvUrl, { limit: Infinity })) || [];
  const id = new URLSearchParams(location.search).get('id');
  const listView = document.getElementById('news-list-view');
  const detailView = document.getElementById('news-detail-view');
  if (id) {
    listView.hidden = true;
    detailView.hidden = false;
    const title = renderNoticeDetail(items, id, document.getElementById('news-detail'));
    if (title) {
      document.title = `${title}｜${SITE}`;
      document.getElementById('crumb-title').textContent = ' ／ ' + title;
    }
  } else {
    renderNotices(items, document.getElementById('news-all'));
  }
}

start();
