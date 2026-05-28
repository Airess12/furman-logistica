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
        senha TEXT,
        tipo TEXT DEFAULT 'admin'
        )
    `);
    
    await db.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'admin'
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
        CREATE TABLE IF NOT EXISTS produtores (
            id SERIAL PRIMARY KEY,
            nome TEXT UNIQUE
        )
    `);

    await db.query(`
    CREATE TABLE IF NOT EXISTS origens (
        id SERIAL PRIMARY KEY,
        nome TEXT UNIQUE
    )
`);

    await db.query(`
        CREATE TABLE IF NOT EXISTS carretas (
            id SERIAL PRIMARY KEY,
            placa TEXT UNIQUE
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
            saida TEXT,
            status TEXT DEFAULT 'Em viagem',
            resultado TEXT DEFAULT 'Pendente',
            motivo_reprovacao TEXT,
            resultado_c1 TEXT DEFAULT 'Pendente',
            motivo_c1 TEXT,
            resultado_c2 TEXT DEFAULT 'Pendente',
            motivo_c2 TEXT
        )
    `);

    await db.query(`
        ALTER TABLE expedicoes
        ADD COLUMN IF NOT EXISTS resultado_c1 TEXT DEFAULT 'Pendente'
    `);

    await db.query(`
        ALTER TABLE expedicoes
        ADD COLUMN IF NOT EXISTS motivo_c1 TEXT
    `);

    await db.query(`
        ALTER TABLE expedicoes
        ADD COLUMN IF NOT EXISTS resultado_c2 TEXT DEFAULT 'Pendente'
    `);

    await db.query(`
        ALTER TABLE expedicoes
        ADD COLUMN IF NOT EXISTS motivo_c2 TEXT
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS analises_qualidade (
            id SERIAL PRIMARY KEY,
            
            fazenda TEXT,
            temperatura_agua TEXT,
            temperatura_media TEXT,
            fritura TEXT,

            classificacao_fritura TEXT,
            quantidade_palitos TEXT,

            variedade TEXT,
            solidos TEXT,
            peso_agua TEXT,
            placa TEXT,
            peso_total TEXT,
            peso_lavado TEXT,

            diametro_35 TEXT,
            diametro_35_45 TEXT,
            diametro_45 TEXT,

            menos75_qtd TEXT,
            menos75_peso TEXT,

            mais75_qtd TEXT,
            mais75_peso TEXT,

            mais100_qtd TEXT,
            mais100_peso TEXT,

            mais150_qtd TEXT,
            mais150_peso TEXT,

            defeito TEXT,
            pontos TEXT,           
            foto_analise TEXT,

            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.query(`
        ALTER TABLE analises_qualidade
        ADD COLUMN IF NOT EXISTS foto_analise TEXT
    `);
    
        await db.query(`
        ALTER TABLE analises_qualidade
        ADD COLUMN IF NOT EXISTS fazenda TEXT
    `);

    await db.query(`
        ALTER TABLE analises_qualidade
        ADD COLUMN IF NOT EXISTS temperatura_agua TEXT
    `);

    await db.query(`
        ALTER TABLE analises_qualidade
        ADD COLUMN IF NOT EXISTS temperatura_media TEXT
    `);

    await db.query(`
        ALTER TABLE analises_qualidade
        ADD COLUMN IF NOT EXISTS fritura TEXT
    `);
    await db.query(`
    ALTER TABLE analises_qualidade
    ADD COLUMN IF NOT EXISTS classificacao_fritura TEXT
    `);
    await db.query(`
    ALTER TABLE analises_qualidade
    ADD COLUMN IF NOT EXISTS quantidade_palitos TEXT
    `);

    const senhaCriptografada = await bcrypt.hash('Furman2026', 10);

    await db.query(
    `
    INSERT INTO usuarios (usuario, senha, tipo)
    VALUES ($1, $2, $3)
    ON CONFLICT (usuario) DO NOTHING
    `,
    ['Administração', senhaCriptografada, 'admin']
    );

    console.log('✅ Banco PostgreSQL conectado');
}

module.exports = {
    conectar,
    criarTabelas
};