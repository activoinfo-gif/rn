const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));

// Conexão com o Banco de Dados SQL
const dbPath = path.join(__dirname, 'assistencia.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados SQLite:', err.message);
  } else {
    console.log('Conectado com sucesso ao Banco de Dados SQL.');
  }
});

// Criar tabela centralizada para o estado do sistema
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS sistema_estado (
    id TEXT PRIMARY KEY,
    dados TEXT
  )`);
});

// Rota GET para buscar todos os dados centralizados
app.get('/api/dados', (req, res) => {
  db.get(`SELECT dados FROM sistema_estado WHERE id = 'principal'`, (err, row) => {
    if (err) {
      console.error('Erro ao ler do banco SQL:', err);
      return res.status(500).json({ erro: 'Erro ao ler dados do banco.' });
    }

    if (row && row.dados) {
      try {
        res.json(JSON.parse(row.dados));
      } catch (parseErr) {
        res.status(500).json({ erro: 'Erro ao processar dados do banco.' });
      }
    } else {
      // Estado inicial padrão se a base estiver vazia
      const estadoInicial = {
        ordens: [],
        estoque: [],
        tecnicos: [{ id: 1, nome: 'Administrador', especialidade: 'Geral', username: 'admin', senha: '123', cargo: 'Administrador' }],
        fornecedores: [],
        configPix: { tipoChave: 'CNPJ', chave: '', favorecido: '', cidade: '', qrCodeUrl: '' },
        configSistema: { nomeEmpresa: 'RN INFOCELL', numeroInicialOS: 1001, logoAltura: 95, logoCustomizado: '' }
      };
      res.json(estadoInicial);
    }
  });
});

// Rota POST para gravar instantaneamente no banco SQL
app.post('/api/dados', (req, res) => {
  const dadosStr = JSON.stringify(req.body);

  db.run(
    `INSERT OR REPLACE INTO sistema_estado (id, dados) VALUES ('principal', ?)`,
    [dadosStr],
    function (err) {
      if (err) {
        console.error('Erro ao salvar no banco SQL:', err);
        return res.status(500).json({ erro: 'Erro ao salvar dados no banco.' });
      }
      res.json({ sucesso: true, mensagem: 'Dados salvos com sucesso no Banco de Dados SQL!' });
    }
  );
});

// Servir os ficheiros estáticos do frontend (pasta dist)
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a executar na porta ${PORT}`);
});