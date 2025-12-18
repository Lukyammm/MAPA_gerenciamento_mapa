/***************************************
 * CONFIGURAÇÃO BÁSICA
 ***************************************/
const SHEET_CADASTRO = 'Cadastro';
const SHEET_BASE = 'Base de Dados';
const SHEET_MAPA = 'MapaDados';

function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Mapa Dinâmico das Salas')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/***************************************
 * MAPA MENTAL (persistência em Sheets)
 ***************************************/
function ensureMapaSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(SHEET_MAPA);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_MAPA);
    sheet.getRange('A1').setValue(JSON.stringify(defaultMapData()));
  }
  return sheet;
}

function defaultMapData() {
  const rootId = Utilities.getUuid();
  const salas = [
    {
      title: 'Recepção',
      description: 'Acolhimento e registros',
      color: '#38bdf8',
    },
    {
      title: 'Triagem',
      description: 'Avaliação inicial de pacientes',
      color: '#c084fc',
    },
    {
      title: 'Sala Amarela',
      description: 'Cuidados intermediários',
      color: '#f59e0b',
    },
    {
      title: 'Sala Vermelha',
      description: 'Emergências críticas',
      color: '#ef4444',
    },
    {
      title: 'Centro Cirúrgico',
      description: 'Procedimentos cirúrgicos',
      color: '#22c55e',
    },
    {
      title: 'UTI',
      description: 'Cuidados intensivos',
      color: '#3b82f6',
    },
  ];

  const spacing = 140;
  const offsetY = -((salas.length - 1) * spacing) / 2;

  return {
    rootId: rootId,
    nodes: [
      {
        id: rootId,
        parentId: null,
        title: 'Hospital Estadual',
        description: 'Mapa linear das salas cadastradas',
        tags: ['hospital', 'dashboard'],
        collapsed: false,
        position: { x: 0, y: 0 },
        color: '#60a5fa',
      },
      ...salas.map((sala, idx) => ({
        id: Utilities.getUuid(),
        parentId: rootId,
        title: sala.title,
        description: sala.description,
        tags: ['sala'],
        collapsed: false,
        position: { x: 260, y: offsetY + idx * spacing },
        color: sala.color,
        order: idx + 1,
      })),
    ],
  };
}

function getMap() {
  const sheet = ensureMapaSheet();
  const value = sheet.getRange('A1').getValue();
  try {
    const parsed = JSON.parse(value);
    if (parsed && parsed.nodes) return parsed;
    return defaultMapData();
  } catch (err) {
    return defaultMapData();
  }
}

function setMap(mapObj) {
  if (!mapObj || !Array.isArray(mapObj.nodes)) {
    throw new Error('Mapa inválido recebido.');
  }
  const sheet = ensureMapaSheet();
  sheet.getRange('A1').setValue(JSON.stringify(mapObj));
  return { status: 'ok', savedAt: new Date() };
}

/***************************************
 * FUNÇÕES LEGADAS (registros de salas)
 ***************************************/
/**
 * Lê as salas na aba "Cadastro", coluna A, a partir da linha 2.
 */
function getSalas() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(SHEET_CADASTRO);
  if (!sheet) {
    throw new Error('Aba "Cadastro" não encontrada.');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const salas = values
    .map(r => r[0])
    .filter(v => v !== null && v !== '');

  return salas;
}

/**
 * Retorna todos os registros da aba "Base de Dados" para uma sala específica.
 */
function getRegistrosPorSala(sala) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(SHEET_BASE);
  if (!sheet) {
    throw new Error('Aba "Base de Dados" não encontrada.');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  // Esperando estrutura: Timestamp | Data | Hora | Sala | Nome | Especialidade | Procedimento
  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

  const registros = data
    .filter(row => row[3] === sala) // coluna D = Sala
    .map(row => ({
      timestamp: row[0],
      data: row[1],
      hora: row[2],
      sala: row[3],
      nome: row[4],
      especialidade: row[5],
      procedimento: row[6],
    }));

  return registros;
}

/**
 * Adiciona um registro na aba "Base de Dados" com data e hora automáticas.
 */
function addRegistro(sala, nome, especialidade, procedimento) {
  if (!sala) {
    throw new Error('Sala não informada.');
  }

  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(SHEET_BASE);
  if (!sheet) {
    throw new Error('Aba "Base de Dados" não encontrada.');
  }

  const now = new Date();
  const tz = Session.getScriptTimeZone();
  const data = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
  const hora = Utilities.formatDate(now, tz, 'HH:mm');

  // Timestamp (objeto Date) + Data formatada + Hora + Sala + Nome + Especialidade + Procedimento
  sheet.appendRow([now, data, hora, sala, nome || '', especialidade || '', procedimento || '']);

  return {
    message: 'Registro salvo com sucesso.',
    timestamp: now,
    data: data,
    hora: hora,
    sala: sala
  };
}
