import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Conta, type TipoConta } from '../db'
import ModalCadastro from '../components/ModalCadastro'
import SeletorInstituicao, { type IconeCarteira } from '../components/SeletorInstituicao'
import SeloInstituicao from '../components/SeloInstituicao'
import MenuLinha from '../components/MenuLinha'
import SeletorComExplicacao, { type OpcaoExplicada } from '../components/SeletorComExplicacao'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
import { lerDoAmbiente, marcaDoAmbiente } from '../ambiente'

const ROTULO_TIPO: Record<TipoConta, string> = {
  corrente: 'Conta corrente',
  cartao: 'Cartão de crédito',
  cofre: 'Cofrinho / investimento',
}

/* O que cada tipo muda de verdade (12/09/2026, pedido do Rafael: "campo Tipo
   também deve ter explicação no mesmo sentido que pedi pro campo Natureza").
   Os textos descrevem o comportamento real das telas: Carteira soma o mês na
   conta corrente, calcula ciclo de fatura no cartão e saldo acumulado no
   cofrinho. */
const EXPLICACAO_TIPO: Record<TipoConta, string> = {
  corrente: 'Dinheiro disponível agora (banco, carteira). A Carteira mostra o total do mês escolhido.',
  cartao: 'Compras que viram fatura. Ganha dia de fechamento/vencimento e a Carteira navega por ciclo de fatura.',
  cofre: 'Dinheiro guardado (poupança, investimento, cofrinho). A Carteira mostra o saldo acumulado, não o mês.',
}

interface RascunhoConta {
  nome: string
  tipo: TipoConta
  diaFechamento: string
  diaVencimento: string
  /* Ícone da carteira (10/09/2026) — ver `SeletorInstituicao.tsx`. */
  icone: IconeCarteira
}

