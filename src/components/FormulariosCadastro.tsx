/* Os campos de cadastro de CATEGORIA e de GRUPO — um lugar só.
 *
 * Por que existe (build 059): estes formulários viviam dentro de
 * `screens/Categorias.tsx`, e o Planejamento tinha uma versão REDUZIDA própria
 * (`EdicaoRapida.tsx`) com só o campo de valor. As duas divergiram: a build 054
 * corrigiu a tela de Categorias para UM campo de dinheiro por natureza, e o
 * popup do Planejamento continuou pedindo "Meta da categoria" + "Planejado
 * mensal" — dois campos que já não existiam em lugar nenhum. O Rafael achou
 * isso usando o app.
 *
 * A partir daqui só existe um formulário de cada. Quem edita pelo Planejamento
 * vê exatamente a mesma tela de quem edita pelas Configurações; a diferença é
 * só a ORDEM (`valorPrimeiro`), porque quem chega pelo Planejamento veio
 * ajustar o número, não renomear a categoria.
 */
import type React from 'react'
import SeletorComExplicacao, { type OpcaoExplicada } from './SeletorComExplicacao'
import SeletorIcone from './SeletorIcone'
import type { Categoria, ComportamentoGrupo, GrupoRegistro, Natureza, TipoGrupo } from '../db'
import type { EstiloIcone } from '../icones'
import { ROTULO_TIPO_GRUPO, ROTULO_COMPORTAMENTO, EXPLICACAO_COMPORTAMENTO, gruposParaNatureza } from '../gruposUtil'
import { aplicarMascaraValor, formatarMoeda } from '../formatoMoeda'

export const NATUREZAS: Natureza[] = ['Consumo', 'Receita', 'Aporte', 'Neutro', 'Gasto de cofrinho', 'Pagamento de fatura']

export const EXPLICACAO_NATUREZA: Record<Natureza, string> = {
  Consumo: 'Gasto do dia a dia. Tem teto (aceitável) e conta na meta de gasto do grupo.',
  Receita: 'Dinheiro entrando. Soma em "Entrou" e é a base da meta — nunca conta como gasto.',
  Aporte: 'Dinheiro guardado (cofrinho/objetivo). Sai do mês e conta na meta do grupo, como gasto planejado.',
  Neutro: 'Não entra em nenhum total do mês — use pra registro que não é receita nem despesa.',
  'Gasto de cofrinho': 'Uso do dinheiro já guardado. Reduz o cofrinho e não conta de novo como gasto do mês.',
  'Pagamento de fatura': 'Quitação de cartão. Fica fora de Entrou/Saiu — a despesa já entrou na compra.',
  'Transferência': 'Dinheiro trocando de lugar entre contas suas. Nunca entra em Entrou/Saiu nem em meta.',
}
// Naturezas onde faz sentido vincular a categoria a um cofrinho cadastrado —
// "Gasto de cofrinho" é o caso central (pagar direto pelo Bradesco usando uma
// categoria que o Rafael já sabe ser "do cofrinho"); "Aporte" entra também,
// pro caso simétrico. 31/08/2026, rodada seguinte (ponto 7): essa marcação
// NÃO move mais fisicamente o saldo do cofrinho — é só um AJUSTE DE FLUXO
// informativo daquele mês (ver Carteira.tsx e CLAUDE.md), nunca uma
// transferência real de saldo.
export const NATUREZAS_VINCULAVEIS: Natureza[] = ['Gasto de cofrinho', 'Aporte']
export interface RascunhoCategoria {
  nome: string
  grupo: string
  natureza: Natureza
  aceitavelMensal: string
  esperadoMensal: string
  receitaFixa: boolean
  contaVinculada: string
  icone: string
  iconeEstilo: EstiloIcone
  iconeCor: string
}

export function rascunhoVazio(grupoPadrao: string): RascunhoCategoria {
  return {
    nome: '',
    grupo: grupoPadrao,
    natureza: 'Consumo',
    aceitavelMensal: '',
    esperadoMensal: '',
    receitaFixa: false,
    contaVinculada: '',
    icone: 'outros',
    iconeEstilo: 'colorido',
    iconeCor: '#3b82f6',
  }
}

