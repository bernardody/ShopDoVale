CREATE DATABASE IF NOT EXISTS shop_do_vale;
USE shop_do_vale;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(50) NOT NULL, -- Senha simples sem hash (apenas para MVP)
    tipo ENUM('consumidor', 'produtor') NOT NULL,
    telefone VARCHAR(20),
    endereco VARCHAR(200),
    cidade VARCHAR(100) DEFAULT 'Vale do Caí',
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10, 2) NOT NULL,
    unidade VARCHAR(20) DEFAULT 'kg', -- kg, unidade, dúzia, maço, etc
    quantidade_disponivel INT DEFAULT 0,
    categoria VARCHAR(50), -- frutas, verduras, legumes, temperos, etc
    imagem_url VARCHAR(255), -- URL da imagem do produto
    produtor_id INT NOT NULL,
    ativo BOOLEAN DEFAULT TRUE, -- Se o produto está disponível
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produtor_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE carrinho (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    data_adicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    -- Garantir que um usuário não adicione o mesmo produto duas vezes
    UNIQUE KEY unique_usuario_produto (usuario_id, produto_id)
);

INSERT INTO usuarios (nome, email, senha, tipo, telefone, endereco) VALUES
('João Silva', 'joao@email.com', '123456', 'produtor', '51999999999', 'Sítio São João, Vale do Caí'),
('Maria Santos', 'maria@email.com', '123456', 'produtor', '51888888888', 'Fazenda Santa Maria, Vale do Caí');

INSERT INTO usuarios (nome, email, senha, tipo, telefone, endereco) VALUES
('Pedro Oliveira', 'pedro@email.com', '123456', 'consumidor', '51777777777', 'Rua das Flores, 123'),
('Ana Costa', 'ana@email.com', '123456', 'consumidor', '51666666666', 'Av. Principal, 456');

INSERT INTO produtos (nome, descricao, preco, unidade, quantidade_disponivel, categoria, produtor_id) VALUES
('Tomate Italiano', 'Tomates frescos colhidos hoje', 4.50, 'kg', 50, 'legumes', 1),
('Alface Crespa', 'Alface orgânica sem agrotóxicos', 3.00, 'unidade', 30, 'verduras', 1),
('Laranja Valência', 'Laranjas doces e suculentas', 2.80, 'kg', 100, 'frutas', 2),
('Cenoura', 'Cenouras frescas e crocantes', 3.50, 'kg', 40, 'legumes', 2),
('Couve', 'Couve fresca para sua saúde', 2.50, 'maço', 25, 'verduras', 1);

INSERT INTO carrinho (usuario_id, produto_id, quantidade) VALUES
(3, 1, 2), -- Pedro comprou 2kg de tomate
(3, 3, 5), -- Pedro comprou 5kg de laranja
(4, 2, 1); -- Ana comprou 1 alface

SELECT * FROM usuarios WHERE id = 5;
SELECT * FROM produtos;
SELECT * FROM carrinho;