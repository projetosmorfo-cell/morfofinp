// Lado JS do plugin fica no app (`src/notificacaoBancaria.ts`, via
// `registerPlugin('NotificacaoBancaria')`). Este arquivo existe só pra o
// pacote ser um módulo npm válido — o Capacitor descobre o código nativo
// pelo campo `capacitor.android.src` do package.json, não por aqui.
module.exports = {}
