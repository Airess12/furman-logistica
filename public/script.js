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
  if (id === 'qualidade') {
    carregarAnalisesQualidade();
    carregarDashboardQualidade();
    carregarGraficoSolidosQualidade();
}

    if (id === 'expedicao') {
        carregarProdutores();
        carregarCarretas();
        definirPeso();
    }
}

/* =========================
   LOGOUT
========================= */

async function logout() {
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
}

/* =========================
   CADASTROS
========================= */

async function cadastrarMotorista(event) {
    if (event) event.preventDefault();

    const placaCampo = el('placaCadastro', 'placa');
    const motoristaCampo = el('motoristaCadastro', 'motoristaCadastroNome');
    const fotoCampo = el('fotoCadastro', 'foto');

    if (!placaCampo || !motoristaCampo) return;

    const placa = placaCampo.value.toUpperCase().trim();
    const motorista = motoristaCampo.value.trim();

    if (!placa || !motorista) {
        alert('Preencha todos os campos.');
        return;
    }

    const formData = new FormData();

    formData.append('placa', placa);
    formData.append('motorista', motorista);

    if (fotoCampo && fotoCampo.files[0]) {
        formData.append('foto', fotoCampo.files[0]);
    }

    const resposta = await fetch('/motoristas', {
        method: 'POST',
        body: formData
    });

    const dados = await resposta.json();

    if (dados.status === 'ok') {
        alert('Motorista cadastrado!');
        placaCampo.value = '';
        motoristaCampo.value = '';
        if (fotoCampo) fotoCampo.value = '';
    } else {
        alert('Erro ao cadastrar motorista.');
    }
}

async function cadastrarProdutor() {
    const campo = el('novoProdutor', 'nomeProdutor');
    if (!campo) return;

    const nome = campo.value.trim();

    if (!nome) {
        alert('Digite o produtor.');
        return;
    }

    const resposta = await fetch('/produtores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome })
    });

    const dados = await resposta.json();

    if (dados.status === 'ok') {
        alert('Produtor cadastrado!');
        campo.value = '';
        carregarProdutores();
    } else {
        alert('Erro ao cadastrar produtor.');
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
        alert('Digite a placa.');
        return;
    }

    const resposta = await fetch('/carretas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa })
    });

    const dados = await resposta.json();

    if (dados.status === 'ok') {
        alert('Carreta cadastrada!');
        campo.value = '';
        carregarCarretas();
    } else {
        alert('Erro ao cadastrar carreta.');
    }
}

