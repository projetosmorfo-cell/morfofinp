/* ============================================================================
   Exportação — transcrição do Kit de Estrutura Mínima (Morfo)
   `esqueleto-morfo-v1.jsx` (7855 linhas, KIT_BUILD 2.0, arquivo desta rodada).

   Por que este arquivo existe: G44 regra 11b do Roteiro de Parametrização
   Morfo exige `ExportSheet` em TODA tela de listagem/resumo/dashboard, N0 e
   N1 — inclusive nas telas de negócio próprias do produto. Até esta rodada o
   MorfoFinP não tinha NENHUMA exportação (o nome só aparecia num comentário
   em `indicadoresKit.tsx`, sem componente por trás).

   Peças transcritas, com a linha de origem no Kit:
     L3114 bytesCP1252 · L3096 csvEscape · L3097 toCSV · L3123 exportCSV
     L3131 csvGraficos · L3236 PDF_CORES · L3237 pdfFmtValor · L3242 svgGrafico
     L3296 exportPDF · L2700 whatsappLink · L2717 EnvioCanais
     L102  RestrictionsContext · L3361 ExportSheet

   ADAPTAÇÕES (G44 regra 3), todas marcadas com "ADAPTAÇÃO" no ponto exato:
   nome do produto no cabeçalho do CSV/PDF/texto compartilhado, e tipagem
   TypeScript dos parâmetros (o Kit é `.jsx` sem tipos).
   Nada foi resumido, cortado ou "deixado pra depois".
   ========================================================================= */
import { createContext, useContext, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Download, FileText, Lock, ArrowRight, MessageCircle, Mail, Send, Share2 } from 'lucide-react'
import {
  Sheet, primaryBtn, secondaryBtn, inputStyle, alpha, fmtBRL,
  INK, TXT2, TXT3, LINE, PURPLE, BRANCO, RED, ACCENT, DEV_ACCENT,
  validaTelefone, validaEmailEnvio,
} from './kitBase'

/* ADAPTAÇÃO: o Kit escreve "MorfoMod" literal no cabeçalho do CSV/PDF e no
   texto compartilhado. Aqui é o nome deste produto — mesma posição, mesma
   forma. */
const NOME_PRODUTO = 'MorfoFinP'

/* ---- Tipos das colunas/linhas e dos gráficos (o Kit não tipa; a forma é a
   mesma usada por todos os chamadores dele) ---- */
export interface ExportColumn {
  key: string
  label: string
  value?: (linha: ExportRow) => unknown
}
export type ExportRow = Record<string, unknown>
export interface ExportGrafico {
  titulo: string
  tipo?: 'rank' | 'linha' | 'barra'
  formato?: 'brl' | 'pct' | string
  categorias: (string | number)[]
  series: { nome: string; valores: number[] }[]
}

/* ---- Kit L102: restrições por plano. `exportacaoDetalhada !== false` libera
   a "Versão detalhada"; qualquer plano que traga `false` mostra o bloco de
   upgrade no lugar. ---- */
export interface Restrictions { exportacaoDetalhada?: boolean; layoutPersonalizado?: boolean }
export const RestrictionsContext = createContext<{ restrictions: Restrictions; openUpgrade: null | (() => void) }>({ restrictions: {}, openUpgrade: null })

/* ---- Kit L3114 (item 127): CSV em WINDOWS-1252 com separador ";" — é o
   formato que o Excel brasileiro abre certo com 2 cliques. UTF-8 com BOM foi
   testado e falhou no público-alvo (leitor ANSI ignora o BOM). ---- */
function bytesCP1252(texto: string): Uint8Array<ArrayBuffer> {
  const extra: Record<string, number> = { '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135, 'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159 }
  const out = new Uint8Array(new ArrayBuffer(texto.length))
  for (let i = 0; i < texto.length; i++) {
    const c = texto.codePointAt(i) as number
    out[i] = c <= 0xFF ? c : (extra[texto[i]] || 63) /* fora da tabela → "?" */
  }
  return out
}

