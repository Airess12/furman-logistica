let usuarioLogado = {};

fetch('/me')
    .then(r => r.json())
    .then(dados => {
        if (dados.status === 'ok') {
            usuarioLogado = dados.usuario;

            const nomePerfil = document.getElementById('nomePerfil');
            const cargoPerfil = document.getElementById('cargoPerfil');
            const fotoPerfil = document.getElementById('fotoPerfil');
            const menuUsuarios = document.getElementById('menu-usuarios');

            if (nomePerfil) nomePerfil.textContent = usuarioLogado.nome || usuarioLogado.usuario || 'Usuário';
            if (cargoPerfil) cargoPerfil.innerText = nomesCargos[usuarioLogado.tipo] || 'Usuário';
            if (fotoPerfil) fotoPerfil.src = usuarioLogado.foto || '/img/LOGO.jpeg';
            if (menuUsuarios && usuarioLogado.tipo !== 'master') menuUsuarios.remove();

            aplicarPermissoesUsuario();
        } else {
            window.location.href = '/login';
        }
    })
    .catch(() => window.location.href = '/login');


function confirmarDialog(mensagem) {
    return new Promise(resolve => {
        document.getElementById('modalConfirm')?.remove();

        const modal = document.createElement('div');
        modal.id = 'modalConfirm';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,.65);
            backdrop-filter: blur(6px);
            animation: slideIn .2s ease;
        `;

        modal.innerHTML = `
            <div style="
                background: #0f172a;
                border: 1px solid rgba(255,255,255,.12);
                border-radius: 24px;
                padding: 32px 36px;
                max-width: 420px;
                width: 90%;
                box-shadow: 0 28px 60px rgba(0,0,0,.55);
                text-align: center;
            ">
                <div style="font-size: 42px; margin-bottom: 16px;">⚠️</div>
                <p style="
                    color: #ffffff;
                    font-size: 17px;
                    font-weight: 700;
                    margin: 0 0 28px;
                    line-height: 1.5;
                ">${mensagem}</p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="modalConfirmNao" style="
                        flex: 1;
                        height: 48px;
                        border: 1px solid rgba(255,255,255,.12);
                        border-radius: 14px;
                        background: rgba(255,255,255,.06);
                        color: #cbd5e1;
                        font-size: 15px;
                        font-weight: 700;
                        cursor: pointer;
                        transition: .2s ease;
                    ">Cancelar</button>
                    <button id="modalConfirmSim" style="
                        flex: 1;
                        height: 48px;
                        border: none;
                        border-radius: 14px;
                        background: linear-gradient(135deg, #dc2626, #991b1b);
                        color: #ffffff;
                        font-size: 15px;
                        font-weight: 700;
                        cursor: pointer;
                        transition: .2s ease;
                    ">Confirmar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('modalConfirmSim').onclick = () => {
            modal.remove();
            resolve(true);
        };

        document.getElementById('modalConfirmNao').onclick = () => {
            modal.remove();
            resolve(false);
        };

        modal.addEventListener('click', e => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        });

        document.addEventListener('keydown', function handler(e) {
            if (e.key === 'Escape') {
                modal.remove();
                resolve(false);
                document.removeEventListener('keydown', handler);
            }
        });
    });
}

function btnLoading(botao, texto = 'Aguarde...') {
    botao.disabled = true;
    botao.dataset.textoOriginal = botao.innerHTML;
    botao.innerHTML = `<span style="opacity:.7">${texto}</span>`;
}

function btnRestore(botao) {
    botao.disabled = false;
    botao.innerHTML = botao.dataset.textoOriginal;
}

function mostrarLoading() {
    const bar = document.getElementById('loadingBar');
    if (!bar) return;
    bar.style.width = '70%';
    bar.style.opacity = '1';
}

function esconderLoading() {
    const bar = document.getElementById('loadingBar');
    if (!bar) return;
    bar.style.width = '100%';
    setTimeout(() => {
        bar.style.opacity = '0';
        bar.style.width = '0%';
    }, 300);
}

let timerInatividade;
let timerAviso;

function resetarTimer() {
    clearTimeout(timerInatividade);
    clearTimeout(timerAviso);

    // Avisa 5 minutos antes de deslogar
    timerAviso = setTimeout(() => {
        toast('⚠️ Você será deslogado em 5 minutos por inatividade.', 'aviso');
    }, 25 * 60 * 1000);

    // Desloga após 30 minutos
    timerInatividade = setTimeout(async () => {
        toast('Sessão expirada. Redirecionando...', 'info');
        await new Promise(r => setTimeout(r, 2000));
        await fetch('/logout', { method: 'POST' });
        window.location.href = '/login';
    }, 30 * 60 * 1000);
}

// Reinicia o timer em qualquer interação
['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(evento => {
    document.addEventListener(evento, resetarTimer, { passive: true });
});

// Inicia o timer
resetarTimer();

