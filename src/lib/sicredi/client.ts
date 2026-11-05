import { SicrediCreatePaymentRequest, SicrediPaymentResponse } from './types';
import { processSicrediPayment } from './service';

/**
 * Envia o pedido de pagamento para a Route Handler da API Sicredi (/api/sicredi/pagamento)
 * e possui fallback automático caso o site esteja rodando em hospedagem estática (GitHub Pages).
 */
export async function createSicrediPayment(
  payload: SicrediCreatePaymentRequest
): Promise<SicrediPaymentResponse> {
  try {
    const res = await fetch('/api/sicredi/pagamento', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data: SicrediPaymentResponse = await res.json();
      return data;
    }
  } catch {
    // Em modo export estático (ex: GitHub Pages), processa via motor local Sandbox Sicredi
  }

  return processSicrediPayment(payload);
}