/* ---- Kit L3096-L3102 ---- */
function csvEscape(v: unknown) { return `"${String(v ?? '').replace(/"/g, '""')}"` }
function toCSV(rows: ExportRow[], columns: ExportColumn[]) {
  /* separador ";" — padrão do Excel pt-BR (com "," ele joga a linha inteira numa célula só) */
  const header = columns.map(c => csvEscape(c.label)).join(';')
  const lines = rows.map(r => columns.map(c => csvEscape(typeof c.value === 'function' ? c.value(r) : r[c.key])).join(';'))
  return [header, ...lines].join('\r\n')
}

/* ---- Kit L3123 ---- */
export function exportCSV(filenameBase: string, rows: ExportRow[], columns: ExportColumn[], extraTexto?: string) {
  const conteudo = toCSV(rows, columns) + (extraTexto ? '\r\n\r\n' + extraTexto : '')
  const blob = new Blob([bytesCP1252(conteudo)], { type: 'text/csv;charset=windows-1252;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `${filenameBase}.csv`; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/* ---- Kit L3131: dados dos gráficos como seções extras no CSV detalhado ---- */
export function csvGraficos(graficos?: ExportGrafico[] | null) {
  if (!graficos || !graficos.length) return ''
  return graficos.map(g => {
    const head = ['Categoria', ...g.series.map(s => csvEscape(s.nome))].join(';')
    const linhas = g.categorias.map((cat, i) => [csvEscape(cat), ...g.series.map(s => String(Math.round((s.valores[i] || 0) * 100) / 100))].join(';'))
    return [`Gráfico: ${csvEscape(g.titulo)}`, head, ...linhas].join('\r\n')
  }).join('\r\n\r\n')
}

/* ---- Kit L3236-L3241 ---- */
const PDF_CORES = ['#7C5CD6', '#2E9E5B', '#C98A1B', '#3A78C2', '#D64545', '#8B8579']
function pdfFmtValor(v: number, formato?: string) {
  if (formato === 'brl') return fmtBRL(v)
  if (formato === 'pct') return `${(Math.round(v * 10) / 10)}%`
  return String(Math.round(v * 100) / 100)
}

/* ---- Kit L3242: gráfico desenhado em SVG puro pro PDF ---- */
function svgGrafico(g: ExportGrafico) {
  const W = 680, H = 230, PADL = 10, PADR = 10, PADT = 14, PADB = 34
  const esc = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const todos = g.series.flatMap(s => s.valores.map(v => v || 0))
  if (!todos.length || !g.categorias.length) return `<div style="font-size:11px;color:#8B8579">Sem dados pra este gráfico.</div>`
  const min = Math.min(0, ...todos), max = Math.max(0, ...todos, 1)
  const plotW = W - PADL - PADR, plotH = H - PADT - PADB
  const y = (v: number) => PADT + plotH - ((v - min) / (max - min)) * plotH
  const zeroY = y(0)
  let corpo = `<line x1="${PADL}" y1="${zeroY}" x2="${W - PADR}" y2="${zeroY}" stroke="#D8D4CC" stroke-width="1"/>`
  const n = g.categorias.length
  const rank = g.tipo === 'rank'
  if (rank) {
    /* barras horizontais com rótulo e valor — mesmo formato do app */
    const rowH = 30, HH = n * rowH + 10
    const maxV = Math.max(...todos, 1)
    let linhas = ''
    g.categorias.forEach((cat, i) => {
      const v = g.series[0].valores[i] || 0
      const bw = Math.max(3, (v / maxV) * (W - 260))
      const yy = 6 + i * rowH
      linhas += `<text x="0" y="${yy + 13}" font-size="11" fill="#1C1B22" font-weight="600">${esc(String(cat).slice(0, 28))}</text>
        <rect x="200" y="${yy + 3}" width="${bw}" height="13" rx="4" fill="${PDF_CORES[0]}"/>
        <text x="${205 + bw}" y="${yy + 14}" font-size="10.5" fill="#6B6558">${esc(pdfFmtValor(v, g.formato))}</text>`
    })
    return `<svg width="${W}" height="${HH}" viewBox="0 0 ${W} ${HH}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,'Segoe UI',Roboto,sans-serif">${linhas}</svg>`
  }
  if (g.tipo === 'linha') {
    const s = g.series[0]
    const x = (i: number) => PADL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
    const pts = s.valores.map((v, i) => `${x(i)},${y(v || 0)}`).join(' ')
    corpo += `<polyline points="${pts}" fill="none" stroke="${PDF_CORES[0]}" stroke-width="2" stroke-linejoin="round"/>`
    s.valores.forEach((v, i) => { corpo += `<circle cx="${x(i)}" cy="${y(v || 0)}" r="2.6" fill="${PDF_CORES[0]}"/>` })
    const passo = Math.max(1, Math.ceil(n / 12))
    g.categorias.forEach((cat, i) => { if (i % passo === 0 || i === n - 1) corpo += `<text x="${x(i)}" y="${H - 16}" font-size="9.5" fill="#8B8579" text-anchor="middle">${esc(String(cat).slice(0, 9))}</text>` })
    corpo += `<text x="${PADL}" y="${PADT - 3}" font-size="9.5" fill="#8B8579">máx ${esc(pdfFmtValor(max, g.formato))}</text>`
  } else {
    /* barras (1 série) ou grupos (N séries), verticais, com gap de 2px entre barras */
    const grupoW = plotW / n, k = g.series.length
    const barW = Math.max(3, Math.min(34, (grupoW - 8) / k - 2))
    g.categorias.forEach((cat, i) => {
      g.series.forEach((s, si) => {
        const v = s.valores[i] || 0
        const bx = PADL + i * grupoW + (grupoW - (barW + 2) * k) / 2 + si * (barW + 2)
        const y1 = Math.min(y(v), zeroY), hh = Math.max(1.5, Math.abs(y(v) - zeroY))
        corpo += `<rect x="${bx}" y="${y1}" width="${barW}" height="${hh}" rx="3" fill="${v < 0 ? '#D64545' : PDF_CORES[si % PDF_CORES.length]}"/>`
      })
      const passo = Math.max(1, Math.ceil(n / 12))
      if (i % passo === 0 || i === n - 1) corpo += `<text x="${PADL + i * grupoW + grupoW / 2}" y="${H - 16}" font-size="9.5" fill="#8B8579" text-anchor="middle">${esc(String(cat).slice(0, 12))}</text>`
    })
    corpo += `<text x="${PADL}" y="${PADT - 3}" font-size="9.5" fill="#8B8579">máx ${esc(pdfFmtValor(max, g.formato))}</text>`
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,'Segoe UI',Roboto,sans-serif">${corpo}</svg>`
}

/* ---- Kit L3296: "PDF" = HTML numa aba nova + print() do navegador. Sem
   backend não existe gerador de PDF de verdade; esta é a saída honesta, e é a
   mesma do Kit. ---- */
export function exportPDF(title: string, rows: ExportRow[], columns: ExportColumn[], graficos?: ExportGrafico[] | null) {
  const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const style = `<style>
    body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;padding:28px;color:#1C1B22}
    h1{font-size:18px;margin:0 0 2px}
    h2{font-size:13px;margin:22px 0 6px}
    .sub{color:#8B8579;font-size:11.5px;margin-bottom:18px}
    table{width:100%;border-collapse:collapse;font-size:11.5px}
    th,td{border:1px solid #E7E3DC;padding:6px 9px;text-align:left;vertical-align:top}
    th{background:#F7F5F2;font-weight:700}
    tr:nth-child(even) td{background:#FAFAF7}
    .leg{font-size:10.5px;color:#6B6558;margin:2px 0 6px}
    .leg span{display:inline-block;width:9px;height:9px;border-radius:2px;margin:0 4px 0 10px;vertical-align:middle}
    .graf{page-break-inside:avoid;margin-bottom:6px}
    @media print{ body{padding:10mm} }
  </style>`
  const head = columns.map(c => `<th>${esc(c.label)}</th>`).join('')
  const body = rows.map(r => `<tr>${columns.map(c => `<td>${esc((typeof c.value === 'function' ? c.value(r) : r[c.key]) ?? '')}</td>`).join('')}</tr>`).join('')
  let grafHtml = ''
  if (graficos && graficos.length) {
    grafHtml = `<h2 style="margin-top:26px">Gráficos</h2>` + graficos.map(g => {
      const legenda = g.series.length > 1 ? `<div class="leg">${g.series.map((s, i) => `<span style="background:${PDF_CORES[i % PDF_CORES.length]}"></span>${esc(s.nome)}`).join('')}</div>` : ''
      return `<div class="graf"><h2>${esc(g.titulo)}</h2>${legenda}${svgGrafico(g)}</div>`
    }).join('')
  }
  /* ADAPTAÇÃO: NOME_PRODUTO no lugar do "MorfoMod" literal do Kit. */
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><title>${esc(title)}</title>${style}</head><body>
    <h1>${esc(title)}</h1><div class="sub">${NOME_PRODUTO} · gerado em ${new Date().toLocaleString('pt-BR')} · ${rows.length} registro(s)</div>
    <table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${columns.length}">Nenhum registro</td></tr>`}</tbody></table>
    ${grafHtml}
  </body></html>`
  const blob = new Blob([typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(html) : html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (!win) { URL.revokeObjectURL(url); return }
  setTimeout(() => { try { win.focus(); win.print() } catch { /* aba fechada pelo usuário antes do print */ } }, 500)
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

/* ---- Kit L2700 ---- */
function whatsappLink(phone: string, text: string) {
  const digits = String(phone || '').replace(/\D/g, '')
  const full = digits.length > 0 && !digits.startsWith('55') ? `55${digits}` : digits
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

/* ---- Kit L2717: envio padronizado. TODO ponto de envio/compartilhamento usa
   este componente — três canais (WhatsApp, e-mail, compartilhamento nativo),
   telefone/e-mail já preenchidos do cadastro e editáveis SÓ pra este envio.
   ADAPTAÇÃO: o Kit também gera PDF quando `documentoTitulo` vem preenchido
   (cobrança/recibo/contrato — documentos que não existem neste produto); o
   parâmetro foi mantido com o mesmo nome e a mesma semântica, e o gerador de
   documento é o próprio `exportPDF` de texto simples abaixo. ---- */
function gerarPDFDocumento(titulo: string, textoCompleto: string, subtitulo?: string) {
  const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const paragrafos = String(textoCompleto || '').split('\n').map(l => l.trim() ? `<p>${esc(l)}</p>` : `<br/>`).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><title>${esc(titulo)}</title>
    <style>
      body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;padding:32px;color:#1C1B22;max-width:680px;margin:0 auto}
      h1{font-size:19px;margin:0 0 2px}
      .sub{color:#8B8579;font-size:11.5px;margin-bottom:22px}
      p{font-size:13px;line-height:1.7;margin:0 0 4px}
      @media print{ body{padding:10mm} }
    </style></head><body>
    <h1>${esc(titulo)}</h1><div class="sub">${NOME_PRODUTO}${subtitulo ? ' · ' + esc(subtitulo) : ''} · gerado em ${new Date().toLocaleString('pt-BR')}</div>
    ${paragrafos}
  </body></html>`
  const blob = new Blob([typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(html) : html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (!win) { URL.revokeObjectURL(url); return false }
  setTimeout(() => { try { win.focus(); win.print() } catch { /* aba fechada antes do print */ } }, 500)
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  return true
}

export function EnvioCanais({ texto, telefone, email, dark, notify, onContato, compacto, documentoTitulo }: {
  texto: string; telefone?: string; email?: string; dark?: boolean
  notify?: (m: string) => void; onContato?: (c: { phone?: string; email?: string }) => void
  compacto?: boolean; documentoTitulo?: string
}) {
  const [canal, setCanal] = useState<null | 'whats' | 'email'>(null)
  const [tel, setTel] = useState(telefone || '')
  const [mail, setMail] = useState(email || '')
  useEffect(() => { setTel(telefone || '') }, [telefone])
  useEffect(() => { setMail(email || '') }, [email])
  /* mesma validação/máscara dos cadastros — telefone com DDD e e-mail válidos */
  const telOk = !!tel.trim() && validaTelefone(tel)
  const mailOk = validaEmailEnvio(mail)
  const bordaBase = dark ? 'rgba(255,255,255,0.14)' : LINE
  const btn: CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '11px 6px', borderRadius: 12, border: `1.5px solid ${bordaBase}`, background: dark ? 'rgba(255,255,255,0.05)' : BRANCO, cursor: 'pointer', fontSize: 11, fontWeight: 700, color: dark ? '#C9C4D4' : TXT2 }
  const enviarWhats = () => { if (!telOk) { notify?.('Telefone inválido (use DDD + número)'); return } if (documentoTitulo) gerarPDFDocumento(documentoTitulo, texto); window.open(whatsappLink(tel, texto), '_blank'); onContato?.({ phone: tel }); notify?.(documentoTitulo ? 'PDF gerado — abrindo WhatsApp, anexe o PDF na conversa' : 'Abrindo WhatsApp…'); setCanal(null) }
  const enviarEmail = () => { if (!validaEmailEnvio(mail)) { notify?.('E-mail inválido'); return } if (documentoTitulo) gerarPDFDocumento(documentoTitulo, texto); window.open(`mailto:${encodeURIComponent(mail.trim())}?subject=${encodeURIComponent(NOME_PRODUTO)}&body=${encodeURIComponent(texto)}`, '_blank'); onContato?.({ email: mail.trim() }); notify?.(documentoTitulo ? 'PDF gerado — abrindo e-mail, anexe o PDF na mensagem' : 'Abrindo e-mail…'); setCanal(null) }
  /* botão único de compartilhar nativo (Web Share API); só cai no fluxo de
     telefone/e-mail dedicados em navegador sem `navigator.share` (desktop). */
  const temShareNativo = typeof navigator !== 'undefined' && !!navigator.share
  const compartilhar = async () => {
    if (documentoTitulo) gerarPDFDocumento(documentoTitulo, texto)
    try { await navigator.share({ title: documentoTitulo || NOME_PRODUTO, text: texto }); onContato?.({}); notify?.(documentoTitulo ? 'PDF gerado — escolha o app pra anexar e enviar' : 'Compartilhado') }
    catch { /* usuário cancelou o seletor nativo — sem erro pra mostrar */ }
  }
  return <div style={{ marginTop: compacto ? 8 : 12 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: dark ? '#9B96A8' : TXT3, margin: '0 2px 6px' }}>Enviar por</div>
    {temShareNativo ? <button onClick={compartilhar} style={{ ...primaryBtn, width: '100%' }}><Share2 size={16} /> Compartilhar</button> : <>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setCanal(c => c === 'whats' ? null : 'whats')} style={{ ...btn, border: `1.5px solid ${canal === 'whats' ? '#25D366' : bordaBase}`, background: canal === 'whats' ? alpha('#25D366', 9) : btn.background }}><MessageCircle size={17} color="#25D366" /> WhatsApp</button>
        <button onClick={() => setCanal(c => c === 'email' ? null : 'email')} style={{ ...btn, border: `1.5px solid ${canal === 'email' ? ACCENT : bordaBase}`, background: canal === 'email' ? alpha(ACCENT, 9) : btn.background }}><Mail size={17} color={dark ? DEV_ACCENT : PURPLE} /> E-mail</button>
      </div>
      {canal === 'whats' && <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="(11) 90000-0000" value={tel} onChange={e => setTel(e.target.value)} />
          <button onClick={enviarWhats} disabled={!telOk} style={{ ...primaryBtn, background: '#25D366', padding: '0 16px', opacity: telOk ? 1 : 0.45 }}><Send size={15} /></button>
        </div>
        {tel.trim() && !telOk && <p style={{ fontSize: 10.5, color: RED, fontWeight: 700, margin: '5px 2px 0' }}>Telefone inválido (use DDD + número)</p>}
        {telefone && <p style={{ fontSize: 10.5, color: dark ? '#9B96A8' : TXT3, margin: '5px 2px 0' }}>Telefone do cadastro — pode alterar só pra este envio.</p>}
      </div>}
      {canal === 'email' && <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...inputStyle, flex: 1 }} type="email" placeholder="destino@email.com" value={mail} onChange={e => setMail(e.target.value)} />
          <button onClick={enviarEmail} disabled={!mailOk} style={{ ...primaryBtn, padding: '0 16px', opacity: mailOk ? 1 : 0.45 }}><Send size={15} /></button>
        </div>
        {mail.trim() && !mailOk && <p style={{ fontSize: 10.5, color: RED, fontWeight: 700, margin: '5px 2px 0' }}>E-mail inválido</p>}
        {email && <p style={{ fontSize: 10.5, color: dark ? '#9B96A8' : TXT3, margin: '5px 2px 0' }}>E-mail do cadastro — pode alterar só pra este envio.</p>}
      </div>}
    </>}
  </div>
}

/* ---- Kit L3361: a folha de exportação em si. Dois níveis ("Visão da tela" e
   "Versão detalhada"), CSV e PDF em cada, mais o envio pelos canais. ---- */
export function ExportSheet({ title, filenameBase, screenColumns, screenRows, detailColumns, detailRows, onClose, dark, contato, graficos }: {
  title: string; filenameBase: string
  screenColumns: ExportColumn[]; screenRows: ExportRow[]
  detailColumns: ExportColumn[]; detailRows: ExportRow[]
  onClose: () => void; dark?: boolean
  contato?: { phone?: string; email?: string }
  graficos?: ExportGrafico[] | null
}) {
  /* premissa de envio do Kit: toda exportação também compartilha por
     WhatsApp/E-mail/apps do celular. O conteúdo compartilhado é o resumo em
     texto (a "visão da tela") — anexar arquivo de verdade depende de
     infraestrutura real; aqui vai o dado, não o arquivo. */
  const resumoTexto = () => {
    const linhas = (screenRows || []).slice(0, 30).map(r => (screenColumns || []).map(c => `${c.label}: ${typeof c.value === 'function' ? c.value(r) : r[c.key]}`).join(' · '))
    return `${NOME_PRODUTO} — ${title}\n` + linhas.join('\n')
  }
  const { restrictions, openUpgrade } = useContext(RestrictionsContext)
  const detalhadaLiberada = restrictions?.exportacaoDetalhada !== false
  const row = (label: string, hint: string, cols: ExportColumn[], rows: ExportRow[]) => {
    const detalhada = label === 'Versão detalhada'
    return <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: dark ? '#fff' : INK, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: dark ? '#9B96A8' : TXT3, marginBottom: 10 }}>{hint}{detalhada && graficos?.length ? ' Inclui os dados de todos os gráficos da tela (e os gráficos desenhados, no PDF).' : ''}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => exportCSV(filenameBase + (detalhada ? '-detalhado' : ''), rows, cols, detalhada ? csvGraficos(graficos) : '')} style={dark ? { ...secondaryBtn, flex: 1, background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none' } : { ...secondaryBtn, flex: 1 }}><Download size={15} /> CSV</button>
        <button onClick={() => exportPDF(title + (detalhada ? ' (detalhado)' : ''), rows, cols, detalhada ? graficos : null)} style={dark ? { ...secondaryBtn, flex: 1, background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none' } : { ...secondaryBtn, flex: 1 }}><FileText size={15} /> PDF</button>
      </div>
    </div>
  }
  return <Sheet title={`Exportar — ${title}`} onClose={onClose} dark={dark}>
    <p style={{ fontSize: 12, color: dark ? '#9B96A8' : TXT3, marginTop: 0, marginBottom: 16 }}>Exporta o que está sendo exibido agora (respeitando filtro e busca aplicados).</p>
    {row('Visão da tela', 'Só os dados já visíveis na lista.', screenColumns, screenRows)}
    {detalhadaLiberada ? row('Versão detalhada', 'Inclui dados completos de cada registro, além do que aparece na tela.', detailColumns, detailRows)
      : <div style={{ background: alpha(PURPLE, 3.9), border: `1px solid ${alpha(PURPLE, 20)}`, borderRadius: 12, padding: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: PURPLE, fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}><Lock size={15} /> Exportação detalhada não incluída</div>
        <p style={{ fontSize: 12.5, color: dark ? '#fff' : INK, margin: '0 0 10px', lineHeight: 1.5 }}>A versão com todos os dados completos de cada registro é um recurso de planos superiores.</p>
        {openUpgrade && <button onClick={() => { onClose(); openUpgrade() }} style={{ ...secondaryBtn, width: '100%', background: dark ? 'transparent' : BRANCO, borderColor: PURPLE, color: PURPLE }}><ArrowRight size={15} /> Ver planos disponíveis</button>}
      </div>}
    <div style={{ borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : LINE}`, marginTop: 4, paddingTop: 2 }}>
      <EnvioCanais dark={dark} texto={resumoTexto()} telefone={contato?.phone} email={contato?.email} compacto />
    </div>
  </Sheet>
}