function sanitizar(texto) {
    if (texto === null || texto === undefined) return '';
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function toast(mensagem, tipo = 'sucesso') {
    const cores = {
        sucesso: { fundo: 'rgba(34,197,94,.15)', borda: '#22c55e', icone: '✅' },
        erro:    { fundo: 'rgba(239,68,68,.15)', borda: '#ef4444', icone: '❌' },
        aviso:   { fundo: 'rgba(245,158,11,.15)', borda: '#fbbf24', icone: '⚠️' },
        info:    { fundo: 'rgba(56,189,248,.15)', borda: '#38bdf8', icone: 'ℹ️' }
    };

    const c = cores[tipo] || cores.sucesso;

    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 9999;
        padding: 16px 22px;
        border-radius: 16px;
        background: ${c.fundo};
        border: 1px solid ${c.borda};
        color: #ffffff;
        font-size: 15px;
        font-weight: 700;
        box-shadow: 0 12px 30px rgba(0,0,0,.35);
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 380px;
        backdrop-filter: blur(12px);
        animation: slideIn .3s ease;
    `;

    div.innerHTML = `<span>${c.icone}</span><span>${mensagem}</span>`;
    document.body.appendChild(div);

    setTimeout(() => {
        div.style.animation = 'fadeOut .3s ease forwards';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}


const nomesCargos = {
    master: 'Administrador Master',
    admin: 'Administrador',
    gerente: 'Gerente Operacional',
    qualidade: 'Qualidade',
    expedicao: 'Expedição',
    laboratorio: 'Laboratório',
    visualizacao: 'Visualização'
};

function el(...ids) {
    for (const id of ids) {
        const item = document.getElementById(id);
        if (item) return item;
    }
    return null;
}

/* =========================
   ABAS
========================= */

function mostrarAba(id, elemento) {
    document.querySelectorAll('.aba').forEach(aba => {
        aba.classList.remove('ativa');
    });

    const aba = document.getElementById(id);
    if (aba) aba.classList.add('ativa');

    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('ativo');
    });

    if (elemento) elemento.classList.add('ativo');

    if (id === 'relatorios') carregarHistorico();
    if (id === 'dashboard') carregarDashboard();
    if (id === 'indicadores') carregarIndicadoresExecutivos();
    if (id === 'auditoria') carregarAuditoria();
    if (id === 'qualidade') {
    carregarAnalisesQualidade();
    carregarDashboardQualidade();
    carregarGraficoSolidosQualidade();
}

    if (id === 'expedicao') {
        carregarProdutores();
        carregarCarretas();
        carregarOrigens();
        definirPeso();
    }
}

function obterStatusQualidade(pontos, defeitosTexto = '') {
    const total = parseFloat(
        String(pontos || '0').replace(',', '.')
    ) || 0;

    const texto = String(defeitosTexto || '');

    for (const nomeDefeito in defeitosMcCain) {
        const regex = new RegExp(`${nomeDefeito}\\s*-\\s*(\\d+)`, 'gi');

        let somaDefeito = 0;
        let match;

        while ((match = regex.exec(texto)) !== null) {
            somaDefeito += Number(match[1] || 0);
        }

        const limite = Number(defeitosMcCain[nomeDefeito].limite || 0);

        if (limite && somaDefeito > limite) {
            return {
                texto: `⛔ Reprovado — limite de ${nomeDefeito} excedido`,
                cor: '#ef4444'
            };
        }
    }

    if (total >= 40) {
        return {
            texto: '⛔ Reprovado — limite total de 40 pontos excedido',
            cor: '#ef4444'
        };
    }

    if (total >= 21) {
        return {
            texto: '🔴 Crítico',
            cor: '#ef4444'
        };
    }

    if (total >= 11) {
        return {
            texto: '🟡 Atenção',
            cor: '#facc15'
        };
    }

    return {
        texto: '🟢 Dentro do padrão',
        cor: '#22c55e'
    };
}




/* =========================
   LOGOUT
========================= */

async function logout() {
    localStorage.removeItem('usuarioLogado');
    await fetch('/logout', { method: 'POST' });
    window.location.href = '/login';
}

/* =========================
   MOTORISTA
========================= */
async function buscarMotorista() {
    const placaCampo = el('placa_cavalo', 'placaCavalo');
    const motoristaCampo = el('motorista');

    if (!placaCampo || !motoristaCampo) return;

    const placa = placaCampo.value.toUpperCase().trim();

    if (!placa) {
        motoristaCampo.value = '';
        return;
    }

    const resposta = await fetch(`/motoristas/${placa}`);
    const dados = await resposta.json();

    motoristaCampo.value = dados.motorista || '';

    const fotoBox = el('fotoBox', 'fotoCaminhaoBox');
    const foto = el('fotoMotorista', 'fotoCaminhao');

    if (fotoBox && foto) {
        if (dados.foto) {
            foto.src = dados.foto;
            fotoBox.classList.remove('escondido');
        } else {
            fotoBox.classList.add('escondido');
        }
    }

    // Puxar carretas do histórico
    try {
        const respostaExp = await fetch('/expedicoes');
        const expedicoes = await respostaExp.json();

        const dosCavalo = expedicoes.filter(e =>
            e.placa_cavalo?.toUpperCase() === placa
        );

        const select1 = el('placa_carreta1');
        const select2 = el('placa_carreta2');
        const veiculoCampo = el('veiculo');

        if (dosCavalo.length > 0) {
            // Tem histórico — usa o histórico
            const contagemC1 = {};
            dosCavalo.forEach(e => {
                if (e.placa_carreta1) {
                    contagemC1[e.placa_carreta1] = (contagemC1[e.placa_carreta1] || 0) + 1;
                }
            });

            const maisFrequenteC1 = Object.entries(contagemC1)
                .sort((a, b) => b[1] - a[1])[0]?.[0];

            const contagemC2 = {};
            dosCavalo.forEach(e => {
                if (e.placa_carreta2) {
                    contagemC2[e.placa_carreta2] = (contagemC2[e.placa_carreta2] || 0) + 1;
                }
            });

            const maisFrequenteC2 = Object.entries(contagemC2)
                .sort((a, b) => b[1] - a[1])[0]?.[0];

            if (maisFrequenteC1 && select1) select1.value = maisFrequenteC1;

            if (veiculoCampo) {
                if (maisFrequenteC2) {
                    veiculoCampo.value = 'Rodo Caçamba';
                    definirPeso();
                    if (select2) select2.value = maisFrequenteC2;
                } else {
                    veiculoCampo.value = '4º Eixo';
                    definirPeso();
                }
            }

        } else if (dados.tipo_veiculo && veiculoCampo) {
            // Sem histórico — usa o tipo cadastrado
            veiculoCampo.value = dados.tipo_veiculo;
            definirPeso();
        }

    } catch (erro) {
        console.error('Erro ao buscar histórico de carretas:', erro);
    }
}
/* =========================
   CADASTROS
========================= */

async function cadastrarMotorista(event) {
    if (event) event.preventDefault();

    const btn = event?.target;
    if (btn) btnLoading(btn, 'Cadastrando...');

    const placaCampo = el('placaCadastro', 'placa');
    const motoristaCampo = el('motoristaCadastro', 'motoristaCadastroNome');
    const fotoCampo = el('fotoCadastro', 'foto');

    if (!placaCampo || !motoristaCampo) {
        if (btn) btnRestore(btn);
        return;
    }

    const placa = placaCampo.value.toUpperCase().trim();
    const motorista = motoristaCampo.value.trim();

    if (!placa || !motorista) {
        toast('Preencha todos os campos.', 'aviso');
        if (btn) btnRestore(btn);
        return;
    }

    const tipoVeiculo = document.querySelector('input[name="tipoCavaloCadastro"]:checked')?.value || '4º Eixo';

    const formData = new FormData();
    formData.append('placa', placa);
    formData.append('motorista', motorista);
    formData.append('tipo_veiculo', tipoVeiculo);

    if (fotoCampo && fotoCampo.files[0]) {
        formData.append('foto', fotoCampo.files[0]);
    }

    const resposta = await fetch('/motoristas', {
        method: 'POST',
        body: formData
    });

    const dados = await resposta.json();

    if (dados.status === 'ok') {
        toast('Motorista cadastrado!');
        placaCampo.value = '';
        motoristaCampo.value = '';
        if (fotoCampo) fotoCampo.value = '';
        document.querySelector('input[name="tipoCavaloCadastro"][value="4º Eixo"]').checked = true;
    } else {
        toast('Erro ao cadastrar motorista.', 'erro');
    }

    if (btn) btnRestore(btn);
}
async function cadastrarProdutor() {
    const campo = el('novoProdutor', 'nomeProdutor');
    if (!campo) return;

    const nome = campo.value.trim();

    if (!nome) {
        toast('Digite o produtor.', 'aviso');
        return;
    }

    const resposta = await fetch('/produtores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome })
    });

    const dados = await resposta.json();

    if (dados.status === 'ok') {
        toast('Produtor cadastrado!')
        campo.value = '';
        carregarProdutores();
    } else {
        toast('Erro ao cadastrar produtor.', 'erro')
    }
}

async function carregarProdutores() {
    const resposta = await fetch('/produtores');
    const produtores = await resposta.json();

    const select = el('produtor');
    if (!select) return;

    const valorAtual = select.value;

    select.innerHTML = `<option value="">Selecione</option>`;

    produtores.forEach(p => {
        select.innerHTML += `<option value="${p.nome}">${p.nome}</option>`;
    });

    select.value = valorAtual;
}

async function cadastrarCarreta() {
    const campo = el('novaCarreta', 'placaCarretaCadastro');
    if (!campo) return;

    const placa = campo.value.toUpperCase().trim();

    if (!placa) {
        toast('Digite a placa.', 'aviso');
        return;
    }

    const resposta = await fetch('/carretas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa })
    });

    const dados = await resposta.json();

    if (dados.status === 'ok') {
        toast('Carreta cadastrada!')
        campo.value = '';
        carregarCarretas();
    } else {
        toast('Erro ao cadastrar carreta.', 'erro')
    }
}

async function carregarCarretas() {
    const resposta = await fetch('/carretas');
    const carretas = await resposta.json();

    const select1 = el('placa_carreta1', 'placaCarreta1');
    const select2 = el('placa_carreta2', 'placaCarreta2');
    const cadastro1 = el('carretaCadastro1');
    const cadastro2 = el('carretaCadastro2');

    if (!select1 || !select2) return;

    const valor1 = select1.value;
    const valor2 = select2.value;

    select1.innerHTML = `<option value="">Carreta 1</option>`;
    select2.innerHTML = `<option value="">Carreta 2</option>`;
    if (cadastro1) cadastro1.innerHTML = `<option value="">Carreta padrão (4º Eixo)</option>`;
    if (cadastro2) cadastro2.innerHTML = `<option value="">Carreta padrão 2 (Rodo)</option>`;

    carretas.forEach(c => {
        select1.innerHTML += `<option value="${c.placa}">${c.placa}</option>`;
        select2.innerHTML += `<option value="${c.placa}">${c.placa}</option>`;
        if (cadastro1) cadastro1.innerHTML += `<option value="${c.placa}">${c.placa}</option>`;
        if (cadastro2) cadastro2.innerHTML += `<option value="${c.placa}">${c.placa}</option>`;
    });

    select1.value = valor1;
    select2.value = valor2;
}

/* =========================
   PESO / RODO
========================= */

function definirPeso() {
    const veiculoCampo = el('veiculo');
    const pesoCampo = el('peso');
    const carreta2 = el('placa_carreta2', 'placaCarreta2');
    const variedade2 = el('variedade2');

    if (pesoCampo) {
        pesoCampo.placeholder = 'Peso em kg conforme NF';
    }

    if (!veiculoCampo || !carreta2 || !variedade2) return;

    if (veiculoCampo.value === 'Rodo Caçamba') {
        carreta2.classList.remove('campo-extra');
        variedade2.classList.remove('campo-extra');
        carreta2.style.display = 'block';
        variedade2.style.display = 'block';
    } else {
        carreta2.classList.add('campo-extra');
        variedade2.classList.add('campo-extra');
        carreta2.style.display = 'none';
        variedade2.style.display = 'none';
        carreta2.value = '';
        variedade2.value = '';
    }
}

/* =========================
   GERAR EXPEDIÇÃO
========================= */

async function gerarRelatorio(event) {
    if (event) event.preventDefault();

    const btn = document.querySelector('#formExpedicao button[type="submit"]');
    if (btn) btnLoading(btn, '⏳ Gerando...');

    const dados = {
        produtor: el('produtor')?.value || '',
        placa_cavalo: el('placa_cavalo', 'placaCavalo')?.value || '',
        motorista: el('motorista')?.value || '',
        origem: el('origem')?.value || '',
        destino: 'McCain – Araxá/MG',
        veiculo: el('veiculo')?.value || '',
        placa_carreta1: el('placa_carreta1', 'placaCarreta1')?.value || '',
        variedade1: el('variedade1')?.value || '',
        placa_carreta2: el('placa_carreta2', 'placaCarreta2')?.value || '',
        variedade2: el('variedade2')?.value || '',
        peso: el('peso')?.value || '',
        saida: new Date().toLocaleString('pt-BR')
    };

    const resposta = await fetch('/expedicoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    });

    const retorno = await resposta.json();

    if (retorno.status === 'ok') {
        const variedadeBatata = dados.variedade2 && dados.variedade2 !== dados.variedade1
            ? `${dados.variedade1} / ${dados.variedade2}`
            : dados.variedade1;

const textoRelatorio = `
🌱 *Produtor:* ${dados.produtor}

👤 *Motorista:* ${dados.motorista}

🚛 *Cavalo:* ${dados.placa_cavalo}

🚛 *Carreta 1:* ${dados.placa_carreta1} - ${dados.variedade1}
${dados.placa_carreta2 ? `🚛 *Carreta 2:* ${dados.placa_carreta2} - ${dados.variedade2}\n` : ''}
🚚 *Veículo:* ${dados.veiculo}

🥔 *Variedade:* ${variedadeBatata}

⚖️ *Peso NF:* ${dados.peso} kg

📍 *Origem:* ${dados.origem}

🏭 *Destino:* ${dados.destino}

🕒 *Saída:* ${dados.saida}
`.trim();
        const relatorio = el('relatorioGerado');
        if (relatorio) {
            relatorio.classList.remove('relatorio-vazio');
            relatorio.innerText = textoRelatorio;
        }

        toast('Expedição cadastrada!');
        const cardImagem = document.getElementById('cardImagemExpedicao');
const cardFoto = document.getElementById('cardFotoCaminhao');
const cardInfos = document.getElementById('cardInfosExpedicao');
const btnImagem = document.getElementById('btnGerarImagem');

// Busca foto do motorista
const respostaMotorista = await fetch(`/motoristas/${dados.placa_cavalo}`);
const dadosMotorista = await respostaMotorista.json();

if (dadosMotorista.foto) {
    cardFoto.src = dadosMotorista.foto;
    cardFoto.style.display = 'block';
} else {
    cardFoto.style.display = 'none';
}

cardInfos.innerHTML = `
    <p>🌱 <strong>Produtor:</strong> ${sanitizar(dados.produtor)}</p>
    <p>👤 <strong>Motorista:</strong> ${sanitizar(dados.motorista)}</p>
    <p>🚛 <strong>Cavalo:</strong> ${sanitizar(dados.placa_cavalo)}</p>
    <p>🚛 <strong>Carreta 1:</strong> ${sanitizar(dados.placa_carreta1)} - ${sanitizar(dados.variedade1)}</p>
    ${dados.placa_carreta2 ? `<p>🚛 <strong>Carreta 2:</strong> ${sanitizar(dados.placa_carreta2)} - ${sanitizar(dados.variedade2)}</p>` : ''}
    <p>🚚 <strong>Veículo:</strong> ${sanitizar(dados.veiculo)}</p>
    <p>🥔 <strong>Variedade:</strong> ${sanitizar(variedadeBatata)}</p>
    <p>⚖️ <strong>Peso NF:</strong> ${sanitizar(dados.peso)} kg</p>
    <p>📍 <strong>Origem:</strong> ${sanitizar(dados.origem)}</p>
    <p>🏭 <strong>Destino:</strong> ${sanitizar(dados.destino)}</p>
    <p>🕒 <strong>Saída:</strong> ${sanitizar(dados.saida)}</p>
`;

cardImagem.style.display = 'block';
btnImagem.style.display = 'inline-flex';

        const form = el('formExpedicao');
        if (form) form.reset();
        definirPeso();
        carregarHistorico();
        carregarDashboard();
    } else {
        toast('Erro ao salvar.', 'erro');
    }

    if (btn) btnRestore(btn);
}
/* =========================
   HISTÓRICO
========================= */

let paginaAtual = 1;
const itensPorPagina = 20;
let dadosFiltrados = [];
let paginaAtualQualidade = 1;
const itensPorPaginaQualidade = 20;
let analisesFiltradas = [];

async function carregarHistorico() {
        mostrarLoading();

    const resposta = await fetch('/expedicoes');
    const dados = await resposta.json();

    const busca = document.getElementById('filtroBusca')?.value.toLowerCase() || '';
    const statusFiltro = document.getElementById('filtroStatus')?.value || '';
    const variedadeFiltro = document.getElementById('filtroVariedade')?.value || '';
    const dataInicio = document.getElementById('filtroDataInicio')?.value || '';
    const dataFim = document.getElementById('filtroDataFim')?.value || '';

    dadosFiltrados = dados.filter(e => {
        const textoBusca = `
            ${e.produtor || ''} ${e.motorista || ''}
            ${e.placa_cavalo || ''} ${e.placa_carreta1 || ''}
            ${e.placa_carreta2 || ''}
        `.toLowerCase();

        let dentroDoperiodo = true;
        if (dataInicio || dataFim) {
            const partesData = e.saida?.split(',')[0]?.trim().split('/');
            if (partesData && partesData.length === 3) {
                const dataSaida = new Date(
                    Number(partesData[2]),
                    Number(partesData[1]) - 1,
                    Number(partesData[0])
                );
                if (dataInicio) {
                    const inicio = new Date(dataInicio);
                    if (dataSaida < inicio) dentroDoperiodo = false;
                }
                if (dataFim) {
                    const fim = new Date(dataFim);
                    fim.setHours(23, 59, 59);
                    if (dataSaida > fim) dentroDoperiodo = false;
                }
            } else {
                dentroDoperiodo = false;
            }
            
        }

        return (
            (!busca || textoBusca.includes(busca)) &&
            (!statusFiltro || e.status === statusFiltro) &&
            (!variedadeFiltro || e.variedade1 === variedadeFiltro || e.variedade2 === variedadeFiltro) &&
            dentroDoperiodo
        );
    });

    paginaAtual = 1;
    renderizarTabela();
    esconderLoading();
}

function renderizarTabela() {
    const tabela = el('tabelaHistorico');
    if (!tabela) return;

    const total = dadosFiltrados.length;
    const totalPaginas = Math.ceil(total / itensPorPagina);
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const paginados = dadosFiltrados.slice(inicio, fim);

    tabela.innerHTML = '';

    paginados.forEach(e => {
        const temCarreta2 = !!e.placa_carreta2;

        tabela.innerHTML += `
            <tr id="linha-${e.id}">
                <td>${sanitizar(e.produtor)}</td>
                <td>${sanitizar(e.motorista)}</td>
                <td>${sanitizar(e.placa_cavalo)}</td>
                <td>${sanitizar(e.origem)}</td>
                <td>${sanitizar(e.destino)}</td>
                <td>${sanitizar(e.veiculo)}</td>
                <td>${sanitizar(e.placa_carreta1)}</td>
                <td>${sanitizar(e.variedade1)}</td>
                <td>${sanitizar(e.placa_carreta2)}</td>
                <td>${sanitizar(e.variedade2)}</td>
                <td>${sanitizar(e.peso)}</td>
                <td>${sanitizar(e.saida)}</td>
                <td>
                    <select class="status-select" data-status="${e.status || 'Em viagem'}" id="status-${e.id}"
                        onchange="atualizarQualidadeCarretas(${e.id}); this.setAttribute('data-status', this.value)">
                        <option ${e.status === 'Em viagem' ? 'selected' : ''}>Em viagem</option>
                        <option ${e.status === 'Na McCain' ? 'selected' : ''}>Na McCain</option>
                        <option ${e.status === 'Lavando' ? 'selected' : ''}>Lavando</option>
                        <option ${e.status === 'Reapresentado' ? 'selected' : ''}>Reapresentado</option>
                        <option ${e.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
                    </select>
                </td>
                <td>
                    <strong>C1</strong>
                    <select class="resultado-select" data-resultado="${e.resultado_c1 || 'Pendente'}" id="resultado-c1-${e.id}"
                        onchange="atualizarQualidadeCarretas(${e.id}); this.setAttribute('data-resultado', this.value)">
                        <option ${e.resultado_c1 === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option ${e.resultado_c1 === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                        <option ${e.resultado_c1 === 'Aprovado com Restrição' ? 'selected' : ''}>Aprovado com Restrição</option>
                        <option ${e.resultado_c1 === 'Reprovado' ? 'selected' : ''}>Reprovado</option>
                        <option ${e.resultado_c1 === 'Lavagem' ? 'selected' : ''}>Lavagem</option>
                        <option ${e.resultado_c1 === 'Aprovado após lavagem' ? 'selected' : ''}>Aprovado após lavagem</option>
                    </select>
                    <input class="motivo-input" type="text" id="motivo-c1-${e.id}"
                        value="${e.resultado_c1 === 'Aprovado' ? '' : (e.motivo_c1 || '')}"
                        placeholder="${e.resultado_c1 === 'Aprovado com Restrição' ? 'Restrição C1' : 'Motivo C1'}"
                        ${e.resultado_c1 === 'Aprovado' ? 'disabled' : ''}
                        onchange="atualizarQualidadeCarretas(${e.id})">
                </td>
                <td>
                    ${temCarreta2 ? `
                        <strong>C2</strong>
                        <select class="resultado-select" data-resultado="${e.resultado_c2 || 'Pendente'}" id="resultado-c2-${e.id}"
                            onchange="atualizarQualidadeCarretas(${e.id}); this.setAttribute('data-resultado', this.value)">
                            <option ${e.resultado_c2 === 'Pendente' ? 'selected' : ''}>Pendente</option>
                            <option ${e.resultado_c2 === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                            <option ${e.resultado_c2 === 'Aprovado com Restrição' ? 'selected' : ''}>Aprovado com Restrição</option>
                            <option ${e.resultado_c2 === 'Reprovado' ? 'selected' : ''}>Reprovado</option>
                            <option ${e.resultado_c2 === 'Lavagem' ? 'selected' : ''}>Lavagem</option>
                            <option ${e.resultado_c2 === 'Aprovado após lavagem' ? 'selected' : ''}>Aprovado após lavagem</option>
                        </select>
                        <input class="motivo-input" type="text" id="motivo-c2-${e.id}"
                            value="${e.resultado_c2 === 'Aprovado' ? '' : (e.motivo_c2 || '')}"
                            placeholder="${e.resultado_c2 === 'Aprovado com Restrição' ? 'Restrição C2' : 'Motivo C2'}"
                            ${e.resultado_c2 === 'Aprovado' ? 'disabled' : ''}
                            onchange="atualizarQualidadeCarretas(${e.id})">
                    ` : '—'}
                </td>
                <td>
                    <div class="acoes-botoes">
                        <button type="button" class="btn-editar" onclick="editarLinhaExpedicao(${e.id})">✏️ Editar</button>
                        <button type="button" class="btn-excluir" onclick="excluirExpedicao(${e.id})">🗑️ Excluir</button>
                    </div>
                </td>
            </tr>
        `;
    });

    // Paginação
    const container = document.getElementById('paginacaoExpedicoes');
    if (!container) return;

    if (totalPaginas <= 1) {
        container.innerHTML = `<span style="color:#94a3b8; font-size:13px;">${total} registro(s)</span>`;
        return;
    }

    let html = `<div class="paginacao-info">Página ${paginaAtual} de ${totalPaginas} — ${total} registro(s)</div><div class="paginacao-btns">`;

    html += `<button class="btn-pag" onclick="irPagina(1)" ${paginaAtual === 1 ? 'disabled' : ''}>«</button>`;
    html += `<button class="btn-pag" onclick="irPagina(${paginaAtual - 1})" ${paginaAtual === 1 ? 'disabled' : ''}>‹</button>`;

    for (let i = Math.max(1, paginaAtual - 2); i <= Math.min(totalPaginas, paginaAtual + 2); i++) {
        html += `<button class="btn-pag ${i === paginaAtual ? 'ativo' : ''}" onclick="irPagina(${i})">${i}</button>`;
    }

    html += `<button class="btn-pag" onclick="irPagina(${paginaAtual + 1})" ${paginaAtual === totalPaginas ? 'disabled' : ''}>›</button>`;
    html += `<button class="btn-pag" onclick="irPagina(${totalPaginas})" ${paginaAtual === totalPaginas ? 'disabled' : ''}>»</button>`;
    html += `</div>`;

    container.innerHTML = html;
}

function irPagina(pagina) {
    paginaAtual = pagina;
    renderizarTabela();
}

function limparFiltrosRelatorios() {
    document.getElementById('filtroBusca').value = '';
    document.getElementById('filtroStatus').value = '';
    document.getElementById('filtroVariedade').value = '';
    document.getElementById('filtroDataInicio').value = '';
    document.getElementById('filtroDataFim').value = '';
    carregarHistorico();
}
/* =========================
   QUALIDADE POR CARRETA
========================= */

async function atualizarQualidadeCarretas(id) {
    const status = el(`status-${id}`)?.value || '';

    const resultado_c1 = el(`resultado-c1-${id}`)?.value || 'Pendente';
    const motivoC1Campo = el(`motivo-c1-${id}`);
    let motivo_c1 = motivoC1Campo?.value || '';

    if (resultado_c1 === 'Aprovado') {
        motivo_c1 = '';

        if (motivoC1Campo) {
            motivoC1Campo.value = '';
            motivoC1Campo.disabled = true;
            motivoC1Campo.placeholder = 'Motivo C1';
        }
    } else if (motivoC1Campo) {
        motivoC1Campo.disabled = false;
        motivoC1Campo.placeholder =
            resultado_c1 === 'Aprovado com Restrição'
                ? 'Restrição C1'
                : 'Motivo C1';
    }

    const resultado_c2 = el(`resultado-c2-${id}`)?.value || '';
    const motivoC2Campo = el(`motivo-c2-${id}`);
    let motivo_c2 = motivoC2Campo?.value || '';

    if (resultado_c2 === 'Aprovado') {
        motivo_c2 = '';

        if (motivoC2Campo) {
            motivoC2Campo.value = '';
            motivoC2Campo.disabled = true;
            motivoC2Campo.placeholder = 'Motivo C2';
        }
    } else if (motivoC2Campo) {
        motivoC2Campo.disabled = false;
        motivoC2Campo.placeholder =
            resultado_c2 === 'Aprovado com Restrição'
                ? 'Restrição C2'
                : 'Motivo C2';
    }

    const resposta = await fetch(`/expedicoes/${id}/qualidade-carretas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status,
            resultado_c1,
            motivo_c1,
            resultado_c2,
            motivo_c2
        })
    });

    const dados = await resposta.json();

    if (dados.status === 'ok') {
        carregarDashboard();
    }
}

