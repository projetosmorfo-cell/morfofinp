import { useState } from 'react'
import { Check, ChevronRight, Lock, Pencil, Plus, ShieldAlert, X } from 'lucide-react'
import {
  AMBER, BRANCO, DEV_ACCENT, DEV_CARD, INK, LINE, PURPLE, RED, TXT2, TXT3,
  Field, Sheet, Segmented, dangerBtn, inputStyle, primaryBtn, secondaryBtn, uid,
} from './kitBase'
import type { FuncaoPerfil, PerfilAcesso } from './kitPlatform'

// Gerenciador de Perfis e Permissões — Kit `esqueleto-morfo-v1.jsx`
// (versão autoritativa, 7818 linhas — G60, 09/09/2026: a versão de 7501
// linhas usada em outras rodadas ficou ambígua) L1590-L2072:
// `ConfirmDeleteSheet`, `PerfilEditSheet`, `MigrarPerfilSheet`,
// `PerfisAcessoContent`. Transcrição literal, parametrizada por `funcs`/
// `perfis`/`users`/`salvarPerfis`/`migrarUsuarios` (exatamente como o Kit já
// faz) pra servir N0 (`FUNCOES_PERFIL_N0`/`platformN0.perfisMorfo`/
// `devUsers`) e N1 (`FUNCOES_PERFIL_N1`/`t0.perfisAcesso`/`t0.users`) sem
// duplicar o componente (10/09/2026, Decisão 54 Parte B).
//
// `PermissoesTenantView` do Kit (wrapper de tela só com um `<div style=
// {padding:16}>` em volta de `PerfisAcessoContent`) não foi portado à parte
// — as telas de N0 (`DevApp.tsx`) e N1 (`App.tsx`) que consomem este
// componente já têm seu próprio `TopBar`/cabeçalho fixo (padrão do resto do
// MorfoFinP), então o wrapper do Kit seria redundante.

/* ---- Kit L1590-L1605, literal (só usado aqui — não existe em kitBase) ----
   `tone`/`dark` (achado no diff literal desta rodada, 11/09/2026 — o Projeto
   Modelo evoluiu depois do porte original de 10/09 e ganhou os dois): `tone`
   troca a cor entre "danger" (vermelho, ações sem volta) e "warning" (âmbar,
   ações reversíveis tipo Bloquear/Inativar); `dark` é a variante escura do
   N0 — usada aqui (chamada por `PerfisAcessoContent`, que já recebe `dark`
   do N0 mas não repassava pras folhas internas até esta correção). */
