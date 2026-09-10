import { useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, FileText, Paperclip, Pencil, Plus, X } from 'lucide-react'
import { db, type ConfiguracaoIcones } from '../db'
import { salvarConfiguracaoIcones } from '../configuracaoIcones'
import {
  BRANCO, CORAL, DEV_ACCENT, DEV_CARD, GREEN, INK, LINE, LOGO_MAX_KB, PAPER, PURPLE, PURPLE_DEEP, RED, TXT2,
  Field, SecaoLayout, Segmented, Sheet, Toggle, alpha, dangerBtn, inputStyle, primaryBtn, readImageAsDataUrl, renderRico, secondaryBtn, uid,
  type KitPlatform, type SiteConfig, type SiteHeaderCfg, type SitePage,
} from './kitBase'
import { BlocoLogosLogin, NOME_PRODUTO, SITE_LOGIN_PAGE_ID, SITE_PLANOS_PAGE_ID, SiteHeaderWeb, fraseCorStyle, logoHeaderSite, loginPageCfgDe, montarPlatformSite, paginasSiteComLogin, sitePagesDe, siteWebLayoutDe } from './siteKit'

// N0 → Parâmetros → "Site MorfoFinP" (09/09/2026, Decisão 49) — porte do grupo
// `grupo === "site"` de `DevApp` do Kit (L2146-L2343: "Site MorfoMod") e da
// folha `SitePageSheet` (L6619-L6660), transcrição literal com tipos TS. Pedido
// do Rafael: "Implemente essas configs e já preencha com dados padrão morfomod"
// — os valores iniciais são os fallbacks `?? padrão` do próprio Kit (dado do
// MorfoMod, G55), mostrados nos campos exatamente como o Kit mostra.
//
// ADAPTAÇÃO única (persistência): no Kit tudo vive em `platform` (estado React
// salvo inteiro em IndexedDB pelo `savePlatform`); aqui `siteConfig`/
// `sitePages`/`siteMenu` são 3 campos do singleton `db.configuracoes`. Pra
// digitação não "brigar" com a leitura assíncrona do Dexie (cada tecla
// gravaria e o campo só atualizaria quando o `useLiveQuery` devolvesse),
// a tela mantém um espelho local (`usePlatformEditavel`) que muda na hora e
// grava em seguida — o `setPlatform(p => ...)` do Kit vira `setPlatform`
// deste espelho, com a mesma assinatura. Os `notify(...)` do Kit viram um
// toast local (`devToast`, mesmo texto).

type PatchFn = (p: KitPlatform) => KitPlatform

function usePlatformEditavel(config: ConfiguracaoIcones | undefined) {
  const [local, setLocal] = useState<KitPlatform | null>(null)
  const base: KitPlatform = { devUsers: [], tenants: [], ...montarPlatformSite(config) }
  const platform = local ?? base
  const setPlatform = (updater: PatchFn) => {
    const next = updater(platform)
    setLocal(next)
    void salvarConfiguracaoIcones({ siteConfig: next.siteConfig, sitePages: next.sitePages, siteMenu: next.siteMenu })
  }
  return { platform, setPlatform }
}