/* =========================
   EXCLUIR
========================= */

async function excluirExpedicao(id) {
   const confirmar = await confirmarDialog('Excluir expedição?');

    if (!confirmar) return;

    const resposta = await fetch(`/expedicoes/${id}`, {
        method: 'DELETE'
    });

    const dados = await resposta.json();

    if (dados.status === 'ok') {
        carregarHistorico();
        carregarDashboard();
    }
}

/* =========================
   DASHBOARD
========================= */

let graficoExpedicoes = null;
let graficoStatus = null;
let chartQualidade = null;
let graficoProdutores = null;
let graficoExpedicoesMes = null; 

function animarNumero(id, valorFinal, sufixo = '') {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    const numeroFinal = Number(valorFinal) || 0;
    let atual = 0;
    const duracao = 700;
    const passos = 30;
    const incremento = numeroFinal / passos;

    const intervalo = setInterval(() => {
        atual += incremento;

        if (atual >= numeroFinal) {
            atual = numeroFinal;
            clearInterval(intervalo);
        }

        elemento.innerText = `${Math.round(atual).toLocaleString('pt-BR')}${sufixo}`;
    }, duracao / passos);
}


async function carregarDashboard() {
        mostrarLoading();

    try {
        const resposta = await fetch('/dashboard');
        const dados = await resposta.json();

        const totalExpedicoes = dados.totalExpedicoes || 0;
        const pesoTotal = dados.pesoEstimadoTotal || 0;
        const taxaAprovacao = dados.taxaAprovacao || 0;
        const taxaReprovacao = dados.taxaReprovacao || 0;
        const aprovados = dados.aprovados || 0;
        const reprovados = dados.reprovados || 0;
        const restricao = dados.restricao || 0;

        animarNumero('totalCarretas', totalExpedicoes);
        animarNumero('totalBags', pesoTotal, ' kg');
        animarNumero('taxaAprovacao', taxaAprovacao, '%');
        animarNumero('taxaReprovacao', taxaReprovacao, '%');
        animarNumero('totalAprovados', aprovados);
        animarNumero('totalRestricao', restricao);
        animarNumero('totalReprovados', reprovados);

        const totalAprovadosResumo = document.getElementById('totalAprovadosResumo');
        const totalRestricaoResumo = document.getElementById('totalRestricaoResumo');
        const totalReprovadosResumo = document.getElementById('totalReprovadosResumo');

        if (totalAprovadosResumo) totalAprovadosResumo.innerText = aprovados;
        if (totalRestricaoResumo) totalRestricaoResumo.innerText = restricao;
        if (totalReprovadosResumo) totalReprovadosResumo.innerText = reprovados;

        await carregarGraficoDashboard(totalExpedicoes);
        await carregarGraficoQualidade(aprovados, reprovados, taxaAprovacao, restricao);
        await carregarGraficoStatus();

   } catch (erro) {
        console.error('Erro ao carregar dashboard:', erro);
    } finally {
        esconderLoading();
    }
}
  const glowLinePlugin = {
    id: 'glowLine',

    beforeDatasetDraw(chart, args, pluginOptions) {
        const { ctx } = chart;

        ctx.save();

        ctx.shadowColor = pluginOptions.glowColor || '#21ff9d';
        ctx.shadowBlur = pluginOptions.blur || 18;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    },

    afterDatasetDraw(chart) {
        chart.ctx.restore();
    }
};

if (typeof Chart !== 'undefined') {
    Chart.register(glowLinePlugin);
}



async function carregarGraficoDashboard() {
    const canvas = document.getElementById('graficoExpedicoes');
    if (!canvas || typeof Chart === 'undefined') return;

    const resposta = await fetch('/expedicoes');
    const expedicoes = await resposta.json();

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hoje = new Date();

    const labels = [];
    const dadosGrafico = [];

    for (let i = 6; i >= 0; i--) {
        const data = new Date();
        data.setDate(hoje.getDate() - i);

        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();

        const dataFormatada = `${dia}/${mes}/${ano}`;

        labels.push(diasSemana[data.getDay()]);

        const totalDia = expedicoes.filter(e =>
            e.saida && e.saida.includes(dataFormatada)
        ).length;

        dadosGrafico.push(totalDia);
    }

    if (graficoExpedicoes) graficoExpedicoes.destroy();

    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, 'rgba(33,255,157,0.42)');
    gradient.addColorStop(0.45, 'rgba(124,58,237,0.18)');
    gradient.addColorStop(1, 'rgba(33,255,157,0.01)');

    graficoExpedicoes = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
           datasets: [{
    label: 'Expedições',
    data: dadosGrafico,
    borderColor: '#21ff9d',
                backgroundColor: gradient,
                fill: true,
                tension: 0.48,
                borderWidth: 4,
                pointRadius: 6,
                pointHoverRadius: 9,
                pointBackgroundColor: '#7c3aed',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 3,
                pointHoverBackgroundColor: '#21ff9d',
                pointHoverBorderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1300,
                easing: 'easeOutQuart'
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(33,255,157,0.35)',
                    borderWidth: 1,
                    padding: 14,
                    displayColors: false,
                    callbacks: {
                        label: ctx => ` ${ctx.raw} expedição(ões)`
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#a5b4fc',
                        font: { size: 13, weight: '600' }
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.04)'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        precision: 0,
                        font: { size: 12 }
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    }
                }
            }
        }
    });
}

async function carregarGraficoStatus() {
    const canvas = document.getElementById('graficoStatus');
    if (!canvas || typeof Chart === 'undefined') return;

    const resposta = await fetch('/expedicoes');
    const expedicoes = await resposta.json();

    const status = {
        'Em viagem': 0,
        'Na McCain': 0,
        'Lavando': 0,
        'Reapresentado': 0,
        'Finalizado': 0
    };

    expedicoes.forEach(e => {
        if (status[e.status] !== undefined) status[e.status]++;
    });

    if (graficoStatus) graficoStatus.destroy();

    const ctx = canvas.getContext('2d');

    graficoStatus = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(status),
            datasets: [{
                label: 'Status',
                data: Object.values(status),
                backgroundColor: [
                    'rgba(59,130,246,0.85)',
                    'rgba(139,92,246,0.85)',
                    'rgba(250,204,21,0.85)',
                    'rgba(251,113,133,0.85)',
                    'rgba(34,197,94,0.85)'
                ],
                borderColor: [
                    '#60a5fa',
                    '#a78bfa',
                    '#fde047',
                    '#fb7185',
                    '#4ade80'
                ],
                borderWidth: 1,
                borderRadius: 16,
                borderSkipped: false,
                barThickness: 34
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1200,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(124,58,237,0.45)',
                    borderWidth: 1,
                    padding: 14,
                    displayColors: false,
                    callbacks: {
                        label: ctx => ` ${ctx.raw} carga(s)`
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#a5b4fc',
                        font: { size: 12, weight: '600' }
                    },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        precision: 0
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    }
                }
            }
        }
    });
}

