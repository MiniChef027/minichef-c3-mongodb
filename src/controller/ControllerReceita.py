from conexion.mongo_connection import MongoConnection
from model.Receita import Receita


class ControllerReceita:
    def __init__(self, uri: str = "mongodb://localhost:27017/", db_name: str = "minichef_db"):
        self.conn = MongoConnection(uri=uri, db_name=db_name)

    def _proximo_id(self, col) -> int:
        ultimo = col.find_one(sort=[("id", -1)])
        return (ultimo["id"] + 1) if ultimo and "id" in ultimo else 1

    def existe_por_id(self, col, id_receita: int) -> bool:
        return col.count_documents({"id": id_receita}) > 0

    def existe_usuario(self, db, autor_id: int) -> bool:
        return db["usuario"].count_documents({"id": autor_id}) > 0

    def listar_receitas(self, col) -> list:
        docs = list(col.find({}, {"_id": 0, "id": 1, "nome": 1, "status": 1, "autor_id": 1}).sort("id", 1))
        print("\n--- RECEITAS CADASTRADAS ---")
        for d in docs:
            print(f"ID: {d['id']} | Nome: {d['nome']} | Status: {d.get('status', '')} | Autor ID: {d.get('autor_id', '')}")
        return docs

    def inserir_receita(self) -> bool:
        db = self.conn.connect()
        col = db["receita"]
        try:
            while True:
                print("\n=== INSERIR RECEITA ===")
                try:
                    autor_id = int(input("ID do usuário autor: ").strip())
                except ValueError:
                    print("ID do autor deve ser numérico.")
                    continue

                if not self.existe_usuario(db, autor_id):
                    print("Erro: O usuário autor informado não existe.")
                else:
                    nome = input("Nome da receita: ").strip()
                    nacionalidade = input("Nacionalidade (opcional): ").strip()
                    tempo_str = input("Tempo médio de preparo em minutos: ").strip()
                    refeicao_rec = input("Refeição recomendada (ex.: Almoço, Jantar): ").strip()
                    status = input("Status (ex.: Publicada, Rascunho): ").strip() or "Rascunho"

                    novo_id = self._proximo_id(col)
                    doc = {
                        "id": novo_id,
                        "autor_id": autor_id,
                        "nome": nome,
                        "nacionalidade": nacionalidade if nacionalidade else None,
                        "tempo_medio_gasto_min": int(tempo_str) if tempo_str.isdigit() else 0,
                        "refeicao_recomendada": refeicao_rec if refeicao_rec else None,
                        "status": status,
                    }
                    col.insert_one(doc)
                    autor_doc = db["usuario"].find_one({"id": autor_id}, {"_id": 0})
                    obj = Receita(
                        doc["id"], autor_doc, doc["nome"], doc["nacionalidade"],
                        doc["tempo_medio_gasto_min"], doc["refeicao_recomendada"], doc["status"]
                    )
                    print("Receita inserida com sucesso:")
                    print(obj.to_string())

                resp = input("Deseja continuar inserindo receitas? (Sim/Não): ").strip().lower()
                if resp in ("não", "nao", "n"):
                    return True
        finally:
            self.conn.close()

    def atualizar_receita(self) -> bool:
        db = self.conn.connect()
        col = db["receita"]
        try:
            while True:
                print("\n=== ATUALIZAR RECEITA ===")
                docs = self.listar_receitas(col)
                if not docs:
                    print("Nenhuma receita disponível para atualização.")
                    return True

                try:
                    id_alvo = int(input("Digite o ID da receita que deseja atualizar: ").strip())
                except ValueError:
                    print("ID inválido. Informe um número inteiro.")
                    continue

                if not self.existe_por_id(col, id_alvo):
                    print("Receita não encontrada.")
                else:
                    atual = col.find_one({"id": id_alvo}, {"_id": 0})
                    nome = input(f"Nome [{atual['nome']}]: ").strip() or atual["nome"]
                    nacionalidade = input(f"Nacionalidade [{atual.get('nacionalidade') or ''}]: ").strip()
                    tempo_str = input(f"Tempo médio min [{atual.get('tempo_medio_gasto_min', 0)}]: ").strip()
                    status = input(f"Status [{atual.get('status', '')}]: ").strip() or atual.get("status", "")

                    col.update_one(
                        {"id": id_alvo},
                        {"$set": {
                            "nome": nome,
                            "nacionalidade": nacionalidade if nacionalidade else atual.get("nacionalidade"),
                            "tempo_medio_gasto_min": int(tempo_str) if tempo_str.isdigit() else atual.get("tempo_medio_gasto_min", 0),
                            "status": status,
                        }}
                    )
                    atualizado = col.find_one({"id": id_alvo}, {"_id": 0})
                    autor_doc = db["usuario"].find_one({"id": atualizado.get("autor_id")}, {"_id": 0})
                    obj = Receita(
                        atualizado["id"], autor_doc, atualizado["nome"], atualizado.get("nacionalidade"),
                        atualizado.get("tempo_medio_gasto_min", 0), atualizado.get("refeicao_recomendada"),
                        atualizado.get("status", "")
                    )
                    print("Registro atualizado com sucesso:")
                    print(obj.to_string())

                resp = input("Deseja atualizar mais alguma receita? (Sim/Não): ").strip().lower()
                if resp in ("não", "nao", "n"):
                    return True
        finally:
            self.conn.close()

    def remover_receita(self) -> bool:
        db = self.conn.connect()
        col = db["receita"]
        col_ri = db["receita_ingrediente"]
        col_ip = db["item_planner"]
        try:
            while True:
                print("\n=== REMOVER RECEITA ===")
                docs = self.listar_receitas(col)
                if not docs:
                    print("Nenhuma receita disponível para remoção.")
                    return True

                try:
                    id_alvo = int(input("Digite o ID da receita que deseja remover: ").strip())
                except ValueError:
                    print("ID inválido. Informe um número inteiro.")
                    continue

                if not self.existe_por_id(col, id_alvo):
                    print("Receita não encontrada.")
                else:
                    confirma = input(f"Deseja realmente remover a receita ID {id_alvo}? (Sim/Não): ").strip().lower()
                    if confirma in ("não", "nao", "n"):
                        return True
                    if confirma in ("sim", "s"):
                        qtd_ri = col_ri.count_documents({"receita_id": id_alvo})
                        qtd_ip = col_ip.count_documents({"receita_id": id_alvo})

                        if qtd_ri > 0 or qtd_ip > 0:
                            print(
                                f"Receita referenciada em {qtd_ri} ingrediente(s) de receita e {qtd_ip} item(ns) de planner."
                            )
                            excluir_filhas = input(
                                "Deseja remover os documentos referenciados nas coleções filhas e excluir a receita? (Sim/Não): "
                            ).strip().lower()
                            if excluir_filhas in ("sim", "s"):
                                col_ri.delete_many({"receita_id": id_alvo})
                                col_ip.delete_many({"receita_id": id_alvo})
                                col.delete_one({"id": id_alvo})
                                print("Documentos dependentes e receita removidos com sucesso.")
                            else:
                                print("Exclusão cancelada.")
                        else:
                            col.delete_one({"id": id_alvo})
                            print("Receita removida com sucesso.")

                resp = input("Deseja excluir mais alguma receita? (Sim/Não): ").strip().lower()
                if resp in ("não", "nao", "n"):
                    return True
        finally:
            self.conn.close()