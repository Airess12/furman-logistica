const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');

async function conectar() {
    return open({
        filename: './banco.db',
        driver: sqlite3.Database
    });
}

async function adicionarColuna(db, tabela, coluna, tipo) {
    try {
        await db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${tipo}`);
    } catch (erro) {
        // ignora se a coluna já existir
    }
}

async function criarTabelas() {
    const db = await conectar();

    await db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT UNIQUE,
            senha TEXT
        )
    `);

    const admin = await db.get(
        `SELECT * FROM usuarios WHERE usuario = ?`,
        ['admin']
    );

    if (!admin) {
        const senhaCriptografada = await bcrypt.hash('Furman2026', 10);

    await db.run(
    `INSERT OR IGNORE INTO usuarios (usuario, senha) VALUES (?, ?)`,
    ['admin', senhaCriptografada]
);
    }
    await db.exec(`
        CREATE TABLE IF NOT EXISTS motoristas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            placa TEXT UNIQUE,
            motorista TEXT,
            foto TEXT
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS expedicoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produtor TEXT,
            placa_cavalo TEXT,
            motorista TEXT,
            origem TEXT,
            destino TEXT,
            veiculo TEXT,
            placa_carreta1 TEXT,
            variedade1 TEXT,
            placa_carreta2 TEXT,
            variedade2 TEXT,
            peso TEXT,
            saida TEXT
        )
    `);

    await adicionarColuna(db, 'motoristas', 'foto', 'TEXT');

    await adicionarColuna(db, 'expedicoes', 'produtor', 'TEXT');
    await adicionarColuna(db, 'expedicoes', 'placa_cavalo', 'TEXT');
    await adicionarColuna(db, 'expedicoes', 'placa_carreta1', 'TEXT');
    await adicionarColuna(db, 'expedicoes', 'variedade1', 'TEXT');
    await adicionarColuna(db, 'expedicoes', 'placa_carreta2', 'TEXT');
    await adicionarColuna(db, 'expedicoes', 'variedade2', 'TEXT');

    console.log('✅ Banco conectado');
}

module.exports = {
    conectar,
    criarTabelas
};