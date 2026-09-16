/* A seção "Pacote de ícones" do ambiente do cliente (N1) — build 089.

   Mora na aba Aparência de "Categorias e Grupos", logo ACIMA do tamanho dos
   ícones: escolher o traço vem antes de calibrar o tamanho dele.

   O que ela faz, e nada além disso:
   • mostra os três pacotes publicados pela Morfo, com prévia;
   • aplica o escolhido ao cadastro DESTE ambiente;
   • troca a cor de todas as categorias, ou de todos os grupos, de uma vez.

   O que ela NÃO faz: editar o desenho de um item. Isso continua onde sempre
   esteve — no cadastro da própria categoria/grupo, nas abas ao lado —, e é o
   "escolher um a um e mesclar" do pedido: trocar de pacote muda traço e cor,
   nunca apaga um desenho que a pessoa escolheu. */
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { salvarConfiguracaoIcones } from '../configuracaoIcones'
import EscolhaPacoteIcones from './EscolhaPacoteIcones'
import {
  aplicarCorEmTodos,
  aplicarPacote,
  pacoteEfetivo,
  PACOTE_ACEITA_COR,
  ROTULO_PACOTE,
  type PacoteId,
} from '../pacotesIcones'

export default function PacoteIconesN1() {
  const cfg = useLiveQuery(() => db.configuracoes.get(1), [])
  const efetivo = pacoteEfetivo(cfg?.platformN0?.pacotesIcones, cfg)
  const [aba, setAba] = useState<PacoteId | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const selecionado = aba ?? efetivo.id

  async function mudarCor(id: PacoteId, alvo: 'categorias' | 'grupos', cor: string) {
    if (!PACOTE_ACEITA_COR[id]) return
    /* Grava a preferência E pinta o cadastro na hora. Gravar sem pintar
       deixaria a tela dizendo uma coisa e o app mostrando outra — o defeito
       "parâmetro que ninguém lê" que a build 085 fechou. */
    await salvarConfiguracaoIcones(
      alvo === 'categorias' ? { pacoteIconesCorCategorias: cor } : { pacoteIconesCorGrupos: cor },
    )
    if (id === selecionado && id === efetivo.id) {
      const n = await aplicarCorEmTodos(alvo, cor)
      setAviso(`Cor aplicada em ${n} ${alvo === 'categorias' ? 'categoria(s)' : 'grupo(s)'}.`)
    } else {
      setAviso('Cor guardada. Ela vale quando você usar este pacote.')
    }
  }

  async function usar(id: PacoteId) {
    setOcupado(true)
    setAviso(null)
    try {
      const r = await aplicarPacote(id, efetivo.pacotes[id])
      await salvarConfiguracaoIcones({ pacoteIconesEscolhido: id })
      setAviso(`Pacote "${ROTULO_PACOTE[id]}" aplicado em ${r.categorias} categoria(s) e ${r.grupos} grupo(s).`)
    } catch (e) {
      setAviso('Não consegui aplicar: ' + ((e as Error)?.message || 'erro desconhecido'))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <h2>Pacote de Ícones</h2>
      <div className="cartao">
        <p className="texto-fraco texto-quebra" style={{ marginTop: 0 }}>
          São três propostas completas do mesmo conjunto de ícones: o desenho é o mesmo nas três, muda o traço.
          Trocar de pacote muda o traço e a cor de tudo — o ícone que você escolheu a dedo numa categoria continua
          como está.
        </p>
        <EscolhaPacoteIcones
          pacotes={efetivo.pacotes}
          emUso={efetivo.id}
          selecionado={selecionado}
          onSelecionar={setAba}
          onMudarCor={(id, alvo, cor) => void mudarCor(id, alvo, cor)}
          onUsar={(id) => void usar(id)}
          ocupado={ocupado}
        />
        {aviso && (
          <p className="texto-fraco texto-quebra" data-testid="aviso-pacote-n1" style={{ margin: '10px 0 0' }}>
            {aviso}
          </p>
        )}
      </div>
    </>
  )
}
