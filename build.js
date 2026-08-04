const fs = require('fs');
const path = require('path');
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'foodist-data.json'), 'utf8'));

// --- Unicode normalizasyonu ---
// Kaynak veride "Nilüfer" yerine "Ni" + i + U+0307 (birleşik nokta) gibi bozukluklar var:
// İ (U+0130) Türkçe olmayan bir locale ile küçültülünce i + U+0307'ye dönüşüyor.
// Bu, ilçe sayımını ikiye böler, aramayı bozar ve Excel'e sızar.
// NFC'ye çevirip artakalan birleşik işaretleri atıyoruz (Türkçe NFC'de birleşik işaret kullanmaz).
const nfc = s => typeof s === 'string' ? s.normalize('NFC').replace(/[̀-ͯ]/g, '') : s;
rows.forEach(r => { for (const k in r) r[k] = nfc(r[k]); });

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
const xlJson = JSON.stringify({ h: XL_HEADERS, r: xlRows });
// Excel verisi sayfaya GÖMÜLMÜYOR: 559 KB'lik bu yük her ziyaretçiye inip yalnızca
// indirme butonunca kullanılıyordu. Ayrı dosyaya yazılıp istendiğinde çekiliyor.
fs.writeFileSync(path.join(__dirname, 'veri-export.json'), xlJson, 'utf8');
console.log('yazıldı: veri-export.json,', Math.round(Buffer.byteLength(xlJson, 'utf8') / 1024), 'KB');
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

