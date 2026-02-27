const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require("@whiskeysockets/baileys")

const pino = require("pino")
const fs = require("fs")

const sessions = {}

async function startSession(number) {
  const sessionPath = `sessions/${number}`

  if (!fs.existsSync("sessions")) {
    fs.mkdirSync("sessions")
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: state,
    version
  })

  sock.ev.on("creds.update", saveCreds)

  // Welcome message
  sock.ev.on("group-participants.update", async (update) => {
    if (update.action === "add") {
      for (let participant of update.participants) {
        await sock.sendMessage(update.id, {
          text: `Welcome @${participant.split("@")[0]} 🎉`,
          mentions: [participant]
        })
      }
    }
  })

  // Auto join via invite link
  sock.ev.on("messages.upsert", async (msg) => {
    const m = msg.messages[0]
    if (!m.message) return

    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text

    if (text && text.includes("chat.whatsapp.com/")) {
      const inviteCode = text.split("chat.whatsapp.com/")[1]
      try {
        await sock.groupAcceptInvite(inviteCode)
      } catch {}
    }
  })

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut

      if (shouldReconnect) startSession(number)
    }

    if (connection === "open") {
      console.log(`User ${number} connected ✅`)
    }
  })

  sessions[number] = sock
  return sock
}

async function getPairingCode(number) {
  if (!sessions[number]) {
    await startSession(number)
  }
  return await sessions[number].requestPairingCode(number)
}

module.exports = { getPairingCode }
