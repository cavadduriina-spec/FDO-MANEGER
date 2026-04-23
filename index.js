const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} = require('discord.js');

const fs = require('fs');

const TOKEN = process.env.TOKEN;

// 🔧 CONFIG
const CLIENT_ID = "1496610756404183070";
const GUILD_ID = "1496119913000206447";

const CANALE_DENUNCE = "1496781775849000970";
const CANALE_ARRESTI = "1496787661854212156";
const CANALE_PDA = "1496616270265581641";

const STAFF_ROLES = ["1496122762354229299", "1496613807953416202"];

// DATABASE
const DB_FILE = "./database.json";
let data = {};

if (fs.existsSync(DB_FILE)) {
  const raw = fs.readFileSync(DB_FILE);
  data = raw.length ? JSON.parse(raw) : { persone: {} };
}

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

function calcTempo(scadenza) {
  const now = new Date();
  const scad = new Date(scadenza);
  const diff = scad - now;
  const giorni = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (giorni > 0) return `Scade tra ${giorni} giorni`;
  if (giorni === 0) return `Scade oggi`;
  return `Scaduto da ${Math.abs(giorni)} giorni`;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log("Bot online");
});

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  // 📄 DENUNCIA
  if (interaction.commandName === "denuncia") {

    const esponente = interaction.options.getString("esponente");
    const imputato = interaction.options.getString("imputato");
    const nascita = interaction.options.getString("nascita");
    const reato = interaction.options.getString("reato");

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
NUOVA DENUNCIA

ID: ${denuncia.id}
Esponente: ${esponente}
Imputato: ${imputato}
Nascita: ${nascita}
Reato: ${reato}
`);

    return interaction.reply({ content: "Denuncia inviata", ephemeral: true });
  }

  // 🚔 ARRESTO
  if (interaction.commandName === "arresto") {

    const nome = interaction.options.getString("nome");
    const reati = interaction.options.getString("reati");
    const multa = interaction.options.getInteger("multa");
    const mesi = interaction.options.getInteger("mesi");
    const foto = interaction.options.getAttachment("foto");

    const persona = getPersona(nome);

    const arresto = {
      id: Date.now(),
      reati,
      multa,
      mesi,
      foto: foto.url
    };

    persona.arresti.push(arresto);
    save();

    const canale = await client.channels.fetch(CANALE_ARRESTI);

    canale.send(`
NUOVO ARRESTO

ID: ${arresto.id}
Nome: ${nome}
Reati: ${reati}
Multa: ${multa}
Mesi: ${mesi}
Foto: ${foto.url}
`);

    return interaction.reply(`Arresto registrato ID: ${arresto.id}`);
  }

  // ✏️ EDIT ARRESTO (STAFF)
  if (interaction.commandName === "edit_arresto") {

    if (!isStaff(interaction.member))
      return interaction.reply({ content: "Non hai permessi", ephemeral: true });

    const nome = interaction.options.getString("nome");
    const id = interaction.options.getString("id");
    const nuovaMulta = interaction.options.getInteger("multa");

    const persona = data.persone[nome];
    if (!persona) return interaction.reply("Persona non trovata");

    const arresto = persona.arresti.find(a => a.id == id);
    if (!arresto) return interaction.reply("Arresto non trovato");

    arresto.multa = nuovaMulta;
    save();

    return interaction.reply("Arresto modificato");
  }

  // 🔫 PDA RILASCIO
  if (interaction.commandName === "pda_rilascio") {

    const nome = interaction.options.getString("nome");
    const scadenza = interaction.options.getString("scadenza");
    const foto = interaction.options.getAttachment("foto");

    const persona = getPersona(nome);

    persona.pda = {
      scadenza,
      foto: foto.url
    };

    save();

    const canale = await client.channels.fetch(CANALE_PDA);

    canale.send(`
PDA RILASCIATO

Nome: ${nome}
Scadenza: ${scadenza}
Foto: ${foto.url}
`);

    return interaction.reply("PDA registrato");
  }

  // ✏️ EDIT PDA (STAFF)
  if (interaction.commandName === "edit_pda") {

    if (!isStaff(interaction.member))
      return interaction.reply({ content: "Non hai permessi", ephemeral: true });

    const nome = interaction.options.getString("nome");
    const nuovaScadenza = interaction.options.getString("scadenza");

    const persona = data.persone[nome];
    if (!persona || !persona.pda)
      return interaction.reply("PDA non trovato");

    persona.pda.scadenza = nuovaScadenza;
    save();

    return interaction.reply("PDA modificato");
  }

  // ℹ️ INFO
  if (interaction.commandName === "info") {

    const nome = interaction.options.getString("nome");
    const persona = data.persone[nome];

    if (!persona)
      return interaction.reply("Persona non trovata");

    let stato = "Non ha PDA";
    if (persona.pda)
      stato = calcTempo(persona.pda.scadenza);

    return interaction.reply(`
Nome: ${nome}

Denunce: ${persona.denunce.length}
Arresti: ${persona.arresti.length}

PDA: ${stato}
`);
  }

});

// SLASH COMMANDS
const commands = [

  new SlashCommandBuilder()
    .setName("denuncia")
    .setDescription("Fai denuncia")
    .addStringOption(o => o.setName("esponente").setDescription("Nome").setRequired(true))
    .addStringOption(o => o.setName("imputato").setDescription("Nome").setRequired(true))
    .addStringOption(o => o.setName("nascita").setDescription("Data nascita").setRequired(true))
    .addStringOption(o => o.setName("reato").setDescription("Reato").setRequired(true)),

  new SlashCommandBuilder()
    .setName("arresto")
    .setDescription("Fai arresto")
    .addStringOption(o => o.setName("nome").setDescription("Nome").setRequired(true))
    .addStringOption(o => o.setName("reati").setDescription("Reati").setRequired(true))
    .addIntegerOption(o => o.setName("multa").setDescription("Multa").setRequired(true))
    .addIntegerOption(o => o.setName("mesi").setDescription("Mesi").setRequired(true))
    .addAttachmentOption(o => o.setName("foto").setDescription("Foto").setRequired(true)),

  new SlashCommandBuilder()
    .setName("edit_arresto")
    .setDescription("Modifica arresto")
    .addStringOption(o => o.setName("nome").setDescription("Nome").setRequired(true))
    .addStringOption(o => o.setName("id").setDescription("ID arresto").setRequired(true))
    .addIntegerOption(o => o.setName("multa").setDescription("Nuova multa").setRequired(true)),

  new SlashCommandBuilder()
    .setName("pda_rilascio")
    .setDescription("Rilascia PDA")
    .addStringOption(o => o.setName("nome").setDescription("Nome").setRequired(true))
    .addStringOption(o => o.setName("scadenza").setDescription("YYYY-MM-DD").setRequired(true))
    .addAttachmentOption(o => o.setName("foto").setDescription("Foto").setRequired(true)),

  new SlashCommandBuilder()
    .setName("edit_pda")
    .setDescription("Modifica PDA")
    .addStringOption(o => o.setName("nome").setDescription("Nome").setRequired(true))
    .addStringOption(o => o.setName("scadenza").setDescription("Nuova scadenza").setRequired(true)),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Info persona")
    .addStringOption(o => o.setName("nome").setDescription("Nome RP").setRequired(true))

];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

client.login(TOKEN);