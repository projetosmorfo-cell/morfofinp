import { useState } from 'react'
import { Segmented, fmtBRL, DEV_ACCENT, GREEN, AMBER, RED } from './kitBase'
import { ExportSheet } from './ExportSheet'
import { IconesDeTela } from './TopoIcones'
import { KpiCard, VizCard, VizLine, VizGroupedBars, VizRankBars, VizWaterfall, MiniBarChart, VIZ_DARK } from './viz'
import {
  usePlatformN0, todayISO, daysUntil, addDays, monthsRangeLabels,
  instCobravel, installmentDisplayStatus, tenantCanceledExpired,
  filtrarTenantsPorDados,
  type FiltroDados,
  type TenantKit,
} from './kitPlatform'

// Tela de Indicadores do N0 — porte literal de `IndicadoresDevScreen` do Kit
// (`esqueleto-morfo-v1.jsx` L6239-L6398) — Roteiro de Parametrização Morfo,
// ponto 2 da rodada de 10/09/2026 (achado real: o N0 da MorfoFinP nunca
// teve essa tela, só 5 abas sem "Indicadores"). Usa a MESMA plataforma
// (`usePlatformN0`, `src/kit/kitPlatform.ts`, Decisão 53) que Tenants/
// Financeiro/Auditoria já passaram a consumir nesta rodada — um só tenant
// fictício em todo o N0, nunca dois conjuntos divergentes.
//
// CORREÇÃO desta rodada (item 10 do CONTRATO: valor a valor, e item 9: nada
// de tela de fachada). Aqui existia um `ResumoExportavelSheet` próprio, com a
// justificativa de que o `ExportSheet` do Kit "depende de backend" — o que é
// FALSO: ele baixa CSV por Blob, gera PDF pela impressão do navegador e envia
// por link `wa.me`/`mailto`, tudo 100% no cliente. Substituído pelo
// `ExportSheet` de verdade (`src/kit/ExportSheet.tsx`), igual às demais telas.

function TopoIndicadores({ onExport }: { onExport: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
      <h2 style={{ fontSize: 17, margin: 0, color: '#fff' }}>Indicadores</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconesDeTela dark onExportar={onExport} />
      </div>
    </div>
  )
}

// tenant "bloqueado" pra fins de MRR ativo = cancelamento já expirado (Kit
// L6246 usa `tenantBlocked`, que no Kit também cobre trial vencido/bloqueio
// manual — aqui restrito ao que realmente zera cobrança: cancelamento
// vencido. Um trial nunca soma MRR de qualquer forma, `plan==='pagante'` já
// filtra isso; bloqueio manual continua contando como MRR ativo, igual ao
// Kit, que só o exclui via `tenantBlocked` na tela de Tenants, não aqui).
function tenantMrrAtivo(t: TenantKit): boolean {
  return t.plan === 'pagante' && !tenantCanceledExpired(t)
}

