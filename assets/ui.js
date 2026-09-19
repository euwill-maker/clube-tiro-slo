// Interface: botão flutuante só depois do hero + revela blocos ao rolar.
// Não mexe em links nem no CONFIG (isso fica no app.js).
(function () {
  var root = document.documentElement;
  var hasIO = 'IntersectionObserver' in window;

  // Botão flutuante do WhatsApp:
  // - escondido enquanto os botões do hero estão na tela (evita 3 botões de WhatsApp na primeira tela);
  // - escondido também sobre os blocos com alvos de toque (atalhos, botões largos das seções, cards de serviço,
  //   perguntas, link do Instagram, botões do mapa), senão o toque cai no flutuante e abre o WhatsApp errado;
  // - no celular (<640px) ele nem aparece (CSS): o cabeçalho fixo já tem o botão WhatsApp.
  var fl = document.querySelector('.wa-float');
  var heroCta = document.querySelector('.hero-actions') || document.getElementById('topo');
  if (fl && heroCta && hasIO) {
    root.classList.add('js-wa');
    var heroPassed = false;
    var covering = [];
    var update = function () { fl.classList.toggle('wa-show', heroPassed && covering.length === 0); };
    new IntersectionObserver(function (entries) {
      var e = entries[entries.length - 1];
      heroPassed = !e.isIntersecting && e.boundingClientRect.top < 0;
      update();
    }, { threshold: 0 }).observe(heroCta);
    var blocks = document.querySelectorAll('.atalhos, .combo-cta, .cta-band, .jsc-actions, .jsc-card, #servicos .svc-grid, #servicos .svc-more, .svc-cta, .assoc-card, #clube .credito, #clube .sec-cta, .faq-list, .faq-cta, .local-actions');
    var bo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var i = covering.indexOf(e.target);
        if (e.isIntersecting && i < 0) covering.push(e.target);
        if (!e.isIntersecting && i >= 0) covering.splice(i, 1);
      });
      update();
    }, { threshold: 0 });
    for (var b = 0; b < blocks.length; b++) bo.observe(blocks[b]);
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !hasIO) return;
  var els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;
  root.classList.add('js-reveal');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
  els.forEach(function (el) { io.observe(el); });
})();
