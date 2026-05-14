require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

let pool;

function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });
    }

    return pool;
}

function converterParametros(sql) {
    let contador = 0;

    return sql.replace(/\?/g, () => {
        contador++;
        return `$${contador}`;
    });
}

async function conectar() {
    const db = getPool();

    return {
        get: async (sql, params = []) => {
            const resultado = await db.query(
                converterParametros(sql),
                params
            );

            return resultado.rows[0];
        },

        all: async (sql, params = []) => {
            const resultado = await db.query(
                converterParametros(sql),
                params
            );

            return resultado.rows;
        },

        run: async (sql, params = []) => {
            await db.query(
                converterParametros(sql),
                params
            );
        }
    };
}

async function criarTabelas() {
    const db = getPool();

    await db.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            usuario TEXT UNIQUE,
            senha TEXT
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS motoristas (
            id SERIAL PRIMARY KEY,
            placa TEXT UNIQUE,
            motorista TEXT,
            foto TEXT
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS expedicoes (
            id SERIAL PRIMARY KEY,
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

    const senhaCriptografada = await bcrypt.hash('Furman2026', 10);

    await db.query(
        `
        INSERT INTO usuarios (usuario, senha)
        VALUES ($1, $2)
        ON CONFLICT (usuario) DO NOTHING
        `,
        ['Administração', senhaCriptografada]
    );

    console.log('✅ Banco PostgreSQL conectado');
}

module.exports = {
    conectar,
    criarTabelas
};