/* Kit L6619-L6660 */
function SitePageSheet({ initial, onClose, onSave }: { initial: SitePage | null; onClose: () => void; onSave: (data: { titulo: string; conteudo: string; visivel: boolean; imagemUri: string | null }) => void }) {
  const [titulo, setTitulo] = useState(initial?.titulo || '')
  const [conteudo, setConteudo] = useState(initial?.conteudo || '')
  const [visivel, setVisivel] = useState(initial ? !!initial.visivel : true)
  const [imagemUri, setImagemUri] = useState<string | null>(initial?.imagemUri || null)
  const taRef = useRef<HTMLTextAreaElement>(null); const fileRef = useRef<HTMLInputElement>(null)
  const envolver = (antes: string, depois: string, padrao: string) => {
    const ta = taRef.current; if (!ta) return
    const s = ta.selectionStart ?? conteudo.length, e = ta.selectionEnd ?? conteudo.length
    const sel = conteudo.slice(s, e) || padrao
    setConteudo(conteudo.slice(0, s) + antes + sel + depois + conteudo.slice(e))
  }
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 3 * 1024 * 1024) { alert('Imagem muito grande (máx. 3MB)'); return } const r = new FileReader(); r.onload = () => setImagemUri(r.result as string); r.readAsDataURL(f) }
  const fbtn: React.CSSProperties = { background: alpha(PURPLE, 7.8), border: 'none', borderRadius: 8, color: PURPLE, fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: '6px 12px' }
  return <Sheet title={initial ? 'Editar página do site' : 'Nova página do site'} onClose={onClose}>
    <Field label="Título (aparece no menu do Login)"><input style={inputStyle} value={titulo} onChange={e => setTitulo(e.target.value)} /></Field>
    <Field label="Imagem da página (opcional)">
      {imagemUri ? <div style={{ position: 'relative', width: 140 }}>
        <img src={imagemUri} alt="" style={{ width: 140, height: 90, objectFit: 'cover', borderRadius: 10, border: `1px solid ${LINE}` }} />
        <button onClick={() => setImagemUri(null)} style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 999, background: RED, border: `2px solid ${BRANCO}`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={13} /></button>
      </div> : <>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: `1.5px dashed ${alpha(PURPLE, 40)}`, borderRadius: 12, padding: 12, background: alpha(PURPLE, 3.9), color: PURPLE, fontWeight: 700, fontSize: 13, cursor: 'pointer', width: '100%' }}><Paperclip size={15} /> Anexar imagem</button>
      </>}
    </Field>
    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
      <button onClick={() => envolver('**', '**', 'texto em negrito')} style={fbtn}><strong>B</strong></button>
      <button onClick={() => envolver('*', '*', 'texto em itálico')} style={{ ...fbtn, fontStyle: 'italic' }}>I</button>
      <button onClick={() => envolver('[', '](https://exemplo.com)', 'texto do link')} style={fbtn}>Link</button>
    </div>
    <Field label="Conteúdo (selecione um trecho e use os botões acima pra formatar ou virar link)"><textarea ref={taRef} style={{ ...inputStyle, minHeight: 160, resize: 'vertical' }} value={conteudo} onChange={e => setConteudo(e.target.value)} /></Field>
    <Field label="Prévia">
      <div style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: 12, padding: 12, fontSize: 13, color: TXT2, lineHeight: 1.7 }}>
        {imagemUri && <img src={imagemUri} alt="" style={{ width: '100%', maxHeight: 130, objectFit: 'cover', borderRadius: 10, marginBottom: 8 }} />}
        {renderRico(conteudo)}
      </div>
    </Field>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}><Toggle value={visivel} onChange={setVisivel} /><span style={{ fontSize: 13, fontWeight: 600, color: INK }}>Visível na área deslogada</span></div>
    <button disabled={!titulo.trim()} style={{ ...primaryBtn, width: '100%', opacity: titulo.trim() ? 1 : 0.5 }} onClick={() => onSave({ titulo: titulo.trim(), conteudo, visivel, imagemUri })}><Check size={16} /> Salvar página</button>
  </Sheet>
}

const CARREGANDO = Symbol('carregando')

/* Kit L2146-L2343 — `grupo === "site"` de DevApp ("Site MorfoMod"). O wrapper
   `telaGrupo` (título + fundo DEV_BG) é o da tela do MorfoFinP que chama este
   componente (`DevApp.tsx` → `SubParametrosSite`). */