async function carregarCarretas() {
    const resposta = await fetch('/carretas');
    const carretas = await resposta.json();

    const select1 = el('placa_carreta1', 'placaCarreta1');
    const select2 = el('placa_carreta2', 'placaCarreta2');

    if (!select1 || !select2) return;

    const valor1 = select1.value;
    const valor2 = select2.value;

    select1.innerHTML = `<option value="">Carreta 1</option>`;
    select2.innerHTML = `<option value="">Carreta 2</option>`;

    carretas.forEach(c => {
        select1.innerHTML += `<option value="${c.placa}">${c.placa}</option>`;
        select2.innerHTML += `<option value="${c.placa}">${c.placa}</option>`;
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
🌱 Produtor: ${dados.produtor}

👤 Motorista: ${dados.motorista}

🚛 Cavalo: ${dados.placa_cavalo}

🚛 Carreta 1: ${dados.placa_carreta1} - ${dados.variedade1}

${dados.placa_carreta2 ? `🚛 Carreta 2: ${dados.placa_carreta2} - ${dados.variedade2}` : ''}

🚚 Veículo: ${dados.veiculo}

🥔 Variedade: ${variedadeBatata}

⚖️ Peso NF: ${dados.peso} kg

📍 Origem: ${dados.origem}

🏭 Destino: ${dados.destino}

🕒 Saída: ${dados.saida}
        `.trim();

        const relatorio = el('relatorioGerado');

        if (relatorio) {
            relatorio.classList.remove('relatorio-vazio');
            relatorio.innerText = textoRelatorio;
        }

        alert('Expedição cadastrada!');

        const form = el('formExpedicao');
        if (form) form.reset();

        definirPeso();
        carregarHistorico();
        carregarDashboard();
    } else {
        alert('Erro ao salvar.');
    }
}

/* =========================
   HISTÓRICO
========================= */

async function carregarHistorico() {

    const resposta = await fetch('/expedicoes');
    const dados = await resposta.json();

    const busca =
        document.getElementById('filtroBusca')?.value.toLowerCase() || '';

    const statusFiltro =
        document.getElementById('filtroStatus')?.value || '';

    const variedadeFiltro =
        document.getElementById('filtroVariedade')?.value || '';

    const tabela = el('tabelaHistorico');

    if (!tabela) return;

    tabela.innerHTML = '';

    dados
    .filter(e => {

        const textoBusca = `
            ${e.produtor || ''}
            ${e.motorista || ''}
            ${e.placa_cavalo || ''}
            ${e.placa_carreta1 || ''}
            ${e.placa_carreta2 || ''}
        `.toLowerCase();

        const correspondeBusca =
            !busca || textoBusca.includes(busca);

        const correspondeStatus =
            !statusFiltro || e.status === statusFiltro;

        const correspondeVariedade =
            !variedadeFiltro ||
            e.variedade1 === variedadeFiltro ||
            e.variedade2 === variedadeFiltro;

        return (
            correspondeBusca &&
            correspondeStatus &&
            correspondeVariedade
        );

    })

    .forEach(e => {

        const temCarreta2 = !!e.placa_carreta2;

        tabela.innerHTML += `

            <tr id="linha-${e.id}">

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

                <td>

                    <select
                        class="status-select"
                        data-status="${e.status || 'Em viagem'}"
                        id="status-${e.id}"
                        onchange="atualizarQualidadeCarretas(${e.id}); this.setAttribute('data-status', this.value)"
                    >

                        <option ${e.status === 'Em viagem' ? 'selected' : ''}>
                            Em viagem
                        </option>

                        <option ${e.status === 'Na McCain' ? 'selected' : ''}>
                            Na McCain
                        </option>

                        <option ${e.status === 'Lavando' ? 'selected' : ''}>
                            Lavando
                        </option>

                        <option ${e.status === 'Reapresentado' ? 'selected' : ''}>
                            Reapresentado
                        </option>

                        <option ${e.status === 'Finalizado' ? 'selected' : ''}>
                            Finalizado
                        </option>

                    </select>

                </td>

                <td>

                    <strong>C1</strong>

                    <select
                        class="resultado-select"
                        id="resultado-c1-${e.id}"
                        onchange="atualizarQualidadeCarretas(${e.id})"
                    >

                        <option ${e.resultado_c1 === 'Pendente' ? 'selected' : ''}>
                            Pendente
                        </option>

                        <option ${e.resultado_c1 === 'Aprovado' ? 'selected' : ''}>
                            Aprovado
                        </option>

                        <option ${e.resultado_c1 === 'Aprovado com Restrição' ? 'selected' : ''}>
                            Aprovado com Restrição
                        </option>

                        <option ${e.resultado_c1 === 'Reprovado' ? 'selected' : ''}>
                            Reprovado
                        </option>

                        <option ${e.resultado_c1 === 'Lavagem' ? 'selected' : ''}>
                            Lavagem
                        </option>

                        <option ${e.resultado_c1 === 'Aprovado após lavagem' ? 'selected' : ''}>
                            Aprovado após lavagem
                        </option>

                    </select>

                    <input
                        class="motivo-input"
                        type="text"
                        id="motivo-c1-${e.id}"
                        value="${e.resultado_c1 === 'Aprovado' ? '' : (e.motivo_c1 || '')}"
                        placeholder="${e.resultado_c1 === 'Aprovado com Restrição' ? 'Restrição C1' : 'Motivo C1'}"
                        ${e.resultado_c1 === 'Aprovado' ? 'disabled' : ''}
                        onchange="atualizarQualidadeCarretas(${e.id})"
                    >

                </td>

                <td>

                    ${temCarreta2 ? `

                        <strong>C2</strong>

                        <select
                            class="resultado-select"
                            id="resultado-c2-${e.id}"
                            onchange="atualizarQualidadeCarretas(${e.id})"
                        >

                            <option ${e.resultado_c2 === 'Pendente' ? 'selected' : ''}>
                                Pendente
                            </option>

                            <option ${e.resultado_c2 === 'Aprovado' ? 'selected' : ''}>
                                Aprovado
                            </option>

                            <option ${e.resultado_c2 === 'Aprovado com Restrição' ? 'selected' : ''}>
                                Aprovado com Restrição
                            </option>

                            <option ${e.resultado_c2 === 'Reprovado' ? 'selected' : ''}>
                                Reprovado
                            </option>

                            <option ${e.resultado_c2 === 'Lavagem' ? 'selected' : ''}>
                                Lavagem
                            </option>

                            <option ${e.resultado_c2 === 'Aprovado após lavagem' ? 'selected' : ''}>
                                Aprovado após lavagem
                            </option>

                        </select>

                        <input
                            class="motivo-input"
                            type="text"
                            id="motivo-c2-${e.id}"
                            value="${e.resultado_c2 === 'Aprovado' ? '' : (e.motivo_c2 || '')}"
                            placeholder="${e.resultado_c2 === 'Aprovado com Restrição' ? 'Restrição C2' : 'Motivo C2'}"
                            ${e.resultado_c2 === 'Aprovado' ? 'disabled' : ''}
                            onchange="atualizarQualidadeCarretas(${e.id})"
                        >

                    ` : '—'}

                </td>

                <td style="display:flex; gap:8px; justify-content:center;">

                    <button
                        class="small-btn edit"
                        onclick="editarLinhaExpedicao(${e.id})"
                    >
                        Editar
                    </button>

                    <button
                        class="small-btn delete"
                        onclick="excluirExpedicao(${e.id})"
                    >
                        Excluir
                    </button>

                </td>

            </tr>

        `;
    });
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
    const confirmar = confirm('Excluir expedição?');

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
    try {
        const resposta = await fetch('/dashboard');
        const dados = await resposta.json();

        const totalExpedicoes = dados.totalExpedicoes || 0;
        const pesoTotal = dados.pesoEstimadoTotal || 0;
        const taxaAprovacao = dados.taxaAprovacao || 0;
        const taxaReprovacao = dados.taxaReprovacao || 0;
        const aprovados = dados.aprovados || 0;
        const reprovados = dados.reprovados || 0;

animarNumero('totalCarretas', totalExpedicoes);
animarNumero('totalBags', pesoTotal, ' kg');
animarNumero('taxaAprovacao', taxaAprovacao, '%');
animarNumero('taxaReprovacao', taxaReprovacao, '%');
animarNumero('totalAprovados', aprovados);
animarNumero('totalReprovados', reprovados);

        await carregarGraficoDashboard(totalExpedicoes);
        await carregarGraficoQualidade(aprovados, reprovados, taxaAprovacao);
        await carregarGraficoStatus();

    } catch (erro) {
        console.error('Erro ao carregar dashboard:', erro);
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
        glowLine: {
        glowColor: '#21ff9d',
        blur: 24
},
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

async function carregarGraficoQualidade(aprovados, reprovados, percentual) {
    const canvas = document.getElementById('graficoQualidade');
    if (!canvas || typeof Chart === 'undefined') return;

    if (chartQualidade) chartQualidade.destroy();

    chartQualidade = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Aprovados', 'Reprovados'],
            datasets: [{
                data: [aprovados || 0, reprovados || 0],
                backgroundColor: [
                    '#21ff9d',
                    '#ff3c64'
                ],
                borderColor: [
                    'rgba(33,255,157,0.45)',
                    'rgba(255,60,100,0.45)'
                ],
                borderWidth: 2,
                hoverOffset: 12,
                spacing: 4
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
                    borderColor: 'rgba(33,255,157,0.35)',
                    borderWidth: 1,
                    padding: 14,
                    displayColors: false,
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
/* =========================
   WHATSAPP / COPIAR
========================= */

function copiarRelatorio() {
    const relatorio = el('relatorioGerado');

    if (!relatorio || relatorio.classList.contains('relatorio-vazio')) {
        alert('Gere um relatório primeiro.');
        return;
    }

    navigator.clipboard.writeText(relatorio.innerText);
    alert('Relatório copiado!');
}

function abrirWhatsapp() {
    window.open('https://web.whatsapp.com/', '_blank');
}

/* =========================
   START
========================= */

window.onload = async () => {

    await carregarProdutores();
    await carregarCarretas();
    await carregarHistorico();
    await carregarDashboard();
    //await carregarAlertasOperacionais();

    definirPeso();

    document.getElementById('filtroBusca')
        ?.addEventListener('input', carregarHistorico);

    document.getElementById('filtroStatus')
        ?.addEventListener('change', carregarHistorico);

    document.getElementById('filtroVariedade')
        ?.addEventListener('change', carregarHistorico);

};;

async function salvarAnaliseQualidade() {
    const resultado = document.getElementById('q_resultado');

    const formData = new FormData();

    formData.append('variedade', document.getElementById('q_variedade')?.value || '');
    formData.append('solidos', document.getElementById('q_solidos')?.value || '');
    formData.append('peso_agua', document.getElementById('q_peso_agua')?.value || '');
    formData.append('placa', document.getElementById('q_placa')?.value || '');
    formData.append('peso_total', document.getElementById('q_peso_total')?.value || '');
    formData.append('peso_lavado', document.getElementById('q_peso_lavado')?.value || '');

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

    if (foto) {
        formData.append('foto_analise', foto);
    }

    try {
        const url = analiseEditandoId
    ? `/analises-qualidade/${analiseEditandoId}`
    : '/analises-qualidade';

    const metodo = analiseEditandoId ? 'PUT' : 'POST';

    const resposta = await fetch(url, {
    method: metodo,
    body: formData
});

        if (!resposta.ok) {
            throw new Error('Erro ao salvar análise');
        }

        resultado.classList.remove('relatorio-vazio');

        resultado.innerHTML = `
            <h3>✅ Análise salva com sucesso</h3>
            <p><strong>Placa:</strong> ${formData.get('placa')}</p>
            <p><strong>Variedade:</strong> ${formData.get('variedade')}</p>
            <p><strong>Sólidos:</strong> ${formData.get('solidos')}</p>
            <p><strong>Foto:</strong> ${foto ? 'Enviada' : 'Não enviada'}</p>
        `;

        await carregarAnalisesQualidade();
        
        analiseEditandoId = null;
        
        alert('Análise salva no banco com foto!');

    } catch (erro) {
    console.error('ERRO AO SALVAR ANÁLISE:', erro);
    alert('Erro ao salvar análise no banco. Veja o Console F12.');
}
}

    async function carregarAnalisesQualidade() {

    console.log('CARREGANDO ANALISES');

    const tabela = document.getElementById('tabelaQualidade');

    if (!tabela) {
        console.error('Tabela qualidade não encontrada');
        return;
    }

    tabela.innerHTML = `
        <tr>
            <td colspan="6">Carregando...</td>
        </tr>
    `;

    try {

        const resposta = await fetch('/analises-qualidade');

        if (!resposta.ok) {
            throw new Error('Erro ao buscar análises');
        }

        const analises = await resposta.json();

        if (!analises.length) {

            tabela.innerHTML = `
                <tr>
                    <td colspan="6">Nenhuma análise encontrada.</td>
                </tr>
            `;

            return;
        }

        tabela.innerHTML = '';

        analises.forEach(item => {

    tabela.innerHTML += `
        <tr>

            <td>${item.placa || '-'}</td>

            <td>${item.variedade || '-'}</td>

            <td>${item.solidos || '-'}</td>

            <td>${item.peso_agua || '-'}</td>

            <td>${item.peso_total || '-'}</td>

            <td>${new Date(item.criado_em).toLocaleString('pt-BR')}</td>

           <td>
    <div style="display:flex; gap:8px; justify-content:center; align-items:center;">

        <button
            type="button"
            class="btn-ver-analise"
            onclick='verDetalhesQualidade(${JSON.stringify(item)})'
        >
            👁️ Ver
        </button>

        <button
            type="button"
            class="btn-ver-analise"
            onclick='editarAnaliseQualidade(${JSON.stringify(item)})'
        >
            ✏️ Editar
        </button>

        <button
            type="button"
            class="btn-excluir-analise"
            onclick="excluirAnaliseQualidade(${item.id})"
        >
            🗑️
        </button>

    </div>
</td>
        </tr>
    `;
});

    } catch (erro) {

        console.error(erro);

        tabela.innerHTML = `
            <tr>
                <td colspan="6">Erro ao carregar análises.</td>
            </tr>
        `;
    }
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

    resultado.innerHTML = `
        <div style="display:flex; gap:30px; align-items:flex-start; flex-wrap:wrap;">

            <div style="flex:1; min-width:320px;">
                <h3>🔬 Detalhes da análise</h3>

                <p><strong>Placa:</strong> ${item.placa || '-'}</p>
                <p><strong>Variedade:</strong> ${item.variedade || '-'}</p>
                <p><strong>Sólidos:</strong> ${item.solidos || '-'}</p>
                <p><strong>Peso na água:</strong> ${item.peso_agua || '-'}</p>
                <p><strong>Peso total:</strong> ${item.peso_total || '-'}</p>
                <p><strong>Peso lavado:</strong> ${item.peso_lavado || '-'}</p>

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
    const confirmar = confirm('Deseja excluir esta análise?');

    if (!confirmar) return;

    try {
        const resposta = await fetch(`/analises-qualidade/${id}`, {
            method: 'DELETE'
        });

        if (!resposta.ok) {
            throw new Error('Erro ao excluir');
        }

        alert('Análise excluída com sucesso!');
        await carregarAnalisesQualidade();

    } catch (erro) {
        console.error(erro);
        alert('Erro ao excluir análise.');
    }
}
async function gerarPDFQualidade() {
    const elemento = document.getElementById('q_resultado');

    if (!elemento || elemento.classList.contains('relatorio-vazio')) {
        alert('Abra uma análise no botão Ver antes de gerar o PDF.');
        return;
    }

    const canvas = await html2canvas(elemento, {
        scale: 2,
        backgroundColor: '#111827',
        useCORS: true
    });

    const imgData = canvas.toDataURL('image/png');

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

await new Promise((resolve) => {
    logo.onload = resolve;
    logo.onerror = resolve;
});

pdf.addImage(
    logo,
    'JPEG',
    10,
    8,
    24,
    24
);

const agora = new Date().toLocaleString('pt-BR');

pdf.setTextColor(255,255,255);

pdf.setFontSize(17);
pdf.text('RELATÓRIO DE QUALIDADE', 42, 16);

pdf.setFontSize(10);
pdf.text('Furman Logística • Sistema de Qualidade', 42, 23);

pdf.setFontSize(9);
pdf.text(`Laboratorista: Luiz Aires`, 42, 29);
pdf.text(`Emitido em: ${agora}`, 42, 34);



   pdf.addImage(imgData, 'PNG', 10, 42, imgWidth, imgHeight);

    pdf.save('analise-qualidade.pdf');
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
        const dados = await resposta.json();

        document.getElementById('qtdAnalisesQualidade').textContent = dados.totalAnalises || 0;
        document.getElementById('mediaSolidosQualidade').textContent = `${dados.mediaSolidos || 0}%`;
        document.getElementById('mediaPesoQualidade').textContent = dados.mediaPesoTotal || '0';
        document.getElementById('totalPontosQualidade').textContent = dados.totalPontos || 0;

    } catch (erro) {
        console.error('Erro ao carregar dashboard qualidade:', erro);
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
            return parseFloat(String(item.solidos || '0').replace(',', '.')) || 0;
        });

        const ctx = document.getElementById('graficoSolidosQualidade');

        if (!ctx) return;

        if (graficoSolidosQualidade) {
            graficoSolidosQualidade.destroy();
        }

        graficoSolidosQualidade = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Sólidos %',
                    data: dados,
                    borderWidth: 3,
                    tension: 0.35,
                    fill: false
                }]
            },
            options: {
            responsive: true,
            maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            color: '#cbd5e1'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#cbd5e1'
                        }
                    }
                }
            }
        });

    } catch (erro) {
        console.error('Erro ao carregar gráfico de sólidos:', erro);
    }
}