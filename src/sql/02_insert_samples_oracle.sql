-- =====================================================================
-- MiniChef | Banco de Dados Relacional (Oracle)
-- Script 02: registros de exemplo (os mesmos da C2)
--
-- TODOS OS DADOS SÃO FICTÍCIOS: pessoas, CPFs, e-mails, quantidades e
-- custos servem apenas para demonstrar o funcionamento do sistema.
-- Colunas [FUTURO] ficam vazias (NULL). Booleanos: 1 = sim, 0 = não.
-- Os ids são gerados pela coluna IDENTITY, em ordem a partir de 1.
-- Executar logo depois de 01_create_tables_oracle.sql.
-- Execução: sqlplus <usuario>/<senha>@<servico> @src/sql/02_insert_samples_oracle.sql
-- =====================================================================

-- usuario (senha_hash fictício; o programa grava o hash real da senha)
INSERT INTO usuario (nome, email, email_confirmado, data_nascimento, cpf, senha_hash, tipo_conta, perfil_acesso) VALUES ('Admin MiniChef',  'admin@exemplo.com',  1,  DATE '1995-03-10', '000.000.000-01', 'hash_ilustrativo', 'Usuário comum',   'administrador');
INSERT INTO usuario (nome, email, email_confirmado, data_nascimento, cpf, senha_hash, tipo_conta, perfil_acesso) VALUES ('Ana Exemplo',     'ana@exemplo.com',    1,  DATE '2001-07-22', '000.000.000-02', 'hash_ilustrativo', 'Usuário comum',   'comum');
INSERT INTO usuario (nome, email, email_confirmado, data_nascimento, cpf, senha_hash, tipo_conta, perfil_acesso) VALUES ('Bruno Exemplo',   'bruno@exemplo.com',  1,  DATE '1998-11-05', '000.000.000-03', 'hash_ilustrativo', 'Chef de cozinha', 'comum');
INSERT INTO usuario (nome, email, email_confirmado, data_nascimento, cpf, senha_hash, tipo_conta, perfil_acesso) VALUES ('Carla Exemplo',   'carla@exemplo.com',  0, DATE '2003-01-30', '000.000.000-04', 'hash_ilustrativo', 'Usuário comum',   'comum');

-- ingrediente (preco_medio fica NULL: orçamento é funcionalidade futura)
INSERT INTO ingrediente (nome, categoria, unidade_padrao, validade_media_dias) VALUES ('Arroz branco',     'grão',       'g',       365);
INSERT INTO ingrediente (nome, categoria, unidade_padrao, validade_media_dias) VALUES ('Feijão carioca',   'grão',       'g',       365);
INSERT INTO ingrediente (nome, categoria, unidade_padrao, validade_media_dias) VALUES ('Peito de frango',  'proteína',   'g',       2);
INSERT INTO ingrediente (nome, categoria, unidade_padrao, validade_media_dias) VALUES ('Ovo',              'proteína',   'unidade', 21);
INSERT INTO ingrediente (nome, categoria, unidade_padrao, validade_media_dias) VALUES ('Leite integral',   'laticínio',  'ml',      5);
INSERT INTO ingrediente (nome, categoria, unidade_padrao, validade_media_dias) VALUES ('Farinha de trigo', 'grão',       'g',       180);
INSERT INTO ingrediente (nome, categoria, unidade_padrao, validade_media_dias) VALUES ('Tomate',           'vegetal',    'unidade', 7);
INSERT INTO ingrediente (nome, categoria, unidade_padrao, validade_media_dias) VALUES ('Cebola',           'vegetal',    'unidade', 30);
INSERT INTO ingrediente (nome, categoria, unidade_padrao, validade_media_dias) VALUES ('Alho',             'tempero',    'dente',   60);
INSERT INTO ingrediente (nome, categoria, unidade_padrao, validade_media_dias) VALUES ('Azeite',           'gordura',    'ml',      540);
INSERT INTO ingrediente (nome, categoria, unidade_padrao, validade_media_dias) VALUES ('Queijo muçarela',  'laticínio',  'g',       NULL);
INSERT INTO ingrediente (nome, categoria, unidade_padrao, validade_media_dias) VALUES ('Banana',           'fruta',      'unidade', 5);

