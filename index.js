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
const CANALE_MULTE = "1496787661854212156";

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
      multe: [],
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

client.on("interactionCreate", async interaction => {
  try {

    /* ===== BOTTONE MULTA ===== */
    if (interaction.isButton() && interaction.customId === "multa_btn") {

      const modal = new ModalBuilder()
        .setCustomId("multa_modal")
        .setTitle("Multa LSPD");

      const nome = new TextInputBuilder()
        .setCustomId("nome")
        .setLabel("Nome e Cognome")
        .setStyle(TextInputStyle.Short);

      const nascita = new TextInputBuilder()
        .setCustomId("nascita")
        .setLabel("Data di nascita")
        .setStyle(TextInputStyle.Short);

      const motivo = new TextInputBuilder()
        .setCustomId("motivo")
        .setLabel("Motivo")
        .setStyle(TextInputStyle.Paragraph);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nome),
        new ActionRowBuilder().addComponents(nascita),
        new ActionRowBuilder().addComponents(motivo)
      );

      return interaction.showModal(modal);
    }

    /* ===== INVIO MULTA ===== */
    if (interaction.isModalSubmit() && interaction.customId === "multa_modal") {

      await interaction.deferReply({ ephemeral: true });

      const nome = interaction.fields.getTextInputValue("nome");
      const nascita = interaction.fields.getTextInputValue("nascita");
      const motivo = interaction.fields.getTextInputValue("motivo");

      const db = loadDB();
      const persona = getPersona(db, nome);

      const id = db._global.id++;

      persona.multe.push({
        id,
        agente: interaction.user.tag,
        nascita,
        motivo
      });

      saveDB(db);

      const canale = await client.channels.fetch(CANALE_MULTE);

      await canale.send(`
MULTA ID: ${id}

Nome: ${nome}
Nascita: ${nascita}
Motivo: ${motivo}

Agente: ${interaction.user.tag}
`);

      return interaction.editReply("Multa mandata");
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
      const nuovoReato = interaction.options.getString("reati");
      const nuoviMesi = interaction.options.getInteger("mesi");

      const db = loadDB();

      for (const nome in db) {
        if (nome === "_global") continue;

        const arresto = db[nome].arresti.find(a => a.id === id);

        if (arresto) {
          if (nuovoReato) arresto.reati = nuovoReato;
          if (nuoviMesi) arresto.mesi = nuoviMesi;

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
      const nuovaScadenza = interaction.options.getString("scadenza");

      const db = loadDB();

      for (const nome in db) {
        if (nome === "_global") continue;

        if (db[nome].pda && db[nome].pda.id === id) {
          db[nome].pda.scadenza = nuovaScadenza;

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
        return interaction.editReply("Nessun dato trovato");
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
INFO PERSONA

Nome: ${nome}

${fedina}
${dettaglio}

Tot arresti: ${persona.arresti.length}
Tot multe: ${persona.multe.length}

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
    .setDescription("Arresto")
    .addStringOption(o => o.setName("nome").setRequired(true))
    .addStringOption(o => o.setName("reati").setRequired(true))
    .addIntegerOption(o => o.setName("mesi").setRequired(true))
    .addIntegerOption(o => o.setName("multa").setRequired(true)),

  new SlashCommandBuilder()
    .setName("edit_arresto")
    .setDescription("Modifica arresto")
    .addIntegerOption(o => o.setName("id").setRequired(true))
    .addStringOption(o => o.setName("reati"))
    .addIntegerOption(o => o.setName("mesi")),

  new SlashCommandBuilder()
    .setName("pda_rilascio")
    .setDescription("Rilascia PDA")
    .addStringOption(o => o.setName("nome").setRequired(true))
    .addStringOption(o => o.setName("scadenza").setRequired(true)),

  new SlashCommandBuilder()
    .setName("edit_pda")
    .setDescription("Modifica PDA")
    .addIntegerOption(o => o.setName("id").setRequired(true))
    .addStringOption(o => o.setName("scadenza")),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Info persona")
    .addStringOption(o => o.setName("nome").setRequired(true))

];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands
  });
})();

/* ===== BOTTONE MULTA ===== */
client.once("ready", async () => {

  const channel = await client.channels.fetch(CANALE_MULTE);

  const button = new ButtonBuilder()
    .setCustomId("multa_btn")
    .setLabel("MULTA")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("💸");

  const row = new ActionRowBuilder().addComponents(button);

  channel.send({
    content: "Usa questo bottone per segnare una multa",
    components: [row]
  });

});

client.login(TOKEN);