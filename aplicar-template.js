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
.fundo{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.fundo svg{position:absolute;display:block;height:auto}
.f-nuvens{top:3vh;left:0;width:max(200%,1800px);animation:fnv 200s linear infinite}
.f-montes,.f-colinas,.f-arvores,.f-chao{left:50%;transform:translateX(-50%);width:max(100%,900px)}
.f-montes{bottom:calc(58% + 36px)}
.f-colinas,.f-arvores{bottom:58%}
.f-chao{bottom:0}
@keyframes fnv{to{transform:translateX(-50%)}}
@media(prefers-reduced-motion:reduce){.f-nuvens{animation:none}}
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

const FUNDO = `<div class="fundo" aria-hidden="true">
<svg class="f-nuvens" viewBox="0 0 960 60" shape-rendering="crispEdges"><defs><g id="fnu"><g fill="#fff"><rect x="20" y="22" width="44" height="8"/><rect x="30" y="16" width="24" height="6"/><rect x="150" y="8" width="56" height="10"/><rect x="162" y="2" width="30" height="6"/><rect x="290" y="30" width="40" height="8"/><rect x="298" y="24" width="22" height="6"/><rect x="380" y="12" width="48" height="8"/><rect x="390" y="6" width="26" height="6"/></g><g fill="#dbeefa"><rect x="20" y="28" width="44" height="2"/><rect x="150" y="16" width="56" height="2"/><rect x="290" y="36" width="40" height="2"/><rect x="380" y="18" width="48" height="2"/></g></g></defs><use href="#fnu"/><use href="#fnu" x="480"/></svg>
<svg class="f-montes" viewBox="0 0 480 40" shape-rendering="crispEdges"><path fill="#6a9cc2" d="M0 40V26H30V20H56V12H80V18H104V24H140V16H172V8H196V14H224V22H256V18H292V10H318V16H350V24H384V14H412V20H440V26H480V40Z"/><g fill="#eaf5ff"><rect x="56" y="12" width="24" height="3"/><rect x="172" y="8" width="24" height="3"/><rect x="292" y="10" width="26" height="3"/></g><path fill="#4f86ab" d="M0 40V32H24V28H60V22H92V26H128V30H160V24H196V20H228V26H264V30H300V24H336V18H368V24H404V30H440V26H480V40Z"/></svg>
<svg class="f-colinas" viewBox="0 0 480 30" shape-rendering="crispEdges"><path fill="#3f9a45" d="M0 30V16H40V12H90V8H150V12H210V10H260V6H330V10H390V14H440V10H480V30Z"/><g fill="#6fcf6f"><rect x="90" y="8" width="60" height="2"/><rect x="260" y="6" width="70" height="2"/><rect x="40" y="12" width="50" height="2"/></g><path fill="#34853c" d="M0 30V22H60V18H120V22H190V16H250V20H320V24H380V18H450V22H480V30Z"/></svg>
<svg class="f-arvores" viewBox="0 0 480 30" shape-rendering="crispEdges"><defs><g id="fat"><rect x="6" y="18" width="4" height="8" fill="#6b4a2a"/><rect x="2" y="8" width="12" height="10" fill="#2e7d3a"/><rect x="4" y="2" width="8" height="6" fill="#2e7d3a"/><rect x="5" y="4" width="3" height="3" fill="#3fae49"/><rect x="4" y="10" width="3" height="3" fill="#3fae49"/></g><g id="fbu"><rect x="0" y="4" width="14" height="6" fill="#2e7d3a"/><rect x="2" y="1" width="10" height="3" fill="#2e7d3a"/><rect x="3" y="2" width="3" height="2" fill="#3fae49"/></g></defs><use href="#fat" x="6" y="4"/><use href="#fbu" x="30" y="20"/><use href="#fat" x="52" y="4"/><use href="#fat" x="72" y="6"/><use href="#fbu" x="104" y="20"/><use href="#fat" x="130" y="4"/><use href="#fat" x="176" y="5"/><use href="#fbu" x="206" y="20"/><use href="#fat" x="236" y="4"/><use href="#fat" x="258" y="6"/><use href="#fbu" x="290" y="20"/><use href="#fat" x="318" y="4"/><use href="#fat" x="346" y="5"/><use href="#fbu" x="378" y="20"/><use href="#fat" x="402" y="4"/><use href="#fat" x="440" y="6"/><use href="#fat" x="464" y="4"/></svg>
<svg class="f-chao" viewBox="0 0 480 30" shape-rendering="crispEdges"><defs><g id="fto" fill="#4fbf4f"><rect x="0" y="4" width="2" height="4"/><rect x="3" y="1" width="2" height="7"/><rect x="6" y="3" width="2" height="5"/></g></defs><rect y="22" width="480" height="8" fill="#2e7d3a"/><rect y="22" width="480" height="2" fill="#3fae49"/><use href="#fto" x="20" y="15"/><use href="#fto" x="96" y="15"/><use href="#fto" x="170" y="15"/><use href="#fto" x="252" y="15"/><use href="#fto" x="336" y="15"/><use href="#fto" x="410" y="15"/><g><rect x="60" y="14" width="2" height="8" fill="#2e7d3a"/><rect x="58" y="11" width="6" height="4" fill="#ff7ab0"/><rect x="60" y="12" width="2" height="2" fill="#ffd23f"/><rect x="130" y="15" width="2" height="7" fill="#2e7d3a"/><rect x="128" y="12" width="6" height="4" fill="#ffd23f"/><rect x="214" y="14" width="2" height="8" fill="#2e7d3a"/><rect x="212" y="11" width="6" height="4" fill="#fff"/><rect x="214" y="12" width="2" height="2" fill="#ffd23f"/><rect x="300" y="15" width="2" height="7" fill="#2e7d3a"/><rect x="298" y="12" width="6" height="4" fill="#ff7ab0"/><rect x="372" y="14" width="2" height="8" fill="#2e7d3a"/><rect x="370" y="11" width="6" height="4" fill="#d9381e"/><rect x="446" y="15" width="2" height="7" fill="#2e7d3a"/><rect x="444" y="12" width="6" height="4" fill="#ffd23f"/></g></svg>
</div>
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
  h = trocar(h, '<body>', '<body>' + FUNDO, '<body>');
  h = trocar(h, '<div class="rodape">', PAINEIS + '<div class="rodape">', '<div class="rodape">');
  h = trocar(h, '</body>', JS + '</body>', '</body>');
  return h;
}

module.exports = aplicar;
