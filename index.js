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

// VARIABILI
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const CANALE_DENUNCE = process.env.CANALE_DENUNCE;

// DATABASE
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

  new SlashCommandBuilder()
    .setName('arresto')
    .setDescription('Registra un arresto')
    .addStringOption(o => o.setName('nome').setDescription('Nome e cognome').setRequired(true))
    .addStringOption(o => o.setName('data_nascita').setDescription('Data nascita').setRequired(true))
    .addStringOption(o => o.setName('reati').setDescription('Reati').setRequired(true))
    .addIntegerOption(o => o.setName('mesi').setDescription('Mesi').setRequired(true))
    .addStringOption(o => o.setName('oggetti_sequestrati').setDescription('Oggetti sequestrati').setRequired(true))
    .addStringOption(o => o.setName('oggetti_consegnati').setDescription('A chi consegnati').setRequired(true))
    .addUserOption(o => o.setName('collega1').setDescription('Collega 1').setRequired(false))
    .addUserOption(o => o.setName('collega2').setDescription('Collega 2').setRequired(false))
    .addAttachmentOption(o => o.setName('foto').setDescription('Foto').setRequired(true)),

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

  if (interaction.isCommand()) {

    // ARRESTO
    if (interaction.commandName === 'arresto') {

      const nome = interaction.options.getString('nome');
      const nascita = interaction.options.getString('data_nascita');
      const reati = interaction.options.getString('reati');
      const mesi = interaction.options.getInteger('mesi');
      const oggS = interaction.options.getString('oggetti_sequestrati');
      const oggC = interaction.options.getString('oggetti_consegnati');
      const foto = interaction.options.getAttachment('foto');

      const collega1 = interaction.options.getUser('collega1');
      const collega2 = interaction.options.getUser('collega2');

      const agente = interaction.user;

      const id = db.arresti.length + 1;

      db.arresti.push({ id, nome, reati, mesi });

      if (!db.persone[nome]) {
        db.persone[nome] = { nascita, denunce: [], arresti: [], pda: null };
      }

      db.persone[nome].arresti.push(id);
      salva();

      let colleghi = `${agente}`;
      if (collega1) colleghi += `, ${collega1}`;
      if (collega2) colleghi += `, ${collega2}`;

      const embed = new EmbedBuilder()
        .setTitle(`Arresto ID ${id}`)
        .addFields(
          { name: 'Nome', value: nome },
          { name: 'Data nascita', value: nascita },
          { name: 'Agenti', value: colleghi },
          { name: 'Reati', value: reati },
          { name: 'Mesi', value: mesi.toString() },
          { name: 'Oggetti sequestrati', value: oggS },
          { name: 'Oggetti consegnati', value: oggC }
        )
        .setImage(foto.url);

      return interaction.reply({ embeds: [embed] });
    }

    // PDA
    if (interaction.commandName === 'rilascia_pda') {

      const nome = interaction.options.getString('nome');
      const nascita = interaction.options.getString('data_nascita');
      const motivo = interaction.options.getString('motivo');
      const scadenza = interaction.options.getString('scadenza');
      const foto = interaction.options.getAttachment('foto');

      if (!db.persone[nome]) {
        db.persone[nome] = { nascita, denunce: [], arresti: [], pda: null };
      }

      db.persone[nome].pda = { motivo, scadenza };
      salva();

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
    if (interaction.commandName === 'info') {

      const nome = interaction.options.getString('nome');
      const p = db.persone[nome];

      if (!p) return interaction.reply("Nessun dato");

      const stato = p.arresti.length > 0 ? "Fedina sporca" : "Fedina pulita";

      const pda = p.pda
        ? `Motivo: ${p.pda.motivo}\nScadenza: ${p.pda.scadenza}`
        : "Nessun PDA";

      const embed = new EmbedBuilder()
        .setTitle(`Info ${nome}`)
        .addFields(
          { name: 'Data nascita', value: p.nascita || "Non registrata" },
          { name: 'Stato', value: stato },
          { name: 'Denunce ricevute', value: p.denunce.length.toString() },
          { name: 'PDA', value: pda }
        );

      return interaction.reply({ embeds: [embed] });
    }

    // PANNELLO DENUNCE
    if (interaction.commandName === 'pannello_denunce') {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('denuncia')
          .setLabel('Fai denuncia')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🚨')
      );

      return interaction.reply({
        content: "Clicca per inviare una denuncia",
        components: [row]
      });
    }
  }

  // BOTTONE DENUNCIA
  if (interaction.isButton() && interaction.customId === 'denuncia') {

    const modal = new ModalBuilder()
      .setCustomId('modal_denuncia')
      .setTitle('Denuncia');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('nome')
          .setLabel('Nome imputato')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('nascita')
          .setLabel('Data nascita')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reato')
          .setLabel('Reato')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  // INVIO DENUNCIA
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
      .setTitle('Denuncia ricevuta')
      .addFields(
        { name: 'Nome', value: nome },
        { name: 'Data nascita', value: nascita },
        { name: 'Reato', value: reato }
      );

    if (canale) canale.send({ embeds: [embed] });

    return interaction.reply({ content: "Denuncia inviata", ephemeral: true });
  }

});

client.login(TOKEN);