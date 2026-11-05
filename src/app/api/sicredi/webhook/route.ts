import { NextRequest, NextResponse } from 'next/server';

/**
 * Webhook Oficial da Sicredi:
 * - Recebe notificações de liquidação PIX (padrão BACEN: { pix: [{ endToEndId, txid, valor, horario }] })
 * - Recebe notificações de liquidação de Boleto Híbrido Sicredi (Cobrança API)
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // 1. Notificação Webhook PIX Sicredi (Padrão BACEN /api/v2/webhook)
    if (Array.isArray(payload?.pix)) {
      const processedTxids = payload.pix.map((item: any) => ({
        txid: item.txid,
        endToEndId: item.endToEndId,
        valor: item.valor,
        horario: item.horario,
        status: 'LIQUIDADO_PIX_SICREDI',
      }));

      return NextResponse.json(
        {
          ok: true,
          provider: 'SICREDI_PIX_WEBHOOK',
          received: processedTxids.length,
          events: processedTxids,
        },
        { status: 200 }
      );
    }

    // 2. Notificação Webhook Cobrança / Boleto Sicredi
    if (payload?.nossoNumero || payload?.idEventoWebhook) {
      return NextResponse.json(
        {
          ok: true,
          provider: 'SICREDI_BOLETO_WEBHOOK',
          nossoNumero: payload.nossoNumero,
          movimento: payload.movimento || 'LIQUIDACAO',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, received: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Webhook payload inválido' },
      { status: 400 }
    );
  }
}
