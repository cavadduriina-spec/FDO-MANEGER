const {
  Client,
  GatewayIntentBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder
} = require('discord.js');

const fs = require("fs");

/* CONFIG */
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1496610756404183070";
const GUILD_ID = "1496119913000206447";
const CANALE_DENUNCE = "1496787661854212156";

/* DATABASE */
function loadDB() {
  return JSON.parse(fs.readFileSync("database.json"));
}

function saveDB(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

function getKey(nome, nascita) {
  return `${nome}|${nascita}`;
}

function getPersona(db, key) {
  if (!db[key]) {
    db[key] = {
      nome: key.split("|")[0],
      nascita: key.split("|")[1],
      denunce: [],
      arresti: [],
      pda: null
    };
  }
  return db[key];
}

/* BOT */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("clientReady", () => {
  console.log("BOT ONLINE");
});

/* INTERAZIONI */
client.on("interactionCreate", async interaction => {
  try {

    /* ===== BOTTONI ===== */
    if (interaction.isButton()) {
      if (interaction.customId === "denuncia_btn") {

        const modal = new ModalBuilder()
          .setCustomId("denuncia_modal")
          .setTitle("Denuncia");

        const esponente = new TextInputBuilder()
          .setCustomId("esponente")
          .setLabel("Nome esponente")
          .setRequired(true)
          .setStyle(TextInputStyle.Short);

        const imputato = new TextInputBuilder()
          .setCustomId("imputato")
          .setLabel("Nome imputato")
          .setRequired(true)
          .setStyle(TextInputStyle.Short);

        const nascita = new TextInputBuilder()
          .setCustomId("nascita")
          .setLabel("Data nascita imputato")
          .setRequired(true)
          .setStyle(TextInputStyle.Short);

        const reato = new TextInputBuilder()
          .setCustomId("reato")
          .setLabel("Reato")
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph);

        modal.addComponents(
          new ActionRowBuilder().addComponents(esponente),
          new ActionRowBuilder().addComponents(imputato),
          new ActionRowBuilder().addComponents(nascita),
          new ActionRowBuilder().addComponents(reato)
        );

        return interaction.showModal(modal);
      }
      return;
    }

    /* ===== MODAL ===== */
    if (interaction.isModalSubmit()) {
      if (interaction.customId === "denuncia_modal") {

        const esponente = interaction.fields.getTextInputValue("esponente");
        const imputato = interaction.fields.getTextInputValue("imputato");
        const nascita = interaction.fields.getTextInputValue("nascita");
        const reato = interaction.fields.getTextInputValue("reato");

        const db = loadDB();
        const key = getKey(imputato, nascita);
        const persona = getPersona(db, key);

        const id = db._global.id++;

        persona.denunce.push({ id, esponente, reato });

        saveDB(db);

        let canale;
        try {
          canale = await client.channels.fetch(CANALE_DENUNCE);
        } catch {
          return interaction.reply({ content: "Errore canale denunce", ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setColor("Orange")
          .setTitle(`📄 DENUNCIA ID ${id}`)
          .addFields(
            { name: "👤 Imputato", value: imputato },
            { name: "📅 Nascita", value: nascita },
            { name: "⚠️ Reato", value: reato },
            { name: "🧑‍💼 Esponente", value: esponente }
          );

        await canale.send({ embeds: [embed] });

        return interaction.reply({ content: "Denuncia inviata", ephemeral: true });
      }
      return;
    }

    /* ===== COMANDI ===== */
    if (interaction.isChatInputCommand()) {

      /* ===== ARRESTO ===== */
      if (interaction.commandName === "arresto") {

        const nome = interaction.options.getString("nome");
        const nascita = interaction.options.getString("nascita");
        const reati = interaction.options.getString("reati");
        const mesi = interaction.options.getInteger("mesi");
        const multa = interaction.options.getInteger("multa");
        const sequestrati = interaction.options.getString("sequestrati");
        const consegnati = interaction.options.getString("consegnati");
        const foto = interaction.options.getAttachment("foto");

        const db = loadDB();
        const key = getKey(nome, nascita);
        const persona = getPersona(db, key);

        const id = db._global.id++;

        persona.arresti.push({
          id,
          agente: interaction.user.tag,
          reati,
          mesi,
          multa,
          sequestrati,
          consegnati,
          foto: foto.url
        });

        saveDB(db);

        const embed = new EmbedBuilder()
          .setColor("Red")
          .setTitle(`🚔 ARRESTO ID ${id}`)
          .addFields(
            { name: "👤 Nome", value: nome },
            { name: "📅 Nascita", value: nascita },
            { name: "⚖️ Reati", value: reati },
            { name: "⛓️ Mesi", value: mesi.toString() },
            { name: "💰 Multa", value: multa.toString() },
            { name: "📦 Sequestrati", value: sequestrati },
            { name: "📤 Consegnati", value: consegnati }
          )
          .setImage(foto.url);

        return interaction.reply({ embeds: [embed] });
      }

      /* ===== EDIT ARRESTO ===== */
      if (interaction.commandName === "edit_arresto") {

        const id = interaction.options.getInteger("id");
        const reati = interaction.options.getString("reati");
        const mesi = interaction.options.getInteger("mesi");
        const multa = interaction.options.getInteger("multa");

        const db = loadDB();

        for (const key in db) {
          if (key === "_global") continue;

          const p = db[key];

          const arresto = p.arresti.find(a => a.id === id);
          if (arresto) {
            if (reati) arresto.reati = reati;
            if (mesi) arresto.mesi = mesi;
            if (multa) arresto.multa = multa;

            saveDB(db);
            return interaction.reply("Arresto modificato");
          }
        }

        return interaction.reply("ID non trovato");
      }

      /* ===== PDA ===== */
      if (interaction.commandName === "pda_rilascio") {

        const nome = interaction.options.getString("nome");
        const nascita = interaction.options.getString("nascita");
        const scadenza = interaction.options.getString("scadenza");

        const db = loadDB();
        const key = getKey(nome, nascita);
        const persona = getPersona(db, key);

        const id = db._global.id++;

        persona.pda = { id, scadenza, attivo: true };

        saveDB(db);

        return interaction.reply(`🪪 PDA rilasciato ID ${id}`);
      }

      if (interaction.commandName === "pda_rinnova") {

        const nome = interaction.options.getString("nome");
        const nascita = interaction.options.getString("nascita");
        const scadenza = interaction.options.getString("scadenza");

        const db = loadDB();
        const key = getKey(nome, nascita);

        if (!db[key] || !db[key].pda) return interaction.reply("Nessun PDA");

        db[key].pda.scadenza = scadenza;
        db[key].pda.attivo = true;

        saveDB(db);

        return interaction.reply("PDA rinnovato");
      }

      if (interaction.commandName === "pda_ritira") {

        const nome = interaction.options.getString("nome");
        const nascita = interaction.options.getString("nascita");
        const motivo = interaction.options.getString("motivo");

        const db = loadDB();
        const key = getKey(nome, nascita);

        if (!db[key] || !db[key].pda) return interaction.reply("Nessun PDA");

        db[key].pda.attivo = false;
        db[key].pda.motivo = motivo;

        saveDB(db);

        return interaction.reply("PDA ritirato");
      }

      /* ===== INFO ===== */
      if (interaction.commandName === "info") {

        const nome = interaction.options.getString("nome");
        const nascita = interaction.options.getString("nascita");

        const db = loadDB();
        const key = getKey(nome, nascita);

        if (!db[key]) return interaction.reply("Nessun dato");

        const p = db[key];

        let fedina = p.arresti.length > 0 ? "Sporca" : "Pulita";

        let statoPDA = "Nessuno";

        if (p.pda) {
          const oggi = new Date();
          const scad = new Date(p.pda.scadenza.split("/").reverse().join("-"));
          const diff = Math.floor((scad - oggi) / (1000 * 60 * 60 * 24));

          if (!p.pda.attivo) statoPDA = "Ritirato";
          else if (diff < 0) statoPDA = "Scaduto";
          else statoPDA = `Valido (${diff} giorni)`;
        }

        const embed = new EmbedBuilder()
          .setColor("Blue")
          .setTitle("📋 INFO PERSONA")
          .addFields(
            { name: "👤 Nome", value: p.nome },
            { name: "📅 Nascita", value: p.nascita },
            { name: "🧾 Fedina", value: fedina },
            { name: "📄 Denunce", value: p.denunce.length.toString() },
            { name: "🚔 Arresti", value: p.arresti.length.toString() },
            { name: "🪪 PDA", value: statoPDA }
          );

        return interaction.reply({ embeds: [embed] });
      }

    }

  } catch (err) {
    console.log("ERRORE:", err);

    if (interaction.deferred || interaction.replied) {
      return interaction.followUp({ content: "Errore interno", ephemeral: true });
    } else {
      return interaction.reply({ content: "Errore interno", ephemeral: true });
    }
  }
});

/* COMANDI */
const commands = [
  new SlashCommandBuilder()
    .setName("arresto")
    .setDescription("Arresto")
    .addStringOption(o => o.setName("nome").setRequired(true))
    .addStringOption(o => o.setName("nascita").setRequired(true))
    .addStringOption(o => o.setName("reati").setRequired(true))
    .addIntegerOption(o => o.setName("mesi").setRequired(true))
    .addIntegerOption(o => o.setName("multa").setRequired(true))
    .addStringOption(o => o.setName("sequestrati").setRequired(true))
    .addStringOption(o => o.setName("consegnati").setRequired(true))
    .addAttachmentOption(o => o.setName("foto").setRequired(true)),

  new SlashCommandBuilder()
    .setName("edit_arresto")
    .setDescription("Modifica arresto")
    .addIntegerOption(o => o.setName("id").setRequired(true))
    .addStringOption(o => o.setName("reati"))
    .addIntegerOption(o => o.setName("mesi"))
    .addIntegerOption(o => o.setName("multa")),

  new SlashCommandBuilder()
    .setName("pda_rilascio")
    .setDescription("Rilascia PDA")
    .addStringOption(o => o.setName("nome").setRequired(true))
    .addStringOption(o => o.setName("nascita").setRequired(true))
    .addStringOption(o => o.setName("scadenza").setRequired(true)),

  new SlashCommandBuilder()
    .setName("pda_rinnova")
    .setDescription("Rinnova PDA")
    .addStringOption(o => o.setName("nome").setRequired(true))
    .addStringOption(o => o.setName("nascita").setRequired(true))
    .addStringOption(o => o.setName("scadenza").setRequired(true)),

  new SlashCommandBuilder()
    .setName("pda_ritira")
    .setDescription("Ritira PDA")
    .addStringOption(o => o.setName("nome").setRequired(true))
    .addStringOption(o => o.setName("nascita").setRequired(true))
    .addStringOption(o => o.setName("motivo").setRequired(true)),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Info persona")
    .addStringOption(o => o.setName("nome").setRequired(true))
    .addStringOption(o => o.setName("nascita").setRequired(true))
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands
  });
})();

/* BOTTONE DENUNCIA */
client.once("clientReady", async () => {
  const channel = await client.channels.fetch(CANALE_DENUNCE);

  const button = new ButtonBuilder()
    .setCustomId("denuncia_btn")
    .setLabel("DENUNCIA")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("📄");

  const row = new ActionRowBuilder().addComponents(button);

  channel.send({
    content: "Clicca per fare una denuncia",
    components: [row]
  });
});

client.login(TOKEN);