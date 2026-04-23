const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  REST,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder
} = require('discord.js');

const fs = require('fs');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const CANALE_DENUNCE = process.env.CANALE_DENUNCE;

// DB
let db = { persone: {}, arresti: [] };
if (fs.existsSync('./db.json')) {
  db = JSON.parse(fs.readFileSync('./db.json'));
}
const save = () => fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

/* ================= COMMANDS ================= */

const commands = [

  new SlashCommandBuilder()
    .setName('arresto')
    .setDescription('Registra arresto')
    // OBBLIGATORI
    .addStringOption(o => o.setName('nome').setDescription('Nome').setRequired(true))
    .addStringOption(o => o.setName('data_nascita').setDescription('Data nascita').setRequired(true))
    .addStringOption(o => o.setName('reati').setDescription('Reati').setRequired(true))
    .addIntegerOption(o => o.setName('mesi').setDescription('Mesi').setRequired(true))
    .addStringOption(o => o.setName('oggetti_sequestrati').setDescription('Oggetti sequestrati').setRequired(true))
    .addStringOption(o => o.setName('oggetti_consegnati').setDescription('A chi consegnati').setRequired(true))
    .addAttachmentOption(o => o.setName('foto').setDescription('Foto').setRequired(true))
    // OPZIONALE
    .addUserOption(o => o.setName('collega').setDescription('Collega').setRequired(false)),

  new SlashCommandBuilder()
    .setName('rilascia_pda')
    .setDescription('Rilascia PDA')
    .addStringOption(o => o.setName('nome').setDescription('Nome').setRequired(true))
    .addStringOption(o => o.setName('data_nascita').setDescription('Data nascita').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo').setRequired(true))
    .addStringOption(o => o.setName('scadenza').setDescription('Scadenza').setRequired(true))
    .addAttachmentOption(o => o.setName('foto').setDescription('Foto').setRequired(true)),

  new SlashCommandBuilder()
    .setName('ritira_pda')
    .setDescription('Ritira PDA')
    .addStringOption(o => o.setName('nome').setDescription('Nome').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo').setRequired(true)),

  new SlashCommandBuilder()
    .setName('info')
    .setDescription('Info persona')
    .addStringOption(o => o.setName('nome').setDescription('Nome').setRequired(true)),

  new SlashCommandBuilder()
    .setName('pannello_denunce')
    .setDescription('Pannello denunce')
];

/* ================= REGISTER ================= */

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

/* ================= READY ================= */

client.once('clientReady', () => {
  console.log('BOT ONLINE');
});

/* ================= INTERAZIONI ================= */

client.on('interactionCreate', async interaction => {

  // ARRESTO
  if (interaction.isChatInputCommand() && interaction.commandName === 'arresto') {

    const nome = interaction.options.getString('nome');
    const nascita = interaction.options.getString('data_nascita');
    const reati = interaction.options.getString('reati');
    const mesi = interaction.options.getInteger('mesi');
    const foto = interaction.options.getAttachment('foto');
    const collega = interaction.options.getUser('collega');

    const id = db.arresti.length + 1;

    db.arresti.push({ id, nome, reati, mesi });

    if (!db.persone[nome]) {
      db.persone[nome] = { nascita, denunce: [], arresti: [], pda: null };
    }

    db.persone[nome].arresti.push(id);
    save();

    let agenti = `${interaction.user}`;
    if (collega) agenti += `, ${collega}`;

    const embed = new EmbedBuilder()
      .setTitle(`Arresto ID ${id}`)
      .addFields(
        { name: 'Nome', value: nome },
        { name: 'Data nascita', value: nascita },
        { name: 'Agenti', value: agenti },
        { name: 'Reati', value: reati },
        { name: 'Mesi', value: mesi.toString() }
      )
      .setImage(foto.url);

    return interaction.reply({ embeds: [embed] });
  }

  // PDA
  if (interaction.isChatInputCommand() && interaction.commandName === 'rilascia_pda') {

    const nome = interaction.options.getString('nome');
    const nascita = interaction.options.getString('data_nascita');
    const motivo = interaction.options.getString('motivo');
    const scadenza = interaction.options.getString('scadenza');
    const foto = interaction.options.getAttachment('foto');

    if (!db.persone[nome]) {
      db.persone[nome] = { nascita, denunce: [], arresti: [], pda: null };
    }

    db.persone[nome].pda = { motivo, scadenza };
    save();

    const embed = new EmbedBuilder()
      .setTitle('PDA Rilasciato')
      .addFields(
        { name: 'Nome', value: nome },
        { name: 'Data nascita', value: nascita },
        { name: 'Motivo', value: motivo },
        { name: 'Scadenza', value: scadenza }
      )
      .setImage(foto.url);

    return interaction.reply({ embeds: [embed] });
  }

  // INFO
  if (interaction.isChatInputCommand() && interaction.commandName === 'info') {

    const nome = interaction.options.getString('nome');
    const p = db.persone[nome];

    if (!p) return interaction.reply("Nessun dato");

    const stato = p.arresti.length > 0 ? "Fedina sporca" : "Fedina pulita";

    const embed = new EmbedBuilder()
      .setTitle(`Info ${nome}`)
      .addFields(
        { name: 'Data nascita', value: p.nascita || "Non registrata" },
        { name: 'Stato', value: stato },
        { name: 'Denunce', value: p.denunce.length.toString() },
        { name: 'PDA', value: p.pda ? `Scadenza: ${p.pda.scadenza}` : "Nessuno" }
      );

    return interaction.reply({ embeds: [embed] });
  }

  // PANNELLO DENUNCE
  if (interaction.isChatInputCommand() && interaction.commandName === 'pannello_denunce') {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('denuncia')
        .setLabel('Fai denuncia')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('📃')
    );

    return interaction.reply({ content: "Clicca sotto", components: [row] });
  }

  // BOTTONE
  if (interaction.isButton() && interaction.customId === 'denuncia') {

    const modal = new ModalBuilder()
      .setCustomId('modal')
      .setTitle('Denuncia');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('nome').setLabel('Nome').setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('reato').setLabel('Reato').setStyle(TextInputStyle.Paragraph)
      )
    );

    return interaction.showModal(modal);
  }

  // INVIO DENUNCIA
  if (interaction.isModalSubmit()) {

    const nome = interaction.fields.getTextInputValue('nome');
    const reato = interaction.fields.getTextInputValue('reato');

    if (!db.persone[nome]) {
      db.persone[nome] = { nascita: "N/D", denunce: [], arresti: [], pda: null };
    }

    db.persone[nome].denunce.push(reato);
    save();

    const canale = interaction.guild.channels.cache.get(CANALE_DENUNCE);

    if (canale) {
      canale.send(`Denuncia ricevuta: ${nome} - ${reato}`);
    }

    return interaction.reply({ content: "Fatto", ephemeral: true });
  }

});

client.login(TOKEN);