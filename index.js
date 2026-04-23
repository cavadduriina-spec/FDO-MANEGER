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
  Routes
} = require('discord.js');

const fs = require("fs");

/* ===== CONFIG ===== */
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

client.once("clientReady", () => console.log("BOT ONLINE"));

/* INTERAZIONI */
client.on("interactionCreate", async interaction => {
  try {

    /* ================= BOTTONI ================= */
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

    /* ================= MODAL ================= */
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

        const canale = await client.channels.fetch(CANALE_DENUNCE);

        const embed = new EmbedBuilder()
          .setTitle(`DENUNCIA ID ${id}`)
          .addFields(
            { name: "Imputato", value: imputato },
            { name: "Nascita", value: nascita },
            { name: "Reato", value: reato },
            { name: "Esponente", value: esponente }
          );

        await canale.send({ embeds: [embed] });

        return interaction.reply({ content: "Denuncia inviata", ephemeral: true });
      }

      return;
    }

    /* ================= COMANDI ================= */
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
          .setTitle(`ARRESTO ID ${id}`)
          .addFields(
            { name: "Nome", value: nome },
            { name: "Nascita", value: nascita },
            { name: "Reati", value: reati },
            { name: "Mesi", value: mesi.toString() },
            { name: "Multa", value: multa.toString() },
            { name: "Sequestrati", value: sequestrati },
            { name: "Consegnati", value: consegnati }
          )
          .setImage(foto.url);

        return interaction.reply({ embeds: [embed] });
      }

      /* ===== INFO ===== */
      if (interaction.commandName === "info") {

        const nome = interaction.options.getString("nome");
        const nascita = interaction.options.getString("nascita");

        const db = loadDB();
        const key = getKey(nome, nascita);

        if (!db[key]) {
          return interaction.reply("Nessun dato");
        }

        const p = db[key];

        let fedina = "Pulita";
        if (p.arresti.length > 0) fedina = "Sporca";

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
          .setTitle("INFO PERSONA")
          .addFields(
            { name: "Nome", value: p.nome },
            { name: "Nascita", value: p.nascita },
            { name: "Fedina", value: fedina },
            { name: "Denunce", value: p.denunce.length.toString() },
            { name: "Arresti", value: p.arresti.length.toString() },
            { name: "PDA", value: statoPDA }
          );

        return interaction.reply({ embeds: [embed] });
      }

    }

  } catch (err) {
    console.log(err);
    interaction.reply({ content: "Errore", ephemeral: true });
  }
});

/* COMANDI */
const commands = [

  new SlashCommandBuilder()
    .setName("arresto")
    .setDescription("Arresto")
    .addStringOption(o => o.setName("nome").setDescription("Nome").setRequired(true))
    .addStringOption(o => o.setName("nascita").setDescription("Nascita").setRequired(true))
    .addStringOption(o => o.setName("reati").setDescription("Reati").setRequired(true))
    .addIntegerOption(o => o.setName("mesi").setDescription("Mesi").setRequired(true))
    .addIntegerOption(o => o.setName("multa").setDescription("Multa").setRequired(true))
    .addStringOption(o => o.setName("sequestrati").setDescription("Oggetti sequestrati").setRequired(true))
    .addStringOption(o => o.setName("consegnati").setDescription("Oggetti consegnati").setRequired(true))
    .addAttachmentOption(o => o.setName("foto").setDescription("Foto").setRequired(true)),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Info persona")
    .addStringOption(o => o.setName("nome").setDescription("Nome").setRequired(true))
    .addStringOption(o => o.setName("nascita").setDescription("Nascita").setRequired(true))

];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands
  });
})();

/* BOTTONE */
client.once("clientReady", async () => {
  const channel = await client.channels.fetch(CANALE_DENUNCE);

  const button = new ButtonBuilder()
    .setCustomId("denuncia_btn")
    .setLabel("DENUNCIA")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("📄");

  const row = new ActionRowBuilder().addComponents(button);

  channel.send({
    content: "Premi per fare una denuncia",
    components: [row]
  });
});

client.login(TOKEN);