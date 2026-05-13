const express = require('express');
const multer = require('multer');
const path = require('path');

const {
    conectar,
    criarTabelas
} = require('./database');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

criarTabelas();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads');
    },
    filename: (req, file, cb) => {
        const extensao = path.extname(file.originalname);
        const nomeArquivo = Date.now() + '-' + Math.round(Math.random() * 1E9) + extensao;
        cb(null, nomeArquivo);
    }
});

const upload = multer({ storage });

// BUSCAR MOTORISTA
app.get('/motorista/:placa', async (req, res) => {
    const db = await conectar();
    const placa = req.params.placa.toUpperCase();

    const motorista = await db.get(
        `SELECT * FROM motoristas WHERE placa = ?`,
        [placa]
    );

    res.json(motorista || {});
});

// CADASTRAR MOTORISTA COM FOTO
app.post('/motoristas', upload.single('foto'), async (req, res) => {
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

// LISTAR MOTORISTAS
app.get('/motoristas', async (req, res) => {
    const db = await conectar();

    const motoristas = await db.all(
        `SELECT * FROM motoristas ORDER BY motorista ASC`
    );

    res.json(motoristas);
});

// SALVAR EXPEDIÇÃO
app.post('/expedicoes', async (req, res) => {
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

// LISTAR EXPEDIÇÕES
app.get('/expedicoes', async (req, res) => {
    const db = await conectar();

    const expedicoes = await db.all(
        `SELECT * FROM expedicoes ORDER BY id DESC`
    );

    res.json(expedicoes);
});

// EDITAR EXPEDIÇÃO
app.put('/expedicoes/:id', async (req, res) => {
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

// EXCLUIR EXPEDIÇÃO
app.delete('/expedicoes/:id', async (req, res) => {
    const db = await conectar();
    const id = req.params.id;

    await db.run(
        `DELETE FROM expedicoes WHERE id = ?`,
        [id]
    );

    res.json({ status: 'ok' });
});

// DASHBOARD
app.get('/dashboard', async (req, res) => {
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