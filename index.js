const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');

const mongoose = require("mongoose");

/* =========================
   VARIABILI SICURE
========================= */
const TOKEN = process.env.TOKEN;
const MONGO_URI = process.env.MONGO_URI;

/* =========================
   ID DENTRO SCRIPT (COME VUOI TU)
========================= */
const CLIENT_ID = "1496610756404183070";
const GUILD_ID = "1496119913000206447";
const CANALE_DENUNCE = "1496787661854212156";

/* =========================
   DATABASE
========================= */
mongoose.connect(MONGO_URI)
.then(() => console.log("MongoDB connesso"))
.catch(err => console.log(err));

const personaSchema = new mongoose.Schema({
  nome: String,
  denunce: Array,
  arresti: Array,
  pda: Object
});

const Persona = mongoose.model("Persona", personaSchema);

async function getPersona(nome) {
  let p = await Persona.findOne({ nome });

  if (!p) {
    p = new Persona({
      nome,
      denunce: [],
      arresti: [],
      pda: null
    });
    await p.save();
  }

  return p;
}

/* =========================
   BOT
========================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => console.log("BOT ONLINE"));

client.on("interactionCreate", async interaction => {

  try {

    /* ===== APERTURA MODULO DENUNCIA ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === "denuncia") {

      const modal = new ModalBuilder()
        .setCustomId("modal_denuncia")
        .setTitle("Modulo Denuncia");

      const esponente = new TextInputBuilder()
        .setCustomId("esponente")
        .setLabel("Nome esponente")
        .setStyle(TextInputStyle.Short);

      const imputato = new TextInputBuilder()
        .setCustomId("imputato")
        .setLabel("Nome imputato")
        .setStyle(TextInputStyle.Short);

      const nascita = new TextInputBuilder()
        .setCustomId("nascita")
        .setLabel("Data nascita")
        .setStyle(TextInputStyle.Short);

      const reato = new TextInputBuilder()
        .setCustomId("reato")
        .setLabel("Reato")
        .setStyle(TextInputStyle.Paragraph);

      modal.addComponents(
        new ActionRowBuilder().addComponents(esponente),
        new ActionRowBuilder().addComponents(imputato),
        new ActionRowBuilder().addComponents(nascita),
        new ActionRowBuilder().addComponents(reato)
      );

      return interaction.showModal(modal);
    }

    /* ===== INVIO MODULO DENUNCIA → CANALE ===== */
    if (interaction.isModalSubmit() && interaction.customId === "modal_denuncia") {

      await interaction.deferReply({ ephemeral: true });

      const esponente = interaction.fields.getTextInputValue("esponente");
      const imputato = interaction.fields.getTextInputValue("imputato");
      const nascita = interaction.fields.getTextInputValue("nascita");
      const reato = interaction.fields.getTextInputValue("reato");

      const persona = await getPersona(imputato);

      const denuncia = {
        id: Date.now(),
        esponente,
        nascita,
        reato
      };

      persona.denunce.push(denuncia);
      await persona.save();

      /* 🔥 QUI ARRIVA IL MODULO DENUNCIA */
      const canale = await client.channels.fetch(CANALE_DENUNCE);

      await canale.send(`
DENUNCIA

ID: ${denuncia.id}
Esponente: ${esponente}
Imputato: ${imputato}
Nascita: ${nascita}
Reato: ${reato}
`);

      return interaction.editReply("Denuncia inviata");
    }

    /* ===== ARRESTO ===== */
    if (interaction.commandName === "arresto") {

      await interaction.deferReply();

      const nome = interaction.options.getString("nome");
      const reati = interaction.options.getString("reati");
      const multa = interaction.options.getInteger("multa");
      const mesi = interaction.options.getInteger("mesi");
      const sequestrati = interaction.options.getString("sequestrati");
      const consegnati = interaction.options.getString("consegnati");
      const foto = interaction.options.getAttachment("foto");

      const persona = await getPersona(nome);

      const arresto = {
        id: Date.now(),
        agente: interaction.user.username,
        reati,
        multa,
        mesi,
        sequestrati,
        consegnati,
        foto: foto.url
      };

      persona.arresti.push(arresto);
      await persona.save();

      return interaction.editReply(`Arresto registrato ID: ${arresto.id}`);
    }

    /* ===== PDA ===== */
    if (interaction.commandName === "pda_rilascio") {

      await interaction.deferReply();

      const nome = interaction.options.getString("nome");
      const scadenza = interaction.options.getString("scadenza");
      const foto = interaction.options.getAttachment("foto");

      const persona = await getPersona(nome);

      persona.pda = {
        id: Date.now(),
        scadenza,
        foto: foto.url
      };

      await persona.save();

      return interaction.editReply("PDA registrato");
    }

    /* ===== INFO ===== */
    if (interaction.commandName === "info") {

      await interaction.deferReply();

      const nome = interaction.options.getString("nome");
      const persona = await Persona.findOne({ nome });

      if (!persona)
        return interaction.editReply("Persona non trovata");

      let fedina = "Fedina pulita";

      if (persona.arresti.length > 0) {
        const a = persona.arresti.at(-1);
        fedina = `Arrestato da ${a.agente} per ${a.reati}`;
      }

      return interaction.editReply(`
INFO

Nome: ${nome}
${fedina}

Denunce: ${persona.denunce.length}
Arresti: ${persona.arresti.length}
PDA: ${persona.pda ? "Presente" : "Assente"}
`);
    }

  } catch (err) {
    console.log(err);
    if (interaction.deferred)
      interaction.editReply("Errore");
    else
      interaction.reply({ content: "Errore", ephemeral: true });
  }

});

/* =========================
   COMANDI
========================= */
const commands = [

  new SlashCommandBuilder()
    .setName("denuncia")
    .setDescription("Apri modulo denuncia"),

  new SlashCommandBuilder()
    .setName("arresto")
    .setDescription("Arresto")
    .addStringOption(o => o.setName("nome").setDescription("Nome").setRequired(true))
    .addStringOption(o => o.setName("reati").setDescription("Reati").setRequired(true))
    .addIntegerOption(o => o.setName("multa").setDescription("Multa").setRequired(true))
    .addIntegerOption(o => o.setName("mesi").setDescription("Mesi").setRequired(true))
    .addStringOption(o => o.setName("sequestrati").setDescription("Sequestrati").setRequired(true))
    .addStringOption(o => o.setName("consegnati").setDescription("Consegnati").setRequired(true))
    .addAttachmentOption(o => o.setName("foto").setDescription("Foto").setRequired(true)),

  new SlashCommandBuilder()
    .setName("pda_rilascio")
    .setDescription("Rilascia PDA")
    .addStringOption(o => o.setName("nome").setDescription("Nome").setRequired(true))
    .addStringOption(o => o.setName("scadenza").setDescription("Scadenza").setRequired(true))
    .addAttachmentOption(o => o.setName("foto").setDescription("Foto").setRequired(true)),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Info persona")
    .addStringOption(o => o.setName("nome").setDescription("Nome").setRequired(true))

];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
})();

client.login(TOKEN);