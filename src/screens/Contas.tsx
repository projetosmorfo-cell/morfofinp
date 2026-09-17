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
import ConfirmacaoAcao from '../components/ConfirmacaoAcao'
import { AVISO_ULTIMO_COFRINHO, AVISO_COFRINHO_PADRAO_FIXO, MOTIVO_COFRINHO_PADRAO_TRAVADO, ehCofrinhoPadrao, ehUltimoCofrinho } from '../contasCofrinho'
import { aplicarMascaraValor, formatarMoeda, paraNumero } from '../formatoMoeda'

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
  /* SALDO INICIAL (build 096, 17/09/2026). Os dois campos existem em `Conta`
     desde o começo do projeto e são LIDOS de verdade — `totalDoLugar`
     (`totaisCarteira.ts`) soma `saldoInicial` ao que veio antes do mês pra
     formar o "Total acumulado" de conta corrente e cofrinho. O que faltava
     era a tela: até aqui `Contas.tsx` gravava 0 e `hoje()` fixos, então o
     acumulado de quem já tinha dinheiro antes de começar a usar o app nascia
     errado por construção. Cartão não tem saldo inicial — o número dele é a
     fatura do ciclo, e `totalDoLugar` nem chega a ler o campo. */
  saldoInicial: string
  dataSaldoInicial: string
}

