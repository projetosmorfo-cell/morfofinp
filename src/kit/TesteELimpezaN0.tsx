/* Achado do diff literal desta rodada (item 10 do CONTRATO: valor a valor).
   Este arquivo tinha uma cópia local das cores do N0, e o roxo estava em
   `#8B7CF6` — o Kit usa `#6C3FFF` (L53-L55), e como token CSS
   (`var(--mloc-dev-*)`), não hex solto. Agora vem de `kitBase.tsx`, que é a
   transcrição do Kit: mesma cor, e passa a acompanhar o `shell.css`. */
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Lock, Building2, Check, Plus, X, AlertTriangle } from 'lucide-react'
import { db } from '../db'
import { usePlatformN0, atualizarPlatformN0, salvarTenantsN0, agoraISO, type TenantKit } from './kitPlatform'
import { DEV_CARD, AMBER, RED, Segmented, SectionLabel, primaryBtn, dangerBtn, uid, Sheet, DEV_ACCENT } from './kitBase'
import { ConfirmDeleteSheet } from './PerfisAcesso'
import { TituloTela } from './ParametrosN0'
import {
  tenantTemRegistros, gerarPlanosFicticios, gerarEmpresasFicticias, gerarUsuariosMorfoFicticios,
  gerarLancamentosFicticios, apagarLancamentosFicticios, apagarTodosLancamentos, contarLancamentosFicticios,
} from './massaTeste'

// N0 → Parâmetros: "Gerar Teste no Cliente" (Kit L1818-L1842), "Gerar Teste
// Morfo" (L1846-L1872) e as 4 telas de "Limpar Dados" (L1875-L2010),
// portadas na Decisão 55 (Parte B) — decisão do Rafael: "tudo igual ao Kit",
// inclusive as telas que apagam dado REAL, com a dupla checagem do Kit.
//
// A trava do Kit ("massa no cliente só em ambiente VAZIO", L1836-L1841) foi
// mantida literal: é ela que impede misturar lançamento fictício com os
// lançamentos reais do Rafael sem perceber. Na prática, com a base dele
// populada, o ambiente real aparece TRAVADO nesta tela — que é exatamente o
// comportamento do Kit, e a proteção que faz sentido aqui.
//
// Ver `massaTeste.ts` pela ADAPTAÇÃO central (Entidade A do Kit → lançamento
// financeiro; ambiente real no Dexie × tenants de demonstração no `env`).

const DEV_TXT2 = '#9B96A8'