async function carregarGraficoQualidade(aprovados, reprovados, percentual, restricao = 0) {
    const canvas = document.getElementById('graficoQualidade');
    if (!canvas || typeof Chart === 'undefined') return;

    if (chartQualidade) chartQualidade.destroy();

    chartQualidade = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: [
                'Aprovados',
                'Aprovado c/ Restrição',
                'Reprovados'
            ],
            datasets: [{
                data: [
                    aprovados || 0,
                    restricao || 0,
                    reprovados || 0
                ],
                backgroundColor: [
                    '#21ff9d',
                    '#38bdf8',
                    '#ff3c64'
                ],
                borderColor: '#151827',
                borderWidth: 6,
                hoverOffset: 16,
                spacing: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '76%',
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1200,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(255,255,255,0.18)',
                    borderWidth: 1,
                    padding: 14,
                    displayColors: true,
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.raw}`
                    }
                }
            }
        }
    });

    const centro = document.getElementById('taxaAprovacaoCircle');
    if (centro) centro.innerText = `${percentual || 0}%`;
}
const defeitosMcCain = {
    "Danos Mecânicos": {
        dimensao: "Diâmetro",
        opcoes: [
            { texto: "5mm - 15mm", pontos: 1 },
            { texto: "16mm - 30mm", pontos: 2 },
            { texto: "> 30mm", pontos: 3 }
        ],
        limite: 20
    },

    "Nematóides": {
        dimensao: "Diâmetro",
        opcoes: [
            { texto: "5mm - 15mm", pontos: 1 },
            { texto: "16mm - 30mm", pontos: 2 },
            { texto: "> 30mm", pontos: 3 }
        ],
        limite: 10
    },

    "Danos por Insetos": {
        dimensao: "Profundidade",
        opcoes: [
            { texto: "> 10mm", pontos: 3 }
        ],
        limite: 10
    },

    "Rachadura": {
        dimensao: "Comp./Prof.",
        opcoes: [
            { texto: "> 1/3 tub 5mm - 10mm", pontos: 2 },
            { texto: "> 1/3 tub > 10mm", pontos: 3 }
        ],
        limite: 10
    },

    "Embonecamento": {
        dimensao: "Comp./Ângulo",
        opcoes: [
            { texto: ">20mm < 90°", pontos: 3 }
        ],
        limite: 10
    },

    "Translúcidas": {
        dimensao: "Comprimento",
        opcoes: [
            { texto: "< 10mm", pontos: 2 }
        ],
        limite: 10
    },

    "Verde": {
        dimensao: "Comprimento",
        opcoes: [
            { texto: "10mm - 20mm", pontos: 1 },
            { texto: "21mm - 30mm", pontos: 2 },
            { texto: "> 30mm", pontos: 3 }
        ],
        limite: 5
    },

    "Sarna profunda": {
        dimensao: "Comprimento",
        opcoes: [
            { texto: "10mm - 20mm", pontos: 1 },
            { texto: "21mm - 30mm", pontos: 2 },
            { texto: "> 30mm", pontos: 3 }
        ],
        limite: 5
    },

    "Sarna superficial": {
        dimensao: "Diâmetro",
        opcoes: [
            { texto: "10mm - 20mm", pontos: 1 },
            { texto: "21mm - 30mm", pontos: 2 },
            { texto: "> 30mm", pontos: 3 }
        ],
        limite: 10
    },

    "Podridão Bacteriana": {
        dimensao: "Unidade",
        opcoes: [
            { texto: "unidade", pontos: 9 }
        ],
        limite: 9
    },

    "Podridão Seca": {
        dimensao: "Unidade",
        opcoes: [
            { texto: "unidade", pontos: 9 }
        ],
        limite: 9
    },

    "Brotação Externa": {
        dimensao: "Comprimento",
        opcoes: [
            { texto: "#=1 5mm - 10mm", pontos: 1 },
            { texto: "#=1 > 10mm", pontos: 2 },
            { texto: "#=1 > 15mm", pontos: 3 }
        ],
        limite: 10
    },

    "Brotação Interna": {
        dimensao: "Comprimento",
        opcoes: [
            { texto: "5mm - 10mm", pontos: 2 },
            { texto: "> 10mm", pontos: 3 }
        ],
        limite: 10
    },

    "Coração-Preto": {
        dimensao: "Diâmetro",
        opcoes: [
            { texto: "16mm - 30mm", pontos: 2 },
            { texto: "> 30mm", pontos: 3 }
        ],
        limite: 10
    },

    "Coração-Oco": {
        dimensao: "Diâmetro",
        opcoes: [
            { texto: "> 15mm", pontos: 3 }
        ],
        limite: 10
    },

    "PLRV": {
        dimensao: "Comprimento",
        opcoes: [
            { texto: "20mm - 30mm", pontos: 2 },
            { texto: "> 30mm", pontos: 3 }
        ],
        limite: 10
    },

    "Queimadas": {
        dimensao: "Diâmetro",
        opcoes: [
            { texto: "5mm - 15mm", pontos: 1 },
            { texto: "16mm - 30mm", pontos: 2 },
            { texto: "> 30mm", pontos: 3 }
        ],
        limite: 10
    }
};

/* =========================
   WHATSAPP / COPIAR
========================= */

function copiarRelatorio() {
    const relatorio = el('relatorioGerado');

    if (!relatorio || relatorio.classList.contains('relatorio-vazio')) {
        toast('Gere um relatório primeiro.', 'aviso')
        return;
    }

    navigator.clipboard.writeText(relatorio.innerText);
    toast('Relatório copiado!')
}

function abrirWhatsapp() {
    window.open('https://web.whatsapp.com/', '_blank');
}

/* =========================
   START
========================= */

window.onload = async () => {
    try {
        await carregarProdutores();
        await carregarCarretas();

        if (typeof carregarOrigens === 'function') {
            await carregarOrigens();
        }

        await carregarHistorico();
        await carregarDashboard();

        if (usuarioLogado.tipo === 'master' && typeof carregarUsuarios === 'function') {
            await carregarUsuarios();
        }

        if (typeof definirPeso === 'function') {
            definirPeso();
        }

        document.getElementById('filtroBusca')
            ?.addEventListener('input', carregarHistorico);

        document.getElementById('filtroStatus')
            ?.addEventListener('change', carregarHistorico);

        document.getElementById('filtroVariedade')
            ?.addEventListener('change', carregarHistorico);

        document.getElementById('filtroDataInicio')
            ?.addEventListener('change', carregarHistorico);

        document.getElementById('filtroDataFim')
            ?.addEventListener('change', carregarHistorico);

    } catch (erro) {
        console.error('Erro ao iniciar sistema:', erro);
    }
};

async function salvarAnaliseQualidade() {
    const btn = document.querySelector('button[onclick="salvarAnaliseQualidade()"]');
    if (btn) btnLoading(btn, '⏳ Salvando...');

    const resultado = document.getElementById('q_resultado');
    const formData = new FormData();

    formData.append('variedade', document.getElementById('q_variedade')?.value || '');
    formData.append('solidos', document.getElementById('q_solidos')?.value || '');
    formData.append('peso_agua', document.getElementById('q_peso_agua')?.value || '');
    const tipoAmostragem = document.querySelector('input[name="tipoAmostragem"]:checked')?.value || 'carga';
    const placa = tipoAmostragem === 'campo'
    ? document.getElementById('q_num_identificacao')?.value || ''
    : document.getElementById('q_placa')?.value || '';
formData.append('placa', placa);
formData.append('tipo_amostragem', tipoAmostragem);
    formData.append('peso_total', document.getElementById('q_peso_total')?.value || '');
    formData.append('peso_lavado', document.getElementById('q_peso_lavado')?.value || '');
    formData.append('fazenda', document.getElementById('q_fazenda')?.value || '');
    formData.append('temperatura_agua', document.getElementById('q_temperatura_agua')?.value || '');
    formData.append('temperatura_media', document.getElementById('q_temperatura_media')?.value || '');

    const frituraTipo = document.getElementById('q_fritura_tipo')?.value || '';
    const frituraQuantidade = document.getElementById('q_fritura_quantidade')?.value || '';

    formData.append('fritura', frituras.map(item => `${item.tipo} - ${item.quantidade} palitos`).join(' | '));
    formData.append('classificacao_fritura', frituraTipo);
    formData.append('quantidade_palitos', frituraQuantidade);

    formData.append('diametro_35', document.getElementById('q_diametro_35')?.value || '');
    formData.append('diametro_35_45', document.getElementById('q_diametro_35_45')?.value || '');
    formData.append('diametro_45', document.getElementById('q_diametro_45')?.value || '');

    formData.append('menos75_qtd', document.getElementById('q_menos75_qtd')?.value || '');
    formData.append('menos75_peso', document.getElementById('q_menos75_peso')?.value || '');
    formData.append('mais75_qtd', document.getElementById('q_mais75_qtd')?.value || '');
    formData.append('mais75_peso', document.getElementById('q_mais75_peso')?.value || '');
    formData.append('mais100_qtd', document.getElementById('q_mais100_qtd')?.value || '');
    formData.append('mais100_peso', document.getElementById('q_mais100_peso')?.value || '');
    formData.append('mais150_qtd', document.getElementById('q_mais150_qtd')?.value || '');
    formData.append('mais150_peso', document.getElementById('q_mais150_peso')?.value || '');

    formData.append('defeito', document.getElementById('q_defeito')?.value || '');
    formData.append('pontos', document.getElementById('q_pontos')?.value || '');

    const foto = document.getElementById('q_foto_analise')?.files[0];
    if (foto) formData.append('foto_analise', foto);

    try {
        const url = analiseEditandoId
            ? `/analises-qualidade/${analiseEditandoId}`
            : '/analises-qualidade';

        const metodo = analiseEditandoId ? 'PUT' : 'POST';

        const resposta = await fetch(url, {
            method: metodo,
            body: formData
        });

 if (!resposta.ok) throw new Error('Erro ao salvar análise');

// Busca a análise mais recente para gerar PDF completo automaticamente
const todasAnalises = await fetch('/analises-qualidade').then(r => r.json());
const analiseSalva = todasAnalises[0];

if (analiseSalva) {
    verDetalhesQualidade(analiseSalva);
    await new Promise(r => setTimeout(r, 800));
    await gerarPDFQualidade();
}

await carregarAnalisesQualidade();
analiseEditandoId = null;
toast('Análise salva e PDF enviado!');

    } catch (erro) {
        console.error('ERRO AO SALVAR ANÁLISE:', erro);
        toast('Erro ao salvar análise.', 'erro');
    } finally {
        if (btn) btnRestore(btn);
    }
}

async function carregarAnalisesQualidade() {
        mostrarLoading();
    const tabela = document.getElementById('tabelaQualidade');
    if (!tabela) return;

    tabela.innerHTML = `<tr><td colspan="7">Carregando...</td></tr>`;

    try {
        const resposta = await fetch('/analises-qualidade');
        if (!resposta.ok) throw new Error('Erro ao buscar análises');

        analisesFiltradas = await resposta.json();

        if (!analisesFiltradas.length) {
            tabela.innerHTML = `<tr><td colspan="7">Nenhuma análise encontrada.</td></tr>`;
            return;
        }

        paginaAtualQualidade = 1;
        renderizarTabelaQualidade();

   } catch (erro) {
        console.error(erro);
        tabela.innerHTML = `<tr><td colspan="7">Erro ao carregar análises.</td></tr>`;
    } finally {
        esconderLoading();
    }
}


function renderizarTabelaQualidade() {
    const tabela = document.getElementById('tabelaQualidade');
    if (!tabela) return;

    const total = analisesFiltradas.length;
    const totalPaginas = Math.ceil(total / itensPorPaginaQualidade);
    const inicio = (paginaAtualQualidade - 1) * itensPorPaginaQualidade;
    const paginados = analisesFiltradas.slice(inicio, inicio + itensPorPaginaQualidade);

    tabela.innerHTML = '';

    paginados.forEach(item => {
        tabela.innerHTML += `
            <tr>
                <td>${sanitizar(item.placa) || '-'}</td>
                <td>${sanitizar(item.variedade) || '-'}</td>
                <td>${sanitizar(item.solidos) || '-'}</td>
                <td>${sanitizar(item.peso_agua) || '-'}</td>
                <td>${sanitizar(item.peso_total) || '-'}</td>
                <td>${new Date(item.criado_em).toLocaleString('pt-BR')}</td>
                <td>
                    <div class="acoes-botoes">
                        <button type="button" class="btn-ver-analise"
                            onclick='verDetalhesQualidade(${JSON.stringify(item)})'>
                            👁️ Ver
                        </button>
                        <button type="button" class="btn-editar"
                            onclick='editarAnaliseQualidade(${JSON.stringify(item)})'>
                            ✏️ Editar
                        </button>
                        <button type="button" class="btn-excluir"
                            onclick="excluirAnaliseQualidade(${item.id})">
                            🗑️ Excluir
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    const container = document.getElementById('paginacaoQualidade');
    if (!container) return;

    if (totalPaginas <= 1) {
        container.innerHTML = `<span style="color:#94a3b8; font-size:13px;">${total} análise(s)</span>`;
        return;
    }

    let html = `<div class="paginacao-info">Página ${paginaAtualQualidade} de ${totalPaginas} — ${total} análise(s)</div><div class="paginacao-btns">`;

    html += `<button class="btn-pag" onclick="irPaginaQualidade(1)" ${paginaAtualQualidade === 1 ? 'disabled' : ''}>«</button>`;
    html += `<button class="btn-pag" onclick="irPaginaQualidade(${paginaAtualQualidade - 1})" ${paginaAtualQualidade === 1 ? 'disabled' : ''}>‹</button>`;

    for (let i = Math.max(1, paginaAtualQualidade - 2); i <= Math.min(totalPaginas, paginaAtualQualidade + 2); i++) {
        html += `<button class="btn-pag ${i === paginaAtualQualidade ? 'ativo' : ''}" onclick="irPaginaQualidade(${i})">${i}</button>`;
    }

    html += `<button class="btn-pag" onclick="irPaginaQualidade(${paginaAtualQualidade + 1})" ${paginaAtualQualidade === totalPaginas ? 'disabled' : ''}>›</button>`;
    html += `<button class="btn-pag" onclick="irPaginaQualidade(${totalPaginas})" ${paginaAtualQualidade === totalPaginas ? 'disabled' : ''}>»</button>`;
    html += `</div>`;

    container.innerHTML = html;
}

function irPaginaQualidade(pagina) {
    paginaAtualQualidade = pagina;
    renderizarTabelaQualidade();
}
function numero(valor) {
    return parseFloat(String(valor || '0').replace(',', '.')) || 0;
}

function formatarNumero(valor) {
    return Number(valor || 0).toFixed(3).replace('.', ',');
}

function formatarPercentual(valor) {
    return (Number(valor || 0) * 100).toFixed(2).replace('.', ',') + '%';
}

function verDetalhesQualidade(item) {
    const pesoTotal = numero(item.peso_total);

    const porcentagem = (peso) => {
        if (!pesoTotal) return '0,00%';
        return formatarPercentual(numero(peso) / pesoTotal);
    };

    const diametro35 = numero(item.diametro_35);
    const diametro3545 = numero(item.diametro_35_45);
    const diametro45 = numero(item.diametro_45);

    const menos75Qtd = numero(item.menos75_qtd);
    const menos75Peso = numero(item.menos75_peso);

    const mais75Qtd = numero(item.mais75_qtd) + numero(item.mais100_qtd) + numero(item.mais150_qtd);
    const mais75Peso = numero(item.mais75_peso) + numero(item.mais100_peso) + numero(item.mais150_peso);

    const mais100Qtd = numero(item.mais100_qtd) + numero(item.mais150_qtd);
    const mais100Peso = numero(item.mais100_peso) + numero(item.mais150_peso);

    const mais150Qtd = numero(item.mais150_qtd);
    const mais150Peso = numero(item.mais150_peso);

    const resultado = document.getElementById('q_resultado');
    resultado.classList.remove('relatorio-vazio');
    
    const status = obterStatusQualidade(item.pontos, item.defeito);    
    resultado.innerHTML = `
    <div style="display:flex; gap:30px; align-items:flex-start; flex-wrap:wrap;">

        <div style="flex:1; min-width:320px;">
            <h3>🔬 Detalhes da análise</h3>
        
            <p><strong>Fazenda:</strong> ${item.fazenda || '-'}</p>
            <p><strong>Placa:</strong> ${item.placa || '-'}</p>
            <p><strong>Variedade:</strong> ${item.variedade || '-'}</p>
            <p><strong>Sólidos:</strong> ${item.solidos || '-'}</p>
            <p><strong>Temperatura da água:</strong> ${item.temperatura_agua || '-'}</p>
            <p><strong>Temperatura média:</strong> ${item.temperatura_media || '-'}</p>
            ${montarBlocoFrituraPDF(item.fritura)}
            <p><strong>Peso na água:</strong> ${item.peso_agua || '-'}</p>

            <br>

            <h4>📏 Classificação por diâmetro</h4>
            <p><strong>&lt;35:</strong> NA | ${formatarNumero(diametro35)} kg | ${porcentagem(diametro35)}</p>
            <p><strong>35-45mm:</strong> NA | ${formatarNumero(diametro3545)} kg | ${porcentagem(diametro3545)}</p>
            <p><strong>&gt;45mm:</strong> NA | ${formatarNumero(diametro45)} kg | ${porcentagem(diametro45)}</p>

            <br>

            <h4>📐 Classificação por comprimento</h4>
            <p><strong>&lt;75mm:</strong> ${menos75Qtd} un | ${formatarNumero(menos75Peso)} kg | ${porcentagem(menos75Peso)}</p>
            <p><strong>&gt;75mm:</strong> ${mais75Qtd} un | ${formatarNumero(mais75Peso)} kg | ${porcentagem(mais75Peso)}</p>
            <p><strong>&gt;100mm:</strong> ${mais100Qtd} un | ${formatarNumero(mais100Peso)} kg | ${porcentagem(mais100Peso)}</p>
            <p><strong>&gt;150mm:</strong> ${mais150Qtd} un | ${formatarNumero(mais150Peso)} kg | ${porcentagem(mais150Peso)}</p>

            <br>

            <h4>⚠️ Defeitos</h4>
            <p><strong>Identificado:</strong> ${item.defeito || '-'}</p>
            <div style="
                margin: 18px 0;
                padding: 14px 18px;
                border-radius: 16px;
                background: rgba(255,255,255,.04);
                border-left: 5px solid ${status.cor};
                font-weight: 700;
                color: ${status.cor};
                font-size: 16px;
            ">
                ${status.texto}
            </div>
                
                <p><strong>Pontos:</strong> ${item.pontos || '0'}</p>
            </div>

            <div style="width:430px; max-width:100%;">
                <h4>📷 Foto da análise / defeito</h4>

                ${
                    item.foto_analise
                        ? `
                            <img src="${item.foto_analise}" style="
                                width:100%;
                                max-height:580px;
                                object-fit:contain;
                                border-radius:18px;
                                border:2px solid rgba(255,255,255,.10);
                                box-shadow:0 0 25px rgba(0,0,0,.35);
                                background:#111827;
                            ">
                        `
                        : `
                            <div style="
                                padding:35px;
                                border-radius:18px;
                                background:rgba(255,255,255,.04);
                                border:1px solid rgba(255,255,255,.08);
                                text-align:center;
                            ">
                                Nenhuma foto enviada.
                            </div>
                        `
                }
            </div>

        </div>
    `;

    resultado.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function excluirAnaliseQualidade(id) {
    const confirmar = await confirmarDialog('Deseja excluir esta análise?');

    if (!confirmar) return;

    try {
        const resposta = await fetch(`/analises-qualidade/${id}`, {
            method: 'DELETE'
        });

        if (!resposta.ok) {
            throw new Error('Erro ao excluir');
        }

        toast('Análise excluída!');
        await carregarAnalisesQualidade();

    } catch (erro) {
        console.error(erro);
        toast('Erro ao excluir análise.', 'erro');
    }
}


async function gerarPDFQualidade() {
    const btn = document.querySelector('button[onclick="gerarPDFQualidade()"]');
    if (btn) btnLoading(btn, '⏳ Gerando PDF...');

    const elemento = document.getElementById('q_resultado');

    if (!elemento || elemento.classList.contains('relatorio-vazio')) {
        toast('Abra uma análise antes de gerar o PDF.', 'aviso');
        if (btn) btnRestore(btn);
        return;
    }

    const imagens = elemento.querySelectorAll('img');

    await Promise.all([...imagens].map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
        });
    }));

    const canvas = await html2canvas(elemento, {
        scale: 1,
        backgroundColor: '#111827',
        useCORS: true,
        allowTaint: true
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.5);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;

    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.setFillColor(17, 24, 39);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    const logo = new Image();
    logo.src = '/img/LOGO.jpeg';

    await new Promise(resolve => {
        logo.onload = resolve;
        logo.onerror = resolve;
    });

    pdf.addImage(logo, 'JPEG', 10, 8, 24, 24);

    const agora = new Date().toLocaleString('pt-BR');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(17);
    pdf.text('RELATÓRIO DE QUALIDADE', 42, 16);

    pdf.setFontSize(10);
    pdf.text('Furman Agronegócios • Sistema de Qualidade', 42, 23);

    pdf.setFontSize(9);
    pdf.text('Laboratorista: Luiz Aires', 42, 29);
    pdf.text('Laboratório: Palmas - PR', 42, 34);
    pdf.text(`Emitido em: ${agora}`, 42, 39);

    pdf.addImage(imgData, 'PNG', 10, 42, imgWidth, imgHeight);

    const pdfBase64 = pdf.output('datauristring');

    const placaRelatorio =
        document.querySelector('#q_resultado')?.innerText
            .match(/Placa:\s*(.*)/)?.[1]
            ?.split('\n')[0] || 'carga';

    const respostaEmail = await fetch('/enviar-relatorio-qualidade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64, placa: placaRelatorio })
    });

    const retornoEmail = await respostaEmail.json();

    if (retornoEmail.status === 'ok') {
        toast('PDF gerado e enviado por e-mail!');
    } else {
        toast('PDF gerado, mas erro ao enviar e-mail.', 'aviso');
    }

    pdf.save(`relatorio-qualidade-${placaRelatorio}.pdf`);

    if (btn) btnRestore(btn);
}


