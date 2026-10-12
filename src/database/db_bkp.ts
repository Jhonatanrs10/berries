import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

function getDatabase() {
  if (!db) {
    db = SQLite.openDatabaseSync('berries.db');
  }
  return db;
}

interface TableResult {
  name: string;
}

// Função para verificar se a tabela existe
async function verificarTabela() {
  try {
    const database = getDatabase();
    const resultado = await database.getAllAsync(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND (name='transacoes' OR name='produtos' OR name='animes');
    `) as TableResult[];
    return {
      transacoes: resultado.some(r => r.name === 'transacoes'),
      produtos: resultado.some(r => r.name === 'produtos'),
      animes: resultado.some(r => r.name === 'animes') // Adicionado para animes
    };
  } catch (error) {
    console.error('Erro ao verificar tabela:', error);
    return { transacoes: false, produtos: false, animes: false };
  }
}

// Função para inicializar o banco de dados
async function inicializarBanco() {
  try {
    const database = getDatabase();
    const tabelas = await verificarTabela();

    if (!tabelas.transacoes) {
      // Criar a tabela de transações
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS transacoes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          descricao TEXT NOT NULL,
          caixa TEXT NOT NULL,
          categoria TEXT NOT NULL,
          quantidade INTEGER NOT NULL,
          valor INTEGER NOT NULL,
          tipo_transacao TEXT NOT NULL,
          acao TEXT NOT NULL,
          data TEXT NOT NULL
        );
      `);
      console.log('Tabela transacoes criada com sucesso');
    }

    if (!tabelas.produtos) {
      // Criar a tabela de produtos
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS produtos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          quantidade INTEGER NOT NULL,
          valor INTEGER NOT NULL
        );
      `);
      console.log('Tabela produtos criada com sucesso');
    }

    if (!tabelas.animes) { // Adicionando a criação da tabela de animes
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS animes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          status TEXT NOT NULL,
          release_day TEXT,
          observacao TEXT,
          link TEXT,
          seasons TEXT
        );
      `);
      console.log('Tabela animes criada com sucesso');
    }

  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    throw error;
  }
}

// Inicializar o banco de dados imediatamente
inicializarBanco().catch(console.error);

// Função para recriar a tabela (mantendo apenas transacoes, se precisar recriar animes, adicione uma função separada)
export async function recriarTabela() {
  try {
    const database = getDatabase();
    // Primeiro, tenta dropar a tabela se ela existir
    await database.execAsync('DROP TABLE IF EXISTS transacoes;');

    // Depois, cria a tabela novamente
    await database.execAsync(`
      CREATE TABLE transacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descricao TEXT NOT NULL,
        caixa TEXT NOT NULL,
        categoria TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        valor INTEGER NOT NULL,
        tipo_transacao TEXT NOT NULL,
        acao TEXT NOT NULL,
        data TEXT NOT NULL
      );
    `);
    console.log('Tabela transacoes recriada com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao recriar tabela:', error);
    return false;
  }
}