const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>Foodist İstanbul 2026 — Katılımcı Analizi</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAK4AAACuCAYAAACvDDbuAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAEd0lEQVR42u3dzWscZRzA8VVaW+xB8NKDYqQm2dn3mX2R3uI/4L/gyRYRTwoehNKDiIgH/w97Ew8iaAqCVOmxKERCIG0yu3mR5q1J87LjM039AxpM7Ox+PvBj9zbDzpcnc3melEoAAAAAAAAAAAAAAAAAAAAwepbj6K8w62H2+0m0bU42aVzZWOvUsuWk/KWqzibcxUFS2Ri0K0f9EG/4bk4w/aSyt9WtZ+E3/EpVZ2Apjvpr7cr2eqeapUllOGhXM/Psk/92e71G1m9FX6vqbMJNV0K4q8c//lH+AMyzz3L47R716lkq3P8l3GE/fJpnH+EKV7gIV7jCNcIVrnARrnCFK0LhCle4CFe4CFe4wjXCFa5wEa5whWuEK1zhIlzhCle4whWucBGucHnOwk1HZIQ7buEmlWxENkwe7Qp3PMJdCfN3J59aYWe9fXz/q+1KdvR2MwsHg3yjqhENd3Ac7UG49nyalG+nSfR7OJjktyLOUly+k3+mcfnXcKLNveVm9LGqRjDc8C44XAufe93G+mJz6pPZiYmLC+WJNxdbU68VfearV95YvPr6q6oawXDzd8Hw5/Vov9dYWYyn38/v4Wap9KInwXMfblhxjx736iv3W1PX83uYm5y8kIV4R2ReUNUIr7gHYcX9N9y7pdJ5TwLhIlzhIlzhIlyEK1yEK1yEC8JFuMJFuMJFuAhXuAhXuAgX4QoX4QoX4YJwEa5wGffNktGTcMMGw/P5JsMijoLGcMVdak1dy+9htlQ650lQlHMVVkO4H+Wr1vyVK68sdTovF23SZvPS3U7Ha85YhNuu5tcYribV/TSO/uwn1e+XmtHPy63opyLNoFX5cSWJ7vwR1957Gq/XhlE/Oyx9eq2H3VqWn3D4qICz3a1n2dVWthpPf74wM3HR++4YndaYnykbDow7LOKEg/oe5/GG7zcWJoTrRPICnUC+12uE79FNK65whYtwhStcI1zhChfhCle4whWucIWLcIWLcIUrXOEKV7jCRbjCFa4RrnCFi3CFK1zhCle4wkW4wkW4whXuf/Lwh082TBZwwtb6g52w21e4Y7g9fTPsks1XreJuT4+zQTL9hXDH4ySbYbjecKNb2w7X/rbfiK7348pn4YCNT4s0aZh+M7pxv/XWO7MzM+eEO0ZHMC3G0x/m95Bevnwpq1ZfKtrMTU5eyKNV0did1nh8zOi9PISCntZopXU+LggX4QoX4QoX4SJc4SJc4SJcEC7CFS7CFS7CRbjCRbjCRbgIV7gIV7gIF4SLcIWLcIWLcBGucBGucBEuCBfhChfhgnARrnARrnARLsIVLsIVLsIF4SJc4SJcEC7CFS7CFS7CRbjCRbjC5bTCfdBPKpthsvD9cCmEdaoTRwdrSeVgtxv+CXUjuiZcTmSjXR1sd2uPD3uNbKdbz3Z7pzs7YcJqm+316hsPmuUPhMuJrHdrtza79R92OrVfttrV29ud2qnOVpiNcK2Hvfp3c0n53fweZkulc54EAAAAAAAAAAAAAAAAAAAAPPf+ARHrTH63AYYNAAAAAElFTkSuQmCC">
<meta name="description" content="Foodist İstanbul 2026 fuarının 588 katılımcı firmasının doğrulanmış iletişim, konum ve kategori analizi.">
<style>
  :root {
    --bg: #faf8f5; --surface: #ffffff; --ink: #1c1917; --ink-2: #57534e; --ink-3: #6f6a62;
    --accent: #a63d2f; --line: #e7e0d8; --track: #efe9e1; --track-2: #ded4c7;
    --s1: #2a78d6; --s2: #eb6834; --good: #007a2e; --warn: #b06f00; --on-accent: #fff; --on-good: #fff; --rozet: #1a5fb4; --golge: 0 2px 4px rgba(28,25,23,.05); --golge-uzeri: 0 6px 18px rgba(28,25,23,.11); --vurgu-zemin: rgba(166,61,47,.045);
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #171412; --surface: #1f1c19; --ink: #f2efe9; --ink-2: #b8b2a7; --ink-3: #9c948a;
      --accent: #e0765f; --line: #35302a; --track: #2a2622; --track-2: #433c33;
      --s1: #3987e5; --s2: #d95926; --good: #4cb872; --warn: #c98500; --on-accent: #2a1512; --on-good: #10240f; --rozet: #6aa9ee; --golge: 0 2px 4px rgba(0,0,0,.28); --golge-uzeri: 0 8px 22px rgba(0,0,0,.42); --vurgu-zemin: rgba(224,118,95,.07);
      color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --bg: #171412; --surface: #1f1c19; --ink: #f2efe9; --ink-2: #b8b2a7; --ink-3: #9c948a;
    --accent: #e0765f; --line: #35302a; --track: #2a2622; --track-2: #433c33;
    --s1: #3987e5; --s2: #d95926; --good: #4cb872; --warn: #c98500; --on-accent: #2a1512; --on-good: #10240f; --rozet: #6aa9ee; --golge: 0 2px 4px rgba(0,0,0,.28); --golge-uzeri: 0 8px 22px rgba(0,0,0,.42); --vurgu-zemin: rgba(224,118,95,.07);
    color-scheme: dark;
  }
  :root[data-theme="light"] {
    --bg: #faf8f5; --surface: #ffffff; --ink: #1c1917; --ink-2: #57534e; --ink-3: #6f6a62;
    --accent: #a63d2f; --line: #e7e0d8; --track: #efe9e1; --track-2: #ded4c7;
    --s1: #2a78d6; --s2: #eb6834; --good: #007a2e; --warn: #b06f00; --on-accent: #fff; --on-good: #fff; --rozet: #1a5fb4; --golge: 0 2px 4px rgba(28,25,23,.05); --golge-uzeri: 0 6px 18px rgba(28,25,23,.11); --vurgu-zemin: rgba(166,61,47,.045);
    color-scheme: light;
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) .logo-acik { display: none; }
    :root:not([data-theme="light"]) .logo-koyu { display: block; }
  }
  :root[data-theme="dark"] .logo-acik { display: none; }
  :root[data-theme="dark"] .logo-koyu { display: block; }
  :root[data-theme="light"] .logo-acik { display: block; }
  :root[data-theme="light"] .logo-koyu { display: none; }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .wrap { max-width: 1340px; margin: 0 auto; padding: 48px 24px 80px; }
  .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); margin: 0 0 8px; }
  h1 { font-size: clamp(28px, 4.5vw, 42px); line-height: 1.15; font-weight: 800; margin: 0 0 10px; text-wrap: balance; }
  .lede { color: var(--ink-2); max-width: 62ch; margin: 0; }
  .lede a { color: var(--accent); }
  header { padding-bottom: 28px; border-bottom: 2px solid var(--ink); margin-bottom: 32px; }
  /* Logo: mobilde başlığın üstünde, geniş ekranda sağında */
  .marka { display: inline-block; margin: 0 0 18px; line-height: 0; border-radius: 6px; }
  .marka:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
  .logo { display: block; width: 186px; height: auto; }
  .logo-koyu { display: none; }
  @media (min-width: 901px) {
    header { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 36px; align-items: start; }
    .basliklar { grid-column: 1; grid-row: 1; min-width: 0; }
    .marka { grid-column: 2; grid-row: 1; justify-self: end; margin: 4px 0 0; }
    .logo { width: 244px; }
  }
  @media (min-width: 1100px) { .logo { width: 272px; } }

  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 0 0 44px; }
  .tile { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 16px 18px; box-shadow: var(--golge); }
  .tile b { display: block; font-size: 30px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
  .tile span { font-size: 13px; color: var(--ink-2); }
  .tile.accent { border-color: var(--accent); box-shadow: inset 3px 0 0 var(--accent); }
  .tile.accent b { color: var(--accent); }

  section { margin-bottom: 44px; }
  h2 { font-size: 21px; font-weight: 800; margin: 0 0 4px; }
  .sub { font-size: 14px; color: var(--ink-2); margin: 0 0 18px; max-width: 70ch; }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 20px 22px; }

  .bar-row { display: grid; grid-template-columns: minmax(150px, 240px) 1fr 44px; gap: 12px; align-items: center; padding: 4px 0; }

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
  .vcard { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; border-top: 3px solid var(--line); box-shadow: var(--golge); }
  .vcard.ok { border-top-color: var(--good); }
  .vcard.mid { border-top-color: var(--warn); }
  .vcard.off { border-top-color: var(--ink-3); }
  .vcard b { display: block; font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .vcard span { font-size: 13px; color: var(--ink-2); }
  .vcard em { display: block; font-style: normal; font-size: 11.5px; color: var(--ink-3); margin-top: 2px; }
  .verify-rows { display: grid; gap: 10px; }
  .vrow { position: relative; padding-left: 24px; font-size: 14.5px; color: var(--ink-2); line-height: 1.6; }
  .vrow b { color: var(--ink); }
  .dot { position: absolute; left: 0; top: 8px; width: 10px; height: 10px; border-radius: 50%; background: var(--ink-3); }
  .dot.ok { background: var(--good); }
  .dot.mid { background: var(--warn); }
  .bar-fill.s3solid { background: var(--track-2); }
  .gain { font-size: 11px; font-weight: 700; color: var(--good); margin-left: 5px; }
  .insights { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
  .insight { background: var(--surface); border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 10px; padding: 14px 18px; font-size: 14.5px; box-shadow: var(--golge); }
  .insight b { display: block; margin-bottom: 3px; transition: color .18s ease; }
  .insight span { color: var(--ink-2); }

  /* 588 satırlık listede gezerken arama ve filtreler hep erişilebilir kalsın */
  .toolbar {
    display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;
    position: sticky; top: 56px; z-index: 40; padding: 10px 0;
    background: color-mix(in srgb, var(--bg) 94%, transparent);
    backdrop-filter: blur(8px);
  }
  .toolbar input { flex: 1 1 260px; padding: 10px 14px; font: inherit; font-size: 14px; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 8px; }
  .toolbar input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
  .toolbar button { font: inherit; font-size: 13.5px; padding: 9px 14px; background: var(--surface); color: var(--ink-2); border: 1px solid var(--line); border-radius: 8px; cursor: pointer; }
  .toolbar button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  .toolbar button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .count-note { font-size: 13px; color: var(--ink-3); margin: 0; }
  .count-line { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .copy-btn { font: inherit; font-size: 13.5px; padding: 10px 14px; min-height: 42px; background: transparent; color: var(--accent); border: 1px solid var(--accent); border-radius: 7px; cursor: pointer; }

  .copy-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .mail-cell a { display: block; }
  .new-tag { display: inline-block; font-size: 10px; font-weight: 700; color: var(--good); border: 1px solid currentColor; border-radius: 999px; padding: 0 5px; margin-left: 5px; vertical-align: 1px; white-space: nowrap; }
  .new-val { color: var(--ink); }
  .v-badge { display: inline-block; font-size: 11px; font-weight: 700; width: 15px; height: 15px; line-height: 14px; text-align: center; border-radius: 50%; vertical-align: 1px; }
  .v-badge.ok { color: var(--on-good); background: var(--good); }
  .v-badge.mid { color: var(--ink); background: var(--track-2); }
  .loc-cell { line-height: 1.4; }
  .rate { display: inline-block; white-space: nowrap; font-size: 11.5px; color: var(--ink-3); margin-left: 6px; font-variant-numeric: tabular-nums; }

  .tbl-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; }
  table { border-collapse: collapse; width: 100%; font-size: 13.5px; }
  @media (min-width: 901px) {
    table { min-width: 1240px; table-layout: fixed; }
    th:nth-child(1), td:nth-child(1) { width: 27%; }
    th:nth-child(2), td:nth-child(2) { width: 8%; }
    th:nth-child(3), td:nth-child(3) { width: 7%; }
    th:nth-child(4), td:nth-child(4) { width: 14%; }
    th:nth-child(5), td:nth-child(5) { width: 12%; }
    th:nth-child(6), td:nth-child(6) { width: 17%; }
    th:nth-child(7), td:nth-child(7) { width: 10%; }
    th:nth-child(8), td:nth-child(8) { width: 5%; }
  }
  th { text-align: left; font-size: 11px; letter-spacing: .07em; text-transform: uppercase; color: var(--ink-2); padding: 13px 14px 10px; border-bottom: 2px solid var(--ink-3); position: sticky; background: var(--surface); z-index: 2; }
  td { padding: 10px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
  tr:last-child td { border-bottom: 0; }
  td.num { font-variant-numeric: tabular-nums; line-height: 1.45; }
  .rep-badge { font-size: 10.5px; font-weight: 700; color: var(--rozet); border: 1px solid currentColor; border-radius: 999px; padding: 0 6px; white-space: nowrap; }
  td a { color: var(--accent); overflow-wrap: anywhere; }
  .cat-cell { color: var(--ink-2); font-size: 12.5px; line-height: 1.45; }
  tbody tr:nth-child(even) { background: color-mix(in srgb, var(--ink) 3%, transparent); }

  td:first-child { font-weight: 650; color: var(--ink); line-height: 1.42; letter-spacing: -0.005em; }
  .unvan-ek { display: block; font-weight: 400; font-size: 11.5px; color: var(--ink-3); letter-spacing: .01em; margin-top: 1px; }

  /* --- Yapışkan bölüm menüsü --- */
  .topnav {
    position: sticky; top: 0; z-index: 60;
    background: color-mix(in srgb, var(--bg) 92%, transparent);
    backdrop-filter: saturate(1.5) blur(10px);
    border-bottom: 1px solid var(--line);
  }
  .topnav-in {
    max-width: 1340px; margin: 0 auto; padding: 8px 16px;
    display: flex; gap: 7px; overflow-x: auto; scrollbar-width: none;
    -webkit-overflow-scrolling: touch; scroll-snap-type: x proximity;
  }
  .topnav-in::-webkit-scrollbar { display: none; }
  .chip {
    flex: 0 0 auto; scroll-snap-align: start;
    font-size: 13px; font-weight: 600; text-decoration: none; white-space: nowrap;
    color: var(--ink-2); background: var(--surface);
    border: 1px solid var(--line); border-radius: 999px;
    padding: 8px 13px; min-height: 36px; display: inline-flex; align-items: center;
    transition: background .15s, color .15s, border-color .15s;
  }

  .chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .chip.aktif { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }

  /* --- Başa dön --- */
  .fab {
    position: fixed; right: 16px; bottom: 16px; z-index: 70;
    width: 50px; height: 50px; border-radius: 50%;
    font-size: 21px; line-height: 1; cursor: pointer;
    background: var(--accent); color: var(--on-accent); border: 0;
    box-shadow: 0 4px 16px rgba(0,0,0,.28);
    opacity: 0; visibility: hidden; transform: translateY(10px);
    transition: opacity .2s, transform .2s, visibility .2s;
  }
  .fab.gorunur { opacity: 1; visibility: visible; transform: none; }
  .fab:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }

  /* Bölüm başlıkları menünün altında kalmasın */
  section[id], #ust { scroll-margin-top: 62px; }
  th { top: 53px; }

  @media (prefers-reduced-motion: reduce) {
    .fab, .chip { transition: none; }
    html { scroll-behavior: auto !important; }
  }

  /* ---- Hover dili ----
     Yalnızca gerçek işaretçide çalışır: dokunmatik cihazlarda bir karta dokununca
     hover durumu üzerinde "takılı" kalır, bu yüzden (hover: hover) ile kapatıldı. */
  .tile, .insight, .vcard, .card {
    transition: transform .18s cubic-bezier(.2,.7,.3,1),
                box-shadow .18s ease,
                border-color .18s ease,
                background-color .18s ease;
    will-change: auto;
  }
  @media (hover: hover) and (pointer: fine) {
    /* Dokunmatikte hover durumu dokunulan ogenin uzerinde takili kalir;
       bu yuzden RENK degisimleri de dahil TUM hover kurallari burada. */
    .bar-row:hover .bar-fill { filter: brightness(1.12); }
    .chip:hover { border-color: var(--accent); color: var(--accent); }
    .copy-btn:hover { background: var(--accent); color: #fff; }
    .copy-btn.primary:hover { filter: brightness(1.1); background: var(--accent); color: var(--on-accent); }
    tbody tr:hover { background: color-mix(in srgb, var(--accent) 7%, transparent); }
    .tile:hover, .vcard:hover {
      transform: translateY(-2px);
      box-shadow: var(--golge-uzeri);
      border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
    }
    /* Öne çıkan kartlar: soldaki vurgu şeridi kalınlaşsın (düzen kaymasın diye
       border yerine iç gölge ile) */
    .insight:hover {
      transform: translateY(-2px);
      box-shadow: inset 2px 0 0 var(--accent), var(--golge-uzeri);
      border-color: color-mix(in srgb, var(--accent) 40%, var(--line));
      background: color-mix(in srgb, var(--accent) 3%, var(--surface));
    }
    .insight:hover b { color: var(--accent); }
    .card:hover { box-shadow: var(--golge); }

    /* Grafik satırları: fare hangi satırdaysa o okunsun */
    .bar-row { transition: background-color .15s ease; border-radius: 6px; }
    .bar-row:hover { background: var(--vurgu-zemin); }
    .bar-row:hover .bar-label { color: var(--ink); }
    .cmp-row { transition: background-color .15s ease; border-radius: 6px; }
    .cmp-row:hover { background: var(--vurgu-zemin); }

    /* Menü etiketleri ve butonlar biraz daha canlı */
    .chip { transition: background .15s, color .15s, border-color .15s, transform .15s; }
    .chip:hover { transform: translateY(-1px); }
    .copy-btn { transition: background .15s, color .15s, box-shadow .15s, transform .15s; }
    .copy-btn:hover { transform: translateY(-1px); box-shadow: var(--golge); }
    .fab { transition: opacity .2s, transform .2s, visibility .2s, box-shadow .2s; }
    .fab.gorunur:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.36); }
    .marka { transition: transform .2s cubic-bezier(.2,.7,.3,1), opacity .2s; }
    .marka:hover { transform: scale(1.02); opacity: .92; }
  }

  /* Hareket azaltma tercihinde yalnızca renk değişsin, hiçbir şey kıpırdamasın */
  @media (prefers-reduced-motion: reduce) {
    .tile, .insight, .vcard, .card, .chip, .copy-btn, .fab, .marka, .bar-row, .cmp-row { transition: none; }
    .tile:hover, .insight:hover, .vcard:hover, .chip:hover,
    .copy-btn:hover, .fab.gorunur:hover, .marka:hover { transform: none; }
  }

  footer { margin-top: 48px; padding-top: 18px; border-top: 1px solid var(--line); font-size: 13px; color: var(--ink-3); }
  footer p { margin: 4px 0; max-width: 80ch; }

  .act-btns { display: flex; gap: 8px; flex-wrap: wrap; }
  .copy-btn.primary { background: var(--accent); color: var(--on-accent); font-weight: 600; }

  .copy-btn[disabled] { opacity: .65; cursor: progress; }

  /* ---- MOBİL: tabloyu karta çevir, yatay kaydırma yok ---- */
  @media (max-width: 900px) {
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
    /* Firma listesinde gezerken arama ve filtreler hep elin altında olsun */
    /* Menünün tam altına otur; sayaç yapışkan DEĞİL — değişken yükseklikli iki
       yapışkan katman üst üste biniyordu. */
    .toolbar {
      top: 56px; margin: 0 -16px 10px; padding: 10px 16px;
      border-bottom: 1px solid var(--line);
    }
    .count-line { position: static; }
    .fab { right: 14px; bottom: 14px; }
    tbody td { overflow-wrap: anywhere; }
    table, tbody td, thead th { width: auto; min-width: 0; table-layout: auto; }
    .mail-cell a { word-break: break-all; }
    tbody td a { display: inline-block; padding: 6px 0; min-height: 22px; }
    .mail-cell a { padding: 5px 0; }
  }
  @media (max-width: 380px) {
    .act-btns { grid-template-columns: 1fr; }
    tbody td { padding-left: 0; }
    tbody td::before { position: static; display: block; width: auto; margin-bottom: 1px; }
  }
</style>

<nav class="topnav" id="topnav" aria-label="Bölümler">
  <div class="topnav-in">
    <a class="chip" href="#ust">Özet</a>
    <a class="chip" href="#s-rehber">Firma listesi</a>
    <a class="chip" href="#s-kategori">Kategoriler</a>
    <a class="chip" href="#s-salon">Salonlar</a>
    <a class="chip" href="#s-ulke">Ülkeler</a>
    <a class="chip" href="#s-dogrulama">Doğrulama</a>
    <a class="chip" href="#s-ilce">İlçeler</a>
    <a class="chip" href="#s-eposta">E-posta</a>
    <a class="chip" href="#s-veri">Veri</a>
    <a class="chip" href="#s-bulgular">Bulgular</a>
  </div>
</nav>
<button id="ustBtn" class="fab" aria-label="Sayfa başına dön" title="Başa dön">↑</button>

<div class="wrap" id="ust">
  <header>
    <a class="marka" href="https://www.foodistexpo.com" target="_blank" rel="noopener"
       aria-label="Foodist İstanbul — fuarın resmî sitesi (yeni sekmede açılır)">
      <img class="logo logo-acik" src="data:image/png;base64,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"
           width="640" height="296"
           alt="" aria-hidden="true">
      <img class="logo logo-koyu" src="data:image/png;base64,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"
           width="640" height="296" alt="" aria-hidden="true">
    </a>
    <div class="basliklar">
    <p class="eyebrow">Fuar Analizi · TÜYAP Beylikdüzü · 1–4 Eylül 2026</p>
    <h1>Foodist İstanbul 2026 — Katılımcı Analizi</h1>
    <p class="lede">Uluslararası Gıda ve İçecek Ürünleri Fuarı'nın resmî katılımcı rehberindeki <b>${N} firma profilinin tamamı</b> 1 Ağustos 2026'da <a href="https://www.foodistexpo.com/katilimci-listesi" target="_blank" rel="noopener">foodistexpo.com</a>'dan derlendi; iletişim, konum ve ürün verileri tek tabloda birleştirildi.</p>
    </div>
  </header>

  <div class="tiles">
    <div class="tile"><b>${N}</b><span>katılımcı firma</span></div>
    <div class="tile"><b>${Object.keys(countryCount).length}</b><span>ülke</span></div>
    <div class="tile"><b>${reps.length}</b><span>temsilci firma (%${Math.round(100 * reps.length / N)})</span></div>
    <div class="tile"><b>${salons.length}</b><span>salon</span></div>
    <div class="tile accent"><b>${mailli}</b><span>e-posta bulunan firma</span></div>
  </div>

  <section id="s-kategori">
    <h2>Ürün kategorileri</h2>
    <p class="sub">Firma adı, tanıtım metni ve ürün vitrinindeki anahtar kelimelere göre sınıflandırma — bir firma birden fazla kategoriye girebilir. ${uncategorized} firma (%${Math.round(100 * uncategorized / N)}) yalnızca jenerik ad kullandığı için sınıflanamadı.</p>
    <div class="card">${catBars}
    </div>
  </section>

  <section id="s-salon">
    <h2>Salon dağılımı</h2>
    <p class="sub">Ağırlık 7, 8 ve 3 numaralı salonlarda. Salon 10 fiilen Çin pavyonu olarak çalışıyor: ${s10.length} firmanın en az ${s10cn}'u Çinli üretici ve ihracatçı.</p>
    <div class="card">${salonBars}
    </div>
  </section>

  <section id="s-ulke">
    <h2>Ülkeler</h2>
    <p class="sub">Katılımın %${Math.round(100 * tr.length / N)}'u Türkiye'den (${tr.length} firma). ${fo.length} yabancı katılımcının dağılımı aşağıda — Çin tek başına yabancı katılımın yarısından fazlası.</p>
    <div class="card">${foreignBars}
    </div>
  </section>

  <section id="s-dogrulama">
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

  ${ilceTop.length ? `<section id="s-ilce">
    <h2>Katılımcılar nerede? — ilçe dağılımı</h2>
    <p class="sub">Google Maps kaydı doğrulanan firmaların bulunduğu ilk ${ilceTop.length} ilçe. Bu bilgi fuar rehberinde hiç yoktu; adresler serbest metindi.</p>
    <div class="card">${ilceBars}
    </div>
  </section>` : ''}

  <section id="s-eposta">
    <h2>E-posta çıkarımı — kategori bazında</h2>
    <p class="sub">Fuar rehberinde e-posta alanı yok. Bu yüzden katılımcıların kendi web sitelerinin anasayfası ve iletişim sayfası tarandı: rehberde sitesi kayıtlı ${siteli} firmanın <b>${mailli}'inde</b> geçerli e-posta bulundu (toplam ${mailAdet} adres). Koyu bant e-postası bulunanı, açık bant kategorideki toplam firmayı gösterir.</p>
    <div class="card">${catMailBars}
    </div>
  </section>

  <section id="s-veri">
    <h2>Profil verisi ne kadar dolu?</h2>
    <p class="sub">Yabancı katılımcılar fuar profillerini Türk firmalardan belirgin biçimde daha eksiksiz doldurmuş — telefonda fark %${fill.phone[2] - fill.phone[1]} puan.</p>
    <div class="card">
      <div class="legend"><span><i style="background:var(--s1)"></i>Türkiye (${tr.length})</span><span><i style="background:var(--s2)"></i>Yabancı (${fo.length})</span></div>${cmpRows}
    </div>
  </section>

  <section id="s-bulgular">
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

  <section id="s-rehber">
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
      <p class="count-note" id="cnt" role="status" aria-live="polite"></p>
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
const tbody = document.getElementById('tbody');
const q = document.getElementById('q');
const cnt = document.getElementById('cnt');
const btns = { all: document.getElementById('f-all'), mail: document.getElementById('f-mail'), yeni: document.getElementById('f-yeni'), tr: document.getElementById('f-tr'), fo: document.getElementById('f-fo'), rep: document.getElementById('f-rep') };
const copyBtn = document.getElementById('copy');
let mode = 'all';
let visible = [];
const norm = s => (s || '').toLocaleLowerCase('tr');
// Unvanların yarısı her satırda tekrar eden hukuki ek ("GIDA SAN. VE TİC. LTD. ŞTİ.").
// Asıl adı vurgulayıp eki soluk ve küçük gösteriyoruz — tarama hızını belirgin artırıyor.
const EK = /\\s(G[İI]DA|SAN\\.?|SANAY[İI]|T[İI]C\\.?|T[İI]CARET|LTD\\.?|ŞT[İI]\\.?|A\\.?Ş\\.?|ANON[İI]M|L[İI]M[İI]TED|Ş[İI]RKET[İI]|[İI]TH\\.?|[İI]HR\\.?|[İI]THALAT|[İI]HRACAT|PAZ\\.?|PAZARLAMA|DIŞ|[İI]Ç|NAK\\.?|[İI]NŞ\\.?|TAAH\\.?|TURZ\\.?|SANAY[İI][İI])\\b/i;
function adBicimle(ad, rozet) {
  const m = EK.exec(ad);
  if (m && m.index > 0) {
    const asil = ad.slice(0, m.index).trim();
    // en az iki kelime kalsın, yoksa bölme
    if (asil.split(/\s+/).length >= 2 || asil.length >= 9) {
      return escH(asil) + (rozet || '') + '<span class="unvan-ek">' + escH(ad.slice(m.index)) + '</span>';
    }
  }
  return escH(ad) + (rozet || '');
}
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
      ? '<a href="' + escH(r.w) + '" target="_blank" rel="noopener" aria-label="' + escH(r.n) + ' web sitesi (yeni sekmede açılır)">site</a>'
      : (r.gw ? '<a href="' + escH(r.gw) + '" target="_blank" rel="noopener" aria-label="' + escH(r.n) + ' web sitesi (yeni sekmede açılır)">site</a><span class="new-tag">Maps</span>' : '—');
    const loc = r.d
      ? (r.m ? '<a href="' + escH(r.m) + '" target="_blank" rel="noopener">' + escH(r.d) + '</a>' : escH(r.d)) +
        (r.gr !== '' ? '<span class="rate">★ ' + escH(r.gr) + '</span>' : '')
      : '—';
    const rozetler = (r.r ? ' <span class="rep-badge">temsilci</span>' : '') +
      (r.v === 'kesin' ? ' <span class="v-badge ok" role="img" aria-label="Google Maps kaydı telefon, web veya adresle doğrulandı" title="Google Maps kaydı telefon/web/adres ile doğrulandı">✓</span>' :
       r.v === 'olasi' ? ' <span class="v-badge mid" role="img" aria-label="Google Maps kaydı ad benzerliğiyle eşleşti, teyitsiz" title="Google Maps kaydı ad benzerliğiyle eşleşti">~</span>' : '');
    return '<tr><td>' + adBicimle(r.n, rozetler) +
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
let XL = null;                     // Excel verisi ilk tıklamada indirilir
let xlIndiriliyor = null;
function xlGetir() {
  if (XL) return Promise.resolve(XL);
  if (xlIndiriliyor) return xlIndiriliyor;
  xlIndiriliyor = fetch('veri-export.json')
    .then(y => { if (!y.ok) throw new Error('HTTP ' + y.status); return y.json(); })
    .then(v => { XL = v; return v; })
    .catch(e => { xlIndiriliyor = null; throw e; });
  return xlIndiriliyor;
}

xlsBtn.addEventListener('click', async () => {
  const label = xlsBtn.textContent;
  try {
    if (!XL) { xlsBtn.textContent = 'Veri hazırlanıyor…'; xlsBtn.disabled = true; }
    await xlGetir();
    xlsBtn.disabled = false;
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
    xlsBtn.disabled = false;
    xlsBtn.textContent = (location.protocol === 'file:')
      ? 'Excel için siteyi çevrimiçi açın'
      : 'Veri indirilemedi — tekrar deneyin';
  }
  setTimeout(() => { xlsBtn.textContent = label; }, 2500);
});

// --- Bölüm menüsü: aktif bölümü işaretle, başa dön butonunu göster/gizle ---
// Not: requestAnimationFrame ve IntersectionObserver'a BAĞLI DEĞİL. Bazı gömülü
// tarayıcılarda kare üretilmediğinde ikisi de çalışmaz; bu yüzden konum hesabı
// doğrudan scroll olayında, zaman damgasıyla kısılarak yapılıyor.
(function () {
  const nav = document.getElementById('topnav');
  const kap = nav.querySelector('.topnav-in');
  const fab = document.getElementById('ustBtn');
  const chips = [...nav.querySelectorAll('.chip')];
  const hedefler = chips
    .map(c => ({ chip: c, el: document.querySelector(c.getAttribute('href')) }))
    .filter(x => x.el)
    .sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);

  let sonAktif = null;
  function guncelle() {
    // Başa dön butonu
    const asagida = (window.pageYOffset || document.documentElement.scrollTop || 0) > 700;
    fab.classList.toggle('gorunur', asagida);

    // Menü şeridinin hemen altındaki bölümü aktif say
    const esik = 90;
    let aktif = null;
    for (const h of hedefler) {
      if (h.el.getBoundingClientRect().top <= esik) aktif = h;
    }
    if (!aktif) aktif = hedefler[0];
    if (!aktif || aktif.chip === sonAktif) return;
    sonAktif = aktif.chip;
    chips.forEach(c => c.classList.toggle('aktif', c === aktif.chip));
    // aktif etiketi görünür alana getir
    const hedefSol = aktif.chip.offsetLeft - kap.clientWidth / 2 + aktif.chip.offsetWidth / 2;
    kap.scrollLeft = Math.max(0, hedefSol);
  }

  let son = 0, zamanlayici = null;
  function kisili() {
    const simdi = Date.now();
    if (simdi - son > 120) { son = simdi; guncelle(); }
    else { clearTimeout(zamanlayici); zamanlayici = setTimeout(guncelle, 120); }
  }
  addEventListener('scroll', kisili, { passive: true });
  addEventListener('resize', kisili, { passive: true });

  fab.addEventListener('click', function () {
    const azalt = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const basla = window.pageYOffset || 0;
    try { scrollTo({ top: 0, behavior: azalt ? 'auto' : 'smooth' }); }
    catch (e) { scrollTo(0, 0); }
    // Bazı gömülü tarayıcılarda yumuşak kaydırma hiç ilerlemez; 350ms sonra
    // hâlâ kıpırdamadıysa anında başa al.
    setTimeout(function () {
      const simdi = window.pageYOffset || 0;
      if (simdi > 0 && simdi >= basla - 4) {
        // CSS'teki scroll-behavior:smooth düz scrollTo'yu da yumuşak yapar;
        // ilerlemediği ortamlarda kilitlenmemek için geçici olarak kapat.
        // Not: iki argümanlı scrollTo(0,0) bazı gömülü tarayıcılarda sessizce
        // yok sayılıyor; seçenek biçimi + behavior:'instant' her yerde çalışıyor.
        try { scrollTo({ top: 0, left: 0, behavior: 'instant' }); }
        catch (e) { try { scrollTo({ top: 0, behavior: 'auto' }); } catch (e2) { scrollTo(0, 0); } }
        guncelle();
      }
    }, 350);
    const kutu = document.getElementById('q');
    if (kutu) kutu.blur();
    guncelle();
  });

  guncelle();
})();

