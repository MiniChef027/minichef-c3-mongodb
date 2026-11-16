// =====================================================================
// MiniChef | Banco de Dados Não Relacional (MongoDB)
// Script de criação das coleções do MVP
//
// Cada tabela do banco relacional da C2 (Oracle, scripts em src/sql/) vira
// uma coleção com o MESMO nome e os MESMOS campos. O relacionamento é feito por referência: o documento
// filho guarda o "id" do documento pai (ex.: receita.autor_id -> usuario.id).
//
// Campo "id": inteiro igual à chave primária da C2. É ele que o programa
// usa para buscar, relacionar, alterar e remover. O "_id" (ObjectId) é
// criado pelo MongoDB e não é usado pelo programa.
//
// Uso direto (apaga e recria as 8 coleções, vazias):
//   node src/mongo/colecoes.js
// Uso no script de migração (Cesar):
//   const { criarColecoes, linhaOracleParaDocumento } = require('./mongo/colecoes');
//   await criarColecoes(db);
//   const doc = linhaOracleParaDocumento('usuario', linhaLidaDoOracle);
//
// Variáveis de ambiente opcionais:
//   MONGO_URL  (padrão mongodb://localhost:27017)
//   MONGO_DB   (padrão minichef)
// =====================================================================

const { MongoClient } = require('mongodb');

// Tipos numéricos aceitos: o driver grava inteiros como "int" e decimais
// como "double". O NUMBER do Oracle chega como número pelo driver
// "oracledb"; NUMBER(1) dos booleanos é convertido em linhaOracleParaDocumento.
const NUM = ['int', 'long', 'double'];
const INT = ['int', 'long'];
const NUM_OU_NULO = ['int', 'long', 'double', 'null'];
const TEXTO_OU_NULO = ['string', 'null'];

const TIPOS_CONTA = [
  'Usuário comum', 'Chef de cozinha', 'Hotel', 'Restaurante',
  'Personal Trainer', 'Nutricionista', 'Administrador de eventos', 'Mercado',
];
const PERFIS = ['comum', 'moderador', 'administrador'];
const STATUS_RECEITA = ['Rascunho', 'Em Análise', 'Publicada', 'Recusada', 'Arquivada'];
const PAPEIS = ['Principal', 'Secundário', 'Removível', 'Opcional'];
const VISIBILIDADES = ['Público', 'Privado', 'Opcional'];
const DIAS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
const REFEICOES = ['Café da manhã', 'Almoço', 'Jantar', 'Lanche'];

// Monta um validador $jsonSchema. "obrigatorios" equivale ao NOT NULL da C2.
function esquema(obrigatorios, propriedades) {
  return {
    $jsonSchema: {
      bsonType: 'object',
      required: ['id', ...obrigatorios],
      properties: { id: { bsonType: INT, minimum: 1 }, ...propriedades },
    },
  };
}