// --- Funções para Transações (existentes) ---
export async function salvarTransacao(transacao: {
  descricao: string;
  caixa: string;
  categoria: string;
  quantidade: number;
  valor: number;
  tipo_transacao: string;
  acao: string;
  data: string;
}) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.runAsync(
      `INSERT INTO transacoes (descricao, caixa, categoria, quantidade, valor, tipo_transacao, acao, data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        transacao.descricao,
        transacao.caixa,
        transacao.categoria,
        transacao.quantidade,
        transacao.valor,
        transacao.tipo_transacao,
        transacao.acao,
        transacao.data
      ]
    ).then((result: SQLite.SQLiteRunResult) => resolve(result.lastInsertRowId))
    .catch((error: Error) => {
      console.error('Erro ao salvar transação:', error);
      reject(error);
    });
  });
}

export async function atualizarTransacao(transacao: {
  id: number;
  descricao: string;
  caixa: string;
  categoria: string;
  quantidade: number;
  valor: number;
  tipo_transacao: string;
  acao: string;
  data: string;
}) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.runAsync(
      `UPDATE transacoes
       SET descricao = ?, caixa = ?, categoria = ?, quantidade = ?, valor = ?,
           tipo_transacao = ?, acao = ?, data = ?
       WHERE id = ?;`,
      [
        transacao.descricao,
        transacao.caixa,
        transacao.categoria,
        transacao.quantidade,
        transacao.valor,
        transacao.tipo_transacao,
        transacao.acao,
        transacao.data,
        transacao.id
      ]
    ).then((result: SQLite.SQLiteRunResult) => resolve(result.changes))
    .catch((error: Error) => {
      console.error('Erro ao atualizar transação:', error);
      reject(error);
    });
  });
}

export async function buscarTransacoes() {
  return new Promise(async (resolve, reject) => {
    try {
      const database = getDatabase();
      // Primeiro verifica se a tabela existe
      const tabelas = await verificarTabela();
      if (!tabelas.transacoes) {
        console.log('Tabela transacoes não existe, inicializando banco...');
        await inicializarBanco();
      }

      const resultado = await database.getAllAsync('SELECT * FROM transacoes ORDER BY data DESC;');
      resolve(resultado);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      reject(error);
    }
  });
}

export async function deletarTransacao(id: number) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.runAsync('DELETE FROM transacoes WHERE id = ?;', [id])
    .then((result: SQLite.SQLiteRunResult) => resolve(result.changes))
    .catch((error: Error) => {
      console.error('Erro ao deletar transação:', error);
      reject(error);
    });
  });
}

// --- Funções para Produtos (existentes) ---
export async function adicionarProduto(nome: string, quantidade: number, valor: number) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.runAsync(
      `INSERT INTO produtos (nome, quantidade, valor)
       VALUES (?, ?, ?);`,
      [nome, quantidade, valor]
    ).then((result: SQLite.SQLiteRunResult) => resolve(result.lastInsertRowId))
    .catch((error: Error) => {
      console.error('Erro ao adicionar produto:', error);
      reject(error);
    });
  });
}

export async function buscarProdutos() {
  return new Promise(async (resolve, reject) => {
    try {
      const database = getDatabase();
      // Primeiro verifica se a tabela existe
      const tabelas = await verificarTabela();
      if (!tabelas.produtos) {
        console.log('Tabela produtos não existe, inicializando banco...');
        await inicializarBanco();
      }

      const resultado = await database.getAllAsync('SELECT * FROM produtos ORDER BY nome;');
      resolve(resultado);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      reject(error);
    }
  });
}

export async function atualizarProduto(id: number, nome: string, quantidade: number, valor: number) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.runAsync(
      `UPDATE produtos
       SET nome = ?, quantidade = ?, valor = ?
       WHERE id = ?;`,
      [nome, quantidade, valor, id]
    ).then((result: SQLite.SQLiteRunResult) => resolve(result.changes))
    .catch((error: Error) => {
      console.error('Erro ao atualizar produto:', error);
      reject(error);
    });
  });
}

export async function deletarProduto(id: number) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.runAsync('DELETE FROM produtos WHERE id = ?;', [id])
    .then((result: SQLite.SQLiteRunResult) => resolve(result.changes))
    .catch((error: Error) => {
      console.error('Erro ao deletar produto:', error);
      reject(error);
    });
  });
}

// --- Novas Funções para Animes ---

interface Anime {
  id: number;
  nome: string;
  status: 'assistindo' | 'já assistido' | 'pra assistir';
  release_day: 'segunda' | 'terça' | 'quarta' | 'quinta' | 'sexta' | 'sábado' | 'domingo';
  observacao: string | null;
  link: string | null;
  seasons: string | null; // Armazenado como JSON string '[12,24,12]'
}

export async function salvarAnime(anime: Omit<Anime, 'id'>) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.runAsync(
      `INSERT INTO animes (nome, status, release_day, observacao, link, seasons)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        anime.nome,
        anime.status,
        anime.release_day,
        anime.observacao,
        anime.link,
        anime.seasons
      ]
    ).then((result: SQLite.SQLiteRunResult) => resolve(result.lastInsertRowId))
    .catch((error: Error) => {
      console.error('Erro ao salvar anime:', error);
      reject(error);
    });
  });
}

export async function atualizarAnime(anime: Anime) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.runAsync(
      `UPDATE animes
       SET nome = ?, status = ?, release_day = ?, observacao = ?, link = ?, seasons = ?
       WHERE id = ?;`,
      [
        anime.nome,
        anime.status,
        anime.release_day,
        anime.observacao,
        anime.link,
        anime.seasons,
        anime.id
      ]
    ).then((result: SQLite.SQLiteRunResult) => resolve(result.changes))
    .catch((error: Error) => {
      console.error('Erro ao atualizar anime:', error);
      reject(error);
    });
  });
}

export async function buscarAnimes(): Promise<Anime[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const database = getDatabase();
      const tabelas = await verificarTabela();
      if (!tabelas.animes) {
        console.log('Tabela animes não existe, inicializando banco...');
        await inicializarBanco();
      }

      const resultado = await database.getAllAsync('SELECT * FROM animes ORDER BY nome;') as Anime[];
      resolve(resultado);
    } catch (error) {
      console.error('Erro ao buscar animes:', error);
      reject(error);
    }
  });
}

export async function deletarAnime(id: number) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.runAsync('DELETE FROM animes WHERE id = ?;', [id])
    .then((result: SQLite.SQLiteRunResult) => resolve(result.changes))
    .catch((error: Error) => {
      console.error('Erro ao deletar anime:', error);
      reject(error);
    });
  });
  
}
// ADICIONE ESTA FUNÇÃO AQUI NO SEU ARQUIVO db.ts
export async function recriarTabelaAnimes() {
  try {
    const database = getDatabase();
    // Primeiro, tenta dropar a tabela se ela existir
    await database.execAsync('DROP TABLE IF EXISTS animes;');

    // Depois, cria a tabela novamente com a mesma estrutura
    await database.execAsync(`
      CREATE TABLE animes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        status TEXT NOT NULL,
        release_day TEXT,
        observacao TEXT,
        link TEXT,
        seasons TEXT
      );
    `);
    console.log('Tabela animes recriada com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao recriar tabela animes:', error);
    return false;
  }
}
