/**
 * Utilitários Oficiais Sicredi (Banco 748):
 * - Geração de Payload EMVCo / BRCode PIX com cálculo real de CRC16-CCITT (Polinômio 0x1021)
 * - Geração de Nosso Número, Código de Barras (44 posições) e Linha Digitável FEBRABAN (Banco 748 - Sicredi)
 * - Detecção de Bandeira (incluindo Cabal/Sicredi, Visa, Mastercard, Elo, Hipercard, Amex) e validação Luhn
 */

function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Calcula o CRC16-CCITT (0xFFFF, polinômio 0x1021) exigido pelo Banco Central do Brasil para o BRCode PIX.
 */
export function computePixCRC16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera um código PIX Copia e Cola (BRCode EMVCo) válido com valor, chave Pix, nome do recebedor e txid Sicredi.
 */
export function generateSicrediPixBRCode(params: {
  chavePix: string;
  merchantName?: string;
  merchantCity?: string;
  amount: number;
  txid: string;
  locationUrl?: string;
}): string {
  const cleanName = (params.merchantName || 'ESPACO CATOLICO SANTO AN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, 25);

  const cleanCity = (params.merchantCity || 'BELO HORIZONTE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, 15);

  const cleanTxid =
    params.txid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || 'SICREDIPIX01';

  const gui = emvField('00', 'br.gov.bcb.pix');
  const keyOrLocation = params.locationUrl
    ? emvField('25', params.locationUrl)
    : emvField('01', params.chavePix.trim());
  const merchantAccountInfo = emvField('26', `${gui}${keyOrLocation}`);

  const payloadFormatIndicator = emvField('00', '01');
  const pointOfInitiation = emvField('01', '12'); // 12 = QR Code Dinâmico único
  const merchantCategoryCode = emvField('52', '0000');
  const transactionCurrency = emvField('53', '986'); // BRL
  const transactionAmount = emvField('54', params.amount.toFixed(2));
  const countryCode = emvField('58', 'BR');
  const merchantNameField = emvField('59', cleanName);
  const merchantCityField = emvField('60', cleanCity);
  const additionalDataField = emvField('62', emvField('05', cleanTxid));

  const basePayload =
    payloadFormatIndicator +
    pointOfInitiation +
    merchantAccountInfo +
    merchantCategoryCode +
    transactionCurrency +
    transactionAmount +
    countryCode +
    merchantNameField +
    merchantCityField +
    additionalDataField +
    '6304';

  const crc = computePixCRC16(basePayload);
  return `${basePayload}${crc}`;
}

function modulo10(block: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = block.length - 1; i >= 0; i--) {
    let mult = parseInt(block[i], 10) * weight;
    if (mult > 9) mult = Math.floor(mult / 10) + (mult % 10);
    sum += mult;
    weight = weight === 2 ? 1 : 2;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

function modulo11Febraban(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i], 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  const dv = 11 - remainder;
  if (dv === 0 || dv === 10 || dv === 11) return 1;
  return dv;
}

/**
 * Gera dados oficiais de Boleto Registrado Sicredi (Banco 748) com Campo Livre padrão Sicredi.
 */
export function generateSicrediBoletoCode(params: {
  amount: number;
  dueDate: Date;
  cooperativa: string;
  posto: string;
  codigoBeneficiario: string;
  orderNumber: string;
}): {
  nossoNumero: string;
  codigoBarras: string;
  linhaDigitavel: string;
} {
  const bankCode = '748'; // Sicredi S.A.
  const currencyCode = '9'; // Real

  // Fator de vencimento FEBRABAN (nova base pós-22/02/2025: 1000 em 22/02/2025, ou base 07/10/1997)
  const baseDate2025 = Date.UTC(2025, 1, 22);
  const dueUtc = Date.UTC(
    params.dueDate.getFullYear(),
    params.dueDate.getMonth(),
    params.dueDate.getDate()
  );
  const diffDays = Math.max(0, Math.floor((dueUtc - baseDate2025) / (1000 * 60 * 60 * 24)));
  const fatorVencimento = ((1000 + diffDays) % 9000 + 1000).toString().slice(0, 4);

  const valorCentavos = Math.round(params.amount * 100)
    .toString()
    .padStart(10, '0')
    .slice(-10);

  // Nosso Número Sicredi: AA (ano) + B (byte geração 2) + NNNNN (sequencial 5 dígitos) + D (DV)
  const year2Digits = params.dueDate.getFullYear().toString().slice(-2);
  const seqDigits = params.orderNumber
    .replace(/\D/g, '')
    .padStart(5, '0')
    .slice(-5);
  const nossoNumeroSemDv = `${year2Digits}2${seqDigits}`; // 8 dígitos
  const dvNossoNumero = modulo11Febraban(
    `${params.cooperativa.padStart(4, '0')}${params.posto.padStart(2, '0')}${params.codigoBeneficiario.padStart(5, '0')}${nossoNumeroSemDv}`
  );
  const nossoNumeroFormatado = `${year2Digits}/2${seqDigits}-${dvNossoNumero}`;
  const nossoNumero9Digits = `${nossoNumeroSemDv}${dvNossoNumero}`; // 9 dígitos

  // Campo Livre Sicredi (25 posições):
  // 1 (Cobrança com registro) + 1 (Carteira simples) + 9 (Nosso Número) + 4 (Cooperativa) + 2 (Posto) + 5 (Beneficiário) + 1 (Valor expresso) + 0 (Filler) + 1 (DV Campo Livre)
  const coop = params.cooperativa.replace(/\D/g, '').padStart(4, '0').slice(-4);
  const posto = params.posto.replace(/\D/g, '').padStart(2, '0').slice(-2);
  const benef = params.codigoBeneficiario.replace(/\D/g, '').padStart(5, '0').slice(-5);
  const campoLivre24 = `11${nossoNumero9Digits}${coop}${posto}${benef}10`;
  const dvCampoLivre = modulo11Febraban(campoLivre24);
  const campoLivre = `${campoLivre24}${dvCampoLivre}`; // 25 dígitos

  // Código de barras sem DV geral (43 posições)
  const barcodeWithoutDv = `${bankCode}${currencyCode}${fatorVencimento}${valorCentavos}${campoLivre}`;
  const dvGeral = modulo11Febraban(barcodeWithoutDv);
  const codigoBarras = `${bankCode}${currencyCode}${dvGeral}${fatorVencimento}${valorCentavos}${campoLivre}`;

  // Montagem da Linha Digitável (5 campos)
  const campo1Base = `${bankCode}${currencyCode}${campoLivre.slice(0, 5)}`;
  const campo1Dv = modulo10(campo1Base);
  const campo1 = `${campo1Base.slice(0, 5)}.${campo1Base.slice(5)}${campo1Dv}`;

  const campo2Base = campoLivre.slice(5, 15);
  const campo2Dv = modulo10(campo2Base);
  const campo2 = `${campo2Base.slice(0, 5)}.${campo2Base.slice(5)}${campo2Dv}`;

  const campo3Base = campoLivre.slice(15, 25);
  const campo3Dv = modulo10(campo3Base);
  const campo3 = `${campo3Base.slice(0, 5)}.${campo3Base.slice(5)}${campo3Dv}`;

  const campo4 = dvGeral.toString();
  const campo5 = `${fatorVencimento}${valorCentavos}`;

  const linhaDigitavel = `${campo1} ${campo2} ${campo3} ${campo4} ${campo5}`;

  return {
    nossoNumero: nossoNumeroFormatado,
    codigoBarras,
    linhaDigitavel,
  };
}

/**
 * Detecta a bandeira do cartão de crédito/débito (incluindo cartões Sicredi/Cabal, Visa, Mastercard, Elo, Hipercard, Amex).
 */
export function detectCardBrand(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, '');
  if (!clean) return 'SICREDI';

  if (/^4/.test(clean)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'MASTERCARD';
  if (/^(4011|4312|4389|4514|4576|5041|5066|5090|6277|6362|6363|650|6516|6550)/.test(clean)) {
    return 'ELO';
  }
  if (/^(606282|3841)/.test(clean)) return 'HIPERCARD';
  if (/^(6042|6043|5896)/.test(clean)) return 'CABAL / SICREDI';
  if (/^3[47]/.test(clean)) return 'AMEX';

  return 'SICREDI / VISA';
}

/**
 * Valida número de cartão pelo algoritmo de Luhn (aceita cartões de teste em modo sandbox).
 */
export function isValidCardNumber(cardNumber: string): boolean {
  const clean = cardNumber.replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}
