// ==== CONFIG — tudo que muda no site fica aqui ====
window.CONFIG = {
  whatsapp: '5549999077322',   // TROCAR pelo número do clube quando o Willian passar
  instagram: 'https://www.instagram.com/clubedetiroslo/',
  mapa: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Clube de Tiro São Lourenço, Estrada Bessegatto, São Lourenço do Oeste - SC'),
  metaPixel: '',               // ID do Pixel da Meta (só números) — vazio = desligado
  ga4: '',                     // ID do GA4 (G-XXXXXXX) — vazio = desligado
  preview: true,               // true = mostra selos "a confirmar" (desligar na versão final)
  mensagens: {
    topo: 'Olá! Quero ser CAC.',
    combo: 'Olá! Quero o Combo CAC Completo.',
    associacao: 'Olá! Quero ser sócio do clube.',
    passos: 'Olá! Quero começar meu processo para ser CAC.',
    clube: 'Olá! Quero agendar uma visita ao clube.',
    faq: 'Olá! Tenho uma dúvida sobre o CAC.',
    local: 'Olá! Quero agendar uma visita ao clube.',
    flutuante: 'Olá! Vim pelo site do Clube de Tiro São Lourenço.',
    jaSouCac: 'Olá! Já sou CAC e quero ser sócio do clube.',
    servicos: 'Olá! Preciso de ajuda com a documentação do meu CAC.',
    menu: 'Olá! Vim pelo site do Clube de Tiro São Lourenço.',       // botão do topo da página (cabeçalho)
    atalhos: 'Olá! Vim pelo site e quero falar com o clube.',        // atalho "Falar no WhatsApp" (bloco de caminhos)
    // cards de serviço usam data-wa="servico" + data-wa-msg (mensagem própria de cada card)
  },
};

(function () {
  var C = window.CONFIG;
  window.__events = [];

  // data-wa-msg="..." no botão sobrepõe a mensagem da chave (usado nos cards de serviço)
  function waLink(key, msg) {
    var text = msg || C.mensagens[key] || C.mensagens.flutuante;
    return 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(text);
  }

  // 5549999077322 → (49) 99907-7322 (número exibido na página sai do CONFIG)
  function waDisplay(num) {
    var n = String(num).replace(/\D/g, '').replace(/^55/, '');
    return '(' + n.slice(0, 2) + ') ' + n.slice(2, n.length - 4) + '-' + n.slice(-4);
  }

  function track(label) {
    window.__events.push(label);
    if (window.fbq) window.fbq('track', 'Lead', { content_name: label });
    if (window.gtag) window.gtag('event', 'generate_lead', { event_label: label });
  }

  function loadPixel(id) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id);
    window.fbq('track', 'PageView');
  }

  function loadGA4(id) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
  }

  document.querySelectorAll('[data-wa]').forEach(function (a) {
    a.href = waLink(a.getAttribute('data-wa'), a.getAttribute('data-wa-msg'));
    a.target = '_blank';
    a.rel = 'noopener';
  });
  document.querySelectorAll('[data-instagram]').forEach(function (a) { a.href = C.instagram; a.target = '_blank'; a.rel = 'noopener'; });
  document.querySelectorAll('[data-mapa]').forEach(function (a) { a.href = C.mapa; a.target = '_blank'; a.rel = 'noopener'; });
  document.querySelectorAll('[data-wa-numero]').forEach(function (el) { el.textContent = waDisplay(C.whatsapp); });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-wa]');
    if (a) track('whatsapp:' + a.getAttribute('data-wa') + (a.getAttribute('data-servico') ? ':' + a.getAttribute('data-servico') : ''));
  });

  if (C.preview) document.documentElement.classList.add('is-preview');
  if (C.metaPixel) loadPixel(C.metaPixel);
  if (C.ga4) loadGA4(C.ga4);
})();
