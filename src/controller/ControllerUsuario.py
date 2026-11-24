from conexion.mongo_connection import MongoConnection
from model.Usuario import Usuario


class ControllerUsuario:
    def __init__(self, uri: str = "mongodb://localhost:27017/", db_name: str = "minichef_db"):
        self.conn = MongoConnection(uri=uri, db_name=db_name)

    def _proximo_id(self, col) -> int:
        ultimo = col.find_one(sort=[("id", -1)])
        return (ultimo["id"] + 1) if ultimo and "id" in ultimo else 1

    def existe_por_id(self, col, id_usuario: int) -> bool:
        return col.count_documents({"id": id_usuario}) > 0

    def existe_por_email(self, col, email: str) -> bool:
        return col.count_documents({"email": {"$regex": f"^{email}$", "$options": "i"}}) > 0

    def listar_usuarios(self, col) -> list:
        docs = list(col.find({}, {"_id": 0, "id": 1, "nome": 1, "email": 1, "tipo_conta": 1}).sort("id", 1))
        print("\n--- USUÁRIOS CADASTRADOS ---")
        for d in docs:
            print(f"ID: {d['id']} | Nome: {d['nome']} | E-mail: {d['email']} | Tipo: {d.get('tipo_conta', '')}")
        return docs

    def inserir_usuario(self) -> bool:
        """Retorna True se o usuário pedir para voltar ao menu principal."""
        db = self.conn.connect()
        col = db["usuario"]
        try:
            while True:
                print("\n=== INSERIR USUÁRIO ===")
                nome = input("Nome: ").strip()
                email = input("E-mail: ").strip()
                tipo_conta = input("Tipo de conta (ex.: Chef de cozinha, Usuário comum): ").strip()
                data_cadastro = input("Data de cadastro (AAAA-MM-DD): ").strip()

                if self.existe_por_email(col, email):
                    print("Erro: Já existe um usuário cadastrado com este e-mail.")
                else:
                    novo_id = self._proximo_id(col)
                    doc = {
                        "id": novo_id,
                        "nome": nome,
                        "email": email,
                        "tipo_conta": tipo_conta,
                        "data_cadastro": data_cadastro,
                    }
                    col.insert_one(doc)
                    obj = Usuario(
                        doc["id"], doc["nome"], doc["email"], doc["tipo_conta"], doc["data_cadastro"]
                    )
                    print("Usuário inserido com sucesso:")
                    print(obj.to_string())

                resp = input("Deseja continuar inserindo usuários? (Sim/Não): ").strip().lower()
                if resp in ("não", "nao", "n"):
                    return True
        finally:
            self.conn.close()

    def atualizar_usuario(self) -> bool:
        """Retorna True se o usuário pedir para voltar ao menu principal."""
        db = self.conn.connect()
        col = db["usuario"]
        try:
            while True:
                print("\n=== ATUALIZAR USUÁRIO ===")
                docs = self.listar_usuarios(col)
                if not docs:
                    print("Nenhum usuário disponível para atualização.")
                    return True

                try:
                    id_alvo = int(input("Digite o ID do usuário que deseja atualizar: ").strip())
                except ValueError:
                    print("ID inválido. Informe um número inteiro.")
                    continue

                if not self.existe_por_id(col, id_alvo):
                    print("Usuário não encontrado.")
                else:
                    print("Informe os novos valores dos atributos (deixe em branco para manter o atual):")
                    atual = col.find_one({"id": id_alvo}, {"_id": 0})
                    nome = input(f"Nome [{atual['nome']}]: ").strip() or atual["nome"]
                    email = input(f"E-mail [{atual['email']}]: ").strip() or atual["email"]
                    tipo_conta = input(f"Tipo de conta [{atual.get('tipo_conta', '')}]: ").strip() or atual.get("tipo_conta", "")

                    col.update_one(
                        {"id": id_alvo},
                        {"$set": {
                            "nome": nome,
                            "email": email,
                            "tipo_conta": tipo_conta,
                        }}
                    )
                    atualizado = col.find_one({"id": id_alvo}, {"_id": 0})
                    obj = Usuario(
                        atualizado["id"], atualizado["nome"], atualizado["email"],
                        atualizado.get("tipo_conta", ""), atualizado.get("data_cadastro", "")
                    )
                    print("Registro atualizado com sucesso:")
                    print(obj.to_string())

                resp = input("Deseja atualizar mais algum usuário? (Sim/Não): ").strip().lower()
                if resp in ("não", "nao", "n"):
                    return True
        finally:
            self.conn.close()

    def remover_usuario(self) -> bool:
        """Retorna True se o usuário pedir para voltar ao menu principal."""
        db = self.conn.connect()
        col = db["usuario"]
        col_receita = db["receita"]
        col_planner = db["planner_semanal"]
        try:
            while True:
                print("\n=== REMOVER USUÁRIO ===")
                docs = self.listar_usuarios(col)
                if not docs:
                    print("Nenhum usuário disponível para remoção.")
                    return True

                try:
                    id_alvo = int(input("Digite o ID do usuário que deseja remover: ").strip())
                except ValueError:
                    print("ID inválido. Informe um número inteiro.")
                    continue

                if not self.existe_por_id(col, id_alvo):
                    print("Usuário não encontrado.")
                else:
                    confirma = input(f"Deseja realmente remover o usuário ID {id_alvo}? (Sim/Não): ").strip().lower()
                    if confirma in ("não", "nao", "n"):
                        return True
                    if confirma in ("sim", "s"):
                        qtd_receitas = col_receita.count_documents({"autor_id": id_alvo})
                        qtd_planners = col_planner.count_documents({"usuario_id": id_alvo})

                        if qtd_receitas > 0 or qtd_planners > 0:
                            print(
                                f"Este usuário possui {qtd_receitas} receita(s) e {qtd_planners} planner(s) referenciados."
                            )
                            excluir_filhas = input(
                                "Deseja remover os documentos referenciados nas coleções filhas e excluir o usuário? (Sim/Não): "
                            ).strip().lower()
                            if excluir_filhas in ("sim", "s"):
                                col_receita.delete_many({"autor_id": id_alvo})
                                col_planner.delete_many({"usuario_id": id_alvo})
                                col.delete_one({"id": id_alvo})
                                print("Documentos dependentes e usuário removidos com sucesso.")
                            else:
                                print("Remoção cancelada: usuário não pode ser excluído enquanto possuir referências.")
                        else:
                            col.delete_one({"id": id_alvo})
                            print("Usuário removido com sucesso.")

                resp = input("Deseja excluir mais algum usuário? (Sim/Não): ").strip().lower()
                if resp in ("não", "nao", "n"):
                    return True
        finally:
            self.conn.close()