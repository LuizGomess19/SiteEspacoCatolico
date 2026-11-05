import { NextRequest, NextResponse } from 'next/server';
import { processSicrediPayment } from '@/lib/sicredi/service';
import { SicrediCreatePaymentRequest } from '@/lib/sicredi/types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SicrediCreatePaymentRequest;

    if (!body || !body.orderNumber || !body.amount || !body.method) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Parâmetros obrigatórios ausentes (orderNumber, amount, method).',
        },
        { status: 400 }
      );
    }

    const result = await processSicrediPayment(body);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || 'Erro interno ao processar pagamento na API Sicredi.',
      },
      { status: 500 }
    );
  }
}