// Her tuş vuruşunda 588 satırlık DOM'u yeniden kurmak mobilde takılmaya yol açıyordu.
let aramaZamani = null;
q.addEventListener('input', function () {
  clearTimeout(aramaZamani);
  aramaZamani = setTimeout(render, 140);
});
Object.entries(btns).forEach(([k, b]) => b.addEventListener('click', () => {
  mode = k;
  Object.values(btns).forEach(x => x.setAttribute('aria-pressed', 'false'));
  b.setAttribute('aria-pressed', 'true');
  render();
}));
render();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf8');
console.log('yazıldı: index.html,', Math.round(Buffer.byteLength(html, 'utf8') / 1024), 'KB');

// --- Kimlik sızıntısı denetimi: sayfada kişisel/kurumsal ad geçmemeli ---
// Denetim listesi base64 ile saklanır ki listenin kendisi sızıntı sayılmasın.
const YASAK = new RegExp(
  Buffer.from('dGFzYXJpbW1hbmlhfHRhc2FyxLFtbWFuaWF8aWhzYW58ZXN0ZXRvdWNofGFudGhyb3BpY3xjbGF1ZGU=', 'base64').toString('utf8')
    // JS'in /i bayrağı İ(U+0130) ile i'yi eşleştirmez; metni önce ASCII'ye indiriyoruz
    , 'gi');
const asciiLower = t => t.replace(/[İIı]/g, 'i').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g')
  .replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c').toLowerCase();
// "İhsan Dede Caddesi" (Gebze/Konya OSB sokak adı) katılımcı adreslerinde geçer — kimlik değil.
const sizinti = asciiLower(html).replace(/ihsan\s?dede/g, '(sokak)').match(YASAK);
if (sizinti) { console.error('!! KİMLİK SIZINTISI:', [...new Set(sizinti)].join(', ')); process.exitCode = 1; }
else console.log('✓ kimlik sızıntısı yok');

// --- Kodlama denetimi: bozuk Türkçe karakter kalıbı ---
const BOZUK = new RegExp("\u00C3[\u0080-\u00BF]|\u00C4[\u0080-\u00BF]|\u00C5[\u0080-\u00BF]|\u00E2\u0080|\uFEFF|\uFFFD|[\u0300-\u036F]", "g");
const bozuk = html.match(BOZUK);
if (bozuk) { console.error('!! KODLAMA HATASI:', [...new Set(bozuk)].slice(0, 8).map(x => JSON.stringify(x)).join(' ')); process.exitCode = 1; }
else console.log('✓ kodlama temiz (UTF-8, birleşik nokta yok)');
