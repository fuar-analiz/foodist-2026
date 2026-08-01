const fs = require('fs');
const path = require('path');
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'foodist-data.json'), 'utf8'));

const N = rows.length;
const tr = rows.filter(r => r.country === 'Türkiye');
const fo = rows.filter(r => r.country && r.country !== 'Türkiye');
const reps = rows.filter(r => r.isRep);

// kategoriler
const catCount = {};
rows.forEach(r => r.categories.split(' | ').filter(Boolean).forEach(c => catCount[c] = (catCount[c] || 0) + 1));
const cats = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
const uncategorized = rows.filter(r => !r.categories).length;

// salonlar
const salonCount = {};
rows.forEach(r => { if (r.salon) salonCount[r.salon] = (salonCount[r.salon] || 0) + 1; });
const salons = Object.entries(salonCount).sort((a, b) => b[1] - a[1]);

// ülkeler
const countryCount = {};
rows.forEach(r => { if (r.country) countryCount[r.country] = (countryCount[r.country] || 0) + 1; });
const foreign = Object.entries(countryCount).filter(([c]) => c !== 'Türkiye').sort((a, b) => b[1] - a[1]);

// doluluk
const pct = (arr, f) => Math.round(100 * arr.filter(f).length / arr.length);
const fill = {
  phone: [rows.filter(r => r.phone).length, pct(tr, r => r.phone), pct(fo, r => r.phone)],
  web: [rows.filter(r => r.website).length, pct(tr, r => r.website), pct(fo, r => r.website)],
  addr: [rows.filter(r => r.address).length, pct(tr, r => r.address), pct(fo, r => r.address)],
  desc: [rows.filter(r => r.description).length, pct(tr, r => r.description), pct(fo, r => r.description)],
  prod: [rows.filter(r => r.productCount > 0).length, pct(tr, r => r.productCount > 0), pct(fo, r => r.productCount > 0)],
  insta: [rows.filter(r => r.instagram).length, pct(tr, r => r.instagram), pct(fo, r => r.instagram)],
  mail: [rows.filter(r => r.emails).length, pct(tr, r => r.emails), pct(fo, r => r.emails)],
};

// --- Google Maps doğrulama ---
const gKesin = rows.filter(r => r.gStatus === 'kesin').length;
const gOlasi = rows.filter(r => r.gStatus === 'olasi').length;
const gZayif = rows.filter(r => r.gStatus === 'zayif').length;
const gYok = rows.filter(r => !r.gStatus || r.gStatus === 'yok').length;
const telDog = rows.filter(r => r.telDurum === 'doğrulandı').length;
const telEk = rows.filter(r => r.telDurum === 'ek numara').length;
const telYeni = rows.filter(r => r.telDurum === 'YENİ').length;
const webDog = rows.filter(r => r.webDurum === 'doğrulandı').length;
const webYeni = rows.filter(r => r.webDurum === 'YENİ').length;
const webFarkli = rows.filter(r => r.webDurum === 'farklı').length;
const koordVar = rows.filter(r => r.gCoords).length;
const puanVar = rows.filter(r => r.gRating !== '' && r.gRating != null).length;
const gKatVar = rows.filter(r => r.gCategory).length;
// kapsam önce/sonra
const telOnce = rows.filter(r => r.phone).length;
const telSonra = rows.filter(r => r.phone || r.gPhone).length;
const webOnce = rows.filter(r => r.website).length;
const webSonra = rows.filter(r => r.website || r.gWebsite).length;
const kanalOnce = rows.filter(r => r.phone || r.emails || r.website).length;
const kanalSonra = rows.filter(r => r.phone || r.emails || r.website || r.gPhone || r.gWebsite).length;
// ilçe dağılımı (İstanbul içi)
const ilceCount = {};
rows.forEach(r => { if (r.gDistrict) ilceCount[r.gDistrict] = (ilceCount[r.gDistrict] || 0) + 1; });
const ilceTop = Object.entries(ilceCount).sort((a, b) => b[1] - a[1]).slice(0, 12);
// google iş kategorileri
const gCatCount = {};
rows.forEach(r => { if (r.gCategory) gCatCount[r.gCategory] = (gCatCount[r.gCategory] || 0) + 1; });
const gCatTop = Object.entries(gCatCount).sort((a, b) => b[1] - a[1]).slice(0, 10);

// e-posta kapsamı
const siteli = rows.filter(r => r.website).length;
const mailli = rows.filter(r => r.emails).length;
const mailAdet = rows.reduce((a, r) => a + (r.emails ? r.emails.split(' | ').length : 0), 0);
// kategori bazında e-posta doluluğu
const catMail = {};
rows.forEach(r => r.categories.split(' | ').filter(Boolean).forEach(c => {
  catMail[c] = catMail[c] || { t: 0, e: 0 };
  catMail[c].t++; if (r.emails) catMail[c].e++;
}));

// ortak stantlar
const byStand = {};
rows.forEach(r => { const k = r.salon + '/' + r.stand; (byStand[k] = byStand[k] || []).push(r); });
const sharedStands = Object.values(byStand).filter(v => v.length > 1).length;

// salon 10 çin kümesi
const s10 = rows.filter(r => r.salon === '10');
// ülke=Çin + sitede yanlışlıkla Türkiye etiketlenen 2 bilinen Çinli firma
const s10cn = s10.filter(r => r.country === 'Çin' || /AICHAO|SUNGOLD SEEDS/i.test(r.name)).length;