let analiseEditandoId = null;

function editarAnaliseQualidade(item) {
    analiseEditandoId = item.id;

    document.getElementById('q_variedade').value = item.variedade || '';
    document.getElementById('q_solidos').value = item.solidos || '';
    document.getElementById('q_peso_agua').value = item.peso_agua || '';
    document.getElementById('q_placa').value = item.placa || '';
    document.getElementById('q_peso_total').value = item.peso_total || '';
    document.getElementById('q_peso_lavado').value = item.peso_lavado || '';

    document.getElementById('q_diametro_35').value = item.diametro_35 || '';
    document.getElementById('q_diametro_35_45').value = item.diametro_35_45 || '';
    document.getElementById('q_diametro_45').value = item.diametro_45 || '';

    document.getElementById('q_menos75_qtd').value = item.menos75_qtd || '';
    document.getElementById('q_menos75_peso').value = item.menos75_peso || '';
    document.getElementById('q_mais75_qtd').value = item.mais75_qtd || '';
    document.getElementById('q_mais75_peso').value = item.mais75_peso || '';
    document.getElementById('q_mais100_qtd').value = item.mais100_qtd || '';
    document.getElementById('q_mais100_peso').value = item.mais100_peso || '';
    document.getElementById('q_mais150_qtd').value = item.mais150_qtd || '';
    document.getElementById('q_mais150_peso').value = item.mais150_peso || '';

    document.getElementById('q_defeito').value = item.defeito || '';
    document.getElementById('q_pontos').value = item.pontos || '';

    const resultado = document.getElementById('q_resultado');
    resultado.classList.remove('relatorio-vazio');
    resultado.innerHTML = `
        <h3>✏️ Editando análise</h3>
        <p><strong>Placa:</strong> ${item.placa || '-'}</p>
        <p>Altere os campos acima e clique em <strong>Salvar Análise</strong>.</p>
        <p><small>Se escolher uma nova foto, ela substituirá a anterior.</small></p>
    `;

    document.getElementById('qualidade').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function carregarDashboardQualidade() {
    try {

        const resposta = await fetch('/dashboard-qualidade');

        const analises = await resposta.json();

        const numero = (valor) => {
            return parseFloat(
                String(valor || '0').replace(',', '.')
            ) || 0;
        };

        const total = analises.length;

        const somaSolidos = analises.reduce(
            (acc, item) => acc + numero(item.solidos),
            0
        );

        const somaPeso = analises.reduce(
            (acc, item) => acc + numero(item.peso_total),
            0
        );

        const somaPontos = analises.reduce(
            (acc, item) => acc + numero(item.pontos),
            0
        );

        const mediaSolidos =
            total > 0
                ? (somaSolidos / total).toFixed(2)
                : '0.00';

        const mediaPeso =
            total > 0
                ? (somaPeso / total).toFixed(3)
                : '0.000';

        document.getElementById(
            'qtdAnalisesQualidade'
        ).textContent = total;

        document.getElementById(
            'mediaSolidosQualidade'
        ).textContent = `${mediaSolidos}%`;

        document.getElementById(
            'mediaPesoQualidade'
        ).textContent = mediaPeso;

        document.getElementById(
            'totalPontosQualidade'
        ).textContent = somaPontos;

    } catch (erro) {

        console.error(
            'Erro ao carregar dashboard qualidade:',
            erro
        );
    }
}

let graficoSolidosQualidade = null;
async function carregarGraficoSolidosQualidade() {
    try {

        const resposta = await fetch('/analises-qualidade');
        const analises = await resposta.json();

        const ultimas = analises.slice(0, 8).reverse();

        const labels = ultimas.map(item => item.placa || '-');

        const dados = ultimas.map(item => {
            return parseFloat(
                String(item.solidos || '0').replace(',', '.')
            ) || 0;
        });

        const ctx = document.getElementById('graficoSolidosQualidade');

        if (!ctx) return;

        if (
            graficoSolidosQualidade &&
            typeof graficoSolidosQualidade.destroy === 'function'
        ) {
            graficoSolidosQualidade.destroy();
        }

        graficoSolidosQualidade = new Chart(ctx, {

            type: 'line',

            data: {
                labels,

                datasets: [{
                    label: 'Sólidos %',
                    data: dados,

                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56,189,248,.15)',

                    borderWidth: 3,
                    tension: 0.35,
                    fill: false,

                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointHitRadius: 20,
                    pointBackgroundColor: '#38bdf8',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },

            options: {

                responsive: true,
                maintainAspectRatio: false,

                interaction: {
                    mode: 'nearest',
                    intersect: false
                },

                plugins: {

                    tooltip: {
                        enabled: true,

                        backgroundColor: 'rgba(15,23,42,0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#cbd5e1',

                        borderColor: 'rgba(56,189,248,.35)',
                        borderWidth: 1,

                        padding: 14,
                        displayColors: false,

                        callbacks: {
                            label: function(context) {
                                return `Sólidos: ${context.raw}%`;
                            }
                        }
                    },

                    legend: {
                        labels: {
                            color: '#cbd5e1'
                        }
                    }
                },

                scales: {

                    x: {
                        ticks: {
                            color: '#cbd5e1'
                        },

                        grid: {
                            color: 'rgba(255,255,255,0.04)'
                        }
                    },

                    y: {
                        ticks: {
                            color: '#cbd5e1'
                        },

                        grid: {
                            color: 'rgba(255,255,255,0.05)'
                        }
                    }
                }
            }
        });

    } catch (erro) {

        console.error(
            'Erro ao carregar gráfico de sólidos:',
            erro
        );
    }
}
let defeitosSelecionados = [];

/* =========================
   CARREGAR DEFEITOS
========================= */

function carregarDefeitosMcCain() {

    const select = document.getElementById('q_defeito_select');

    if (!select) return;

    select.innerHTML = `
        <option value="">Selecione o defeito</option>
    `;

    Object.keys(defeitosMcCain).forEach(nome => {

        select.innerHTML += `
            <option value="${nome}">
                ${nome}
            </option>
        `;
    });
}

/* =========================
   OPÇÕES DO DEFEITO
========================= */

function carregarOpcoesDefeito() {

    const defeito =
        document.getElementById('q_defeito_select').value;

    const selectOpcao =
        document.getElementById('q_opcao_defeito');

    selectOpcao.innerHTML = `
        <option value="">Selecione a dimensão/pontuação</option>
    `;

    if (!defeito || !defeitosMcCain[defeito]) return;

    defeitosMcCain[defeito].opcoes.forEach(opcao => {

        selectOpcao.innerHTML += `
            <option value="${opcao.pontos}">
                ${opcao.texto} → ${opcao.pontos} ponto(s)
            </option>
        `;
    });
}

/* =========================
   ADICIONAR DEFEITO
========================= */

function adicionarDefeitoMcCain() {

    const defeito =
        document.getElementById('q_defeito_select').value;

    const selectOpcao =
        document.getElementById('q_opcao_defeito');

    const textoOpcao =
        selectOpcao.options[
            selectOpcao.selectedIndex
        ]?.text;

    const pontos =
        parseInt(selectOpcao.value || '0');

    if (!defeito || !pontos) {

        toast('Selecione defeito e pontuação.', 'aviso');

        return;
    }

    defeitosSelecionados.push({
        defeito,
        descricao: textoOpcao,
        pontos
    });

    atualizarListaDefeitos();
}

/* =========================
   ATUALIZAR LISTA
========================= */

function atualizarListaDefeitos() {
    const lista = document.getElementById('listaDefeitosSelecionados');
    const textarea = document.getElementById('q_defeito');
    const inputPontos = document.getElementById('q_pontos');

    if (defeitosSelecionados.length === 0) {
        lista.innerHTML = 'Nenhum defeito adicionado.';
        lista.classList.add('relatorio-vazio');
        textarea.value = '';
        inputPontos.value = '0';
        return;
    }

    lista.classList.remove('relatorio-vazio');

    let totalPontos = 0;
    const somaPorDefeito = {};

    defeitosSelecionados.forEach(item => {
        totalPontos += item.pontos;

        if (!somaPorDefeito[item.defeito]) {
            somaPorDefeito[item.defeito] = 0;
        }

        somaPorDefeito[item.defeito] += item.pontos;
    });

    const reprovados = [];

    Object.keys(somaPorDefeito).forEach(defeito => {
        const limite = defeitosMcCain[defeito]?.limite || 0;
        const pontosDefeito = somaPorDefeito[defeito];

        if (limite && pontosDefeito > limite) {
            reprovados.push({
                defeito,
                pontos: pontosDefeito,
                limite
            });
        }
    });

    lista.innerHTML = '';

    defeitosSelecionados.forEach(item => {
        lista.innerHTML += `
            <div style="
                padding:12px;
                margin-bottom:10px;
                border-radius:14px;
                background:rgba(255,255,255,.04);
                border-left:4px solid #21ff9d;
            ">
                <strong>${item.defeito}</strong><br>
                ${item.descricao}

                <div style="
                    margin-top:8px;
                    color:#21ff9d;
                    font-weight:700;
                ">
                    ${item.pontos} ponto(s)
                </div>
            </div>
        `;
    });

    Object.keys(somaPorDefeito).forEach(defeito => {
        const limite = defeitosMcCain[defeito]?.limite || 0;
        const pontosDefeito = somaPorDefeito[defeito];

        lista.innerHTML += `
            <div style="
                margin-top:10px;
                padding:12px;
                border-radius:14px;
                background:${pontosDefeito > limite ? 'rgba(239,68,68,.12)' : 'rgba(33,255,157,.08)'};
                border:1px solid ${pontosDefeito > limite ? 'rgba(239,68,68,.45)' : 'rgba(33,255,157,.25)'};
                color:${pontosDefeito > limite ? '#ef4444' : '#21ff9d'};
                font-weight:800;
            ">
                ${defeito}: ${pontosDefeito}/${limite} pontos
                ${pontosDefeito > limite ? ' — REPROVADO' : ''}
            </div>
        `;
    });

    lista.innerHTML += `
        <div style="
            margin-top:18px;
            padding:14px;
            border-radius:16px;
            background:rgba(33,255,157,.08);
            border:1px solid rgba(33,255,157,.25);
            font-weight:700;
            font-size:18px;
            color:#21ff9d;
        ">
            Total geral: ${totalPontos} ponto(s)
        </div>
    `;

    if (reprovados.length > 0) {
        lista.innerHTML += `
            <div style="
                margin-top:14px;
                padding:16px;
                border-radius:18px;
                background:rgba(239,68,68,.14);
                border:1px solid rgba(239,68,68,.45);
                color:#ef4444;
                font-weight:900;
            ">
                ⛔ Reprovado por: ${reprovados.map(r => `${r.defeito} (${r.pontos}/${r.limite})`).join(', ')}
            </div>
        `;
    }

    textarea.value = defeitosSelecionados
        .map(item => `${item.defeito} - ${item.pontos} pontos`)
        .join(' / ');

    inputPontos.value = totalPontos;
}

/* =========================
   INICIAR
========================= */

document.addEventListener(
    'DOMContentLoaded',
    carregarDefeitosMcCain
);
function aplicarPermissoesUsuario() {
    if (!usuarioLogado || !usuarioLogado.tipo) return;
    const tipo = usuarioLogado.tipo;
    function esconderAbas(ids) {

    ids.forEach(id => {

        const aba = document.getElementById(id);

        if (aba) {
            aba.style.display = 'none';
        }
    });
}

if (tipo === 'visualizacao') {

    esconderAbas([
        'expedicao',
        'qualidade',
        'usuarios'
    ]);
}

    /* =========================
       LABORATÓRIO
    ========================= */

    if (tipo === 'laboratorio') {

        esconderAbas([
            'expedicao',
            'financeiro',
            'usuarios'
        ]);
    }

    /* =========================
       EXPEDIÇÃO
    ========================= */

    if (tipo === 'expedicao') {

        esconderAbas([
            'qualidade',
            'dashboardQualidade',
            'usuarios'
        ]);
    }

    /* =========================
       QUALIDADE
    ========================= */

    if (tipo === 'qualidade') {

        esconderAbas([
            'expedicao',
            'financeiro',
            'usuarios'
        ]);
    }
}

/* =========================
   ESCONDER ABAS
========================= */

function esconderAbas(ids) {

    ids.forEach(id => {

        const elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.style.display = 'none';
        }
    });
}

/* =========================
   INICIAR
========================= */

document.addEventListener(
    'DOMContentLoaded',
    aplicarPermissoesUsuario
);

async function cadastrarUsuario() {
    const usuario = document.getElementById('novoUsuario').value;
    const senha = document.getElementById('novaSenha').value;
    const tipo = document.getElementById('tipoUsuario').value;

    if (!usuario || !tipo) {
        toast('Preencha usuário e tipo.', 'aviso');
        return;
    }

    if (!usuarioEditandoId && !senha) {
        toast('Informe uma senha.', 'aviso');
        return;
    }

    const url = usuarioEditandoId
        ? `/usuarios/${usuarioEditandoId}`
        : '/usuarios';

    const metodo = usuarioEditandoId ? 'PUT' : 'POST';

    const resposta = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha, tipo })
    });

    const dados = await resposta.json();

    if (dados.status === 'ok') {
        toast(usuarioEditandoId ? 'Usuário atualizado!' : 'Usuário cadastrado!');

        usuarioEditandoId = null;

        document.getElementById('novoUsuario').value = '';
        document.getElementById('novaSenha').value = '';
        document.getElementById('tipoUsuario').value = '';

        carregarUsuarios();
    } else {
        toast('Erro ao salvar usuário.', 'erro');
    }
}

