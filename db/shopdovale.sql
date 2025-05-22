CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE tipo_usuario AS ENUM ('consumidor', 'produtor');
CREATE TYPE status_pedido AS ENUM ('pendente', 'confirmado', 'preparando', 'a_caminho', 'entregue', 'cancelado');
CREATE TYPE tipo_entrega AS ENUM ('retirada_produtor', 'entrega_consumidor');
CREATE TYPE status_pagamento AS ENUM ('pendente', 'aprovado', 'rejeitado', 'estornado');

CREATE TABLE enderecos (
    id SERIAL PRIMARY KEY,
    cep VARCHAR(9) NOT NULL,
    logradouro VARCHAR(200) NOT NULL,
    numero VARCHAR(10) NOT NULL,
    complemento VARCHAR(100),
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    pais VARCHAR(50) DEFAULT 'Brasil',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    nome_completo VARCHAR(150) NOT NULL,
    telefone VARCHAR(20),
    cpf_cnpj VARCHAR(18) UNIQUE,
    tipo_usuario tipo_usuario NOT NULL,
    foto_perfil TEXT,
    is_ativo BOOLEAN DEFAULT true,
    email_verificado BOOLEAN DEFAULT false,
    token_verificacao VARCHAR(255),
    endereco_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP,
    
    FOREIGN KEY (endereco_id) REFERENCES enderecos(id) ON DELETE SET NULL
);

CREATE TABLE produtores (
    usuario_id UUID PRIMARY KEY,
    nome_loja VARCHAR(100) NOT NULL,
    descricao_loja TEXT,
    logo_loja TEXT,
    banner_loja TEXT,
    horario_funcionamento TEXT,
    whatsapp VARCHAR(20),
    instagram VARCHAR(100),
    facebook VARCHAR(100),
    avaliacao_media DECIMAL(3,2) DEFAULT 0.00,
    total_avaliacoes INTEGER DEFAULT 0,
    is_verificado BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    descricao TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icone VARCHAR(50),
    cor_tema VARCHAR(7) DEFAULT '#6366f1',
    is_ativa BOOLEAN DEFAULT true,
    ordem_exibicao INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(200) NOT NULL,
    descricao TEXT NOT NULL,
    preco DECIMAL(10,2) NOT NULL CHECK (preco > 0),
    preco_promocional DECIMAL(10,2) CHECK (preco_promocional >= 0),
    quantidade_estoque INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_estoque >= 0),
    peso_kg DECIMAL(8,3),
    dimensoes VARCHAR(50),
    imagem_principal TEXT,
    imagens_adicionais TEXT[],
    is_ativo BOOLEAN DEFAULT true,
    destaque BOOLEAN DEFAULT false,
    produtor_id UUID NOT NULL,
    categoria_id INTEGER NOT NULL,
    semana_ano INTEGER NOT NULL DEFAULT EXTRACT(WEEK FROM CURRENT_DATE),
    ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    data_validade DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '6 days'),
    is_renovado_semana BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (date_trunc('week', CURRENT_DATE) + INTERVAL '1 week' - INTERVAL '1 second'),
    
    FOREIGN KEY (produtor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
    CHECK (data_validade >= CURRENT_DATE),
    UNIQUE(produtor_id, nome, semana_ano, ano)
);