// tablo verisi (kompakt)
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tableData = rows.map(r => ({
  n: r.name, c: r.country, s: r.salon, t: r.stand,
  k: r.categories, p: r.phone, w: r.website, r: r.isRep ? 1 : 0,
  e: r.emails,
  gp: r.gPhone && r.telDurum === 'YENİ' ? r.gPhone : '',   // yalnızca YENİ numara
  gw: r.gWebsite && r.webDurum === 'YENİ' ? r.gWebsite : '',
  d: r.gDistrict || '', v: r.gStatus || '', m: r.gMapsUrl || '', gr: r.gRating ?? '',
}));
const tableJson = JSON.stringify(tableData).replace(/<\/script/gi, '<\\/script');

// Excel dışa aktarım için TAM veri (29 sütun)
const XL_HEADERS = ['Firma', 'Temsilci Firma', 'Ülke', 'Salon', 'Stant', 'Telefon', 'E-posta', 'Adres', 'Web Sitesi',
  'Instagram', 'LinkedIn', 'Ürün Sayısı', 'Ürünler', 'Kategoriler', 'Açıklama', 'Fuar Profili',
  'Maps Eşleşme', 'Maps Ad', 'Maps Teyit', 'Maps Telefon', 'Telefon Durumu', 'Maps Web', 'Web Durumu',
  'Maps Adres', 'İlçe', 'Maps Kategori', 'Koordinat', 'Google Puanı', 'Harita Linki'];
const XL_KEYS = ['name', 'isRep', 'country', 'salon', 'stand', 'phone', 'emails', 'address', 'website',
  'instagram', 'linkedin', 'productCount', 'products', 'categories', 'description', 'url',
  'gStatus', 'gName', 'gProof', 'gPhone', 'telDurum', 'gWebsite', 'webDurum',
  'gAddress', 'gDistrict', 'gCategory', 'gCoords', 'gRating', 'gMapsUrl'];
const xlRows = rows.map(r => XL_KEYS.map(k => {
  const v = r[k];
  if (v === null || v === undefined) return '';
  if (k === 'productCount' || k === 'gRating') return v === '' ? '' : Number(v);
  return String(v);
}));
const xlJson = JSON.stringify({ h: XL_HEADERS, r: xlRows }).replace(/<\/script/gi, '<\\/script');
const xlsxLib = fs.readFileSync(path.join(__dirname, 'xlsx-writer.js'), 'utf8');

const maxCat = cats[0][1], maxSalon = salons[0][1], maxForeign = foreign[0][1];

const catBars = cats.map(([k, v]) => `
      <div class="bar-row" title="${esc(k)}: ${v} firma">
        <span class="bar-label">${esc(k)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(100 * v / maxCat).toFixed(1)}%"></span></span>
        <span class="bar-val">${v}</span>
      </div>`).join('');

const salonBars = salons.map(([k, v]) => `
      <div class="bar-row" title="Salon ${esc(k)}: ${v} firma">
        <span class="bar-label">Salon ${esc(k)}${k === '10' ? ' <em class="tag-cn">Çin kümesi</em>' : ''}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(100 * v / maxSalon).toFixed(1)}%"></span></span>
        <span class="bar-val">${v}</span>
      </div>`).join('');

const foreignBars = foreign.map(([k, v]) => `
      <div class="bar-row" title="${esc(k)}: ${v} firma">
        <span class="bar-label">${esc(k)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(100 * v / maxForeign).toFixed(1)}%"></span></span>
        <span class="bar-val">${v}</span>
      </div>`).join('');

const maxCatMail = Math.max(...Object.values(catMail).map(v => v.t));
const catMailBars = Object.entries(catMail).sort((a, b) => b[1].e - a[1].e).map(([k, v]) => `
      <div class="bar-row" title="${esc(k)}: ${v.e} firmanın e-postası var (kategoride ${v.t} firma)">
        <span class="bar-label">${esc(k)}</span>
        <span class="bar-track">
          <span class="bar-fill s3" style="width:${(100 * v.t / maxCatMail).toFixed(1)}%"></span>
          <span class="bar-fill s1 overlay" style="width:${(100 * v.e / maxCatMail).toFixed(1)}%"></span>
        </span>
        <span class="bar-val">${v.e}<span class="of">/${v.t}</span></span>
      </div>`).join('');

// kapsam önce/sonra çubukları
const gainRows = [
  ['Telefon', telOnce, telSonra],
  ['Web sitesi', webOnce, webSonra],
  ['Herhangi bir iletişim kanalı', kanalOnce, kanalSonra],
].map(([k, a, b]) => `
      <div class="cmp-row">
        <span class="bar-label">${k}</span>
        <div class="cmp-tracks">
          <div class="bar-row-mini" title="Önce: ${a} firma"><span class="bar-track"><span class="bar-fill s3solid" style="width:${(100 * a / N).toFixed(1)}%"></span></span><span class="bar-val">${a}</span></div>
          <div class="bar-row-mini" title="Google Maps sonrası: ${b} firma"><span class="bar-track"><span class="bar-fill s1" style="width:${(100 * b / N).toFixed(1)}%"></span></span><span class="bar-val">${b}<span class="gain">+${b - a}</span></span></div>
        </div>
      </div>`).join('');

