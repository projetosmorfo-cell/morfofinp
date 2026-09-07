import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Conta, type TipoConta } from '../db'

const ROTULO_TIPO: Record<TipoConta, string> = {
  corrente: 'Conta corrente',
  cartao: 'Cartão de crédito',
  cofre: 'Cofrinho / investimento',
}

interface RascunhoConta {
  nome: string
  tipo: TipoConta
  diaFechamento: string
  diaVencimento: string
}

function rascunhoVazio(): RascunhoConta {
  return { nome: '', tipo: 'corrente', diaFechamento: '9', diaVencimento: '16' }
}

function diaValido(v: string, padrao: number): number {
  return Math.min(31, Math.max(1, Number(v) || padrao))
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

// Tela "Contas e carteiras" (30/08/2026, rodada seguinte) — cadastro
// unificado de todo lugar onde o dinheiro está: conta corrente (Bradesco),
// cartão de crédito (Porto Seguro) e cofrinho/investimento, todos no mesmo
// CRUD, acessado pela engrenagem (não é mais uma aba do rodapé — só
// Categorias e Contas vivem lá agora). A tela Carteira lê exatamente essa
// tabela (`db.contas`) pra montar os cards — uma conta nova cadastrada aqui
// aparece automaticamente lá, sem precisar mexer em código.
//
// `instituicao`/`saldoInicial`/`dataSaldoInicial`/`importavel` existem no
// schema pro modo Premium (importação/conciliação) que ainda não foi
// construído — esta tela preenche valores neutros por enquanto (mesma
// lógica de "campo já no schema, UI ainda não usa de verdade" que já vale
// pra outros campos de conciliação, ver db.ts).
export default function Contas({ aoVoltar }: { aoVoltar: () => void }) {
  const contas = useLiveQuery(() => db.contas.toArray(), [])
  const lancamentos = useLiveQuery(() => db.lancamentos.toArray(), [])

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [rascunho, setRascunho] = useState<RascunhoConta>(rascunhoVazio())
  const [confirmandoExclusaoId, setConfirmandoExclusaoId] = useState<number | null>(null)
  const [mostrarNova, setMostrarNova] = useState(false)
  const [novaConta, setNovaConta] = useState<RascunhoConta>(rascunhoVazio())

  if (!contas || !lancamentos) return null

  const contagemPorConta = new Map<number, number>()
  for (const l of lancamentos) {
    contagemPorConta.set(l.contaId, (contagemPorConta.get(l.contaId) ?? 0) + 1)
  }

  function iniciarEdicao(c: Conta) {
    setEditandoId(c.id!)
    setRascunho({
      nome: c.nome,
      tipo: c.tipo,
      diaFechamento: String(c.diaFechamento ?? 9),
      diaVencimento: String(c.diaVencimento ?? 16),
    })
    setConfirmandoExclusaoId(null)
  }

  async function salvarEdicao() {
    if (editandoId == null) return
    await db.contas.update(editandoId, {
      nome: rascunho.nome.trim(),
      tipo: rascunho.tipo,
      diaFechamento: rascunho.tipo === 'cartao' ? diaValido(rascunho.diaFechamento, 1) : undefined,
      diaVencimento: rascunho.tipo === 'cartao' ? diaValido(rascunho.diaVencimento, 10) : undefined,
    })
    setEditandoId(null)
  }

  async function excluir(id: number) {
    await db.contas.delete(id)
    setConfirmandoExclusaoId(null)
  }

  async function alternarAtiva(c: Conta) {
    await db.contas.update(c.id!, { ativa: !c.ativa })
  }

  async function adicionarConta() {
    if (!novaConta.nome.trim()) return
    await db.contas.add({
      nome: novaConta.nome.trim(),
      tipo: novaConta.tipo,
      instituicao: novaConta.nome.trim(),
      saldoInicial: 0,
      dataSaldoInicial: hoje(),
      importavel: false,
      ativa: true,
      diaFechamento: novaConta.tipo === 'cartao' ? diaValido(novaConta.diaFechamento, 1) : undefined,
      diaVencimento: novaConta.tipo === 'cartao' ? diaValido(novaConta.diaVencimento, 10) : undefined,
    })
    setNovaConta(rascunhoVazio())
    setMostrarNova(false)
  }

  return (
    <>
      <div className="cabecalho-fixo">
        <button type="button" className="botao-voltar-config" onClick={aoVoltar}>
          ‹ Voltar
        </button>
        <h1>Contas e carteiras</h1>
      </div>
      <p className="texto-fraco">
        Todo lugar onde o dinheiro está — conta corrente, cartão de crédito ou cofrinho/investimento.
        Aparecem automaticamente na tela Carteira e no seletor "Pago com" de cada lançamento.
      </p>

      <h2>Cadastradas</h2>
      <div className="cartao">
        {contas.length === 0 && <p className="texto-fraco">Nenhuma conta cadastrada ainda.</p>}
        {contas.map((c) => {
          const emEdicao = editandoId === c.id
          const temLancamentos = (contagemPorConta.get(c.id!) ?? 0) > 0

          if (emEdicao) {
            return (
              <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--borda)' }}>
                <label>Nome</label>
                <input
                  type="text"
                  value={rascunho.nome}
                  onChange={(e) => setRascunho((r) => ({ ...r, nome: e.target.value }))}
                />
                <label>Tipo</label>
                <select
                  value={rascunho.tipo}
                  onChange={(e) => setRascunho((r) => ({ ...r, tipo: e.target.value as TipoConta }))}
                >
                  {(Object.keys(ROTULO_TIPO) as TipoConta[]).map((t) => (
                    <option key={t} value={t}>
                      {ROTULO_TIPO[t]}
                    </option>
                  ))}
                </select>
                {rascunho.tipo === 'cartao' && (
                  <>
                    <label>Dia de fechamento da fatura</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={rascunho.diaFechamento}
                      onChange={(e) => setRascunho((r) => ({ ...r, diaFechamento: e.target.value }))}
                    />
                    <label>Dia de vencimento da fatura</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={rascunho.diaVencimento}
                      onChange={(e) => setRascunho((r) => ({ ...r, diaVencimento: e.target.value }))}
                    />
                  </>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" className="primario" style={{ marginTop: 0 }} onClick={salvarEdicao}>
                    Salvar
                  </button>
                  <button
                    type="button"
                    style={{
                      marginTop: 0,
                      background: 'none',
                      border: '1px solid var(--borda)',
                      borderRadius: 10,
                      padding: '12px',
                      flex: 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => setEditandoId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )
          }

          return (
            <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--borda)' }}>
              <div className="linha" style={{ border: 'none', padding: 0 }}>
                <div>
                  <div style={{ opacity: c.ativa ? 1 : 0.5 }}>
                    {c.nome}
                    {!c.ativa && <span className="texto-fraco"> · inativa</span>}
                  </div>
                  <div className="texto-fraco">
                    {ROTULO_TIPO[c.tipo]}
                    {c.tipo === 'cartao' && c.diaFechamento ? ` · fecha dia ${c.diaFechamento}` : ''}
                    {c.tipo === 'cartao' && c.diaVencimento ? ` · vence dia ${c.diaVencimento}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--azul)', cursor: 'pointer', padding: 0 }}
                  onClick={() => iniciarEdicao(c)}
                >
                  Editar
                </button>
                {temLancamentos ? (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer', padding: 0 }}
                    onClick={() => alternarAtiva(c)}
                  >
                    {c.ativa ? 'Inativar' : 'Reativar'}
                  </button>
                ) : confirmandoExclusaoId === c.id ? (
                  <>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--vermelho)', cursor: 'pointer', padding: 0 }}
                      onClick={() => excluir(c.id!)}
                    >
                      Confirmar exclusão
                    </button>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer', padding: 0 }}
                      onClick={() => setConfirmandoExclusaoId(null)}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--vermelho)', cursor: 'pointer', padding: 0 }}
                    onClick={() => setConfirmandoExclusaoId(c.id!)}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <h2>Nova conta</h2>
      <div className="cartao">
        {mostrarNova ? (
          <>
            <label>Nome</label>
            <input
              type="text"
              placeholder="Ex.: Nubank, Cofrinho Viagem…"
              value={novaConta.nome}
              onChange={(e) => setNovaConta((r) => ({ ...r, nome: e.target.value }))}
            />
            <label>Tipo</label>
            <select
              value={novaConta.tipo}
              onChange={(e) => setNovaConta((r) => ({ ...r, tipo: e.target.value as TipoConta }))}
            >
              {(Object.keys(ROTULO_TIPO) as TipoConta[]).map((t) => (
                <option key={t} value={t}>
                  {ROTULO_TIPO[t]}
                </option>
              ))}
            </select>
            {novaConta.tipo === 'cartao' && (
              <>
                <label>Dia de fechamento da fatura</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={novaConta.diaFechamento}
                  onChange={(e) => setNovaConta((r) => ({ ...r, diaFechamento: e.target.value }))}
                />
                <label>Dia de vencimento da fatura</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={novaConta.diaVencimento}
                  onChange={(e) => setNovaConta((r) => ({ ...r, diaVencimento: e.target.value }))}
                />
              </>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" className="primario" style={{ marginTop: 0 }} onClick={adicionarConta}>
                Adicionar
              </button>
              <button
                type="button"
                style={{
                  marginTop: 0,
                  background: 'none',
                  border: '1px solid var(--borda)',
                  borderRadius: 10,
                  padding: '12px',
                  flex: 1,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setMostrarNova(false)
                  setNovaConta(rascunhoVazio())
                }}
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="primario"
            style={{ marginTop: 0 }}
            onClick={() => {
              setNovaConta(rascunhoVazio())
              setMostrarNova(true)
            }}
          >
            + Nova conta
          </button>
        )}
      </div>
    </>
  )
}