async function carregarUsuarios() {

    if (usuarioLogado.tipo !== 'master') {
        return;
    }

    const lista = document.getElementById('listaUsuarios');
    if (!lista) return;

    lista.innerHTML = `
        <div style="padding:14px; color:#94a3b8;">
            Carregando usuários...
        </div>
    `;

    try {
        const resposta = await fetch('/usuarios');

        if (!resposta.ok) {
            lista.innerHTML = `
                <div style="padding:14px; color:#ef4444;">
                    Acesso negado ou erro ao carregar usuários.
                </div>
            `;
            return;
        }

        const usuarios = await resposta.json();

        if (!Array.isArray(usuarios)) {
            lista.innerHTML = '';
            return;
        }

        lista.innerHTML = '';

        usuarios.forEach(usuario => {
            lista.innerHTML += `
                <div style="
                    background: rgba(255,255,255,.04);
                    padding: 14px;
                    border-radius: 14px;
                    margin-bottom: 12px;
                    border: 1px solid rgba(255,255,255,.08);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                ">
                    <div>
                        <strong>${sanitizar(usuario.usuario)}</strong><br>
                        <span>Tipo: ${sanitizar(usuario.tipo)}</span>
                    </div>

                    <div style="display:flex; gap:8px;">
                        <button class="btn-ver-analise" onclick='editarUsuario(${JSON.stringify(usuario)})'>
                            ✏️ Editar
                        </button>

                        <button class="btn-excluir-analise" onclick="excluirUsuario(${usuario.id})">
                            🗑️ Excluir
                        </button>
                    </div>
                </div>
            `;
        });

    } catch (erro) {
        console.error('Erro ao carregar usuários:', erro);

        lista.innerHTML = `
            <div style="padding:14px; color:#ef4444;">
                Erro ao carregar usuários.
            </div>
        `;
    }
}

let usuarioEditandoId = null;

function editarUsuario(usuario) {
    usuarioEditandoId = usuario.id;

    document.getElementById('novoUsuario').value = usuario.usuario;
    document.getElementById('novaSenha').value = '';
    document.getElementById('tipoUsuario').value = usuario.tipo;

    toast('Edite os dados e salve.', 'info');
}

async function excluirUsuario(id) {
    const confirmar = await confirmarDialog('Deseja excluir este usuário?');

    if (!confirmar) return;

    const resposta = await fetch(`/usuarios/${id}`, {
        method: 'DELETE'
    });

    const dados = await resposta.json();

    if (dados.status === 'ok') {
        toast('Usuário excluído!');
        carregarUsuarios();
    } else {
        toast('Erro ao excluir usuário.', 'erro');
    }
}

let frituras = [];

function adicionarFritura() {
    const tipo = document.getElementById('q_fritura_tipo')?.value || '';
    const quantidade = document.getElementById('q_fritura_quantidade')?.value || '';

    if (!tipo || !quantidade) {
        toast('Selecione classificação e quantidade.', 'aviso');
        return;
    }

    frituras.push({
        tipo,
        quantidade
    });

    atualizarListaFritura();

    document.getElementById('q_fritura_tipo').value = '';
    document.getElementById('q_fritura_quantidade').value = '';
}

function atualizarListaFritura() {
    const lista = document.getElementById('lista-fritura');

    const total = frituras.reduce((soma, item) => {
        return soma + Number(item.quantidade || 0);
    }, 0);

    const statusFritura = calcularStatusFritura();

    lista.innerHTML = `
        <div class="fritura-total">
            Total de palitos: <strong>${total}</strong>
        </div>

        <div class="fritura-status ${statusFritura.classe}">
            ${statusFritura.texto}
        </div>

        ${frituras.map((item, index) => `
            <div class="fritura-item fritura-${item.tipo.toLowerCase()}">
                <span>
                    ${iconeFritura(item.tipo)}
                    <strong>${item.tipo}</strong>
                    — ${item.quantidade} palitos
                </span>

                <button type="button" onclick="removerFritura(${index})">
                    Remover
                </button>
            </div>
        `).join('')}
    `;
}

function iconeFritura(tipo) {
    const icones = {
        C00: '🟢',
        C0: '🟢',
        C1: '🟡',
        C2: '🟠',
        C3: '🔴',
        C4: '🟣'
    };

    return icones[tipo] || '🍟';
}

function removerFritura(index) {
    frituras.splice(index, 1);
    atualizarListaFritura();
}

function calcularStatusFritura() {

    const total = frituras.reduce((soma, item) => {
        return soma + Number(item.quantidade || 0);
    }, 0);

    const ruins = frituras
        .filter(item => item.tipo === 'C3' || item.tipo === 'C4')
        .reduce((soma, item) => {
            return soma + Number(item.quantidade || 0);
        }, 0);

    if (total === 0) {
        return {
            texto: '',
            classe: ''
        };
    }

    const percentualRuim =
        ((ruins / total) * 100).toFixed(1);

    if (percentualRuim >= 30) {
        return {
            texto: `🔴 Alta reversão de açúcar (${percentualRuim}%)`,
            classe: 'status-ruim'
        };
    }

    if (percentualRuim >= 10) {
        return {
            texto: `🟡 Atenção na fritura (${percentualRuim}%)`,
            classe: 'status-alerta'
        };
    }

    return {
        texto: `🟢 Excelente fritura (${percentualRuim}%)`,
        classe: 'status-bom'
    };
}

function montarBlocoFrituraPDF(frituraTexto) {
    if (!frituraTexto) {
        return `<p><strong>🍟 Fritura:</strong> -</p>`;
    }

    const itens = frituraTexto
        .split('|')
        .map(item => item.trim());

    let total = 0;
    let ruins = 0;

    const resumo = itens
        .map(item => {
            const partes = item.match(/(C00|C0|C1|C2|C3|C4)\s*-\s*(\d+)/i);

            if (!partes) return '';

            const tipo = partes[1].toUpperCase();
            const qtd = Number(partes[2] || 0);

            total += qtd;

            if (tipo === 'C3' || tipo === 'C4') {
                ruins += qtd;
            }

            return `${iconeFritura(tipo)} ${tipo}: ${qtd}`;
        })
        .filter(Boolean)
        .join(' | ');

    const percentualRuim = total > 0
        ? ((ruins / total) * 100).toFixed(1)
        : '0.0';

    let status = '🟢 Excelente';
    let cor = '#22c55e';

    if (percentualRuim >= 30) {
        status = '🔴 Alta reversão';
        cor = '#ef4444';
    } else if (percentualRuim >= 10) {
        status = '🟡 Atenção';
        cor = '#facc15';
    }

    return `
        <p><strong>🍟 Fritura:</strong> ${resumo}</p>

        <p style="
            margin:4px 0 8px 0;
            padding:6px 10px;
            border-radius:10px;
            background:rgba(255,255,255,.04);
            border-left:4px solid ${cor};
            color:${cor};
            font-weight:700;
        ">
            ${status} — ${percentualRuim}% | Total: ${total} palitos
        </p>
    `;
}
async function carregarOrigens() {
    const resposta = await fetch('/origens');
    const origens = await resposta.json();

    const select = document.getElementById('origem');

    select.innerHTML = '<option value="">Origem</option>';

    origens.forEach(origem => {
        select.innerHTML += `
            <option value="${origem.nome}">
                ${origem.nome}
            </option>
        `;
    });
}
async function cadastrarOrigem() {
    const campo = document.getElementById('novaOrigem');
    const nome = campo.value.trim();

    if (!nome) {
        toast('Digite a origem.', 'aviso');
        return;
    }

    await fetch('/origens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome })
    });

    campo.value = '';
    await carregarOrigens();
}
function limparAnaliseQualidade() {
    const ids = [
        'q_variedade',
        'q_solidos',
        'q_peso_agua',
        'q_placa',
        'q_peso_total',
        'q_peso_lavado',
        'q_fazenda',
        'q_temperatura_agua',
        'q_temperatura_media',
        'q_fritura_tipo',
        'q_fritura_quantidade',
        'q_diametro_35',
        'q_diametro_35_45',
        'q_diametro_45',
        'q_menos75_qtd',
        'q_menos75_peso',
        'q_mais75_qtd',
        'q_mais75_peso',
        'q_mais100_qtd',
        'q_mais100_peso',
        'q_mais150_qtd',
        'q_mais150_peso',
        'q_defeito_select',
        'q_opcao_defeito',
        'q_defeito',
        'q_pontos',
        'q_foto_analise'
    ];

    ids.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = '';
    });

    frituras = [];
    defeitosSelecionados = [];
    analiseEditandoId = null;

    if (document.getElementById('lista-fritura')) {
        document.getElementById('lista-fritura').innerHTML = '';
    }

    if (document.getElementById('listaDefeitosSelecionados')) {
        document.getElementById('listaDefeitosSelecionados').innerHTML = 'Nenhum defeito adicionado.';
    }

    const resultado = document.getElementById('q_resultado');

    if (resultado) {
        resultado.classList.add('relatorio-vazio');
        resultado.innerHTML = 'Nenhuma análise selecionada.';
    }

    toast('Análise limpa!', 'info');
}
const tabelaSolidos = {
    153: 13.00, 154: 13.08, 155: 13.14, 156: 13.21, 157: 13.27,
    158: 13.33, 159: 13.39, 160: 13.45, 161: 13.52, 162: 13.58,
    163: 13.66, 164: 13.72, 165: 13.79, 166: 13.85, 167: 13.91,
    168: 13.97, 169: 14.03, 170: 14.10, 171: 14.18, 172: 14.24,
    173: 14.30, 174: 14.37, 175: 14.43, 176: 14.49, 177: 14.55,
    178: 14.64, 179: 14.70, 180: 14.76, 181: 14.82, 182: 14.88,
    183: 14.95, 184: 15.03, 185: 15.09, 186: 15.15, 187: 15.22,
    188: 15.28, 189: 15.34, 190: 15.42, 191: 15.49, 192: 15.55,
    193: 15.61, 194: 15.67, 195: 15.73, 196: 15.82, 197: 15.88,
    198: 15.94, 199: 16.00, 200: 16.07, 201: 16.15, 202: 16.21,
    203: 16.27, 204: 16.33, 205: 16.40, 206: 16.48, 207: 16.54,
    208: 16.60, 209: 16.67, 210: 16.73, 211: 16.81, 212: 16.87,
    213: 16.94, 214: 17.00, 215: 17.08, 216: 17.14, 217: 17.21,
    218: 17.27, 219: 17.33, 220: 17.41, 221: 17.47, 222: 17.54,
    223: 17.60, 224: 17.68, 225: 17.74, 226: 17.81, 227: 17.87,
    228: 17.95, 229: 18.01, 230: 18.08, 231: 18.14, 232: 18.22,
    233: 18.28, 234: 18.34, 235: 18.41, 236: 18.49, 237: 18.55,
    238: 18.61, 239: 18.68, 240: 18.76, 241: 18.82, 242: 18.88,
    243: 18.97, 244: 19.03, 245: 19.09, 246: 19.15, 247: 19.24,
    248: 19.30, 249: 19.36, 250: 19.44, 251: 19.51, 252: 19.57,
    253: 19.63, 254: 19.71, 255: 19.77, 256: 19.84, 257: 19.92,
    258: 19.98, 259: 20.04, 260: 20.13, 261: 20.19, 262: 20.25,
    263: 20.31, 264: 20.40, 265: 20.46, 266: 20.52, 267: 20.60,
    268: 20.67, 269: 20.73, 270: 20.81, 271: 20.87, 272: 20.94,
    273: 21.02, 274: 21.08, 275: 21.14, 276: 21.23, 277: 21.29,
    278: 21.35, 279: 21.43, 280: 21.49, 281: 21.58, 282: 21.64,
    283: 21.70, 284: 21.78, 285: 21.85, 286: 21.91, 287: 21.99,
    288: 22.05, 289: 22.12, 290: 22.20, 291: 22.26, 292: 22.34,
    293: 22.41, 294: 22.47, 295: 22.55, 296: 22.61, 297: 22.70,
    298: 22.76, 299: 22.82, 300: 22.90, 301: 22.97, 302: 23.03,
    303: 23.11, 304: 23.17, 305: 23.26, 306: 23.32, 307: 23.38,
    308: 23.46, 309: 23.53, 310: 23.61, 311: 23.67, 312: 23.75
};

