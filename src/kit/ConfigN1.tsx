import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import {
  useTemaPreferido, salvarTemaPreferido, type TemaPreferido,
  useMemoriaDescricaoDias, salvarMemoriaDescricaoDias, MEMORIA_DESCRICAO_DIAS_PADRAO,
} from '../configuracaoIcones'
import {
  useTenantN1, atualizarTenantN0, TENANT_N1_ID, loginJaEmUsoGlobalmente,
  lerPlatformN0Persistida, type UsuarioTenant,
} from './kitPlatform'
import { alpha } from './kitBase'
import { MessageCircle, Navigation, type LucideIcon } from 'lucide-react'

// N1 → engrenagem: as 4 telas de Configurações do Projeto Modelo que ainda
// não existiam aqui (10/09/2026, Decisão 55 — Parte B): "Meus Dados", "Meu
// Ambiente" (`ParametrosAmbienteView`), "Aparência" (`TemaPicker`) e "Ajuda".
// (citação por nome de função daqui em diante — número de linha muda a cada
// rodada do esqueleto, ver doc de reconciliação).
//
// REABERTA em 11/09/2026 (mesmo dia, auditoria seguinte): a rodada anterior
// tinha marcado "sem divergência" comparando por nome de função já existente
// aqui, sem antes montar o inventário completo das telas do Kit — método que
// já deixou passar uma tela inteira faltando (Layout e Menus, achada numa
// auditoria anterior a esta). Reconferida do zero a partir do Kit: achadas e
// corrigidas 3 divergências reais em `AjudaN1`/`MeuAmbienteN1` (cartões de
// Ajuda sem ícone; legenda da prévia de marca faltando; divisor+título "Nos
// documentos oficiais" faltando) — ver comentários pontuais abaixo de cada
// uma. `MeusDadosN1`/`MeuAmbienteN1`/`AjudaN1`/`AparenciaN1` continuam,
// depois disso, sem divergência real restante contra o Kit.
//
// Estilo: nativo do app (`.cabecalho-fixo`/`.cartao`/`var(--texto)`), como
// `Contas.tsx`/`UsuariosTenant.tsx` — não o `kitBase` claro. É a mesma
// escolha já registrada na Decisão 54 pra `UsuariosTenant.tsx`: tela do
// ambiente do produto segue o tema do produto.
//
// ADAPTAÇÃO registrada em "Meus Dados": no Kit é o cadastro FISCAL da empresa
// cliente (nome fantasia, razão social, CNPJ, endereço fiscal). O tenant do
// MorfoFinP é uma PESSOA usando um app de finanças pessoais — não há CNPJ nem
// nota fiscal a emitir. A tela virou o cadastro do próprio usuário logado
// (nome, login, e-mail, telefone e TROCA DE SENHA), que é o que "meus dados"
// significa neste produto — e resolve um buraco real: até aqui não existia
// nenhum caminho pro usuário trocar a própria senha depois do login
// multiusuário da Decisão 54 (só um administrador, pela tela de Usuários).

const estiloInput: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 10,
  border: '1px solid var(--borda)', background: 'var(--bg)', color: 'var(--texto)', fontSize: 15, outline: 'none',
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  // Corrigido 11/09/2026 (comparação visual pixel a pixel): faltava
  // `marginTop: 0` — sem isso o `<label>` herdava `margin-top: 12px` da
  // regra global de `index.css` (mesma classe de bug já corrigida no
  // `Field` de `kitBase.tsx`), somando espaço indesejado acima de cada
  // campo desta tela.
  return <label style={{ display: 'block', marginTop: 0, marginBottom: 14 }}>
    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--texto-fraco)', marginBottom: 6 }}>{label}</span>
    {children}
  </label>
}


function Cabecalho({ titulo, aoVoltar }: { titulo: string; aoVoltar: () => void }) {
  return <div className="cabecalho-fixo">
    <button type="button" className="botao-voltar-config" onClick={aoVoltar}>‹ Voltar</button>
    <h1>{titulo}</h1>
  </div>
}


