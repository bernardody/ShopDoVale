-- ShopDoVale - Schema Simplificado para Curso Técnico
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tipos ENUM básicos
CREATE TYPE tipo_usuario AS ENUM ('consumidor', 'produtor');
CREATE TYPE status_pedido AS ENUM ('pendente', 'confirmado', 'preparando', 'entregue', 'cancelado');

-- Tabela de endereços
CREATE TABLE enderecos (
    id SERIAL PRIMARY KEY,
    cep VARCHAR(9) NOT NULL,
    logradouro VARCHAR(200) NOT NULL,
    numero VARCHAR(10) NOT NULL,
    complemento VARCHAR(100),
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de usuários
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
    endereco_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (endereco_id) REFERENCES enderecos(id) ON DELETE SET NULL
);

-- Tabela de produtores (extensão de usuários)
CREATE TABLE produtores (
    usuario_id UUID PRIMARY KEY,
    nome_loja VARCHAR(100) NOT NULL,
    descricao_loja TEXT,
    logo_loja TEXT,
    whatsapp VARCHAR(20),
    avaliacao_media DECIMAL(3,2) DEFAULT 0.00,
    total_avaliacoes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabela de categorias
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    descricao TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icone VARCHAR(50),
    is_ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de produtos (renovação semanal)
CREATE TABLE produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(200) NOT NULL,
    descricao TEXT NOT NULL,
    preco DECIMAL(10,2) NOT NULL CHECK (preco > 0),
    quantidade_estoque INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_estoque >= 0),
    imagem_principal TEXT,
    is_ativo BOOLEAN DEFAULT true,
    produtor_id UUID NOT NULL,
    categoria_id INTEGER NOT NULL,
    semana_ano INTEGER NOT NULL DEFAULT EXTRACT(WEEK FROM CURRENT_DATE),
    ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    data_validade DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '6 days'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (produtor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
    UNIQUE(produtor_id, nome, semana_ano, ano)
);

-- Tabela de carrinho
CREATE TABLE carrinho (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consumidor_id UUID NOT NULL,
    produto_id UUID NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (consumidor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    UNIQUE(consumidor_id, produto_id)
);

-- Tabela de pedidos
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_pedido VARCHAR(20) UNIQUE NOT NULL,
    consumidor_id UUID NOT NULL,
    produtor_id UUID NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    status_pedido status_pedido DEFAULT 'pendente',
    endereco_entrega_id INTEGER,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (consumidor_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (produtor_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (endereco_entrega_id) REFERENCES enderecos(id) ON DELETE RESTRICT
);

-- Tabela de itens do pedido
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

-- Tabela de avaliações
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

-- Índices básicos para performance
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo_usuario);
CREATE INDEX idx_produtos_produtor ON produtos(produtor_id);
CREATE INDEX idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX idx_produtos_ativo ON produtos(is_ativo);
CREATE INDEX idx_pedidos_consumidor ON pedidos(consumidor_id);
CREATE INDEX idx_pedidos_produtor ON pedidos(produtor_id);
CREATE INDEX idx_carrinho_consumidor ON carrinho(consumidor_id);

-- Função para validar produto da semana atual
CREATE OR REPLACE FUNCTION produto_esta_valido(produto_uuid UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql;

-- Função para gerar número do pedido
CREATE OR REPLACE FUNCTION gerar_numero_pedido()
RETURNS VARCHAR(20) AS $$
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
$$ LANGUAGE plpgsql;

-- Função para renovação semanal de produtos
CREATE OR REPLACE FUNCTION renovar_produtos_semanais()
RETURNS TEXT AS $$
DECLARE
    produtos_removidos INTEGER := 0;
BEGIN
    -- Remove produtos de semanas anteriores
    DELETE FROM produtos 
    WHERE semana_ano != EXTRACT(WEEK FROM CURRENT_DATE) 
       OR ano != EXTRACT(YEAR FROM CURRENT_DATE)
       OR data_validade < CURRENT_DATE;
    
    GET DIAGNOSTICS produtos_removidos = ROW_COUNT;
    
    -- Limpa carrinho de produtos inexistentes
    DELETE FROM carrinho 
    WHERE produto_id NOT IN (
        SELECT id FROM produtos WHERE is_ativo = true
    );
    
    RETURN format('Renovação concluída: %s produtos removidos', produtos_removidos);
END;
$$ LANGUAGE plpgsql;

-- Triggers básicos
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

CREATE TRIGGER trg_pedidos_updated_at
    BEFORE UPDATE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_updated_at();

-- View para produtos da semana atual
CREATE VIEW vw_produtos_semana_atual AS
SELECT 
    p.id,
    p.nome,
    p.descricao,
    p.preco,
    p.quantidade_estoque,
    p.imagem_principal,
    p.data_validade,
    c.nome as categoria_nome,
    u.nome_completo as produtor_nome,
    pr.nome_loja,
    pr.avaliacao_media,
    e.cidade as produtor_cidade,
    e.estado as produtor_estado
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