const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const cron = require('node-cron');
const ExcelJS = require('exceljs');

const { conectar, criarTabelas } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'furman-logistica',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 2 * 60 * 60 * 1000 }
}));

app.use('/style.css', express.static(path.join(__dirname, 'public', 'style.css')));
app.use('/img', express.static(path.join(__dirname, 'public', 'img')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

function proteger(req, res, next) {
    if (!req.session.usuario) return res.redirect('/login.html');
    next();
}

function protegerApi(req, res, next) {
    if (!req.session.usuario) return res.status(401).json({ status: 'erro' });
    next();
}

function somenteMaster(req, res, next) {
    if (!req.session.usuario) return res.status(401).json({ status: 'erro' });
    if (req.session.usuario.tipo !== 'master') return res.status(403).json({ status: 'erro', mensagem: 'Acesso permitido apenas ao Master' });
    next();
}

function somenteQualidade(req, res, next) {
    const tipo = req.session.usuario?.tipo;
    const permitidos = ['master', 'gerente', 'qualidade', 'laboratorio'];
    if (!permitidos.includes(tipo)) return res.status(403).json({ status: 'erro', mensagem: 'Acesso não permitido' });
    next();
}

function somenteExpedicao(req, res, next) {
    const tipo = req.session.usuario?.tipo;
    const permitidos = ['master', 'gerente', 'admin', 'expedicao'];
    if (!permitidos.includes(tipo)) return res.status(403).json({ status: 'erro', mensagem: 'Acesso não permitido' });
    next();
}

const tentativasLogin = new Map();

function verificarRateLimit(ip) {
    const agora = Date.now();
    const dados = tentativasLogin.get(ip);
    if (!dados) return true;
    if (agora - dados.ultimaTentativa > 15 * 60 * 1000) { tentativasLogin.delete(ip); return true; }
    if (dados.tentativas >= 5) return false;
    return true;
}

async function registrarTentativaFalha(ip, usuario = '') {
    const agora = Date.now();
    const dados = tentativasLogin.get(ip) || { tentativas: 0, ultimaTentativa: agora };
    dados.tentativas++;
    dados.ultimaTentativa = agora;
    tentativasLogin.set(ip, dados);
    try {
        const db = await conectar();
        await db.run(
            `INSERT INTO auditoria_alteracoes (usuario, acao, tabela, registro_id, campo, valor_antigo, valor_novo) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [usuario || ip, 'TENTATIVA_LOGIN', 'usuarios', '', 'senha', '', `Tentativa ${dados.tentativas} — IP: ${ip}`]
        );
    } catch (erro) {
        console.error('Erro ao registrar tentativa:', erro);
    }
}

function limparTentativas(ip) { tentativasLogin.delete(ip); }

async function registrarAuditoria(req, dados) {
    try {
        const db = await conectar();
        const usuario = req.session?.usuario?.nome || req.session?.usuario?.usuario || 'Sistema';
        await db.run(
            `INSERT INTO auditoria_alteracoes (usuario, acao, tabela, registro_id, campo, valor_antigo, valor_novo) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [usuario, dados.acao, dados.tabela, String(dados.registro_id || ''), dados.campo || '', dados.valor_antigo !== undefined ? String(dados.valor_antigo || '') : '', dados.valor_novo !== undefined ? String(dados.valor_novo || '') : '']
        );
    } catch (erro) {
        console.error('Erro ao registrar auditoria:', erro);
    }
}

async function getSafraAtiva(db) {
    const safra = await db.get(`SELECT id FROM safras WHERE ativa = TRUE LIMIT 1`);
    return safra?.id || null;
}

async function auditarAlteracoes(req, tabela, id, antes, depois) {
    for (const campo in depois) {
        const valorAntigo = antes?.[campo] ?? '';
        const valorNovo = depois?.[campo] ?? '';
        if (String(valorAntigo) !== String(valorNovo)) {
            await registrarAuditoria(req, { acao: 'ALTERAÇÃO', tabela, registro_id: id, campo, valor_antigo: valorAntigo, valor_novo: valorNovo });
        }
    }
}

function getDestinatarios() {
    const raw = process.env.EMAIL_DESTINATARIOS || '';
    if (!raw) return [];
    return raw.split(',').map(entrada => {
        const [nome, email] = entrada.split(':');
        return { name: nome?.trim(), email: email?.trim() };
    }).filter(d => d.name && d.email);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const pasta = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
        cb(null, pasta);
    },
    filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage });

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.post('/login', async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    if (!verificarRateLimit(ip)) return res.status(429).json({ status: 'erro', mensagem: 'Muitas tentativas. Tente novamente em 15 minutos.' });

    const db = await conectar();
    const { usuario, senha } = req.body;
    const usuarioBanco = await db.get(`SELECT * FROM usuarios WHERE usuario = ?`, [usuario]);

    if (!usuarioBanco) { await registrarTentativaFalha(ip, usuario); return res.status(401).json({ status: 'erro' }); }

    const senhaCorreta = await bcrypt.compare(senha, usuarioBanco.senha);
    if (!senhaCorreta) { await registrarTentativaFalha(ip, usuario); return res.status(401).json({ status: 'erro' }); }

    limparTentativas(ip);
    req.session.usuario = { id: usuarioBanco.id, usuario: usuarioBanco.usuario, nome: usuarioBanco.nome || usuarioBanco.usuario, foto: usuarioBanco.foto || '/img/LOGO.jpeg', tipo: usuarioBanco.tipo || 'usuario' };
    res.json({ status: 'ok', usuario: req.session.usuario });
});