function rascunhoVazio(): RascunhoConta {
  return { nome: '', tipo: 'corrente', diaFechamento: '9', diaVencimento: '16', icone: {} }
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
  const contas = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), [])
  const lancamentos = useLiveQuery(() => lerDoAmbiente(db.lancamentos.toArray()), [])

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [rascunho, setRascunho] = useState<RascunhoConta>(rascunhoVazio())
  const [confirmandoExclusaoId, setConfirmandoExclusaoId] = useState<number | null>(null)
  const [menuContaAberta, setMenuContaAberta] = useState<number | null>(null)
  const [mostrarNova, setMostrarNova] = useState(false)
  const [novaConta, setNovaConta] = useState<RascunhoConta>(rascunhoVazio())

  const contaEmEdicao = (contas ?? []).find((c) => c.id === editandoId) ?? null

  /* Formulário da conta — o MESMO nos dois popups (nova e edição), pra não
     existirem dois desenhos que podem divergir (11/09/2026, "Nos cadastros
     todos do sistema, deve abrir popup e nunca na mesma tela"). */
  function formularioConta(
    rasc: RascunhoConta,
    setRasc: React.Dispatch<React.SetStateAction<RascunhoConta>>,
  ) {
    return (
      <>
        <label htmlFor="conta-nome">Nome</label>
        <input
          id="conta-nome"
          type="text"
          placeholder="Ex.: Nubank, Cofrinho Viagem…"
          value={rasc.nome}
          onChange={(e) => setRasc((r) => ({ ...r, nome: e.target.value }))}
        />
        <label>Ícone</label>
        <SeletorInstituicao
          nome={rasc.nome}
          valor={rasc.icone}
          onEscolher={(icone) => setRasc((r) => ({ ...r, icone }))}
        />
        <label htmlFor="conta-tipo">Tipo</label>
        <SeletorComExplicacao<TipoConta>
          id="conta-tipo"
          titulo="Tipo da carteira"
          valor={rasc.tipo}
          opcoes={(Object.keys(ROTULO_TIPO) as TipoConta[]).map((t): OpcaoExplicada<TipoConta> => ({ valor: t, rotulo: ROTULO_TIPO[t], explicacao: EXPLICACAO_TIPO[t] }))}
          onEscolher={(tipo) => setRasc((r) => ({ ...r, tipo }))}
        />
        {rasc.tipo === 'cartao' && (
          <>
            <label htmlFor="conta-fechamento">Dia de Fechamento da Fatura</label>
            <input
              id="conta-fechamento"
              type="number"
              min={1}
              max={31}
              value={rasc.diaFechamento}
              onChange={(e) => setRasc((r) => ({ ...r, diaFechamento: e.target.value }))}
            />
            <label htmlFor="conta-vencimento">Dia de Vencimento da Fatura</label>
            <input
              id="conta-vencimento"
              type="number"
              min={1}
              max={31}
              value={rasc.diaVencimento}
              onChange={(e) => setRasc((r) => ({ ...r, diaVencimento: e.target.value }))}
            />
          </>
        )}
      </>
    )
  }

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
      icone: { instituicao: c.iconeInstituicao, cor: c.iconeCor, imagemUri: c.iconeImagemUri },
    })
    setConfirmandoExclusaoId(null)
  }

  async function salvarEdicao() {
    if (editandoId == null) return
    await db.contas.update(editandoId, {
      nome: rascunho.nome.trim(),
      tipo: rascunho.tipo,
      iconeInstituicao: rascunho.icone.instituicao,
      iconeCor: rascunho.icone.cor,
      iconeImagemUri: rascunho.icone.imagemUri,
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
      ...marcaDoAmbiente(),
      nome: novaConta.nome.trim(),
      tipo: novaConta.tipo,
      instituicao: novaConta.icone.instituicao || novaConta.nome.trim(),
      iconeInstituicao: novaConta.icone.instituicao,
      iconeCor: novaConta.icone.cor,
      iconeImagemUri: novaConta.icone.imagemUri,
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
        <h1>Contas e Carteiras</h1>
      </div>
      <p className="texto-fraco">
        Todo lugar onde o dinheiro está — conta corrente, cartão de crédito ou cofrinho/investimento.
        Aparecem automaticamente na tela Carteira e no seletor "Pago com" de cada lançamento.
      </p>

      <h2>Cadastradas</h2>
      <div className="cartao">
        {contas.length === 0 && <p className="texto-fraco">Nenhuma conta cadastrada ainda.</p>}
        {contas.map((c) => {
          const temLancamentos = (contagemPorConta.get(c.id!) ?? 0) > 0

          return (
            <div key={c.id} style={{ padding: '5px 0', borderBottom: '1px solid var(--borda)' }}>
              {/* UMA linha por conta (12/09/2026, mesmo pedido feito pra
                  Categorias): ícone · nome · tipo/ciclo · lápis · "⋮" —
                  antes eram duas faixas (conteúdo e ações). */}
              <div className="linha" style={{ border: 'none', padding: 0, gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <SeloInstituicao
                    instituicao={c.iconeInstituicao}
                    cor={c.iconeCor}
                    imagemUri={c.iconeImagemUri}
                    nome={c.nome}
                    tamanho={28}
                  />
                  <span style={{ opacity: c.ativa ? 1 : 0.5, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.nome}
                    <span className="texto-fraco" style={{ fontSize: 11.5 }}>
                      {' · '}{ROTULO_TIPO[c.tipo]}
                      {!c.ativa && ' · inativa'}
                      {c.tipo === 'cartao' && c.diaFechamento ? ` · fecha ${c.diaFechamento}` : ''}
                      {c.tipo === 'cartao' && c.diaVencimento ? ` · vence ${c.diaVencimento}` : ''}
                    </span>
                  </span>
                </div>
                {confirmandoExclusaoId === c.id ? (
                  <>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--vermelho)', cursor: 'pointer', padding: 0, fontSize: 12 }}
                      onClick={() => excluir(c.id!)}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer', padding: 0, fontSize: 12 }}
                      onClick={() => setConfirmandoExclusaoId(null)}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-label={`Editar ${c.nome}`}
                      title="Editar"
                      style={{ background: 'none', border: 'none', color: 'var(--azul)', cursor: 'pointer', padding: 2, display: 'flex', flex: '0 0 auto' }}
                      onClick={() => iniciarEdicao(c)}
                    >
                      <PencilSquareIcon width={16} height={16} />
                    </button>
                    <MenuLinha
                      aberto={menuContaAberta === c.id}
                      onAbrirFechar={() => setMenuContaAberta((atual) => (atual === c.id ? null : c.id!))}
                      onFechar={() => setMenuContaAberta(null)}
                    >
                      {temLancamentos ? (
                        <button type="button" onClick={() => { alternarAtiva(c); setMenuContaAberta(null) }}>
                          {c.ativa ? 'Inativar' : 'Reativar'}
                        </button>
                      ) : (
                        <button type="button" onClick={() => { setConfirmandoExclusaoId(c.id!); setMenuContaAberta(null) }}>
                          Excluir
                        </button>
                      )}
                    </MenuLinha>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <h2>Nova Conta</h2>
      <div className="cartao">
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
      </div>

      {mostrarNova && (
        <ModalCadastro
          titulo="Nova conta"
          rotuloSalvar="Adicionar"
          salvarDesabilitado={!novaConta.nome.trim()}
          onFechar={() => {
            setMostrarNova(false)
            setNovaConta(rascunhoVazio())
          }}
          onSalvar={async () => {
            await adicionarConta()
            setMostrarNova(false)
          }}
        >
          {formularioConta(novaConta, setNovaConta)}
        </ModalCadastro>
      )}

      {contaEmEdicao && (
        <ModalCadastro
          titulo="Editar conta"
          salvarDesabilitado={!rascunho.nome.trim()}
          onFechar={() => setEditandoId(null)}
          onSalvar={salvarEdicao}
        >
          {formularioConta(rascunho, setRascunho)}
        </ModalCadastro>
      )}
    </>
  )
}