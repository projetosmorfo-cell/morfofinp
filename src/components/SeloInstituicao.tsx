/* O selo redondo da conta/carteira (10/09/2026) — tamanho e formato IGUAIS
   para todos, como o Rafael pediu ("quero todas padronizadas no mesmo tamanho
   e formato redondo"). Três formas de preencher, na ordem de precedência:

   1. `imagemUri` — a imagem que o próprio Rafael enviou pra essa conta
      (recortada em círculo). É por aqui que a logo real entra, quando ele
      quiser: é imagem dele, no aparelho dele.
   2. `instituicao` — o selo da biblioteca: sigla sobre a cor oficial da
      marca (ver `src/dados/instituicoes.ts` pro porquê de não ser a logo).
   3. `cor` — o círculo liso, na cor escolhida ("caso ele não ache" a
      instituição na lista, o pedido literal).

   Sem nada disso, cai nas iniciais do nome da conta sobre um cinza neutro —
   nunca um espaço vazio. */
import { acharInstituicao } from '../dados/instituicoes'
import { useLogosInstituicoes } from '../configuracaoIcones'

const CINZA_NEUTRO = '#5A6B7B'

/* Preto ou branco por cima da cor da marca, escolhido pela luminância
   percebida (fórmula padrão 0.299/0.587/0.114) — algumas marcas são
   amarelas/claras (Banco do Brasil, Elo, Caterpillar) e texto branco nelas
   fica ilegível. */
export function corDoTextoSobre(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.62 ? '#1A1A1A' : '#FFFFFF'
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

export default function SeloInstituicao({
  instituicao, cor, imagemUri, nome, tamanho = 36,
}: {
  instituicao?: string
  cor?: string
  imagemUri?: string
  nome?: string
  tamanho?: number
}) {
  /* Logo REAL da instituição, quando o Rafael já importou uma (biblioteca em
     `db.configuracoes.logosInstituicoes`). Vence o selo de sigla: é
     exatamente o "quero as logos originais em formato redondo" — a imagem é
     dele, e o app só recorta no círculo e padroniza o tamanho. */
  const biblioteca = useLogosInstituicoes()
  const logoReal = instituicao ? biblioteca[instituicao] : undefined

  const base = {
    width: tamanho,
    height: tamanho,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  } as const

  const imagem = imagemUri || logoReal
  if (imagem) {
    return (
      <span style={{ ...base, background: '#fff' }}>
        {/* `contain` e não `cover`: logo de banco quase sempre vem com o
            desenho já centralizado numa arte retangular — `cover` cortaria as
            beiradas. O fundo branco existe pra logo com transparência não
            sumir no tema escuro. */}
        <img src={imagem} alt={nome ?? 'Instituição'} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 1, boxSizing: 'border-box' }} />
      </span>
    )
  }

  const inst = acharInstituicao(instituicao)
  const fundo = inst?.cor ?? cor ?? CINZA_NEUTRO
  const texto = inst?.sigla ?? iniciais(nome ?? '')
  // No modo "só uma cor" o círculo é liso de propósito — foi o que o Rafael
  // pediu como alternativa quando não achar a instituição.
  const mostraTexto = !!inst || !cor

  return (
    <span style={{ ...base, background: fundo }} title={inst?.nome ?? nome}>
      {mostraTexto && (
        <span
          style={{
            color: corDoTextoSobre(fundo),
            fontSize: Math.max(8, Math.round(tamanho * (texto.length >= 4 ? 0.26 : texto.length === 3 ? 0.31 : 0.38))),
            fontWeight: 800,
            letterSpacing: texto.length >= 4 ? -0.2 : 0,
            lineHeight: 1,
          }}
        >
          {texto}
        </span>
      )}
    </span>
  )
}
