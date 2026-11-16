// =====================================================================
// MiniChef | Banco de Dados Não Relacional (MongoDB)
// Consultas de referência para o programa (equivalem ao 03_consultas.sql)
//
// Tudo usa apenas o driver oficial "mongodb" (find, countDocuments,
// aggregate, insertOne, updateOne, deleteMany), sem biblioteca que monte
// consultas, como o edital exige.
//
// Cada função recebe "db" (cliente.db('minichef')). Os relatórios
// devolvem arrays prontos para console.table().
//
// Demonstração (imprime relatórios usando o banco já migrado):
//   node src/mongo/consultas.js
// =====================================================================

const { MongoClient } = require('mongodb');
const { DIAS } = require('./colecoes');

const COLECOES_MVP = [
  'usuario', 'ingrediente', 'receita', 'receita_ingrediente',
  'planner_semanal', 'item_planner', 'lista_compras', 'item_lista_compras',
];

// Unidades contadas em peças: a lista de compras arredonda para cima.
const UNIDADES_CONTAVEIS = ['unidade', 'dente'];

// ---------------------------------------------------------------------
// TELA INICIAL: total de documentos por coleção (edital 6.d)
// ---------------------------------------------------------------------
async function contarDocumentos(db) {
  const totais = {};
  for (const nome of COLECOES_MVP) {
    totais[nome] = await db.collection(nome).countDocuments({});
  }
  return totais;
}

// ---------------------------------------------------------------------
// NOVO ID: maior id da coleção + 1 (mesma estratégia do projeto de
// exemplo do professor). O índice único em "id" impede duplicidade.
// ---------------------------------------------------------------------
async function proximoId(db, colecao) {
  const ultimo = await db.collection(colecao)
    .find({}, { projection: { id: 1 } })
    .sort({ id: -1 })
    .limit(1)
    .toArray();
  return ultimo.length ? ultimo[0].id + 1 : 1;
}

// ---------------------------------------------------------------------
// EXISTÊNCIA (Etapa 3 do edital): inserir exige que o documento não
// exista e que o pai exista; atualizar e remover exigem que exista.
// ---------------------------------------------------------------------
async function existe(db, colecao, id) {
  return (await db.collection(colecao).countDocuments({ id })) > 0;
}

// ---------------------------------------------------------------------
// MENSAGENS DE ERRO: traduz os erros do MongoDB para o usuário
// ---------------------------------------------------------------------
function mensagemErro(erro) {
  if (erro && erro.code === 121) {
    return 'Dados inválidos: confira os campos obrigatórios e os valores permitidos.';
  }
  if (erro && erro.code === 11000) {
    return 'Já existe um registro com este valor (e-mail, CPF ou nome do ingrediente).';
  }
  return 'Não foi possível concluir a operação no banco de dados.';
}

// ---------------------------------------------------------------------
// LISTAGEM (edital 7.c.3 e 7.d.3): campo principal (id) e campos
// descritivos de cada coleção, em formato de relatório (Etapa 4).
// ---------------------------------------------------------------------
const CAMPOS_DESCRITIVOS = {
  usuario: ['nome', 'email'],
  ingrediente: ['nome', 'unidade_padrao'],
  receita: ['nome', 'status'],
  receita_ingrediente: ['receita_id', 'ingrediente_id', 'quantidade', 'unidade'],
  planner_semanal: ['usuario_id', 'semana_inicio'],
  item_planner: ['planner_id', 'receita_id', 'dia_semana', 'refeicao'],
  lista_compras: ['planner_id', 'gerada_em'],
  item_lista_compras: ['lista_compras_id', 'ingrediente_id', 'quantidade', 'unidade'],
};

async function listarDocumentos(db, colecao) {
  const projecao = { _id: 0, id: 1 };
  for (const campo of CAMPOS_DESCRITIVOS[colecao]) {
    projecao[campo] = 1;
  }
  return db.collection(colecao).find({}, { projection: projecao }).sort({ id: 1 }).toArray();
}

// ---------------------------------------------------------------------
// R1 | Agrupamento (edital 7.a.1.i): receitas por refeição recomendada
// ---------------------------------------------------------------------
function pipelineReceitasPorRefeicao() {
  return [
    {
      $group: {
        _id: { $ifNull: ['$refeicao_recomendada', 'Não informada'] },
        total_receitas: { $sum: 1 },
        tempo_medio_min: { $avg: '$tempo_medio_gasto_min' },
        orcamento_medio: { $avg: '$orcamento_estimado' },
      },
    },
    {
      $project: {
        _id: 0,
        refeicao: '$_id',
        total_receitas: 1,
        tempo_medio_min: { $round: ['$tempo_medio_min', 1] },
        orcamento_medio: { $round: ['$orcamento_medio', 2] },
      },
    },
    { $sort: { total_receitas: -1, refeicao: 1 } },
  ];
}

