/* Identidade do AMBIENTE na barra do topo do N1 — logo do cliente + nome do
   ambiente, montados conforme os parâmetros de "Meu Ambiente".

   Existe como peça própria (10/09/2026, Decisão 58) por dois motivos:
   1. o pedido do Rafael — "na config de logo + nome, deve ter parâmetro pra
      escolher se juntos ou separados, qual esquerda e qual direita" — deixou
      de ser um `justifyContent` só e virou uma montagem com três zonas
      (esquerda/centro/direita), a MESMA mecânica que o Kit já usa no
      cabeçalho do site (`posicaoMorfo`/`posicaoProduto` independentes:
      posições iguais = lado a lado, diferentes = cada um na sua ponta);
   2. a prévia dentro de "Meu Ambiente" e a barra de verdade passam a usar
      esta mesma função — antes eram dois desenhos parecidos, que podiam
      (e iam) discordar um do outro.

   Referência no Projeto Modelo: `TenantBrandBar` — de onde vêm `logoTopo`,
   `logoModo` (com os TRÊS valores, incluindo `so_nome`) e `logoPos`.
   Reconferido em 11/09/2026: sem divergência. */
import type { ReactNode } from 'react'
import type { TenantKit } from './kitPlatform'

export interface IdentidadeResolvida {
  logoQuadrada?: string
  logoHoriz?: string
  topo: 'quadrada' | 'horizontal'
  modo: 'logo_nome' | 'so_logo' | 'so_nome'
  composicao: 'juntos' | 'separados'
  ordem: 'logo_nome' | 'nome_logo'
  posLogo: 'esquerda' | 'centro' | 'direita'
  posNome: 'esquerda' | 'centro' | 'direita'
  nome: string
}

export function identidadeDoTenant(tenant?: TenantKit): IdentidadeResolvida {
  const logoQuadrada = tenant?.logoQuadradaUri ?? tenant?.logoUri
  const logoHoriz = tenant?.logoHorizUri
  return {
    logoQuadrada,
    logoHoriz,
    topo: tenant?.logoTopo ?? (logoHoriz && !logoQuadrada ? 'horizontal' : 'quadrada'),
    modo: tenant?.logoModo ?? 'logo_nome',
    composicao: tenant?.logoComposicao ?? 'juntos',
    ordem: tenant?.logoOrdem ?? 'logo_nome',
    posLogo: tenant?.logoPos ?? 'esquerda',
    posNome: tenant?.nomePos ?? 'direita',
    nome: tenant?.companyName ?? '',
  }
}

/* "Os dois elementos aparecem ao mesmo tempo?" — é o que decide se os campos
   de composição fazem alguma diferença (com um elemento só, "juntos ou
   separados" não quer dizer nada). */
export function identidadeTemLogoENome(tenant?: TenantKit): boolean {
  const i = identidadeDoTenant(tenant)
  if (i.topo === 'horizontal' && i.logoHoriz) return false // a horizontal já traz o nome escrito
  return !!i.logoQuadrada && i.modo === 'logo_nome'
}

export default function ZonasIdentidade({ tenant, altura = 17 }: { tenant?: TenantKit; altura?: number }) {
  const i = identidadeDoTenant(tenant)
  if (!i.logoQuadrada && !i.logoHoriz && !i.nome) return null

  const elLogo: ReactNode = i.topo === 'horizontal' && i.logoHoriz
    ? <img key="lh" src={i.logoHoriz} alt={i.nome} style={{ height: altura, maxWidth: 140, objectFit: 'contain', display: 'block' }} />
    : (i.modo !== 'so_nome' && i.logoQuadrada
      ? <img key="lq" src={i.logoQuadrada} alt="" style={{ height: altura, width: altura, borderRadius: 4, objectFit: 'contain', display: 'block', flexShrink: 0 }} />
      : null)
  // Com a logo horizontal o nome não é escrito de novo — ele já faz parte da
  // arte (mesma regra do Projeto Modelo).
  const escondeNome = (i.topo === 'horizontal' && !!i.logoHoriz) || (i.modo === 'so_logo' && !!i.logoQuadrada)
  const elNome: ReactNode = !escondeNome && i.nome
    ? <span key="nm" className="barra-marca-n1-nome" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.nome}</span>
    : null
  if (!elLogo && !elNome) return null

  const zonas: Record<'esquerda' | 'centro' | 'direita', ReactNode[]> = { esquerda: [], centro: [], direita: [] }
  if (i.composicao === 'separados' && elLogo && elNome) {
    zonas[i.posLogo].push(elLogo)
    zonas[i.posNome].push(elNome)
  } else {
    // Juntos: os dois na mesma zona, na ordem escolhida.
    const par = i.ordem === 'nome_logo' ? [elNome, elLogo] : [elLogo, elNome]
    par.filter(Boolean).forEach((el) => zonas[i.posLogo].push(el))
  }

  /* Com TUDO numa zona só (o caso "juntos", que é o padrão), as três colunas
     seriam duas colunas vazias roubando espaço — e num telefone de 430px isso
     corta o nome do ambiente em "MorfoFi…". Então: uma zona ocupada = uma
     linha só, alinhada por `justifyContent`; duas ou mais = as três colunas,
     que é o que faz "separados" ter cada um na sua ponta. */
  const ocupadas = (['esquerda', 'centro', 'direita'] as const).filter((z) => zonas[z].length)
  if (ocupadas.length === 1) {
    const z = ocupadas[0]
    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, justifyContent: z === 'centro' ? 'center' : z === 'direita' ? 'flex-end' : 'flex-start' }}>
        {zonas[z]}
      </div>
    )
  }
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6 }}>{zonas.esquerda}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0, minWidth: 0 }}>{zonas.centro}</div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>{zonas.direita}</div>
    </div>
  )
}
