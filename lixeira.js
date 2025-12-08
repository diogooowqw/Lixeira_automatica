let bluetooth = document.getElementById('bluetooth');
let cam = 'conectado'; //SO EXEMPLO
if (cam == 'conectado') {
  bluetooth.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bluetooth-icon lucide-bluetooth">
  <path d="m7 7 10 10-5 5V2l5 5L7 17" />
</svg>
<div id="text_WIFI">Conectado</div>`
}
else {
  bluetooth.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
  class="lucide lucide-bluetooth-off-icon lucide-bluetooth-off">
  <path d="m17 17-5 5V12l-5 5" />
  <path d="m2 2 20 20" />
  <path d="M14.5 9.5 17 7l-5-5v4.5" />
  </svg>
  <div id="text_WIFI">Conectando</div>`
}


function parseToDate(input) {
  if (!input) return null;
  if (input instanceof Date) return input;
  const str = String(input).trim();


  if (str.includes(' ')) {
    const [left, right] = str.split(' ');
    if (left.includes('/')) {
      const [d, m, y] = left.split('/').map(Number);
      const [h = 0, mi = 0, s = 0] = (right || '').split(':').map(Number);
      return new Date(y, (m - 1), d, h || 0, mi || 0, s || 0);
    }
    if (left.includes('-')) {
      const [y, m, d] = left.split('-').map(Number);
      const [h = 0, mi = 0, s = 0] = (right || '').split(':').map(Number);
      return new Date(y, (m - 1), d, h || 0, mi || 0, s || 0);
    }
  }

  if (str.includes('/')) {
    const [d, m, y] = str.split('/').map(Number);
    return new Date(y, (m - 1), d);
  }
  if (str.includes('-')) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, (m - 1), d);
  }

  if (str.includes(':')) {
    const [h = 0, mi = 0, s = 0] = str.split(':').map(Number);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, mi || 0, s || 0);
  }

  return null;
}

function calcularDiferenca(valorInicio, valorFim) {
  const d1 = parseToDate(valorInicio);
  const d2 = parseToDate(valorFim);
  if (!d1 || !d2) return '—';

  if (d1 > d2) return 'impossível informar horário';

  const diffMs = d2 - d1;
  const totalMin = Math.floor(diffMs / 60000);
  const horas = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  if (horas === 0 && mins === 0) return 'Agora';
  return `Há ${horas}h ${mins}min`;
}

function horarioDataAtual() {
  const dataAtual = new Date();
  const dia = String(dataAtual.getDate()).padStart(2, '0');
  const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
  const ano = dataAtual.getFullYear();
  const hora = String(dataAtual.getHours()).padStart(2, '0');
  const minutos = String(dataAtual.getMinutes()).padStart(2, '0');
  const segundos = String(dataAtual.getSeconds()).padStart(2, '0');

  const horarioAtual = `${hora}:${minutos}:${segundos}`;
  const data = `${dia}/${mes}/${ano}`;

  return {
    horario: horarioAtual,
    data: data
  };
}


function atualizarNomeObjeto() {
  fetch('http://localhost:3000/api/coletas')
    .then(resp => resp.json())
    .then(coletas => {
      console.log(coletas);
      const horarioData = horarioDataAtual();




      if (coletas.length === 0) {
        document.getElementById('nameLast_Obj').textContent = '';
        document.getElementById('last_Time').textContent = '';
        document.getElementById('namePenult_Obj').textContent = '';
        document.getElementById('penult_Time').textContent = '';
        document.getElementById('nameAntepenult_Obj').textContent = '';
        document.getElementById('antepenult_Time').textContent = '';
      }

      if (coletas.length > 0) {

        console.log("Última coleta:");
        console.log("Tipo:", coletas[0].tipo);
        console.log("Horário:", coletas[0].horario);

        document.getElementById('nameLast_Obj').textContent = coletas[0].tipo.charAt(0).toUpperCase() + coletas[0].tipo.slice(1);
        document.getElementById('last_Time').textContent = coletas[0].horario;
        document.getElementById('horaLastDtc').textContent = calcularDiferenca(coletas[0].horario, horarioData.horario);
        if (coletas.length === 1) {
          document.getElementById('namePenult_Obj').textContent = '';
          document.getElementById('penult_Time').textContent = '';
          document.getElementById('nameAntepenult_Obj').textContent = '';
          document.getElementById('antepenult_Time').textContent = '';
        }
      }

      if (coletas.length > 1) {

        console.log("Penúltima coleta:");
        console.log("Tipo:", coletas[1].tipo);
        console.log("Horário:", coletas[1].horario);

        document.getElementById('namePenult_Obj').textContent = coletas[1].tipo.charAt(0).toUpperCase() + coletas[1].tipo.slice(1);
        document.getElementById('penult_Time').textContent = coletas[1].horario;
        if (coletas.length === 2) {
          document.getElementById('nameAntepenult_Obj').textContent = '';
          document.getElementById('antepenult_Time').textContent = '';
        }
      }

      if (coletas.length > 2) {

        console.log("Antepenúltima coleta:");
        console.log("Tipo:", coletas[2].tipo);
        console.log("Horário:", coletas[2].horario);

        document.getElementById('nameAntepenult_Obj').textContent = coletas[2].tipo.charAt(0).toUpperCase() + coletas[2].tipo.slice(1);
        document.getElementById('antepenult_Time').textContent = coletas[2].horario;
      }
    })
    .catch(err => {
      console.error(err);
      document.getElementById('name_Objeto').textContent = "Erro";
    });
}

