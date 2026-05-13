let expedicaoEditandoId = null;

function abrirAba(nomeAba, botao) {
    const abas = document.querySelectorAll('.aba');
    const botoes = document.querySelectorAll('.menu-btn');

    abas.forEach(aba => aba.classList.remove('ativa'));
    botoes.forEach(btn => btn.classList.remove('active'));

    document.getElementById(nomeAba).classList.add('ativa');
    botao.classList.add('active');

    if (nomeAba === 'relatorios') {
        carregarHistorico();
    }
}

async function cadastrarMotorista() {
    const placa = document.getElementById('placaCadastro').value.toUpperCase().trim();
    const motorista = document.getElementById('motoristaCadastro').value.trim();
    const foto = document.getElementById('fotoCadastro').files[0];
    const mensagem = document.getElementById('mensagemCadastro');

    if (!placa || !motorista) {
        mensagem.innerHTML = '⚠️ Preencha placa e motorista.';
        mensagem.className = 'mensagem erro';
        return;
    }

    const formData = new FormData();
    formData.append('placa', placa);
    formData.append('motorista', motorista);

    if (foto) {
        formData.append('foto', foto);
    }

    const resposta = await fetch('/motoristas', {
        method: 'POST',
        body: formData
    });

    const dados = await resposta.json();

    if (dados.status === 'ok') {
        mensagem.innerHTML = '✅ Motorista cadastrado com sucesso!';
        mensagem.className = 'mensagem sucesso';

        document.getElementById('placaCadastro').value = '';
        document.getElementById('motoristaCadastro').value = '';
        document.getElementById('fotoCadastro').value = '';
    } else {
        mensagem.innerHTML = '❌ Erro ao cadastrar motorista.';
        mensagem.className = 'mensagem erro';
    }
}

async function buscarMotorista() {
    const placa = document.getElementById('placaCavalo').value.toUpperCase().trim();

    if (!placa) {
        document.getElementById('motorista').value = '';
        esconderFotoCaminhao();
        return;
    }

    const resposta = await fetch(`/motorista/${placa}`);
    const dados = await resposta.json();

    document.getElementById('motorista').value = dados.motorista || '';

    if (dados.foto) {
        document.getElementById('fotoCaminhao').src = dados.foto;
        document.getElementById('fotoCaminhaoBox').classList.remove('escondido');
    } else {
        esconderFotoCaminhao();
    }
}

function esconderFotoCaminhao() {
    document.getElementById('fotoCaminhao').src = '';
    document.getElementById('fotoCaminhaoBox').classList.add('escondido');
}

function definirPeso() {
    const veiculo = document.getElementById('veiculo').value;
    const campoCarreta2 = document.getElementById('campoCarreta2');
    const campoVariedade2 = document.getElementById('campoVariedade2');

    let peso = '';

    if (veiculo === '4º Eixo') {
        peso = '38.000 kg';

        campoCarreta2.style.display = 'none';
        campoVariedade2.style.display = 'none';

        document.getElementById('placaCarreta2').value = '';
        document.getElementById('variedade2').value = '';

    } else if (veiculo === 'Rodo Caçamba') {
        peso = '38.000 kg';

        campoCarreta2.style.display = 'block';
        campoVariedade2.style.display = 'block';

    } else {
        campoCarreta2.style.display = 'none';
        campoVariedade2.style.display = 'none';
        peso = '';
    }

    document.getElementById('peso').value = peso;
}

