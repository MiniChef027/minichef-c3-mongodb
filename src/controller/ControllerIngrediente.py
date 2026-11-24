from conexion.mongo_connection import MongoConnection
from model.Ingrediente import Ingrediente


class ControllerIngrediente:
    def __init__(self, uri: str = "mongodb://localhost:27017/", db_name: str = "minichef_db"):
        self.conn = MongoConnection(uri=uri, db_name=db_name)

    def _proximo_id(self, col) -> int:
        ultimo = col.find_one(sort=[("id", -1)])
        return (ultimo["id"] + 1) if ultimo and "id" in ultimo else 1

    def existe_por_id(self, col, id_ingrediente: int) -> bool:
        return col.count_documents({"id": id_ingrediente}) > 0

    def existe_por_nome(self, col, nome: str) -> bool:
        return col.count_documents({"nome": {"$regex": f"^{nome}$", "$options": "i"}}) > 0

    def listar_ingredientes(self, col) -> list:
        docs = list(col.find({}, {"_id": 0, "id": 1, "nome": 1, "categoria": 1, "unidade_padrao": 1}).sort("id", 1))
        print("\n--- INGREDIENTES CADASTRADOS ---")
        for d in docs:
            print(f"ID: {d['id']} | Nome: {d['nome']} | Categoria: {d.get('categoria', 'N/A')} | Unidade: {d['unidade_padrao']}")
        return docs

    def inserir_ingrediente(self) -> bool:
        db = self.conn.connect()
        col = db["ingrediente"]
        try:
            while True:
                print("\n=== INSERIR INGREDIENTE ===")
                nome = input("Nome: ").strip()
                if self.existe_por_nome(col, nome):
                    print("Erro: Já existe um ingrediente com este nome.")
                else:
                    categoria = input("Categoria: ").strip()
                    unidade_padrao = input("Unidade padrão (ex.: g, ml, un): ").strip()
                    validade_str = input("Validade média em dias (opcional): ").strip()
                    preco_str = input("Preço médio (opcional): ").strip()

                    novo_id = self._proximo_id(col)
                    doc = {
                        "id": novo_id,
                        "nome": nome,
                        "categoria": categoria if categoria else None,
                        "unidade_padrao": unidade_padrao,
                        "validade_media_dias": int(validade_str) if validade_str.isdigit() else None,
                        "preco_medio": float(preco_str.replace(",", ".")) if preco_str else None,
                    }
                    col.insert_one(doc)
                    obj = Ingrediente(
                        doc["id"], doc["nome"], doc["categoria"],
                        doc["unidade_padrao"], doc["validade_media_dias"], doc["preco_medio"]
                    )
                    print("Ingrediente inserido com sucesso:")
                    print(obj.to_string())

                resp = input("Deseja continuar inserindo ingredientes? (Sim/Não): ").strip().lower()
                if resp in ("não", "nao", "n"):
                    return True
        finally:
            self.conn.close()

    def atualizar_ingrediente(self) -> bool:
        db = self.conn.connect()
        col = db["ingrediente"]
        try:
            while True:
                print("\n=== ATUALIZAR INGREDIENTE ===")
                docs = self.listar_ingredientes(col)
                if not docs:
                    print("Nenhum ingrediente disponível para atualização.")
                    return True

                try:
                    id_alvo = int(input("Digite o ID do ingrediente que deseja atualizar: ").strip())
                except ValueError:
                    print("ID inválido. Informe um número inteiro.")
                    continue

                if not self.existe_por_id(col, id_alvo):
                    print("Ingrediente não encontrado.")
                else:
                    atual = col.find_one({"id": id_alvo}, {"_id": 0})
                    nome = input(f"Nome [{atual['nome']}]: ").strip() or atual["nome"]
                    categoria = input(f"Categoria [{atual.get('categoria') or ''}]: ").strip()
                    unidade_padrao = input(f"Unidade padrão [{atual['unidade_padrao']}]: ").strip() or atual["unidade_padrao"]
                    validade_str = input(f"Validade média dias [{atual.get('validade_media_dias') or ''}]: ").strip()
                    preco_str = input(f"Preço médio [{atual.get('preco_medio') or ''}]: ").strip()

                    col.update_one(
                        {"id": id_alvo},
                        {"$set": {
                            "nome": nome,
                            "categoria": categoria if categoria else atual.get("categoria"),
                            "unidade_padrao": unidade_padrao,
                            "validade_media_dias": int(validade_str) if validade_str.isdigit() else atual.get("validade_media_dias"),
                            "preco_medio": float(preco_str.replace(",", ".")) if preco_str else atual.get("preco_medio"),
                        }}
                    )
                    atualizado = col.find_one({"id": id_alvo}, {"_id": 0})
                    obj = Ingrediente(
                        atualizado["id"], atualizado["nome"], atualizado.get("categoria"),
                        atualizado["unidade_padrao"], atualizado.get("validade_media_dias"),
                        atualizado.get("preco_medio")
                    )
                    print("Registro atualizado com sucesso:")
                    print(obj.to_string())

                resp = input("Deseja atualizar mais algum ingrediente? (Sim/Não): ").strip().lower()
                if resp in ("não", "nao", "n"):
                    return True
        finally:
            self.conn.close()

    def remover_ingrediente(self) -> bool:
        db = self.conn.connect()
        col = db["ingrediente"]
        col_ri = db["receita_ingrediente"]
        col_ilc = db["item_lista_compras"]
        try:
            while True:
                print("\n=== REMOVER INGREDIENTE ===")
                docs = self.listar_ingredientes(col)
                if not docs:
                    print("Nenhum ingrediente disponível para remoção.")
                    return True

                try:
                    id_alvo = int(input("Digite o ID do ingrediente que deseja remover: ").strip())
                except ValueError:
                    print("ID inválido. Informe um número inteiro.")
                    continue

                if not self.existe_por_id(col, id_alvo):
                    print("Ingrediente não encontrado.")
                else:
                    confirma = input(f"Deseja realmente remover o ingrediente ID {id_alvo}? (Sim/Não): ").strip().lower()
                    if confirma in ("não", "nao", "n"):
                        return True
                    if confirma in ("sim", "s"):
                        qtd_ri = col_ri.count_documents({"ingrediente_id": id_alvo})
                        qtd_ilc = col_ilc.count_documents({"ingrediente_id": id_alvo})

                        if qtd_ri > 0 or qtd_ilc > 0:
                            print(
                                f"Ingrediente referenciado em {qtd_ri} vínculo(s) de receita e {qtd_ilc} item(ns) de lista de compras."
                            )
                            excluir_filhas = input(
                                "Deseja remover os documentos referenciados nas coleções filhas e excluir o ingrediente? (Sim/Não): "
                            ).strip().lower()
                            if excluir_filhas in ("sim", "s"):
                                col_ri.delete_many({"ingrediente_id": id_alvo})
                                col_ilc.delete_many({"ingrediente_id": id_alvo})
                                col.delete_one({"id": id_alvo})
                                print("Documentos dependentes e ingrediente removidos com sucesso.")
                            else:
                                print("Exclusão cancelada.")
                        else:
                            col.delete_one({"id": id_alvo})
                            print("Ingrediente removido com sucesso.")

                resp = input("Deseja excluir mais algum ingrediente? (Sim/Não): ").strip().lower()
                if resp in ("não", "nao", "n"):
                    return True
        finally:
            self.conn.close()