// ===== CONTROLLER.JS - Cliente para interagir com a API REST =====

class ControladorLixeira {
  constructor() {
    // Usar localhost:3000 por padrão (servidor Node)
    this.apiUrl = (typeof window !== 'undefined' && window.API_BASE_URL)
      ? window.API_BASE_URL
      : 'http://localhost:3000';
    
    this.tiposMaterial = {
      metal: "metal",
      vidro: "vidro",
      papel: "papel",
      plastico: "plástico"
    };
  }

  /**
   * Insere um novo registro de lixo coletado
   * @param {string} tipo - Tipo do material
   * @param {string} data - Data (YYYY-MM-DD, opcional)
   * @param {string} horario - Horário (HH:MM:SS, opcional)
   * @returns {Promise}
   */
  async inserirColeta(tipo, data = null, horario = null) {
    try {
      const dataSql = data || this.formatarData(new Date());
      const horarioSql = horario || this.formatarHora(new Date());

      const payload = { tipo, data: dataSql, horario: horarioSql };
      console.log("Enviando coleta:", payload);

      const response = await fetch(`${this.apiUrl}/api/inserir-coleta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const resultado = await response.json();
      console.log("Coleta inserida com sucesso:", resultado);
      return resultado;
    } catch (erro) {
      console.error("Erro ao inserir coleta:", erro);
      throw erro;
    }
  }

  /**
   * Recupera todas as coletas
   * @returns {Promise<Array>}
   */
  async obterTodasColetas() {
    try {
      const response = await fetch(`${this.apiUrl}/api/coletas`);

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const resultado = await response.json();
      console.log("Coletas recuperadas:", resultado);
      return resultado;
    } catch (erro) {
      console.error("Erro ao obter coletas:", erro);
      throw erro;
    }
  }

  /**
   * Recupera coletas de um tipo específico
   * @param {string} tipo
   * @returns {Promise<Array>}
   */
  async obterColetasPorTipo(tipo) {
    try {
      const response = await fetch(`${this.apiUrl}/api/coletas/${encodeURIComponent(tipo)}`);

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const resultado = await response.json();
      console.log(`Coletas de ${tipo}:`, resultado);
      return resultado;
    } catch (erro) {
      console.error(`Erro ao obter coletas de ${tipo}:`, erro);
      throw erro;
    }
  }

  /**
   * Recupera coletas de uma data específica
   * @param {string} data - YYYY-MM-DD
   * @returns {Promise<Array>}
   */
  async obterColetasPorData(data) {
    try {
      const dataSql = typeof data === 'string' ? data : this.formatarData(data);
      const response = await fetch(`${this.apiUrl}/api/coletas/data/${dataSql}`);

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const resultado = await response.json();
      console.log(`Coletas de ${dataSql}:`, resultado);
      return resultado;
    } catch (erro) {
      console.error("Erro ao obter coletas por data:", erro);
      throw erro;
    }
  }

  /**
   * Recupera todas as coletas do dia atual
   * @returns {Promise<Array>}
   */
  async obterColetasHoje() {
    try {
      const response = await fetch(`${this.apiUrl}/api/coletas/today`);
      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }
      const resultado = await response.json();
      console.log('Coletas de hoje:', resultado);
      return resultado;
    } catch (erro) {
      console.error('Erro ao obter coletas de hoje:', erro);
      throw erro;
    }
  }

  /**
   * Obtém estatísticas agrupadas por tipo
   * @returns {Promise<Array>}
   */
async obterEstatisticas(tipo = null) {
  try {
    const url = tipo
      ? `${this.apiUrl}/api/estatisticas?tipo=${encodeURIComponent(tipo)}`
      : `${this.apiUrl}/api/estatisticas`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erro ${response.status}`);
    }

    const resultado = await response.json();
    console.log("Estatísticas:", resultado);
    return resultado;

  } catch (erro) {
    console.error("Erro ao obter estatísticas:", erro);
    throw erro;
  }
}

  /**
   * Obtém a última coleta
   * @returns {Promise<Object|null>}
   */
  async obterUltimaColeta() {
    try {
      const response = await fetch(`${this.apiUrl}/api/ultima-coleta`);

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const resultado = await response.json();
      console.log("Última coleta:", resultado);
      return resultado;
    } catch (erro) {
      console.error("Erro ao obter última coleta:", erro);
      throw erro;
    }
  }

  /**
   * Atualiza um registro
   * @param {number} id
   * @param {object} dados - {tipo, data, horario}
   * @returns {Promise}
   */
  async atualizarColeta(id, dados) {
    try {
      const response = await fetch(`${this.apiUrl}/api/coleta/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const resultado = await response.json();
      console.log("Coleta atualizada:", resultado);
      return resultado;
    } catch (erro) {
      console.error("Erro ao atualizar coleta:", erro);
      throw erro;
    }
  }

  /**
   * Deleta um registro
   * @param {number} id
   * @returns {Promise}
   */
  async deletarColeta(id) {
    try {
      const response = await fetch(`${this.apiUrl}/api/coleta/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const resultado = await response.json();
      console.log("Coleta deletada:", resultado);
      return resultado;
    } catch (erro) {
      console.error("Erro ao deletar coleta:", erro);
      throw erro;
    }
  }

  /**
   * Conta itens de um tipo
   * @param {string} tipo
   * @returns {Promise<number>}
   */
  async contarItensPorTipo(tipo) {
    try {
      const coletas = await this.obterColetasPorTipo(tipo);
      return coletas.length;
    } catch (erro) {
      console.error(`Erro ao contar itens de ${tipo}:`, erro);
      throw erro;
    }
  }

  /**
   * Formata data para SQL (YYYY-MM-DD)
   */
  formatarData(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  /**
   * Formata hora para SQL (HH:MM:SS)
   */
  formatarHora(hora) {
    const horas = String(hora.getHours()).padStart(2, "0");
    const minutos = String(hora.getMinutes()).padStart(2, "0");
    const segundos = String(hora.getSeconds()).padStart(2, "0");
    return `${horas}:${minutos}:${segundos}`;
  }
}

// Expor globalmente para uso no navegador
if (typeof window !== 'undefined') {
  window.ControladorLixeira = ControladorLixeira;
  window.controlador = new ControladorLixeira();
  if (!window.API_BASE_URL) {
    window.API_BASE_URL = window.controlador.apiUrl;
  }
}

// Exportar para Node.js/testes (se usar módulos)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ControladorLixeira;
}
