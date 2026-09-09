package app.morfo.morfofinp.notificacao;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import androidx.core.app.NotificationCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lê toda notificação postada no aparelho e guarda as que parecem ser de
 * movimentação financeira (texto com valor em "R$"). Nunca grava lançamento
 * sozinho — só enfileira (FilaNotificacoes) e avisa a pessoa com uma
 * notificação do próprio MorfoFinP ("Gasto detectado — toque pra confirmar").
 * Quem decide o que vira lançamento é sempre o usuário, na tela
 * "Notificações bancárias" do app (regra desde a concepção: confirmar ou
 * editar ANTES de gravar — ver `Histórico - Modalidade Light e Premium.md`).
 *
 * Filtro deliberadamente genérico (qualquer app cujo texto tenha "R$"), em
 * vez de uma lista fixa de pacotes de banco: cada banco muda o formato da
 * notificação quando quer, e o usuário pode ter bancos que a gente nunca
 * previu. O que NÃO deve ser capturado, o usuário marca como "ignorar este
 * app" na tela do MorfoFinP (`pacotesIgnorados`).
 */
public class NotificacaoListenerService extends NotificationListenerService {

    static final String CANAL_AVISO = "morfofinp_notificacao_bancaria";
    private static final int ID_AVISO = 41001;
    // "R$" seguido (com ou sem espaço) de dígito — cobre "R$ 12,50", "R$12,50",
    // "R$ 1.234,56". Não exige vírgula pra não perder "R$ 50".
    private static final Pattern VALOR = Pattern.compile("R\\$\\s*\\d");

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;
        try {
            processar(sbn);
        } catch (Exception e) {
            // Nunca deixa uma exceção derrubar o serviço do sistema — uma
            // notificação estranha de outro app não pode quebrar a leitura
            // das próximas.
        }
    }

    private void processar(StatusBarNotification sbn) throws JSONException {
        String pacote = sbn.getPackageName();
        if (pacote == null || pacote.equals(getPackageName())) return; // nunca a si mesmo
        if (FilaNotificacoes.pacotesIgnorados(this).contains(pacote)) return;

        Notification n = sbn.getNotification();
        if (n == null) return;
        // Notificações "em andamento" (player de música, download, GPS) e
        // resumos de grupo nunca são movimentação financeira.
        if ((n.flags & Notification.FLAG_ONGOING_EVENT) != 0) return;
        if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;

        Bundle extras = n.extras;
        if (extras == null) return;
        String titulo = texto(extras.getCharSequence(Notification.EXTRA_TITLE));
        String corpo = texto(extras.getCharSequence(Notification.EXTRA_BIG_TEXT));
        if (corpo.isEmpty()) corpo = texto(extras.getCharSequence(Notification.EXTRA_TEXT));
        if (corpo.isEmpty()) {
            CharSequence[] linhas = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
            if (linhas != null) {
                StringBuilder sb = new StringBuilder();
                for (CharSequence l : linhas) { if (sb.length() > 0) sb.append('\n'); sb.append(texto(l)); }
                corpo = sb.toString();
            }
        }
        String tudo = (titulo + " " + corpo).trim();
        if (tudo.isEmpty()) return;
        if (!VALOR.matcher(tudo).find()) return;

        JSONObject item = new JSONObject();
        item.put("id", UUID.randomUUID().toString());
        item.put("pacote", pacote);
        item.put("app", nomeDoApp(pacote));
        item.put("titulo", titulo);
        item.put("texto", corpo);
        item.put("recebidoEm", sbn.getPostTime() > 0 ? sbn.getPostTime() : System.currentTimeMillis());
        FilaNotificacoes.adicionar(this, item);

        // Se o app estiver aberto, entrega ao JS na hora (evento). Se não,
        // fica só na fila — o app pega ao abrir (`obterPendentes`).
        NotificacaoBancariaPlugin.avisarNova(item);

        avisarUsuario(tudo);
    }

    private static String texto(CharSequence cs) {
        return cs == null ? "" : cs.toString().trim();
    }

    private String nomeDoApp(String pacote) {
        try {
            PackageManager pm = getPackageManager();
            ApplicationInfo ai = pm.getApplicationInfo(pacote, 0);
            CharSequence label = pm.getApplicationLabel(ai);
            return label == null ? pacote : label.toString();
        } catch (Exception e) {
            return pacote;
        }
    }

    /** Notificação do PRÓPRIO MorfoFinP pedindo confirmação — abre o app ao tocar. */
    private void avisarUsuario(String textoOriginal) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel canal = new NotificationChannel(
                CANAL_AVISO, "Notificações bancárias (confirmar lançamento)", NotificationManager.IMPORTANCE_DEFAULT);
            canal.setDescription("Avisa quando o MorfoFinP detecta um gasto/recebimento numa notificação do banco ou cartão, pra você confirmar antes de virar lançamento.");
            nm.createNotificationChannel(canal);
        }
        Intent abrir = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = null;
        if (abrir != null) {
            abrir.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            abrir.putExtra("morfofinp_abrir_notificacoes", true);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
            pi = PendingIntent.getActivity(this, ID_AVISO, abrir, flags);
        }
        String valor = primeiroValor(textoOriginal);
        int pendentes = FilaNotificacoes.listar(this).length();
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CANAL_AVISO)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(valor.isEmpty() ? "Movimentação detectada" : "Movimentação detectada — " + valor)
            .setContentText(pendentes <= 1
                ? "Toque pra confirmar ou editar no MorfoFinP."
                : pendentes + " pendentes — toque pra confirmar no MorfoFinP.")
            .setStyle(new NotificationCompat.BigTextStyle().bigText(textoOriginal))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT);
        if (pi != null) b.setContentIntent(pi);
        try {
            nm.notify(ID_AVISO, b.build());
        } catch (SecurityException e) {
            // Sem permissão POST_NOTIFICATIONS (Android 13+) ainda — o item já
            // está na fila; a pessoa vê ao abrir o app.
        }
    }

    private static String primeiroValor(String texto) {
        Matcher m = Pattern.compile("R\\$\\s*[\\d.]+(,\\d{2})?").matcher(texto);
        return m.find() ? m.group() : "";
    }
}
