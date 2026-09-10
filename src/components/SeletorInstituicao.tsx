/* Escolha do ícone da carteira (10/09/2026, pedido do Rafael: "cadastro de
   carteira com ícone: biblioteca com tela de seleção e busca por nome (igual
   ao cadastro de categorias/grupos), ícones de tamanho padronizado, das
   instituições financeiras mais conhecidas, separados por bancos, bandeiras
   de cartões e instituições de cartão de crédito").

   Mesma folha e mesma busca do seletor de categoria (`.folha-escolha`), pra
   não inventar um padrão novo. Três abas + duas saídas quando a instituição
   não estiver na lista, exatamente como ele pediu:
     - "Só uma cor"  → círculo liso na cor escolhida;
     - "Enviar imagem" → a imagem dele, recortada no mesmo círculo (é assim
       que a logo real entra, por escolha dele — ver `instituicoes.ts`). */
import { useMemo, useState } from 'react'
import { ABAS_INSTITUICAO, casarArquivoComInstituicao } from '../dados/instituicoes'
import SeloInstituicao from './SeloInstituicao'
import { readImageAsDataUrl, LOGO_MAX_KB } from '../kit/kitBase'
import { useLogosInstituicoes, salvarLogosInstituicoes } from '../configuracaoIcones'

const CORES_LIVRES = [
  '#5A6B7B', '#E4002B', '#F58220', '#FAE128', '#00A859', '#0DB14B',
  '#0072BC', '#1A1F71', '#820AD1', '#E4007C', '#00C1A5', '#242424',
]

export interface IconeCarteira {
  instituicao?: string
  cor?: string
  imagemUri?: string
}

