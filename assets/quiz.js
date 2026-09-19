// Questionário de qualificação antes do WhatsApp (Willian, 19/09/2026):
// todo botão de WhatsApp (a[data-wa]) abre este questionário — o app.js intercepta o clique e chama Quiz.open().
// Toques rápidos; só no fim a pessoa digita nome e cidade. Menor de 18 para numa tela educada, sem WhatsApp.
// O "Enviar no WhatsApp" é um <a> de verdade com o wa.me pronto (no navegador do Instagram, window.open costuma falhar).
// Número e Instagram vêm do CONFIG (app.js).
(function () {
  var C = window.CONFIG || {};
  var root = document.documentElement;

  // ---------- perguntas (textos curtos) ----------
  var Q = {
    perfil: { t: 'Você já é CAC?', sub: 'Responda rapidinho e fale com o clube.', o: [
      ['iniciante', 'Ainda não, quero começar', 'i-target'],
      ['cac', 'Já sou CAC', 'i-id'],
      ['conhecer', 'Só quero conhecer o clube', 'i-pin']] },
    idade: { t: 'Qual sua idade?', o: [['menos18', 'Menos de 18'], ['18-24', '18 a 24'], ['25+', '25 ou mais']] },
    quando: { t: 'Quando você quer começar?', o: [['agora', 'Agora'], ['meses', 'Nos próximos meses'], ['pesquisando', 'Só pesquisando']] },
    necessidade: { t: 'Do que você precisa?', o: [
      ['socio', 'Ser sócio do clube', 'i-users'],
      ['renovar-cr', 'Renovar CR', 'i-renew'],
      ['renovar-craf', 'Renovar registro de arma', 'i-doc'],
      ['outro', 'Outro serviço', 'i-clip']] },
    vencimento: { t: 'Seu CR vence em…', o: [['vencido', 'Já venceu'], ['ate3', 'Até 3 meses'], ['mais3', 'Mais de 3 meses'], ['naosei', 'Não sei']] },
  };

  // ---------- como cada resposta vai escrita na mensagem (curta, para o atendente) ----------
  var MSG = {
    idade: { '18-24': '18 a 24 anos (treina com arma do clube)', '25+': '25 ou mais' },
    quando: { agora: 'agora', meses: 'nos próximos meses', pesquisando: 'só estou pesquisando' },
    necessidade: { socio: 'Ser sócio do clube', 'renovar-cr': 'Renovação do CR', 'renovar-craf': 'Renovação do registro da arma', outro: 'Outro serviço' },
    vencimento: { vencido: 'Meu CR já venceu.', ate3: 'Meu CR vence: até 3 meses.', mais3: 'Meu CR vence: em mais de 3 meses.', naosei: 'Meu CR vence: não sei.' },
  };
  // resumo em etiquetas na tela final
  var CHIP = {
    perfil: { iniciante: 'Quero ser CAC', cac: 'Já sou CAC', conhecer: 'Conhecer o clube' },
    idade: { '18-24': '18 a 24 anos', '25+': '25 ou mais' },
    quando: { agora: 'Começar agora', meses: 'Próximos meses', pesquisando: 'Só pesquisando' },
    vencimento: { vencido: 'CR vencido', ate3: 'Vence em até 3 meses', mais3: 'Vence em mais de 3 meses', naosei: 'Vencimento: não sei' },
  };
  var SVC_OPT = { 'renovacao-cr': 'renovar-cr', 'renovacao-craf': 'renovar-craf' };
  var CIDADES = ['São Lourenço do Oeste', 'Novo Horizonte', 'Jupiá', 'Galvão', 'Campo Erê', 'São Bernardino', 'Coronel Martins',
    'Formosa do Sul', 'Quilombo', 'Santiago do Sul', 'Vitorino/PR', 'Renascença/PR', 'Pato Branco/PR'];

  var ICO = function (id, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var clean = function (v) { return String(v || '').replace(/\s+/g, ' ').trim().slice(0, 40); };
  var letters = function (v) { return (v.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length; };

  function log(label) { (window.__events = window.__events || []).push(label); }
  function fb() { if (window.fbq) window.fbq.apply(window, arguments); }
  function ga(name, params) { if (window.gtag) window.gtag('event', name, params); }

  // ---------- estado ----------
  var st = null;               // { s: respostas, step, origem, sent }
  var memo = { nome: '', cidade: '' }; // nome/cidade ficam na memória se a pessoa fechar e abrir de novo
  var opener = null;

  // caminho de perguntas por perfil (define o Voltar e a barra de progresso)
  function path(s) {
    if (s.perfil === 'iniciante') return ['perfil', 'idade', 'quando', 'final'];
    if (s.perfil === 'cac') return ['perfil', 'necessidade', 'vencimento', 'final'];
    if (s.perfil === 'conhecer') return ['perfil', 'final'];
    return ['perfil', '', '', 'final'];
  }
  function firstOpen(s) {
    var p = path(s);
    for (var i = 0; i < p.length; i++) if (p[i] === 'final' || !s[p[i]]) return p[i];
    return 'final';
  }

  // pré-respostas pelo botão de origem (pula o que já se sabe)
  function preset(a) {
    var k = a.getAttribute('data-wa'), s = {};
    if (k === 'combo' || k === 'passos') s.perfil = 'iniciante';
    else if (k === 'jaSouCac') { s.perfil = 'cac'; s.necessidade = 'socio'; }
    else if (k === 'local' || k === 'clube') s.perfil = 'conhecer';
    else if (a.hasAttribute('data-servico') && a.closest('#servicos')) {
      // "Pedido de CR" é de quem ainda não tem CR: segue o caminho de quem vai começar (não faz sentido perguntar quando o CR vence)
      if (a.getAttribute('data-servico') === 'pedido-cr') s.perfil = 'iniciante';
      else {
        var t = a.querySelector('.svc-txt strong');
        s.perfil = 'cac'; s.necessidade = 'servico'; s.servico = clean(t ? t.textContent : 'Outro serviço');
        s.servicoOpt = SVC_OPT[a.getAttribute('data-servico')] || ''; // card que já é uma das opções de "Do que você precisa?"
      }
    }
    return s;
  }

  function necessidadeTxt(s) { return s.necessidade === 'servico' ? s.servico : MSG.necessidade[s.necessidade] || 'Outro serviço'; }
  function urgencia(s) { return s.perfil === 'iniciante' ? s.quando : s.perfil === 'cac' ? s.vencimento : 'conhecer'; }

  function mensagem() {
    var s = st.s;
    var L = ['Olá! Sou ' + memo.nome + ', de ' + memo.cidade + '.'];
    if (s.perfil === 'iniciante') {
      L.push('Quero ser CAC (ainda não sou).');
      L.push('Idade: ' + MSG.idade[s.idade] + '.');
      L.push('Quero começar: ' + MSG.quando[s.quando] + '.');
    } else if (s.perfil === 'cac') {
      L.push('Já sou CAC.');
      L.push('Preciso de: ' + necessidadeTxt(s) + '.');
      L.push(MSG.vencimento[s.vencimento]);
    } else {
      L.push('Quero conhecer o clube.');
    }
    return L.join('\n');
  }

  // ---------- montagem do <dialog> ----------
  var dlg = document.createElement('dialog');
  dlg.className = 'quiz';
  dlg.setAttribute('aria-labelledby', 'quiz-q');
  dlg.innerHTML =
    '<div class="quiz-top">' +
      '<span class="quiz-handle" aria-hidden="true"></span>' +
      '<button type="button" class="quiz-back">' + ICO('i-right') + '<span>Voltar</span></button>' +
      '<div class="quiz-prog" aria-hidden="true"></div>' +
      '<button type="button" class="quiz-x" aria-label="Fechar"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
    '</div>' +
    '<p class="sr" id="quiz-pos" aria-live="polite"></p>' +
    '<div class="quiz-body"></div>';
  document.body.appendChild(dlg);
  var body = dlg.querySelector('.quiz-body');
  var prog = dlg.querySelector('.quiz-prog');
  var pos = dlg.querySelector('#quiz-pos');
  var backBtn = dlg.querySelector('.quiz-back');

  function kicker(step, s) {
    if (step === 'idade' || step === 'quando') return 'Quero ser CAC';
    if (step === 'necessidade') return 'Já sou CAC';
    if (step === 'vencimento') return necessidadeTxt(s);
    return '';
  }

  function questionHTML(step) {
    var q = Q[step], s = st.s, opts = q.o.slice();
    // veio de um card de serviço e voltou para "Do que você precisa?": o serviço do card aparece como opção marcada
    if (step === 'necessidade' && s.servico && !s.servicoOpt) opts.unshift(['servico', s.servico, 'i-doc']);
    var k = kicker(step, s);
    return (k ? '<p class="quiz-kick">' + esc(k) + '</p>' : '') +
      '<h2 class="quiz-q" id="quiz-q" tabindex="-1">' + esc(q.t) + '</h2>' +
      (q.sub ? '<p class="quiz-sub">' + esc(q.sub) + '</p>' : '') +
      '<div class="quiz-opts" role="group" aria-labelledby="quiz-q">' + opts.map(function (o) {
        var on = s[step] === o[0] || (step === 'necessidade' && s.necessidade === 'servico' && s.servicoOpt === o[0]);
        return '<button type="button" class="quiz-opt" data-resp="' + step + ':' + esc(o[0]) + '" aria-pressed="' + on + '">' +
          '<span class="qo-ico' + (o[2] ? '' : ' qo-ring') + '">' + (o[2] ? ICO(o[2]) : '') + '</span>' +
          '<span class="qo-t">' + esc(o[1]) + '</span>' + ICO('i-right', 'qo-go') + '</button>';
      }).join('') + '</div>';
  }

  function chips() {
    var s = st.s, c = [CHIP.perfil[s.perfil]];
    if (s.perfil === 'iniciante') c.push(CHIP.idade[s.idade], CHIP.quando[s.quando]);
    if (s.perfil === 'cac') c.push(necessidadeTxt(s), CHIP.vencimento[s.vencimento]);
    return c.filter(Boolean).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
  }

  function finalHTML() {
    return '<div class="quiz-final">' +
      '<h2 class="quiz-q" id="quiz-q" tabindex="-1">Quase lá!</h2>' +
      '<p class="quiz-sub">Para o clube saber com quem fala.</p>' +
      '<ul class="quiz-chips" aria-label="Suas respostas">' + chips() + '</ul>' +
      '<div class="quiz-field"><label for="quiz-nome">Seu nome</label>' +
        '<input id="quiz-nome" type="text" autocomplete="name" autocapitalize="words" enterkeyhint="next" maxlength="40" placeholder="Ex.: João Silva" aria-describedby="quiz-nome-err">' +
        '<p class="quiz-err" id="quiz-nome-err" hidden>Digite seu nome.</p></div>' +
      '<div class="quiz-field"><label for="quiz-cidade">Sua cidade</label>' +
        '<input id="quiz-cidade" type="text" list="quiz-cidades" autocomplete="address-level2" autocapitalize="words" enterkeyhint="done" maxlength="40" placeholder="Ex.: Campo Erê" aria-describedby="quiz-cidade-err">' +
        '<datalist id="quiz-cidades">' + CIDADES.map(function (c) { return '<option value="' + esc(c) + '"></option>'; }).join('') + '</datalist>' +
        '<p class="quiz-err" id="quiz-cidade-err" hidden>Digite sua cidade.</p></div>' +
      '<a class="btn btn-yellow btn-lg btn-block quiz-enviar" role="link" tabindex="0" target="_blank" rel="noopener" aria-disabled="true">' + ICO('i-wa', 'i-fill') + 'Enviar no WhatsApp</a>' +
      '<p class="quiz-note" aria-live="polite">Abre o WhatsApp com a mensagem pronta.</p>' +
      '</div>';
  }

  function stopHTML() {
    return '<div class="quiz-stop">' +
      '<span class="qs-badge" aria-hidden="true">18</span>' +
      '<h2 class="quiz-q" id="quiz-q" tabindex="-1">Te esperamos aos 18!</h2>' +
      '<p class="quiz-sub">Para ser CAC é preciso ter pelo menos 18\u00a0anos. Quando completar, a\u00a0gente te\u00a0ajuda!</p>' +
      '<a class="btn btn-yellow btn-lg btn-block" data-instagram href="' + esc(C.instagram || '#') + '" target="_blank" rel="noopener">' + ICO('i-ig') + 'Seguir no Instagram</a>' +
      '<button type="button" class="btn btn-outline btn-block quiz-fechar">Fechar</button>' +
      '</div>';
  }

  function show(step, dir) {
    st.step = step;
    var p = path(st.s), i = p.indexOf(step);
    var wrap = document.createElement('div');
    wrap.className = 'quiz-step' + (dir > 0 ? ' fwd' : dir < 0 ? ' bwd' : '');
    wrap.setAttribute('data-step', step);
    wrap.innerHTML = step === 'final' ? finalHTML() : step === 'stop' ? stopHTML() : questionHTML(step);
    body.replaceChildren(wrap);
    body.scrollTop = 0;
    dlg.classList.toggle('is-stop', step === 'stop');

    backBtn.disabled = !(step === 'stop' || i > 0);
    backBtn.setAttribute('aria-label', 'Voltar');
    if (step === 'stop') { prog.innerHTML = ''; pos.textContent = ''; }
    else {
      prog.innerHTML = p.map(function (_, j) { return '<span' + (j <= i ? ' class="on"' : '') + '></span>'; }).join('');
      pos.textContent = 'Passo ' + (i + 1) + ' de ' + p.length;
    }

    if (step === 'final') {
      body.querySelector('#quiz-nome').value = memo.nome;
      body.querySelector('#quiz-cidade').value = memo.cidade;
      update();
    }
    var h = body.querySelector('.quiz-q');
    if (h && dlg.open) h.focus({ preventScroll: true });
  }

  function answer(q, v) {
    if (q === 'necessidade' && st.s.servico && st.s.servicoOpt === v) v = 'servico'; // manteve o serviço do card
    st.s[q] = v;
    if (q === 'idade' && v === 'menos18') { log('quiz:parada:menos18'); return show('stop', 1); }
    var p = path(st.s);
    show(p[p.indexOf(q) + 1] || 'final', 1);
  }

  function back() {
    if (st.step === 'stop') return show('idade', -1);
    var p = path(st.s), i = p.indexOf(st.step);
    if (i > 0) show(p[i - 1], -1);
  }

  // ---------- etapa final: valida e monta o link a cada digitação ----------
  function fields() { return { n: body.querySelector('#quiz-nome'), c: body.querySelector('#quiz-cidade'), a: body.querySelector('a.quiz-enviar') }; }
  function update() {
    var f = fields();
    if (!f.a) return false;
    memo.nome = clean(f.n.value); memo.cidade = clean(f.c.value);
    var okN = letters(memo.nome) >= 2, okC = letters(memo.cidade) >= 2;
    if (okN) hint(f.n, false);
    if (okC) hint(f.c, false);
    if (okN && okC) {
      f.a.setAttribute('href', 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(mensagem()));
      f.a.setAttribute('aria-disabled', 'false');
    } else {
      f.a.removeAttribute('href');
      f.a.setAttribute('aria-disabled', 'true');
    }
    return okN && okC;
  }
  function hint(input, on) {
    input.setAttribute('aria-invalid', on ? 'true' : 'false');
    var e = document.getElementById(input.id + '-err');
    if (e) e.hidden = !on;
  }
  function explain() {
    var f = fields(), first = null;
    [f.n, f.c].forEach(function (i) { var bad = letters(clean(i.value)) < 2; hint(i, bad); if (bad && !first) first = i; });
    if (first) first.focus();
  }
  // com o teclado aberto, o Enviar fica à vista logo abaixo do campo
  function reveal(el) {
    if (!el) return;
    var b = body.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (r.bottom > b.bottom - 8) body.scrollTop += r.bottom - b.bottom + 12;
  }

  function send(e, a) {
    if (!update()) { e.preventDefault(); explain(); return; }
    var perfil = st.s.perfil, urg = urgencia(st.s);
    log('whatsapp:quiz:' + perfil);
    if (!st.sent) { // o Lead conta uma vez por questionário (mesmo se tocar de novo)
      st.sent = true;
      fb('track', 'Lead', { content_name: perfil, content_category: urg });
      ga('generate_lead', { content_name: perfil, content_category: urg, origem: st.origem });
    }
    var note = body.querySelector('.quiz-note');
    if (note) note.textContent = 'Abrindo o WhatsApp…';
  }

  // ---------- teclado do celular: painel encosta em cima do teclado (iPhone/Android sem resize) ----------
  var vv = window.visualViewport;
  function fitVV() {
    if (!vv || !dlg.open) return;
    if (Math.abs((vv.scale || 1) - 1) > 0.01) { dlg.classList.remove('has-vv', 'is-kb'); return; } // com zoom de pinça, deixa como está
    var kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    dlg.style.setProperty('--vvh', Math.round(vv.height) + 'px');
    dlg.style.setProperty('--kb', kb + 'px');
    dlg.classList.add('has-vv');
    dlg.classList.toggle('is-kb', kb > 80);
  }
  if (vv) { vv.addEventListener('resize', fitVV); vv.addEventListener('scroll', fitVV); }

  // ---------- eventos ----------
  var downOnBackdrop = false;
  dlg.addEventListener('pointerdown', function (e) { downOnBackdrop = e.target === dlg; });
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) { if (downOnBackdrop) dlg.close(); downOnBackdrop = false; return; } // tocar fora do painel
    var b = e.target.closest('[data-resp]');
    if (b) { var r = b.getAttribute('data-resp'), k = r.indexOf(':'); return answer(r.slice(0, k), r.slice(k + 1)); }
    if (e.target.closest('.quiz-back')) return back();
    if (e.target.closest('.quiz-x, .quiz-fechar')) return dlg.close();
    var a = e.target.closest('a.quiz-enviar');
    if (a) return send(e, a);
    if (e.target.closest('a[data-instagram]')) log('quiz:instagram');
  });
  dlg.addEventListener('input', function () { update(); });
  dlg.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var t = e.target;
    if (t.id === 'quiz-nome') { e.preventDefault(); body.querySelector('#quiz-cidade').focus(); }
    else if (t.id === 'quiz-cidade') { e.preventDefault(); if (update()) body.querySelector('a.quiz-enviar').focus(); else explain(); }
    else if (t.matches('a.quiz-enviar[aria-disabled="true"]')) { e.preventDefault(); explain(); }
  });
  dlg.addEventListener('focusin', function (e) {
    if (!/^quiz-(nome|cidade)$/.test(e.target.id)) return;
    setTimeout(function () { reveal(body.querySelector('a.quiz-enviar')); reveal(e.target); }, 320);
  });
  dlg.addEventListener('close', function () {
    root.classList.remove('quiz-lock');
    dlg.classList.remove('has-vv', 'is-kb');
    if (opener && opener.focus) { try { opener.focus({ preventScroll: true }); } catch (err) {} }
    opener = null;
  });

  // ---------- API usada pelo app.js ----------
  window.Quiz = {
    open: function (a) {
      if (typeof dlg.showModal !== 'function') return false; // navegador antigo: segue o link direto do WhatsApp
      var key = a.getAttribute('data-wa') + (a.getAttribute('data-servico') ? ':' + a.getAttribute('data-servico') : '');
      st = { s: preset(a), origem: key, sent: false, step: '' };
      opener = a;
      log('quiz:abrir:' + key);
      fb('trackCustom', 'QuizInicio', { origem: key });
      ga('quiz_start', { origem: key });
      show(firstOpen(st.s), 0);
      if (!dlg.open) { try { dlg.showModal(); } catch (err) { return false; } }
      root.classList.add('quiz-lock');
      fitVV();
      var h = body.querySelector('.quiz-q');
      if (h) h.focus({ preventScroll: true });
      return true;
    },
  };
})();