function Aviso({ msg }: { msg: string }) {
  if (!msg) return null
  return <p style={{ color: 'var(--azul)', fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>{msg}</p>
}

/* ================= Meus Dados (Projeto Modelo, adaptado) ================= */
export function MeusDadosN1({ aoVoltar }: { aoVoltar: () => void }) {
  const tenant = useTenantN1()
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  const eu = tenant?.users.find((u) => u.id === config?.loggedUserIdN1)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<Partial<UsuarioTenant> | null>(null)
  const [senha1, setSenha1] = useState('')
  const [senha2, setSenha2] = useState('')
  const atual = { ...(eu || {}), ...(form || {}) }

  function notify(m: string) { setMsg(m); window.setTimeout(() => setMsg(''), 2500) }

  async function salvar() {
    if (!eu) return
    const nome = (atual.name || '').trim()
    const login = (atual.login || '').trim()
    if (!nome) { notify('Informe o nome.'); return }
    if (!login) { notify('Informe o login.'); return }
    const platform = await lerPlatformN0Persistida()
    if (loginJaEmUsoGlobalmente(platform, login, { tenantId: TENANT_N1_ID, userId: eu.id })) { notify('Esse login já está em uso (N0 ou N1).'); return }
    if (senha1 || senha2) {
      if (senha1.length < 4) { notify('A senha nova precisa ter pelo menos 4 caracteres.'); return }
      if (senha1 !== senha2) { notify('As duas senhas não conferem.'); return }
    }
    await atualizarTenantN0(TENANT_N1_ID, (t) => ({
      ...t,
      /* `demo: false`: editar os próprios dados aqui é o que transforma o
         usuário de demonstração (com que o ambiente nasce) no acesso pessoal
         de verdade — e é isso que fecha a porta do atalho "Entrar como
         empresa cliente (demo)" no Login (11/09/2026, Decisão 67). */
      users: t.users.map((u) => (u.id === eu.id ? { ...u, name: nome, login, email: atual.email, phone: atual.phone, senha: senha1 ? senha1 : u.senha, demo: false } : u)),
    }))
    setSenha1(''); setSenha2(''); setForm(null)
    notify(senha1 ? 'Dados e senha atualizados.' : 'Dados atualizados.')
  }

  return <>
    <Cabecalho titulo="Meus Dados" aoVoltar={aoVoltar} />
    <Aviso msg={msg} />
    {!eu ? (
      <div className="cartao"><p style={{ margin: 0, fontSize: 13.5, color: 'var(--texto-fraco)', lineHeight: 1.6 }}>
        Não foi possível identificar o usuário logado nesta sessão. Saia e entre de novo para editar os seus dados.
      </p></div>
    ) : (
      <div className="cartao">
        <Campo label="Nome"><input style={estiloInput} value={atual.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Campo>
        <Campo label="Login (é com ele que você entra)"><input style={estiloInput} value={atual.login || ''} onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))} /></Campo>
        <Campo label="E-mail"><input style={estiloInput} inputMode="email" value={atual.email || ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Campo>
        <Campo label="Telefone"><input style={estiloInput} inputMode="tel" value={atual.phone || ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(11) 90000-0000" /></Campo>
        <div style={{ borderTop: '1px solid var(--borda)', margin: '4px 0 14px' }} />
        <p style={{ fontSize: 12, color: 'var(--texto-fraco)', margin: '0 0 12px', lineHeight: 1.5 }}>
          Trocar a senha: preencha os dois campos abaixo. Deixe em branco pra manter a senha atual.
        </p>
        <Campo label="Senha nova"><input style={estiloInput} type="password" value={senha1} onChange={(e) => setSenha1(e.target.value)} /></Campo>
        <Campo label="Repita a senha nova"><input style={estiloInput} type="password" value={senha2} onChange={(e) => setSenha2(e.target.value)} /></Campo>
        <button type="button" className="primario" style={{ width: '100%' }} onClick={() => void salvar()}>Salvar</button>
      </div>
    )}
  </>
}

/* ================= Meu Ambiente (Projeto Modelo, adaptado) ================= */
export function MeuAmbienteN1({ aoVoltar }: { aoVoltar: () => void }) {
  const [msg, setMsg] = useState('')
  function notify(m: string) { setMsg(m); window.setTimeout(() => setMsg(''), 2500) }

  return <>
    <Cabecalho titulo="Meu Ambiente" aoVoltar={aoVoltar} />
    <Aviso msg={msg} />
    {/* 12/09/2026 (pedido do Rafael): "não deve mais ter o campo 'Nome do
        ambiente', não deve mais mostrar no topo também; e na config retirar
        todas as configs de logo e aplicar a config contida no adm Morfo
        (N0)". Saíram desta tela: o nome do ambiente e TODO o conjunto de
        logotipo (2 arquivos, o que mostrar, composição, posição, prévia e a
        escolha pros documentos). A identidade que aparece no topo do app
        passou a ser só a do produto, definida em N0 › Parâmetros › Marca ›
        "Logo do app logado" — uma fonte só, igual pra todo ambiente. O que
        continua aqui é o que é REALMENTE do ambiente: a memória do campo
        "O que foi". */}
    <div className="cartao">
      <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', margin: 0, lineHeight: 1.5 }}>
        A identidade visual do app (logo do topo, tamanho e posição) é definida pela Morfo e vale
        igual em todos os ambientes — não há nada pra configurar aqui.
      </p>
    </div>

    <MemoriaDescricaoParametro onAviso={notify} />
  </>
}

/* Parâmetro de nível 1 do ambiente (10/09/2026, pedido do Rafael): quantos
   DIAS pra trás o campo "O que foi" do lançamento olha pra sugerir descrições
   já usadas. Mora aqui, e não em Layout/Manutenção, porque é uma preferência
   do ambiente do cliente — o mesmo lugar onde estão nome e logotipo. */
function MemoriaDescricaoParametro({ onAviso }: { onAviso: (m: string) => void }) {
  const salvo = useMemoriaDescricaoDias()
  const [rascunho, setRascunho] = useState<string | null>(null)
  const valor = rascunho ?? String(salvo)
  return <div className="cartao">
    <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>Memória do campo "O que foi"</div>
    <p style={{ fontSize: 12, color: 'var(--texto-fraco)', margin: '0 0 12px', lineHeight: 1.5 }}>
      Ao digitar no campo "O que foi" de um lançamento, o app sugere descrições que você já usou —
      e, ao escolher uma, preenche junto a categoria e o "pago com" daquele lançamento. Este número
      diz quantos <strong>dias pra trás</strong> ele procura. Padrão: {MEMORIA_DESCRICAO_DIAS_PADRAO} dias.
      Zero desliga a sugestão (o campo continua sendo texto livre, como sempre).
    </p>
    <Campo label="Dias pra trás">
      <input
        type="number"
        min={0}
        max={3650}
        inputMode="numeric"
        style={estiloInput}
        value={valor}
        onChange={(e) => setRascunho(e.target.value)}
      />
    </Campo>
    <button type="button" className="primario" style={{ width: '100%' }}
      onClick={async () => {
        const n = Number(valor)
        if (!Number.isFinite(n) || n < 0) { onAviso('Informe um número de dias válido.'); return }
        await salvarMemoriaDescricaoDias(n)
        setRascunho(null)
        onAviso(n === 0 ? 'Sugestão de descrição desligada.' : `Memória ajustada para ${Math.round(n)} dias.`)
      }}>
      Salvar
    </button>
  </div>
}

/* ================= Aparência (Projeto Modelo, `TemaPicker`) ================= */
// Mecanismo idêntico ao Projeto Modelo: atributo no <html> + bloco de CSS só de
// variáveis (`src/index.css`). Persistência no Dexie (ver `configuracaoIcones.ts`).
function aplicarTema(valor: TemaPreferido) {
  document.documentElement.setAttribute('data-mloc-tema', valor)
}
const OPCOES_TEMA: { v: TemaPreferido; l: string }[] = [
  { v: 'claro', l: 'Claro' }, { v: 'escuro', l: 'Escuro' }, { v: 'auto', l: 'Automático' },
]
/* Aplica o tema salvo assim que o app abre — montado uma vez em `AppRoot`. */
export function AplicadorDeTema() {
  const tema = useTemaPreferido()
  useEffect(() => { aplicarTema(tema) }, [tema])
  return null
}
export function AparenciaN1({ aoVoltar }: { aoVoltar: () => void }) {
  const tema = useTemaPreferido()
  return <>
    <Cabecalho titulo="Aparência" aoVoltar={aoVoltar} />
    <div className="cartao">
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>Tema das telas</div>
      <p style={{ fontSize: 12, color: 'var(--texto-fraco)', margin: '0 0 12px', lineHeight: 1.5 }}>
        "Automático" acompanha a configuração do seu celular. Recurso <strong>experimental</strong> — o app foi desenhado escuro, então no tema claro pode sobrar alguma tela fora do tom; se não ficar bom, é só avisar que a gente remove.
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        {OPCOES_TEMA.map((o) => {
          const on = tema === o.v
          return <button key={o.v} type="button" onClick={() => void salvarTemaPreferido(o.v)}
            style={{ flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: on ? '#fff' : 'var(--texto)', background: on ? 'var(--azul)' : 'var(--bg)', border: `1.5px solid ${on ? 'var(--azul)' : 'var(--borda)'}` }}>
            {o.l}
          </button>
        })}
      </div>
    </div>
  </>
}

/* ================= Ajuda (Projeto Modelo) ================= */
export function AjudaN1({ aoVoltar, abrirSuporte, abrirTour, temNaoLida }: {
  aoVoltar: () => void; abrirSuporte: () => void; abrirTour: () => void; temNaoLida?: boolean
}) {
  // Cartão grande com ícone (Projeto Modelo `AjudaView` → `cardGrande`): cada
  // item ganha um selo de ícone à esquerda, igual ao Kit — corrigido
  // 11/09/2026 (reconciliação N1), a versão anterior desenhava a linha sem
  // nenhum ícone. O selo de "não lida" segue o mesmo padrão já usado em
  // `MenuRowCompact`/`TopoIcones` deste produto (`.mloc-badge-pulse`, "!"
  // sobre o ícone), não um ponto solto ao lado do título.
  const card = (Icone: LucideIcon, titulo: string, resumo: string, onClick: () => void, badge?: boolean) => (
    <button type="button" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', background: 'var(--bg-elevado)', border: '1px solid var(--borda)', borderRadius: 14, padding: 14, marginBottom: 10, cursor: 'pointer', textAlign: 'left', color: 'var(--texto)' }}>
      <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 10, background: alpha('var(--azul)', 10.2), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icone size={17} color="var(--azul)" />
        {badge && <span className="mloc-badge-pulse" style={{ position: 'absolute', top: -4, right: -4, minWidth: 14, height: 14, borderRadius: 999, background: 'var(--vermelho)', border: '2px solid var(--bg-elevado)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8.5, fontWeight: 900, color: '#fff' }}>!</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{titulo}</div>
        <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)', marginTop: 2, lineHeight: 1.4 }}>{resumo}</div>
      </div>
      <span style={{ color: 'var(--texto-fraco)' }}>›</span>
    </button>
  )
  return <>
    <Cabecalho titulo="Ajuda" aoVoltar={aoVoltar} />
    {card(MessageCircle, 'Suporte Morfo (chat)', 'Fale com o time da Morfo pelo chat interno', abrirSuporte, temNaoLida)}
    {card(Navigation, 'Tour guiado', 'Rever o passo a passo de uso do sistema, na tela real', abrirTour)}
  </>
}
