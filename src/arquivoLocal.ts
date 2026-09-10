/* Salvar um arquivo de texto no aparelho, funcionando nos DOIS lugares onde
   este app roda (10/09/2026, junto do backup).

   O problema real: no navegador, `<a download>` com um Blob resolve. Dentro
   do aplicativo Android (WebView do Capacitor) esse mesmo link normalmente
   NÃO faz nada — e "não acontece nada" é exatamente o tipo de bug que já
   apareceu várias vezes neste projeto. Por isso aqui existe uma CADEIA de
   tentativas, e a última delas nunca falha: mostrar o conteúdo na tela pra
   copiar à mão.

   Ordem:
     1. App instalado → grava em Documentos e abre a folha de compartilhar
        (Filesystem + Share do Capacitor) — a pessoa escolhe onde guardar.
     2. Navegador/WebView com `navigator.share` de arquivo → compartilha.
     3. Navegador → download normal (`<a download>` + Blob).
     4. Nada disso funcionou → devolve o conteúdo pra tela mostrar num campo
        de texto, com botão de copiar.

   Cada etapa é tentada dentro do seu próprio try/catch: uma falhar nunca
   impede a próxima. */
import { Capacitor } from '@capacitor/core'

export type ResultadoSalvar =
  | { via: 'app'; caminho: string }
  | { via: 'compartilhar' }
  | { via: 'download' }
  | { via: 'tela'; conteudo: string; motivo: string }

export async function salvarArquivoTexto(nome: string, conteudo: string): Promise<ResultadoSalvar> {
  const erros: string[] = []

  // 1. Dentro do aplicativo instalado.
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')
      await Filesystem.writeFile({ path: nome, data: conteudo, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true })
      const { uri } = await Filesystem.getUri({ path: nome, directory: Directory.Documents })
      try {
        await Share.share({ title: 'Backup do MorfoFinP', text: nome, url: uri, dialogTitle: 'Guardar o backup em…' })
      } catch {
        /* A pessoa pode fechar a folha de compartilhamento — o arquivo JÁ foi
           gravado em Documentos, então isso não é falha: só não foi enviado
           pra outro app. */
      }
      return { via: 'app', caminho: 'Documentos/' + nome }
    } catch (e) {
      erros.push('gravar no aparelho: ' + (e as Error)?.message)
    }
  }

  const blob = new Blob([conteudo], { type: 'application/json;charset=utf-8' })

  // 2. Compartilhamento nativo do navegador (Android/iOS modernos).
  try {
    const arquivo = new File([blob], nome, { type: 'application/json' })
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean; share?: (d: unknown) => Promise<void> }
    if (nav.canShare?.({ files: [arquivo] }) && nav.share) {
      await nav.share({ files: [arquivo], title: 'Backup do MorfoFinP' })
      return { via: 'compartilhar' }
    }
  } catch (e) {
    erros.push('compartilhar: ' + (e as Error)?.message)
  }

  // 3. Download comum do navegador.
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.setTimeout(() => URL.revokeObjectURL(url), 4000)
    return { via: 'download' }
  } catch (e) {
    erros.push('download: ' + (e as Error)?.message)
  }

  // 4. Última saída: nunca deixar sem resposta visível.
  return { via: 'tela', conteudo, motivo: erros.join(' · ') || 'este ambiente não permite salvar arquivo' }
}

/* Abre o seletor de arquivos e devolve o TEXTO do arquivo escolhido.
   `<input type="file">` funciona tanto no navegador quanto no WebView do
   Android, então aqui não é preciso cadeia de tentativas. */
export function escolherArquivoTexto(accept = 'application/json,.json'): Promise<{ nome: string; texto: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) { resolve(null); return }
      try {
        resolve({ nome: f.name, texto: await f.text() })
      } catch {
        resolve(null)
      }
    }
    input.click()
  })
}