export interface RascunhoGrupo {
  nome: string
  tipo: TipoGrupo
  /* Como o grupo se comporta no mês (build 061) — é ele que diz quem projeta
     por ritmo e quem fica fora da conta de economia. Antes isso era o NOME do
     grupo, chumbado no código. */
  comportamento: ComportamentoGrupo
  icone: string
  iconeEstilo: EstiloIcone
  iconeCor: string
}

export function rascunhoGrupoVazio(): RascunhoGrupo {
  return {
    nome: '', tipo: 'saida', comportamento: 'fixo',
    icone: 'outros', iconeEstilo: 'colorido', iconeCor: '#3b82f6',
  }
}

/** Rascunho a partir de uma categoria já gravada — usado pelas duas telas. */
export function rascunhoDeCategoria(cat: Categoria): RascunhoCategoria {
  return {
    nome: cat.nome,
    grupo: cat.grupo,
    natureza: cat.natureza,
    aceitavelMensal: formatarMoeda(cat.aceitavelMensal),
    esperadoMensal: formatarMoeda(cat.esperadoMensal ?? 0),
    receitaFixa: !!cat.receitaFixa,
    contaVinculada: cat.contaVinculada ? String(cat.contaVinculada) : '',
    icone: cat.icone ?? 'outros',
    iconeEstilo: (cat.iconeEstilo ?? 'colorido') as EstiloIcone,
    iconeCor: cat.iconeCor ?? '#3b82f6',
  }
}

