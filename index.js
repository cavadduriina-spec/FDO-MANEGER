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

const fs = require('fs');

const TOKEN = process.env.TOKEN;

const CLIENT_ID = "1496610756404183070";
const GUILD_ID = "1496119913000206447";

// SOLO QUESTO SERVE
const CANALE_DENUNCE = "1496787661854212156";

const STAFF_ROLES = ["1496122762354229299", "1496613807953416202"];

const DB_FILE = "./database.json";
let data = fs.existsSync(DB_FILE)
  ? JSON.parse(fs.readFileSync(DB_FILE) || "{}")
  : { persone: {} };

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function getPersona(nome) {
  if (!data.persone[nome]) {
    data.persone[nome] = {
      nome,
      denunce: [],
      arresti: [],
      pda: null
    };
  }
  return data.persone[nome];
}

function isStaff(member) {
  return member.roles.cache.some(r => STAFF_ROLES.includes(r.id));
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => console.log("ONLINE"));

client.on("interactionCreate", async interaction => {

  // ===== MODULO DENUNCIA =====
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

  // ===== INVIO DENUNCIA =====
  if (interaction.isModalSubmit() && interaction.customId === "modal_denuncia") {

    const esponente = interaction.fields.getTextInputValue("esponente");
    const imputato = interaction.fields.getTextInputValue("imputato");
    const nascita = interaction.fields.getTextInputValue("nascita");
    const reato = interaction.fields.getTextInputValue("reato");

    const persona = getPersona(imputato);

    const denuncia = {
      id: Date.now(),
      esponente,
      nascita,
      reato
    };

    persona.denunce.push(denuncia);
    save();

    const canale = await client.channels.fetch(CANALE_DENUNCE);

    canale.send(`
DENUNCIA

ID: ${denuncia.id}
Esponente: ${esponente}
Imputato: ${imputato}
Nascita: ${nascita}
Reato: ${reato}
`);

    return interaction.reply({ content: "Denuncia inviata", ephemeral: true });
  }

  // ===== ARRESTO =====
  if (interaction.commandName === "arresto") {

    const nome = interaction.options.getString("nome");
    const reati = interaction.options.getString("reati");
    const multa = interaction.options.getInteger("multa");
    const mesi = interaction.options.getInteger("mesi");
    const sequestrati = interaction.options.getString("sequestrati");
    const consegnati = interaction.options.getString("consegnati");
    const foto = interaction.options.getAttachment("foto");

    const persona = getPersona(nome);

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
    save();

    return interaction.reply(`
ARRESTO REGISTRATO

ID: ${arresto.id}
Agente: ${arresto.agente}

Reati: ${reati}
Multa: ${multa}
Mesi: ${mesi}

Sequestrati: ${sequestrati}
Consegnati: ${consegnati}
`);
  }

  // ===== PDA =====
  if (interaction.commandName === "pda_rilascio") {

    const nome = interaction.options.getString("nome");
    const scadenza = interaction.options.getString("scadenza");
    const foto = interaction.options.getAttachment("foto");

    const persona = getPersona(nome);

    persona.pda = {
      id: Date.now(),
      scadenza,
      foto: foto.url
    };

    save();

    return interaction.reply(`
PDA REGISTRATO

ID: ${persona.pda.id}
Nome: ${nome}
Scadenza: ${scadenza}
`);
  }

  // ===== TOGLI DENUNCIA =====
  if (interaction.commandName === "togli_denuncia") {

    if (!isStaff(interaction.member))
      return interaction.reply({ content: "No permessi", ephemeral: true });

    const nome = interaction.options.getString("nome");
    const id = interaction.options.getString("id");

    const persona = data.persone[nome];
    if (!persona) return interaction.reply("Persona non trovata");

    persona.denunce = persona.denunce.filter(d => d.id != id);
    save();

    return interaction.reply("Denuncia rimossa");
  }

  // ===== INFO =====
  if (interaction.commandName === "info") {

    const nome = interaction.options.getString("nome");
    const persona = data.persone[nome];

    if (!persona)
      return interaction.reply("Persona non trovata");

    let fedina = "Fedina pulita";

    if (persona.arresti.length > 0) {
      const a = persona.arresti.at(-1);
      fedina = `Arrestato da ${a.agente} per ${a.reati}`;
    }

    return interaction.reply(`
INFO

Nome: ${nome}

${fedina}

Denunce: ${persona.denunce.length}
Arresti: ${persona.arresti.length}

PDA: ${persona.pda ? "Presente" : "Assente"}
`);
  }

});