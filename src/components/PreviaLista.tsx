/* QUADROS DE PRÉVIA — build 094 (17/09/2026), item 2 do Rafael.
 *
 * *"mostrar abaixo dessa config um quadro de exemplo do tamanho real hoje e
 * conforme vai mexendo ele apresenta a prévia do resultado. Esse quadro de
 * prévia quero que aplique tbm na mesma tela em que permite mudar os tamanhos
 * dos icones, quero um exemplo do lado. esses exemplos não podem ser unicos,
 * devem ser de uns 3 casos, exemplo: e lançamentos, no caso de grupos, exemplo
 * de 2 grupos com categorias dentro."*
 *
 * OS TRÊS CASOS, um por tipo de linha que os dois parâmetros alcançam:
 *   1. lançamentos  — a listagem Completa (Lançamentos e Carteira);
 *   2. categorias   — a linha de categoria cadastrada;
 *   3. grupos       — DOIS grupos, cada um com categorias dentro.
 * A prévia da FONTE mostra só o caso 1 (é só ali que o zoom chega); a dos
 * ÍCONES mostra os três, porque são três percentuais independentes e cada um
 * governa um deles.
 *
 * A PRÉVIA USA O COMPONENTE DE VERDADE (`LinhaLancamentoCompleta`), não uma
 * imitação: qualquer mudança futura na linha aparece aqui sozinha, e nunca
 * existe o caso — que já mordeu este projeto em outras telas — de a prévia
 * dizer uma coisa e a tela mostrar outra. O que torna isso seguro é o
 * `pointer-events: none` no quadro inteiro: nada aqui é clicável, então a
 * tarja de status nunca chega a chamar `alternarPago` com um lançamento que
 * não existe no banco.
 *
 * O ZOOM ENTRA PELA VARIÁVEL CSS, redefinida no próprio quadro
 * (`--zoom-lista`). É por isso que "hoje" e "como vai ficar" podem conviver na
 * mesma tela, com a mesma marcação e valores diferentes — ver `zoomListas.ts`.
 */
import type { CSSProperties } from 'react'
import type { Categoria, Lancamento } from '../db'
import LinhaLancamentoCompleta from './LinhaLancamentoCompleta'
import { Icone } from '../icones'
import { tamanhoIconePx, useConfiguracaoIcones } from '../configuracaoIcones'
import { fatorDoZoom } from '../zoomListas'
import { fmtNum } from '../formatoMoeda'
import { COR_PADRAO_CATEGORIAS, COR_PADRAO_GRUPOS } from '../pacotesIcones'

/* As cores vêm das constantes da plataforma (`pacotesIcones.ts`), nunca de um
   hex escrito aqui: se o padrão da Morfo mudar, o exemplo muda junto.

   Dados de exemplo — inventados de propósito, nunca lidos do banco: a prévia
   precisa mostrar SEMPRE os mesmos três casos (incluindo um parcelado e uma
   entrada), e um ambiente recém-instalado não tem lançamento nenhum. Os `id`
   negativos deixam explícito que não são registros. */
const CAT_EXEMPLO: Record<string, Categoria> = {
  mercado: { id: -1, nome: 'Mercado', grupo: 'Variável', natureza: 'Consumo', aceitavelMensal: 0, ativa: true, icone: 'mercado', iconeEstilo: 'preenchido', iconeCor: COR_PADRAO_CATEGORIAS },
  assinatura: { id: -2, nome: 'Assinaturas', grupo: 'Fixo', natureza: 'Consumo', aceitavelMensal: 0, ativa: true, icone: 'streaming', iconeEstilo: 'preenchido', iconeCor: COR_PADRAO_CATEGORIAS },
  salario: { id: -3, nome: 'Salário', grupo: 'Receita', natureza: 'Receita', aceitavelMensal: 0, ativa: true, icone: 'salario', iconeEstilo: 'preenchido', iconeCor: COR_PADRAO_CATEGORIAS },
}

const LANCAMENTOS_EXEMPLO: { lanc: Lancamento; cat: Categoria; origem: string }[] = [
  {
    lanc: { id: -11, descricao: 'Supermercado do bairro', valor: -238.9, dataCompetencia: '2026-09-12', dataCaixa: '2026-09-12', categoriaId: -1, contaId: -1, pagoPor: 'conta', status: 'manual', pago: true },
    cat: CAT_EXEMPLO.mercado,
    origem: 'Banco',
  },
  {
    lanc: { id: -12, descricao: 'Plano anual', valor: -49.9, dataCompetencia: '2026-09-14', dataCaixa: '2026-09-14', categoriaId: -2, contaId: -1, pagoPor: 'cartao', status: 'manual', pago: false, recorrencia: 'parcelado', parcelaI: 2, parcelaN: 12 },
    cat: CAT_EXEMPLO.assinatura,
    origem: 'Cartão de crédito',
  },
  {
    lanc: { id: -13, descricao: 'Salário', valor: 3000, dataCompetencia: '2026-09-05', dataCaixa: '2026-09-05', categoriaId: -3, contaId: -1, pagoPor: 'conta', status: 'manual', pago: true },
    cat: CAT_EXEMPLO.salario,
    origem: 'Banco',
  },
]