async function receitasPorRefeicao(db) {
  return db.collection('receita').aggregate(pipelineReceitasPorRefeicao()).toArray();
}

// ---------------------------------------------------------------------
// R2 | Junção (edital 7.a.1.ii): ficha de ingredientes de cada receita
// receita + usuario (autor) + receita_ingrediente + ingrediente
// ---------------------------------------------------------------------
function pipelineFichaIngredientes() {
  return [
    { $lookup: { from: 'usuario', localField: 'autor_id', foreignField: 'id', as: 'autor' } },
    { $unwind: '$autor' },
    { $lookup: { from: 'receita_ingrediente', localField: 'id', foreignField: 'receita_id', as: 'itens' } },
    { $unwind: '$itens' },
    { $lookup: { from: 'ingrediente', localField: 'itens.ingrediente_id', foreignField: 'id', as: 'ing' } },
    { $unwind: '$ing' },
    { $sort: { id: 1, 'itens.id': 1 } },
    {
      $project: {
        _id: 0,
        receita_id: '$id',
        receita: '$nome',
        autor: '$autor.nome',
        ingrediente: '$ing.nome',
        quantidade: '$itens.quantidade',
        unidade: '$itens.unidade',
        papel: '$itens.papel',
      },
    },
  ];
}

async function fichaIngredientes(db) {
  return db.collection('receita').aggregate(pipelineFichaIngredientes()).toArray();
}

// ---------------------------------------------------------------------
// R3 | Agrupamento com junção: ingredientes mais usados em receitas
// ---------------------------------------------------------------------
function pipelineIngredientesMaisUsados() {
  return [
    { $group: { _id: '$ingrediente_id', receitas: { $addToSet: '$receita_id' } } },
    { $lookup: { from: 'ingrediente', localField: '_id', foreignField: 'id', as: 'ing' } },
    { $unwind: '$ing' },
    { $project: { _id: 0, ingrediente: '$ing.nome', qtd_receitas: { $size: '$receitas' } } },
    { $sort: { qtd_receitas: -1, ingrediente: 1 } },
  ];
}

async function ingredientesMaisUsados(db) {
  return db.collection('receita_ingrediente').aggregate(pipelineIngredientesMaisUsados()).toArray();
}

// ---------------------------------------------------------------------
// R4 | Junção: planner semanal de um planner (segunda a domingo)
// ---------------------------------------------------------------------
function pipelinePlanner(plannerId) {
  return [
    { $match: { planner_id: plannerId } },
    { $lookup: { from: 'receita', localField: 'receita_id', foreignField: 'id', as: 'rec' } },
    { $unwind: '$rec' },
    { $addFields: { ordem_dia: { $indexOfArray: [DIAS, '$dia_semana'] } } },
    { $sort: { ordem_dia: 1, id: 1 } },
    {
      $project: {
        _id: 0,
        dia_semana: 1,
        refeicao: 1,
        receita: '$rec.nome',
        porcao_padrao: '$rec.porcao_padrao',
        porcoes_desejadas: 1,
      },
    },
  ];
}

async function plannerSemanal(db, plannerId) {
  return db.collection('item_planner').aggregate(pipelinePlanner(plannerId)).toArray();
}

// ---------------------------------------------------------------------
// CALCULADORA DE PORÇÕES (itens de um planner)
// quantidade ajustada = quantidade base x porções desejadas / porção padrão
// Calculada na consulta; não é gravada. 2 casas decimais.
// ---------------------------------------------------------------------
function etapasQuantidadeAjustada(plannerId) {
  return [
    { $match: { planner_id: plannerId } },
    { $lookup: { from: 'receita', localField: 'receita_id', foreignField: 'id', as: 'rec' } },
    { $unwind: '$rec' },
    { $lookup: { from: 'receita_ingrediente', localField: 'receita_id', foreignField: 'receita_id', as: 'ri' } },
    { $unwind: '$ri' },
    {
      $addFields: {
        qtd_ajustada: {
          $divide: [{ $multiply: ['$ri.quantidade', '$porcoes_desejadas'] }, '$rec.porcao_padrao'],
        },
      },
    },
  ];
}