function rascunhoVazio(): RascunhoConta {
  return {
    nome: '', tipo: 'corrente', diaFechamento: '9', diaVencimento: '16', icone: {},
    saldoInicial: '', dataSaldoInicial: hoje(),
  }
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
//
// MODO PRIMEIRO ACESSO (build 096, 17/09/2026) — pedido do Rafael: "não seria
// interessante no passo a passo inicial de primeiro acesso, abrir tela pra
// informar saldo inicial e data após ou junto com cadastro de contas? Aliás o
// cadastro das contas está no passo a passo inicial?". Não estava: o passo a
// passo tinha dois passos (receita fixa e categorias/grupos/metas) e nunca
// falou de onde o dinheiro está. Esta MESMA tela é o passo 2 agora — peça
// única, nunca uma cópia reduzida (a mesma escolha já feita em `Categorias`).
export default function Contas({
  aoVoltar,
  primeiroAcesso,
}: {
  aoVoltar: () => void
  primeiroAcesso?: { aoConcluir: () => void }
}) {
  const contas = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), [])
  const lancamentos = useLiveQuery(() => lerDoAmbiente(db.lancamentos.toArray()), [])

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [rascunho, setRascunho] = useState<RascunhoConta>(rascunhoVazio())
  const [confirmandoExclusaoId, setConfirmandoExclusaoId] = useState<number | null>(null)
  const [menuContaAberta, setMenuContaAberta] = useState<number | null>(null)
  const [mostrarNova, setMostrarNova] = useState(false)
  const [novaConta, setNovaConta] = useState<RascunhoConta>(rascunhoVazio())
  /* A frase do bloqueio do último cofrinho — visível, nunca um clique que não
     faz nada (mesma disciplina do "salvar sem ação" já documentada). */
  const [avisoCofrinho, setAvisoCofrinho] = useState<string | null>(null)

  const contaEmEdicao = (contas ?? []).find((c) => c.id === editandoId) ?? null

  /* Formulário da conta — o MESMO nos dois popups (nova e edição), pra não
     existirem dois desenhos que podem divergir (11/09/2026, "Nos cadastros
     todos do sistema, deve abrir popup e nunca na mesma tela"). */
  /* `travado` = este é o COFRINHO PADRÃO (build 087, pedido do Rafael: "ele
     deve aparecer no cadastro para manutenção pelo menos de ícone, o resto dos
     campos pode deixar bloqueado (somente no Cofrinho padrão)").

     Nome e ícone ficam FORA do fieldset porque são exatamente o que a Carteira
     lê daquele registro — é a manutenção que ele pediu. O resto entra num
     `<fieldset disabled>`, não `disabled` campo a campo: é a regra documentada
     desde a build 052, e é o que faz o bloqueio valer também para componentes
     próprios (`SeletorComExplicacao`) e para qualquer campo que venha a ser
     acrescentado aqui depois.

     Só o cofrinho PADRÃO trava. Cofrinho que o usuário cadastrou continua
     editável por inteiro — `ehCofrinhoPadrao` é a única régua. */
  function formularioConta(
    rasc: RascunhoConta,
    setRasc: React.Dispatch<React.SetStateAction<RascunhoConta>>,
    travado = false,
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
        {/* A frase do bloqueio: uma linha, dizendo o que dá pra mudar e por
            que o resto não dá — um bloqueio sem motivo visível parece defeito. */}
        {travado && (
          <p className="texto-fraco texto-quebra" data-testid="motivo-cofrinho-padrao" style={{ margin: '4px 0 10px', fontSize: 12 }}>
            {MOTIVO_COFRINHO_PADRAO_TRAVADO}
          </p>
        )}
        <fieldset className="campos-travaveis" disabled={travado}>
        <label htmlFor="conta-tipo">Tipo</label>
        <SeletorComExplicacao<TipoConta>
          id="conta-tipo"
          titulo="Tipo da carteira"
          valor={rasc.tipo}
          opcoes={(Object.keys(ROTULO_TIPO) as TipoConta[]).map((t): OpcaoExplicada<TipoConta> => ({ valor: t, rotulo: ROTULO_TIPO[t], explicacao: EXPLICACAO_TIPO[t] }))}
          onEscolher={(tipo) => setRasc((r) => ({ ...r, tipo }))}
        />
        {rasc.tipo !== 'cartao' && (
          <>
            <label htmlFor="conta-saldo-inicial">Saldo Inicial</label>
            <input
              id="conta-saldo-inicial"
              type="text"
              inputMode="numeric"
              placeholder="0,00"
              value={rasc.saldoInicial}
              onChange={(e) => setRasc((r) => ({ ...r, saldoInicial: aplicarMascaraValor(e.target.value) }))}
            />
            <label htmlFor="conta-data-saldo">Data desse Saldo</label>
            <input
              id="conta-data-saldo"
              type="date"
              value={rasc.dataSaldoInicial}
              onChange={(e) => setRasc((r) => ({ ...r, dataSaldoInicial: e.target.value }))}
            />
            <p className="texto-fraco texto-quebra" style={{ margin: '4px 0 10px', fontSize: 12 }}>
              Quanto já havia nesta conta antes de você começar a lançar aqui, e em que dia.
              É a partir dele que a Carteira monta o total acumulado. Sem nada guardado ainda,
              deixe zerado.
            </p>
          </>
        )}
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
        </fieldset>
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
      saldoInicial: c.saldoInicial ? formatarMoeda(c.saldoInicial) : '',
      dataSaldoInicial: c.dataSaldoInicial || hoje(),
    })
    setConfirmandoExclusaoId(null)
    setAvisoCofrinho(null)
  }

  async function salvarEdicao() {
    if (editandoId == null) return
    /* PROTEÇÃO DO ÚLTIMO COFRINHO, caminho indireto (build 086): trocar o tipo
       do último cofrinho ativo para outra coisa o faz sumir tanto quanto
       excluir. Editar nome, ícone e qualquer outro campo continua livre — é
       só a saída do tipo 'cofre' que é barrada. */
    const atual = (contas ?? []).find((c) => c.id === editandoId)
    if (atual && rascunho.tipo !== 'cofre' && ehUltimoCofrinho(atual, contas)) {
      setAvisoCofrinho(AVISO_ULTIMO_COFRINHO)
      return
    }
    /* Cinto e suspensório: o Tipo já está dentro do `<fieldset disabled>` do
       cofrinho padrão, então não há como chegar aqui pela tela. A checagem
       existe porque a proteção é de DADO, não de campo — a mesma disciplina da
       build 086, que cobriu os três caminhos que zeram o conjunto. */
    if (atual && ehCofrinhoPadrao(atual) && rascunho.tipo !== 'cofre') {
      setAvisoCofrinho(AVISO_COFRINHO_PADRAO_FIXO)
      return
    }
    await db.contas.update(editandoId, {
      nome: rascunho.nome.trim(),
      tipo: rascunho.tipo,
      iconeInstituicao: rascunho.icone.instituicao,
      iconeCor: rascunho.icone.cor,
      iconeImagemUri: rascunho.icone.imagemUri,
      diaFechamento: rascunho.tipo === 'cartao' ? diaValido(rascunho.diaFechamento, 1) : undefined,
      diaVencimento: rascunho.tipo === 'cartao' ? diaValido(rascunho.diaVencimento, 10) : undefined,
      /* Cartão continua com saldo inicial zerado: `totalDoLugar` não lê o campo
         nele, e gravar um número que ninguém usa seria criar uma divergência
         silenciosa entre o que a tela mostra e o que o cálculo faz. */
      saldoInicial: rascunho.tipo === 'cartao' ? 0 : paraNumero(rascunho.saldoInicial),
      dataSaldoInicial: rascunho.dataSaldoInicial || hoje(),
    })
    setEditandoId(null)
    setAvisoCofrinho(null)
  }

  async function excluir(id: number) {
    const alvo = (contas ?? []).find((c) => c.id === id)
    /* O cofrinho PADRÃO não se exclui: ele é o registro do card virtual da
       Carteira, e a migração que o cria roda uma vez só — excluído, o cadastro
       voltaria a não ter a linha dele, que é exatamente o que o Rafael
       reportou nesta rodada. */
    if (alvo && ehCofrinhoPadrao(alvo)) {
      setAvisoCofrinho(AVISO_COFRINHO_PADRAO_FIXO)
      setConfirmandoExclusaoId(null)
      return
    }
    if (alvo && ehUltimoCofrinho(alvo, contas)) {
      setAvisoCofrinho(AVISO_ULTIMO_COFRINHO)
      setConfirmandoExclusaoId(null)
      return
    }
    await db.contas.delete(id)
    setConfirmandoExclusaoId(null)
    setAvisoCofrinho(null)
  }

  async function alternarAtiva(c: Conta) {
    // Inativar o último cofrinho ativo é o mesmo que ficar sem nenhum.
    // Reativar nunca é bloqueado.
    if (c.ativa && ehCofrinhoPadrao(c)) {
      setAvisoCofrinho(AVISO_COFRINHO_PADRAO_FIXO)
      return
    }
    if (c.ativa && ehUltimoCofrinho(c, contas)) {
      setAvisoCofrinho(AVISO_ULTIMO_COFRINHO)
      return
    }
    await db.contas.update(c.id!, { ativa: !c.ativa })
    setAvisoCofrinho(null)
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
      saldoInicial: novaConta.tipo === 'cartao' ? 0 : paraNumero(novaConta.saldoInicial),
      dataSaldoInicial: novaConta.dataSaldoInicial || hoje(),
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
        {!primeiroAcesso && (
          <button type="button" className="botao-voltar-config" onClick={aoVoltar}>
            ‹ Voltar
          </button>
        )}
        {primeiroAcesso && (
          <p className="ideal-t4" style={{ margin: '0 0 4px', color: 'var(--azul)', fontWeight: 600 }} data-testid="primeiro-acesso-passo">
            Passo 2 de 3 — onde seu dinheiro está
          </p>
        )}
        <h1>Contas e Carteiras</h1>
      </div>
      {primeiroAcesso ? (
        <p className="texto-fraco texto-quebra" data-testid="primeiro-acesso-orientacao-contas">
          Cadastre onde seu dinheiro está hoje — conta do banco, cartão de crédito e cofrinho —
          e informe o <strong>saldo inicial</strong> de cada conta: quanto já havia ali antes de
          você começar a lançar no app, e em que dia. É esse número que faz o total da Carteira
          bater com o do banco desde o primeiro dia.
        </p>
      ) : (
        <p className="texto-fraco">
          Todo lugar onde o dinheiro está — conta corrente, cartão de crédito ou cofrinho/investimento.
          Aparecem automaticamente na tela Carteira e no seletor "Pago com" de cada lançamento.
        </p>
      )}

      <h2>Cadastradas</h2>
      {avisoCofrinho && (
        <p className="valor-neg texto-quebra" data-testid="aviso-ultimo-cofrinho" style={{ margin: '0 0 8px' }}>
          {avisoCofrinho}
        </p>
      )}
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
                      {/* Build 087: quem é o cofrinho PADRÃO se lê na própria
                          lista — é ele que tem campo travado ao editar. */}
                      {c.cofrinhoPadrao && ' · padrão do app'}
                      {!c.ativa && ' · inativa'}
                      {c.tipo === 'cartao' && c.diaFechamento ? ` · fecha ${c.diaFechamento}` : ''}
                      {c.tipo === 'cartao' && c.diaVencimento ? ` · vence ${c.diaVencimento}` : ''}
                    </span>
                  </span>
                </div>
                {confirmandoExclusaoId === c.id && (
                  /* Build 093 (item 5): a confirmação única do app
                     (`ConfirmacaoAcao`) no lugar dos dois links de texto. */
                  <ConfirmacaoAcao
                    titulo={`Excluir a conta "${c.nome}"?`}
                    testid="confirmacao-excluir-conta"
                    aviso="A conta é apagada de vez. Só é possível excluir uma conta sem lançamento — por isso nenhum lançamento é afetado. O cofrinho padrão do app e o último cofrinho ativo não podem ser excluídos."
                    onCancelar={() => setConfirmandoExclusaoId(null)}
                    onConfirmar={() => void excluir(c.id!)}
                  />
                )}
                {(
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
          {formularioConta(rascunho, setRascunho, ehCofrinhoPadrao(contaEmEdicao))}
        </ModalCadastro>
      )}

      {/* Rodapé do PASSO 2 do primeiro acesso — mesma peça e mesma técnica do
          passo 3 (`Categorias.tsx`): fixo embaixo, o botão só libera com o
          mínimo, e a linha acima dele diz o que falta. O mínimo aqui é ter
          onde o dinheiro cai: pelo menos uma conta ativa que não seja cartão
          (num cartão o dinheiro não fica, ele só vira fatura). */}
      {primeiroAcesso && (() => {
        const pode = contas.some((c) => c.ativa && c.tipo !== 'cartao')
        return (
          <div className="rodape-totais-fixo rodape-primeiro-acesso" data-testid="primeiro-acesso-rodape-contas">
            {!pode && (
              <p className="valor-neg texto-quebra" style={{ margin: '0 0 6px', fontSize: 12.5 }} data-testid="primeiro-acesso-falta-contas">
                Cadastre pelo menos uma conta corrente ou cofrinho — é onde o dinheiro fica.
              </p>
            )}
            <button
              type="button"
              className="primario"
              style={{ width: '100%', marginTop: 0 }}
              disabled={!pode}
              data-testid="primeiro-acesso-concluir-contas"
              onClick={primeiroAcesso.aoConcluir}
            >
              Continuar para o passo 3
            </button>
          </div>
        )
      })()}
    </>
  )
}