function CaixaSelecao({ marcado, cor = RED }: { marcado: boolean; cor?: string }) {
  return <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${marcado ? cor : DEV_TXT2}`, background: marcado ? cor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    {marcado && <Check size={12} color="#fff" />}
  </div>
}

function TotalRegistros({ n, label }: { n: number; label: string }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: DEV_TXT2, padding: '4px 2px' }}>{n} {label}</div>
}

/* ================= Gerar Teste no Cliente (Kit L1818-L1842) ================= */
export function SubTesteCliente({ notify }: { notify: (m: string) => void }) {
  const platform = usePlatformN0()
  const qtdLancamentos = useLiveQuery(() => db.lancamentos.count(), [], -1)
  const [alvo, setAlvo] = useState<TenantKit | null>(null)
  const [qtd, setQtd] = useState(50)
  const [etapa, setEtapa] = useState(0)
  const [bloqueado, setBloqueado] = useState<TenantKit | null>(null)

  async function gerar() {
    if (!alvo) return
    try {
      if (alvo.real) {
        const n = await gerarLancamentosFicticios(qtd)
        await salvarTenantsN0((ts) => ts.map((t) => (t.id === alvo.id ? { ...t, env: { registros: n, ambienteTeste: true }, accessLog: [{ id: uid(), ts: agoraISO(), action: `Massa de dados de teste gerada pela Morfo (${n} lançamentos)`, ator: 'suporte' }, ...(t.accessLog || [])].slice(0, 50) } : t)))
      } else {
        await salvarTenantsN0((ts) => ts.map((t) => (t.id === alvo.id ? { ...t, env: { registros: qtd, ambienteTeste: true }, accessLog: [{ id: uid(), ts: agoraISO(), action: `Massa de dados de teste gerada pela Morfo (${qtd} registros)`, ator: 'suporte' }, ...(t.accessLog || [])].slice(0, 50) } : t)))
      }
      notify('Ambiente de teste gerado')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Não foi possível gerar a massa')
    }
    setEtapa(0); setAlvo(null)
  }

  return <>
    <TituloTela>Popula o ambiente de um cliente com dados fictícios (12 meses de histórico). Só ambientes <strong style={{ color: '#fff' }}>vazios</strong> podem receber massa — os demais aparecem travados. Escolha o cliente:</TituloTela>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {platform.tenants.map((t) => {
        const temRegistros = qtdLancamentos < 0 ? true : tenantTemRegistros(t, qtdLancamentos)
        return <div key={t.id} onClick={() => (temRegistros ? setBloqueado(t) : setAlvo(t))}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: DEV_CARD, borderRadius: 12, padding: '11px 12px', cursor: 'pointer', opacity: temRegistros ? 0.55 : 1, border: alvo?.id === t.id ? `1.5px solid ${DEV_ACCENT}` : '1.5px solid transparent' }}>
          {temRegistros ? <Lock size={16} color={DEV_TXT2} /> : <Building2 size={16} color={DEV_ACCENT} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.companyName}{t.real && <span style={{ fontSize: 9.5, fontWeight: 800, color: DEV_ACCENT, marginLeft: 6 }}>REAL</span>}</div>
            <div style={{ fontSize: 11, color: DEV_TXT2 }}>{temRegistros ? `${t.real ? qtdLancamentos : (t.env?.registros || 0)} registro(s) — já tem dados` : 'ambiente vazio — pode receber massa'}</div>
          </div>
          {alvo?.id === t.id && <Check size={16} color={DEV_ACCENT} />}
        </div>
      })}
    </div>
    {alvo && <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#C9C4D4', marginBottom: 6 }}>Tamanho do ambiente</div>
      <div style={{ marginBottom: 12 }}><Segmented value={String(qtd)} onChange={(v) => setQtd(Number(v))} options={[{ value: '25', label: '25' }, { value: '50', label: '50' }, { value: '100', label: '100' }]} /></div>
      <button type="button" onClick={() => setEtapa(1)} style={{ ...primaryBtn, width: '100%', background: DEV_ACCENT }}><Plus size={16} /> Gerar em {alvo.companyName}</button>
    </div>}
    {alvo && etapa === 1 && <ConfirmDeleteSheet title="Confirmar geração de dados" irreversible={false} confirmLabel="Continuar" confirmIcon={Plus}
      message={`Gerar ${qtd} registros fictícios DENTRO do ambiente de ${alvo.companyName}? O ambiente está vazio e recebe agora esses dados de teste.`}
      onConfirm={() => setEtapa(2)} onClose={() => setEtapa(0)} />}
    {alvo && etapa === 2 && <ConfirmDeleteSheet title="Checagem final" irreversible={false} confirmLabel="Gerar de vez" confirmIcon={Check}
      message={`Última checagem: os dados fictícios entram AGORA no ambiente de ${alvo.companyName}. É ferramenta de teste — não usar em cliente de verdade. Confirma?`}
      onConfirm={() => void gerar()} onClose={() => setEtapa(0)} />}
    {bloqueado && <Sheet title="Só em ambiente vazio" onClose={() => setBloqueado(null)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: AMBER, fontWeight: 800, fontSize: 14, marginBottom: 10 }}><Lock size={17} /> Mecanismo de segurança</div>
      <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 10px' }}>O ambiente de <strong>{bloqueado.companyName}</strong> já tem registros. A massa de dados de teste só pode ser gerada em ambiente <strong>vazio</strong> — isso evita misturar dados fictícios com registros reais sem perceber.</p>
      <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 14px' }}>Se quiser usar este ambiente mesmo assim, a segunda opção é <strong>limpar os dados dele antes</strong> (Parâmetros › Limpar Dados do Cliente) e voltar aqui pra gerar.</p>
      <button type="button" style={{ ...primaryBtn, width: '100%' }} onClick={() => setBloqueado(null)}>Entendi</button>
    </Sheet>}
  </>
}

/* ================= Gerar Teste Morfo (Kit L1846-L1872) ================= */
const TIPOS_MASSA = [
  { key: 'empresas', titulo: 'Empresas', resumo: 'Clientes fictícios da Morfo: mensalidades de até 12 meses, mix de situações e conversas de chat' },
  { key: 'usuarios', titulo: 'Usuários Morfo', resumo: 'Usuários fictícios do painel administrador (login próprio, perfil de acesso)' },
  { key: 'planos', titulo: 'Planos de assinatura', resumo: 'Planos fictícios (Bronze/Prata/Ouro de teste) — as empresas fictícias se vinculam só a eles' },
] as const

export function SubTesteMorfo({ notify }: { notify: (m: string) => void }) {
  const platform = usePlatformN0()
  const [tipos, setTipos] = useState<Set<string>>(new Set())
  const [qtdEmp, setQtdEmp] = useState(20)
  const [qtdUsu, setQtdUsu] = useState(5)
  const [etapa, setEtapa] = useState(0)

  async function gerar() {
    let planosFic: { id?: number; valorMensal: number }[] = (await db.planos.toArray()).filter((p) => p.ficticio).map((p) => ({ id: p.id, valorMensal: p.valorMensal }))
    if (tipos.has('planos')) {
      const novos = gerarPlanosFicticios()
      const ids = await db.planos.bulkAdd(novos as never, { allKeys: true })
      planosFic = [...planosFic, ...novos.map((p, i) => ({ id: Number((ids as number[])[i]), valorMensal: p.valorMensal }))]
    }
    await atualizarPlatformN0((p) => {
      let np = { ...p }
      if (tipos.has('empresas')) {
        const off = np.tenants.filter((t) => t.ficticio).length
        np = { ...np, tenants: [...np.tenants, ...gerarEmpresasFicticias(qtdEmp, planosFic, off)] }
      }
      if (tipos.has('usuarios')) {
        const off = (np.devUsers || []).filter((u) => u.ficticio).length
        np = { ...np, devUsers: [...(np.devUsers || []), ...gerarUsuariosMorfoFicticios(qtdUsu, off)] }
      }
      return np
    })
    notify('Massa de teste gerada (marcada como TESTE)')
    setEtapa(0); setTipos(new Set())
  }

  const resumoSel = [tipos.has('empresas') && `${qtdEmp} empresa(s)`, tipos.has('usuarios') && `${qtdUsu} usuário(s)`, tipos.has('planos') && '3 plano(s)'].filter(Boolean).join(', ')
  return <>
    <TituloTela>Gera dados fictícios nos registros do administrador Morfo. Pode ser usada mesmo com a base populada: <strong style={{ color: '#fff' }}>tudo que sai daqui nasce marcado como TESTE</strong>, nunca se vincula a dados reais, e pode ser removido depois em "Limpar Dados Testes Morfo". Escolha o que gerar:</TituloTela>
    {TIPOS_MASSA.map((t) => {
      const on = tipos.has(t.key)
      return <div key={t.key} onClick={() => setTipos((s) => { const nx = new Set(s); if (nx.has(t.key)) nx.delete(t.key); else nx.add(t.key); return nx })}
        style={{ display: 'flex', alignItems: 'center', gap: 10, background: DEV_CARD, borderRadius: 12, padding: '11px 12px', cursor: 'pointer', marginBottom: 8, border: on ? `1.5px solid ${DEV_ACCENT}` : '1.5px solid transparent' }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${on ? DEV_ACCENT : DEV_TXT2}`, background: on ? DEV_ACCENT : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on && <Check size={13} color="#fff" />}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{t.titulo}</div>
          <div style={{ fontSize: 11, color: DEV_TXT2, lineHeight: 1.4 }}>{t.resumo}</div>
        </div>
      </div>
    })}
    {tipos.has('empresas') && <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#C9C4D4', marginBottom: 6 }}>Quantidade de empresas</div>
      <Segmented value={String(qtdEmp)} onChange={(v) => setQtdEmp(Number(v))} options={[{ value: '10', label: '10' }, { value: '20', label: '20' }, { value: '40', label: '40' }]} />
    </div>}
    {tipos.has('usuarios') && <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#C9C4D4', marginBottom: 6 }}>Quantidade de usuários</div>
      <Segmented value={String(qtdUsu)} onChange={(v) => setQtdUsu(Number(v))} options={[{ value: '5', label: '5' }, { value: '10', label: '10' }, { value: '20', label: '20' }]} />
    </div>}
    {tipos.has('empresas') && !tipos.has('planos') && <p style={{ fontSize: 11, color: AMBER, margin: '0 2px 10px', lineHeight: 1.5 }}>Sem "Planos" selecionado, as empresas fictícias nascem sem plano vinculado (mensalidade própria) — elas nunca se vinculam aos planos reais.</p>}
    <button type="button" disabled={tipos.size === 0} onClick={() => setEtapa(1)} style={{ ...primaryBtn, width: '100%', background: DEV_ACCENT, opacity: tipos.size ? 1 : 0.5 }}><Plus size={16} /> Gerar massa selecionada</button>
    <p style={{ fontSize: 11, color: DEV_TXT2, margin: '8px 2px 0', lineHeight: 1.5 }}>Hoje na base: {platform.tenants.filter((t) => t.ficticio).length} empresa(s) e {(platform.devUsers || []).filter((u) => u.ficticio).length} usuário(s) de teste.</p>
    {etapa === 1 && <ConfirmDeleteSheet title="Confirmar geração de dados" irreversible={false} confirmLabel="Continuar" confirmIcon={Plus}
      message={`Gerar dados fictícios de: ${resumoSel}? Tudo entra MARCADO como teste e pode ser removido depois em "Limpar Dados Testes Morfo".`}
      onConfirm={() => setEtapa(2)} onClose={() => setEtapa(0)} />}
    {etapa === 2 && <ConfirmDeleteSheet title="Checagem final" irreversible={false} confirmLabel="Gerar de vez" confirmIcon={Check}
      message="Última checagem: os dados fictícios entram AGORA nos registros do administrador Morfo, marcados como teste. Confirma?"
      onConfirm={() => void gerar()} onClose={() => setEtapa(0)} />}
  </>
}