-- receita
INSERT INTO receita (nome, porcao_padrao, refeicao_recomendada, modo_preparo, nacionalidade, tempo_medio_gasto_min, finalidade, orcamento_estimado, status, autor_id) VALUES ('Arroz soltinho',           4, 'Almoço',          'Refogue alho e cebola no azeite. Junte o arroz, refogue, cubra com água e cozinhe tampado até secar.', 'Brasileira', 25, 'dia a dia', 6.50,  'Publicada',  2);
INSERT INTO receita (nome, porcao_padrao, refeicao_recomendada, modo_preparo, nacionalidade, tempo_medio_gasto_min, finalidade, orcamento_estimado, status, autor_id) VALUES ('Feijão caseiro',           6, 'Almoço',          'Cozinhe o feijão na pressão. Refogue alho e cebola, junte ao feijão e apure.',                       'Brasileira', 60, 'dia a dia', 9.00,  'Publicada',  2);
INSERT INTO receita (nome, porcao_padrao, refeicao_recomendada, modo_preparo, nacionalidade, tempo_medio_gasto_min, finalidade, orcamento_estimado, status, autor_id) VALUES ('Frango grelhado',          2, 'Jantar',          'Tempere o frango com alho e sal. Grelhe dos dois lados até dourar.',                                 'Brasileira', 30, 'nutrição',  14.00, 'Publicada',  3);
INSERT INTO receita (nome, porcao_padrao, refeicao_recomendada, modo_preparo, nacionalidade, tempo_medio_gasto_min, finalidade, orcamento_estimado, status, autor_id) VALUES ('Omelete simples',          1, 'Café da manhã',   'Bata os ovos, junte tomate e cebola picados, despeje na frigideira untada e dobre ao firmar.',        'Francesa',   10, 'dia a dia', 4.00,  'Publicada',  3);
INSERT INTO receita (nome, porcao_padrao, refeicao_recomendada, modo_preparo, nacionalidade, tempo_medio_gasto_min, finalidade, orcamento_estimado, status, autor_id) VALUES ('Panqueca de banana',       2, 'Lanche',          'Amasse a banana, misture ovo e farinha, frite pequenas porções em frigideira untada.',               'Americana',  15, 'dia a dia', 3.50,  'Em Análise', 4);
INSERT INTO receita (nome, porcao_padrao, refeicao_recomendada, modo_preparo, nacionalidade, tempo_medio_gasto_min, finalidade, orcamento_estimado, status, autor_id) VALUES ('Molho de tomate rústico',  4, 'Almoço',          'Refogue alho e cebola, junte tomates picados e cozinhe em fogo baixo até encorpar.',                 'Italiana',   35, 'festa',     8.00,  'Rascunho',   3);

-- receita_ingrediente
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (1, 1, 400, 'g',       'Principal',  'Privado');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (1, 8, 1,   'unidade', 'Secundário', 'Privado');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (1, 9, 2,   'dente',   'Secundário', 'Privado');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (1, 10, 15, 'ml',      'Removível',  'Opcional');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (2, 2, 500, 'g',       'Principal',  'Privado');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (2, 8, 1,   'unidade', 'Secundário', 'Privado');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (2, 9, 3,   'dente',   'Secundário', 'Privado');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (3, 3, 400, 'g',       'Principal',  'Privado');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (3, 9, 2,   'dente',   'Secundário', 'Privado');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (3, 10, 10, 'ml',      'Removível',  'Opcional');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (4, 4, 2,   'unidade', 'Principal',  'Privado');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (4, 7, 1,   'unidade', 'Opcional',   'Opcional');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (4, 8, 0.5, 'unidade', 'Opcional',   'Opcional');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (4, 11, 30, 'g',       'Opcional',   'Opcional');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (5, 12, 2,  'unidade', 'Principal',  'Privado');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (5, 4, 1,   'unidade', 'Principal',  'Privado');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (5, 6, 60,  'g',       'Secundário', 'Privado');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (6, 7, 6,   'unidade', 'Principal',  'Privado');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (6, 8, 1,   'unidade', 'Secundário', 'Privado');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (6, 9, 3,   'dente',   'Secundário', 'Privado');
INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade, papel, visibilidade) VALUES (6, 10, 20, 'ml',      'Removível',  'Opcional');

-- planner_semanal: semana de 19/10/2026 da Ana e do Bruno
INSERT INTO planner_semanal (usuario_id, semana_inicio, orcamento_definido) VALUES (2, DATE '2026-10-19', 120.00);
INSERT INTO planner_semanal (usuario_id, semana_inicio, orcamento_definido) VALUES (3, DATE '2026-10-19', NULL);

-- item_planner: porções desejadas diferentes da porção padrão da receita
INSERT INTO item_planner (planner_id, receita_id, dia_semana, refeicao, porcoes_desejadas) VALUES (1, 1, 'segunda', 'Almoço',        8);
INSERT INTO item_planner (planner_id, receita_id, dia_semana, refeicao, porcoes_desejadas) VALUES (1, 2, 'segunda', 'Almoço',        6);
INSERT INTO item_planner (planner_id, receita_id, dia_semana, refeicao, porcoes_desejadas) VALUES (1, 3, 'terça',   'Jantar',        4);
INSERT INTO item_planner (planner_id, receita_id, dia_semana, refeicao, porcoes_desejadas) VALUES (1, 4, 'quarta',  'Café da manhã', 2);
INSERT INTO item_planner (planner_id, receita_id, dia_semana, refeicao, porcoes_desejadas) VALUES (1, 1, 'quinta',  'Almoço',        4);
INSERT INTO item_planner (planner_id, receita_id, dia_semana, refeicao, porcoes_desejadas) VALUES (2, 6, 'sexta',   'Almoço',        8);

COMMIT;
