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

const CANALE_DENUNCE = "1496787661854212156";

// DATABASE JSON
let db = { persone: {}, arresti: [], pda: [] };
if (fs.existsSync('./db.json')) {
  db = JSON.parse(fs.readFileSync('./db.json'));
}
function salva() {
  fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));
}

// CLIENT
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

/* ================= COMMANDS ================= */

const commands = [

  // ARRESTO
  new SlashCommandBuilder()
    .setName('arresto')
    .setDescription('Registra un arresto')
    .addStringOption(o => o.setName('nome').setDescription('Nome e cognome').setRequired(true))
    .addStringOption(o => o.setName('data_nascita').setDescription('Data nascita').setRequired(true))
    .addStringOption(o => o.setName('reati').setDescription('Reati').setRequired(true))
    .addIntegerOption(o => o.setName('mesi').setDescription('Mesi prigione').setRequired(true))
    .addStringOption(o => o.setName('oggetti_sequestrati').setDescription('Oggetti sequestrati').setRequired(true))
    .addStringOption(o => o.setName('oggetti_consegnati').setDescription('A chi consegnati').setRequired(true))
    .addAttachmentOption(o => o.setName('foto').setDescription('Foto obbligatoria').setRequired(true)),

  // EDIT ARRESTO
  new SlashCommandBuilder()
    .setName('edit_arresto')
    .setDescription('Modifica arresto')
    .addIntegerOption(o => o.setName('id').setDescription('ID arresto').setRequired(true))
    .addStringOption(o => o.setName('reati').setDescription('Nuovi reati').setRequired(false))
    .addIntegerOption(o => o.setName('mesi').setDescription('Nuovi mesi').setRequired(false)),

  // PDA
  new SlashCommandBuilder()
    .setName('rilascia_pda')
    .setDescription('Rilascia PDA')
    .addStringOption(o => o.setName('nome').setDescription('Nome').setRequired(true))
    .addStringOption(o => o.setName('data_nascita').setDescription('Data nascita').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo').setRequired(true))
    .addStringOption(o => o.setName('scadenza').setDescription('Scadenza').setRequired(true))
    .addAttachmentOption(o => o.setName('foto').setDescription('Foto obbligatoria').setRequired(true)),

  new SlashCommandBuilder()
    .setName('ritira_pda')
    .setDescription('Ritira PDA')
    .addStringOption(o => o.setName('nome').setDescription('Nome').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo').setRequired(true)),

  // INFO
  new SlashCommandBuilder()
    .setName('info')
    .setDescription('Info persona')
    .addStringOption(o => o.setName('nome').setDescription('Nome').setRequired(true)),

  // PANNELLO DENUNCE
  new SlashCommandBuilder()
    .setName('pannello_denunce')
    .setDescription('Crea pannello denunce')

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

  // PANNELLO DENUNCE
  if (interaction.commandName === 'pannello_denunce') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('denuncia')
        .setLabel('🚨 Fai Denuncia')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      content: "🚔 Clicca per fare una denuncia",
      components: [row]
    });
  }

  // BOTTONE DENUNCIA
  if (interaction.isButton() && interaction.customId === 'denuncia') {

    const modal = new ModalBuilder()
      .setCustomId('modal_denuncia')
      .setTitle('Denuncia');

    const nome = new TextInputBuilder()
      .setCustomId('nome')
      .setLabel('Nome imputato')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const nascita = new TextInputBuilder()
      .setCustomId('nascita')
      .setLabel('Data nascita')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const reato = new TextInputBuilder()
      .setCustomId('reato')
      .setLabel('Reato')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nome),
      new ActionRowBuilder().addComponents(nascita),
      new ActionRowBuilder().addComponents(reato)
    );

    await interaction.showModal(modal);
  }

  // INVIO MODULO DENUNCIA
  if (interaction.isModalSubmit() && interaction.customId === 'modal_denuncia') {

    const nome = interaction.fields.getTextInputValue('nome');
    const nascita = interaction.fields.getTextInputValue('nascita');
    const reato = interaction.fields.getTextInputValue('reato');

    if (!db.persone[nome]) {
      db.persone[nome] = { nascita, denunce: [], arresti: [], pda: null };
    }

    db.persone[nome].denunce.push(reato);
    salva();

    const canale = interaction.guild.channels.cache.get(CANALE_DENUNCE);

    const embed = new EmbedBuilder()
      .setTitle('🚨 Nuova Denuncia')
      .addFields(
        { name: 'Nome', value: nome },
        { name: 'Nascita', value: nascita },
        { name: 'Reato', value: reato }
      );

    if (canale) canale.send({ embeds: [embed] });

    await interaction.reply({ content: "Denuncia inviata ✅", ephemeral: true });
  }

  // ARRESTO
  if (interaction.commandName === 'arresto') {

    const nome = interaction.options.getString('nome');
    const nascita = interaction.options.getString('data_nascita');
    const reati = interaction.options.getString('reati');
    const mesi = interaction.options.getInteger('mesi');
    const oggS = interaction.options.getString('oggetti_sequestrati');
    const oggC = interaction.options.getString('oggetti_consegnati');
    const foto = interaction.options.getAttachment('foto');

    const id = db.arresti.length + 1;

    db.arresti.push({ id, nome, reati, mesi, oggS, oggC });

    if (!db.persone[nome]) {
      db.persone[nome] = { nascita, denunce: [], arresti: [], pda: null };
    }

    db.persone[nome].arresti.push(id);
    salva();

    const embed = new EmbedBuilder()
      .setTitle(`🚔 Arresto ID ${id}`)
      .addFields(
        { name: 'Nome', value: nome },
        { name: 'Reati', value: reati },
        { name: 'Mesi', value: mesi.toString() },
        { name: 'Sequestrati', value: oggS },
        { name: 'Consegnati', value: oggC }
      )
      .setImage(foto.url);

    await interaction.reply({ embeds: [embed] });
  }

  // PDA
  if (interaction.commandName === 'rilascia_pda') {

    const nome = interaction.options.getString('nome');
    const nascita = interaction.options.getString('data_nascita');
    const motivo = interaction.options.getString('motivo');
    const scadenza = interaction.options.getString('scadenza');
    const foto = interaction.options.getAttachment('foto');

    db.pda.push({ nome, motivo, scadenza });

    if (!db.persone[nome]) {
      db.persone[nome] = { nascita, denunce: [], arresti: [], pda: null };
    }

    db.persone[nome].pda = { motivo, scadenza };
    salva();

    const embed = new EmbedBuilder()
      .setTitle('🪪 PDA Rilasciato')
      .addFields(
        { name: 'Nome', value: nome },
        { name: 'Motivo', value: motivo },
        { name: 'Scadenza', value: scadenza }
      )
      .setImage(foto.url);

    await interaction.reply({ embeds: [embed] });
  }

  // INFO
  if (interaction.commandName === 'info') {

    const nome = interaction.options.getString('nome');
    const p = db.persone[nome];

    if (!p) return interaction.reply("Nessun dato");

    const stato = p.arresti.length > 0 ? "🔴 Sporco" : "🟢 Pulito";
    const pda = p.pda ? `✅ ${p.pda.scadenza}` : "❌ Nessun PDA";

    const embed = new EmbedBuilder()
      .setTitle(`📄 Info ${nome}`)
      .addFields(
        { name: 'Fedina', value: stato },
        { name: 'Denunce', value: p.denunce.length.toString() },
        { name: 'PDA', value: pda }
      );

    await interaction.reply({ embeds: [embed] });
  }

});

client.login(TOKEN);