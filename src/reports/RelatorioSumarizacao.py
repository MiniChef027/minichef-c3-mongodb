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

    def relatorio_porcoes_por_refeicao(self):
        """Agrupa itens do planner por refeição e soma as porções desejadas."""
        db = self.conn.connect()
        try:
            pipeline = [
                {
                    "$group": {
                        "_id": "$refeicao",
                        "total_porcoes_planejadas": {"$sum": "$porcoes_desejadas"},
                        "quantidade_agendamentos": {"$sum": 1},
                    }
                },
                {"$sort": {"total_porcoes_planejadas": -1}},
                {
                    "$project": {
                        "_id": 0,
                        "refeicao": "$_id",
                        "total_porcoes_planejadas": 1,
                        "quantidade_agendamentos": 1,
                    }
                },
            ]
            resultados = list(db["item_planner"].aggregate(pipeline))
            self._exibir_resultados("Total de Porções Planejadas por Refeição (Sumarização)", resultados)
        finally:
            self.conn.close()

    def relatorio_receitas_por_autor(self):
        """Agrupa receitas por autor_id e conta o total de receitas criadas."""
        db = self.conn.connect()
        try:
            pipeline = [
                {
                    "$group": {
                        "_id": "$autor_id",
                        "total_receitas": {"$sum": 1},
                    }
                },
                {"$sort": {"total_receitas": -1}},
                {
                    "$project": {
                        "_id": 0,
                        "autor_id": "$_id",
                        "total_receitas": 1,
                    }
                },
            ]
            resultados = list(db["receita"].aggregate(pipeline))
            self._exibir_resultados("Quantidade de Receitas por Autor (Sumarização)", resultados)
        finally:
            self.conn.close()