const GRUPOS_EXEMPLO = [
  {
    nome: 'Fixo',
    icone: 'cofreDigital',
    categorias: [CAT_EXEMPLO.assinatura, { ...CAT_EXEMPLO.mercado, nome: 'Moradia', icone: 'casa' }],
  },
  {
    nome: 'Variável',
    icone: 'cadeadoAberto',
    categorias: [CAT_EXEMPLO.mercado, { ...CAT_EXEMPLO.assinatura, nome: 'Lazer', icone: 'lazer' }],
  },
]

/** O caso 1: três linhas da listagem Completa, com o cabeçalho de data. */
function CasoLancamentos() {
  return (
    <div data-testid="previa-caso-lancamentos">
      <div className="sessao-data status-fundo-feito">12 de Setembro (Sáb)</div>
      {LANCAMENTOS_EXEMPLO.map(({ lanc, cat, origem }) => (
        <LinhaLancamentoCompleta
          key={lanc.id}
          lancamento={lanc}
          categoria={cat}
          origemLabel={origem}
          onAbrir={() => {}}
        />
      ))}
    </div>
  )
}

/** O caso 2: a linha de categoria cadastrada — mesmas classes da aba "Categorias". */
function CasoCategorias({ pctCategoria }: { pctCategoria: number }) {
  return (
    <div data-testid="previa-caso-categorias">
      {[CAT_EXEMPLO.mercado, CAT_EXEMPLO.salario].map((c) => (
        <div key={c.id} className="linha linha-categoria-icone" style={{ border: 'none', padding: 0, gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <Icone id={c.icone} estilo={c.iconeEstilo} cor={c.iconeCor} tamanho={tamanhoIconePx('categoria', pctCategoria)} />
            <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</strong>
          </div>
          <span className="texto-fraco" style={{ fontSize: 12 }}>{c.natureza}</span>
        </div>
      ))}
    </div>
  )
}

/** O caso 3: dois grupos, com categorias dentro — o exemplo que ele nomeou. */
function CasoGrupos({ pctGrupo, pctCategoria }: { pctGrupo: number; pctCategoria: number }) {
  return (
    <div data-testid="previa-caso-grupos">
      {GRUPOS_EXEMPLO.map((g) => (
        <div key={g.nome} style={{ marginBottom: 6 }}>
          <div className="linha linha-cabecalho-grupo" style={{ border: 'none', marginTop: 8, marginBottom: 2, alignItems: 'center' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icone id={g.icone} estilo="preenchido" cor={COR_PADRAO_GRUPOS} tamanho={tamanhoIconePx('grupo', pctGrupo)} />
              {g.nome}
            </h2>
            <span className="texto-fraco" style={{ fontSize: 12 }}>meta {fmtNum(1500)}</span>
          </div>
          <div style={{ paddingLeft: 12 }}>
            {g.categorias.map((c, i) => (
              <div key={i} className="linha linha-categoria-icone" style={{ border: 'none', padding: 0, gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <Icone id={c.icone} estilo={c.iconeEstilo} cor={c.iconeCor} tamanho={tamanhoIconePx('categoria', pctCategoria)} />
                  <span>{c.nome}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * O quadro. `zoomPct` redefine o fator só aqui dentro — é o que permite
 * mostrar "hoje" (o valor em vigor) e "como vai ficar" (o rascunho) na mesma
 * tela. `casos` escolhe quais dos três exemplos entram.
 */
export default function PreviaLista({
  titulo,
  zoomPct,
  casos = ['lancamentos'],
  testid,
}: {
  titulo: string
  zoomPct: number
  casos?: ('lancamentos' | 'categorias' | 'grupos')[]
  testid?: string
}) {
  const { pctCategoria, pctGrupo } = useConfiguracaoIcones()
  /* `--zoom-lista` não existe no tipo de `CSSProperties` (é variável CSS, não
     propriedade conhecida) — o cast é o caminho normal em React pra isso. */
  const estilo = { '--zoom-lista': fatorDoZoom(zoomPct) } as CSSProperties

  return (
    <div className="previa-lista" data-testid={testid}>
      <div className="previa-lista-titulo">{titulo}</div>
      {/* `pointer-events: none` (ver `.previa-lista-quadro` no index.css): o
          quadro usa os componentes de verdade, e nenhum deles pode ser
          acionado a partir daqui. */}
      <div className="previa-lista-quadro" style={estilo}>
        {casos.includes('lancamentos') && <CasoLancamentos />}
        {casos.includes('categorias') && <CasoCategorias pctCategoria={pctCategoria} />}
        {casos.includes('grupos') && <CasoGrupos pctGrupo={pctGrupo} pctCategoria={pctCategoria} />}
      </div>
    </div>
  )
}
