export type SicrediPaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'boleto';

export type SicrediEnvironment = 'sandbox' | 'production';

export interface SicrediCustomerInput {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  address: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
  };
}

export interface SicrediCardInput {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  holderCpf?: string;
  installments: number; // 1 for debit_card, 1..12 for credit_card
  brand?: string;
}

export interface SicrediCreatePaymentRequest {
  orderNumber: string;
  amount: number;
  method: SicrediPaymentMethod;
  customer: SicrediCustomerInput;
  card?: SicrediCardInput;
  description?: string;
}

export interface SicrediPixData {
  txid: string;
  location?: string;
  pixCopiaECola: string;
  qrCodeBase64?: string;
  chave: string;
  calendario: {
    criacao: string;
    expiracao: number; // segundos (ex: 3600)
  };
  status: 'ATIVA' | 'CONCLUIDA' | 'REMOVIDA_PELO_USUARIO_RECEBEDOR';
}

export interface SicrediBoletoData {
  nossoNumero: string;
  linhaDigitavel: string;
  codigoBarras: string;
  dataEmissao: string;
  dataVencimento: string;
  valorNominal: number;
  cooperativa: string;
  posto: string;
  codigoBeneficiario: string;
  beneficiarioNome: string;
  beneficiarioCnpj: string;
  txidPixHibrido?: string;
  qrCodePixHibrido?: string;
  situacao: 'EM_ABERTO' | 'LIQUIDADO' | 'BAIXADO';
}

export interface SicrediCardTransactionData {
  tid: string;
  nsu: string;
  authorizationCode: string;
  brand: string;
  maskedCard: string;
  holderName: string;
  type: 'CREDITO' | 'DEBITO';
  installments: number;
  installmentAmount: number;
  authorizedAt: string;
  status: 'APPROVED' | 'DECLINED' | 'PENDING_3DS';
  message: string;
}

export interface SicrediPaymentResponse {
  ok: boolean;
  mode: SicrediEnvironment;
  provider: 'SICREDI';
  method: SicrediPaymentMethod;
  orderNumber: string;
  transactionId: string;
  amount: number;
  orderStatus: 'awaiting_payment' | 'paid';
  createdAt: string;
  pix?: SicrediPixData;
  boleto?: SicrediBoletoData;
  cardTransaction?: SicrediCardTransactionData;
  error?: string;
}