function contarObjetosDetectados(tipo) {
  fetch(`http://localhost:3000/api/estatisticas?tipo=${tipo}`)
    .then(resp => resp.json())
    .then(estatisticas => {
      console.log(estatisticas);

      const total = estatisticas.length > 0 ? estatisticas[0].total : 0;

      document.getElementById(`numero_itens_${tipo}`).textContent = total;
    })
    .catch(err => console.error("Erro:", err));
};

function contadorObjetosHoje() {
  fetch('http://localhost:3000/api/coletas/today/count')
    .then(resp => {
      if (!resp.ok) {
        console.error('Resposta não OK ao buscar total de coletas hoje:', resp.status, resp.statusText);
        const el = document.getElementById('objetosDetectados');
        if (el) el.textContent = '0';
        return null;
      }
      return resp.json().catch(err => {
        console.error('Erro ao parsear JSON do total de coletas hoje:', err);
        return null;
      });
    })
    .then(json => {
      if (!json) return;
      const total = Number(json.total_itens || 0);
      const el = document.getElementById('objetosDetectados');
      if (el) el.textContent = String(total).padStart(2, '0'); // opcional: 2 dígitos
    })
    .catch(err => {
      console.error('Erro ao obter total de coletas hoje (fetch):', err);
      const el = document.getElementById('objetosDetectados');
      if (el) el.textContent = '0';
    });
}

setInterval(() => {
  atualizarNomeObjeto();
  contadorObjetosHoje();
  contarObjetosDetectados('metal');
  contarObjetosDetectados('vidro');
  contarObjetosDetectados('papel');
  contarObjetosDetectados('plastico');
  atualizarHistorico();
}, 5000);

function excluirRegistro(id) {
  if (confirm('Deseja realmente excluir este registro?')) {
    fetch(`http://localhost:3000/api/coleta/${id}`, {
      method: 'DELETE'
    })
      .then(response => {
        if (response.ok) {
          atualizarHistorico();
          atualizarNomeObjeto();
          contadorObjetosHoje();
          contarObjetosDetectados('metal');
          contarObjetosDetectados('vidro');
          contarObjetosDetectados('papel');
          contarObjetosDetectados('plastico');
          alert('Registro excluído com sucesso.');
        }
      })
      .catch(error => console.error('Erro ao excluir:', error));
  }
}

function atualizarHistorico() {
  fetch('http://localhost:3000/api/coletas')
    .then(resp => resp.json())
    .then(coletas => {
      const tabelaHistorico = document.getElementById('tabelaHistorico');
      const cabecalho = tabelaHistorico.querySelector('tr');
      tabelaHistorico.innerHTML = '';
      tabelaHistorico.appendChild(cabecalho);

      coletas.forEach(coleta => {
        const linha = document.createElement('tr');
        const tipoCelula = document.createElement('td');
        tipoCelula.className = 'lista';
        const destaqueSpan = document.createElement('span');
        destaqueSpan.id = `destaque${coleta.tipo.charAt(0).toUpperCase() + coleta.tipo.slice(1)}`;
        destaqueSpan.textContent = coleta.tipo.charAt(0).toUpperCase() + coleta.tipo.slice(1);
        tipoCelula.appendChild(destaqueSpan);

        const horariodataCelula = document.createElement('td');

        const dataObj = new Date(coleta.data);
        const dataFormatada = dataObj.toLocaleDateString('pt-BR');
        horariodataCelula.textContent = `${dataFormatada} ${coleta.horario}`;
        horariodataCelula.className = 'lista';

        const cameraCelula = document.createElement('td');
        cameraCelula.className = 'lista';
        cameraCelula.textContent = 'Câmera ESP32 - Coleta em Tempo Real';

        const deleteCelula = document.createElement('td');
        deleteCelula.className = 'lista mogger';
        deleteCelula.title = 'Excluir Registro';
        const deleteDiv = document.createElement('div');
        deleteDiv.id = 'botaoDelete';
        deleteDiv.innerHTML = `<span class="material-symbols-outlined">delete_forever</span>`;
        deleteCelula.appendChild(deleteDiv);

        deleteDiv.addEventListener('click', () => excluirRegistro(coleta.id));

        linha.appendChild(tipoCelula);
        linha.appendChild(horariodataCelula);
        linha.appendChild(cameraCelula);
        linha.appendChild(deleteCelula);
        tabelaHistorico.appendChild(linha);
      });
    })
    .catch(err => {
      console.error(err);
    });
}