// [FUTURO] = campo reservado para fases seguintes; fica null no MVP.
const COLECOES = [
  {
    nome: 'usuario',
    validador: esquema(
      ['nome', 'email', 'email_confirmado', 'data_nascimento', 'cpf',
        'senha_hash', 'tipo_conta', 'perfil_acesso', 'ativo', 'criado_em'],
      {
        nome: { bsonType: 'string', maxLength: 120 },
        email: { bsonType: 'string', maxLength: 160 },
        email_confirmado: { bsonType: 'bool' },
        data_nascimento: { bsonType: 'date' },
        cpf: { bsonType: 'string', maxLength: 14 },
        senha_hash: { bsonType: 'string', maxLength: 255 },
        tipo_conta: { enum: TIPOS_CONTA },
        perfil_acesso: { enum: PERFIS },
        ativo: { bsonType: 'bool' },                       // [FUTURO]
        foto_perfil_url: { bsonType: TEXTO_OU_NULO },      // [FUTURO]
        criado_em: { bsonType: 'date' },
      },
    ),
    indices: [
      { chave: { id: 1 }, opcoes: { unique: true, name: 'ux_usuario_id' } },
      { chave: { email: 1 }, opcoes: { unique: true, name: 'ux_usuario_email' } },
      { chave: { cpf: 1 }, opcoes: { unique: true, name: 'ux_usuario_cpf' } },
    ],
  },
  {
    nome: 'ingrediente',
    validador: esquema(['nome', 'unidade_padrao'], {
      nome: { bsonType: 'string', maxLength: 100 },
      categoria: { bsonType: TEXTO_OU_NULO },
      unidade_padrao: { bsonType: 'string', maxLength: 20 },
      validade_media_dias: { bsonType: ['int', 'long', 'null'] }, // [FUTURO]
      preco_medio: { bsonType: NUM_OU_NULO },                      // [FUTURO]
    }),
    indices: [
      { chave: { id: 1 }, opcoes: { unique: true, name: 'ux_ingrediente_id' } },
      // Nome único sem diferenciar maiúsculas de minúsculas (mesma regra da
      // C2): collation pt com strength 2 trata "Tomate" e "tomate" como iguais.
      {
        chave: { nome: 1 },
        opcoes: { unique: true, name: 'ux_ingrediente_nome', collation: { locale: 'pt', strength: 2 } },
      },
    ],
  },
  {
    nome: 'receita',
    validador: esquema(
      ['nome', 'porcao_padrao', 'modo_preparo', 'tempo_medio_gasto_min', 'status', 'autor_id', 'criado_em'],
      {
        nome: { bsonType: 'string', maxLength: 150 },
        porcao_padrao: { bsonType: INT, minimum: 1 },
        refeicao_recomendada: { bsonType: TEXTO_OU_NULO },
        modo_preparo: { bsonType: 'string' },
        nacionalidade: { bsonType: TEXTO_OU_NULO },
        tempo_medio_gasto_min: { bsonType: INT, minimum: 1 },
        finalidade: { bsonType: TEXTO_OU_NULO },
        orcamento_estimado: { bsonType: NUM_OU_NULO },
        foto_url: { bsonType: TEXTO_OU_NULO },              // [FUTURO]
        link_video: { bsonType: TEXTO_OU_NULO },            // [FUTURO]
        status: { enum: STATUS_RECEITA },
        feedback_moderacao: { bsonType: TEXTO_OU_NULO },
        moderador_id: { bsonType: ['int', 'long', 'null'] }, // [FUTURO] -> usuario.id
        analisado_em: { bsonType: ['date', 'null'] },        // [FUTURO]
        autor_id: { bsonType: INT },                         // -> usuario.id
        criado_em: { bsonType: 'date' },
      },
    ),
    indices: [
      { chave: { id: 1 }, opcoes: { unique: true, name: 'ux_receita_id' } },
      { chave: { autor_id: 1 }, opcoes: { name: 'ix_receita_autor' } },
      { chave: { status: 1 }, opcoes: { name: 'ix_receita_status' } },
      { chave: { refeicao_recomendada: 1 }, opcoes: { name: 'ix_receita_refeicao' } },
    ],
  },
  {
    nome: 'receita_ingrediente',
    validador: esquema(['receita_id', 'ingrediente_id', 'quantidade', 'unidade', 'papel', 'visibilidade'], {
      receita_id: { bsonType: INT },                   // -> receita.id
      ingrediente_id: { bsonType: INT },               // -> ingrediente.id
      quantidade: { bsonType: NUM, exclusiveMinimum: 0 },
      unidade: { bsonType: 'string', maxLength: 20 },
      papel: { enum: PAPEIS },
      visibilidade: { enum: VISIBILIDADES },
    }),
    indices: [
      { chave: { id: 1 }, opcoes: { unique: true, name: 'ux_receita_ingrediente_id' } },
      { chave: { receita_id: 1 }, opcoes: { name: 'ix_ri_receita' } },
      { chave: { ingrediente_id: 1, papel: 1 }, opcoes: { name: 'ix_ri_ingrediente_papel' } },
    ],
  },
  {
    nome: 'planner_semanal',
    validador: esquema(['usuario_id', 'semana_inicio'], {
      usuario_id: { bsonType: INT },                   // -> usuario.id
      semana_inicio: { bsonType: 'date' },
      orcamento_definido: { bsonType: NUM_OU_NULO },   // [FUTURO]
    }),
    indices: [
      { chave: { id: 1 }, opcoes: { unique: true, name: 'ux_planner_semanal_id' } },
      { chave: { usuario_id: 1 }, opcoes: { name: 'ix_planner_usuario' } },
    ],
  },
  {
    nome: 'item_planner',
    validador: esquema(['planner_id', 'receita_id', 'dia_semana', 'refeicao', 'porcoes_desejadas'], {
      planner_id: { bsonType: INT },                   // -> planner_semanal.id
      receita_id: { bsonType: INT },                   // -> receita.id
      dia_semana: { enum: DIAS },
      refeicao: { enum: REFEICOES },
      porcoes_desejadas: { bsonType: INT, minimum: 1 },
    }),
    indices: [
      { chave: { id: 1 }, opcoes: { unique: true, name: 'ux_item_planner_id' } },
      { chave: { planner_id: 1 }, opcoes: { name: 'ix_item_planner_planner' } },
      { chave: { receita_id: 1 }, opcoes: { name: 'ix_item_planner_receita' } },
    ],
  },
  {
    nome: 'lista_compras',
    validador: esquema(['planner_id', 'gerada_em'], {
      planner_id: { bsonType: INT },                   // -> planner_semanal.id
      total_estimado: { bsonType: NUM_OU_NULO },       // [FUTURO]
      gerada_em: { bsonType: 'date' },
    }),
    indices: [
      { chave: { id: 1 }, opcoes: { unique: true, name: 'ux_lista_compras_id' } },
      { chave: { planner_id: 1 }, opcoes: { name: 'ix_lista_planner' } },
    ],
  },
  {
    nome: 'item_lista_compras',
    validador: esquema(['lista_compras_id', 'ingrediente_id', 'quantidade', 'unidade', 'comprado'], {
      lista_compras_id: { bsonType: INT },             // -> lista_compras.id
      ingrediente_id: { bsonType: INT },               // -> ingrediente.id
      quantidade: { bsonType: NUM, exclusiveMinimum: 0 },
      unidade: { bsonType: 'string', maxLength: 20 },
      custo_estimado: { bsonType: NUM_OU_NULO },       // [FUTURO]
      comprado: { bsonType: 'bool' },
    }),
    indices: [
      { chave: { id: 1 }, opcoes: { unique: true, name: 'ux_item_lista_compras_id' } },
      { chave: { lista_compras_id: 1 }, opcoes: { name: 'ix_ilc_lista' } },
      { chave: { ingrediente_id: 1 }, opcoes: { name: 'ix_ilc_ingrediente' } },
    ],
  },
];