/* ========== Limpar Dados do Cliente — teste e reais (Kit L1875-L1922) ========== */
export function SubLimpezaCliente({ notify }: { notify: (m: string) => void }) {
  const platform = usePlatformN0()
  const qtdFicticios = useLiveQuery(() => contarLancamentosFicticios(), [], 0)
  const qtdTotal = useLiveQuery(() => db.lancamentos.count(), [], 0)
  const [modo, setModo] = useState<'teste' | 'reais'>('teste')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [confirma, setConfirma] = useState(0)

  const visiveis = platform.tenants.filter((t) => (modo === 'teste' ? !!t.env?.ambienteTeste : !t.env?.ambienteTeste))
  const toggle = (id: string) => setSel((s) => { const nx = new Set(s); if (nx.has(id)) nx.delete(id); else nx.add(id); return nx })

  async function limpar() {
    let apagados = 0
    for (const t of platform.tenants.filter((x) => sel.has(x.id))) {
      if (t.real) apagados += modo === 'teste' ? await apagarLancamentosFicticios() : await apagarTodosLancamentos()
      else apagados += t.env?.registros || 0
    }
    await salvarTenantsN0((ts) => ts.map((t) => (sel.has(t.id) ? { ...t, env: { registros: 0, ambienteTeste: false }, accessLog: [{ id: uid(), ts: agoraISO(), action: modo === 'teste' ? 'Dados de TESTE do ambiente apagados pela Morfo' : 'Dados do ambiente apagados pela Morfo', ator: 'suporte' }, ...(t.accessLog || [])].slice(0, 50) } : t)))
    notify(`${apagados} registro(s) apagado(s)`)
    setSel(new Set()); setConfirma(0)
  }

  return <>
    <TituloTela>
      {modo === 'teste'
        ? <>Apaga os dados operacionais de ambientes de clientes <strong style={{ color: '#fff' }}>com massa de teste gerada</strong>. No ambiente real, apaga somente os lançamentos marcados como teste — nenhum lançamento seu é tocado.</>
        : <>Apaga os dados operacionais dos ambientes <strong style={{ color: '#fff' }}>reais</strong> selecionados. No ambiente real do MorfoFinP isso apaga TODOS os seus lançamentos. Ação irreversível — por isso a checagem é dupla.</>}
    </TituloTela>
    <div style={{ marginBottom: 12 }}>
      <Segmented value={modo} onChange={(v) => { setModo(v); setSel(new Set()) }} options={[{ value: 'teste', label: 'Dados de teste' }, { value: 'reais', label: 'Dados reais' }]} />
    </div>
    <SectionLabel dark>Limpeza de dados em massa</SectionLabel>
    {visiveis.length === 0 && <p style={{ fontSize: 12.5, color: DEV_TXT2, margin: '2px 2px 10px' }}>{modo === 'teste' ? 'Nenhum ambiente com massa de teste gerada.' : 'Nenhum ambiente real sem massa de teste.'}</p>}
    {visiveis.length > 0 && <TotalRegistros n={visiveis.length} label={visiveis.length === 1 ? 'ambiente' : 'ambientes'} />}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
      {visiveis.map((t) => {
        const n = t.real ? (modo === 'teste' ? qtdFicticios : qtdTotal) : (t.env?.registros || 0)
        return <div key={t.id} onClick={() => toggle(t.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: DEV_CARD, borderRadius: 12, padding: '10px 12px', cursor: 'pointer', border: sel.has(t.id) ? `1.5px solid ${RED}` : '1.5px solid transparent' }}>
          <CaixaSelecao marcado={sel.has(t.id)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.companyName}{t.real && <span style={{ fontSize: 9.5, fontWeight: 800, color: DEV_ACCENT, marginLeft: 6 }}>REAL</span>}</div>
            <div style={{ fontSize: 10.5, color: DEV_TXT2 }}>{n} registro(s){t.env?.ambienteTeste ? ' · ambiente com massa de teste' : ''}</div>
          </div>
        </div>
      })}
    </div>
    <button type="button" disabled={sel.size === 0} onClick={() => setConfirma(1)} style={{ ...dangerBtn, width: '100%', marginTop: 10, opacity: sel.size ? 1 : 0.4 }}>
      <X size={16} /> Limpar dados de {sel.size} ambiente(s)
    </button>
    {confirma === 1 && <ConfirmDeleteSheet title={modo === 'teste' ? 'Limpar dados de teste' : 'Limpar dados em massa'} confirmLabel="Continuar" confirmIcon={AlertTriangle} irreversible
      message={`Apagar ${modo === 'teste' ? 'os dados de TESTE' : 'TODOS os dados operacionais'} de ${sel.size} ambiente(s)? Essa ação não pode ser desfeita na interface.`}
      onConfirm={() => setConfirma(2)} onClose={() => setConfirma(0)} />}
    {confirma === 2 && <ConfirmDeleteSheet title="Confirmação final" confirmLabel="Apagar de vez" confirmIcon={X} irreversible
      message={`Última checagem: ${sel.size} ambiente(s) terão os dados apagados AGORA. Confirma?`}
      onConfirm={() => void limpar()} onClose={() => setConfirma(0)} />}
  </>
}

