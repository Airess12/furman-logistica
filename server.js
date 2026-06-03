const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const { conectar, criarTabelas } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '200mb' }));

app.use(express.urlencoded({
    extended: true,
    limit: '200mb'
}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'furman-logistica',
    resave: false,
    saveUninitialized: false
}));

app.use('/style.css', express.static(path.join(__dirname, 'public', 'style.css')));
app.use('/img', express.static(path.join(__dirname, 'public', 'img')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

function proteger(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect('/login.html');
    }
    next();
}

function protegerApi(req, res, next) {
    if (!req.session.usuario) {
        return res.status(401).json({ status: 'erro' });
    }
    next();
}

function somenteMaster(req, res, next) {
    if (!req.session.usuario) {
        return res.status(401).json({
            status: 'erro',
            mensagem: 'Usuário não autenticado'
        });
    }

    if (req.session.usuario.tipo !== 'master') {
        return res.status(403).json({
            status: 'erro',
            mensagem: 'Acesso permitido apenas ao Master'
        });
    }

    next();
}

async function auditarAlteracoes(req, tabela, id, antes, depois) {
    for (const campo in depois) {
        const valorAntigo = antes?.[campo] ?? '';
        const valorNovo = depois?.[campo] ?? '';

        if (String(valorAntigo) !== String(valorNovo)) {
            await registrarAuditoria(req, {
                acao: 'ALTERAÇÃO',
                tabela,
                registro_id: id,
                campo,
                valor_antigo: valorAntigo,
                valor_novo: valorNovo
            });
        }
    }
}

async function registrarAuditoria(req, dados) {
    try {
        const db = await conectar();

        const usuario =
            req.session?.usuario?.nome ||
            req.session?.usuario?.usuario ||
            'Sistema';

        await db.run(`
            INSERT INTO auditoria_alteracoes
            (usuario, acao, tabela, registro_id, campo, valor_antigo, valor_novo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            usuario,
            dados.acao,
            dados.tabela,
            String(dados.registro_id || ''),
            dados.campo || '',
            dados.valor_antigo !== undefined ? String(dados.valor_antigo || '') : '',
            dados.valor_novo !== undefined ? String(dados.valor_novo || '') : ''
        ]);

    } catch (erro) {
        console.error('Erro ao registrar auditoria:', erro);
    }
}

// Lê destinatários do .env — formato: "Nome1:email1,Nome2:email2"
function getDestinatarios() {
    const raw = process.env.EMAIL_DESTINATARIOS || '';

    if (!raw) return [];

    return raw.split(',').map(entrada => {
        const [nome, email] = entrada.split(':');
        return { name: nome?.trim(), email: email?.trim() };
    }).filter(d => d.name && d.email);
}

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
    const db = await conectar();

    const { usuario, senha } = req.body;

    const usuarioBanco = await db.get(
        `SELECT * FROM usuarios WHERE usuario = ?`,
        [usuario]
    );

    if (!usuarioBanco) {
        return res.status(401).json({ status: 'erro' });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuarioBanco.senha);

    if (!senhaCorreta) {
        return res.status(401).json({ status: 'erro' });
    }

    req.session.usuario = {
        id: usuarioBanco.id,
        usuario: usuarioBanco.usuario,
        nome: usuarioBanco.nome || usuarioBanco.usuario,
        foto: usuarioBanco.foto || '/img/LOGO.jpeg',
        tipo: usuarioBanco.tipo || 'usuario'
    };

    res.json({
        status: 'ok',
        usuario: {
            id: usuarioBanco.id,
            usuario: usuarioBanco.usuario,
            nome: usuarioBanco.nome || usuarioBanco.usuario,
            foto: usuarioBanco.foto || '/img/LOGO.jpeg',
            tipo: usuarioBanco.tipo || 'usuario'
        }
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ status: 'ok' });
    });
});

app.get('/', proteger, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/script.js', proteger, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'script.js'));
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const pasta = path.join(__dirname, 'public', 'uploads');

        if (!fs.existsSync(pasta)) {
            fs.mkdirSync(pasta, { recursive: true });
        }

        cb(null, pasta);
    },

    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

app.post('/motoristas', protegerApi, upload.single('foto'), async (req, res) => {
    const db = await conectar();

    const placa = req.body.placa.toUpperCase().trim();
    const motorista = req.body.motorista.trim();

    const foto = req.file
        ? '/uploads/' + req.file.filename
        : '';

    await db.run(`
        INSERT INTO motoristas (placa, motorista, foto)
        VALUES (?, ?, ?)
        ON CONFLICT (placa)
        DO UPDATE SET
            motorista = EXCLUDED.motorista,
            foto = CASE
                WHEN EXCLUDED.foto = ''
                THEN motoristas.foto
                ELSE EXCLUDED.foto
            END
    `, [placa, motorista, foto]);

    res.json({ status: 'ok' });
});

app.get('/motoristas/:placa', protegerApi, async (req, res) => {
    const db = await conectar();

    const placa = req.params.placa.toUpperCase().trim();

    const motorista = await db.get(
        `SELECT * FROM motoristas WHERE placa = ?`,
        [placa]
    );

    res.json(motorista || {});
});

app.post('/produtores', protegerApi, async (req, res) => {
    const db = await conectar();

    const nome = req.body.nome.trim();

    await db.run(`
        INSERT INTO produtores (nome)
        VALUES (?)
        ON CONFLICT (nome)
        DO NOTHING
    `, [nome]);

    res.json({ status: 'ok' });
});

app.get('/produtores', protegerApi, async (req, res) => {
    const db = await conectar();

    const produtores = await db.all(`
        SELECT *
        FROM produtores
        ORDER BY nome ASC
    `);

    res.json(produtores);
});

app.post('/origens', protegerApi, async (req, res) => {
    const db = await conectar();

    const nome = req.body.nome.trim();

    await db.run(`
        INSERT INTO origens (nome)
        VALUES (?)
        ON CONFLICT (nome)
        DO NOTHING
    `, [nome]);

    res.json({ status: 'ok' });
});

app.get('/origens', protegerApi, async (req, res) => {
    const db = await conectar();

    const origens = await db.all(`
        SELECT *
        FROM origens
        ORDER BY nome ASC
    `);

    res.json(origens);
});

app.post('/carretas', protegerApi, async (req, res) => {
    const db = await conectar();

    const placa = req.body.placa.toUpperCase().trim();

    await db.run(`
        INSERT INTO carretas (placa)
        VALUES (?)
        ON CONFLICT (placa)
        DO NOTHING
    `, [placa]);

    res.json({ status: 'ok' });
});

app.get('/carretas', protegerApi, async (req, res) => {
    const db = await conectar();

    const carretas = await db.all(`
        SELECT *
        FROM carretas
        ORDER BY placa ASC
    `);

    res.json(carretas);
});

app.post('/expedicoes', protegerApi, async (req, res) => {
    const db = await conectar();

    const {
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
    } = req.body;

    await db.run(`
        INSERT INTO expedicoes (
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
            saida,
            status,
            resultado,
            motivo_reprovacao,
            resultado_c1,
            motivo_c1,
            resultado_c2,
            motivo_c2
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
        saida,
        'Em viagem',
        'Pendente',
        '',
        'Pendente',
        '',
        placa_carreta2 ? 'Pendente' : '',
        ''
    ]);

    res.json({ status: 'ok' });
});

app.put('/expedicoes/:id', protegerApi, async (req, res) => {
    const db = await conectar();
    const id = req.params.id;

    const antes = await db.get(`SELECT * FROM expedicoes WHERE id = ?`, [id]);

    if (!antes) {
        return res.status(404).json({ status: 'erro', mensagem: 'Expedição não encontrada' });
    }

    const {
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
        peso
    } = req.body;

    await db.run(`
        UPDATE expedicoes
        SET
            produtor = ?,
            placa_cavalo = ?,
            motorista = ?,
            origem = ?,
            destino = ?,
            veiculo = ?,
            placa_carreta1 = ?,
            variedade1 = ?,
            placa_carreta2 = ?,
            variedade2 = ?,
            peso = ?
        WHERE id = ?
    `, [
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
        id
    ]);

    const campos = {
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
        peso
    };

    for (const campo in campos) {
        if (String(antes[campo] || '') !== String(campos[campo] || '')) {
            await registrarAuditoria(req, {
                acao: 'ALTERAÇÃO',
                tabela: 'expedicoes',
                registro_id: id,
                campo,
                valor_antigo: antes[campo],
                valor_novo: campos[campo]
            });
        }
    }

    res.json({ status: 'ok' });
});

app.get('/expedicoes', protegerApi, async (req, res) => {
    const db = await conectar();

    const expedicoes = await db.all(`
        SELECT *
        FROM expedicoes
        ORDER BY id DESC
    `);

    res.json(expedicoes);
});

app.put('/expedicoes/:id/qualidade-carretas', protegerApi, async (req, res) => {
    const db = await conectar();
    const id = req.params.id;

    const antes = await db.get(`SELECT * FROM expedicoes WHERE id = ?`, [id]);

    const {
        status,
        resultado_c1,
        motivo_c1,
        resultado_c2,
        motivo_c2
    } = req.body;

    const resultadoGeral =
        resultado_c1 === 'Reprovado' || resultado_c2 === 'Reprovado'
            ? 'Reprovado'
            : resultado_c1 === 'Aprovado' && (!resultado_c2 || resultado_c2 === 'Aprovado')
                ? 'Aprovado'
                : 'Pendente';

    const motivoGeral = [
        motivo_c1 ? `C1: ${motivo_c1}` : '',
        motivo_c2 ? `C2: ${motivo_c2}` : ''
    ].filter(Boolean).join(' | ');

    const depois = {
        status,
        resultado_c1: resultado_c1 || 'Pendente',
        motivo_c1: motivo_c1 || '',
        resultado_c2: resultado_c2 || '',
        motivo_c2: motivo_c2 || '',
        resultado: resultadoGeral,
        motivo_reprovacao: motivoGeral
    };

    await db.run(`
        UPDATE expedicoes
        SET
            status = ?,
            resultado_c1 = ?,
            motivo_c1 = ?,
            resultado_c2 = ?,
            motivo_c2 = ?,
            resultado = ?,
            motivo_reprovacao = ?
        WHERE id = ?
    `, [
        depois.status,
        depois.resultado_c1,
        depois.motivo_c1,
        depois.resultado_c2,
        depois.motivo_c2,
        depois.resultado,
        depois.motivo_reprovacao,
        id
    ]);

    if (antes) {
        await auditarAlteracoes(req, 'expedicoes', id, antes, depois);
    }

    res.json({ status: 'ok' });
});

app.put('/expedicoes/:id/qualidade', protegerApi, async (req, res) => {
    const db = await conectar();
    const id = req.params.id;

    const antes = await db.get(`SELECT * FROM expedicoes WHERE id = ?`, [id]);

    const { status, resultado, motivo_reprovacao } = req.body;

    const depois = {
        status,
        resultado,
        motivo_reprovacao: motivo_reprovacao || ''
    };

    await db.run(`
        UPDATE expedicoes
        SET
            status = ?,
            resultado = ?,
            motivo_reprovacao = ?
        WHERE id = ?
    `, [
        depois.status,
        depois.resultado,
        depois.motivo_reprovacao,
        id
    ]);

    if (antes) {
        await auditarAlteracoes(req, 'expedicoes', id, antes, depois);
    }

    res.json({ status: 'ok' });
});

app.delete('/expedicoes/:id', protegerApi, async (req, res) => {
    const db = await conectar();
    const id = req.params.id;

    const antes = await db.get(
        `SELECT * FROM expedicoes WHERE id = ?`,
        [id]
    );

    if (!antes) {
        return res.status(404).json({
            status: 'erro',
            mensagem: 'Expedição não encontrada'
        });
    }

    await registrarAuditoria(req, {
        acao: 'EXCLUSÃO',
        tabela: 'expedicoes',
        registro_id: id,
        campo: 'registro',
        valor_antigo: JSON.stringify(antes),
        valor_novo: ''
    });

    await db.run(`
        DELETE FROM expedicoes
        WHERE id = ?
    `, [id]);

    res.json({ status: 'ok' });
});

app.get('/dashboard', protegerApi, async (req, res) => {
    const db = await conectar();

    const totalExpedicoes = await db.get(`
        SELECT COUNT(*) AS total
        FROM expedicoes
    `);

    const totalPeso = await db.get(`
        SELECT COUNT(*) * 38000 AS total
        FROM expedicoes
    `);

    const aprovadasC1 = await db.get(`
        SELECT COUNT(*) AS total
        FROM expedicoes
        WHERE resultado_c1 = 'Aprovado'
    `);

    const reprovadasC1 = await db.get(`
        SELECT COUNT(*) AS total
        FROM expedicoes
        WHERE resultado_c1 = 'Reprovado'
    `);

    const restricaoC1 = await db.get(`
        SELECT COUNT(*) AS total
        FROM expedicoes
        WHERE resultado_c1 = 'Aprovado com Restrição'
    `);

    const aprovadasC2 = await db.get(`
        SELECT COUNT(*) AS total
        FROM expedicoes
        WHERE resultado_c2 = 'Aprovado'
    `);

    const reprovadasC2 = await db.get(`
        SELECT COUNT(*) AS total
        FROM expedicoes
        WHERE resultado_c2 = 'Reprovado'
    `);

    const restricaoC2 = await db.get(`
        SELECT COUNT(*) AS total
        FROM expedicoes
        WHERE resultado_c2 = 'Aprovado com Restrição'
    `);

    const aprovadosTotal =
        Number(aprovadasC1.total || 0) + Number(aprovadasC2.total || 0);

    const reprovadosTotal =
        Number(reprovadasC1.total || 0) + Number(reprovadasC2.total || 0);

    const restricaoTotal =
        Number(restricaoC1.total || 0) + Number(restricaoC2.total || 0);

    const avaliados = aprovadosTotal + reprovadosTotal + restricaoTotal;

    const taxaAprovacao = avaliados > 0
        ? ((aprovadosTotal / avaliados) * 100).toFixed(1)
        : '0';

    const taxaReprovacao = avaliados > 0
        ? ((reprovadosTotal / avaliados) * 100).toFixed(1)
        : '0';

    res.json({
        totalExpedicoes: Number(totalExpedicoes.total || 0),
        pesoEstimadoTotal: Number(totalPeso.total || 0),
        aprovados: aprovadosTotal,
        reprovados: reprovadosTotal,
        restricao: restricaoTotal,
        taxaAprovacao,
        taxaReprovacao
    });
});

app.post('/analises-qualidade', protegerApi, upload.single('foto_analise'), async (req, res) => {
    const db = await conectar();

    const foto_analise = req.file ? '/uploads/' + req.file.filename : '';

    const {
        fazenda, variedade, solidos, temperatura_agua, temperatura_media,
        peso_agua, placa, peso_total, peso_lavado, fritura,
        classificacao_fritura, quantidade_palitos,
        diametro_35, diametro_35_45, diametro_45,
        menos75_qtd, menos75_peso,
        mais75_qtd, mais75_peso,
        mais100_qtd, mais100_peso,
        mais150_qtd, mais150_peso,
        defeito, pontos
    } = req.body;

    await db.run(`
        INSERT INTO analises_qualidade (
            fazenda, variedade, solidos, temperatura_agua, temperatura_media,
            peso_agua, placa, peso_total, peso_lavado, fritura,
            classificacao_fritura, quantidade_palitos,
            diametro_35, diametro_35_45, diametro_45,
            menos75_qtd, menos75_peso,
            mais75_qtd, mais75_peso,
            mais100_qtd, mais100_peso,
            mais150_qtd, mais150_peso,
            defeito, pontos, foto_analise
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        fazenda || '', variedade || '', solidos || '', temperatura_agua || '', temperatura_media || '',
        peso_agua || '', placa || '', peso_total || '', peso_lavado || '', fritura || '',
        classificacao_fritura || '', quantidade_palitos || '',
        diametro_35 || '', diametro_35_45 || '', diametro_45 || '',
        menos75_qtd || '', menos75_peso || '',
        mais75_qtd || '', mais75_peso || '',
        mais100_qtd || '', mais100_peso || '',
        mais150_qtd || '', mais150_peso || '',
        defeito || '', pontos || '', foto_analise
    ]);

    res.json({ status: 'ok' });
});

app.get('/analises-qualidade', protegerApi, async (req, res) => {
    const db = await conectar();

    const analises = await db.all(`
        SELECT *
        FROM analises_qualidade
        ORDER BY id DESC
    `);

    res.json(analises);
});

app.delete('/analises-qualidade/:id', protegerApi, async (req, res) => {
    const db = await conectar();

    // ✅ Auditoria no DELETE de análise
    const antes = await db.get(
        `SELECT * FROM analises_qualidade WHERE id = ?`,
        [req.params.id]
    );

    if (antes) {
        await registrarAuditoria(req, {
            acao: 'EXCLUSÃO',
            tabela: 'analises_qualidade',
            registro_id: req.params.id,
            campo: 'registro',
            valor_antigo: JSON.stringify(antes),
            valor_novo: ''
        });
    }

    await db.run(`
        DELETE FROM analises_qualidade
        WHERE id = ?
    `, [req.params.id]);

    res.json({ status: 'ok' });
});

// ✅ OPÇÃO C: Auditoria no PUT de análises de qualidade
app.put('/analises-qualidade/:id', protegerApi, upload.single('foto_analise'), async (req, res) => {
    const db = await conectar();
    const id = req.params.id;

    // Busca o estado antes da edição
    const antes = await db.get(
        `SELECT * FROM analises_qualidade WHERE id = ?`,
        [id]
    );

    const foto_analise = req.file ? '/uploads/' + req.file.filename : null;

    const {
        variedade, solidos, peso_agua, placa, peso_total, peso_lavado,
        classificacao_fritura, quantidade_palitos,
        diametro_35, diametro_35_45, diametro_45,
        menos75_qtd, menos75_peso,
        mais75_qtd, mais75_peso,
        mais100_qtd, mais100_peso,
        mais150_qtd, mais150_peso,
        defeito, pontos
    } = req.body;

    await db.run(`
        UPDATE analises_qualidade
        SET
            variedade = ?, solidos = ?, peso_agua = ?, placa = ?,
            peso_total = ?, peso_lavado = ?,
            classificacao_fritura = ?, quantidade_palitos = ?,
            diametro_35 = ?, diametro_35_45 = ?, diametro_45 = ?,
            menos75_qtd = ?, menos75_peso = ?,
            mais75_qtd = ?, mais75_peso = ?,
            mais100_qtd = ?, mais100_peso = ?,
            mais150_qtd = ?, mais150_peso = ?,
            defeito = ?, pontos = ?,
            foto_analise = COALESCE(?, foto_analise)
        WHERE id = ?
    `, [
        variedade, solidos, peso_agua, placa,
        peso_total, peso_lavado,
        classificacao_fritura || '', quantidade_palitos || '',
        diametro_35, diametro_35_45, diametro_45,
        menos75_qtd, menos75_peso,
        mais75_qtd, mais75_peso,
        mais100_qtd, mais100_peso,
        mais150_qtd, mais150_peso,
        defeito, pontos,
        foto_analise,
        id
    ]);

    // Registra auditoria campo a campo
    if (antes) {
        const depois = {
            variedade, solidos, peso_agua, placa,
            peso_total, peso_lavado,
            classificacao_fritura: classificacao_fritura || '',
            quantidade_palitos: quantidade_palitos || '',
            diametro_35, diametro_35_45, diametro_45,
            menos75_qtd, menos75_peso,
            mais75_qtd, mais75_peso,
            mais100_qtd, mais100_peso,
            mais150_qtd, mais150_peso,
            defeito, pontos
        };

        await auditarAlteracoes(req, 'analises_qualidade', id, antes, depois);
    }

    res.json({ status: 'ok' });
});

app.get('/dashboard-qualidade', protegerApi, async (req, res) => {
    try {
        const db = await conectar();

        const analises = await db.all(`
            SELECT *
            FROM analises_qualidade
            ORDER BY id DESC
        `);

        res.json(analises);

    } catch (erro) {
        console.error('ERRO DASHBOARD QUALIDADE:', erro);
        res.status(500).json({ erro: 'Erro ao carregar dashboard qualidade' });
    }
});

app.post('/usuarios', protegerApi, somenteMaster, async (req, res) => {
    const db = await conectar();

    const { usuario, senha, tipo } = req.body;

    if (!usuario || !senha || !tipo) {
        return res.status(400).json({ status: 'erro' });
    }

    if (tipo === 'master') {
        return res.status(403).json({
            status: 'erro',
            mensagem: 'Não é permitido criar usuário Master pela tela'
        });
    }

    const senhaCriptografada = await bcrypt.hash(senha, 10);

    await db.run(`
        INSERT INTO usuarios (usuario, senha, tipo)
        VALUES (?, ?, ?)
        ON CONFLICT (usuario)
        DO UPDATE SET
            senha = EXCLUDED.senha,
            tipo = EXCLUDED.tipo
    `, [
        usuario,
        senhaCriptografada,
        tipo
    ]);

    res.json({ status: 'ok' });
});

app.get('/usuarios', protegerApi, somenteMaster, async (req, res) => {
    const db = await conectar();

    const usuarios = await db.all(`
        SELECT id, usuario, tipo
        FROM usuarios
        WHERE tipo != 'master'
        ORDER BY usuario ASC
    `);

    res.json(usuarios);
});

app.put('/usuarios/:id', protegerApi, somenteMaster, async (req, res) => {
    const db = await conectar();

    const { usuario, senha, tipo } = req.body;

    if (!usuario || !tipo) {
        return res.status(400).json({ status: 'erro' });
    }

    if (tipo === 'master') {
        return res.status(403).json({
            status: 'erro',
            mensagem: 'Não é permitido editar usuário para Master'
        });
    }

    if (senha) {
        const senhaCriptografada = await bcrypt.hash(senha, 10);

        await db.run(`
            UPDATE usuarios
            SET usuario = ?, senha = ?, tipo = ?
            WHERE id = ? AND tipo != 'master'
        `, [usuario, senhaCriptografada, tipo, req.params.id]);
    } else {
        await db.run(`
            UPDATE usuarios
            SET usuario = ?, tipo = ?
            WHERE id = ? AND tipo != 'master'
        `, [usuario, tipo, req.params.id]);
    }

    res.json({ status: 'ok' });
});

app.delete('/usuarios/:id', protegerApi, somenteMaster, async (req, res) => {
    const db = await conectar();

    await db.run(`
        DELETE FROM usuarios
        WHERE id = ? AND tipo != 'master'
    `, [req.params.id]);

    res.json({ status: 'ok' });
});

app.post('/enviar-relatorio-qualidade', protegerApi, async (req, res) => {
    try {
        const { pdfBase64, placa } = req.body;

        const destinatarios = getDestinatarios();

        if (!destinatarios.length) {
            console.error('Nenhum destinatário configurado em EMAIL_DESTINATARIOS');
            return res.status(500).json({ status: 'erro', mensagem: 'Nenhum destinatário configurado' });
        }

        const respostaBrevo = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    name: 'Sistema Furman',
                    email: process.env.EMAIL_FROM
                },
                to: destinatarios,
                subject: `Relatório de Qualidade - ${placa || 'Carga'} - Furman Agronegócios`,
                htmlContent: `
    <div style="
        font-family: Arial, sans-serif;
        background: #0f172a;
        color: #ffffff;
        padding: 30px;
        border-radius: 18px;
    ">
        <h2 style="color: #21ff9d; margin-bottom: 18px;">
            📄 Relatório de Qualidade
        </h2>
        <p style="font-size:15px; line-height:1.6;">
            Segue em anexo o relatório de qualidade gerado automaticamente pelo sistema da <strong>Furman Agronegócios</strong>.
        </p>
        <div style="
            margin-top:20px;
            padding:18px;
            border-radius:14px;
            background: rgba(255,255,255,.05);
            border:1px solid rgba(255,255,255,.08);
        ">
            <p><strong>🚛 Placa:</strong> ${placa || 'Carga'}</p>
            <p><strong>🧪 Laboratório:</strong> Palmas - PR</p>
            <p><strong>🕒 Emitido em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        </div>
        <p style="margin-top:24px; color:#94a3b8; font-size:13px;">
            Este e-mail foi enviado automaticamente pelo sistema operacional da Furman Agronegócios!.
        </p>
    </div>
`,
                attachment: [
                    {
                        name: `relatorio-qualidade-${placa || 'carga'}.pdf`,
                        content: pdfBase64.split(',')[1]
                    }
                ]
            })
        });

        if (!respostaBrevo.ok) {
            const erroBrevo = await respostaBrevo.text();
            console.error('Erro Brevo:', erroBrevo);
            return res.status(500).json({ status: 'erro' });
        }

        res.json({ status: 'ok' });

    } catch (erro) {
        console.error('Erro ao enviar relatório:', erro);
        res.status(500).json({ status: 'erro' });
    }
});

app.post('/perfil/foto', protegerApi, upload.single('foto'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'erro', mensagem: 'Nenhuma foto enviada' });
    }

    const db = await conectar();

    const foto = '/uploads/' + req.file.filename;

    await db.run(
        `UPDATE usuarios SET foto = ? WHERE id = ?`,
        [foto, req.session.usuario.id]
    );

    res.json({ status: 'ok', foto });
});

app.get('/auditoria', protegerApi, async (req, res) => {
    try {
        const db = await conectar();

        const auditoria = await db.all(`
            SELECT *
            FROM auditoria_alteracoes
            ORDER BY id DESC
            LIMIT 300
        `);

        res.json(auditoria);

    } catch (erro) {
        console.error(erro);
        res.status(500).json({ status: 'erro' });
    }
});

app.get('/exportar-analises-csv', protegerApi, async (req, res) => {
    try {
        const db = await conectar();

        const dados = await db.all(`
            SELECT *
            FROM analises_qualidade
            ORDER BY id DESC
        `);

        if (!dados.length) {
            return res.status(404).send('Nenhuma análise encontrada.');
        }

        const colunas = Object.keys(dados[0]);
        let csv = colunas.join(',') + '\n';

        dados.forEach(linha => {
            csv += colunas.map(coluna =>
                `"${String(linha[coluna] ?? '').replace(/"/g, '""')}"`
            ).join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=analises_qualidade.csv'
        );

        res.send(csv);

    } catch (erro) {
        console.error('Erro ao exportar CSV:', erro);
        res.status(500).send('Erro ao exportar CSV');
    }
});

criarTabelas()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Rodando em http://localhost:${PORT}`);
        });
    })
    .catch((erro) => {
        console.error('❌ Erro ao inicializar banco:', erro);
        process.exit(1);
    });