export default function IndicadoresDevScreen({ filtroDados }: { filtroDados: FiltroDados }) {
  const [exportOpen, setExportOpen] = useState(false)
  const [aba, setAba] = useState<'assinaturas' | 'receita' | 'carteira'>('assinaturas')

  const { tenants: todosTenants, defaultParams: _dp } = usePlatformN0()
  const tenants = filtrarTenantsPorDados(todosTenants, filtroDados)
  const pagantes = tenants.filter(tenantMrrAtivo)
  const mrr = pagantes.reduce((s, t) => s + (t.billing?.monthlyValue || 0), 0)
  const arr = mrr * 12
  const encerrando = tenants.filter((t) => t.cancellation?.accessUntil)
  const encerrando30 = encerrando.filter((t) => (daysUntil(t.cancellation!.accessUntil) ?? 999) <= 30)
  const trialsAtivos = tenants.filter((t) => t.plan === 'trial' && t.trial)
  const trialsVencendo = trialsAtivos.filter((t) => (daysUntil(addDays(t.trial!.startDate, t.trial!.days)) ?? 999) <= 7)
  const meses = monthsRangeLabels(6)
  const meses12 = monthsRangeLabels(12)
  const porMes = meses.map((m) => ({ label: m.label, value: tenants.filter((t) => (t.createdAt || '').slice(0, 7) === m.key).length }))
  const ultimos3 = porMes.slice(-4, -1)
  const mediaMensal = ultimos3.length ? Math.round((ultimos3.reduce((s, m) => s + m.value, 0) / ultimos3.length) * 10) / 10 : 0

  const arpa = pagantes.length ? mrr / pagantes.length : 0
  const baseInicio = pagantes.length + encerrando.length
  const churnLogo = baseInicio ? (encerrando.length / baseInicio) * 100 : 0
  const mrrPerdido = encerrando.reduce((s, t) => s + (t.billing?.monthlyValue || 0), 0)
  const churnReceita = (mrr + mrrPerdido) ? (mrrPerdido / (mrr + mrrPerdido)) * 100 : 0

  const mesAtual = todayISO().slice(0, 7)
  const novosMes = tenants.filter((t) => (t.createdAt || '').slice(0, 7) === mesAtual && t.plan === 'pagante')
  const mrrNovo = novosMes.reduce((s, t) => s + (t.billing?.monthlyValue || 0), 0)
  const mrrChurn = encerrando.filter((t) => (t.cancellation?.accessUntil || '').slice(0, 7) === mesAtual).reduce((s, t) => s + (t.billing?.monthlyValue || 0), 0)
  const mrrInicio = Math.max(0, mrr - mrrNovo + mrrChurn)
  const quickRatio = mrrChurn > 0 ? mrrNovo / mrrChurn : (mrrNovo > 0 ? 99 : 0)
  const nrr = mrrInicio ? ((mrrInicio - mrrChurn) / mrrInicio) * 100 : 100
  const taxaConversao = (trialsAtivos.length + pagantes.length) ? (pagantes.length / (trialsAtivos.length + pagantes.length)) * 100 : 0

  const serieMrr = meses12.map((m) => {
    const value = Math.round(tenants.filter((t) => t.plan === 'pagante' && (t.createdAt || '') <= `${m.key}-28`).reduce((s, t) => s + (t.billing?.monthlyValue || 0), 0))
    return { label: m.label, value, display: fmtBRL(value) }
  })

  const recebidoMes = tenants.flatMap((t) => t.billing?.installments || []).filter((i) => i.paid && (i.paidDate || '').slice(0, 7) === mesAtual).reduce((s, i) => s + i.amount, 0)
  const inadimp = tenants.flatMap((t) => t.billing?.installments || []).filter((i) => instCobravel(i) && installmentDisplayStatus(i) === 'vencido').reduce((s, i) => s + i.amount, 0)

  const topClientes = pagantes.map((t) => ({ label: t.companyName, value: t.billing?.monthlyValue || 0 })).sort((a, b) => b.value - a.value).slice(0, 5)
  // Kit agrupa por `plans.find(planId)`; a MorfoFinP não migrou planoId de
  // tenant fictício pra `planos` real (o Kit também não tem plano cadastrado
  // pra esses 3 tenants demo — `planId: null` em todos, ver `gerarPlatformN0`)
  // — cai em "Sem plano" pros 3, igual aconteceria rodando o Kit com esses
  // mesmos dados.
  const porPlanoMap = new Map<string, number>()
  pagantes.forEach((t) => {
    const nome = t.planId || 'Sem plano'
    porPlanoMap.set(nome, (porPlanoMap.get(nome) || 0) + (t.billing?.monthlyValue || 0))
  })
  const porPlano = [...porPlanoMap.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)

  const linhasResumo = [
    { label: 'MRR', valor: fmtBRL(mrr) }, { label: 'ARR', valor: fmtBRL(arr) },
    { label: 'ARPA', valor: fmtBRL(arpa) }, { label: 'NRR', valor: `${nrr.toFixed(1)}%` },
    { label: 'Quick ratio', valor: quickRatio >= 99 ? 'sem cancelamentos' : quickRatio.toFixed(2) },
    { label: 'Churn de clientes', valor: `${churnLogo.toFixed(1)}%` }, { label: 'Churn de receita', valor: `${churnReceita.toFixed(1)}%` },
    { label: 'Conversão de teste', valor: `${taxaConversao.toFixed(1)}%` },
    { label: 'Trials vencendo (7d)', valor: String(trialsVencendo.length) }, { label: 'Encerrando em 30d', valor: String(encerrando30.length) },
    { label: 'Média de novos ambientes/mês', valor: String(mediaMensal) },
  ]

  return (
    <div>
      <TopoIndicadores onExport={() => setExportOpen(true)} />
      <div style={{ padding: '4px 0' }}>
        <Segmented value={aba} onChange={setAba} options={[{ value: 'assinaturas', label: 'Assinaturas' }, { value: 'receita', label: 'Receita' }, { value: 'carteira', label: 'Carteira' }]} />
      </div>

      {aba === 'assinaturas' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '10px 0' }}>
            <KpiCard dark info="Receita recorrente mensal: soma das mensalidades dos clientes pagantes ativos. O batimento cardíaco de um negócio por assinatura." label="MRR" value={fmtBRL(mrr)} sub="receita recorrente/mês" color="#fff" />
            <KpiCard dark info="Receita recorrente anualizada: MRR × 12. É o número usado pra avaliar o tamanho de um SaaS." label="ARR" value={fmtBRL(arr)} sub="projeção anual" color={DEV_ACCENT} />
            <KpiCard dark info="Receita média por conta: MRR ÷ clientes pagantes. Subir ARPA (planos maiores) cresce a receita sem precisar de cliente novo." label="ARPA" value={fmtBRL(arpa)} sub="média por cliente" color={DEV_ACCENT} />
            <KpiCard dark info="Retenção líquida de receita da base existente. Acima de 100%, a base cresce sozinha (upgrades superam cancelamentos); abaixo de 90%, o balde está furado." label="NRR" value={`${nrr.toFixed(0)}%`} sub="retenção de receita" color={nrr >= 100 ? GREEN : nrr >= 90 ? AMBER : RED} />
          </div>
          <VizCard dark info="Cascata do MRR: decompõe a variação do mês em entradas (novos, expansão) e saídas (contração, cancelados). Um MRR estável pode esconder entrada e saída grandes se anulando." title="De onde veio a variação do MRR" hint="O MRR pode ficar parado escondendo entrada e saída grandes ao mesmo tempo. A cascata mostra o que somou e o que subtraiu no mês.">
            <VizWaterfall dark inicio={mrrInicio} fim={mrr} fmt={fmtBRL}
              passos={[{ label: 'Novos', value: mrrNovo }, { label: 'Expansão', value: 0 }, { label: 'Contração', value: 0 }, { label: 'Cancelados', value: -mrrChurn }]} />
            <p style={{ fontSize: 10.5, color: '#9B96A8', margin: '8px 0 0', lineHeight: 1.45 }}>Expansão e contração aparecem zeradas porque o sistema ainda não guarda o histórico mês a mês de troca de plano — está registrado como pendência, não como resultado.</p>
          </VizCard>
          <VizCard dark info="Evolução da receita recorrente. O formato da curva importa: crescimento acelerando, linear ou achatando contam três histórias diferentes." title="MRR ao longo do tempo" hint="Evolução da receita recorrente nos últimos 12 meses.">
            <VizLine dark data={serieMrr} color={VIZ_DARK[0]} />
          </VizCard>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <KpiCard dark info="MRR que entrou ÷ MRR que saiu no mês. Acima de 4 é considerado saudável pra SaaS em crescimento." label="Quick ratio" value={quickRatio >= 99 ? '∞' : quickRatio.toFixed(1)} sub="entrou ÷ saiu (ideal ≥4)" color={quickRatio >= 4 ? GREEN : AMBER} />
            <KpiCard dark info="Quantos ambientes de teste viraram pagantes, sobre o total. Mede a eficácia do produto em se vender sozinho durante o trial." label="Conversão de teste" value={`${taxaConversao.toFixed(0)}%`} sub="teste → pagante" color={DEV_ACCENT} />
          </div>
        </>
      )}

      {aba === 'receita' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '10px 0' }}>
            <KpiCard dark info="Pagamentos de assinatura confirmados dentro do mês corrente." label="Recebido no mês" value={fmtBRL(recebidoMes)} sub="confirmado" color={GREEN} />
            <KpiCard dark info="Parcelas de assinatura vencidas e não pagas — dinheiro a recuperar via cobrança." label="Vencido" value={fmtBRL(inadimp)} sub="a recuperar" color={inadimp > 0 ? RED : GREEN} />
          </div>
          <VizCard dark info="Quanto cada plano contribui pro MRR. Mostra de qual faixa de preço a receita realmente depende." title="Receita por plano" hint="Quanto cada plano representa do MRR — mostra de qual faixa a receita realmente depende.">
            <VizRankBars dark data={porPlano} color={VIZ_DARK[2]} fmt={fmtBRL} emptyHint="Nenhum cliente pagante ainda." />
          </VizCard>
          <VizCard dark info="As maiores mensalidades da carteira. Quanto mais o topo pesa, maior o dano se um único cliente sair." title="Maiores contas" hint="Concentração da carteira. Quanto mais o topo pesa, maior o risco de perder um cliente só.">
            <VizRankBars dark data={topClientes} color={VIZ_DARK[3]} fmt={fmtBRL} emptyHint="Nenhum cliente pagante ainda." />
          </VizCard>
        </>
      )}

      {aba === 'carteira' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '10px 0' }}>
            <KpiCard dark info="Percentual de clientes que cancelaram sobre a base. Mede a perda em QUANTIDADE de logotipos, sem olhar o tamanho de cada um." label="Churn de clientes" value={`${churnLogo.toFixed(0)}%`} sub="quantidade" color={churnLogo > 15 ? RED : GREEN} />
            <KpiCard dark info="Percentual do MRR perdido com cancelamentos. Se for bem maior que o churn de clientes, você está perdendo as contas grandes." label="Churn de receita" value={`${churnReceita.toFixed(0)}%`} sub="valor" color={churnReceita > 15 ? RED : GREEN} />
            <KpiCard dark info="Ambientes de teste que expiram na semana. Cada um é uma conversa de conversão a fazer AGORA." label="Trials vencendo (7d)" value={String(trialsVencendo.length)} sub="oportunidade" color={trialsVencendo.length ? AMBER : GREEN} />
            <KpiCard dark info="Assinaturas com encerramento marcado pros próximos 30 dias — a última janela pra reverter o churn." label="Encerrando em 30d" value={String(encerrando30.length)} sub="risco de churn" color={encerrando30.length ? RED : GREEN} />
          </div>
          <VizCard dark info="Compara o churn contado em clientes com o churn contado em dinheiro. A diferença entre os dois revela o TAMANHO dos clientes que estão saindo." title="Clientes por quantidade x por receita" hint="Se o churn de receita for bem maior que o de clientes, você está perdendo as contas grandes — e o contrário também vale.">
            <VizGroupedBars dark data={[{ label: 'churn', qtd: Math.round(churnLogo), rec: Math.round(churnReceita) }]} series={[{ key: 'qtd', label: 'Churn de clientes (%)' }, { key: 'rec', label: 'Churn de receita (%)' }]} height={90} fmt={(v) => `${v}%`} />
          </VizCard>
          <VizCard dark info="Ambientes novos criados por mês — o funil de entrada do SaaS." title="Novos ambientes por mês" hint="Volume de clientes novos nos últimos 6 meses.">
            <MiniBarChart dark data={porMes} color={DEV_ACCENT} />
          </VizCard>
          <VizCard dark info="Projeção simples: a média de novos ambientes dos últimos 3 meses completos, mantida constante pros próximos 3. Não considera sazonalidade — é referência, não promessa." title="Prospecção · projeção pela média histórica">
            <p style={{ fontSize: 12.5, color: '#C9C4D4', lineHeight: 1.6, margin: 0 }}>Média de <strong>{mediaMensal}</strong> novo(s) ambiente(s) por mês nos últimos 3 meses completos. Mantendo o ritmo, a projeção pros próximos 3 meses é de aproximadamente <strong>{Math.round(mediaMensal * 3)}</strong>.</p>
          </VizCard>
        </>
      )}

      {exportOpen && <ExportSheet dark title="Indicadores" filenameBase="morfofinp-n0-indicadores"
        screenColumns={[{ key: 'label', label: 'Indicador' }, { key: 'valor', label: 'Valor' }]}
        screenRows={linhasResumo}
        detailColumns={[{ key: 'label', label: 'Indicador' }, { key: 'valor', label: 'Valor' }]}
        detailRows={linhasResumo}
        graficos={[
          { titulo: 'MRR (12 meses)', tipo: 'linha', formato: 'brl', categorias: serieMrr.map((m) => m.label), series: [{ nome: 'MRR', valores: serieMrr.map((m) => m.value) }] },
          { titulo: 'Novos ambientes por mês', tipo: 'barra', categorias: porMes.map((m) => m.label), series: [{ nome: 'Ambientes', valores: porMes.map((m) => m.value) }] },
          { titulo: 'Maiores contas', tipo: 'rank', formato: 'brl', categorias: topClientes.map((c) => c.label), series: [{ nome: 'Mensalidade', valores: topClientes.map((c) => c.value) }] },
        ]}
        onClose={() => setExportOpen(false)} />}
    </div>
  )
}