app.post('/logout', (req, res) => { req.session.destroy(() => res.json({ status: 'ok' })); });
app.get('/me', protegerApi, (req, res) => res.json({ status: 'ok', usuario: req.session.usuario }));
app.get('/', proteger, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/script.js', proteger, (req, res) => res.sendFile(path.join(__dirname, 'public', 'script.js')));

app.post('/motoristas', protegerApi, upload.single('foto'), async (req, res) => {
    const db = await conectar();
    const placa = req.body.placa.toUpperCase().trim();
    const motorista = req.body.motorista.trim();
    const foto = req.file ? '/uploads/' + req.file.filename : '';
    const carreta1 = req.body.carreta1 || '';
    const carreta2 = req.body.carreta2 || '';
    const tipo_veiculo = req.body.tipo_veiculo || '4º Eixo';

    await db.run(`
        INSERT INTO motoristas (placa, motorista, foto, carreta1, carreta2, tipo_veiculo)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (placa)
        DO UPDATE SET
            motorista = EXCLUDED.motorista,
            foto = CASE WHEN EXCLUDED.foto = '' THEN motoristas.foto ELSE EXCLUDED.foto END,
            carreta1 = EXCLUDED.carreta1,
            carreta2 = EXCLUDED.carreta2,
            tipo_veiculo = EXCLUDED.tipo_veiculo
    `, [placa, motorista, foto, carreta1, carreta2, tipo_veiculo]);

    res.json({ status: 'ok' });
});
app.get('/motoristas/:placa', protegerApi, async (req, res) => {
    const db = await conectar();
    const motorista = await db.get(`SELECT * FROM motoristas WHERE placa = ?`, [req.params.placa.toUpperCase().trim()]);
    res.json(motorista || {});
});

app.post('/produtores', protegerApi, async (req, res) => {
    const db = await conectar();
    await db.run(`INSERT INTO produtores (nome) VALUES (?) ON CONFLICT (nome) DO NOTHING`, [req.body.nome.trim()]);
    res.json({ status: 'ok' });
});
app.get('/produtores', protegerApi, async (req, res) => {
    const db = await conectar();
    res.json(await db.all(`SELECT * FROM produtores ORDER BY nome ASC`));
});

app.post('/origens', protegerApi, async (req, res) => {
    const db = await conectar();
    await db.run(`INSERT INTO origens (nome) VALUES (?) ON CONFLICT (nome) DO NOTHING`, [req.body.nome.trim()]);
    res.json({ status: 'ok' });
});
app.get('/origens', protegerApi, async (req, res) => {
    const db = await conectar();
    res.json(await db.all(`SELECT * FROM origens ORDER BY nome ASC`));
});

app.post('/carretas', protegerApi, async (req, res) => {
    const db = await conectar();
    await db.run(`INSERT INTO carretas (placa) VALUES (?) ON CONFLICT (placa) DO NOTHING`, [req.body.placa.toUpperCase().trim()]);
    res.json({ status: 'ok' });
});
app.get('/carretas', protegerApi, async (req, res) => {
    const db = await conectar();
    res.json(await db.all(`SELECT * FROM carretas ORDER BY placa ASC`));
});

app.get('/safras', protegerApi, async (req, res) => {
    const db = await conectar();
    res.json(await db.all(`SELECT * FROM safras ORDER BY id DESC`));
});

app.get('/safras/ativa', protegerApi, async (req, res) => {
    const db = await conectar();
    const safra = await db.get(`SELECT * FROM safras WHERE ativa = TRUE LIMIT 1`);
    res.json(safra || null);
});

app.post('/safras/fechar', protegerApi, async (req, res) => {
    const tipo = req.session.usuario?.tipo;
    if (!['master', 'gerente'].includes(tipo)) return res.status(403).json({ status: 'erro', mensagem: 'Acesso não permitido' });
    const db = await conectar();
    const { nome } = req.body;
    if (!nome?.trim()) return res.status(400).json({ status: 'erro', mensagem: 'Nome da nova safra obrigatório' });
    await db.run(`UPDATE safras SET ativa = FALSE, data_fim = NOW() WHERE ativa = TRUE`);
    await db.run(`INSERT INTO safras (nome, ativa) VALUES (?, TRUE)`, [nome.trim()]);
    res.json({ status: 'ok' });
});

app.post('/expedicoes', protegerApi, somenteExpedicao, async (req, res) => {
    const db = await conectar();
    const { produtor, placa_cavalo, motorista, origem, destino, veiculo, placa_carreta1, variedade1, placa_carreta2, variedade2, peso, saida } = req.body;
    const safraId = await getSafraAtiva(db);
    await db.run(
        `INSERT INTO expedicoes (produtor, placa_cavalo, motorista, origem, destino, veiculo, placa_carreta1, variedade1, placa_carreta2, variedade2, peso, saida, status, resultado, motivo_reprovacao, resultado_c1, motivo_c1, resultado_c2, motivo_c2, safra_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [produtor, placa_cavalo, motorista, origem, destino, veiculo, placa_carreta1, variedade1, placa_carreta2, variedade2, peso, saida, 'Em viagem', 'Pendente', '', 'Pendente', '', placa_carreta2 ? 'Pendente' : '', '', safraId]
    );
    res.json({ status: 'ok' });
});

app.get('/expedicoes', protegerApi, async (req, res) => {
    const db = await conectar();
    const safra_id = req.query.safra_id ? parseInt(req.query.safra_id) : null;
    const w = safra_id ? 'WHERE safra_id = ?' : '';
    const p = safra_id ? [safra_id] : [];
    res.json(await db.all(`SELECT * FROM expedicoes ${w} ORDER BY id DESC`, p));
});

app.put('/expedicoes/:id', protegerApi, somenteExpedicao, async (req, res) => {
    const db = await conectar();
    const id = req.params.id;
    const antes = await db.get(`SELECT * FROM expedicoes WHERE id = ?`, [id]);
    if (!antes) return res.status(404).json({ status: 'erro' });

    const { produtor, placa_cavalo, motorista, origem, destino, veiculo, placa_carreta1, variedade1, placa_carreta2, variedade2, peso } = req.body;
    await db.run(
        `UPDATE expedicoes SET produtor=?, placa_cavalo=?, motorista=?, origem=?, destino=?, veiculo=?, placa_carreta1=?, variedade1=?, placa_carreta2=?, variedade2=?, peso=? WHERE id=?`,
        [produtor, placa_cavalo, motorista, origem, destino, veiculo, placa_carreta1, variedade1, placa_carreta2, variedade2, peso, id]
    );

    const campos = { produtor, placa_cavalo, motorista, origem, destino, veiculo, placa_carreta1, variedade1, placa_carreta2, variedade2, peso };
    for (const campo in campos) {
        if (String(antes[campo] || '') !== String(campos[campo] || ''))
            await registrarAuditoria(req, { acao: 'ALTERAÇÃO', tabela: 'expedicoes', registro_id: id, campo, valor_antigo: antes[campo], valor_novo: campos[campo] });
    }
    res.json({ status: 'ok' });
});

app.put('/expedicoes/:id/qualidade-carretas', protegerApi, async (req, res) => {
    const db = await conectar();
    const id = req.params.id;
    const antes = await db.get(`SELECT * FROM expedicoes WHERE id = ?`, [id]);
    const { status, resultado_c1, motivo_c1, resultado_c2, motivo_c2 } = req.body;

    const resultadoGeral = resultado_c1 === 'Reprovado' || resultado_c2 === 'Reprovado' ? 'Reprovado'
        : resultado_c1 === 'Aprovado' && (!resultado_c2 || resultado_c2 === 'Aprovado') ? 'Aprovado' : 'Pendente';
    const motivoGeral = [motivo_c1 ? `C1: ${motivo_c1}` : '', motivo_c2 ? `C2: ${motivo_c2}` : ''].filter(Boolean).join(' | ');
    const depois = { status, resultado_c1: resultado_c1 || 'Pendente', motivo_c1: motivo_c1 || '', resultado_c2: resultado_c2 || '', motivo_c2: motivo_c2 || '', resultado: resultadoGeral, motivo_reprovacao: motivoGeral };

    await db.run(`UPDATE expedicoes SET status=?, resultado_c1=?, motivo_c1=?, resultado_c2=?, motivo_c2=?, resultado=?, motivo_reprovacao=? WHERE id=?`,
        [depois.status, depois.resultado_c1, depois.motivo_c1, depois.resultado_c2, depois.motivo_c2, depois.resultado, depois.motivo_reprovacao, id]);

    if (antes) await auditarAlteracoes(req, 'expedicoes', id, antes, depois);
    res.json({ status: 'ok' });
});

app.put('/expedicoes/:id/qualidade', protegerApi, async (req, res) => {
    const db = await conectar();
    const id = req.params.id;
    const antes = await db.get(`SELECT * FROM expedicoes WHERE id = ?`, [id]);
    const { status, resultado, motivo_reprovacao } = req.body;
    const depois = { status, resultado, motivo_reprovacao: motivo_reprovacao || '' };
    await db.run(`UPDATE expedicoes SET status=?, resultado=?, motivo_reprovacao=? WHERE id=?`, [depois.status, depois.resultado, depois.motivo_reprovacao, id]);
    if (antes) await auditarAlteracoes(req, 'expedicoes', id, antes, depois);
    res.json({ status: 'ok' });
});

app.delete('/expedicoes/:id', protegerApi, somenteExpedicao, async (req, res) => {
    const db = await conectar();
    const id = req.params.id;
    const antes = await db.get(`SELECT * FROM expedicoes WHERE id = ?`, [id]);
    if (!antes) return res.status(404).json({ status: 'erro' });
    await registrarAuditoria(req, { acao: 'EXCLUSÃO', tabela: 'expedicoes', registro_id: id, campo: 'registro', valor_antigo: JSON.stringify(antes), valor_novo: '' });
    await db.run(`DELETE FROM expedicoes WHERE id=?`, [id]);
    res.json({ status: 'ok' });
});

app.get('/dashboard', protegerApi, async (req, res) => {
    const db = await conectar();
    let safraId = req.query.safra_id ? parseInt(req.query.safra_id) : await getSafraAtiva(db);
    const w = safraId ? 'WHERE safra_id = ?' : '';
    const a = safraId ? "AND safra_id = ?" : '';
    const p = safraId ? [safraId] : [];
    const totalExpedicoes = await db.get(`SELECT COUNT(*) AS total FROM expedicoes ${w}`, p);
    const totalPeso = await db.get(`SELECT COUNT(*) * 38000 AS total FROM expedicoes ${w}`, p);
    const aprovadasC1 = await db.get(`SELECT COUNT(*) AS total FROM expedicoes WHERE resultado_c1='Aprovado' ${a}`, p);
    const reprovadasC1 = await db.get(`SELECT COUNT(*) AS total FROM expedicoes WHERE resultado_c1='Reprovado' ${a}`, p);
    const restricaoC1 = await db.get(`SELECT COUNT(*) AS total FROM expedicoes WHERE resultado_c1='Aprovado com Restrição' ${a}`, p);
    const aprovadasC2 = await db.get(`SELECT COUNT(*) AS total FROM expedicoes WHERE resultado_c2='Aprovado' ${a}`, p);
    const reprovadasC2 = await db.get(`SELECT COUNT(*) AS total FROM expedicoes WHERE resultado_c2='Reprovado' ${a}`, p);
    const restricaoC2 = await db.get(`SELECT COUNT(*) AS total FROM expedicoes WHERE resultado_c2='Aprovado com Restrição' ${a}`, p);
    const aprovadosTotal = Number(aprovadasC1.total||0) + Number(aprovadasC2.total||0);
    const reprovadosTotal = Number(reprovadasC1.total||0) + Number(reprovadasC2.total||0);
    const restricaoTotal = Number(restricaoC1.total||0) + Number(restricaoC2.total||0);
    const avaliados = aprovadosTotal + reprovadosTotal + restricaoTotal;
    res.json({
        totalExpedicoes: Number(totalExpedicoes.total||0),
        pesoEstimadoTotal: Number(totalPeso.total||0),
        aprovados: aprovadosTotal, reprovados: reprovadosTotal, restricao: restricaoTotal,
        taxaAprovacao: avaliados > 0 ? ((aprovadosTotal/avaliados)*100).toFixed(1) : '0',
        taxaReprovacao: avaliados > 0 ? ((reprovadosTotal/avaliados)*100).toFixed(1) : '0'
    });
});

app.post('/analises-qualidade', protegerApi, upload.single('foto_analise'), async (req, res) => {
    const db = await conectar();
    const foto_analise = req.file ? '/uploads/' + req.file.filename : '';
    const { fazenda, variedade, solidos, temperatura_agua, temperatura_media, peso_agua, placa, peso_total, peso_lavado, fritura, classificacao_fritura, quantidade_palitos, diametro_35, diametro_35_45, diametro_45, menos75_qtd, menos75_peso, mais75_qtd, mais75_peso, mais100_qtd, mais100_peso, mais150_qtd, mais150_peso, defeito, pontos } = req.body;
    const safraId = await getSafraAtiva(db);
    await db.run(
        `INSERT INTO analises_qualidade (fazenda, variedade, solidos, temperatura_agua, temperatura_media, peso_agua, placa, peso_total, peso_lavado, fritura, classificacao_fritura, quantidade_palitos, diametro_35, diametro_35_45, diametro_45, menos75_qtd, menos75_peso, mais75_qtd, mais75_peso, mais100_qtd, mais100_peso, mais150_qtd, mais150_peso, defeito, pontos, foto_analise, safra_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [fazenda||'', variedade||'', solidos||'', temperatura_agua||'', temperatura_media||'', peso_agua||'', placa||'', peso_total||'', peso_lavado||'', fritura||'', classificacao_fritura||'', quantidade_palitos||'', diametro_35||'', diametro_35_45||'', diametro_45||'', menos75_qtd||'', menos75_peso||'', mais75_qtd||'', mais75_peso||'', mais100_qtd||'', mais100_peso||'', mais150_qtd||'', mais150_peso||'', defeito||'', pontos||'', foto_analise, safraId]
    );
    res.json({ status: 'ok' });
});

app.get('/analises-qualidade', protegerApi, async (req, res) => {
    const db = await conectar();
    const safra_id = req.query.safra_id ? parseInt(req.query.safra_id) : null;
    const w = safra_id ? 'WHERE safra_id = ?' : '';
    const p = safra_id ? [safra_id] : [];
    res.json(await db.all(`SELECT * FROM analises_qualidade ${w} ORDER BY id DESC`, p));
});

app.put('/analises-qualidade/:id', protegerApi, upload.single('foto_analise'), async (req, res) => {
    const db = await conectar();
    const id = req.params.id;
    const antes = await db.get(`SELECT * FROM analises_qualidade WHERE id = ?`, [id]);
    const foto_analise = req.file ? '/uploads/' + req.file.filename : null;
    const { variedade, solidos, peso_agua, placa, peso_total, peso_lavado, classificacao_fritura, quantidade_palitos, diametro_35, diametro_35_45, diametro_45, menos75_qtd, menos75_peso, mais75_qtd, mais75_peso, mais100_qtd, mais100_peso, mais150_qtd, mais150_peso, defeito, pontos } = req.body;

    await db.run(
        `UPDATE analises_qualidade SET variedade=?, solidos=?, peso_agua=?, placa=?, peso_total=?, peso_lavado=?, classificacao_fritura=?, quantidade_palitos=?, diametro_35=?, diametro_35_45=?, diametro_45=?, menos75_qtd=?, menos75_peso=?, mais75_qtd=?, mais75_peso=?, mais100_qtd=?, mais100_peso=?, mais150_qtd=?, mais150_peso=?, defeito=?, pontos=?, foto_analise=COALESCE(?, foto_analise) WHERE id=?`,
        [variedade, solidos, peso_agua, placa, peso_total, peso_lavado, classificacao_fritura||'', quantidade_palitos||'', diametro_35, diametro_35_45, diametro_45, menos75_qtd, menos75_peso, mais75_qtd, mais75_peso, mais100_qtd, mais100_peso, mais150_qtd, mais150_peso, defeito, pontos, foto_analise, id]
    );

    if (antes) {
        const depois = { variedade, solidos, peso_agua, placa, peso_total, peso_lavado, classificacao_fritura: classificacao_fritura||'', quantidade_palitos: quantidade_palitos||'', diametro_35, diametro_35_45, diametro_45, menos75_qtd, menos75_peso, mais75_qtd, mais75_peso, mais100_qtd, mais100_peso, mais150_qtd, mais150_peso, defeito, pontos };
        await auditarAlteracoes(req, 'analises_qualidade', id, antes, depois);
    }
    const nova = await db.get(`SELECT * FROM analises_qualidade ORDER BY id DESC LIMIT 1`);
res.json({ status: 'ok', analise: nova });
});

app.delete('/analises-qualidade/:id', protegerApi, async (req, res) => {
    const db = await conectar();
    const antes = await db.get(`SELECT * FROM analises_qualidade WHERE id = ?`, [req.params.id]);
    if (antes) await registrarAuditoria(req, { acao: 'EXCLUSÃO', tabela: 'analises_qualidade', registro_id: req.params.id, campo: 'registro', valor_antigo: JSON.stringify(antes), valor_novo: '' });
    await db.run(`DELETE FROM analises_qualidade WHERE id=?`, [req.params.id]);
    res.json({ status: 'ok' });
});

app.get('/dashboard-qualidade', protegerApi, async (req, res) => {
    try {
        const db = await conectar();
        const safra_id = req.query.safra_id ? parseInt(req.query.safra_id) : null;
        const w = safra_id ? 'WHERE safra_id = ?' : '';
        const p = safra_id ? [safra_id] : [];
        res.json(await db.all(`SELECT * FROM analises_qualidade ${w} ORDER BY id DESC`, p));
    } catch (erro) {
        console.error('ERRO DASHBOARD QUALIDADE:', erro);
        res.status(500).json({ erro: 'Erro ao carregar dashboard qualidade' });
    }
});

app.post('/usuarios', protegerApi, somenteMaster, async (req, res) => {
    const db = await conectar();
    const { usuario, senha, tipo } = req.body;
    if (!usuario || !senha || !tipo) return res.status(400).json({ status: 'erro' });
    if (tipo === 'master') return res.status(403).json({ status: 'erro' });
    const senhaCriptografada = await bcrypt.hash(senha, 10);
    await db.run(`INSERT INTO usuarios (usuario, senha, tipo) VALUES (?, ?, ?) ON CONFLICT (usuario) DO UPDATE SET senha=EXCLUDED.senha, tipo=EXCLUDED.tipo`, [usuario, senhaCriptografada, tipo]);
    res.json({ status: 'ok' });
});

app.get('/usuarios', protegerApi, somenteMaster, async (req, res) => {
    const db = await conectar();
    res.json(await db.all(`SELECT id, usuario, tipo FROM usuarios WHERE tipo != 'master' ORDER BY usuario ASC`));
});

app.put('/usuarios/:id', protegerApi, somenteMaster, async (req, res) => {
    const db = await conectar();
    const { usuario, senha, tipo } = req.body;
    if (!usuario || !tipo) return res.status(400).json({ status: 'erro' });
    if (tipo === 'master') return res.status(403).json({ status: 'erro' });
    if (senha) {
        const senhaCriptografada = await bcrypt.hash(senha, 10);
        await db.run(`UPDATE usuarios SET usuario=?, senha=?, tipo=? WHERE id=? AND tipo!='master'`, [usuario, senhaCriptografada, tipo, req.params.id]);
    } else {
        await db.run(`UPDATE usuarios SET usuario=?, tipo=? WHERE id=? AND tipo!='master'`, [usuario, tipo, req.params.id]);
    }
    res.json({ status: 'ok' });
});

app.delete('/usuarios/:id', protegerApi, somenteMaster, async (req, res) => {
    const db = await conectar();
    await db.run(`DELETE FROM usuarios WHERE id=? AND tipo!='master'`, [req.params.id]);
    res.json({ status: 'ok' });
});

app.post('/enviar-relatorio-qualidade', protegerApi, async (req, res) => {
    try {
        const { pdfBase64, placa } = req.body;
        const destinatarios = getDestinatarios();
        if (!destinatarios.length) return res.status(500).json({ status: 'erro', mensagem: 'Nenhum destinatário configurado' });

        const respostaBrevo = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { accept: 'application/json', 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
            body: JSON.stringify({
                sender: { name: 'Sistema Furman', email: process.env.EMAIL_FROM },
                to: destinatarios,
                subject: `Relatório de Qualidade - ${placa || 'Carga'} - Furman Agronegócios`,
                htmlContent: `<div style="font-family:Arial,sans-serif;background:#0f172a;color:#ffffff;padding:30px;border-radius:18px;"><h2 style="color:#21ff9d;">📄 Relatório de Qualidade</h2><p>Segue em anexo o relatório de qualidade gerado automaticamente pelo sistema da <strong>Furman Agronegócios</strong>.</p><div style="margin-top:20px;padding:18px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);"><p><strong>🚛 Placa:</strong> ${placa || 'Carga'}</p><p><strong>🧪 Laboratório:</strong> Palmas - PR</p><p><strong>🕒 Emitido em:</strong> ${new Date().toLocaleString('pt-BR')}</p></div><p style="margin-top:24px;color:#94a3b8;font-size:13px;">Este e-mail foi enviado automaticamente pelo sistema operacional da Furman Agronegócios.</p></div>`,
                attachment: [{ name: `relatorio-qualidade-${placa || 'carga'}.pdf`, content: pdfBase64.split(',')[1] }]
            })
        });

        if (!respostaBrevo.ok) { console.error('Erro Brevo:', await respostaBrevo.text()); return res.status(500).json({ status: 'erro' }); }
        res.json({ status: 'ok' });
    } catch (erro) {
        console.error('Erro ao enviar relatório:', erro);
        res.status(500).json({ status: 'erro' });
    }
});

app.post('/perfil/foto', protegerApi, upload.single('foto'), async (req, res) => {
    if (!req.file) return res.status(400).json({ status: 'erro' });
    const db = await conectar();
    const foto = '/uploads/' + req.file.filename;
    await db.run(`UPDATE usuarios SET foto=? WHERE id=?`, [foto, req.session.usuario.id]);
    res.json({ status: 'ok', foto });
});

app.get('/auditoria', protegerApi, async (req, res) => {
    try {
        const db = await conectar();
        res.json(await db.all(`SELECT * FROM auditoria_alteracoes ORDER BY id DESC LIMIT 300`));
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ status: 'erro' });
    }
});