function pipelineCalculadora(plannerId) {
  return [
    ...etapasQuantidadeAjustada(plannerId),
    { $lookup: { from: 'ingrediente', localField: 'ri.ingrediente_id', foreignField: 'id', as: 'ing' } },
    { $unwind: '$ing' },
    { $sort: { id: 1, 'ri.id': 1 } },
    {
      $project: {
        _id: 0,
        item_planner_id: '$id',
        receita: '$rec.nome',
        ingrediente: '$ing.nome',
        qtd_base: '$ri.quantidade',
        porcao_padrao: '$rec.porcao_padrao',
        porcoes_desejadas: 1,
        qtd_ajustada: { $round: ['$qtd_ajustada', 2] },
        unidade: '$ri.unidade',
      },
    },
  ];
}

async function calculadoraPorcoes(db, plannerId) {
  return db.collection('item_planner').aggregate(pipelineCalculadora(plannerId)).toArray();
}

// ---------------------------------------------------------------------
// GERAÇÃO DA LISTA DE COMPRAS (mesmas regras da C2)
//   * soma as quantidades ajustadas por ingrediente e unidade;
//   * papel 'Opcional' não entra;
//   * unidades contáveis arredondam para cima, as demais 2 casas;
//   * sem conversão de unidades (g e kg ficam em linhas separadas);
//   * custo_estimado e total_estimado ficam null até existir preço.
// ---------------------------------------------------------------------
function pipelineItensLista(plannerId) {
  return [
    ...etapasQuantidadeAjustada(plannerId),
    { $match: { 'ri.papel': { $ne: 'Opcional' } } },
    {
      $group: {
        _id: { ingrediente_id: '$ri.ingrediente_id', unidade: '$ri.unidade' },
        total: { $sum: '$qtd_ajustada' },
      },
    },
    {
      $project: {
        _id: 0,
        ingrediente_id: '$_id.ingrediente_id',
        unidade: '$_id.unidade',
        quantidade: {
          $cond: [
            { $in: ['$_id.unidade', UNIDADES_CONTAVEIS] },
            { $ceil: '$total' },
            { $round: ['$total', 2] },
          ],
        },
      },
    },
    { $sort: { ingrediente_id: 1, unidade: 1 } },
  ];
}

async function gerarListaCompras(db, plannerId) {
  const itens = await db.collection('item_planner').aggregate(pipelineItensLista(plannerId)).toArray();
  if (itens.length === 0) {
    return null; // planner sem receitas: nada a gerar
  }
  const listaId = await proximoId(db, 'lista_compras');
  await db.collection('lista_compras').insertOne({
    id: listaId, planner_id: plannerId, total_estimado: null, gerada_em: new Date(),
  });
  let itemId = await proximoId(db, 'item_lista_compras');
  const documentos = itens.map((i) => ({
    id: itemId++,
    lista_compras_id: listaId,
    ingrediente_id: i.ingrediente_id,
    quantidade: i.quantidade,
    unidade: i.unidade,
    custo_estimado: null,
    comprado: false,
  }));
  try {
    await db.collection('item_lista_compras').insertMany(documentos);
  } catch (erro) {
    // Sem transação no MongoDB da VM: desfaz a lista criada acima
    await db.collection('item_lista_compras').deleteMany({ lista_compras_id: listaId });
    await db.collection('lista_compras').deleteOne({ id: listaId });
    throw erro;
  }
  return listaId;
}

function pipelineListaGerada(listaId) {
  return [
    { $match: { lista_compras_id: listaId } },
    { $lookup: { from: 'ingrediente', localField: 'ingrediente_id', foreignField: 'id', as: 'ing' } },
    { $unwind: '$ing' },
    { $sort: { 'ing.nome': 1 } },
    {
      $project: {
        _id: 0,
        ingrediente: '$ing.nome',
        quantidade: 1,
        unidade: 1,
        comprado: { $cond: ['$comprado', 'sim', 'não'] },
      },
    },
  ];
}

async function listaGerada(db, listaId) {
  return db.collection('item_lista_compras').aggregate(pipelineListaGerada(listaId)).toArray();
}

