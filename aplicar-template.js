// Módulo usado pelo server.js: recebe o texto do template.html e devolve o HTML
// com abas, painéis (CPU, RAM, disco, rede, histórico), sons, música e atualização
// sem recarregar. O template.html do repositório NÃO precisa ser alterado.
const CSS = `
/* ---------- extras (abas, painéis, gráfico) ---------- */
.ctl{display:flex;flex-wrap:nowrap;justify-content:flex-start;gap:0 16px;overflow-x:auto;margin:0 0 24px;padding:4px 16px 0;background:var(--madeira);border:5px solid var(--madeira-escura);box-shadow:0 5px 0 #3a1e04,inset 0 0 0 2px var(--madeira-clara);scrollbar-width:thin;scrollbar-color:var(--ouro) var(--madeira-escura)}
.ctl button:first-child{margin-left:auto}.ctl button:last-child{margin-right:auto}
.ctl button{all:unset;display:inline-block;flex:none;white-space:nowrap;box-sizing:border-box;position:relative;cursor:pointer;font-family:var(--pixel);font-size:.5rem;line-height:1.6;color:#fff;text-shadow:2px 2px 0 var(--madeira-escura),-1px -1px 0 var(--madeira-escura);padding:10px 2px 20px;transition:color .15s}
.ctl button:hover{color:var(--pergaminho)}
.ctl button.on{color:var(--ouro)}
.ctl button.on::after{content:"";position:absolute;left:50%;bottom:3px;width:8px;height:8px;margin-left:-4px;background:var(--ouro);box-shadow:0 0 0 2px var(--madeira-escura)}
.ctl button:focus-visible{outline:3px solid var(--ouro);outline-offset:2px}
.somfix{position:fixed;top:10px;left:10px;z-index:50;display:flex;gap:8px}
.somfix button{font-family:var(--pixel);font-size:.5rem;color:var(--ouro);background:var(--madeira);padding:8px 10px;border:3px solid var(--madeira-escura);box-shadow:0 3px 0 #3a1e04,inset 0 0 0 2px var(--madeira-clara);text-shadow:2px 2px 0 var(--madeira-escura);cursor:pointer}
.somfix button.on{background:var(--pergaminho);color:var(--tinta);text-shadow:none;box-shadow:0 3px 0 #3a1e04,inset 0 0 0 3px var(--ouro)}
.somfix button:active{transform:translateY(2px)}
.somfix button:focus-visible{outline:3px solid var(--ouro);outline-offset:2px}
@media(max-width:700px){body{padding-top:58px}}
.kvs{list-style:none;margin:0;padding:0}
.kvs li{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:3px dotted var(--pergaminho-lin)}
.kvs li:last-child{border-bottom:0}
.kvs b{font-weight:400;text-align:right;overflow-wrap:anywhere}
.arq{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}
.arq span{background:#fff3c4;border:3px solid var(--madeira-escura);padding:2px 10px}
.graf{display:block;width:100%;height:120px;background:#3b2412;border:4px solid var(--madeira-escura);box-shadow:inset 0 3px 0 #1f1208;margin-bottom:6px}
.graf .ok{fill:var(--ok)}.graf .aviso{fill:var(--aviso)}.graf .alerta{fill:var(--alerta)}
.graf line{stroke:rgba(255,243,196,.4);stroke-width:1;stroke-dasharray:4 4;vector-effect:non-scaling-stroke}
.extra small{color:var(--tinta-suave)}
`;

const PAINEIS = `<!-- data-stardew-extras -->
<div class="card extra" data-pane="cpu"><h2>⚡ Processador</h2>{{PAINEL_CPU}}</div>
<div class="card extra" data-pane="ram"><h2>🎒 Memória RAM</h2>{{PAINEL_RAM}}</div>
<div class="card extra" data-pane="disco"><h2>🏚️ Discos e Espaço Livre</h2>{{PAINEL_DISCO}}</div>
<div class="card extra" data-pane="rede"><h2>🛣️ Rede e Sistema</h2>{{PAINEL_REDE}}</div>
<div class="card extra" data-pane="historico"><h2>📈 Histórico da Fazenda</h2>{{PAINEL_HIST}}
<span id="estado-fazenda" data-nivel="{{ESTADO}}" hidden></span></div>
`;