app.get('/exportar-analises-csv', protegerApi, async (req, res) => {
    try {
        const db = await conectar();
        const dados = await db.all(`SELECT * FROM analises_qualidade ORDER BY id DESC`);
        if (!dados.length) return res.status(404).send('Nenhuma análise encontrada.');
        const colunas = Object.keys(dados[0]);
        let csv = colunas.join(',') + '\n';
        dados.forEach(linha => { csv += colunas.map(coluna => `"${String(linha[coluna] ?? '').replace(/"/g, '""')}"`).join(',') + '\n'; });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=analises_qualidade.csv');
        res.send(csv);
    } catch (erro) {
        console.error('Erro ao exportar CSV:', erro);
        res.status(500).send('Erro ao exportar CSV');
    }
});

// ===== BACKUP AUTOMÁTICO =====
cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Iniciando backup automático...');

    try {
        const db = await conectar();

        const expedicoes = await db.all(`SELECT * FROM expedicoes ORDER BY id DESC`);
        const analises = await db.all(`SELECT * FROM analises_qualidade ORDER BY id DESC`);

        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();

        // Aba Expedições
        const sheetExp = workbook.addWorksheet('Expedições');
        if (expedicoes.length > 0) {
            sheetExp.columns = Object.keys(expedicoes[0]).map(key => ({
                header: key,
                key,
                width: 20
            }));
            expedicoes.forEach(row => sheetExp.addRow(row));
        }

        // Aba Análises
        const sheetAna = workbook.addWorksheet('Análises de Qualidade');
        if (analises.length > 0) {
            sheetAna.columns = Object.keys(analises[0]).map(key => ({
                header: key,
                key,
                width: 20
            }));
            analises.forEach(row => sheetAna.addRow(row));
        }

        // Gera o arquivo em buffer
        const buffer = await workbook.xlsx.writeBuffer();
        const base64 = buffer.toString('base64');

        const agora = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');

        // Envia por e-mail via Brevo
        await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'Sistema Furman', email: process.env.EMAIL_FROM },
                to: [{ name: 'Luiz Aires', email: 'luizguilhermeprado990@gmail.com' }],
                subject: `Backup Automático - Furman Agronegócios - ${agora}`,
                htmlContent: `
                    <div style="font-family:Arial,sans-serif; padding:20px;">
                        <h2>📦 Backup Automático</h2>
                        <p>Segue em anexo o backup diário do sistema Furman Agronegócios.</p>
                        <p><strong>Data:</strong> ${agora}</p>
                        <p><strong>Expedições:</strong> ${expedicoes.length} registros</p>
                        <p><strong>Análises:</strong> ${analises.length} registros</p>
                    </div>
                `,
                attachment: [{
                    name: `backup-furman-${agora}.xlsx`,
                    content: base64
                }]
            })
        });

        console.log('✅ Backup automático enviado com sucesso!');

    } catch (erro) {
        console.error('❌ Erro no backup automático:', erro);
    }
}, {
    timezone: 'America/Sao_Paulo'
});

criarTabelas()
    .then(() => {
        app.listen(PORT, () => { console.log(`Rodando em http://localhost:${PORT}`); });
    })
    .catch((erro) => {
        console.error('Erro ao inicializar banco:', erro);
        process.exit(1);
    });