// ==== CONFIG — tudo que muda no site fica aqui ====
window.CONFIG = {
  whatsapp: '5549999037322',   // TROCAR pelo número do clube quando o Willian passar
  instagram: 'https://www.instagram.com/clubedetiroslo/',
  mapa: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Clube de Tiro São Lourenço, Estrada Bessegatto, São Lourenço do Oeste - SC'),
  metaPixel: '',               // ID do Pixel da Meta (só números) — vazio = desligado
  ga4: '',                     // ID do GA4 (G-XXXXXXX) — vazio = desligado
  preview: true,               // true = mostra selos "a confirmar" (desligar na versão final)

  // ==== HORÁRIOS DA VISITA — desligado até o clube passar os dias e horários ====
  // Quando o clube passar os horários, preencha "dias" e ponha ativa: true — o questionário passa a
  // oferecer horário ("sábado, 09:00") e o site mostra o horário de funcionamento na seção "Onde estamos".
  // Enquanto estiver desligado, nada muda: o questionário pergunta dia e período, como está hoje.
  agenda: {
    ativa: false,              // true = liga o horário no questionário e na seção "Onde estamos"
    antecedenciaHoras: null,   // ex.: 24 → a tela do horário avisa "O clube pede avisar com 24 h de antecedência"
    observacao: '',            // ex.: 'a confirmar' → a mensagem sai "Visita: sábado, 09:00 (a confirmar)"
    dias: [
      // Uma linha por dia que o clube abre, na ordem em que deve aparecer. Exemplo (apague os "//" e troque
      // pelos dias e horários de verdade; "curto" é o apelido do dia nas listas, opcional):
      // { nome: 'Sábado',  curto: 'Sáb', horarios: ['09:00', '10:30', '14:00'] },
      // { nome: 'Domingo', curto: 'Dom', horarios: ['09:00', '15:00'] },
      // Cada horário entre aspas e a lista entre colchetes. Linha sem nome ou sem horário é ignorada.
    ],
  },

  // mensagens = reserva: só saem se o questionário (quiz.js) não abrir. Normalmente a mensagem é montada pelo questionário.
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

  // 5549999037322 → (49) 99903-7322 (número exibido na página sai do CONFIG)
  function waDisplay(num) {
    var n = String(num).replace(/\D/g, '').replace(/^55/, '');
    return '(' + n.slice(0, 2) + ') ' + n.slice(2, n.length - 4) + '-' + n.slice(-4);
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

  // Toque em qualquer botão de WhatsApp abre o questionário de qualificação (quiz.js) em vez de ir direto.
  // O href wa.me continua no botão como reserva: se o questionário não abrir (sem JS / navegador antigo), o link segue normal.
  // O Lead (Pixel/GA4) só conta no envio do questionário, não aqui.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-wa]');
    if (!a) return;
    if (window.Quiz && window.Quiz.open(a)) { e.preventDefault(); return; }
    window.__events.push('whatsapp:' + a.getAttribute('data-wa') + (a.getAttribute('data-servico') ? ':' + a.getAttribute('data-servico') : ''));
  });

  // ---------- agenda: UM filtro só para o site inteiro ----------
  // O questionário (quiz.js) chama esta mesma função, então "Onde estamos" e o questionário ligam e desligam
  // JUNTOS: o site nunca anuncia um horário que o questionário não sabe oferecer, nem o contrário.
  // O Willian escreve só nome/curto/horarios — quem numera os dias é aqui (id = posição na lista), para não
  // existir um campo técnico que ele possa repetir ou esquecer. Linha sem nome ou sem horário é ignorada.
  // "horarios" aceita a lista (['09:00','14:00']) e também um horário solto ('09:00', se esquecer os colchetes).
  function agHorarios(d) {
    var v = d ? d.horarios : null;
    var lista = typeof v === 'string' ? [v] : (Array.isArray(v) ? v : []);
    var out = [];
    lista.forEach(function (h) { if (typeof h === 'string' && h.trim()) out.push(h.trim()); });
    return out;
  }
  C.agendaDias = function () {
    try {
      var a = C.agenda || {};
      if (!a.ativa || !Array.isArray(a.dias)) return [];
      var out = [];
      a.dias.forEach(function (d) {
        if (!d || typeof d.nome !== 'string' || !d.nome.trim()) return;
        var hs = agHorarios(d);
        if (!hs.length) return;
        out.push({
          id: 'd' + out.length,
          nome: d.nome.trim(),
          curto: typeof d.curto === 'string' ? d.curto.trim() : '',
          horarios: hs,
        });
      });
      return out;
    } catch (err) { return []; }
  };

  if (C.preview) document.documentElement.classList.add('is-preview');
  if (C.metaPixel) loadPixel(C.metaPixel);
  if (C.ga4) loadGA4(C.ga4);

  // Horário de funcionamento na seção "Onde estamos": só aparece quando a agenda está ligada e tem dia com
  // horário. Desligada, o item continua "Combine sua visita pelo WhatsApp." com o selo "horário a confirmar".
  // Fica por último e dentro do try: erro de digitação no CONFIG não pode derrubar o resto do site (preview,
  // Pixel, GA4) — se algo der errado aqui, o site simplesmente continua no estado desligado.
  try {
    var dias = C.agendaDias();
    if (dias.length) {
      var el = document.querySelector('[data-agenda-horario]');
      if (el) {
        el.textContent = '';
        dias.forEach(function (d, i) {
          if (i) el.appendChild(document.createElement('br'));
          el.appendChild(document.createTextNode(d.nome + ': ' + d.horarios.join(', ')));
        });
      }
      document.querySelectorAll('[data-agenda-pendente]').forEach(function (p) { p.remove(); });
    }
  } catch (err) { /* CONFIG.agenda com erro de digitação: fica tudo como está hoje */ }
})();
