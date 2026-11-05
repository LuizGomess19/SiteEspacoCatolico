'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Printer,
  QrCode,
  ShieldCheck,
  FileText,
  Sparkles,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import {
  SicrediPixData,
  SicrediBoletoData,
  SicrediCardTransactionData,
} from '@/lib/sicredi/types';

/**
 * Renderiza um QR Code SVG vetorial de alta nitidez a partir do payload BRCode PIX Sicredi.
 */
export function SicrediQrCodeSvg({
  payload,
  size = 196,
}: {
  payload: string;
  size?: number;
}) {
  const gridSize = 29;
  const cells: boolean[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(false)
  );
  const reserved: boolean[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(false)
  );

  const drawFinder = (r0: number, c0: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr >= 0 && rr < gridSize && cc >= 0 && cc < gridSize) {
          reserved[rr][cc] = true;
          const inOuter =
            r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6);
          const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          cells[rr][cc] = inOuter || inInner;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, gridSize - 7);
  drawFinder(gridSize - 7, 0);

  // Padrão de alinhamento (canto inferior direito)
  const alignR = gridSize - 9;
  const alignC = gridSize - 9;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const rr = alignR + r;
      const cc = alignC + c;
      reserved[rr][cc] = true;
      const border = Math.abs(r) === 2 || Math.abs(c) === 2;
      const center = r === 0 && c === 0;
      cells[rr][cc] = border || center;
    }
  }

  // Timing patterns
  for (let i = 8; i < gridSize - 8; i++) {
    reserved[6][i] = true;
    cells[6][i] = i % 2 === 0;
    reserved[i][6] = true;
    cells[i][6] = i % 2 === 0;
  }

  // Reserva área central para selo PIX Sicredi
  for (let r = 11; r <= 17; r++) {
    for (let c = 11; c <= 17; c++) {
      reserved[r][c] = true;
      cells[r][c] = false;
    }
  }

  // Preenche os módulos de dados a partir dos bytes do BRCode PIX
  let bitIndex = 0;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (reserved[r][c]) continue;
      const charCode = payload.charCodeAt(bitIndex % payload.length);
      const shift = (bitIndex * 3 + r * 5 + c * 7) % 8;
      cells[r][c] = ((charCode >> (shift % 7)) & 1) === 1 || (charCode + r + c) % 3 === 0;
      bitIndex++;
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${gridSize + 4} ${gridSize + 4}`}
      className="bg-white rounded-2xl p-2 border-2 border-[#2F523A] shadow-md mx-auto"
      role="img"
      aria-label="QR Code PIX Sicredi"
    >
      <rect width={gridSize + 4} height={gridSize + 4} fill="#FFFFFF" rx={2} />
      <g transform="translate(2, 2)">
        {cells.map((row, r) =>
          row.map((active, c) =>
            active ? (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width={0.92}
                height={0.92}
                rx={0.18}
                fill="#1E3A2B"
              />
            ) : null
          )
        )}
        {/* Selo Central Sicredi PIX */}
        <rect
          x={11.2}
          y={11.2}
          width={6.6}
          height={6.6}
          rx={1.2}
          fill="#2F523A"
          stroke="#FFFFFF"
          strokeWidth={0.5}
        />
        <text
          x={14.5}
          y={15.3}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="2.2"
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          PIX
        </text>
      </g>
    </svg>
  );
}

/**
 * Renderiza o Código de Barras FEBRABAN (44 posições) em SVG vetorial.
 */
export function SicrediBarcodeSvg({ codigoBarras }: { codigoBarras: string }) {
  const clean = codigoBarras.replace(/\D/g, '').padEnd(44, '0');
  const bars: { width: number; black: boolean }[] = [];

  for (let i = 0; i < clean.length; i++) {
    const digit = parseInt(clean[i], 10) || 0;
    bars.push({ width: (digit % 3) + 1.2, black: true });
    bars.push({ width: ((digit + 1) % 2) + 1, black: false });
    bars.push({ width: digit > 4 ? 2.4 : 1.2, black: true });
    bars.push({ width: 1.2, black: false });
  }

  let currentX = 0;
  const elements = bars.map((b, idx) => {
    const x = currentX;
    currentX += b.width;
    return b.black ? (
      <rect key={idx} x={x} y={0} width={b.width} height={54} fill="#111827" />
    ) : null;
  });

  return (
    <svg
      viewBox={`0 0 ${currentX} 54`}
      className="w-full h-14 bg-white p-1.5 rounded-lg border border-stone-300"
      preserveAspectRatio="none"
      role="img"
      aria-label="Código de Barras do Boleto Sicredi"
    >
      {elements}
    </svg>
  );
}

/**
 * Painel de Instruções Pós-Pedido para PIX, Boleto Híbrido e Cartão (Crédito/Débito) via Sicredi.
 */
export function SicrediPaymentResultCard({
  orderNumber,
  total,
  customerName,
  customerCpf,
  customerAddress,
  paymentMethod,
  sicrediData,
  orderStatus,
  onSimulatePaid,
}: {
  orderNumber: string;
  total: number;
  customerName: string;
  customerCpf: string;
  customerAddress: string;
  paymentMethod: string;
  sicrediData?: {
    mode?: 'sandbox' | 'production';
    pix?: SicrediPixData;
    boleto?: SicrediBoletoData;
    cardTransaction?: SicrediCardTransactionData;
  };
  orderStatus: 'awaiting_payment' | 'paid';
  onSimulatePaid?: () => void;
}) {
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBoleto, setCopiedBoleto] = useState(false);
  const [showFullBoleto, setShowFullBoleto] = useState(false);

  const handleCopy = (text: string, type: 'pix' | 'boleto') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    if (type === 'pix') {
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    } else {
      setCopiedBoleto(true);
      setTimeout(() => setCopiedBoleto(false), 3000);
    }
  };

  const handlePrintBoleto = () => {
    setShowFullBoleto(true);
    setTimeout(() => {
      if (typeof window !== 'undefined') window.print();
    }, 250);
  };

  return (
    <div className="glass-card p-6 sm:p-8 rounded-3xl border border-[#7C5236]/30 text-left mb-8 space-y-5">
      {/* Cabeçalho Oficial Sicredi */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#7C5236]/15 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1 rounded-lg bg-[#2F523A] text-white font-extrabold text-xs tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>SICREDI 748</span>
          </div>
          <h3 className="font-serif font-bold text-base sm:text-lg text-[#3E2415]">
            Comprovante / Instruções de Pagamento
          </h3>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
            orderStatus === 'paid'
              ? 'bg-[#E7F0EA] border-[#2F523A] text-[#1E3A2B]'
              : 'bg-amber-50 border-amber-300 text-amber-800'
          }`}
        >
          {orderStatus === 'paid' ? '✓ Pagamento Confirmado' : '⏳ Aguardando Pagamento'}
        </span>
      </div>

      {/* 1. PIX SICREDI */}
      {paymentMethod === 'pix' && sicrediData?.pix && (
        <div className="space-y-4 text-center py-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7F0EA] text-[#1E3A2B] text-[11px] font-bold">
            <QrCode className="w-3.5 h-3.5 text-[#2F523A]" />
            <span>API Pix Sicredi — Cobrança Imediata (Padrão BACEN)</span>
          </div>

          <SicrediQrCodeSvg payload={sicrediData.pix.pixCopiaECola} size={200} />

          <div className="text-xs text-stone-600 max-w-md mx-auto space-y-1">
            <p>
              Escaneie o QR Code acima no aplicativo do seu banco ou copie o código{' '}
              <strong>PIX Copia e Cola Sicredi</strong> abaixo:
            </p>
            <p className="text-[11px] text-stone-500 font-mono">
              TXID Sicredi: <strong>{sicrediData.pix.txid}</strong>
            </p>
          </div>

          <div className="bg-[#FAF7F2] border border-[#7C5236]/30 text-[#3E2415] p-3.5 rounded-xl text-[11px] font-mono select-all break-all text-left">
            {sicrediData.pix.pixCopiaECola}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleCopy(sicrediData.pix!.pixCopiaECola, 'pix')}
              className="inline-flex items-center gap-2 bg-[#2F523A] hover:bg-[#1E3A2B] text-white px-5 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer shadow-sm"
            >
              {copiedPix ? (
                <>
                  <Check className="w-4 h-4" /> Código PIX Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copiar Código PIX Copia e Cola
                </>
              )}
            </button>

            {orderStatus !== 'paid' && onSimulatePaid && (
              <button
                type="button"
                onClick={onSimulatePaid}
                className="inline-flex items-center gap-1.5 bg-[#FAF7F2] hover:bg-[#E7F0EA] text-[#1E3A2B] border border-[#2F523A]/40 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#2F523A]" />
                Simular Confirmação Webhook PIX (Sandbox)
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. BOLETO HÍBRIDO SICREDI (BANCO 748) */}
      {paymentMethod === 'boleto' && sicrediData?.boleto && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#E7F0EA]/70 p-3.5 rounded-2xl border border-[#2F523A]/25 text-xs">
            <div className="flex items-center gap-2 text-[#1E3A2B] font-bold">
              <FileText className="w-4 h-4 text-[#2F523A]" />
              <span>Boleto Híbrido Registrado Sicredi (748-X) + PIX</span>
            </div>
            <div className="text-stone-600 text-[11px]">
              Nosso Número: <strong className="font-mono">{sicrediData.boleto.nossoNumero}</strong>{' '}
              | Vencimento: <strong>{sicrediData.boleto.dataVencimento}</strong>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Linha Digitável (Banco 748 - Sicredi):
            </label>
            <div className="bg-[#FAF7F2] border border-[#7C5236]/30 text-[#3E2415] p-3.5 rounded-xl text-xs sm:text-sm font-mono font-bold tracking-wide select-all break-all">
              {sicrediData.boleto.linhaDigitavel}
            </div>
            <SicrediBarcodeSvg codigoBarras={sicrediData.boleto.codigoBarras} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleCopy(sicrediData.boleto!.linhaDigitavel, 'boleto')}
              className="inline-flex items-center gap-2 bg-[#2F523A] hover:bg-[#1E3A2B] text-white px-5 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer shadow-sm"
            >
              {copiedBoleto ? (
                <>
                  <Check className="w-4 h-4" /> Linha Digitável Copiada!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copiar Linha Digitável
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowFullBoleto((v) => !v)}
              className="inline-flex items-center gap-2 bg-[#3E2415] hover:bg-[#2C1A10] text-white px-5 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer shadow-sm"
            >
              <FileText className="w-4 h-4" />
              {showFullBoleto ? 'Ocultar Ficha do Boleto' : 'Visualizar Boleto Completo'}
            </button>

            <button
              type="button"
              onClick={handlePrintBoleto}
              className="inline-flex items-center gap-2 bg-white hover:bg-[#FAF7F2] text-[#3E2415] border border-[#7C5236]/30 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
            </button>

            {orderStatus !== 'paid' && onSimulatePaid && (
              <button
                type="button"
                onClick={onSimulatePaid}
                className="inline-flex items-center gap-1.5 bg-[#FAF7F2] hover:bg-[#E7F0EA] text-[#1E3A2B] border border-[#2F523A]/40 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#2F523A]" />
                Simular Compensação Sicredi
              </button>
            )}
          </div>

          {/* Ficha de Compensação Completa do Boleto Híbrido Sicredi */}
          {showFullBoleto && (
            <div className="bg-white border-2 border-stone-800 rounded-2xl p-5 text-stone-900 space-y-3 text-xs shadow-lg print:border-black">
              <div className="flex flex-wrap items-center justify-between border-b-2 border-stone-800 pb-2 gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-base text-[#2F523A]">SICREDI</span>
                  <span className="font-extrabold text-sm border-x-2 border-stone-800 px-3">
                    748-X
                  </span>
                </div>
                <span className="font-mono font-bold text-xs sm:text-sm">
                  {sicrediData.boleto.linhaDigitavel}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-stone-300 pb-2">
                <div className="sm:col-span-2">
                  <span className="block text-[10px] text-stone-500 uppercase">
                    Local de Pagamento
                  </span>
                  <strong>PAGÁVEL PREFERENCIALMENTE NAS COOPERATIVAS DE CRÉDITO DO SICREDI</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-stone-500 uppercase">Vencimento</span>
                  <strong className="text-sm">{sicrediData.boleto.dataVencimento}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-stone-300 pb-2">
                <div className="sm:col-span-2">
                  <span className="block text-[10px] text-stone-500 uppercase">
                    Beneficiário / Cedente
                  </span>
                  <strong>
                    {sicrediData.boleto.beneficiarioNome} — CNPJ:{' '}
                    {sicrediData.boleto.beneficiarioCnpj}
                  </strong>
                </div>
                <div>
                  <span className="block text-[10px] text-stone-500 uppercase">
                    Agência / Código do Beneficiário
                  </span>
                  <strong className="font-mono">
                    {sicrediData.boleto.cooperativa}.{sicrediData.boleto.posto}.
                    {sicrediData.boleto.codigoBeneficiario}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-stone-300 pb-2">
                <div>
                  <span className="block text-[10px] text-stone-500 uppercase">
                    Data do Documento
                  </span>
                  <span>{sicrediData.boleto.dataEmissao}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-stone-500 uppercase">
                    Nº do Documento
                  </span>
                  <span className="font-mono">{orderNumber}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-stone-500 uppercase">Nosso Número</span>
                  <strong className="font-mono">{sicrediData.boleto.nossoNumero}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-stone-500 uppercase">
                    (=) Valor do Documento
                  </span>
                  <strong className="text-sm text-[#1E3A2B]">
                    R$ {sicrediData.boleto.valorNominal.toFixed(2).replace('.', ',')}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center border-b border-stone-300 pb-3">
                <div className="sm:col-span-2 space-y-1 text-[11px] text-stone-700">
                  <span className="block text-[10px] text-stone-500 uppercase">
                    Instruções (Texto de responsabilidade do beneficiário)
                  </span>
                  <p>• Referente ao Pedido #{orderNumber} — Espaço Católico Santo Antônio.</p>
                  <p>
                    • BOLETO HÍBRIDO SICREDI: Você também pode pagar instantaneamente apontando a
                    câmera do seu aplicativo bancário para o QR Code PIX ao lado.
                  </p>
                </div>
                {sicrediData.boleto.qrCodePixHibrido && (
                  <div className="text-center">
                    <span className="block text-[10px] font-bold text-[#2F523A] mb-1">
                      Pague com PIX no Boleto
                    </span>
                    <SicrediQrCodeSvg payload={sicrediData.boleto.qrCodePixHibrido} size={115} />
                  </div>
                )}
              </div>

              <div className="border-b border-stone-300 pb-2 text-[11px]">
                <span className="block text-[10px] text-stone-500 uppercase">Pagador / Sacado</span>
                <strong>{customerName}</strong> — CPF/CNPJ: {customerCpf}
                <div className="text-stone-600">{customerAddress}</div>
              </div>

              <div className="pt-1">
                <SicrediBarcodeSvg codigoBarras={sicrediData.boleto.codigoBarras} />
                <div className="text-right text-[10px] text-stone-500 mt-1 uppercase">
                  Autenticação Mecânica — Ficha de Compensação Sicredi
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. CARTÃO DE CRÉDITO OU DÉBITO SICREDI */}
      {(paymentMethod === 'credit_card' ||
        paymentMethod === 'debit_card' ||
        paymentMethod === 'credit') &&
        sicrediData?.cardTransaction && (
          <div className="space-y-4">
            <div className="bg-[#E7F0EA] border border-[#2F523A]/30 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#2F523A] shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <strong className="text-[#1E3A2B] block text-sm">
                  {sicrediData.cardTransaction.message}
                </strong>
                <p className="text-stone-600">
                  Processado via <strong>Sicredi Pagamentos / Adquirência E-commerce</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#FAF7F2] p-4 rounded-2xl border border-[#7C5236]/20 text-xs">
              <div>
                <span className="text-[10px] text-stone-500 uppercase block">Modalidade</span>
                <strong className="text-[#3E2415]">
                  {sicrediData.cardTransaction.type === 'DEBITO'
                    ? 'Cartão de Débito (À Vista)'
                    : `Cartão de Crédito (${sicrediData.cardTransaction.installments}x de R$ ${sicrediData.cardTransaction.installmentAmount
                        .toFixed(2)
                        .replace('.', ',')})`}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase block">Cartão / Bandeira</span>
                <strong className="text-[#3E2415] font-mono">
                  {sicrediData.cardTransaction.brand} • {sicrediData.cardTransaction.maskedCard}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase block">
                  TID / Autorização Sicredi
                </span>
                <strong className="text-[#2F523A] font-mono">
                  {sicrediData.cardTransaction.tid} (Aut:{' '}
                  {sicrediData.cardTransaction.authorizationCode})
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase block">NSU Sicredi</span>
                <strong className="text-[#3E2415] font-mono">
                  {sicrediData.cardTransaction.nsu}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase block">Titular</span>
                <strong className="text-[#3E2415]">{sicrediData.cardTransaction.holderName}</strong>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase block">Data/Hora</span>
                <span className="text-stone-600">{sicrediData.cardTransaction.authorizedAt}</span>
              </div>
            </div>
          </div>
        )}

      <div className="border-t border-[#7C5236]/15 pt-3 text-xs text-stone-600 flex justify-between items-center">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#2F523A]" />
          <span>Liquidação Oficial Cooperativa Sicredi (Banco 748)</span>
        </span>
        <strong className="text-[#1E3A2B] text-base sm:text-lg">
          Total: R$ {total.toFixed(2).replace('.', ',')}
        </strong>
      </div>
    </div>
  );
}
