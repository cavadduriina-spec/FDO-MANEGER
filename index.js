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

/* ===== DATABASE ===== */
function loadDB() {
  return JSON.parse(fs.readFileSync("database.json"));
}

function saveDB(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

function getPersona(db, nome) {
  if (!db[nome]) {
    db[nome] = {
      denunce: [],
      arresti: [],
      pda: null
    };
  }
  return db[nome];
}

/* ===== BOT ===== */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => console.log("BOT ONLINE"));

/* ===== INTERAZIONI ===== */
client.on("interactionCreate", async interaction => {
  try {

    /* ===== BOTTONE DENUNCIA ===== */
    if (interaction.isButton() && interaction.customId === "denuncia_btn") {

      const modal = new ModalBuilder()
        .setCustomId("denuncia_modal")
        .setTitle("Denuncia");

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
        .setLabel("Data nascita imputato")
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

    /* ===== INVIO DENUNCIA ===== */
    if (interaction.isModalSubmit() && interaction.customId === "denuncia_modal") {

      await interaction.deferReply({ ephemeral: true });

      const esponente = interaction.fields.getTextInputValue("esponente");
      const imputato = interaction.fields.getTextInputValue("imputato");
      const nascita = interaction.fields.getTextInputValue("nascita");
      const reato = interaction.fields.getTextInputValue("reato");

      const db = loadDB();
      const persona = getPersona(db, imputato);

      const id = db._global.id++;

      persona.denunce.push({
        id,
        esponente,
        nascita,
        reato
      });

      saveDB(db);

      const canale = await client.channels.fetch(CANALE_DENUNCE);

      await canale.send(`
DENUNCIA ID: ${id}

Esponente: ${esponente}
Imputato: ${imputato}
Nascita: ${nascita}
Reato: ${reato}
`);

      return interaction.editReply("Denuncia inviata");
    }

    /* ===== ARRESTO ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === "arresto") {

      await interaction.deferReply();

      const nome = interaction.options.getString("nome");
      const reati = interaction.options.getString("reati");
      const mesi = interaction.options.getInteger("mesi");
      const multa = interaction.options.getInteger("multa");

      const db = loadDB();
      const persona = getPersona(db, nome);

      const id = db._global.id++;

      persona.arresti.push({
        id,
        agente: interaction.user.tag,
        reati,
        mesi,
        multa
      });

      saveDB(db);

      return interaction.editReply(`Arresto registrato ID: ${id}`);
    }

    /* ===== EDIT ARRESTO ===== */
    if (interaction.commandName === "edit_arresto") {

      await interaction.deferReply();

      const id = interaction.options.getInteger("id");
      const reati = interaction.options.getString("reati");
      const mesi = interaction.options.getInteger("mesi");
      const multa = interaction.options.getInteger("multa");

      const db = loadDB();

      for (const nome in db) {
        if (nome === "_global") continue;

        const arresto = db[nome].arresti.find(a => a.id === id);

        if (arresto) {
          if (reati) arresto.reati = reati;
          if (mesi) arresto.mesi = mesi;
          if (multa) arresto.multa = multa;

          saveDB(db);
          return interaction.editReply("Arresto modificato");
        }
      }

      return interaction.editReply("ID non trovato");
    }

    /* ===== PDA ===== */
    if (interaction.commandName === "pda_rilascio") {

      await interaction.deferReply();

      const nome = interaction.options.getString("nome");
      const scadenza = interaction.options.getString("scadenza");

      const db = loadDB();
      const persona = getPersona(db, nome);

      const id = db._global.id++;

      persona.pda = {
        id,
        scadenza
      };

      saveDB(db);

      return interaction.editReply(`PDA rilasciato ID: ${id}`);
    }

    /* ===== EDIT PDA ===== */
    if (interaction.commandName === "edit_pda") {

      await interaction.deferReply();

      const id = interaction.options.getInteger("id");
      const scadenza = interaction.options.getString("scadenza");

      const db = loadDB();

      for (const nome in db) {
        if (nome === "_global") continue;

        if (db[nome].pda && db[nome].pda.id === id) {
          db[nome].pda.scadenza = scadenza;
          saveDB(db);
          return interaction.editReply("PDA modificato");
        }
      }

      return interaction.editReply("ID non trovato");
    }

    /* ===== INFO ===== */
    if (interaction.commandName === "info") {

      await interaction.deferReply();

      const nome = interaction.options.getString("nome");
      const db = loadDB();

      if (!db[nome]) {
        return interaction.editReply("Nessun dato");
      }

      const persona = db[nome];

      let fedina = "Fedina pulita";
      let dettaglio = "";

      if (persona.arresti.length > 0) {
        const ultimo = persona.arresti.at(-1);
        fedina = "Fedina sporca";
        dettaglio = `\nArrestato da ${ultimo.agente} per ${ultimo.reati}`;
      }

      return interaction.editReply(`
INFO

Nome: ${nome}

${fedina}
${dettaglio}

Denunce: ${persona.denunce.length}
Arresti: ${persona.arresti.length}

PDA: ${persona.pda ? "SI" : "NO"}
${persona.pda ? `Scadenza: ${persona.pda.scadenza}` : ""}
`);
    }

  } catch (err) {
    console.log(err);
    interaction.reply({ content: "Errore", ephemeral: true });
  }
});

/* ===== COMANDI ===== */
const commands = [

  new SlashCommandBuilder()
    .setName("arresto")
    .setDescription("Registra arresto")
    .addStringOption(o => o.setName("nome").setDescription("Nome").setRequired(true))
    .addStringOption(o => o.setName("reati").setDescription("Reati").setRequired(true))
    .addIntegerOption(o => o.setName("mesi").setDescription("Mesi").setRequired(true))
    .addIntegerOption(o => o.setName("multa").setDescription("Multa").setRequired(true)),

  new SlashCommandBuilder()
    .setName("edit_arresto")
    .setDescription("Modifica arresto")
    .addIntegerOption(o => o.setName("id").setDescription("ID").setRequired(true))
    .addStringOption(o => o.setName("reati").setDescription("Nuovi reati"))
    .addIntegerOption(o => o.setName("mesi").setDescription("Nuovi mesi"))
    .addIntegerOption(o => o.setName("multa").setDescription("Nuova multa")),

  new SlashCommandBuilder()
    .setName("pda_rilascio")
    .setDescription("Rilascia PDA")
    .addStringOption(o => o.setName("nome").setDescription("Nome").setRequired(true))
    .addStringOption(o => o.setName("scadenza").setDescription("Scadenza").setRequired(true)),

  new SlashCommandBuilder()
    .setName("edit_pda")
    .setDescription("Modifica PDA")
    .addIntegerOption(o => o.setName("id").setDescription("ID").setRequired(true))
    .addStringOption(o => o.setName("scadenza").setDescription("Nuova scadenza")),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Info persona")
    .addStringOption(o => o.setName("nome").setDescription("Nome").setRequired(true))

];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands
  });
})();

/* ===== BOTTONE DENUNCIA ===== */
client.once("ready", async () => {

  const channel = await client.channels.fetch(CANALE_DENUNCE);

  const button = new ButtonBuilder()
    .setCustomId("denuncia_btn")
    .setLabel("DENUNCIA")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("📄");

  const row = new ActionRowBuilder().addComponents(button);

  channel.send({
    content: "Premi il bottone per fare una denuncia",
    components: [row]
  });

});

client.login(TOKEN);