function calcularSolidosAutomatico() {
    const campos = ['q_solido_1', 'q_solido_2', 'q_solido_3'];

    const pesos = campos
        .map(id => Number(document.getElementById(id)?.value || 0))
        .filter(valor => valor > 0);

    if (pesos.length === 0) {
        document.getElementById('q_peso_agua').value = '';
        document.getElementById('q_solidos').value = '';
        return;
    }

    const solidos = pesos.map(peso => tabelaSolidos[peso]);

    if (solidos.some(valor => valor === undefined)) {
        document.getElementById('q_solidos').value = 'Peso fora da tabela';
        return;
    }

    const mediaPeso =
        pesos.reduce((soma, valor) => soma + valor, 0) / pesos.length;

    const mediaSolidos =
        solidos.reduce((soma, valor) => soma + valor, 0) / solidos.length;

    document.getElementById('q_peso_agua').value =
        mediaPeso.toFixed(0);

    document.getElementById('q_solidos').value =
        mediaSolidos.toFixed(2).replace('.', ',') + '%';
}

document
    .getElementById('inputFotoPerfil')
    ?.addEventListener('change', async function () {

        const arquivo = this.files[0];

        if (!arquivo) return;

        const formData = new FormData();
        formData.append('foto', arquivo);

        const resposta = await fetch('/perfil/foto', {
            method: 'POST',
            body: formData
        });

        const dados = await resposta.json();

        if (dados.status === 'ok') {
            document.getElementById('fotoPerfil').src = dados.foto;

            usuarioLogado.foto = dados.foto;

            localStorage.setItem(
                'usuario',
                JSON.stringify(usuarioLogado)
            );

            toast('Foto atualizada!');
        }
    });

    const fotoCadastro = document.getElementById('fotoCadastro');

if (fotoCadastro) {
    fotoCadastro.addEventListener('change', function () {

        const nome = this.files.length
            ? this.files[0].name
            : 'Nenhuma foto selecionada';

        document.getElementById('nomeArquivoFoto').textContent = nome;
    });
}
let auditoriaDados = [];

async function carregarAuditoria() {
    const corpo = document.getElementById('tabela-auditoria');
    if (!corpo) return;

    corpo.innerHTML = `
        <tr>
            <td colspan="7">Carregando auditoria...</td>
        </tr>
    `;

    try {
        const resposta = await fetch('/auditoria');
        const dados = await resposta.json();

        auditoriaDados = Array.isArray(dados) ? dados : [];

        renderizarAuditoria();

    } catch (erro) {
        console.error('Erro auditoria:', erro);
        corpo.innerHTML = `
            <tr>
                <td colspan="7">Erro ao carregar auditoria.</td>
            </tr>
        `;
    }
}

function renderizarAuditoria() {
    const corpo = document.getElementById('tabela-auditoria');
    if (!corpo) return;

    const busca = document.getElementById('filtroAuditoriaBusca')?.value.toLowerCase() || '';
    const acao = document.getElementById('filtroAuditoriaAcao')?.value || '';

    let dadosFiltrados = auditoriaDados.filter(item => {
        const texto = `
            ${item.usuario || ''}
            ${item.acao || ''}
            ${item.tabela || ''}
            ${item.registro_id || ''}
            ${item.campo || ''}
            ${item.valor_antigo || ''}
            ${item.valor_novo || ''}
        `.toLowerCase();

        const passaBusca = texto.includes(busca);
        const passaAcao = !acao || item.acao === acao;

        return passaBusca && passaAcao;
    });

    corpo.innerHTML = '';

    if (dadosFiltrados.length === 0) {
        corpo.innerHTML = `
            <tr>
                <td colspan="7">Nenhum registro encontrado.</td>
            </tr>
        `;
        return;
    }

    dadosFiltrados.forEach(item => {
        const data = item.data_hora
            ? new Date(item.data_hora).toLocaleString('pt-BR')
            : '-';

        corpo.innerHTML += `
            <tr>
                <td>${data}</td>
                <td>${item.usuario || '-'}</td>
                <td>${item.acao || '-'}</td>
                <td>${item.registro_id || '-'}</td>
                <td>${item.campo || '-'}</td>
                <td>${item.valor_antigo || '-'}</td>
                <td>${item.valor_novo || '-'}</td>
            </tr>
        `;
    });
}

function limparFiltrosAuditoria() {
    const busca = document.getElementById('filtroAuditoriaBusca');
    const acao = document.getElementById('filtroAuditoriaAcao');

    if (busca) busca.value = '';
    if (acao) acao.value = '';

    renderizarAuditoria();
}

document.addEventListener('input', e => {
    if (e.target.id === 'filtroAuditoriaBusca') {
        renderizarAuditoria();
    }
});

document.addEventListener('change', e => {
    if (e.target.id === 'filtroAuditoriaAcao') {
        renderizarAuditoria();
    }
});

function exportarAuditoriaExcel() {
    if (!auditoriaDados || auditoriaDados.length === 0) {
        alert('Nenhum dado de auditoria para exportar.');
        return;
    }

    const busca = document.getElementById('filtroAuditoriaBusca')?.value.toLowerCase() || '';
    const acao = document.getElementById('filtroAuditoriaAcao')?.value || '';

    const dadosFiltrados = auditoriaDados.filter(item => {
        const texto = `
            ${item.usuario || ''}
            ${item.acao || ''}
            ${item.tabela || ''}
            ${item.registro_id || ''}
            ${item.campo || ''}
            ${item.valor_antigo || ''}
            ${item.valor_novo || ''}
        `.toLowerCase();

        return texto.includes(busca) && (!acao || item.acao === acao);
    });

    let tabela = `
        <table border="1">
            <tr>
                <th>Data/Hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Tabela</th>
                <th>Registro</th>
                <th>Campo</th>
                <th>Valor Antigo</th>
                <th>Valor Novo</th>
            </tr>
    `;

    dadosFiltrados.forEach(item => {
        const data = item.data_hora
            ? new Date(item.data_hora).toLocaleString('pt-BR')
            : '';

        tabela += `
            <tr>
                <td>${data}</td>
                <td>${item.usuario || ''}</td>
                <td>${item.acao || ''}</td>
                <td>${item.tabela || ''}</td>
                <td>${item.registro_id || ''}</td>
                <td>${item.campo || ''}</td>
                <td>${String(item.valor_antigo || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
                <td>${String(item.valor_novo || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
            </tr>
        `;
    });

    tabela += `</table>`;

    const blob = new Blob([`
        <html>
            <head>
                <meta charset="UTF-8">
            </head>
            <body>
                ${tabela}
            </body>
        </html>
    `], {
        type: 'application/vnd.ms-excel;charset=utf-8;'
    });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const dataArquivo = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');

    link.href = url;
    link.download = `auditoria-furman-${dataArquivo}.xls`;
    link.click();

    URL.revokeObjectURL(url);
}


let graficoExecStatus;
let graficoExecVariedades;