// Apaga (se existir) e cria cada coleção com validação e índices.
async function criarColecoes(db) {
  const existentes = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
  for (const c of COLECOES) {
    if (existentes.includes(c.nome)) {
      await db.collection(c.nome).drop();
    }
    await db.createCollection(c.nome, {
      validator: c.validador,
      validationLevel: 'strict',
      validationAction: 'error',
    });
    for (const i of c.indices) {
      await db.collection(c.nome).createIndex(i.chave, i.opcoes);
    }
    console.log(`Coleção ${c.nome} criada (${c.indices.length} índices).`);
  }
}

// Atributos de uma coleção, na ordem do esquema, sem o campo principal
// "id" (edital 7.b.3 e 7.d.5: exibir cada atributo para o usuário informar).
// Devolve [{ campo, obrigatorio, valores }] ("valores" só nas listas fixas).
function atributosDaColecao(nome) {
  const colecao = COLECOES.find((c) => c.nome === nome);
  if (!colecao) {
    throw new Error(`Coleção desconhecida: ${nome}`);
  }
  const { required, properties } = colecao.validador.$jsonSchema;
  return Object.keys(properties)
    .filter((campo) => campo !== 'id')
    .map((campo) => ({
      campo,
      obrigatorio: required.includes(campo),
      valores: properties[campo].enum || null,
    }));
}

// ---------------------------------------------------------------------
// MIGRAÇÃO: converte uma linha lida do Oracle em documento do MongoDB.
//   * o driver "oracledb" devolve os nomes de coluna em MAIÚSCULAS
//     (ex.: NOME); o documento usa os nomes em minúsculas (nome);
//   * o Oracle não tem BOOLEAN: NUMBER(1) com 1/0 vira true/false;
//   * NUMBER chega como número e DATE/TIMESTAMP como Date, sem conversão;
//   * coluna nula continua presente com null (campos [FUTURO]).
// Ler com: conexao.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT })
// ---------------------------------------------------------------------
const CAMPOS_BOOLEANOS = {
  usuario: ['email_confirmado', 'ativo'],
  item_lista_compras: ['comprado'],
};

function linhaOracleParaDocumento(nome, linha) {
  const colecao = COLECOES.find((c) => c.nome === nome);
  if (!colecao) {
    throw new Error(`Coleção desconhecida: ${nome}`);
  }
  const booleanos = CAMPOS_BOOLEANOS[nome] || [];
  const documento = {};
  for (const campo of Object.keys(colecao.validador.$jsonSchema.properties)) {
    const chave = Object.keys(linha).find((k) => k.toLowerCase() === campo);
    let valor = chave === undefined ? null : linha[chave];
    if (valor !== null && booleanos.includes(campo)) {
      valor = Number(valor) === 1;
    }
    documento[campo] = valor;
  }
  return documento;
}

module.exports = { COLECOES, criarColecoes, atributosDaColecao, linhaOracleParaDocumento, CAMPOS_BOOLEANOS, DIAS, REFEICOES, PAPEIS, VISIBILIDADES, STATUS_RECEITA, TIPOS_CONTA, PERFIS };

if (require.main === module) {
  (async () => {
    const url = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const cliente = new MongoClient(url);
    try {
      await cliente.connect();
      await criarColecoes(cliente.db(process.env.MONGO_DB || 'minichef'));
      console.log('Coleções do MiniChef criadas.');
    } catch (erro) {
      console.error('Erro ao criar as coleções:', erro.message);
      process.exitCode = 1;
    } finally {
      await cliente.close();
    }
  })();
}