CREATE TABLE carrinho (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consumidor_id UUID NOT NULL,
    produto_id UUID NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (consumidor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    UNIQUE(consumidor_id, produto_id)
);

CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_pedido VARCHAR(20) UNIQUE NOT NULL,
    consumidor_id UUID NOT NULL,
    produtor_id UUID NOT NULL,
    valor_produtos DECIMAL(10,2) NOT NULL,
    valor_frete DECIMAL(10,2) DEFAULT 0.00,
    valor_total DECIMAL(10,2) NOT NULL,
    status_pedido status_pedido DEFAULT 'pendente',
    tipo_entrega tipo_entrega NOT NULL,
    endereco_entrega_id INTEGER,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_entrega_prevista DATE,
    data_entrega_realizada TIMESTAMP,
    
    FOREIGN KEY (consumidor_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (produtor_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (endereco_entrega_id) REFERENCES enderecos(id) ON DELETE RESTRICT
) PARTITION BY RANGE (created_at);

CREATE TABLE pedidos_2024_01 PARTITION OF pedidos
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE pedidos_2024_02 PARTITION OF pedidos
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE pedidos_2024_03 PARTITION OF pedidos
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

CREATE TABLE itens_pedido (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID NOT NULL,
    produto_id UUID NOT NULL,
    nome_produto VARCHAR(200) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    subtotal DECIMAL(10,2) NOT NULL,
    
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
);

CREATE TABLE pagamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    metodo_pagamento VARCHAR(50) NOT NULL,
    status_pagamento status_pagamento DEFAULT 'pendente',
    referencia_externa VARCHAR(200),
    comprovante_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processado_at TIMESTAMP,
    
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

CREATE TABLE avaliacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produto_id UUID NOT NULL,
    consumidor_id UUID NOT NULL,
    pedido_id UUID NOT NULL,
    nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    FOREIGN KEY (consumidor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    UNIQUE(produto_id, consumidor_id, pedido_id)
);

CREATE TABLE mensagens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    remetente_id UUID NOT NULL,
    destinatario_id UUID NOT NULL,
    pedido_id UUID,
    mensagem TEXT NOT NULL,
    is_lida BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo_usuario);
CREATE INDEX idx_usuarios_cpf_cnpj ON usuarios(cpf_cnpj);
CREATE INDEX idx_usuarios_ativo ON usuarios(is_ativo);

CREATE INDEX idx_produtos_produtor ON produtos(produtor_id);
CREATE INDEX idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX idx_produtos_ativo ON produtos(is_ativo);
CREATE INDEX idx_produtos_destaque ON produtos(destaque);
CREATE INDEX idx_produtos_preco ON produtos(preco);
CREATE INDEX idx_produtos_estoque ON produtos(quantidade_estoque);
CREATE INDEX idx_produtos_nome_busca ON produtos USING gin(to_tsvector('portuguese', nome || ' ' || descricao));

CREATE INDEX idx_pedidos_consumidor ON pedidos(consumidor_id);
CREATE INDEX idx_pedidos_produtor ON pedidos(produtor_id);
CREATE INDEX idx_pedidos_status ON pedidos(status_pedido);
CREATE INDEX idx_pedidos_data ON pedidos(created_at);
CREATE INDEX idx_pedidos_numero ON pedidos(numero_pedido);

CREATE INDEX idx_carrinho_consumidor ON carrinho(consumidor_id);
CREATE INDEX idx_carrinho_produto ON carrinho(produto_id);

CREATE INDEX idx_mensagens_remetente ON mensagens(remetente_id);
CREATE INDEX idx_mensagens_destinatario ON mensagens(destinatario_id);
CREATE INDEX idx_mensagens_nao_lidas ON mensagens(destinatario_id, is_lida) WHERE is_lida = false;

CREATE OR REPLACE FUNCTION produto_esta_valido(produto_uuid UUID)
RETURNS BOOLEAN AS $
DECLARE
    semana_atual INTEGER := EXTRACT(WEEK FROM CURRENT_DATE);
    ano_atual INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    produto_semana INTEGER;
    produto_ano INTEGER;
    produto_ativo BOOLEAN;
BEGIN
    SELECT semana_ano, ano, is_ativo
    INTO produto_semana, produto_ano, produto_ativo
    FROM produtos 
    WHERE id = produto_uuid;
    
    RETURN produto_ativo AND produto_semana = semana_atual AND produto_ano = ano_atual;
END;
$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION renovar_produtos_semanais()
RETURNS TEXT AS $
DECLARE
    produtos_arquivados INTEGER := 0;
    produtos_renovados INTEGER := 0;
    log_msg TEXT;
BEGIN
    INSERT INTO produtos_historico (
        id, nome, descricao, preco, preco_promocional,
        quantidade_inicial, quantidade_vendida, produtor_id, categoria_id,
        semana_ano, ano, data_inicio, data_fim, created_at
    )
    SELECT 
        p.id, p.nome, p.descricao, p.preco, p.preco_promocional,
        p.quantidade_estoque + COALESCE(vendas.total_vendido, 0) as quantidade_inicial,
        COALESCE(vendas.total_vendido, 0) as quantidade_vendida,
        p.produtor_id, p.categoria_id, p.semana_ano, p.ano,
        (date_trunc('week', p.created_at)::DATE) as data_inicio,
        (date_trunc('week', p.created_at)::DATE + INTERVAL '6 days')::DATE as data_fim,
        p.created_at
    FROM produtos p
    LEFT JOIN (
        SELECT 
            ip.produto_id,
            SUM(ip.quantidade) as total_vendido
        FROM itens_pedido ip
        JOIN pedidos pd ON ip.pedido_id = pd.id
        WHERE pd.status_pedido IN ('confirmado', 'preparando', 'a_caminho', 'entregue')
        GROUP BY ip.produto_id
    ) vendas ON p.id = vendas.produto_id
    WHERE p.semana_ano != EXTRACT(WEEK FROM CURRENT_DATE) 
       OR p.ano != EXTRACT(YEAR FROM CURRENT_DATE)
       OR p.data_validade < CURRENT_DATE;
    
    GET DIAGNOSTICS produtos_arquivados = ROW_COUNT;
    
    DELETE FROM produtos 
    WHERE semana_ano != EXTRACT(WEEK FROM CURRENT_DATE) 
       OR ano != EXTRACT(YEAR FROM CURRENT_DATE)
       OR data_validade < CURRENT_DATE;
    
    UPDATE produtos 
    SET is_renovado_semana = false
    WHERE semana_ano = EXTRACT(WEEK FROM CURRENT_DATE) 
      AND ano = EXTRACT(YEAR FROM CURRENT_DATE);
    
    GET DIAGNOSTICS produtos_renovados = ROW_COUNT;
    
    UPDATE carrinho 
    SET quantidade = 0
    WHERE produto_id NOT IN (
        SELECT id FROM produtos WHERE is_ativo = true
    );
    
    log_msg := format('Renovação semanal concluída: %s produtos arquivados, %s produtos renovados', 
                     produtos_arquivados, produtos_renovados);
    
    INSERT INTO logs_sistema (operacao, detalhes, created_at) 
    VALUES ('renovacao_semanal', log_msg, CURRENT_TIMESTAMP);
    
    RETURN log_msg;
END;
$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cadastrar_produto_semanal(
    p_nome VARCHAR(200),
    p_descricao TEXT,
    p_preco DECIMAL(10,2),
    p_quantidade INTEGER,
    p_produtor_id UUID,
    p_categoria_id INTEGER,
    p_preco_promocional DECIMAL(10,2) DEFAULT NULL,
    p_imagem_principal TEXT DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
    novo_produto_id UUID;
    semana_atual INTEGER := EXTRACT(WEEK FROM CURRENT_DATE);
    ano_atual INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
    IF EXISTS (
        SELECT 1 FROM produtos 
        WHERE produtor_id = p_produtor_id 
          AND nome = p_nome 
          AND semana_ano = semana_atual 
          AND ano = ano_atual
    ) THEN
        RAISE EXCEPTION 'Produto "%" já foi cadastrado nesta semana', p_nome;
    END IF;
    
    INSERT INTO produtos (
        nome, descricao, preco, preco_promocional, quantidade_estoque,
        produtor_id, categoria_id, imagem_principal,
        semana_ano, ano, data_validade, is_renovado_semana
    ) VALUES (
        p_nome, p_descricao, p_preco, p_preco_promocional, p_quantidade,
        p_produtor_id, p_categoria_id, p_imagem_principal,
        semana_atual, ano_atual, 
        (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE,
        true
    ) RETURNING id INTO novo_produto_id;
    
    RETURN novo_produto_id;
END;
$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION gerar_numero_pedido()
RETURNS VARCHAR(20) AS $
DECLARE
    novo_numero VARCHAR(20);
    contador INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO contador
    FROM pedidos 
    WHERE created_at >= date_trunc('month', CURRENT_DATE);
    
    novo_numero := 'SV' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || LPAD(contador::TEXT, 6, '0');
    
    RETURN novo_numero;
END;
$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calcular_frete(
    p_endereco_origem INTEGER,
    p_endereco_destino INTEGER,
    p_peso_total DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    frete DECIMAL := 0.00;
BEGIN
    IF p_endereco_origem = p_endereco_destino THEN
        RETURN 0.00;
    END IF;
    
    frete := LEAST(p_peso_total * 2.50, 50.00);
    
    RETURN frete;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION atualizar_estoque_produto()
RETURNS TRIGGER AS $
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NOT produto_esta_valido(NEW.produto_id) THEN
            RAISE EXCEPTION 'Produto não está mais disponível (semana expirada)';
        END IF;
        
        UPDATE produtos 
        SET quantidade_estoque = quantidade_estoque - NEW.quantidade
        WHERE id = NEW.produto_id;
        
        IF NOT FOUND OR (SELECT quantidade_estoque FROM produtos WHERE id = NEW.produto_id) < 0 THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto';
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION atualizar_avaliacao_produto()
RETURNS TRIGGER AS $
BEGIN
    UPDATE produtores 
    SET 
        avaliacao_media = (
            SELECT AVG(a.nota)::DECIMAL(3,2)
            FROM avaliacoes a
            JOIN produtos p ON a.produto_id = p.id
            WHERE p.produtor_id = (
                SELECT pr.produtor_id 
                FROM produtos pr 
                WHERE pr.id = COALESCE(NEW.produto_id, OLD.produto_id)
            )
        ),
        total_avaliacoes = (
            SELECT COUNT(*)
            FROM avaliacoes a
            JOIN produtos p ON a.produto_id = p.id
            WHERE p.produtor_id = (
                SELECT pr.produtor_id 
                FROM produtos pr 
                WHERE pr.id = COALESCE(NEW.produto_id, OLD.produto_id)
            )
        )
    WHERE usuario_id = (
        SELECT pr.produtor_id 
        FROM produtos pr 
        WHERE pr.id = COALESCE(NEW.produto_id, OLD.produto_id)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trg_produtos_updated_at
    BEFORE UPDATE ON produtos
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trg_carrinho_updated_at
    BEFORE UPDATE ON carrinho
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_updated_at();

CREATE TRIGGER trg_pedidos_updated_at
    BEFORE UPDATE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_updated_at();

CREATE OR REPLACE FUNCTION definir_numero_pedido()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_pedido IS NULL THEN
        NEW.numero_pedido = gerar_numero_pedido();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pedidos_numero
    BEFORE INSERT ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION definir_numero_pedido();

CREATE OR REPLACE FUNCTION validar_produto_carrinho()
RETURNS TRIGGER AS $
BEGIN
    IF NOT produto_esta_valido(NEW.produto_id) THEN
        RAISE EXCEPTION 'Produto não está mais disponível para esta semana';
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_carrinho
    BEFORE INSERT OR UPDATE ON carrinho
    FOR EACH ROW
    EXECUTE FUNCTION validar_produto_carrinho();

CREATE OR REPLACE FUNCTION limpar_carrinho_expirado()
RETURNS TRIGGER AS $
BEGIN
    DELETE FROM carrinho 
    WHERE produto_id = OLD.id;
    
    RETURN OLD;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trg_limpar_carrinho_produto_expirado
    BEFORE DELETE ON produtos
    FOR EACH ROW
    EXECUTE FUNCTION limpar_carrinho_expirado();

CREATE TRIGGER trg_avaliacoes_produto
    AFTER INSERT OR UPDATE OR DELETE ON avaliacoes
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_avaliacao_produto();

CREATE VIEW vw_produtos_semana_atual AS
SELECT 
    p.id,
    p.nome,
    p.descricao,
    p.preco,
    p.preco_promocional,
    p.quantidade_estoque,
    p.imagem_principal,
    p.is_ativo,
    p.destaque,
    p.data_validade,
    p.semana_ano,
    p.ano,
    c.nome as categoria_nome,
    c.slug as categoria_slug,
    u.nome_completo as produtor_nome,
    pr.nome_loja,
    pr.avaliacao_media,
    pr.total_avaliacoes,
    e.cidade as produtor_cidade,
    e.estado as produtor_estado,
    p.created_at
FROM produtos p
JOIN categorias c ON p.categoria_id = c.id
JOIN usuarios u ON p.produtor_id = u.id
JOIN produtores pr ON u.id = pr.usuario_id
LEFT JOIN enderecos e ON u.endereco_id = e.id
WHERE p.is_ativo = true 
  AND u.is_ativo = true
  AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
  AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
  AND p.data_validade >= CURRENT_DATE;

CREATE VIEW vw_dashboard_produtor AS
SELECT 
    p.usuario_id,
    COUNT(DISTINCT CASE 
        WHEN pd.created_at >= date_trunc('week', CURRENT_DATE) 
        THEN pd.id 
    END) as pedidos_semana_atual,
    COUNT(DISTINCT pd.id) as total_pedidos,
    SUM(CASE 
        WHEN pd.status_pedido = 'entregue' 
        AND pd.created_at >= date_trunc('week', CURRENT_DATE)
        THEN pd.valor_total 
        ELSE 0 
    END) as faturamento_semana,
    SUM(CASE WHEN pd.status_pedido = 'entregue' THEN pd.valor_total ELSE 0 END) as faturamento_total,
    COUNT(DISTINCT CASE 
        WHEN pr.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
        AND pr.ano = EXTRACT(YEAR FROM CURRENT_DATE)
        AND pr.is_ativo = true
        THEN pr.id 
    END) as produtos_semana_atual,
    COUNT(DISTINCT ph.id) as produtos_historico_total,
    AVG(a.nota) as avaliacao_media
FROM produtores p
LEFT JOIN pedidos pd ON p.usuario_id = pd.produtor_id
LEFT JOIN produtos pr ON p.usuario_id = pr.produtor_id
LEFT JOIN produtos_historico ph ON p.usuario_id = ph.produtor_id
LEFT JOIN avaliacoes a ON pr.id = a.produto_id
GROUP BY p.usuario_id;

CREATE VIEW vw_produtos_mais_vendidos_semana AS
SELECT 
    p.id,
    p.nome,
    p.preco,
    pr.nome_loja,
    SUM(ip.quantidade) as total_vendido,
    COUNT(DISTINCT ip.pedido_id) as total_pedidos,
    AVG(a.nota) as avaliacao_media
FROM produtos p
JOIN itens_pedido ip ON p.id = ip.produto_id
JOIN pedidos pd ON ip.pedido_id = pd.id
JOIN produtores pr ON p.produtor_id = pr.usuario_id
LEFT JOIN avaliacoes a ON p.id = a.produto_id
WHERE pd.created_at >= date_trunc('week', CURRENT_DATE)
  AND pd.status_pedido IN ('confirmado', 'preparando', 'a_caminho', 'entregue')
  AND p.semana_ano = EXTRACT(WEEK FROM CURRENT_DATE)
  AND p.ano = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY p.id, p.nome, p.preco, pr.nome_loja
ORDER BY total_vendido DESC
LIMIT 20;

CREATE TABLE logs_sistema (
    id SERIAL PRIMARY KEY,
    operacao VARCHAR(100) NOT NULL,
    detalhes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categorias (nome, descricao, slug, icone) VALUES
('Verduras Folhosas', 'Alface, espinafre, couve e outras folhas verdes', 'verduras-folhosas', '🥬'),
('Legumes', 'Tomate, pepino, abobrinha, berinjela', 'legumes', '🍅'),
('Raízes e Tubérculos', 'Batata, cenoura, beterraba, mandioca', 'raizes-tuberculos', '🥕'),
('Frutas da Estação', 'Frutas frescas e sazonais', 'frutas-estacao', '🍎'),
('Ervas e Temperos', 'Manjericão, salsa, cebolinha, orégano', 'ervas-temperos', '🌿'),
('Produtos Processados', 'Conservas, geleias e produtos caseiros', 'produtos-processados', '🥫');

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrinho ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY politica_usuarios_proprios ON usuarios
    FOR ALL
    USING (id = current_setting('app.current_user_id')::UUID);

CREATE POLICY politica_carrinho_proprio ON carrinho
    FOR ALL
    USING (consumidor_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY politica_pedidos_acesso ON pedidos
    FOR SELECT
    USING (
        consumidor_id = current_setting('app.current_user_id')::UUID OR
        produtor_id = current_setting('app.current_user_id')::UUID
    );