export function CamposGrupo({
  rascunho,
  setRascunho,
  tipoTravado,
}: {
  rascunho: RascunhoGrupo
  setRascunho: React.Dispatch<React.SetStateAction<RascunhoGrupo>>
  tipoTravado: boolean
}) {
return (
    <>
      <label htmlFor="grupo-nome">Nome</label>
      <input
        id="grupo-nome"
        type="text"
        value={rascunho.nome}
        onChange={(e) => setRascunho((r) => ({ ...r, nome: e.target.value }))}
      />
      {/* Item 11 (16/09/2026): o seletor de ícone passou a vir logo abaixo
          do Nome — antes vinha por último, depois de Tipo/Comportamento. */}
      <div style={{ marginTop: 8 }}>
        <SeletorIcone
          icone={rascunho.icone}
          estilo={rascunho.iconeEstilo}
          cor={rascunho.iconeCor}
          onChange={({ icone, estilo, cor }) => setRascunho((r) => ({ ...r, icone, iconeEstilo: estilo, iconeCor: cor }))}
        />
      </div>
      <span style={{ display: 'block', fontSize: 12, color: 'var(--texto-fraco)', margin: '10px 0 6px' }}>Tipo</span>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['saida', 'entrada'] as TipoGrupo[]).map((t) => (
          <button
            key={t}
            type="button"
            disabled={tipoTravado && rascunho.tipo !== t}
            onClick={() => setRascunho((r) => ({ ...r, tipo: t }))}
            style={{
              flex: 1,
              marginTop: 0,
              padding: '10px 12px',
              borderRadius: 10,
              cursor: tipoTravado ? 'not-allowed' : 'pointer',
              border: `1px solid ${rascunho.tipo === t ? 'var(--azul)' : 'var(--borda)'}`,
              background: rascunho.tipo === t ? 'var(--bg-elevado)' : 'none',
              color: 'var(--texto)',
              fontWeight: rascunho.tipo === t ? 700 : 400,
              opacity: tipoTravado && rascunho.tipo !== t ? 0.4 : 1,
            }}
          >
            {ROTULO_TIPO_GRUPO[t]}
          </button>
        ))}
      </div>
      <p className="texto-fraco" style={{ marginTop: 6, marginBottom: 0, fontSize: 12 }}>
        {tipoTravado
          ? 'O tipo não pode mudar enquanto houver categoria vinculada a este grupo — mova as categorias primeiro.'
          : rascunho.tipo === 'entrada'
            ? 'Só aceita categoria de natureza Receita.'
            : 'Aceita todas as naturezas, menos Receita.'}
      </p>

      {/* COMPORTAMENTO (build 061). Só existe em grupo de saída: é o que
          substitui a regra que vivia chumbada no código pelo NOME do grupo. */}
      {rascunho.tipo === 'saida' && (
        <>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--texto-fraco)', margin: '12px 0 6px' }}>
            Como esse gasto se comporta
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(['fixo', 'variavel', 'guardar'] as ComportamentoGrupo[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setRascunho((r) => ({ ...r, comportamento: c }))}
                data-testid={`comportamento-${c}`}
                aria-pressed={rascunho.comportamento === c}
                style={{
                  marginTop: 0, padding: '9px 12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                  border: `1px solid ${rascunho.comportamento === c ? 'var(--azul)' : 'var(--borda)'}`,
                  background: rascunho.comportamento === c ? 'var(--bg-elevado)' : 'none',
                  color: 'var(--texto)',
                }}
              >
                <span style={{ display: 'block', fontWeight: rascunho.comportamento === c ? 700 : 600, fontSize: 13 }}>
                  {ROTULO_COMPORTAMENTO[c]}
                </span>
                <span className="texto-quebra" style={{ display: 'block', fontSize: 11.5, color: 'var(--texto-fraco)' }}>
                  {EXPLICACAO_COMPORTAMENTO[c]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}

export function CamposCategoria({
  rasc,
  setRasc,
  gruposAtivos,
  contasVinculaveis,
  valorPrimeiro = false,
}: {
  rasc: RascunhoCategoria
  setRasc: React.Dispatch<React.SetStateAction<RascunhoCategoria>>
  gruposAtivos: GrupoRegistro[]
  contasVinculaveis: { id?: number; nome: string }[]
  /* Quem chega pelo Planejamento veio ajustar o NÚMERO — ele vem primeiro, e o
     cadastro (nome, natureza, grupo, ícone) fica abaixo. Pelas Configurações a
     ordem é a de sempre: identificação primeiro. */
  valorPrimeiro?: boolean
}) {
  const gruposValidos = gruposParaNatureza(gruposAtivos, rasc.natureza)
  const camposDeValor = (
    <>
      {/* 12/09/2026 (build 054) — o Rafael, com razão: "quando a natureza é
          Receita... pede 2 campos Meta e Planejado, por que esse segundo?".
          Meta é TETO DE GASTO: não existe teto pra dinheiro que entra, e o
          valor numa categoria de Receita não era lido por tela nenhuma. Por
          isso some quando a natureza é Receita, e no lugar entra o esperado —
          que é o lado Entradas do Planejamento. */}
      {rasc.natureza !== 'Receita' && (
        <>
          <label htmlFor="cat-aceitavel">Meta da categoria (R$)</label>
          <input
            id="cat-aceitavel"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={rasc.aceitavelMensal}
            onChange={(e) => setRasc((r) => ({ ...r, aceitavelMensal: aplicarMascaraValor(e.target.value) }))}
          />
        </>
      )}
      {rasc.natureza === 'Receita' && (
        <>
          <label htmlFor="cat-esperado">Quanto espera receber por mês (R$)</label>
          <input
            id="cat-esperado"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={rasc.esperadoMensal}
            onChange={(e) => setRasc((r) => ({ ...r, esperadoMensal: aplicarMascaraValor(e.target.value) }))}
          />
          {/* Flag de receita FIXA: é a soma destas categorias, no mês da tela,
              que forma o 100% sobre o qual os percentuais de meta incidem. */}
          <label
            htmlFor="cat-receita-fixa"
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          >
            <input
              id="cat-receita-fixa"
              type="checkbox"
              checked={rasc.receitaFixa}
              onChange={(e) => setRasc((r) => ({ ...r, receitaFixa: e.target.checked }))}
              style={{ width: 18, height: 18, flex: 'none' }}
              data-testid="campo-receita-fixa"
            />
            <span>É receita fixa (entra na base das metas)</span>
          </label>
          <p className="texto-fraco" style={{ marginTop: -4 }}>
            Marque a renda que se repete todo mês (salário, pró-labore, aluguel recebido).
            A soma dessas categorias no mês é o 100% das metas de grupo.
          </p>
        </>
      )}
    </>
  )
  const grupoEscolhido = gruposValidos.some((g) => g.nome === rasc.grupo) ? rasc.grupo : (gruposValidos[0]?.nome ?? '')
  return (
    <>
      {valorPrimeiro && camposDeValor}
      <label htmlFor="cat-nome">Nome</label>
      <input
        id="cat-nome"
        type="text"
        value={rasc.nome}
        onChange={(e) => setRasc((r) => ({ ...r, nome: e.target.value }))}
      />
      {/* Item 11 (16/09/2026): o seletor de ícone passou a vir logo abaixo
          do Nome — antes vinha por último, depois de Natureza/Grupo/etc. */}
      <div style={{ marginTop: 8 }}>
        <SeletorIcone
          icone={rasc.icone}
          estilo={rasc.iconeEstilo}
          cor={rasc.iconeCor}
          onChange={({ icone, estilo, cor }) => setRasc((r) => ({ ...r, icone, iconeEstilo: estilo, iconeCor: cor }))}
        />
      </div>
      <label htmlFor="cat-natureza">Natureza</label>
      <SeletorComExplicacao<Natureza>
        id="cat-natureza"
        titulo="Natureza da categoria"
        valor={rasc.natureza}
        opcoes={NATUREZAS.map((n): OpcaoExplicada<Natureza> => ({ valor: n, rotulo: n, explicacao: EXPLICACAO_NATUREZA[n] }))}
        onEscolher={(natureza) => {
          const permitidos = gruposParaNatureza(gruposAtivos, natureza)
          setRasc((r) => ({
            ...r,
            natureza,
            grupo: permitidos.some((g) => g.nome === r.grupo) ? r.grupo : (permitidos[0]?.nome ?? ''),
          }))
        }}
      />
      <label htmlFor="cat-grupo">Grupo</label>
      <select
        id="cat-grupo"
        value={grupoEscolhido}
        onChange={(e) => setRasc((r) => ({ ...r, grupo: e.target.value }))}
      >
        {gruposValidos.map((g2) => (
          <option key={g2.id} value={g2.nome}>
            {g2.nome}
          </option>
        ))}
      </select>
      <p className="texto-fraco" style={{ marginTop: 4, marginBottom: 0, fontSize: 12 }}>
        Só aparecem grupos de {ROTULO_TIPO_GRUPO[rasc.natureza === 'Receita' ? 'entrada' : 'saida']} — é a
        natureza da categoria que define onde ela pode ser vinculada.
      </p>
      {!valorPrimeiro && camposDeValor}
      {NATUREZAS_VINCULAVEIS.includes(rasc.natureza) && contasVinculaveis.length > 0 && (
        <>
          <label htmlFor="cat-cofrinho">Vincular a um cofrinho (opcional)</label>
          <select
            id="cat-cofrinho"
            value={rasc.contaVinculada}
            onChange={(e) => setRasc((r) => ({ ...r, contaVinculada: e.target.value }))}
          >
            <option value="">Nenhum</option>
            {contasVinculaveis.map((c2) => (
              <option key={c2.id} value={c2.id}>
                {c2.nome}
              </option>
            ))}
          </select>
          <p className="texto-fraco" style={{ marginTop: 4, marginBottom: 0 }}>
            Ajuste de fluxo, não movimentação real: um lançamento nesta categoria, mesmo pago por outra conta
            (ex.: direto pelo Bradesco), aparece como nota informativa no cofrinho — não altera o saldo dele, só
            sinaliza que esse gasto substituiu parte do aporte daquele mês.
          </p>
        </>
      )}
    </>
  )
}