const JS = `<script>
(function () {
  var ABAS = [['tudo','📋 Tudo'],['fazenda','🌾 Fazenda'],['missoes','📜 Missões'],['moradores','🏘️ Moradores'],['diario','📖 Diário'],['cpu','⚡ CPU'],['ram','🎒 RAM'],['disco','🏚️ Disco'],['rede','🛣️ Rede'],['historico','📈 Histórico']];
  var aba = location.hash.slice(1) || 'fazenda';
  var som = true, ctx = null, liberado = false, tocando = false, timer = null, passo = 0, prox = 0;
  try { som = localStorage.getItem('som') !== 'off'; } catch (e) {}
  ['pointerdown', 'keydown'].forEach(function (ev) { addEventListener(ev, function () { liberado = true; }, { once: true }); });

  function ac() { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  function nota(f, t, d, tipo, v) {
    var a = ac(), o = a.createOscillator(), g = a.createGain();
    o.type = tipo; o.frequency.value = f;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function tom(f, d, tipo, v, atraso) {
    if (!som || !liberado) return;
    try { nota(f, ac().currentTime + (atraso || 0), d, tipo || 'square', v || 0.05); } catch (e) {}
  }
  var sfx = {
    aba: function () { tom(660, 0.07); tom(990, 0.09, 'square', 0.05, 0.07); },
    ok: function () { tom(523, 0.08); tom(784, 0.14, 'square', 0.05, 0.09); },
    aviso: function () { tom(440, 0.15, 'triangle', 0.08); tom(440, 0.15, 'triangle', 0.08, 0.2); },
    alerta: function () { tom(220, 0.2, 'square', 0.06); tom(165, 0.3, 'square', 0.06, 0.24); }
  };

  var N = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
  var MEL = [0,2,4,2,3,1,2,0, 4,5,4,3,2,3,1,0];
  function tocar() {
    var a = ac(); prox = a.currentTime + 0.1; clearInterval(timer);
    timer = setInterval(function () {
      while (prox < a.currentTime + 0.3) {
        var n = MEL[passo % MEL.length];
        nota(N[n], prox, 0.26, 'square', 0.022);
        if (passo % 4 === 0) nota(N[n] / 2, prox, 0.55, 'triangle', 0.05);
        prox += 0.28; passo++;
      }
    }, 100);
  }
  function pintar() {
    var s = document.getElementById('bSom'), m = document.getElementById('bMus');
    if (s) s.textContent = som ? '🔊 Som: ligado' : '🔇 Som: desligado';
    if (m) { m.textContent = tocando ? '⏸ Música' : '🎵 Música'; m.classList.toggle('on', tocando); }
  }

  var ctl = document.createElement('div');
  ctl.className = 'ctl';
  ctl.innerHTML = ABAS.map(function (a) { return '<button type="button" data-aba="' + a[0] + '">' + a[1] + '</button>'; }).join('');
  var somEl = document.createElement('div');
  somEl.className = 'somfix';
  somEl.innerHTML = '<button type="button" id="bSom"></button><button type="button" id="bMus"></button>';
  document.body.appendChild(somEl);
  var ancora = document.querySelector('.placa') || document.querySelector('.wrap > h1');
  if (ancora) ancora.after(ctl); else document.body.prepend(ctl);

  function mostrar(nome) {
    if (!ABAS.some(function (a) { return a[0] === nome; })) nome = 'fazenda';
    aba = nome;
    document.querySelectorAll('.wrap > .card[data-pane]').forEach(function (c) {
      c.style.display = (nome === 'tudo' || c.dataset.pane === nome) ? '' : 'none';
    });
    ctl.querySelectorAll('[data-aba]').forEach(function (b) { b.classList.toggle('on', b.dataset.aba === nome); });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.ctl button, .somfix button'); if (!b) return;
    liberado = true;
    if (b.dataset.aba) { history.replaceState(null, '', '#' + b.dataset.aba); mostrar(b.dataset.aba); sfx.aba(); }
    if (b.id === 'bSom') {
      som = !som; try { localStorage.setItem('som', som ? 'on' : 'off'); } catch (x) {}
      if (!som && tocando) { tocando = false; clearInterval(timer); } else if (som) sfx.ok();
      pintar();
    }
    if (b.id === 'bMus') {
      tocando = !tocando;
      if (tocando) { som = true; try { localStorage.setItem('som', 'on'); } catch (x) {} tocar(); } else clearInterval(timer);
      pintar();
    }
  });

  var rank = { ok: 0, aviso: 1, alerta: 2 };
  function nivel(raiz) { var e = raiz.querySelector('#estado-fazenda'); return e ? e.dataset.nivel : null; }
  var ultimo = nivel(document);
  var SEL = ['.placa', '.wrap > .card:not(.extra)', '.extra', '.rodape'];

  async function atualizar(forcar) {
    if (!forcar) {
      var a = document.activeElement;
      if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return;
      var campo = document.querySelector('input[name=texto]');
      if (campo && campo.value) return;
    }
    try {
      var r = await fetch('/', { headers: { 'x-live': '1' }, cache: 'no-store' });
      var doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      SEL.forEach(function (s) {
        var novos = doc.querySelectorAll(s), atuais = document.querySelectorAll(s);
        atuais.forEach(function (el, i) { if (novos[i]) el.replaceWith(novos[i]); });
      });
      mostrar(aba);
      var n = nivel(doc);
      if (n && ultimo && n !== ultimo) { (rank[n] > rank[ultimo] ? sfx[n] : sfx.ok)(); }
      ultimo = n || ultimo;
    } catch (e) { /* tenta de novo no próximo ciclo */ }
  }
  setInterval(function () { atualizar(false); }, 10000);

  // adicionar, marcar e apagar tarefas sem recarregar a página (mantém a aba e a música)
  document.addEventListener('submit', async function (e) {
    var f = e.target;
    var acao = (f.getAttribute && f.getAttribute('action')) || '';
    if (acao.indexOf('/tarefas') !== 0) return;
    e.preventDefault();
    try {
      await fetch(acao, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-live': '1' },
        body: new URLSearchParams(new FormData(f)).toString()
      });
    } catch (x) { /* a próxima atualização corrige */ }
    await atualizar(true);
    if (f.classList.contains('nova')) {
      var novo = document.querySelector('.nova input[name=texto]');
      if (novo) novo.focus();
    }
  });

  pintar(); mostrar(aba);
})();
</script>
`;