const maxIlce = ilceTop.length ? ilceTop[0][1] : 1;
const ilceBars = ilceTop.map(([k, v]) => `
      <div class="bar-row" title="${esc(k)}: ${v} firma">
        <span class="bar-label">${esc(k)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(100 * v / maxIlce).toFixed(1)}%"></span></span>
        <span class="bar-val">${v}</span>
      </div>`).join('');

const cmpRows = [
  ['E-posta', fill.mail[1], fill.mail[2]],
  ['Telefon', fill.phone[1], fill.phone[2]],
  ['Web sitesi', fill.web[1], fill.web[2]],
  ['Adres', fill.addr[1], fill.addr[2]],
  ['Firma tanıtım metni', fill.desc[1], fill.desc[2]],
  ['Ürün vitrini', fill.prod[1], fill.prod[2]],
  ['Instagram', fill.insta[1], fill.insta[2]],
].map(([k, a, b]) => `
      <div class="cmp-row">
        <span class="bar-label">${k}</span>
        <div class="cmp-tracks">
          <div class="bar-row-mini" title="Türkiye: %${a}"><span class="bar-track"><span class="bar-fill s1" style="width:${a}%"></span></span><span class="bar-val">%${a}</span></div>
          <div class="bar-row-mini" title="Yabancı: %${b}"><span class="bar-track"><span class="bar-fill s2" style="width:${b}%"></span></span><span class="bar-val">%${b}</span></div>
        </div>
      </div>`).join('');

