(function () {
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const money = n => '$ ' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const toast = msg => { const t = $('.st-toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200); };

  // ---- menú móvil
  const menu = on => { document.body.classList.toggle('menu-open', on); $$('.st-backdrop').forEach(b => b.hidden = !on); };
  $$('[data-open-menu]').forEach(b => b.addEventListener('click', () => menu(true)));
  $$('[data-close-menu]').forEach(b => b.addEventListener('click', () => menu(false)));
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') { menu(false); document.body.classList.remove('filters-open'); } });

  // ---- favoritos (se guardan en este navegador)
  const KEY = 'an_favs';
  const getFavs = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const setFavs = f => { try { localStorage.setItem(KEY, JSON.stringify(f)); } catch (e) {} };
  function paintFavs() {
    const f = getFavs();
    $$('[data-fav]').forEach(b => b.classList.toggle('is-fav', f.includes(+b.dataset.fav)));
    $$('[data-fav-count]').forEach(c => { c.textContent = f.length; c.hidden = !f.length; });
    const g = $('[data-fav-grid]');
    if (g) {
      let n = 0; $$('.card', g).forEach(c => { const on = f.includes(+c.dataset.id); c.hidden = !on; n += on; });
      $('[data-fav-total]').textContent = n; $('[data-fav-empty]').hidden = n > 0; g.hidden = !n;
    }
  }
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-fav]'); if (!b) return;
    const id = +b.dataset.fav, f = getFavs(), on = !f.includes(id);
    setFavs(on ? f.concat(id) : f.filter(x => x !== id)); paintFavs();
    toast(on ? 'Guardado en favoritos' : 'Quitado de favoritos');
  });
  paintFavs();

  // ---- zoom de la foto principal
  document.addEventListener('mousemove', ev => {
    const m = ev.target.closest && ev.target.closest('.main-img'); if (!m) return;
    const r = m.getBoundingClientRect();
    m.style.setProperty('--zx', ((ev.clientX - r.left) / r.width * 100) + '%');
    m.style.setProperty('--zy', ((ev.clientY - r.top) / r.height * 100) + '%');
  });

  // ---- catálogo: filtros, búsqueda y orden
  const grid = $('[data-grid]');
  if (grid) {
    const cards = $$('.card', grid), editorial = $('[data-editorial]', grid);
    const q = $('[data-q]'), sort = $('[data-sort]'), price = $('[data-price-range]'), maxPrice = price ? +price.max : 0;
    const params = new URLSearchParams(location.search);
    const preset = {cat: params.get('categoria'), col: params.get('coleccion')};
    $$('[data-f]').forEach(b => { if (preset[b.dataset.f] && preset[b.dataset.f] === b.value) b.checked = true; });
    if (params.get('q')) q.value = params.get('q');
    if (params.get('buscar')) setTimeout(() => q.focus(), 50);
    const title = preset.col || preset.cat;
    if (title) {
      $('[data-cat-title]').textContent = title;
      $('[data-cat-eyebrow]').textContent = preset.col ? 'Colección' : 'Joyería de autor';
      if (preset.col && (window.AN_COLLECTIONS || {})[preset.col]) $('[data-cat-sub]').textContent = AN_COLLECTIONS[preset.col];
      document.title = title + ' · Arte Natural';
    }
    function apply() {
      const sel = {}; $$('[data-f]:checked').forEach(b => (sel[b.dataset.f] = sel[b.dataset.f] || []).push(b.value));
      const text = (q.value || '').trim().toLowerCase(), hi = price ? +price.value : 0;
      const shown = cards.filter(c => {
        for (const k in sel) {
          const vals = k === 'mats' ? c.dataset.mats.split('|') : [c.dataset[k]];
          if (!sel[k].some(v => vals.includes(v))) return false;
        }
        if (price && hi < maxPrice) { const ps = c.dataset.prices ? c.dataset.prices.split('|').map(Number) : []; if (ps.length && !ps.some(v => v <= hi)) return false; }
        return !text || c.dataset.text.includes(text);
      });
      const by = {
        'Novedades': (a, b) => a.dataset.out - b.dataset.out || b.dataset.id - a.dataset.id,
        'Menor precio': (a, b) => a.dataset.out - b.dataset.out || (!+a.dataset.price) - (!+b.dataset.price) || a.dataset.price - b.dataset.price,
        'Mayor precio': (a, b) => a.dataset.out - b.dataset.out || (!+a.dataset.price) - (!+b.dataset.price) || b.dataset.price - a.dataset.price,
      }[sort.value];
      const order = by ? shown.slice().sort(by) : shown;
      cards.forEach(c => c.hidden = !shown.includes(c));
      order.forEach(c => grid.appendChild(c));
      const pristine = !Object.keys(sel).length && !text && sort.value === sort.options[0].value && !(price && hi < maxPrice);
      if (editorial) { editorial.hidden = !(pristine && order.length > 8); if (!editorial.hidden) grid.insertBefore(editorial, order[6] || null); }
      $('[data-empty]').hidden = shown.length > 0; grid.hidden = !shown.length;
      // chips
      let chips = `<span class="small"><b>${shown.length}</b>&nbsp;${shown.length === 1 ? 'pieza' : 'piezas'}</span>`;
      $$('[data-f]:checked').forEach((b, i) => chips += `<span class="chip"><span>${esc(b.value)}</span><button type="button" data-unchip="${i}" aria-label="Quitar filtro">✕</button></span>`);
      if (text) chips += `<span class="chip"><span>“${esc(q.value.trim())}”</span><button type="button" data-unq aria-label="Quitar búsqueda">✕</button></span>`;
      if (price && hi < maxPrice) chips += `<span class="chip"><span>Hasta ${money(hi)}</span><button type="button" data-unprice aria-label="Quitar precio">✕</button></span>`;
      if (!pristine && (Object.keys(sel).length || text || (price && hi < maxPrice))) chips += '<button class="text-btn" type="button" data-clear>Limpiar todo</button>';
      $('[data-chips]').innerHTML = chips;
      if (price) $('[data-price-label]').textContent = money(hi);
    }
    const clear = () => { $$('[data-f]').forEach(b => b.checked = false); q.value = ''; if (price) price.value = maxPrice; apply(); };
    document.addEventListener('click', ev => {
      const t = ev.target;
      if (t.closest('[data-clear]')) clear();
      else if (t.closest('[data-unchip]')) { $$('[data-f]:checked')[+t.closest('[data-unchip]').dataset.unchip].checked = false; apply(); }
      else if (t.closest('[data-unq]')) { q.value = ''; apply(); }
      else if (t.closest('[data-unprice]')) { price.value = maxPrice; apply(); }
      else if (t.closest('[data-open-filters]')) document.body.classList.add('filters-open');
      else if (t.closest('[data-close-filters]')) document.body.classList.remove('filters-open');
    });
    $$('[data-f]').forEach(b => b.addEventListener('change', apply));
    q.addEventListener('input', apply); sort.addEventListener('change', apply); if (price) price.addEventListener('input', apply);
    apply();
  }

  // ---- ficha de producto: material, talla, galería y enlace de WhatsApp
  const P = window.AN_PRODUCT;
  if (P) {
    const st = {mat: P.materials[0][0], size: ''};
    const priceOf = m => (P.materials.find(x => x[0] === m) || [0, P.min])[1];
    function waLink() {
      const bits = [P.name];
      if (st.mat && P.materials.length > 1) bits.push(st.mat);
      if (st.size) bits.push(st.size === '?' ? 'talla por confirmar' : 'talla ' + st.size);
      const price = priceOf(st.mat);
      let msg = `Hola, Arte Natural. Me interesa esta pieza: ${bits.join(' · ')} (Ref. ${P.ref})`;
      msg += price ? ` – ${money(price)}.` : '. ¿Me pueden dar el precio?';
      msg += P.agotado ? ' ¿Me confirman si vuelve a estar disponible?' : ' ¿Está disponible?';
      if (P.url) msg += ' ' + P.url;
      return `https://wa.me/${AN.wa}?text=${encodeURIComponent(msg)}`;
    }
    function paint() {
      const price = priceOf(st.mat);
      const box = $('[data-price-box]');
      if (P.agotado) box.innerHTML = '<div class="price-big out">Agotado</div>' + (price ? `<div class="cuotas">Último precio: ${money(price)}</div>` : '');
      else if (!price) box.innerHTML = '<div class="price-big">Precio a consultar</div><div class="cuotas">Escríbenos y te lo confirmamos al instante por WhatsApp.</div>';
      else box.innerHTML = `<div class="price-big">${money(price)}</div>`;
      $$('[data-mat]').forEach(b => b.classList.toggle('on', b.dataset.mat === st.mat));
      $$('[data-size]').forEach(b => b.classList.toggle('on', b.dataset.size === st.size));
      const ml = $('[data-mat-label]'); if (ml) ml.textContent = st.mat;
      const sl = $('[data-size-label]');
      if (sl) sl.textContent = !st.size ? 'Elige una opción' : st.size === '?' ? 'Por confirmar con asesoría' : st.size + (P.soldOut.includes(st.size) ? ' · bajo pedido' : '');
      const note = $('[data-size-note]'); if (note) note.hidden = st.size !== '?';
      const av = $('[data-avail]');
      if (av) { const a = (st.size && st.size !== '?' && P.avail.sizes[st.size]) || P.avail.default; av.className = 'avail ' + a[0]; $('[data-avail-text]').textContent = a[1]; }
      const sm = $('[data-spec-mat]'); if (sm) sm.textContent = st.mat;
      const pur = P.purity[st.mat] || ''; const pr = $('[data-purity-row]'); if (pr) { pr.hidden = !pur; $('[data-purity]').textContent = pur; }
      const label = P.agotado ? 'Agotado' : (price ? money(price) : 'Precio a consultar');
      const bb = $('[data-bb]'); if (bb) bb.innerHTML = `<b class="price">${label}</b><small>${esc(st.mat)}${P.sizes.length && st.size ? ' · Talla ' + esc(st.size === '?' ? 'por confirmar' : st.size) : ''}</small>`;
      $$('[data-wa]').forEach(a => a.href = waLink());
    }
    document.addEventListener('click', ev => {
      const t = ev.target;
      const m = t.closest('[data-mat]'); if (m) { st.mat = m.dataset.mat; paint(); }
      const s = t.closest('[data-size]'); if (s) { st.size = s.dataset.size; paint(); }
      const th = t.closest('[data-thumb]');
      if (th) { const img = $('[data-main] img'); if (img) img.src = th.dataset.thumb; $$('[data-thumb]').forEach(x => x.classList.toggle('on', x === th)); }
      if (t.closest('[data-open-guide]')) $('[data-guide]').showModal();
      if (t.closest('[data-close-guide]')) $('[data-guide]').close();
      if (t.closest('[data-guide-unsure]')) { st.size = '?'; paint(); $('[data-guide]').close(); }
    });
    paint();
  }
})();
