/* Editar o Aceitável de uma categoria e a Meta de um grupo SEM sair da tela
   (11/09/2026, pedido do Rafael):

     "na tela de planejamento deve ter ícones que levem pra edição dos
      Aceitáveis (quando categoria) e Metas (quando grupos), deve abrir popup
      somente com aquela aba da tela de configurações e não permitindo ir pra
      outras abas, pois ao salvar edição deve retornar pra tela anterior
      atualizada e na mesma posição."

   Por que é um popup próprio e não a tela de Configurações embutida: abrir a
   tela inteira (com as 4 abas) e depois travar a navegação seria montar um
   caminho e bloqueá-lo na sequência — e ainda assim desmontaria a tela de
   Planejamento, perdendo grupo aberto, categoria aberta e posição de rolagem.
   O popup fica POR CIMA: a tela de baixo continua montada, então "voltar pra
   tela anterior atualizada e na mesma posição" é consequência, não um
   mecanismo à parte. A gravação é na mesma tabela e pela mesma regra que a
   tela de Configurações usa — nenhum caminho novo de dado. */
import { useState } from 'react'
import { db, type Categoria, type GrupoRegistro } from '../db'
import ModalCadastro from './ModalCadastro'
import { aplicarMascaraValor, formatarMoeda, paraNumero, fmtBRL } from '../formatoMoeda'
import { ROTULO_TIPO_GRUPO, tipoDoGrupo } from '../gruposUtil'

export function PopupAceitavelCategoria({ categoria, onFechar }: { categoria: Categoria; onFechar: () => void }) {
  const [aceitavel, setAceitavel] = useState(formatarMoeda(categoria.aceitavelMensal))
  const [esperado, setEsperado] = useState(formatarMoeda(categoria.esperadoMensal ?? 0))
  const ehReceita = categoria.natureza === 'Receita'

  async function salvar() {
    await db.categorias.update(categoria.id!, {
      aceitavelMensal: paraNumero(aceitavel),
      ...(ehReceita ? { esperadoMensal: paraNumero(esperado) } : {}),
    })
    onFechar()
  }

  return (
    <ModalCadastro titulo={categoria.nome} onFechar={onFechar} onSalvar={salvar}>
      <p className="texto-fraco" style={{ marginTop: 0, fontSize: 12.5 }}>
        {ehReceita
          ? 'Quanto você espera receber nesta categoria por mês — é o "planejado" que a barra desta tela compara com o realizado.'
          : 'Quanto cabe gastar nesta categoria por mês — é o teto que a barra desta tela compara com o realizado.'}
      </p>
      <label htmlFor="rap-aceitavel">Aceitável mensal (R$)</label>
      <input
        id="rap-aceitavel"
        type="text"
        inputMode="decimal"
        placeholder="0,00"
        value={aceitavel}
        onChange={(e) => setAceitavel(aplicarMascaraValor(e.target.value))}
      />
      {ehReceita && (
        <>
          <label htmlFor="rap-esperado">Planejado mensal (R$)</label>
          <input
            id="rap-esperado"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={esperado}
            onChange={(e) => setEsperado(aplicarMascaraValor(e.target.value))}
          />
        </>
      )}
    </ModalCadastro>
  )
}

export function PopupMetaGrupo({
  grupo,
  percentualAtual,
  baseEmReais,
  mesVigencia,
  onFechar,
}: {
  grupo: GrupoRegistro
  percentualAtual: number
  /* Salário do mês anterior — a base sobre a qual a meta percentual vira R$.
     É a MESMA regra da tela de Metas (decisão de 30/08/2026: a base é só o
     salário, não a receita total), passada de fora pra não existirem duas
     contas do mesmo número. */
  baseEmReais: number
  mesVigencia: string
  onFechar: () => void
}) {
  const [percentual, setPercentual] = useState(String(percentualAtual || 0))
  const valor = (baseEmReais * (Number(percentual.replace(',', '.')) || 0)) / 100

  async function salvar() {
    const valorPct = Number(percentual.replace(',', '.')) || 0
    const existente = await db.metas.where('grupo').equals(grupo.nome).first()
    if (existente) await db.metas.update(existente.id!, { percentual: valorPct })
    else await db.metas.add({ grupo: grupo.nome, percentual: valorPct, base: 'receita_real', mesVigencia })
    onFechar()
  }

  return (
    <ModalCadastro titulo={`Meta · ${grupo.nome}`} onFechar={onFechar} onSalvar={salvar}>
      <p className="texto-fraco" style={{ marginTop: 0, fontSize: 12.5 }}>
        Grupo de {ROTULO_TIPO_GRUPO[tipoDoGrupo(grupo)]}. A meta é um percentual do salário do mês anterior — a
        mesma conta da aba Metas.
      </p>
      <label htmlFor="rap-meta">Meta (%)</label>
      <input
        id="rap-meta"
        type="number"
        min={0}
        max={100}
        value={percentual}
        onChange={(e) => setPercentual(e.target.value)}
      />
      <p className="texto-fraco" style={{ marginTop: 6, marginBottom: 0 }}>
        {baseEmReais > 0 ? `Equivale a ${fmtBRL(valor)} por mês.` : 'Sem salário lançado no mês anterior, ainda não dá pra converter em R$.'}
      </p>
    </ModalCadastro>
  )
}