/* ========== Limpar Dados da Morfo — teste e reais (Kit L1926-L2010) ========== */
export function SubLimpezaMorfo({ notify }: { notify: (m: string) => void }) {
  const platform = usePlatformN0()
  const planos = useLiveQuery(() => db.planos.toArray(), [], [])
  const [modo, setModo] = useState<'teste' | 'reais'>('teste')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [confirma, setConfirma] = useState(0)

  const soTeste = modo === 'teste'
  const empresas = platform.tenants.filter((t) => (soTeste ? !!t.ficticio : !t.ficticio && !t.real))
  const usuarios = (platform.devUsers || []).filter((u, i) => (soTeste ? !!u.ficticio : !u.ficticio && i > 0))
  const planosLista = soTeste ? planos.filter((p) => p.ficticio) : []
  const chave = (tipo: string, id: string) => `${tipo}:${id}`
  const todas = [...empresas.map((t) => chave('emp', t.id)), ...usuarios.map((u) => chave('usu', u.id)), ...planosLista.map((p) => chave('pla', String(p.id)))]
  const toggle = (k: string) => setSel((s) => { const nx = new Set(s); if (nx.has(k)) nx.delete(k); else nx.add(k); return nx })
  const todosMarcados = todas.length > 0 && todas.every((k) => sel.has(k))

  async function apagar() {
    const delEmp = new Set([...sel].filter((k) => k.startsWith('emp:')).map((k) => k.slice(4)))
    const delUsu = new Set([...sel].filter((k) => k.startsWith('usu:')).map((k) => k.slice(4)))
    const delPla = [...sel].filter((k) => k.startsWith('pla:')).map((k) => Number(k.slice(4)))
    if (delPla.length) await db.planos.bulkDelete(delPla)
    await atualizarPlatformN0((p) => ({
      ...p,
      tenants: p.tenants.filter((t) => !delEmp.has(t.id)).map((t) => (delPla.includes(Number(t.planId)) ? { ...t, planId: null } : t)),
      devUsers: (p.devUsers || []).filter((u, i) => i === 0 || !delUsu.has(u.id)),
    }))
    notify(soTeste ? 'Dados de teste apagados' : 'Registros excluídos')
    setSel(new Set()); setConfirma(0)
  }

  const secao = (titulo: string, itens: { id: string; rotulo: string; teste?: boolean }[], tipo: string) => (
    <div style={{ marginBottom: 14 }} key={tipo}>
      <SectionLabel dark right={itens.length > 0 && <button type="button" onClick={() => setSel((s) => {
        const chaves = itens.map((x) => chave(tipo, x.id)); const all = chaves.every((k) => s.has(k)); const nx = new Set(s)
        chaves.forEach((k) => (all ? nx.delete(k) : nx.add(k))); return nx
      })} style={{ background: 'none', border: 'none', color: DEV_ACCENT, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
        {itens.length > 0 && itens.every((x) => sel.has(chave(tipo, x.id))) ? 'desmarcar sessão' : 'marcar sessão'}
      </button>}>{titulo}</SectionLabel>
      {itens.length === 0 ? <p style={{ fontSize: 11.5, color: DEV_TXT2, margin: '2px 2px 0' }}>Nenhum registro.</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {itens.map((x) => { const k = chave(tipo, x.id); return <div key={x.id} onClick={() => toggle(k)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: DEV_CARD, borderRadius: 12, padding: '9px 12px', cursor: 'pointer', border: sel.has(k) ? `1.5px solid ${RED}` : '1.5px solid transparent' }}>
          <CaixaSelecao marcado={sel.has(k)} />
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.rotulo}</div>
          {x.teste && <span style={{ fontSize: 9.5, fontWeight: 800, color: AMBER }}>TESTE</span>}
        </div> })}
      </div>}
    </div>
  )

  return <>
    <TituloTela>
      {soTeste
        ? <>Remove <strong style={{ color: '#fff' }}>só registros marcados como teste</strong> (gerados pela massa de dados). Os dados reais não aparecem aqui.</>
        : <>Exclui registros <strong style={{ color: '#fff' }}>REAIS</strong> da base da Morfo: o cadastro INTEIRO de empresas e usuários do painel. Registros de teste nunca aparecem aqui, e nem o ambiente real (t0) nem o usuário original do painel podem ser excluídos.</>}
    </TituloTela>
    <div style={{ marginBottom: 12 }}>
      <Segmented value={modo} onChange={(v) => { setModo(v); setSel(new Set()) }} options={[{ value: 'teste', label: 'Dados de teste' }, { value: 'reais', label: 'Dados reais' }]} />
    </div>
    {todas.length > 0 && <button type="button" onClick={() => setSel(todosMarcados ? new Set() : new Set(todas))} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: DEV_ACCENT, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: '7px 12px', borderRadius: 999, marginBottom: 10 }}>
      {todosMarcados ? 'Desmarcar tudo' : 'Selecionar tudo'}
    </button>}
    {todas.length > 0 && <TotalRegistros n={todas.length} label={todas.length === 1 ? 'registro' : 'registros'} />}
    {secao(soTeste ? 'Empresas (teste)' : 'Empresas', empresas.map((t) => ({ id: t.id, rotulo: `${t.companyName} · ${t.plan === 'trial' ? 'teste' : 'pagante'}`, teste: t.ficticio })), 'emp')}
    {secao(soTeste ? 'Usuários Morfo (teste)' : 'Usuários Morfo', usuarios.map((u) => ({ id: u.id, rotulo: `${u.name} · login: ${u.login}`, teste: u.ficticio })), 'usu')}
    {soTeste && secao('Planos de assinatura (teste)', planosLista.map((p) => ({ id: String(p.id), rotulo: `${p.nome} · R$ ${p.valorMensal}/mês`, teste: true })), 'pla')}
    <button type="button" disabled={sel.size === 0} onClick={() => setConfirma(1)} style={{ ...dangerBtn, width: '100%', marginTop: 4, opacity: sel.size ? 1 : 0.4 }}>
      <X size={16} /> {soTeste ? `Apagar ${sel.size} registro(s) de teste` : `Excluir ${sel.size} registro(s)`}
    </button>
    {confirma === 1 && <ConfirmDeleteSheet title={soTeste ? 'Apagar dados de teste' : 'Excluir registros da base'} confirmLabel="Continuar" confirmIcon={AlertTriangle} irreversible
      message={soTeste ? `Apagar ${sel.size} registro(s) de teste selecionado(s)? Só registros marcados como teste são afetados.` : `Excluir ${sel.size} registro(s) REAIS da base da Morfo? Empresas são excluídas com TUDO que há dentro delas.`}
      onConfirm={() => setConfirma(2)} onClose={() => setConfirma(0)} />}
    {confirma === 2 && <ConfirmDeleteSheet title="Confirmação final" confirmLabel={soTeste ? 'Apagar de vez' : 'Excluir de vez'} confirmIcon={X} irreversible
      message={`Última checagem: ${sel.size} registro(s) serão ${soTeste ? 'apagados' : 'excluídos'} AGORA, de forma irreversível. Confirma?`}
      onConfirm={() => void apagar()} onClose={() => setConfirma(0)} />}
  </>
}
