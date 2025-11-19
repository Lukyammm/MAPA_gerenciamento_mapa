/***************************************
 * CONFIGURAÇÃO BÁSICA
 ***************************************/
const SHEET_CADASTRO = 'Cadastro';
const SHEET_BASE = 'Base de Dados';

function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Mapa Dinâmico das Salas')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

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