export default function SeletorInstituicao({
  valor, onEscolher, nome,
}: {
  valor: IconeCarteira
  onEscolher: (v: IconeCarteira) => void
  nome?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [aba, setAba] = useState<'bancos' | 'bandeiras' | 'emissores' | 'cor'>('bancos')
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const logosReais = useLogosInstituicoes()

  /* Importar as logos REAIS em lote (10/09/2026). Eu não desenho logotipo de
     marca de terceiro — mas nada impede o app de usar as imagens que o
     próprio Rafael tem. Ele escolhe vários arquivos de uma vez; cada um é
     casado com a instituição pelo NOME DO ARQUIVO
     (`casarArquivoComInstituicao`) e guardado na biblioteca do app. A partir
     daí a logo real aparece em toda parte — na lista aqui, no cadastro e nos
     cards da Carteira —, sempre recortada no mesmo círculo e no mesmo
     tamanho, que é o "padronizadas no mesmo tamanho e formato redondo". */
  async function importarLogos() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = async () => {
      const arquivos = [...(input.files || [])]
      if (!arquivos.length) return
      const patch: Record<string, string> = {}
      const semCasar: string[] = []
      const grandes: string[] = []
      for (const f of arquivos) {
        if (f.size / 1024 > LOGO_MAX_KB) { grandes.push(f.name); continue }
        const inst = casarArquivoComInstituicao(f.name)
        if (!inst) { semCasar.push(f.name); continue }
        patch[inst.nome] = await readImageAsDataUrl(f)
      }
      if (Object.keys(patch).length) await salvarLogosInstituicoes(patch)
      const partes = [`${Object.keys(patch).length} logo(s) importada(s)`]
      if (semCasar.length) partes.push(`${semCasar.length} sem correspondência (renomeie o arquivo com o nome da instituição): ${semCasar.slice(0, 3).join(', ')}${semCasar.length > 3 ? '…' : ''}`)
      if (grandes.length) partes.push(`${grandes.length} acima de 3MB, ignorada(s)`)
      setAviso(partes.join(' · '))
    }
    input.click()
  }

  const listaAtual = ABAS_INSTITUICAO.find((a) => a.chave === aba)?.itens ?? []
  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return listaAtual
    return listaAtual.filter((i) => i.nome.toLowerCase().includes(t) || i.sigla.toLowerCase().includes(t))
  }, [listaAtual, busca])

  async function enviarImagem() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return
      if (f.size / 1024 > LOGO_MAX_KB) { setErro('Imagem acima de 3MB.'); return }
      const uri = await readImageAsDataUrl(f)
      onEscolher({ imagemUri: uri })
      setAberto(false)
    }
    input.click()
  }

  return (
    <>
      <button type="button" className="campo-como-botao" onClick={() => { setBusca(''); setErro(''); setAberto(true) }}>
        <span className="campo-como-botao-icone">
          <SeloInstituicao {...valor} nome={nome} tamanho={30} />
        </span>
        <span className="campo-como-botao-texto">
          {valor.imagemUri ? 'Imagem enviada' : valor.instituicao || (valor.cor ? 'Só uma cor' : 'Escolher ícone…')}
        </span>
        <span className="campo-como-botao-seta">›</span>
      </button>

      {aberto && (
        <div className="folha-escolha" role="dialog" aria-label="Escolher ícone da carteira">
          <div className="folha-escolha-fundo" onClick={() => setAberto(false)} />
          <div className="folha-escolha-painel">
            <div className="folha-escolha-topo">
              <strong>Ícone da carteira</strong>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar">✕</button>
            </div>

            <div className="abas-tela" role="tablist" style={{ marginBottom: 8 }}>
              {ABAS_INSTITUICAO.map((a) => (
                <button
                  key={a.chave}
                  type="button"
                  role="tab"
                  aria-selected={aba === a.chave}
                  className={`aba-tela-item ${aba === a.chave ? 'ativa' : ''}`}
                  onClick={() => setAba(a.chave)}
                >
                  {a.rotulo}
                </button>
              ))}
              <button
                type="button"
                role="tab"
                aria-selected={aba === 'cor'}
                className={`aba-tela-item ${aba === 'cor' ? 'ativa' : ''}`}
                onClick={() => setAba('cor')}
              >
                Só cor
              </button>
            </div>

            {aba !== 'cor' && (
              <>
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar pelo nome…"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 2px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    style={{ marginTop: 0, padding: '7px 12px', fontSize: 12.5, borderRadius: 999, border: '1px solid var(--borda)', background: 'none', color: 'var(--texto)', cursor: 'pointer' }}
                    onClick={() => void importarLogos()}
                  >
                    Importar logos reais…
                  </button>
                  <span className="texto-fraco" style={{ fontSize: 11.5 }}>
                    {Object.keys(logosReais).length > 0
                      ? `${Object.keys(logosReais).length} logo(s) na biblioteca`
                      : 'Selecione vários arquivos; o nome do arquivo casa com a instituição'}
                  </span>
                </div>
                {aviso && <p className="texto-fraco" style={{ fontSize: 11.5, margin: '4px 0 0' }}>{aviso}</p>}
              </>
            )}

            <div className="folha-escolha-lista">
              {aba === 'cor' ? (
                <>
                  <p className="texto-fraco" style={{ marginTop: 4 }}>
                    Não achou a instituição? Escolha só uma cor — o círculo fica liso, do mesmo
                    tamanho de todos os outros. Ou envie uma imagem sua, que é recortada no mesmo
                    círculo.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '6px 2px 14px' }}>
                    {CORES_LIVRES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Cor ${c}`}
                        onClick={() => { onEscolher({ cor: c }); setAberto(false) }}
                        style={{
                          marginTop: 0, padding: 0, border: valor.cor === c ? '2px solid var(--azul)' : '2px solid transparent',
                          background: 'none', borderRadius: '50%', cursor: 'pointer', lineHeight: 0,
                        }}
                      >
                        <SeloInstituicao cor={c} tamanho={40} />
                      </button>
                    ))}
                  </div>
                  {erro && <p className="valor-neg" style={{ fontSize: 13 }}>{erro}</p>}
                  <button type="button" className="primario" style={{ width: '100%' }} onClick={() => void enviarImagem()}>
                    Enviar imagem
                  </button>
                  {(valor.instituicao || valor.cor || valor.imagemUri) && (
                    <button type="button" style={{ width: '100%' }} onClick={() => { onEscolher({}); setAberto(false) }}>
                      Tirar o ícone
                    </button>
                  )}
                </>
              ) : (
                <>
                  {filtrados.length === 0 && <p className="texto-fraco">Nenhuma instituição encontrada.</p>}
                  {filtrados.map((i) => (
                    <div key={i.nome} style={{ display: 'flex', alignItems: 'center' }}>
                      <button
                        type="button"
                        className={`folha-escolha-item ${valor.instituicao === i.nome ? 'ativo' : ''}`}
                        onClick={() => { onEscolher({ instituicao: i.nome }); setAberto(false) }}
                      >
                        <span className="folha-escolha-item-icone">
                          <SeloInstituicao instituicao={i.nome} tamanho={30} />
                        </span>
                        <span className="folha-escolha-item-nome">{i.nome}</span>
                      </button>
                      {logosReais[i.nome] && (
                        <button
                          type="button"
                          title="Tirar a logo importada desta instituição"
                          aria-label={`Tirar a logo de ${i.nome}`}
                          style={{ marginTop: 0, padding: '4px 8px', background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer', flexShrink: 0 }}
                          onClick={async () => { await salvarLogosInstituicoes({ [i.nome]: undefined }); setAviso(`Logo de ${i.nome} removida`) }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
