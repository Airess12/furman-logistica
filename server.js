const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
    conectar,
    criarTabelas
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

fs.mkdirSync('public/uploads', { recursive: true });

app.use(express.json());

app.use(session({
    secret: 'furman_sistema_logistico',
    resave: false,
    saveUninitialized: false
}));

criarTabelas();

app.use('/img', express.static('public/img'));
app.use('/style.css', express.static('public/style.css'));

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
    const db = await conectar();

    const {
        usuario,
        senha
    } = req.body;

    const user = await db.get(
        `SELECT * FROM usuarios WHERE usuario = ?`,
        [usuario]
    );

    if (!user) {
        return res.json({ status: 'erro' });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
        return res.json({ status: 'erro' });
    }

    req.session.usuario = user.usuario;

    res.json({ status: 'ok' });
});

app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ status: 'ok' });
    });
});

function proteger(req, res, next) {
    if (req.session.usuario) {
        return next();
    }

    return res.redirect('/login');
}

app.get('/', proteger, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/script.js', proteger, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'script.js'));
});

app.use('/uploads', proteger, express.static('public/uploads'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads');
    },
    filename: (req, file, cb) => {
        const extensao = path.extname(file.originalname);

        const nomeArquivo =
            Date.now() + '-' + Math.round(Math.random() * 1E9) + extensao;

        cb(null, nomeArquivo);
    }
});

const upload = multer({ storage });

app.get('/motorista/:placa', proteger, async (req, res) => {
    const db = await conectar();

    const placa = req.params.placa.toUpperCase();

    const motorista = await db.get(
        `SELECT * FROM motoristas WHERE placa = ?`,
        [placa]
    );

    res.json(motorista || {});
});

app.post('/motoristas', proteger, upload.single('foto'), async (req, res) => {
    const db = await conectar();

    const placa = req.body.placa.toUpperCase();
    const motorista = req.body.motorista;
    const foto = req.file ? `uploads/${req.file.filename}` : null;

    const existente = await db.get(
        `SELECT * FROM motoristas WHERE placa = ?`,
        [placa]
    );

    if (existente) {
        await db.run(
            `
            UPDATE motoristas
            SET motorista = ?,
                foto = COALESCE(?, foto)
            WHERE placa = ?
            `,
            [motorista, foto, placa]
        );
    } else {
        await db.run(
            `
            INSERT INTO motoristas
            (placa, motorista, foto)
            VALUES (?, ?, ?)
            `,
            [placa, motorista, foto]
        );
    }

    res.json({ status: 'ok' });
});

app.get('/motoristas', proteger, async (req, res) => {
    const db = await conectar();

    const motoristas = await db.all(
        `SELECT * FROM motoristas ORDER BY motorista ASC`
    );

    res.json(motoristas);
});

app.post('/expedicoes', proteger, async (req, res) => {
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

    await db.run(
        `
        INSERT INTO expedicoes
        (
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
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
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
        ]
    );

    res.json({ status: 'ok' });
});

app.get('/expedicoes', proteger, async (req, res) => {
    const db = await conectar();

    const expedicoes = await db.all(
        `SELECT * FROM expedicoes ORDER BY id DESC`
    );

    res.json(expedicoes);
});

app.put('/expedicoes/:id', proteger, async (req, res) => {
    const db = await conectar();
    const id = req.params.id;

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

    await db.run(
        `
        UPDATE expedicoes
        SET produtor = ?,
            placa_cavalo = ?,
            motorista = ?,
            origem = ?,
            destino = ?,
            veiculo = ?,
            placa_carreta1 = ?,
            variedade1 = ?,
            placa_carreta2 = ?,
            variedade2 = ?,
            peso = ?,
            saida = ?
        WHERE id = ?
        `,
        [
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
            id
        ]
    );

    res.json({ status: 'ok' });
});

app.delete('/expedicoes/:id', proteger, async (req, res) => {
    const db = await conectar();

    const id = req.params.id;

    await db.run(
        `DELETE FROM expedicoes WHERE id = ?`,
        [id]
    );

    res.json({ status: 'ok' });
});

app.get('/dashboard', proteger, async (req, res) => {
    const db = await conectar();

    const totalExpedicoes = await db.get(
        `SELECT COUNT(*) AS total FROM expedicoes`
    );

    const totalPeso = await db.get(
        `SELECT COUNT(*) * 38000 AS total FROM expedicoes`
    );

    res.json({
        totalExpedicoes: totalExpedicoes.total,
        pesoEstimadoTotal: totalPeso.total
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Rodando em http://localhost:${PORT}`);
});