// ---------------------------------------------------------------------
// REMOÇÃO (edital 7.c.5.i): o MongoDB não tem chave estrangeira, então o
// programa confere os filhos ANTES de remover o pai.
//   acao 'bloqueia' -> informa que o documento não pode ser removido
//   acao 'cascata'  -> pergunta se remove os filhos junto
// ---------------------------------------------------------------------
const DEPENDENCIAS = {
  usuario: [
    { colecao: 'receita', campo: 'autor_id', acao: 'bloqueia' },
    { colecao: 'receita', campo: 'moderador_id', acao: 'bloqueia' },
    { colecao: 'planner_semanal', campo: 'usuario_id', acao: 'cascata' },
  ],
  ingrediente: [
    { colecao: 'receita_ingrediente', campo: 'ingrediente_id', acao: 'bloqueia' },
    { colecao: 'item_lista_compras', campo: 'ingrediente_id', acao: 'bloqueia' },
  ],
  receita: [
    { colecao: 'receita_ingrediente', campo: 'receita_id', acao: 'cascata' },
    { colecao: 'item_planner', campo: 'receita_id', acao: 'bloqueia' },
  ],
  planner_semanal: [
    { colecao: 'item_planner', campo: 'planner_id', acao: 'cascata' },
    { colecao: 'lista_compras', campo: 'planner_id', acao: 'cascata' },
  ],
  lista_compras: [
    { colecao: 'item_lista_compras', campo: 'lista_compras_id', acao: 'cascata' },
  ],
  receita_ingrediente: [],
  item_planner: [],
  item_lista_compras: [],
};

// Devolve os filhos encontrados, ex.: [{ colecao, campo, acao, total }]
async function verificarFilhos(db, colecao, id) {
  const encontrados = [];
  for (const dep of DEPENDENCIAS[colecao]) {
    const total = await db.collection(dep.colecao).countDocuments({ [dep.campo]: id });
    if (total > 0) {
      encontrados.push({ ...dep, total });
    }
  }
  return encontrados;
}

// Remove o documento e, recursivamente, os filhos de regra 'cascata'.
// Só chamar depois de verificarFilhos() não ter devolvido nenhum
// 'bloqueia' e de o usuário confirmar a remoção dos filhos.
async function removerComFilhos(db, colecao, id) {
  for (const dep of DEPENDENCIAS[colecao]) {
    if (dep.acao !== 'cascata') continue;
    const filhos = await db.collection(dep.colecao).find({ [dep.campo]: id }, { projection: { id: 1 } }).toArray();
    for (const filho of filhos) {
      await removerComFilhos(db, dep.colecao, filho.id);
    }
  }
  await db.collection(colecao).deleteOne({ id });
}

// ---------------------------------------------------------------------
// ATUALIZAÇÃO (edital 7.d.6 e 7.d.7): altera e devolve o documento
// ---------------------------------------------------------------------
async function atualizarDocumento(db, colecao, id, campos) {
  await db.collection(colecao).updateOne({ id }, { $set: campos });
  return db.collection(colecao).findOne({ id }, { projection: { _id: 0 } });
}

module.exports = {
  COLECOES_MVP,
  UNIDADES_CONTAVEIS,
  DEPENDENCIAS,
  contarDocumentos,
  proximoId,
  existe,
  mensagemErro,
  CAMPOS_DESCRITIVOS,
  listarDocumentos,
  pipelineReceitasPorRefeicao,
  pipelineFichaIngredientes,
  pipelineIngredientesMaisUsados,
  pipelinePlanner,
  pipelineCalculadora,
  pipelineItensLista,
  pipelineListaGerada,
  receitasPorRefeicao,
  fichaIngredientes,
  ingredientesMaisUsados,
  plannerSemanal,
  calculadoraPorcoes,
  gerarListaCompras,
  listaGerada,
  verificarFilhos,
  removerComFilhos,
  atualizarDocumento,
};

if (require.main === module) {
  (async () => {
    const cliente = new MongoClient(process.env.MONGO_URL || 'mongodb://localhost:27017');
    try {
      await cliente.connect();
      const db = cliente.db(process.env.MONGO_DB || 'minichef');
      console.log('Documentos por coleção:');
      console.table(await contarDocumentos(db));
      console.log('R1 | Receitas por refeição');
      console.table(await receitasPorRefeicao(db));
      console.log('R2 | Ficha de ingredientes');
      console.table(await fichaIngredientes(db));
      console.log('R3 | Ingredientes mais usados');
      console.table(await ingredientesMaisUsados(db));
      console.log('R4 | Planner 1');
      console.table(await plannerSemanal(db, 1));
      console.log('Calculadora | Planner 1');
      console.table(await calculadoraPorcoes(db, 1));
    } catch (erro) {
      console.error('Erro nas consultas:', erro.message);
      process.exitCode = 1;
    } finally {
      await cliente.close();
    }
  })();
}
