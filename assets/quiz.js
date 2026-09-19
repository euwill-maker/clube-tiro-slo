// Questionário de qualificação antes do WhatsApp (Willian, 19/09/2026):
// todo botão de WhatsApp (a[data-wa]) abre este questionário — o app.js intercepta o clique e chama Quiz.open().
// Toques rápidos; só no fim a pessoa digita nome e cidade. Menor de 18 para numa tela educada, sem WhatsApp.
// O "Enviar no WhatsApp" é um <a> de verdade com o wa.me pronto (no navegador do Instagram, window.open costuma falhar).
// Número e Instagram vêm do CONFIG (app.js).
//
// Caminhos (Willian aprovou as 4 perguntas novas em 19/09):
//   quero ser CAC: perfil → idade → interesse → gov.br → quando → nome/cidade   (menor de 18 para na idade)
//   já sou CAC:    perfil → necessidade → filiado → armas → vencimento → nome/cidade
//   card de serviço / "Quero ser sócio": já sabem perfil e necessidade → começam em "filiado"
//   herança, furto/roubo/perda, registro vencido, conferência, exigência: primeiro "Você já é CAC?"
//     (herdeiro nem sempre é CAC; conferência e exigência também servem a quem ainda pede o 1º CR)
//   furto, roubo ou perda é urgente: depois de "Você já é CAC?" vai direto para nome/cidade
//   toque duplo: depois de cada troca de tela o painel ignora toques por GUARD_MS (menos o X);
//     depois de fechar, o 1º toque na página também é ignorado (não reabre o questionário sem querer)
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
    interesse: { t: 'O que mais te atrai?', o: [['treinar', 'Treinar e competir'], ['arma-propria', 'Ter minha própria arma'], ['conhecendo', 'Ainda estou conhecendo']] },
    // fato VERIFICADO #3 (docs/fatos-cac.md): o pedido é feito pela internet, com conta gov.br prata ou ouro
    govbr: { t: 'Sua conta gov.br é prata ou ouro?', sub: 'O pedido do CR usa a sua conta gov.br.', o: [['sim', 'Sim'], ['nao', 'Não / não sei']] },
    quando: { t: 'Quando você quer começar?', o: [['agora', 'Agora'], ['meses', 'Nos próximos meses'], ['pesquisando', 'Só pesquisando']] },
    necessidade: { t: 'Do que você precisa?', o: [
      ['socio', 'Ser sócio do clube', 'i-users'],
      ['renovar-cr', 'Renovar CR', 'i-renew'],
      ['renovar-craf', 'Renovar registro de arma', 'i-doc'],
      ['outro', 'Outro serviço', 'i-clip']] },
    ehcac: { t: 'Você já é CAC?', o: [['sim', 'Sim, sou CAC'], ['nao', 'Não sou CAC']] },
    filiado: { t: 'Você é filiado a algum clube hoje?', o: [['outro', 'Sim, em outro clube'], ['daqui', 'Já sou sócio daqui'], ['nao', 'Não / venceu']] },
    acervo: { t: 'Quantas armas você tem registradas?', o: [['0', 'Nenhuma'], ['1-2', '1 ou 2'], ['3+', '3 ou mais']] },
    vencimento: { t: 'Seu CR vence em…', tArma: 'O registro da arma vence em…', o: [['vencido', 'Já venceu'], ['ate3', 'Até 3 meses'], ['mais3', 'Mais de 3 meses'], ['naosei', 'Não sei']] },
  };
  // fato VERIFICADO #7: arma própria só a partir dos 25 (antes, só arma do clube ou cedida por outro atirador).
  // NÃO prometer que ESTE clube empresta arma (fatos-cac.md "NÃO AFIRMAR" + PENDENCIAS D1). Se o clube confirmar,
  // pode voltar para "Até lá, você treina com arma do clube."
  var AVISO_ARMA = 'Arma própria só a partir dos 25. Até lá, o clube te explica como treinar.';

  // ---------- como cada resposta vai escrita na mensagem (curta, para o atendente) ----------
  var MSG = {
    idade: { '18-24': '18 a 24 anos', '25+': '25 ou mais' },
    interesse: { treinar: 'treinar e competir', 'arma-propria': 'ter minha própria arma', conhecendo: 'ainda estou conhecendo' },
    govbr: { sim: 'sim', nao: 'não/não sei' },
    quando: { agora: 'Quero começar agora.', meses: 'Quero começar nos próximos meses.', pesquisando: 'Por enquanto, só estou pesquisando.' },
    necessidade: { socio: 'Quero ser sócio do clube.', 'renovar-cr': 'Preciso renovar meu CR.', 'renovar-craf': 'Preciso renovar o registro da minha arma.', outro: 'Preciso de outro serviço.' },
    filiado: { outro: 'em outro clube', daqui: 'já sou sócio daqui', nao: 'não/venceu' },
    acervo: { '0': 'nenhuma', '1-2': '1 ou 2', '3+': '3 ou mais' },
    vencimento: { vencido: 'Meu CR já venceu.', ate3: 'Meu CR vence: até 3 meses.', mais3: 'Meu CR vence: em mais de 3 meses.', naosei: 'Meu CR vence: não sei.' },
    vencArma: { vencido: 'O registro da arma já venceu.', ate3: 'Registro da arma vence: até 3 meses.', mais3: 'Registro da arma vence: em mais de 3 meses.', naosei: 'Registro da arma vence: não sei.' },
  };
  // cada card de serviço vira uma frase natural na mensagem (nunca "Preciso de: <título do card>")
  var SVC_FRASE = {
    'renovacao-cr': 'Preciso renovar meu CR.',
    'renovacao-craf': 'Preciso renovar o registro da minha arma.',
    apostilamento: 'Preciso de um apostilamento no meu CR.',
    conferencia: 'Quero conferir os documentos do meu pedido.',
    guia: 'Preciso de ajuda com a guia de tráfego.',
    exigencia: 'Preciso de ajuda com uma exigência ou recurso da PF.',
    'registro-antigo': 'Quero conferir a data-limite do meu registro de arma antigo.',
    endereco: 'Preciso atualizar meu endereço no CR.',
    'segunda-via': 'Preciso da segunda via do CR ou do registro da arma.',
    'troca-clube': 'Quero trocar de clube.',
    heranca: 'Preciso de orientação sobre uma arma de herança.',
    'exercito-posse': 'Quero passar uma arma para o meu acervo de CAC.',
    transferencia: 'Preciso de ajuda com uma transferência de arma entre CACs.',
    'registro-vencido': 'Preciso de ajuda com um registro de arma vencido.',
    ocorrencia: 'Preciso de orientação sobre furto, roubo ou perda de arma.',
  };
  var SVC_OPT = { 'renovacao-cr': 'renovar-cr', 'renovacao-craf': 'renovar-craf' }; // card que já é uma opção de "Do que você precisa?"
  var SVC_NEUTRO = { heranca: 1, ocorrencia: 1, 'registro-vencido': 1, conferencia: 1, exigencia: 1 }; // quem toca pode não ser CAC → pergunta antes
  var SVC_DIRETO = { ocorrencia: 1 };                                                 // urgente: depois de "é CAC?" vai direto para nome/cidade
  var SVC_ARMA = { 'renovacao-craf': 1, 'registro-antigo': 1 };                      // o vencimento que importa é o do registro da arma
  var SVC_SEM_VENC = { 'registro-vencido': 1 };                                      // já venceu: não pergunta quando vence
  var NEC_LABEL = { socio: 'Ser sócio do clube', 'renovar-cr': 'Renovação do CR', 'renovar-craf': 'Renovação do registro da arma', outro: 'Outro serviço' };

  // resumo em etiquetas na tela final
  var CHIP = {
    perfil: { iniciante: 'Quero ser CAC', cac: 'Já sou CAC', conhecer: 'Conhecer o clube', naocac: 'Não sou CAC' },
    idade: { '18-24': '18 a 24 anos', '25+': '25 ou mais' },
    interesse: { treinar: 'Treinar e competir', 'arma-propria': 'Arma própria', conhecendo: 'Conhecendo' },
    govbr: { sim: 'gov.br prata/ouro', nao: 'gov.br: não/não sei' },
    quando: { agora: 'Começar agora', meses: 'Próximos meses', pesquisando: 'Só pesquisando' },
    filiado: { outro: 'Filiado a outro clube', daqui: 'Sócio daqui', nao: 'Sem clube' },
    acervo: { '0': 'Nenhuma arma', '1-2': '1 ou 2 armas', '3+': '3 ou mais armas' },
    vencimento: { vencido: 'CR vencido', ate3: 'Vence em até 3 meses', mais3: 'Vence em mais de 3 meses', naosei: 'Vencimento: não sei' },
    vencArma: { vencido: 'Registro vencido', ate3: 'Vence em até 3 meses', mais3: 'Vence em mais de 3 meses', naosei: 'Vencimento: não sei' },
  };
  var CIDADES = ['São Lourenço do Oeste', 'Novo Horizonte', 'Jupiá', 'Galvão', 'Campo Erê', 'São Bernardino', 'Coronel Martins',
    'Formosa do Sul', 'Quilombo', 'Santiago do Sul', 'Vitorino/PR', 'Renascença/PR', 'Pato Branco/PR'];

  var ICO = function (id, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (v) { return String(v || '').replace(/\s+/g, ' ').trim(); };
  var clean = function (v) { return norm(v).slice(0, 40); }; // só nome e cidade (campos com maxlength=40); nunca o título de serviço
  var letters = function (v) { return (v.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length; };

  function log(label) { (window.__events = window.__events || []).push(label); }
  function fb() { if (window.fbq) window.fbq.apply(window, arguments); }
  function ga(name, params) { if (window.gtag) window.gtag('event', name, params); }

  // ---------- estado ----------
  var st = null;               // { s: respostas, step, origem, sent, segs }
  var memo = { nome: '', cidade: '' }; // nome/cidade ficam na memória se a pessoa fechar e abrir de novo
  var opener = null;
  // toque duplo: a tela troca na hora do 1º toque e o 2º cairia na opção seguinte (mesmo lugar da tela).
  // Depois de cada troca de tela (e ao abrir), toques de gente de verdade ficam travados por um instante.
  // 550 ms: segura também quem toca devagar (clique duplo do computador vai até 500 ms); ninguém lê e responde tão rápido.
  var GUARD_MS = 550, guardUntil = 0, guardTimer = 0, closedAt = 0;
  function guarded(e) { return e.isTrusted && Date.now() < guardUntil; }

  function semVenc(s) { return s.necessidade === 'servico' && !!SVC_SEM_VENC[s.servicoId]; }
  function direto(s) { return s.necessidade === 'servico' && !!SVC_DIRETO[s.servicoId]; }
  function isArma(s) { return s.necessidade === 'renovar-craf' || (s.necessidade === 'servico' && !!SVC_ARMA[s.servicoId]); }
  function avisoArma(s) { return s.perfil === 'iniciante' && s.idade === '18-24' && s.interesse === 'arma-propria'; }

  // caminho de perguntas (define o Voltar e a barra de progresso)
  function path(s) {
    var cac = direto(s) ? ['final'] : ['filiado', 'acervo'].concat(semVenc(s) ? [] : ['vencimento'], ['final']);
    if (s.neutro) return s.ehcac === 'nao' ? ['ehcac', 'final'] : ['ehcac'].concat(cac);
    if (s.perfil === 'iniciante') return ['perfil', 'idade', 'interesse', 'govbr', 'quando', 'final'];
    if (s.perfil === 'cac') return ['perfil', 'necessidade'].concat(cac);
    if (s.perfil === 'conhecer') return ['perfil', 'final'];
    return ['perfil', '', '', '', '', 'final'];
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
      var id = a.getAttribute('data-servico');
      // "Pedido de CR" é de quem ainda não tem CR: segue o caminho de quem vai começar
      if (id === 'pedido-cr') s.perfil = 'iniciante';
      else {
        var t = a.querySelector('.svc-txt strong');
        s.necessidade = 'servico'; s.servicoId = id;
        s.servico = norm(t ? t.textContent : '') || 'Outro serviço'; // título inteiro, sem cortar
        s.servicoMsg = norm(a.getAttribute('data-wa-msg')).replace(/^Olá!\s*/, '');
        s.servicoOpt = SVC_OPT[id] || '';
        if (SVC_NEUTRO[id]) s.neutro = true; else s.perfil = 'cac';
      }
    }
    return s;
  }

  // opções que fazem sentido para esta pessoa (não oferece resposta que contradiz o que ela já disse)
  function optsFor(step, s) {
    var o = Q[step].o;
    if (step === 'filiado' && (s.necessidade === 'socio' || (s.necessidade === 'servico' && s.servicoId === 'troca-clube')))
      o = o.filter(function (x) { return x[0] !== 'daqui'; });           // quer ser sócio / trocar de clube: ainda não é sócio daqui
    if (step === 'acervo' && isArma(s)) o = o.filter(function (x) { return x[0] !== '0'; }); // renova registro de arma: tem arma
    return o.slice();
  }

  function servicoFrase(s) { return SVC_FRASE[s.servicoId] || s.servicoMsg || 'Assunto: ' + s.servico + '.'; }
  function necessidadeFrase(s) { return s.necessidade === 'servico' ? servicoFrase(s) : MSG.necessidade[s.necessidade] || MSG.necessidade.outro; }
  function necessidadeLabel(s) { return s.necessidade === 'servico' ? s.servico : NEC_LABEL[s.necessidade] || NEC_LABEL.outro; }
  function urgencia(s) {
    if (s.perfil === 'iniciante') return s.quando;
    if (s.perfil === 'cac') return direto(s) ? 'servico' : semVenc(s) ? 'vencido' : s.vencimento;
    return s.perfil === 'naocac' ? 'servico' : 'conhecer';
  }

  function mensagem() {
    var s = st.s;
    var L = ['Olá! Sou ' + memo.nome + ', de ' + memo.cidade + '.'];
    if (s.perfil === 'iniciante') {
      // o botão tocado diz o motivo (sem preço): combo ou associação
      L.push('Quero ser CAC (ainda não sou)' + (st.origem === 'combo' ? ' e tenho interesse no Combo CAC' : st.origem === 'associacao' ? ' e ser sócio do clube' : '') + '.');
      L.push('Idade: ' + MSG.idade[s.idade] + '.');
      L.push('Interesse: ' + MSG.interesse[s.interesse] + '.');
      if (avisoArma(s)) L.push('Obs.: já sei que arma própria só a partir dos 25.');
      L.push('gov.br prata ou ouro: ' + MSG.govbr[s.govbr] + '.');
      L.push(MSG.quando[s.quando]);
    } else if (s.perfil === 'cac') {
      L.push('Já sou CAC.');
      L.push(necessidadeFrase(s));
      if (!direto(s)) {
        L.push('Filiado: ' + MSG.filiado[s.filiado] + '.');
        L.push('Armas registradas: ' + MSG.acervo[s.acervo] + '.');
        if (!semVenc(s)) L.push((isArma(s) ? MSG.vencArma : MSG.vencimento)[s.vencimento]);
      }
    } else if (s.perfil === 'naocac') {
      L.push(servicoFrase(s));
      L.push('Não sou CAC.');
    } else {
      L.push(st.origem === 'local' || st.origem === 'clube' ? 'Quero conhecer o clube e agendar uma visita.' : 'Quero conhecer o clube.');
    }
    if (st.origem === 'faq' || st.origem === 'atalhos') L.push('Tenho uma dúvida.');
    return L.join('\n');
  }

  // ---------- montagem do <dialog> ----------
  var dlg = document.createElement('dialog');
  dlg.className = 'quiz';
  dlg.setAttribute('aria-labelledby', 'quiz-q');
  dlg.innerHTML =
    '<div class="quiz-top">' +
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
    if (step === 'idade' || step === 'interesse' || step === 'govbr' || step === 'quando') return 'Quero ser CAC';
    if (step === 'necessidade') return 'Já sou CAC';
    if (step === 'ehcac' || step === 'filiado' || step === 'acervo' || step === 'vencimento') return necessidadeLabel(s);
    return '';
  }

  function questionHTML(step) {
    var q = Q[step], s = st.s, opts = optsFor(step, s);
    // veio de um card de serviço e voltou para "Do que você precisa?": o serviço do card aparece como opção marcada
    if (step === 'necessidade' && s.servico && !s.servicoOpt) opts.unshift(['servico', s.servico, 'i-doc']);
    var aviso = step === 'govbr' && avisoArma(s);
    var k = aviso ? '' : kicker(step, s);
    var title = step === 'vencimento' && isArma(s) ? q.tArma : q.t;
    return (aviso ? '<p class="quiz-aviso" role="note">' + ICO('i-target') + '<span>' + esc(AVISO_ARMA) + '</span></p>' : '') +
      (k ? '<p class="quiz-kick">' + esc(k) + '</p>' : '') +
      '<h2 class="quiz-q" id="quiz-q" tabindex="-1">' + esc(title) + '</h2>' +
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
    if (s.perfil === 'iniciante') c.push(CHIP.idade[s.idade], CHIP.interesse[s.interesse], CHIP.govbr[s.govbr], CHIP.quando[s.quando]);
    if (s.perfil === 'cac') c.push(necessidadeLabel(s));
    if (s.perfil === 'cac' && !direto(s)) c.push(CHIP.filiado[s.filiado], CHIP.acervo[s.acervo], semVenc(s) ? '' : (isArma(s) ? CHIP.vencArma : CHIP.vencimento)[s.vencimento]);
    if (s.perfil === 'naocac') c.unshift(s.servico);
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
      '<p class="quiz-sub">Para ser CAC é preciso ter pelo menos 18 anos. Quando completar, a gente te ajuda!</p>' +
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
    // trava contra toque duplo: no JS (click) e no CSS (.is-guard tira os toques do passo — um campo de texto
    // recebe o foco já no toque, antes do click, e abriria o teclado)
    guardUntil = Date.now() + GUARD_MS;
    dlg.classList.add('is-guard');
    clearTimeout(guardTimer);
    guardTimer = setTimeout(function () { dlg.classList.remove('is-guard'); }, GUARD_MS);

    backBtn.disabled = !(step === 'stop' || i > 0);
    backBtn.setAttribute('aria-label', 'Voltar');
    if (step === 'stop') { prog.innerHTML = ''; pos.textContent = ''; }
    else {
      // barra de progresso: numa pergunta, conta o caminho como se ela ainda não tivesse resposta (não muda ao voltar);
      // no fim, fica toda cheia e nunca encolhe (ex.: "Só quero conhecer" encurta o caminho)
      var n, on;
      if (step === 'final') { n = Math.max(st.segs || 0, p.length); on = n; }
      else {
        var probe = {}; for (var k in st.s) if (k !== step) probe[k] = st.s[k];
        var pp = path(probe);
        n = pp.length; on = pp.indexOf(step) + 1;
      }
      st.segs = n;
      prog.innerHTML = Array.apply(null, Array(n)).map(function (_, j) { return '<span' + (j < on ? ' class="on"' : '') + '></span>'; }).join('');
      pos.textContent = (step === 'final' ? 'Último passo' : 'Passo ' + on + ' de ' + n) +
        (step === 'govbr' && avisoArma(st.s) ? '. ' + AVISO_ARMA : '');
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
    var s = st.s;
    if (q === 'necessidade' && s.servico && s.servicoOpt === v) v = 'servico'; // manteve o serviço do card
    s[q] = v;
    // cada resposta vira evento (só __events e GA4; o Pixel fica só com início e Lead) → mostra em que pergunta a pessoa desiste
    log('quiz:resp:' + q + ':' + v);
    ga('quiz_step', { passo: q, resposta: v, origem: st.origem });
    if (q === 'ehcac') s.perfil = v === 'sim' ? 'cac' : 'naocac';
    // "Quero ser sócio" da seção Associação + "Já sou CAC": a necessidade já é ser sócio (não pergunta de novo)
    var skip = q === 'perfil' && v === 'cac' && st.origem === 'associacao' && !s.necessidade;
    if (skip) s.necessidade = 'socio';
    // resposta antiga que deixou de valer (ex.: voltou e trocou para "Ser sócio"): apaga, a pessoa responde de novo
    ['filiado', 'acervo'].forEach(function (k) {
      if (s[k] && !optsFor(k, s).some(function (o) { return o[0] === s[k]; })) delete s[k];
    });
    if (q === 'idade' && v === 'menos18') { log('quiz:parada:menos18'); return show('stop', 1); }
    var p = path(s), i = p.indexOf(q) + 1;
    if (skip && p[i] === 'necessidade') i++;
    show(p[i] || 'final', 1);
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

  var noteTimer = 0;
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
    if (!note) return;
    note.textContent = 'Abrindo o WhatsApp…';
    // se o navegador do Instagram não abrir o WhatsApp (ou a pessoa voltar ao site), a tela diz o que fazer
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { if (note.isConnected) note.textContent = 'Não abriu? Toque de novo no botão.'; }, 2500);
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

  // ---------- histórico: o Voltar do celular fecha o painel (no Instagram do Android ele fecharia a página) ----------
  // Abrir cria uma entrada no histórico; Voltar (popstate) fecha o painel; fechar pelo X/Esc/fora desfaz a entrada.
  var HIST = !!(window.history && history.pushState);
  var popClosing = false, backPending = false, backTimer = 0;
  function quizState() { try { return !!(history.state && history.state.quiz); } catch (err) { return false; } }
  function pushQuiz() { try { history.pushState({ quiz: 1 }, ''); } catch (err) {} }
  if (HIST && quizState()) { try { history.replaceState(null, ''); } catch (err) {} } // sobrou de antes de recarregar
  window.addEventListener('popstate', function () {
    if (backPending) { // é o history.back() que o próprio questionário pediu ao fechar
      backPending = false; clearTimeout(backTimer);
      if (dlg.open && !quizState()) pushQuiz(); // reabriu antes de o Voltar terminar
      return;
    }
    if (dlg.open) { popClosing = true; dlg.close(); }
  });

  // ---------- eventos ----------
  function closeQuiz() { closedAt = Date.now(); dlg.close(); }
  var downOnBackdrop = false;
  dlg.addEventListener('pointerdown', function (e) { downOnBackdrop = e.target === dlg && !guarded(e); });
  dlg.addEventListener('click', function (e) {
    // 2º toque de um toque duplo: a tela acabou de trocar e a pessoa ainda nem viu o que está embaixo do dedo.
    // Vale para tudo (opção, Voltar, Enviar, Fechar, Instagram, fundo escuro), menos o X.
    if (guarded(e) && !e.target.closest('.quiz-x')) { e.preventDefault(); downOnBackdrop = false; return; }
    if (e.target === dlg) { if (downOnBackdrop) closeQuiz(); downOnBackdrop = false; return; } // tocar fora do painel
    var b = e.target.closest('[data-resp]');
    if (b) {
      var r = b.getAttribute('data-resp'), k = r.indexOf(':');
      return answer(r.slice(0, k), r.slice(k + 1));
    }
    if (e.target.closest('.quiz-back')) return back();
    if (e.target.closest('.quiz-x, .quiz-fechar')) return closeQuiz();
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
  // depois de fechar, o 2º toque de um toque duplo (no X ou fora do painel) cairia na página de trás —
  // num card de serviço ou botão de WhatsApp, reabriria o questionário na hora. Esse toque é ignorado.
  window.addEventListener('click', function (e) {
    if (e.isTrusted && !dlg.open && Date.now() - closedAt < GUARD_MS) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  dlg.addEventListener('close', function () {
    closedAt = Date.now();
    root.classList.remove('quiz-lock');
    dlg.classList.remove('has-vv', 'is-kb', 'is-guard');
    clearTimeout(guardTimer);
    clearTimeout(noteTimer);
    if (popClosing) popClosing = false; // fechou pelo Voltar: a entrada já saiu do histórico
    else if (HIST && quizState() && !backPending) {
      backPending = true; history.back();
      backTimer = setTimeout(function () { backPending = false; }, 1500); // segurança: se o popstate não vier
    }
    if (opener && opener.focus) { try { opener.focus({ preventScroll: true }); } catch (err) {} }
    opener = null;
  });

  // ---------- API usada pelo app.js ----------
  window.Quiz = {
    open: function (a) {
      if (typeof dlg.showModal !== 'function') return false; // navegador antigo: segue o link direto do WhatsApp
      var key = a.getAttribute('data-wa') + (a.getAttribute('data-servico') ? ':' + a.getAttribute('data-servico') : '');
      st = { s: preset(a), origem: key, sent: false, step: '', segs: 0 };
      opener = a;
      log('quiz:abrir:' + key);
      fb('trackCustom', 'QuizInicio', { origem: key });
      ga('quiz_start', { origem: key });
      show(firstOpen(st.s), 0);
      if (!dlg.open) {
        try { dlg.showModal(); } catch (err) { return false; }
        if (HIST && !backPending) pushQuiz(); // com um Voltar pendente, o popstate cria a entrada quando chegar
      }
      root.classList.add('quiz-lock');
      fitVV();
      var h = body.querySelector('.quiz-q');
      if (h) h.focus({ preventScroll: true });
      return true;
    },
  };
})();