async function gerarRelatorio() {
    const placa_cavalo = document.getElementById('placaCavalo').value.toUpperCase().trim();
    const motorista = document.getElementById('motorista').value;
    const produtor = document.getElementById('produtor').value.trim();
    const origem = document.getElementById('origem').value;
    const veiculo = document.getElementById('veiculo').value;
    const placa_carreta1 = document.getElementById('placaCarreta1').value.toUpperCase().trim();
    const variedade1 = document.getElementById('variedade1').value;
    const placa_carreta2 = document.getElementById('placaCarreta2').value.toUpperCase().trim();
    const variedade2 = document.getElementById('variedade2').value;
    const peso = document.getElementById('peso').value;

    const destino = 'McCain – Araxá/MG';

    const saida = new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    if (!placa_cavalo || !motorista || !produtor || !origem || !veiculo || !placa_carreta1 || !variedade1 || !peso) {
        alert('Preencha cavalo, motorista, produtor, origem, veículo, carreta 1, variedade 1 e peso.');
        return;
    }

    if (veiculo === 'Rodo Caçamba' && (!placa_carreta2 || !variedade2)) {
        alert('Para Rodo Caçamba, preencha também a carreta 2 e a variedade 2.');
        return;
    }

    const dadosExpedicao = {
        produtor,
        placa_cavalo,
        motorista,
        origem,
        destino,
        veiculo,
        placa_carreta1,
        variedade1,
        placa_carreta2,
        variedade2,
        peso,
        saida
    };

    if (expedicaoEditandoId) {
        await fetch(`/expedicoes/${expedicaoEditandoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosExpedicao)
        });

        expedicaoEditandoId = null;
    } else {
        await fetch('/expedicoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosExpedicao)
        });
    }

    document.getElementById('relatorio').className = '';
    document.getElementById('relatorio').innerHTML = `
        <div class="relatorio-card">
<p>🌱 <strong>Produtor:</strong> ${produtor}</p>

<p>👤 <strong>Motorista:</strong> ${motorista}</p>

<p>🚛 <strong>Cavalo:</strong> ${placa_cavalo}</p>

<p>🚛 <strong>Carreta 1:</strong> ${placa_carreta1} - ${variedade1}</p>

${veiculo === "Rodo Caçamba"
? `<p>🚛 <strong>Carreta 2:</strong> ${placa_carreta2 || "Não informado"} - ${variedade2 || "Não informado"}</p>`
: ""}

<p>🚚 <strong>Veículo:</strong> ${veiculo}</p>

<p>📍 <strong>Origem:</strong> ${origem}</p>

<p>🏭 <strong>Destino:</strong> ${destino}</p>

<p>🕒 <strong>Saída:</strong> ${saida}</p>

<p>⚖️ <strong>Peso Estimado:</strong> ${peso}</p>
        </div>
    `;

    abrirAba('relatorios', document.querySelectorAll('.menu-btn')[3]);

    limparFormularioExpedicao();
    carregarDashboard();
    carregarHistorico();
}

function limparFormularioExpedicao() {
    document.getElementById('placaCavalo').value = '';
    document.getElementById('motorista').value = '';
    document.getElementById('produtor').value = '';
    document.getElementById('origem').value = '';
    document.getElementById('veiculo').value = '';
    document.getElementById('placaCarreta1').value = '';
    document.getElementById('variedade1').value = '';
    document.getElementById('placaCarreta2').value = '';
    document.getElementById('variedade2').value = '';
    document.getElementById('peso').value = '';

    document.getElementById('campoCarreta2').style.display = 'none';
    document.getElementById('campoVariedade2').style.display = 'none';

    esconderFotoCaminhao();
}

async function carregarHistorico() {
    const resposta = await fetch('/expedicoes');
    const dados = await resposta.json();

    const tabela = document.getElementById('tabelaHistorico');

    if (!tabela) return;

    tabela.innerHTML = '';

    dados.forEach(e => {
        tabela.innerHTML += `
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
                <td>
                    <button class="small-btn edit" onclick='editarExpedicao(${JSON.stringify(e)})'>Editar</button>
                    <button class="small-btn delete" onclick="excluirExpedicao(${e.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function editarExpedicao(e) {
    expedicaoEditandoId = e.id;

    document.getElementById('placaCavalo').value = e.placa_cavalo || '';
    document.getElementById('motorista').value = e.motorista || '';
    document.getElementById('produtor').value = e.produtor || '';
    document.getElementById('origem').value = e.origem || '';
    document.getElementById('veiculo').value = e.veiculo || '';
    document.getElementById('placaCarreta1').value = e.placa_carreta1 || '';
    document.getElementById('variedade1').value = e.variedade1 || '';
    document.getElementById('placaCarreta2').value = e.placa_carreta2 || '';
    document.getElementById('variedade2').value = e.variedade2 || '';
    document.getElementById('peso').value = e.peso || '';

    definirPeso();

    if (e.veiculo === 'Rodo Caçamba') {
        document.getElementById('placaCarreta2').value = e.placa_carreta2 || '';
        document.getElementById('variedade2').value = e.variedade2 || '';
    }

    abrirAba('expedicao', document.querySelectorAll('.menu-btn')[2]);
}

async function excluirExpedicao(id) {
    const confirmar = confirm('Tem certeza que deseja excluir esta expedição?');

    if (!confirmar) return;

    await fetch(`/expedicoes/${id}`, {
        method: 'DELETE'
    });

    carregarHistorico();
    carregarDashboard();
}

async function carregarDashboard() {
    const resposta = await fetch('/dashboard');
    const dados = await resposta.json();

    document.getElementById('totalCarretas').innerText =
        dados.totalExpedicoes || 0;

    document.getElementById('totalBags').innerText =
        `${dados.pesoEstimadoTotal || 0} kg`;
}

carregarDashboard();
function copiarRelatorioWhatsapp() {

    const produtor =
        document.getElementById('produtor').value;

    const motorista =
        document.getElementById('motorista').value;

    const cavalo =
        document.getElementById('placaCavalo').value;

    const origem =
        document.getElementById('origem').value;

    const veiculo =
        document.getElementById('veiculo').value;

    const carreta1 =
        document.getElementById('placaCarreta1').value;

    const variedade1 =
        document.getElementById('variedade1').value;

    const carreta2 =
        document.getElementById('placaCarreta2').value;

    const variedade2 =
        document.getElementById('variedade2').value;

    const peso =
        document.getElementById('peso').value;

    const saida =
        new Date().toLocaleString('pt-BR');

    let mensagem = `🚚 *EXPEDIÇÃO GERADA*

🌱 *Produtor:* ${produtor}

👤 *Motorista:* ${motorista}

🚛 *Cavalo:* ${cavalo}

📍 *Origem:* ${origem}

🏭 *Destino:* McCain – Araxá/MG

🕒 *Saída:* ${saida}

🚚 *Veículo:* ${veiculo}

🚛 *Carreta 1:* ${carreta1}

🥔 *Variedade 1:* ${variedade1}
`;

    if (veiculo === 'Rodo Caçamba') {

        mensagem += `

🚛 *Carreta 2:* ${carreta2}

🥔 *Variedade 2:* ${variedade2}
`;
    }

    mensagem += `

⚖️ *Peso Estimado:* ${peso}

📸 *Foto do caminhão em anexo.*
`;

    navigator.clipboard.writeText(mensagem);

    alert(
        '✅ Relatório copiado! Agora abra o WhatsApp e cole a mensagem.'
    );
}

function abrirWhatsapp() {

    window.open(
        'https://web.whatsapp.com/',
        '_blank'
    );
}