async function carregarIndicadoresExecutivos() {
    try {
        const resposta = await fetch('/expedicoes');
        const expedicoes = await resposta.json();

        const total = expedicoes.length;

        const aprovadas = expedicoes.filter(e =>
            e.resultado === 'Aprovado'
        ).length;

        const reprovadas = expedicoes.filter(e =>
            e.resultado === 'Reprovado'
        ).length;

        const lavagens = expedicoes.filter(e =>
            e.status === 'Lavando' ||
            e.status === 'Reapresentado' ||
            e.resultado_c1 === 'Lavagem' ||
            e.resultado_c2 === 'Lavagem' ||
            e.motivo_c1?.toLowerCase().includes('lavagem') ||
            e.motivo_c2?.toLowerCase().includes('lavagem')
        ).length;

        const finalizadas = expedicoes.filter(e =>
            e.status === 'Finalizado'
        ).length;

        const taxaAprovacao = total > 0
            ? ((aprovadas / total) * 100).toFixed(1)
            : 0;

            const hoje = new Date();
const diaHoje = hoje.toLocaleDateString('pt-BR');

const mesAtual = hoje.getMonth();
const anoAtual = hoje.getFullYear();

const expedicoesHoje = expedicoes.filter(e => {
    if (!e.saida) return false;

    const dataSaida = e.saida.split(',')[0]?.trim();

    return dataSaida === diaHoje;
}).length;

const expedicoesMes = expedicoes.filter(e => {
    if (!e.saida) return false;

    const dataSaida = e.saida.split(',')[0]?.trim();

    const partes = dataSaida.split('/');

    if (partes.length !== 3) return false;

    const data = new Date(
        Number(partes[2]),
        Number(partes[1]) - 1,
        Number(partes[0])
    );

    return (
        data.getMonth() === mesAtual &&
        data.getFullYear() === anoAtual
    );
}).length;

        document.getElementById('exec-total-expedicoes').textContent = total;
        document.getElementById('exec-aprovadas').textContent = aprovadas;
        document.getElementById('exec-reprovadas').textContent = reprovadas;
        document.getElementById('exec-lavagens').textContent = lavagens;
        document.getElementById('exec-taxa-aprovacao').textContent = taxaAprovacao + '%';
        document.getElementById('exec-finalizadas').textContent = finalizadas;
        document.getElementById('exec-expedicoes-hoje').textContent = expedicoesHoje;
        document.getElementById('exec-expedicoes-mes').textContent = expedicoesMes;

        const statusContagem = {};

        expedicoes.forEach(e => {
            const status = e.status || 'Sem status';
            statusContagem[status] = (statusContagem[status] || 0) + 1;
        });

        if (graficoExecStatus) graficoExecStatus.destroy();

        graficoExecStatus = new Chart(
            document.getElementById('graficoExecStatus'),
            {
                type: 'bar',
                data: {
                    labels: Object.keys(statusContagem),
                    datasets: [{
                        label: 'Expedições',
                        data: Object.values(statusContagem)
                    }]
                }
            }
        );

        const variedades = {};

        expedicoes.forEach(e => {
            if (e.variedade1) {
                variedades[e.variedade1] = (variedades[e.variedade1] || 0) + 1;
            }

            if (e.variedade2) {
                variedades[e.variedade2] = (variedades[e.variedade2] || 0) + 1;
            }
        });

        if (graficoExecVariedades) graficoExecVariedades.destroy();

        graficoExecVariedades = new Chart(
            document.getElementById('graficoExecVariedades'),
            {
                type: 'doughnut',
                data: {
                    labels: Object.keys(variedades),
                    datasets: [{
                        data: Object.values(variedades)
                    }]
                }
            }
        );

        const rankingProdutores = {};

        expedicoes.forEach(e => {
            const produtor = e.produtor || 'Não informado';
            rankingProdutores[produtor] = (rankingProdutores[produtor] || 0) + 1;
        });

        const rankingOrdenado = Object.entries(rankingProdutores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const rankingBox = document.getElementById('rankingProdutoresExecutivo');

        if (rankingBox) {
            rankingBox.innerHTML = '';
rankingOrdenado.forEach(([produtor, total], index) => {
                rankingBox.innerHTML += `
                    <div class="ranking-item">
                        <strong>${index + 1}º ${produtor}</strong>
                        <span>${total} expedições</span>
                    </div>
                `;
            });
        }

        await carregarGraficoProdutores(expedicoes);
        await carregarGraficoExpedicoesMes(expedicoes);

    } catch (erro) {
        console.error('Erro dashboard executivo:', erro);
    }
}

function editarLinhaExpedicao(id) {
    const linha = document.getElementById(`linha-${id}`);

    if (!linha) {
        alert('Linha não encontrada.');
        return;
    }

    const colunas = linha.querySelectorAll('td');

    const dados = {
        produtor: colunas[0].innerText.trim(),
        motorista: colunas[1].innerText.trim(),
        placa_cavalo: colunas[2].innerText.trim(),
        origem: colunas[3].innerText.trim(),
        destino: colunas[4].innerText.trim(),
        veiculo: colunas[5].innerText.trim(),
        placa_carreta1: colunas[6].innerText.trim(),
        variedade1: colunas[7].innerText.trim(),
        placa_carreta2: colunas[8].innerText.trim(),
        variedade2: colunas[9].innerText.trim(),
        peso: colunas[10].innerText.trim()
    };

    colunas[0].innerHTML = `<input id="edit-produtor-${id}" value="${sanitizar(dados.produtor)}">`;
    colunas[1].innerHTML = `<input id="edit-motorista-${id}" value="${sanitizar(dados.motorista)}">`;
    colunas[2].innerHTML = `<input id="edit-placa-cavalo-${id}" value="${sanitizar(dados.placa_cavalo)}">`;
    colunas[3].innerHTML = `<input id="edit-origem-${id}" value="${sanitizar(dados.origem)}">`;
    colunas[4].innerHTML = `<input id="edit-destino-${id}" value="${sanitizar(dados.destino)}">`;
    colunas[5].innerHTML = `<input id="edit-veiculo-${id}" value="${sanitizar(dados.veiculo)}">`;
    colunas[6].innerHTML = `<input id="edit-placa-carreta1-${id}" value="${sanitizar(dados.placa_carreta1)}">`;
    colunas[7].innerHTML = `<input id="edit-variedade1-${id}" value="${sanitizar(dados.variedade1)}">`;
    colunas[8].innerHTML = `<input id="edit-placa-carreta2-${id}" value="${sanitizar(dados.placa_carreta2)}">`;
    colunas[9].innerHTML = `<input id="edit-variedade2-${id}" value="${sanitizar(dados.variedade2)}">`;
    colunas[10].innerHTML = `<input id="edit-peso-${id}" value="${sanitizar(dados.peso)}">`;

    colunas[15].innerHTML = `
        <div class="acoes-botoes">
            <button type="button" class="btn-editar" onclick="salvarEdicaoExpedicao(${id})">
                💾 Salvar
            </button>

            <button type="button" class="btn-excluir" onclick="carregarHistorico()">
                ❌ Cancelar
            </button>
        </div>
    `;
}

async function salvarEdicaoExpedicao(id) {
    const dados = {
        produtor: document.getElementById(`edit-produtor-${id}`).value,
        motorista: document.getElementById(`edit-motorista-${id}`).value,
        placa_cavalo: document.getElementById(`edit-placa-cavalo-${id}`).value,
        origem: document.getElementById(`edit-origem-${id}`).value,
        destino: document.getElementById(`edit-destino-${id}`).value,
        veiculo: document.getElementById(`edit-veiculo-${id}`).value,
        placa_carreta1: document.getElementById(`edit-placa-carreta1-${id}`).value,
        variedade1: document.getElementById(`edit-variedade1-${id}`).value,
        placa_carreta2: document.getElementById(`edit-placa-carreta2-${id}`).value,
        variedade2: document.getElementById(`edit-variedade2-${id}`).value,
        peso: document.getElementById(`edit-peso-${id}`).value
    };

    const resposta = await fetch(`/expedicoes/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
        toast('Erro ao salvar edição.', 'erro');
        return;
    }

    await carregarHistorico();
    toast('Expedição atualizada!');
}
const fotoAnalise = document.getElementById('q_foto_analise');
if (fotoAnalise) {
    fotoAnalise.addEventListener('change', function () {
        const nome = this.files.length
            ? this.files[0].name
            : 'Nenhuma foto selecionada';
        document.getElementById('nomeFotoAnalise').textContent = nome;
    });
}
function exportarExpeditcoesExcel() {
    if (!dadosFiltrados || dadosFiltrados.length === 0) {
        toast('Nenhuma expedição para exportar.', 'aviso');
        return;
    }

    let tabela = `
        <table border="1">
            <tr>
                <th>Produtor</th>
                <th>Motorista</th>
                <th>Cavalo</th>
                <th>Origem</th>
                <th>Destino</th>
                <th>Veículo</th>
                <th>Carreta 1</th>
                <th>Variedade 1</th>
                <th>Carreta 2</th>
                <th>Variedade 2</th>
                <th>Peso</th>
                <th>Saída</th>
                <th>Status</th>
                <th>Resultado C1</th>
                <th>Motivo C1</th>
                <th>Resultado C2</th>
                <th>Motivo C2</th>
            </tr>
    `;

    dadosFiltrados.forEach(e => {
        tabela += `
            <tr>
                <td>${e.produtor || ''}</td>
                <td>${e.motorista || ''}</td>
                <td>${e.placa_cavalo || ''}</td>
                <td>${e.origem || ''}</td>
                <td>${e.destino || ''}</td>
                <td>${e.veiculo || ''}</td>
                <td>${e.placa_carreta1 || ''}</td>
                <td>${e.variedade1 || ''}</td>
                <td>${e.placa_carreta2 || ''}</td>
                <td>${e.variedade2 || ''}</td>
                <td>${e.peso || ''}</td>
                <td>${e.saida || ''}</td>
                <td>${e.status || ''}</td>
                <td>${e.resultado_c1 || ''}</td>
                <td>${e.motivo_c1 || ''}</td>
                <td>${e.resultado_c2 || ''}</td>
                <td>${e.motivo_c2 || ''}</td>
            </tr>
        `;
    });

    tabela += `</table>`;

    const blob = new Blob([`
        <html>
            <head><meta charset="UTF-8"></head>
            <body>${tabela}</body>
        </html>
    `], { type: 'application/vnd.ms-excel;charset=utf-8;' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const dataArquivo = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');

    link.href = url;
    link.download = `expedicoes-furman-${dataArquivo}.xls`;
    link.click();

    URL.revokeObjectURL(url);
}
async function carregarGraficoProdutores(expedicoes) {
    const canvas = document.getElementById('graficoProdutores');
    if (!canvas || typeof Chart === 'undefined') return;

    const contagem = {};
    expedicoes.forEach(e => {
        const p = e.produtor || 'Não informado';
        contagem[p] = (contagem[p] || 0) + 1;
    });

    const ordenado = Object.entries(contagem)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    const labels = ordenado.map(([nome]) => nome);
    const dados = ordenado.map(([, qtd]) => qtd);

    if (graficoProdutores) graficoProdutores.destroy();

    graficoProdutores = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Expedições',
                data: dados,
                backgroundColor: 'rgba(33,255,157,0.25)',
                borderColor: '#21ff9d',
                borderWidth: 2,
                borderRadius: 12,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(33,255,157,.35)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: ctx => ` ${ctx.raw} expedição(ões)`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8', precision: 0 },
                    grid: { color: 'rgba(255,255,255,.05)' }
                },
                y: {
                    ticks: { color: '#a5b4fc', font: { weight: '600' } },
                    grid: { display: false }
                }
            }
        }
    });
}
async function carregarGraficoExpedicoesMes(expedicoes) {
    const canvas = document.getElementById('graficoExpedicoesMes');
    if (!canvas || typeof Chart === 'undefined') return;

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const anoAtual = new Date().getFullYear();
    const contagem = Array(12).fill(0);

    expedicoes.forEach(e => {
        if (!e.saida) return;
        const partes = e.saida.split(',')[0]?.trim().split('/');
        if (!partes || partes.length !== 3) return;
        const ano = Number(partes[2]);
        const mes = Number(partes[1]) - 1;
        if (ano === anoAtual) contagem[mes]++;
    });

    if (graficoExpedicoesMes) graficoExpedicoesMes.destroy();

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(124,58,237,0.35)');
    gradient.addColorStop(1, 'rgba(124,58,237,0.02)');

    graficoExpedicoesMes = new Chart(canvas, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: 'Expedições',
                data: contagem,
                borderColor: '#7c3aed',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 5,
                pointBackgroundColor: '#7c3aed',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(124,58,237,.35)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: ctx => ` ${ctx.raw} expedição(ões)`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#a5b4fc', font: { weight: '600' } },
                    grid: { color: 'rgba(255,255,255,.04)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8', precision: 0 },
                    grid: { color: 'rgba(255,255,255,.05)' }
                }
            }
        }
    });
}
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('aberta');
    overlay.classList.toggle('ativo');
}

function fecharSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('aberta');
    overlay.classList.remove('ativo');
}

// Fecha sidebar ao clicar em qualquer menu
document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (window.innerWidth <= 768) fecharSidebar();
    });
});

async function gerarImagemExpedicao() {
    const btn = document.getElementById('btnGerarImagem');
    if (btn) btnLoading(btn, '⏳ Gerando...');

    const card = document.getElementById('cardImagemExpedicao');

    const canvas = await html2canvas(card, {
        scale: 2,
        backgroundColor: '#0f172a',
        useCORS: true,
        allowTaint: true
    });

    canvas.toBlob(async (blob) => {
        // Tenta compartilhar nativamente (celular)
        if (navigator.share && navigator.canShare({ files: [new File([blob], 'expedicao.png', { type: 'image/png' })] })) {
            const file = new File([blob], 'expedicao.png', { type: 'image/png' });
            await navigator.share({
                title: 'Expedição Furman',
                files: [file]
            });
        } else {
            // No PC, baixa a imagem
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `expedicao-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.png`;
            link.click();
            URL.revokeObjectURL(url);
            toast('Imagem baixada!');
        }

        if (btn) btnRestore(btn);
    }, 'image/png');
}

function alterarTipoAmostragem() {
    const tipo = document.querySelector('input[name="tipoAmostragem"]:checked')?.value;
    const campoPlaca = document.getElementById('q_placa');
    const campoId = document.getElementById('q_num_identificacao');

    if (tipo === 'campo') {
        campoPlaca.style.display = 'none';
        campoPlaca.value = '';
        campoId.style.display = 'block';
    } else {
        campoPlaca.style.display = 'block';
        campoId.style.display = 'none';
        campoId.value = '';
    }
}

function calcularPercentuaisTempoReal() {
    const pesoTotal = parseFloat(document.getElementById('q_peso_total')?.value?.replace(',', '.')) || 0;

    // ===== DIÂMETRO =====
    const d35 = parseFloat(document.getElementById('q_diametro_35')?.value?.replace(',', '.')) || 0;
    const d3545 = parseFloat(document.getElementById('q_diametro_35_45')?.value?.replace(',', '.')) || 0;
    const d45 = parseFloat(document.getElementById('q_diametro_45')?.value?.replace(',', '.')) || 0;

    const pct35 = pesoTotal > 0 ? (d35 / pesoTotal * 100).toFixed(2) : '0.00';
    const pct3545 = pesoTotal > 0 ? (d3545 / pesoTotal * 100).toFixed(2) : '0.00';
    const pct45 = pesoTotal > 0 ? (d45 / pesoTotal * 100).toFixed(2) : '0.00';

    // Grado baseado nas miúdas (35-45mm)
    const pctMiudas = parseFloat(pct3545);
    let grado = '', gradoCor = '';

    if (pctMiudas === 0) { grado = '—'; gradoCor = '#94a3b8'; }
    else if (pctMiudas <= 10) { grado = 'Grado A ✅'; gradoCor = '#21ff9d'; }
    else if (pctMiudas <= 15) { grado = 'Grado B 🟡'; gradoCor = '#fbbf24'; }
    else if (pctMiudas <= 20) { grado = 'Grado C 🟠'; gradoCor = '#f97316'; }
    else { grado = 'Fora do padrão ⛔'; gradoCor = '#ef4444'; }

    const previewDiametro = document.getElementById('preview_diametro');
    if (previewDiametro) {
        previewDiametro.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-top:10px;">
                <div style="padding:12px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);">
                    <div style="color:#94a3b8; font-size:12px;">&lt;35mm</div>
                    <div style="font-size:18px; font-weight:800;">${d35} kg</div>
                    <div style="color:#38bdf8; font-weight:700;">${pct35}%</div>
                </div>
                <div style="padding:12px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);">
                    <div style="color:#94a3b8; font-size:12px;">35-45mm (miúdas)</div>
                    <div style="font-size:18px; font-weight:800;">${d3545} kg</div>
                    <div style="color:#38bdf8; font-weight:700;">${pct3545}%</div>
                    <div style="margin-top:6px; padding:4px 8px; border-radius:8px; background:rgba(255,255,255,.06); color:${gradoCor}; font-weight:800; font-size:13px;">${grado}</div>
                </div>
                <div style="padding:12px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);">
                    <div style="color:#94a3b8; font-size:12px;">&gt;45mm</div>
                    <div style="font-size:18px; font-weight:800;">${d45} kg</div>
                    <div style="color:#38bdf8; font-weight:700;">${pct45}%</div>
                </div>
            </div>
        `;
    }

    // ===== COMPRIMENTO =====
    const c75pQtd = document.getElementById('q_menos75_qtd')?.value || '0';
    const c75p = parseFloat(document.getElementById('q_menos75_peso')?.value?.replace(',', '.')) || 0;
    const c75mQtd = document.getElementById('q_mais75_qtd')?.value || '0';
    const c75m = parseFloat(document.getElementById('q_mais75_peso')?.value?.replace(',', '.')) || 0;
    const c100Qtd = document.getElementById('q_mais100_qtd')?.value || '0';
    const c100 = parseFloat(document.getElementById('q_mais100_peso')?.value?.replace(',', '.')) || 0;
    const c150Qtd = document.getElementById('q_mais150_qtd')?.value || '0';
    const c150 = parseFloat(document.getElementById('q_mais150_peso')?.value?.replace(',', '.')) || 0;

    const pctC75p = pesoTotal > 0 ? (c75p / pesoTotal * 100).toFixed(2) : '0.00';
    const pctC75m = pesoTotal > 0 ? (c75m / pesoTotal * 100).toFixed(2) : '0.00';
    const pctC100 = pesoTotal > 0 ? (c100 / pesoTotal * 100).toFixed(2) : '0.00';
    const pctC150 = pesoTotal > 0 ? (c150 / pesoTotal * 100).toFixed(2) : '0.00';

    const previewComprimento = document.getElementById('preview_comprimento');
    if (previewComprimento) {
        previewComprimento.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px; margin-top:10px;">
                <div style="padding:12px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);">
                    <div style="color:#94a3b8; font-size:12px;">&lt;75mm</div>
                    <div style="font-size:14px; font-weight:800;">${c75pQtd} un | ${c75p} kg</div>
                    <div style="color:#38bdf8; font-weight:700;">${pctC75p}%</div>
                </div>
                <div style="padding:12px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);">
                    <div style="color:#94a3b8; font-size:12px;">&gt;75mm</div>
                    <div style="font-size:14px; font-weight:800;">${c75mQtd} un | ${c75m} kg</div>
                    <div style="color:#38bdf8; font-weight:700;">${pctC75m}%</div>
                </div>
                <div style="padding:12px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);">
                    <div style="color:#94a3b8; font-size:12px;">&gt;100mm</div>
                    <div style="font-size:14px; font-weight:800;">${c100Qtd} un | ${c100} kg</div>
                    <div style="color:#38bdf8; font-weight:700;">${pctC100}%</div>
                </div>
                <div style="padding:12px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);">
                    <div style="color:#94a3b8; font-size:12px;">&gt;150mm</div>
                    <div style="font-size:14px; font-weight:800;">${c150Qtd} un | ${c150} kg</div>
                    <div style="color:#38bdf8; font-weight:700;">${pctC150}%</div>
                </div>
            </div>
        `;
    }
}