function trocar(texto, alvo, novo, nome) {
  if (!texto.includes(alvo)) { console.warn('AVISO: não encontrei ' + nome + ' no template.html'); return texto; }
  return texto.replace(alvo, () => novo);
}

function aplicar(h) {
  if (h.includes('data-stardew-extras')) return h; // já aplicado
  // remove o script antigo que recarregava a página inteira
  h = h.replace(/<script>(?:(?!<\/script>)[\s\S])*location\.reload(?:(?!<\/script>)[\s\S])*<\/script>/i, '');
  const marca = (re, aba) => { h = h.replace(re, (m) => m.replace('<div class="card', '<div data-pane="' + aba + '" class="card')); };
  marca(/<div class="card"><h2>[^<]*Recursos da Fazenda/, 'fazenda');
  marca(/<div class="card msg"/, 'fazenda');
  marca(/<div class="card"><h2>[^<]*Quadro de Miss/, 'missoes');
  marca(/<div class="card"><h2>[^<]*Moradores de Pelican/, 'moradores');
  marca(/<div class="card"><h2>[^<]*Di[aá]rio da Fazenda/, 'diario');
  h = trocar(h, '</style>', CSS + '</style>', '</style>');
  h = trocar(h, '<div class="rodape">', PAINEIS + '<div class="rodape">', '<div class="rodape">');
  h = trocar(h, '</body>', JS + '</body>', '</body>');
  return h;
}

module.exports = aplicar;
