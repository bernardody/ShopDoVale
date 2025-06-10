const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * Formatar valor monetário para Real brasileiro
 * @param {number} valor - Valor a ser formatado
 * @returns {string} Valor formatado (ex: R$ 10,00)
 */
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor || 0);
}

/**
 * Formatar CPF
 * @param {string} cpf - CPF sem formatação
 * @returns {string} CPF formatado (xxx.xxx.xxx-xx)
 */
function formatarCPF(cpf) {
  if (!cpf) return '';
  const cpfLimpo = cpf.replace(/\D/g, '');
  return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formatar CNPJ
 * @param {string} cnpj - CNPJ sem formatação
 * @returns {string} CNPJ formatado (xx.xxx.xxx/xxxx-xx)
 */
function formatarCNPJ(cnpj) {
  if (!cnpj) return '';
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  return cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Formatar telefone brasileiro
 * @param {string} telefone - Telefone sem formatação
 * @returns {string} Telefone formatado ((xx) xxxxx-xxxx)
 */
function formatarTelefone(telefone) {
  if (!telefone) return '';
  const telLimpo = telefone.replace(/\D/g, '');
  
  if (telLimpo.length === 11) {
    return telLimpo.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (telLimpo.length === 10) {
    return telLimpo.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return telefone;
}

/**
 * Formatar CEP
 * @param {string} cep - CEP sem formatação
 * @returns {string} CEP formatado (xxxxx-xxx)
 */
function formatarCEP(cep) {
  if (!cep) return '';
  const cepLimpo = cep.replace(/\D/g, '');
  return cepLimpo.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Limpar string removendo caracteres especiais (manter apenas números)
 * @param {string} str - String a ser limpa
 * @returns {string} String apenas com números
 */
function apenasNumeros(str) {
  return str ? str.replace(/\D/g, '') : '';
}

/**
 * Gerar código aleatório
 * @param {number} tamanho - Tamanho do código
 * @param {string} tipo - Tipo do código (numeric, alpha, alphanumeric)
 * @returns {string} Código gerado
 */
function gerarCodigo(tamanho = 6, tipo = 'alphanumeric') {
  let chars = '';
  
  switch (tipo) {
    case 'numeric':
      chars = '0123456789';
      break;
    case 'alpha':
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      break;
    case 'alphanumeric':
    default:
      chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  
  let codigo = '';
  for (let i = 0; i < tamanho; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return codigo;
}

/**
 * Gerar hash único para identificadores
 * @param {string} input - String de entrada
 * @returns {string} Hash SHA256
 */
function gerarHash(input) {
  return crypto
    .createHash('sha256')
    .update(input + Date.now().toString())
    .digest('hex');
}

/**
 * Calcular idade a partir da data de nascimento
 * @param {Date|string} dataNascimento - Data de nascimento
 * @returns {number} Idade em anos
 */
function calcularIdade(dataNascimento) {
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const mesNascimento = nascimento.getMonth();
  
  if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  
  return idade;
}

/**
 * Converter string para slug (URL amigável)
 * @param {string} str - String a ser convertida
 * @returns {string} Slug
 */
function criarSlug(str) {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífen
    .replace(/-+/g, '-') // Remove hífens duplicados
    .replace(/^-+|-+$/g, ''); // Remove hífens do início e fim
}

/**
 * Paginar resultados
 * @param {number} page - Página atual
 * @param {number} limit - Itens por página
 * @returns {object} Objeto com offset e limit
 */
function paginar(page = 1, limit = 10) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const offset = (pageNum - 1) * limitNum;
  
  return {
    offset,
    limit: limitNum,
    page: pageNum
  };
}

/**
 * Calcular informações de paginação
 * @param {number} total - Total de registros
 * @param {number} page - Página atual
 * @param {number} limit - Itens por página
 * @returns {object} Informações de paginação
 */
function calcularPaginacao(total, page = 1, limit = 10) {
  const totalPages = Math.ceil(total / limit);
  const currentPage = parseInt(page) || 1;
  
  return {
    total,
    totalPages,
    currentPage,
    perPage: limit,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null
  };
}

/**
 * Ordenar array de objetos
 * @param {Array} array - Array a ser ordenado
 * @param {string} campo - Campo para ordenação
 * @param {string} ordem - Ordem (asc/desc)
 * @returns {Array} Array ordenado
 */
function ordenar(array, campo, ordem = 'asc') {
  return array.sort((a, b) => {
    const valorA = a[campo];
    const valorB = b[campo];
    
    if (ordem === 'asc') {
      return valorA > valorB ? 1 : valorA < valorB ? -1 : 0;
    } else {
      return valorA < valorB ? 1 : valorA > valorB ? -1 : 0;
    }
  });
}

/**
 * Remover propriedades undefined/null de um objeto
 * @param {object} obj - Objeto a ser limpo
 * @returns {object} Objeto limpo
 */
function limparObjeto(obj) {
  const limpo = {};
  
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      limpo[key] = obj[key];
    }
  });
  
  return limpo;
}

/**
 * Aguardar tempo especificado (para debugging/testes)
 * @param {number} ms - Milissegundos para aguardar
 * @returns {Promise} Promise que resolve após o tempo
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verificar se é um dia útil
 * @param {Date} data - Data a verificar
 * @returns {boolean} True se for dia útil
 */
function isDiaUtil(data = new Date()) {
  const dia = data.getDay();
  return dia !== 0 && dia !== 6; // 0 = domingo, 6 = sábado
}

/**
 * Adicionar dias úteis a uma data
 * @param {Date} data - Data inicial
 * @param {number} dias - Número de dias úteis a adicionar
 * @returns {Date} Nova data
 */
function adicionarDiasUteis(data, dias) {
  const novaData = new Date(data);
  let diasAdicionados = 0;
  
  while (diasAdicionados < dias) {
    novaData.setDate(novaData.getDate() + 1);
    if (isDiaUtil(novaData)) {
      diasAdicionados++;
    }
  }
  
  return novaData;
}

/**
 * Formatar data para o padrão brasileiro
 * @param {Date|string} data - Data a ser formatada
 * @param {boolean} incluirHora - Se deve incluir hora
 * @returns {string} Data formatada
 */
function formatarData(data, incluirHora = false) {
  const dataObj = new Date(data);
  
  if (incluirHora) {
    return dataObj.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return dataObj.toLocaleDateString('pt-BR');
}

/**
 * Calcular diferença entre datas
 * @param {Date} dataInicial - Data inicial
 * @param {Date} dataFinal - Data final
 * @returns {object} Objeto com diferenças
 */
function calcularDiferencaDatas(dataInicial, dataFinal) {
  const diff = Math.abs(dataFinal - dataInicial);
  
  return {
    milissegundos: diff,
    segundos: Math.floor(diff / 1000),
    minutos: Math.floor(diff / (1000 * 60)),
    horas: Math.floor(diff / (1000 * 60 * 60)),
    dias: Math.floor(diff / (1000 * 60 * 60 * 24))
  };
}

/**
 * Gerar nome de arquivo único
 * @param {string} nomeOriginal - Nome original do arquivo
 * @returns {string} Nome único do arquivo
 */
function gerarNomeArquivoUnico(nomeOriginal) {
  const ext = path.extname(nomeOriginal);
  const nome = path.basename(nomeOriginal, ext);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return `${criarSlug(nome)}-${timestamp}-${random}${ext}`;
}

/**
 * Verificar se arquivo existe
 * @param {string} caminho - Caminho do arquivo
 * @returns {Promise<boolean>} True se existir
 */
async function arquivoExiste(caminho) {
  try {
    await fs.access(caminho);
    return true;
  } catch {
    return false;
  }
}

/**
 * Criar diretório se não existir
 * @param {string} caminho - Caminho do diretório
 * @returns {Promise<void>}
 */
async function criarDiretorio(caminho) {
  try {
    await fs.mkdir(caminho, { recursive: true });
  } catch (error) {
    console.error('Erro ao criar diretório:', error);
  }
}

/**
 * Calcular desconto percentual
 * @param {number} valorOriginal - Valor original
 * @param {number} valorComDesconto - Valor com desconto
 * @returns {number} Percentual de desconto
 */
function calcularDescontoPercentual(valorOriginal, valorComDesconto) {
  if (!valorOriginal || valorOriginal === 0) return 0;
  return Math.round(((valorOriginal - valorComDesconto) / valorOriginal) * 100);
}

/**
 * Aplicar desconto a um valor
 * @param {number} valor - Valor original
 * @param {number} percentual - Percentual de desconto
 * @returns {number} Valor com desconto
 */
function aplicarDesconto(valor, percentual) {
  return valor - (valor * (percentual / 100));
}

/**
 * Truncar texto
 * @param {string} texto - Texto a ser truncado
 * @param {number} tamanho - Tamanho máximo
 * @param {string} sufixo - Sufixo a adicionar
 * @returns {string} Texto truncado
 */
function truncarTexto(texto, tamanho = 100, sufixo = '...') {
  if (!texto || texto.length <= tamanho) return texto;
  return texto.substring(0, tamanho - sufixo.length) + sufixo;
}

/**
 * Capitalizar primeira letra de cada palavra
 * @param {string} str - String a ser capitalizada
 * @returns {string} String capitalizada
 */
function capitalizar(str) {
  if (!str) return '';
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

module.exports = {
  // Formatação
  formatarMoeda,
  formatarCPF,
  formatarCNPJ,
  formatarTelefone,
  formatarCEP,
  formatarData,
  
  // Strings
  apenasNumeros,
  criarSlug,
  truncarTexto,
  capitalizar,
  
  // Geração
  gerarCodigo,
  gerarHash,
  gerarNomeArquivoUnico,
  
  // Cálculos
  calcularIdade,
  calcularDiferencaDatas,
  calcularDescontoPercentual,
  aplicarDesconto,
  
  // Paginação
  paginar,
  calcularPaginacao,
  
  // Arrays e Objetos
  ordenar,
  limparObjeto,
  
  // Datas
  isDiaUtil,
  adicionarDiasUteis,
  
  // Arquivos
  arquivoExiste,
  criarDiretorio,
  
  // Utilidades
  sleep
};