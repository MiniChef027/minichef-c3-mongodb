from pprint import pprint
from conexion.mongo_connection import MongoConnection


class Relatorios:
    def __init__(self, uri: str = "mongodb://localhost:27017/", db_name: str = "minichef_db"):
        self.conn = MongoConnection(uri=uri, db_name=db_name)

    def _exibir_resultados(self, titulo: str, resultados: list):
        """Formata e imprime na tela os documentos retornados pelo MongoDB."""
        print("\n" + "=" * 75)
        print(f" RELATÓRIO: {titulo}")
        print("=" * 75)
        if not resultados:
            print("Nenhum registro encontrado para este relatório.")
        else:
            for idx, doc in enumerate(resultados, start=1):
                print(f"[{idx}] {doc}")
        print("=" * 75 + "\n")


    def relatorio_cardapio_semanal_detalhado(self):
        """Junta item_planner com receita para mostrar o nome da receita planejada."""
        db = self.conn.connect()
        try:
            pipeline = [
                {
                    "$lookup": {
                        "from": "receita",
                        "localField": "receita_id",
                        "foreignField": "id",
                        "as": "receita_doc",
                    }
                },
                {"$unwind": "$receita_doc"},
                {
                    "$project": {
                        "_id": 0,
                        "planner_id": "$planner_id",
                        "dia_semana": "$dia_semana",
                        "refeicao": "$refeicao",
                        "receita_nome": "$receita_doc.nome",
                        "porcoes_desejadas": "$porcoes_desejadas",
                    }
                },
                {"$sort": {"planner_id": 1, "dia_semana": 1}},
            ]
            resultados = list(db["item_planner"].aggregate(pipeline))
            self._exibir_resultados("Cardápio Semanal com Detalhes da Receita (Junção)", resultados)
        finally:
            self.conn.close()

    def relatorio_ingredientes_da_receita(self):
        """Junta receita_ingrediente com receita e ingrediente."""
        db = self.conn.connect()
        try:
            pipeline = [
                {
                    "$lookup": {
                        "from": "receita",
                        "localField": "receita_id",
                        "foreignField": "id",
                        "as": "receita_doc",
                    }
                },
                {"$unwind": "$receita_doc"},
                {
                    "$lookup": {
                        "from": "ingrediente",
                        "localField": "ingrediente_id",
                        "foreignField": "id",
                        "as": "ingrediente_doc",
                    }
                },
                {"$unwind": "$ingrediente_doc"},
                {
                    "$project": {
                        "_id": 0,
                        "receita": "$receita_doc.nome",
                        "ingrediente": "$ingrediente_doc.nome",
                        "quantidade": "$quantidade",
                        "unidade": "$unidade",
                        "papel": "$papel",
                    }
                },
                {"$sort": {"receita": 1, "ingrediente": 1}},
            ]
            resultados = list(db["receita_ingrediente"].aggregate(pipeline))
            self._exibir_resultados("Ingredientes por Receita (Junção Múltipla)", resultados)
        finally:
            self.conn.close()