export default function SiteParametrosN0() {
  const config = useLiveQuery(() => db.configuracoes.get(1), [], CARREGANDO)
  const { platform, setPlatform } = usePlatformEditavel(config === CARREGANDO ? undefined : config)
  const [devToast, setDevToast] = useState('')
  const notify = (msg: string) => { setDevToast(msg); setTimeout(() => setDevToast(''), 2200) }
  const [sitePageEdit, setSitePageEdit] = useState<SitePage | 'nova' | null>(null)
  /* Kit L1370-L1381: upload de logo PRÓPRIA pro cabeçalho do site web */
  const siteLogoRef = useRef<HTMLInputElement>(null); const [siteLogoSlot, setSiteLogoSlot] = useState<'logoMorfoUri' | 'logoProdutoUri' | null>(null)
  const onSiteLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f || !siteLogoSlot) return
    if (!(f.type.startsWith('image/') || /\.svg$/i.test(f.name))) { notify('Só é possível enviar imagem ou SVG'); return }
    if (f.size > LOGO_MAX_KB * 1024) { notify(`Arquivo muito grande (máx. ${Math.round(LOGO_MAX_KB / 1024)}MB)`); return }
    try {
      const uri = await readImageAsDataUrl(f)
      setPlatform(p => ({ ...p, siteConfig: { ...(p.siteConfig || {}), webLayout: { ...(p.siteConfig?.webLayout || {}), header: { ...(p.siteConfig?.webLayout?.header || {}), [siteLogoSlot]: uri } } } }))
      notify('Logo do cabeçalho atualizada')
    } catch { notify('Não foi possível ler o arquivo') }
  }
  if (config === CARREGANDO) return null

  const w = siteWebLayoutDe(platform)
  const setW = (patch: Partial<NonNullable<SiteConfig['webLayout']>>) => setPlatform(p => ({ ...p, siteConfig: { ...(p.siteConfig || {}), webLayout: { ...(p.siteConfig?.webLayout || {}), ...patch } } }))
  const setH = (patch: Partial<SiteHeaderCfg>) => setPlatform(p => ({ ...p, siteConfig: { ...(p.siteConfig || {}), webLayout: { ...(p.siteConfig?.webLayout || {}), header: { ...(p.siteConfig?.webLayout?.header || {}), ...patch } } } }))
  const h = w.header
  const scAtual = platform.siteConfig || {}
  const setSc = (patch: Partial<SiteConfig>) => setPlatform(p => ({ ...p, siteConfig: { ...(p.siteConfig || {}), ...patch } }))
  const linhaLogo = (marca: 'morfo' | 'produto', rotulo: string, forma: 'quadrada' | 'horizontal', chaveForma: 'logoMorfo' | 'logoProduto', chaveUri: 'logoMorfoUri' | 'logoProdutoUri') => <Field key={marca} label={rotulo} dark>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1 }}><Segmented value={forma} onChange={(v) => setH({ [chaveForma]: v })} options={[{ value: 'quadrada', label: 'Quadrada' }, { value: 'horizontal', label: 'Horizontal' }]} /></div>
      <div style={{ width: 64, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <img src={logoHeaderSite(platform, marca, forma, h[chaveUri])} alt="" style={{ maxHeight: 26, maxWidth: 56, objectFit: 'contain' }} />
      </div>
    </div>
    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
      <button onClick={() => { setSiteLogoSlot(chaveUri); siteLogoRef.current?.click() }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', padding: '6px 10px' }}>{h[chaveUri] ? 'Trocar logo própria' : 'Subir logo só pro cabeçalho'}</button>
      {h[chaveUri] && <button onClick={() => setH({ [chaveUri]: null })} style={{ background: 'none', border: 'none', color: RED, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Remover (volta pras da Marca)</button>}
    </div>
  </Field>
  const secaoPaginaEntrar = (chave: 'loginPage' | 'loginPageMobile', rotuloSessao: string, rotuloDica: string): ReactNode => {
    const lp = loginPageCfgDe(platform.siteConfig, chave)
    const setLp = (patch: Partial<typeof lp>) => setPlatform(p => ({ ...p, siteConfig: { ...(p.siteConfig || {}), [chave]: { ...(p.siteConfig?.[chave] || {}), ...patch } } }))
    const formaLogo = (marca: 'morfo' | 'produto', rotulo: string, campo: 'logoMorfo' | 'logoProduto') => <Field key={chave + campo} label={rotulo} dark>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}><Segmented value={lp[campo]} onChange={(v) => setLp({ [campo]: v })} options={[{ value: 'quadrada', label: 'Quadrada' }, { value: 'horizontal', label: 'Horizontal' }]} /></div>
        <div style={{ width: 64, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src={logoHeaderSite(platform, marca, lp[campo], null)} alt="" style={{ maxHeight: 26, maxWidth: 56, objectFit: 'contain' }} />
        </div>
      </div>
    </Field>
    return <SecaoLayout dark titulo={rotuloSessao}>
      <p style={{ fontSize: 11, color: '#9B96A8', margin: '-4px 2px 12px', lineHeight: 1.5 }}>{rotuloDica}</p>
      <Field label="Logos da página de Entrar" dark>
        <Segmented value={lp.composicao} onChange={(v) => setLp({ composicao: v })} options={[{ value: 'ambos', label: 'Ambos' }, { value: 'morfo', label: 'Só Logo Morfo' }, { value: 'produto', label: 'Só Logo Produto' }]} />
      </Field>
      {(lp.composicao === 'morfo' || lp.composicao === 'ambos') && formaLogo('morfo', 'Logo da Morfo na página de Entrar (entre as já carregadas em Marca)', 'logoMorfo')}
      {(lp.composicao === 'produto' || lp.composicao === 'ambos') && formaLogo('produto', 'Logo do Produto na página de Entrar', 'logoProduto')}
      <Field label="Posicionamento do bloco de logos" dark>
        <Segmented value={lp.posicao} onChange={(v) => setLp({ posicao: v })} options={[{ value: 'esquerda', label: 'Esquerda' }, { value: 'centro', label: 'Centro' }, { value: 'direita', label: 'Direita' }]} />
      </Field>
      <Field label="Frase da página de Entrar (vazio = herda a frase de apresentação do site)" dark>
        <input style={inputStyle} value={lp.frase ?? ''} placeholder={scAtual.subtitulo ?? 'Plataforma de gestão para o seu negócio'} onChange={e => setLp({ frase: e.target.value || null })} />
      </Field>
      <Field label="Posição da frase em relação às logos" dark>
        <Segmented value={lp.frasePos} onChange={(v) => setLp({ frasePos: v })} options={[{ value: 'acima', label: 'Acima' }, { value: 'abaixo', label: 'Abaixo' }, { value: 'esquerda', label: 'À esquerda' }, { value: 'centro', label: 'Centro (na linha)' }, { value: 'direita', label: 'À direita' }, { value: 'ocultar', label: 'Ocultar' }]} />
      </Field>
      <Field label="Prévia da página de Entrar" dark>
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', padding: '18px 16px 6px', background: scAtual.cor1 && scAtual.cor2 ? `linear-gradient(160deg, ${scAtual.cor1}, ${scAtual.cor2})` : `linear-gradient(160deg, ${CORAL}, ${PURPLE} 40%, ${PURPLE_DEEP})` }}>
          <BlocoLogosLogin platform={platform} lp={lp} sc={scAtual} />
        </div>
      </Field>
    </SecaoLayout>
  }
  const sc = platform.siteConfig || {}

  return <>
    <p style={{ fontSize: 12, color: '#9B96A8', margin: '0 2px 12px', lineHeight: 1.5 }}>As páginas visíveis viram um menu na tela de Login (área deslogada) — o "site institucional" do {NOME_PRODUTO} dentro do app, gerenciado daqui.</p>
    <input ref={siteLogoRef} type="file" accept="image/*,.svg" style={{ display: 'none' }} onChange={onSiteLogoPick} />
    <SecaoLayout dark titulo="Menu de páginas do site (2ª linha, resolução web)">
      <Field label="Menu das páginas do site (2ª linha, só na resolução web)" dark>
        <Segmented value={w.modo} onChange={(v) => { setW({ modo: v }); notify('Layout do site atualizado') }} options={[{ value: 'horizontal', label: 'Horizontal (fixo, nunca recolhe)' }, { value: 'vertical', label: 'Vertical (recolhível)' }]} />
      </Field>
      {w.modo === 'vertical' && <Field label="Fixar/recolher do menu vertical do site" dark>
        <Segmented value={w.fixagemVertical} onChange={(v) => setW({ fixagemVertical: v })} options={[{ value: 'usuario_escolhe', label: 'Usuário escolhe' }, { value: 'sempre_fixo', label: 'Sempre fixo' }, { value: 'sempre_recolhido', label: 'Sempre recolhido' }]} />
      </Field>}
    </SecaoLayout>
    <SecaoLayout dark titulo="Cabeçalho do web (1ª linha)">
      <Field label="Composição das logos" dark>
        <Segmented value={h.composicao} onChange={(v) => setH({ composicao: v })} options={[{ value: 'morfo_produto', label: 'Morfo + Produto' }, { value: 'morfo', label: 'Só Morfo' }, { value: 'produto', label: 'Só Produto' }]} />
      </Field>
      {(h.composicao === 'morfo' || h.composicao === 'morfo_produto') && linhaLogo('morfo', 'Logo da Morfo (escolhe entre as já carregadas em Marca, ou sobe uma própria)', h.logoMorfo, 'logoMorfo', 'logoMorfoUri')}
      {(h.composicao === 'morfo' || h.composicao === 'morfo_produto') && <Field label="Posição da logo da Morfo na linha" dark>
        <Segmented value={h.posicaoMorfo!} onChange={(v) => setH({ posicaoMorfo: v })} options={[{ value: 'esquerda', label: 'Esquerda' }, { value: 'centro', label: 'Centro' }, { value: 'direita', label: 'Direita' }]} />
      </Field>}
      {(h.composicao === 'produto' || h.composicao === 'morfo_produto') && linhaLogo('produto', `Logo do Produto (${NOME_PRODUTO})`, h.logoProduto, 'logoProduto', 'logoProdutoUri')}
      {(h.composicao === 'produto' || h.composicao === 'morfo_produto') && <Field label="Posição da logo do Produto na linha" dark>
        <Segmented value={h.posicaoProduto!} onChange={(v) => setH({ posicaoProduto: v })} options={[{ value: 'esquerda', label: 'Esquerda' }, { value: 'centro', label: 'Centro' }, { value: 'direita', label: 'Direita' }]} />
      </Field>}
      <Field label="Altura da linha" dark>
        <Segmented value={h.altura} onChange={(v) => setH({ altura: v })} options={[{ value: 'estreita', label: 'Estreita' }, { value: 'larga', label: 'Larga' }]} />
      </Field>
      <Field label="Espaço extra em volta das logos" dark>
        <Segmented value={h.espaco} onChange={(v) => setH({ espaco: v })} options={[{ value: 'nenhum', label: 'Nenhum' }, { value: 'cima', label: 'Em cima' }, { value: 'baixo', label: 'Embaixo' }, { value: 'ambos', label: 'Ambos' }]} />
      </Field>
      <Field label="Frase de apresentação (frase que acompanha as logos no cabeçalho do site)" dark>
        <input style={inputStyle} value={scAtual.subtitulo ?? 'Plataforma de gestão para o seu negócio'} onChange={e => setSc({ subtitulo: e.target.value })} />
      </Field>
      <Field label="Cor da frase de apresentação" dark>
        <Segmented value={scAtual.fraseCor || 'fundo_escuro'} onChange={(v) => setSc({ fraseCor: v })} options={[{ value: 'fundo_claro', label: 'Pra fundo claro' }, { value: 'fundo_escuro', label: 'Pra fundo escuro' }, { value: 'destaque', label: 'Com destaque' }]} />
        <div style={{ marginTop: 8, borderRadius: 10, padding: '10px 12px', background: scAtual.cor1 && scAtual.cor2 ? `linear-gradient(120deg, ${scAtual.cor1}, ${scAtual.cor2})` : `linear-gradient(120deg, ${CORAL}, ${PURPLE_DEEP})`, textAlign: 'center' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, ...fraseCorStyle(scAtual) }}>{scAtual.subtitulo ?? 'Plataforma de gestão para o seu negócio'}</span>
        </div>
      </Field>
      <Field label="Posição da frase de apresentação" dark>
        <Segmented value={h.frasePos} onChange={(v) => setH({ frasePos: v })} options={[{ value: 'acima', label: 'Acima' }, { value: 'abaixo', label: 'Abaixo' }, { value: 'esquerda', label: 'À esquerda' }, { value: 'centro', label: 'Centro (na linha)' }, { value: 'direita', label: 'À direita' }, { value: 'ocultar', label: 'Ocultar' }]} />
      </Field>
      <Field label="Prévia do cabeçalho" dark>
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: scAtual.cor1 && scAtual.cor2 ? `linear-gradient(160deg, ${scAtual.cor1}, ${scAtual.cor2})` : `linear-gradient(160deg, ${CORAL}, ${PURPLE} 40%, ${PURPLE_DEEP})` }}>
          <SiteHeaderWeb platform={platform} cfg={w} />
        </div>
      </Field>
    </SecaoLayout>
    {secaoPaginaEntrar('loginPage', 'Página de Entrar (Login) — Web', 'Página OBRIGATÓRIA do site — já nasce na configuração, não pode ser excluída, só reposicionada entre as outras (na lista "Ordem das páginas no menu"). Vale só na resolução web.')}
    {secaoPaginaEntrar('loginPageMobile', 'Página de Entrar (Login) — Mobile', 'Mesmas opções acima, numa config PRÓPRIA e independente pra resolução MOBILE — pode deixar igual à do Web ou diferente.')}
    <SecaoLayout dark titulo="Layout do site no MOBILE">
      <Field label={'Tipo de menu do site no MOBILE (não muda a resolução web — lá vale a seção "Menu de páginas do site" acima)'} dark>
        <Segmented value={platform.siteMenu?.tipo || 'fixo'} onChange={(v) => { setPlatform(p => ({ ...p, siteMenu: { tipo: v } })); notify('Tipo de menu do site (mobile) atualizado') }} options={[{ value: 'fixo', label: 'Fixo (barra horizontal)' }, { value: 'cortina', label: 'Cortina vertical' }]} />
      </Field>
      <p style={{ fontSize: 11, color: '#9B96A8', margin: '-6px 2px 0', lineHeight: 1.5 }}>Só escolhe o TIPO de barra — a formatação (cores, ícones, estilo) é sempre a mesma configurada acima pro site: "Fixo" usa o visual da faixa horizontal e "Cortina vertical" usa o visual da gaveta vertical, ambas as seções do site.</p>
    </SecaoLayout>
    <SecaoLayout dark titulo="Personalização avançada do site">
      <Field label="Cores do fundo do Login (gradiente: início e fim)" dark>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="color" value={sc.cor1 || '#E8825A'} onChange={e => setSc({ cor1: e.target.value })} style={{ width: 54, height: 38, border: 'none', background: 'transparent', cursor: 'pointer' }} />
          <input type="color" value={sc.cor2 || '#2A1548'} onChange={e => setSc({ cor2: e.target.value })} style={{ width: 54, height: 38, border: 'none', background: 'transparent', cursor: 'pointer' }} />
          <button onClick={() => setSc({ cor1: undefined, cor2: undefined })} style={{ ...secondaryBtn, padding: '8px 12px', fontSize: 12 }}>Voltar ao padrão</button>
        </div>
      </Field>
      <Field label="Rodapé das páginas do site" dark><input style={inputStyle} value={sc.rodape ?? `${NOME_PRODUTO} · Desenvolvido por Morfo Sistemas`} onChange={e => setSc({ rodape: e.target.value })} /></Field>
      <Field label='Ordem das páginas no menu (inclui as páginas fixas "Entrar" e "Planos")' dark>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {paginasSiteComLogin(platform, false).map((pg, i, arr) => {
            const mover = (dir: number) => setPlatform(p => {
              const comb = paginasSiteComLogin(p, false); const j = i + dir; if (j < 0 || j >= comb.length) return p;
              [comb[i], comb[j]] = [comb[j], comb[i]]
              const novoIdxLogin = comb.filter(x => x.id !== SITE_PLANOS_PAGE_ID).findIndex(x => x.id === SITE_LOGIN_PAGE_ID)
              const novoIdxPlanos = comb.findIndex(x => x.id === SITE_PLANOS_PAGE_ID)
              return { ...p, sitePages: comb.filter(x => x.id !== SITE_LOGIN_PAGE_ID && x.id !== SITE_PLANOS_PAGE_ID), siteConfig: { ...(p.siteConfig || {}), loginPageIndex: novoIdxLogin, planosPageIndex: novoIdxPlanos } }
            })
            return <div key={pg.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: DEV_CARD, borderRadius: 10, padding: '7px 10px' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: pg.fixa ? DEV_ACCENT : '#fff', flex: 1 }}>{pg.titulo}{pg.id === SITE_PLANOS_PAGE_ID ? ' · fixa (espelha "Contratar um plano")' : pg.fixa ? ' · obrigatória' : ''}</span>
              <button disabled={i === 0} onClick={() => mover(-1)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', padding: '3px 8px', opacity: i === 0 ? 0.3 : 1 }}>↑</button>
              <button disabled={i === arr.length - 1} onClick={() => mover(1)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', padding: '3px 8px', opacity: i === arr.length - 1 ? 0.3 : 1 }}>↓</button>
            </div>
          })}
        </div>
      </Field>
    </SecaoLayout>
    <SecaoLayout dark titulo="Páginas do site">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {sitePagesDe(platform).map(pg => <div key={pg.id} style={{ background: DEV_CARD, borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={14} color={DEV_ACCENT} />
            <span style={{ fontWeight: 700, fontSize: 13.5, color: '#fff', flex: 1 }}>{pg.titulo}</span>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: pg.visivel ? GREEN : '#9B96A8' }}>{pg.visivel ? 'VISÍVEL' : 'OCULTA'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setSitePageEdit(pg)} style={{ ...secondaryBtn, flex: 1, padding: '7px', fontSize: 12 }}><Pencil size={13} /> Editar</button>
            <button onClick={() => { setPlatform(p => ({ ...p, sitePages: sitePagesDe(p).filter(x => x.id !== pg.id) })); notify('Página excluída') }} style={{ ...dangerBtn, flex: 1, padding: '7px', fontSize: 12 }}><X size={13} /> Excluir</button>
          </div>
        </div>)}
      </div>
      <button onClick={() => setSitePageEdit('nova')} style={{ ...secondaryBtn, width: '100%', background: DEV_CARD, border: 'none', color: DEV_ACCENT }}><Plus size={15} /> Nova página</button>
    </SecaoLayout>
    {sitePageEdit && <SitePageSheet initial={sitePageEdit === 'nova' ? null : sitePageEdit} onClose={() => setSitePageEdit(null)} onSave={(data) => { setPlatform(p => { const pages = sitePagesDe(p); return { ...p, sitePages: sitePageEdit === 'nova' ? [...pages, { id: uid(), ...data }] : pages.map(x => x.id === (sitePageEdit as SitePage).id ? { ...x, ...data } : x) } }); notify('Página salva'); setSitePageEdit(null) }} />}
    {devToast && <div style={{ position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)', background: '#000', color: '#fff', fontSize: 12.5, fontWeight: 700, padding: '8px 14px', borderRadius: 999, zIndex: 80, whiteSpace: 'nowrap' }}>{devToast}</div>}
  </>
}
