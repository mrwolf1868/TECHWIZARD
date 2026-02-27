require("dotenv").config()
const express = require("express")
const { getPairingCode } = require("./whatsapp")

const app = express()
app.use(express.json())

app.get("/", (req, res) => {
  res.send("TECHWIZARD Multi Lovable Running 🚀")
})

app.get("/pair", async (req, res) => {
  const number = req.query.number
  if (!number) return res.send("Use ?number=2547XXXXXXXX")

  try {
    const code = await getPairingCode(number)
    res.send(`Pairing Code for ${number}: ${code}`)
  } catch (err) {
    res.send("Error generating pairing code")
  }
})

app.get("/status", (req, res) => {
  res.send("Bot is running ✅")
})

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started")
})