export function ConfirmDeleteSheet({ title, message, onConfirm, onClose, confirmLabel, confirmIcon: Icon = X, irreversible = true, tone = 'danger', dark }: {
  title?: string; message: string; onConfirm: () => void; onClose: () => void; confirmLabel?: string; confirmIcon?: typeof X; irreversible?: boolean; tone?: 'danger' | 'warning'; dark?: boolean
}) {
  const [entendi, setEntendi] = useState(!irreversible)
  const cor = tone === 'warning' ? AMBER : RED
  return <Sheet title={title || 'Confirmar ação'} onClose={onClose} dark={dark}>
    <p style={{ fontSize: 13.5, color: dark ? '#C9C4D4' : TXT2, lineHeight: 1.5, marginTop: 0 }}>{message}</p>
    {irreversible && <button onClick={() => setEntendi(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${entendi ? cor : (dark ? '#9B96A8' : TXT3)}`, background: entendi ? cor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{entendi && <Check size={13} color="#fff" />}</div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: dark ? '#fff' : INK, textAlign: 'left' }}>Entendo que essa ação não pode ser desfeita</span>
    </button>}
    <div style={{ display: 'flex', gap: 8 }}>
      <button style={dark ? { ...secondaryBtn, flex: 1, background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none' } : { ...secondaryBtn, flex: 1 }} onClick={onClose}>Cancelar</button>
      <button disabled={!entendi} style={{ ...dangerBtn, flex: 1, background: cor, color: '#fff', border: 'none', opacity: entendi ? 1 : 0.5 }} onClick={onConfirm}><Icon size={16} /> {confirmLabel || 'Excluir'}</button>
    </div>
  </Sheet>
}

/* ---- Kit L1998-L2017, literal — `dark` achado no diff desta rodada (11/09/2026) ---- */
function PerfilEditSheet({ funcs, initial, onClose, onSave, dark }: {
  funcs: FuncaoPerfil[]; initial: PerfilAcesso | null; onClose: () => void; onSave: (data: { nome: string; permissoes: PerfilAcesso['permissoes'] }) => void; dark?: boolean
}) {
  const [nome, setNome] = useState(initial?.nome || '')
  const [permissoes, setPermissoes] = useState<PerfilAcesso['permissoes']>(initial?.permissoes || {})
  const setNivel = (k: string, v: string) => setPermissoes(p => { const n = { ...p }; if (v) n[k] = v as 'editar' | 'visualizar' | 'nenhum'; else delete n[k]; return n })
  const canSave = nome.trim()
  const darkInput = dark ? { background: DEV_CARD, color: '#fff', border: 'none' } : {}
  return <Sheet title={initial ? 'Editar perfil de acesso' : 'Novo perfil de acesso'} onClose={onClose} dark={dark}>
    <Field dark={dark} label="Nome do perfil"><input style={{ ...inputStyle, ...darkInput }} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Financeiro, Atendimento..." /></Field>
    <p style={{ fontSize: 11.5, color: dark ? '#9B96A8' : TXT3, margin: '-6px 2px 12px', lineHeight: 1.5 }}>Por funcionalidade: <strong>Sem acesso</strong> = nem aparece no menu; <strong>Visualiza</strong> = vê, sem editar; <strong>Edita</strong> = acesso completo.</p>
    {funcs.map(f => <div key={f.k}>
      <Field dark={dark} label={f.l}><Segmented dark={dark} value={permissoes[f.k] || ''} onChange={(v) => setNivel(f.k, v)} options={[{ value: '', label: 'Sem acesso' }, { value: 'visualizar', label: 'Visualiza' }, { value: 'editar', label: 'Edita' }]} /></Field>
      {f.sub && (permissoes[f.k] || f.sub.some(s => permissoes[s.k])) && <div style={{ marginLeft: 14, paddingLeft: 10, borderLeft: `2px solid ${dark ? 'rgba(255,255,255,0.12)' : LINE}`, marginTop: -4, marginBottom: 10 }}>
        {f.sub.map((s, i) => <div key={s.k}>
          {s.sessao && s.sessao !== f.sub?.[i - 1]?.sessao && <div style={{ fontSize: 10.5, fontWeight: 800, color: AMBER, textTransform: 'uppercase', letterSpacing: 0.3, margin: i === 0 ? '0 0 4px' : '10px 0 4px', paddingLeft: 8, borderLeft: `3px solid ${AMBER}` }}>{s.sessao}</div>}
          <Field dark={dark} label={`↳ ${s.l}`}><Segmented dark={dark} value={permissoes[s.k] ?? (permissoes[f.k] || 'nenhum')} onChange={(v) => setNivel(s.k, v)} options={[{ value: 'nenhum', label: 'Sem acesso' }, { value: 'visualizar', label: 'Visualiza' }, { value: 'editar', label: 'Edita' }]} /></Field>
        </div>)}
      </div>}
    </div>)}
    <button disabled={!canSave} style={{ ...primaryBtn, width: '100%', opacity: canSave ? 1 : 0.5 }} onClick={() => onSave({ nome: nome.trim(), permissoes })}><Check size={16} /> Salvar perfil</button>
  </Sheet>
}

/* ---- Kit L2018-L2025, literal — `dark` achado no diff desta rodada (11/09/2026) ---- */
function MigrarPerfilSheet({ perfis, excluindo, qtdUsuarios, onClose, onConfirm, dark }: {
  perfis: PerfilAcesso[]; excluindo: PerfilAcesso; qtdUsuarios: number; onClose: () => void; onConfirm: (destinoId: string) => void; dark?: boolean
}) {
  return <Sheet title={`Excluir perfil "${excluindo.nome}"`} onClose={onClose} dark={dark}>
    <p style={{ fontSize: 13, color: dark ? '#C9C4D4' : TXT2, marginTop: 0, marginBottom: 14, lineHeight: 1.5 }}>{qtdUsuarios} usuário(s) está(ão) vinculado(s) a este perfil. Escolha pra qual perfil eles migram — só depois o perfil é excluído.</p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {perfis.filter(p => p.id !== excluindo.id).map(p => <button key={p.id} onClick={() => onConfirm(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '12px 13px', borderRadius: 12, border: dark ? 'none' : `1.5px solid ${LINE}`, background: dark ? DEV_CARD : BRANCO, cursor: 'pointer' }}><ShieldAlert size={15} color={dark ? DEV_ACCENT : PURPLE} /><span style={{ fontSize: 14, fontWeight: 700, color: dark ? '#fff' : INK, flex: 1 }}>{p.nome}</span><ChevronRight size={15} color={dark ? '#9B96A8' : TXT3} /></button>)}
    </div>
  </Sheet>
}

/* ---- Kit L2026-L2062, literal ---- */
export function PerfisAcessoContent({ funcs, perfis, users, salvarPerfis, migrarUsuarios, dark, notify }: {
  funcs: FuncaoPerfil[]
  perfis: PerfilAcesso[]
  users: { perfilId?: string }[]
  salvarPerfis: (novos: PerfilAcesso[]) => void
  migrarUsuarios: (deId: string, paraId: string) => void
  dark?: boolean
  notify: (msg: string) => void
}) {
  const [editFor, setEditFor] = useState<PerfilAcesso | 'novo' | null>(null)
  const [delFor, setDelFor] = useState<PerfilAcesso | null>(null)
  const [confirmDelFor, setConfirmDelFor] = useState<PerfilAcesso | null>(null)
  const cardBg = dark ? DEV_CARD : BRANCO
  const cardBorder = dark ? 'none' : `1px solid ${LINE}`
  const ink = dark ? '#fff' : INK
  const sub = dark ? '#9B96A8' : TXT3
  const usuariosDoPerfil = (pid: string) => (users || []).filter(u => (u.perfilId || 'admin') === pid)
  const nivelLabel = (v?: string) => v === 'editar' ? 'edita' : 'visualiza'
  const resumo = (p: PerfilAcesso) => {
    const ativos = funcs.filter(f => p.permissoes[f.k])
    // "(submenus ajustados)" — achado no diff desta rodada (11/09/2026): o
    // Projeto Modelo sinaliza quando algum item de um submenu tem nível
    // diferente do nível geral da função-pai, senão o resumo não deixava
    // isso visível.
    return ativos.length === 0 ? 'Sem acesso a nenhuma funcionalidade' : ativos.map(f => `${f.l}: ${nivelLabel(p.permissoes[f.k])}${f.sub && f.sub.some(s => p.permissoes[s.k]) ? ' (submenus ajustados)' : ''}`).join(' · ')
  }
  const savePerfil = (data: { nome: string; permissoes: PerfilAcesso['permissoes'] }) => {
    if (editFor === 'novo') { salvarPerfis([...perfis, { id: uid(), nome: data.nome, permissoes: data.permissoes }]); notify('Perfil criado') }
    else if (editFor) { salvarPerfis(perfis.map(p => p.id === editFor.id ? { ...p, nome: data.nome, permissoes: data.permissoes } : p)); notify('Perfil atualizado') }
    setEditFor(null)
  }
  const pedirExclusao = (p: PerfilAcesso) => { const n = usuariosDoPerfil(p.id).length; if (n > 0) setDelFor(p); else setConfirmDelFor(p) }
  const excluirComMigracao = (destinoId: string) => { if (!delFor) return; migrarUsuarios(delFor.id, destinoId); salvarPerfis(perfis.filter(p => p.id !== delFor.id)); notify('Usuários migrados e perfil excluído'); setDelFor(null) }
  const excluirDireto = () => { if (!confirmDelFor) return; salvarPerfis(perfis.filter(p => p.id !== confirmDelFor.id)); notify('Perfil excluído'); setConfirmDelFor(null) }
  return <>
    <p style={{ fontSize: 12, color: sub, margin: '0 2px 14px', lineHeight: 1.5 }}>Todo usuário é vinculado a um perfil. O perfil <strong style={{ color: ink }}>Administrador</strong> tem acesso total, não pode ser editado nem excluído, e precisa ter sempre pelo menos 1 usuário ativo vinculado.</p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
      {perfis.map(p => {
        const n = usuariosDoPerfil(p.id).length
        return <div key={p.id} style={{ background: cardBg, border: cardBorder, borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {p.fixo ? <Lock size={14} color={sub} /> : <ShieldAlert size={14} color={dark ? '#6C3FFF' : PURPLE} />}
            <span style={{ fontWeight: 700, fontSize: 14, color: ink, flex: 1 }}>{p.nome}</span>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: sub }}>{n} usuário(s)</span>
          </div>
          <div style={{ fontSize: 11, color: sub, marginTop: 5, lineHeight: 1.5 }}>{p.fixo ? 'Acesso total a tudo — perfil fixo do sistema, não editável.' : resumo(p)}</div>
          {!p.fixo && <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
            <button onClick={() => setEditFor(p)} style={{ ...secondaryBtn, flex: 1, padding: '7px', fontSize: 12 }}><Pencil size={13} /> Editar</button>
            <button onClick={() => pedirExclusao(p)} style={{ ...dangerBtn, flex: 1, padding: '7px', fontSize: 12 }}><X size={13} /> Excluir</button>
          </div>}
        </div>
      })}
    </div>
    <button onClick={() => setEditFor('novo')} style={{ ...secondaryBtn, width: '100%', borderColor: dark ? 'transparent' : PURPLE, color: dark ? '#6C3FFF' : PURPLE, background: dark ? DEV_CARD : BRANCO }}><Plus size={15} /> Novo perfil de acesso</button>
    {/* `dark` repassado às 3 folhas abaixo — achado no diff desta rodada
        (11/09/2026): `PerfisAcessoContent` já recebia `dark` do N0
        (`DevApp.tsx` chama com `dark`), mas não repassava pras folhas
        internas, que sempre saíam claras mesmo dentro do painel escuro. */}
    {editFor && <PerfilEditSheet funcs={funcs} initial={editFor === 'novo' ? null : editFor} onClose={() => setEditFor(null)} onSave={savePerfil} dark={dark} />}
    {delFor && <MigrarPerfilSheet perfis={perfis} excluindo={delFor} qtdUsuarios={usuariosDoPerfil(delFor.id).length} onClose={() => setDelFor(null)} onConfirm={excluirComMigracao} dark={dark} />}
    {confirmDelFor && <ConfirmDeleteSheet title="Excluir perfil" message={`Excluir o perfil "${confirmDelFor.nome}"? Nenhum usuário está vinculado a ele.`} confirmLabel="Excluir" confirmIcon={X} irreversible onConfirm={excluirDireto} onClose={() => setConfirmDelFor(null)} dark={dark} />}
  </>
}