const html = `<title>Foodist İstanbul 2026 — Katılımcı Analizi</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root {
    --bg: #faf8f5; --surface: #ffffff; --ink: #1c1917; --ink-2: #57534e; --ink-3: #8a8378;
    --accent: #a63d2f; --line: #e7e0d8; --track: #efe9e1; --track-2: #ded4c7;
    --s1: #2a78d6; --s2: #eb6834; --good: #008300; --warn: #b06f00;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #171412; --surface: #1f1c19; --ink: #f2efe9; --ink-2: #b8b2a7; --ink-3: #77716a;
      --accent: #e0765f; --line: #35302a; --track: #2a2622; --track-2: #433c33;
      --s1: #3987e5; --s2: #d95926; --good: #35a35a; --warn: #c98500;
      color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --bg: #171412; --surface: #1f1c19; --ink: #f2efe9; --ink-2: #b8b2a7; --ink-3: #77716a;
    --accent: #e0765f; --line: #35302a; --track: #2a2622; --track-2: #433c33;
    --s1: #3987e5; --s2: #d95926; --good: #35a35a; --warn: #c98500;
    color-scheme: dark;
  }
  :root[data-theme="light"] {
    --bg: #faf8f5; --surface: #ffffff; --ink: #1c1917; --ink-2: #57534e; --ink-3: #8a8378;
    --accent: #a63d2f; --line: #e7e0d8; --track: #efe9e1; --track-2: #ded4c7;
    --s1: #2a78d6; --s2: #eb6834; --good: #008300; --warn: #b06f00;
    color-scheme: light;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .wrap { max-width: 1000px; margin: 0 auto; padding: 48px 24px 80px; }
  .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); margin: 0 0 8px; }
  h1 { font-size: clamp(28px, 4.5vw, 42px); line-height: 1.15; font-weight: 800; margin: 0 0 10px; text-wrap: balance; }
  .lede { color: var(--ink-2); max-width: 62ch; margin: 0; }
  .lede a { color: var(--accent); }
  header { padding-bottom: 28px; border-bottom: 2px solid var(--ink); margin-bottom: 32px; }

  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 0 0 44px; }
  .tile { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 16px 18px; }
  .tile b { display: block; font-size: 30px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
  .tile span { font-size: 13px; color: var(--ink-2); }
  .tile.accent { border-color: var(--accent); box-shadow: inset 3px 0 0 var(--accent); }
  .tile.accent b { color: var(--accent); }

  section { margin-bottom: 44px; }
  h2 { font-size: 21px; font-weight: 800; margin: 0 0 4px; }
  .sub { font-size: 14px; color: var(--ink-2); margin: 0 0 18px; max-width: 70ch; }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 20px 22px; }

  .bar-row { display: grid; grid-template-columns: minmax(150px, 240px) 1fr 44px; gap: 12px; align-items: center; padding: 4px 0; }
  .bar-row:hover .bar-fill { filter: brightness(1.12); }
  .bar-label { font-size: 13.5px; color: var(--ink-2); text-align: right; line-height: 1.3; }
  .bar-track { display: block; position: relative; height: 14px; background: var(--track); border-radius: 4px; overflow: hidden; }
  .bar-fill { display: block; height: 100%; background: var(--s2); border-radius: 0 4px 4px 0; }
  .bar-fill.s1 { background: var(--s1); }
  .bar-fill.s2 { background: var(--s2); }
  .bar-fill.s3 { background: var(--track-2); }
  .bar-fill.overlay { position: absolute; inset: 0 auto 0 0; }
  .bar-val { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .bar-val .of { font-weight: 500; color: var(--ink-3); }
  .tag-cn { font-style: normal; font-size: 11px; font-weight: 700; color: var(--accent); border: 1px solid currentColor; border-radius: 999px; padding: 0 7px; margin-left: 6px; white-space: nowrap; }

  .cmp-row { display: grid; grid-template-columns: minmax(150px, 240px) 1fr; gap: 12px; align-items: center; padding: 7px 0; border-bottom: 1px dashed var(--line); }
  .cmp-row:last-child { border-bottom: 0; }
  .cmp-tracks { display: grid; gap: 3px; }
  .bar-row-mini { display: grid; grid-template-columns: 1fr 48px; gap: 10px; align-items: center; }
  .bar-row-mini .bar-track { height: 10px; }
  .legend { display: flex; gap: 18px; font-size: 13px; color: var(--ink-2); margin: 0 0 14px; }
  .legend i { display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }

  .sub-h { font-size: 15px; font-weight: 700; margin: 26px 0 8px; }
  .verify-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
  .vcard { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; border-top: 3px solid var(--line); }
  .vcard.ok { border-top-color: var(--good); }
  .vcard.mid { border-top-color: var(--warn); }
  .vcard.off { border-top-color: var(--ink-3); }
  .vcard b { display: block; font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .vcard span { font-size: 13px; color: var(--ink-2); }
  .vcard em { display: block; font-style: normal; font-size: 11.5px; color: var(--ink-3); margin-top: 2px; }
  .verify-rows { display: grid; gap: 10px; }
  .vrow { display: grid; grid-template-columns: 12px 1fr; gap: 10px; align-items: start; font-size: 14.5px; color: var(--ink-2); line-height: 1.55; }
  .vrow b { color: var(--ink); }
  .dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 7px; background: var(--ink-3); }
  .dot.ok { background: var(--good); }
  .dot.mid { background: var(--warn); }
  .bar-fill.s3solid { background: var(--track-2); }
  .gain { font-size: 11px; font-weight: 700; color: var(--good); margin-left: 5px; }
  .insights { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
  .insight { background: var(--surface); border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 10px; padding: 14px 18px; font-size: 14.5px; }
  .insight b { display: block; margin-bottom: 3px; }
  .insight span { color: var(--ink-2); }

  .toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
  .toolbar input { flex: 1 1 260px; padding: 10px 14px; font: inherit; font-size: 14px; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 8px; }
  .toolbar input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
  .toolbar button { font: inherit; font-size: 13.5px; padding: 9px 14px; background: var(--surface); color: var(--ink-2); border: 1px solid var(--line); border-radius: 8px; cursor: pointer; }
  .toolbar button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }
  .toolbar button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .count-note { font-size: 13px; color: var(--ink-3); margin: 0; }
  .count-line { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .copy-btn { font: inherit; font-size: 13px; padding: 6px 12px; background: transparent; color: var(--accent); border: 1px solid var(--accent); border-radius: 7px; cursor: pointer; }
  .copy-btn:hover { background: var(--accent); color: #fff; }
  .copy-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .mail-cell a { display: block; }
  .new-tag { display: inline-block; font-size: 10px; font-weight: 700; color: var(--good); border: 1px solid currentColor; border-radius: 999px; padding: 0 5px; margin-left: 5px; vertical-align: 1px; white-space: nowrap; }
  .new-val { color: var(--ink); }
  .v-badge { display: inline-block; font-size: 11px; font-weight: 700; width: 15px; height: 15px; line-height: 14px; text-align: center; border-radius: 50%; vertical-align: 1px; }
  .v-badge.ok { color: #fff; background: var(--good); }
  .v-badge.mid { color: var(--ink); background: var(--track-2); }
  .loc-cell { white-space: nowrap; }
  .rate { font-size: 11.5px; color: var(--ink-3); margin-left: 6px; font-variant-numeric: tabular-nums; }

  .tbl-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; }
  table { border-collapse: collapse; width: 100%; min-width: 760px; font-size: 13.5px; }
  th { text-align: left; font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); padding: 12px 14px 8px; border-bottom: 2px solid var(--line); position: sticky; top: 0; background: var(--surface); }
  td { padding: 9px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
  tr:last-child td { border-bottom: 0; }
  td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .rep-badge { font-size: 10.5px; font-weight: 700; color: var(--s1); border: 1px solid currentColor; border-radius: 999px; padding: 0 6px; white-space: nowrap; }
  td a { color: var(--accent); word-break: break-all; }
  .cat-cell { color: var(--ink-2); font-size: 12.5px; }

  footer { margin-top: 48px; padding-top: 18px; border-top: 1px solid var(--line); font-size: 13px; color: var(--ink-3); }
  footer p { margin: 4px 0; max-width: 80ch; }

  .act-btns { display: flex; gap: 8px; flex-wrap: wrap; }
  .copy-btn.primary { background: var(--accent); color: #fff; font-weight: 600; }
  .copy-btn.primary:hover { filter: brightness(1.1); }

  /* ---- MOBİL: tabloyu karta çevir, yatay kaydırma yok ---- */
  @media (max-width: 720px) {
    .wrap { padding: 28px 16px 56px; }
    .tiles { grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); gap: 8px; }
    .tile { padding: 12px 14px; }
    .tile b { font-size: 24px; }
    .bar-row { grid-template-columns: 1fr; gap: 3px; padding: 7px 0; border-bottom: 1px solid var(--line); }
    .bar-row:last-child { border-bottom: 0; }
    .bar-label { text-align: left; font-weight: 600; color: var(--ink); }
    .bar-row .bar-val { text-align: left; }
    .cmp-row { grid-template-columns: 1fr; gap: 5px; }
    .verify-grid { grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); }
    .count-line { flex-direction: column; align-items: stretch; }
    .act-btns { display: grid; grid-template-columns: 1fr 1fr; }
    .toolbar button { flex: 1 1 auto; }

    .tbl-wrap { overflow-x: visible; background: transparent; border: 0; border-radius: 0; }
    table, thead, tbody, tr, td { display: block; width: auto; }
    table { min-width: 0; }
    thead { position: absolute; left: -9999px; }
    tbody tr {
      background: var(--surface); border: 1px solid var(--line); border-radius: 11px;
      padding: 12px 14px; margin-bottom: 10px;
    }
    tbody td { border: 0; padding: 3px 0 3px 40%; position: relative; min-height: 20px; white-space: normal; }
    tbody td::before {
      content: attr(data-l); position: absolute; left: 0; top: 3px; width: 36%;
      font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-3);
    }
    tbody td:first-child {
      padding: 0 0 8px 0; font-weight: 700; font-size: 15px;
      border-bottom: 1px solid var(--line); margin-bottom: 8px;
    }
    tbody td:first-child::before { content: none; }
    .loc-cell { white-space: normal; }
    .mail-cell a { word-break: break-all; }
  }
  @media (max-width: 380px) {
    .act-btns { grid-template-columns: 1fr; }
    tbody td { padding-left: 0; }
    tbody td::before { position: static; display: block; width: auto; margin-bottom: 1px; }
  }
</style>

<div class="wrap">
  <header>
    <p class="eyebrow">Fuar Analizi · TÜYAP Beylikdüzü · 1–4 Eylül 2026</p>
    <h1>Foodist İstanbul 2026 — Katılımcı Analizi</h1>
    <p class="lede">Uluslararası Gıda ve İçecek Ürünleri Fuarı'nın resmî katılımcı rehberindeki <b>${N} firma profilinin tamamı</b> 1 Ağustos 2026'da <a href="https://www.foodistexpo.com/katilimci-listesi" target="_blank" rel="noopener">foodistexpo.com</a>'dan derlendi; iletişim, konum ve ürün verileri tek tabloda birleştirildi.</p>
  </header>

  <div class="tiles">
    <div class="tile"><b>${N}</b><span>katılımcı firma</span></div>
    <div class="tile"><b>${Object.keys(countryCount).length}</b><span>ülke</span></div>
    <div class="tile"><b>${reps.length}</b><span>temsilci firma (%${Math.round(100 * reps.length / N)})</span></div>
    <div class="tile"><b>${salons.length}</b><span>salon</span></div>
    <div class="tile accent"><b>${mailli}</b><span>e-posta bulunan firma</span></div>
  </div>

  <section>
    <h2>Ürün kategorileri</h2>
    <p class="sub">Firma adı, tanıtım metni ve ürün vitrinindeki anahtar kelimelere göre sınıflandırma — bir firma birden fazla kategoriye girebilir. ${uncategorized} firma (%${Math.round(100 * uncategorized / N)}) yalnızca jenerik ad kullandığı için sınıflanamadı.</p>
    <div class="card">${catBars}
    </div>
  </section>

  <section>
    <h2>Salon dağılımı</h2>
    <p class="sub">Ağırlık 7, 8 ve 3 numaralı salonlarda. Salon 10 fiilen Çin pavyonu olarak çalışıyor: ${s10.length} firmanın en az ${s10cn}'u Çinli üretici ve ihracatçı.</p>
    <div class="card">${salonBars}
    </div>
  </section>

  <section>
    <h2>Ülkeler</h2>
    <p class="sub">Katılımın %${Math.round(100 * tr.length / N)}'u Türkiye'den (${tr.length} firma). ${fo.length} yabancı katılımcının dağılımı aşağıda — Çin tek başına yabancı katılımın yarısından fazlası.</p>
    <div class="card">${foreignBars}
    </div>
  </section>

  <section>
    <h2>Google Maps ile doğrulama</h2>
    <p class="sub">Her katılımcı Google Maps'te aranıp kaydıyla eşleştirildi. Eşleşme yalnızca ad benzerliğine bırakılmadı: telefon, web alan adı veya adres teyidi arandı; teyitsiz zayıf eşleşmeler (${gZayif}) tamamen elendi — "Akuz Otomotiv" gibi benzer adlı yanlış işletmeleri almamak için.</p>
    <div class="verify-grid">
      <div class="vcard ok"><b>${gKesin}</b><span>kesin eşleşme<em>telefon, web veya adres teyitli</em></span></div>
      <div class="vcard mid"><b>${gOlasi}</b><span>olası eşleşme<em>güçlü ad benzerliği, çelişki yok</em></span></div>
      <div class="vcard off"><b>${gZayif}</b><span>elenen zayıf eşleşme<em>kullanılmadı</em></span></div>
      <div class="vcard off"><b>${gYok}</b><span>Maps'te bulunamadı</span></div>
    </div>

    <h3 class="sub-h">Rehberdeki bilgi doğru mu?</h3>
    <div class="card">
      <div class="verify-rows">
        <div class="vrow"><span class="dot ok"></span><b>${telDog}</b> firmanın telefonu Google Maps'teki numarayla <b>birebir aynı</b> çıktı.</div>
        <div class="vrow"><span class="dot mid"></span><b>${telEk}</b> firmada Maps farklı bir numara gösteriyor — çoğu cep/sabit hat ikilisi, yani <b>ek numara</b> olarak eklendi, çelişki değil.</div>
        <div class="vrow"><span class="dot ok"></span><b>${webDog}</b> firmanın web sitesi aynı alan adıyla doğrulandı; <b>${webFarkli}</b> firmada Maps farklı bir alan adı gösteriyor (eski/yan marka olabilir, ikisi de kaydedildi).</div>
      </div>
    </div>

    <h3 class="sub-h">Yeni elde edilen bilgiler</h3>
    <p class="sub">Google Maps'in kapattığı boşluklar — soluk çubuk fuar rehberinden gelen, renkli çubuk doğrulama sonrası toplam.</p>
    <div class="card">
      <div class="legend"><span><i style="background:var(--track-2)"></i>Fuar rehberi</span><span><i style="background:var(--s1)"></i>Maps sonrası</span></div>${gainRows}
    </div>

    <div class="insights" style="margin-top:12px">
      <div class="insight"><b>+${telYeni} yeni telefon</b><span>Fuar rehberinde telefonu olmayan ${telYeni} firmanın numarası Maps kaydından bulundu.</span></div>
      <div class="insight"><b>+${webYeni} yeni web sitesi</b><span>Rehbere site girmemiş ${webYeni} firmanın adresi Maps üzerinden tespit edildi.</span></div>
      <div class="insight"><b>${koordVar} firma haritada</b><span>Enlem/boylam ve tıklanabilir harita linki eklendi — ziyaret planlaması ve saha rotası için.</span></div>
      <div class="insight"><b>${gKatVar} firmaya iş kategorisi</b><span>Google'ın kendi sınıflaması (Gıda Üreticisi, Toptancı, Aktar…) — rehberdeki jenerik unvanlardan daha ayırt edici.</span></div>
      <div class="insight"><b>${puanVar} firmada Google puanı</b><span>İşletmenin genel Google değerlendirmesi; kurumsal olgunluk hakkında kaba bir sinyal.</span></div>
    </div>
  </section>

  ${ilceTop.length ? `<section>
    <h2>Katılımcılar nerede? — ilçe dağılımı</h2>
    <p class="sub">Google Maps kaydı doğrulanan firmaların bulunduğu ilk ${ilceTop.length} ilçe. Bu bilgi fuar rehberinde hiç yoktu; adresler serbest metindi.</p>
    <div class="card">${ilceBars}
    </div>
  </section>` : ''}

  <section>
    <h2>E-posta çıkarımı — kategori bazında</h2>
    <p class="sub">Fuar rehberinde e-posta alanı yok. Bu yüzden katılımcıların kendi web sitelerinin anasayfası ve iletişim sayfası tarandı: rehberde sitesi kayıtlı ${siteli} firmanın <b>${mailli}'inde</b> geçerli e-posta bulundu (toplam ${mailAdet} adres). Koyu bant e-postası bulunanı, açık bant kategorideki toplam firmayı gösterir.</p>
    <div class="card">${catMailBars}
    </div>
  </section>

  <section>
    <h2>Profil verisi ne kadar dolu?</h2>
    <p class="sub">Yabancı katılımcılar fuar profillerini Türk firmalardan belirgin biçimde daha eksiksiz doldurmuş — telefonda fark %${fill.phone[2] - fill.phone[1]} puan.</p>
    <div class="card">
      <div class="legend"><span><i style="background:var(--s1)"></i>Türkiye (${tr.length})</span><span><i style="background:var(--s2)"></i>Yabancı (${fo.length})</span></div>${cmpRows}
    </div>
  </section>

  <section>
    <h2>Öne çıkanlar</h2>
    <div class="insights">
      <div class="insight"><b>Şekerleme ve kuruyemiş öne çıkıyor</b><span>En kalabalık iki kategori Şekerleme &amp; Çikolata (${catCount['Şekerleme & Çikolata']}) ile Kuruyemiş &amp; Kuru Meyve (${catCount['Kuruyemiş & Kuru Meyve']}) — fuarın ihracat odağını yansıtıyor.</span></div>
      <div class="insight"><b>Salon 10 = Çin pavyonu</b><span>Çinli katılımcıların tamamı Salon 10'da toplanmış; organize ülke pavyonu düzeni. İki Çinli firma sitede yanlışlıkla "Türkiye" etiketli.</span></div>
      <div class="insight"><b>${reps.length} temsilci firma</b><span>Katılımcıların %${Math.round(100 * reps.length / N)}'i standa kendi adına değil, temsilcisi aracılığıyla katılıyor; ${sharedStands} stantta birden fazla firma var.</span></div>
      <div class="insight"><b>${mailli} firmaya doğrudan e-posta</b><span>Katılımcıların kendi sitelerinden ${mailAdet} adres çıkarıldı; bu ${mailli} firmanın <b>tamamında telefon da var</b> — çift kanallı ön temas mümkün.</span></div>
      <div class="insight"><b>İletişim verisi zengin</b><span>${fill.phone[0]} firmanın telefonu, ${fill.web[0]} firmanın web sitesi rehberde açık — B2B ön temas için yeterli altyapı.</span></div>
      <div class="insight"><b>Ürün vitrini az kullanılıyor</b><span>Yalnızca ${fill.prod[0]} firma (%${Math.round(100 * fill.prod[0] / N)}) profiline ürün eklemiş; vitrini dolduranlar ön araştırmada öne çıkıyor.</span></div>
      <div class="insight"><b>Veri notu</b><span>Rehberdeki 589 kayıttan biri mükerrerdi (aynı firma, aynı stant); analiz ${N} tekil firma üzerinden yapıldı.</span></div>
    </div>
  </section>

  <section>
    <h2>Katılımcı rehberi</h2>
    <p class="sub">Tüm liste — firma adı, kategori, ülke, ilçe veya e-postaya göre arayın. Filtreleyip <b>görünen e-postaları tek tuşla kopyalayabilirsiniz</b>. <span class="new-tag">Maps</span> etiketi o bilginin fuar rehberinde olmayıp Google Maps'ten geldiğini, ✓ ise kaydın doğrulandığını gösterir.</p>
    <div class="toolbar">
      <input id="q" type="search" placeholder="Firma, kategori, ülke veya stant ara…" aria-label="Katılımcı ara">
      <button id="f-all" aria-pressed="true">Tümü</button>
      <button id="f-mail" aria-pressed="false">E-postası olanlar</button>
      <button id="f-yeni" aria-pressed="false">Maps'ten yeni bilgi</button>
      <button id="f-tr" aria-pressed="false">Türkiye</button>
      <button id="f-fo" aria-pressed="false">Yabancı</button>
      <button id="f-rep" aria-pressed="false">Temsilciler</button>
    </div>
    <div class="count-line">
      <p class="count-note" id="cnt"></p>
      <div class="act-btns">
        <button id="xls" class="copy-btn primary">Excel'e aktar (.xlsx)</button>
        <button id="copy" class="copy-btn">E-postaları kopyala</button>
      </div>
    </div>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Firma</th><th>Ülke</th><th>Salon / Stant</th><th>Kategoriler</th><th>Telefon</th><th>E-posta</th><th>Konum</th><th>Web</th></tr></thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
  </section>

  <footer>
    <p><b>Yöntem:</b> foodistexpo.com katılımcı listesinin 53 sayfası ve ${N} firma profil sayfası 1 Ağustos 2026'da indirildi; ad, ülke, salon/stant, telefon, adres, web, sosyal medya ve ürün alanları ayrıştırıldı. Kategoriler metin temelli otomatik sınıflandırmadır, kesin sektör kaydı değildir.</p>
    <p><b>E-postalar:</b> Fuar rehberinde e-posta alanı bulunmadığından, yalnızca bu fuara katılan firmaların rehberde kayıtlı kendi web siteleri (anasayfa + iletişim sayfası) tarandı. Ajans/altyapı adresleri ve KEP adresleri elendi; kalanlar firma alan adı ve info/sales/export önekine göre sıralandı. Adresler otomatik çıkarıldığı için gönderim öncesi doğrulanmalı ve ticari e-posta gönderiminde İYS/KVKK yükümlülükleri gözetilmelidir.</p>
    <p><b>Google Maps doğrulaması:</b> Her katılımcı adı (gerekirse rehber adresindeki şehir ipucuyla) Google Maps'te arandı. Bir kayıt ancak şu koşullarda kabul edildi: telefon veya web alan adı birebir tutuyor, ya da ad benzerliği yüksek olup adres/ilçe rehberdeki adresle çelişmiyor. Kısa ön ek benzerlikleri (ör. "Aküzüm" ↔ "Akuz") reddedildi; teyitsiz ${gZayif} eşleşme tamamen elendi ve hiçbir alanı doldurmak için kullanılmadı. Tabloda ✓ kesin, ~ olası eşleşmeyi gösterir. Maps verisi işletmelerin kendi beyanına dayanır; kritik temaslarda telefonla teyit önerilir.</p>
    <p><b>Fuar:</b> Foodist İstanbul Uluslararası Gıda ve İçecek Ürünleri Fuarı · 1–4 Eylül 2026 · TÜYAP Fuar ve Kongre Merkezi, Beylikdüzü/İstanbul · Organizatör: TÜYAP + ALZ Fuarcılık.</p>
  </footer>
</div>

<script>
${xlsxLib}
</script>
<script>
const DATA = ${tableJson};
const XL = ${xlJson};
const tbody = document.getElementById('tbody');
const q = document.getElementById('q');
const cnt = document.getElementById('cnt');
const btns = { all: document.getElementById('f-all'), mail: document.getElementById('f-mail'), yeni: document.getElementById('f-yeni'), tr: document.getElementById('f-tr'), fo: document.getElementById('f-fo'), rep: document.getElementById('f-rep') };
const copyBtn = document.getElementById('copy');
let mode = 'all';
let visible = [];
const norm = s => (s || '').toLocaleLowerCase('tr');
const escH = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

function render() {
  const term = norm(q.value.trim());
  visible = DATA.filter(r => {
    if (mode === 'tr' && r.c !== 'Türkiye') return false;
    if (mode === 'fo' && (r.c === 'Türkiye' || !r.c)) return false;
    if (mode === 'rep' && !r.r) return false;
    if (mode === 'mail' && !r.e) return false;
    if (mode === 'yeni' && !r.gp && !r.gw) return false;
    if (!term) return true;
    return norm(r.n + ' ' + r.c + ' ' + r.k + ' ' + r.s + ' ' + r.t + ' ' + r.e + ' ' + r.d).includes(term);
  });
  const mailCount = visible.filter(r => r.e).length;
  cnt.textContent = visible.length + ' / ' + DATA.length + ' firma gösteriliyor · ' + mailCount + ' tanesinde e-posta var';
  tbody.innerHTML = visible.map(r => {
    const tel = r.p
      ? escH(r.p) + (r.gp ? '<span class="new-tag">+' + escH(r.gp) + '</span>' : '')
      : (r.gp ? '<span class="new-val">' + escH(r.gp) + '</span><span class="new-tag">Maps</span>' : '—');
    const web = r.w
      ? '<a href="' + escH(r.w) + '" target="_blank" rel="noopener">site</a>'
      : (r.gw ? '<a href="' + escH(r.gw) + '" target="_blank" rel="noopener">site</a><span class="new-tag">Maps</span>' : '—');
    const loc = r.d
      ? (r.m ? '<a href="' + escH(r.m) + '" target="_blank" rel="noopener">' + escH(r.d) + '</a>' : escH(r.d)) +
        (r.gr !== '' ? '<span class="rate">★ ' + escH(r.gr) + '</span>' : '')
      : '—';
    return '<tr><td>' + escH(r.n) + (r.r ? ' <span class="rep-badge">temsilci</span>' : '') +
      (r.v === 'kesin' ? ' <span class="v-badge ok" title="Google Maps kaydı telefon/web/adres ile doğrulandı">✓</span>' :
       r.v === 'olasi' ? ' <span class="v-badge mid" title="Google Maps kaydı ad benzerliğiyle eşleşti">~</span>' : '') +
      '</td><td data-l="Ülke">' + escH(r.c) +
      '</td><td class="num" data-l="Salon / Stant">' + escH(r.s) + ' / ' + escH(r.t) +
      '</td><td class="cat-cell" data-l="Kategoriler">' + escH(r.k || '—') +
      '</td><td class="num" data-l="Telefon">' + tel +
      '</td><td class="mail-cell" data-l="E-posta">' + (r.e ? r.e.split(' | ').map(m => '<a href="mailto:' + escH(m) + '">' + escH(m) + '</a>').join('') : '—') +
      '</td><td class="loc-cell" data-l="Konum">' + loc +
      '</td><td data-l="Web">' + web +
      '</td></tr>';
  }).join('');
}

copyBtn.addEventListener('click', async () => {
  const mails = [...new Set(visible.filter(r => r.e).flatMap(r => r.e.split(' | ')))];
  if (!mails.length) { copyBtn.textContent = 'Kopyalanacak e-posta yok'; setTimeout(() => copyBtn.textContent = 'Görünen e-postaları kopyala', 2000); return; }
  try {
    await navigator.clipboard.writeText(mails.join('; '));
    copyBtn.textContent = mails.length + ' e-posta kopyalandı';
  } catch {
    copyBtn.textContent = 'Kopyalanamadı — CSV dosyasını kullanın';
  }
  setTimeout(() => copyBtn.textContent = 'Görünen e-postaları kopyala', 2500);
});
// --- Excel dışa aktarım (gerçek .xlsx — Türkçe karakter garantili) ---
const xlsBtn = document.getElementById('xls');
xlsBtn.addEventListener('click', () => {
  const label = xlsBtn.textContent;
  try {
    // görünen firmaların adlarını al, tam veriden o satırları süz
    const adlar = new Set(visible.map(r => r.n));
    const satirlar = adlar.size === XL.r.length ? XL.r : XL.r.filter(row => adlar.has(row[0]));
    const blob = window.makeXlsx(XL.h, satirlar, 'Katılımcılar');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'foodist-istanbul-2026-katilimcilar' + (satirlar.length === XL.r.length ? '' : '-secili') + '.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    xlsBtn.textContent = satirlar.length + ' satır indirildi';
  } catch (e) {
    xlsBtn.textContent = 'Dosya oluşturulamadı';
  }
  setTimeout(() => { xlsBtn.textContent = label; }, 2500);
});

q.addEventListener('input', render);
Object.entries(btns).forEach(([k, b]) => b.addEventListener('click', () => {
  mode = k;
  Object.values(btns).forEach(x => x.setAttribute('aria-pressed', 'false'));
  b.setAttribute('aria-pressed', 'true');
  render();
}));
render();
</script>
`;

fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf8');
console.log('yazıldı: index.html,', Math.round(Buffer.byteLength(html, 'utf8') / 1024), 'KB');

// --- Kimlik sızıntısı denetimi: sayfada kişisel/kurumsal ad geçmemeli ---
const YASAK = /tasarimmania|tasarımmania|ihsan|estetouch|anthropic|claude/gi;
const sizinti = html.match(YASAK);
if (sizinti) { console.error('!! KİMLİK SIZINTISI:', [...new Set(sizinti)].join(', ')); process.exitCode = 1; }
else console.log('✓ kimlik sızıntısı yok');

// --- Kodlama denetimi: bozuk Türkçe karakter kalıbı ---
const BOZUK = /Ã[§¶¼]|Å|Ä[±]|â€|ï»¿|�|ı̇|İ̇/g;
const bozuk = html.match(BOZUK);
if (bozuk) { console.error('!! KODLAMA HATASI:', [...new Set(bozuk)].slice(0, 8).map(x => JSON.stringify(x)).join(' ')); process.exitCode = 1; }
else console.log('✓ kodlama temiz (UTF-8, birleşik nokta yok)');
