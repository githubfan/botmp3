const Discord = require('discord.js');
const client = new Discord.Client();
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const PREFIX = 'bot';
const queue = new Map;
var songInfo, songInfo2, song = new Object;
const getInfo = require('ytdl-getinfo')
let filter;

client.on('ready', () =>{
    console.log('Locked and loaded.');
    client.user.setActivity(`in ${client.guilds.size} servers`);
    client.user.setStatus('online');
});
client.on('message', async message => {
  const serverQueue = queue.get(message.guild.id)
    if (!message.guild) return;
    if(message.author.bot) return;
    if(message.content.indexOf(PREFIX) !== 0) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    message.delete().catch(err=>{}); 
    embedInform.setTimestamp(new Date())
    embedWarn.setTimestamp(new Date())
    embedError.setTimestamp(new Date())
    embed.setTimestamp(new Date())
    if(command === ""){
      embedWarn.setFooter(message.member.displayName)
      embedWarn.setDescription("This is an invalid command argument, use **'bot help'** to find out what commands this bot provides!")
      return await message.channel.send(embedWarn)
    } 
    if(command === "ping")
    {
      const m = await message.channel.send("Ping?");
      embedSuccess.setFooter(message.member.displayName)
      embedSuccess.setFooter(message.member.displayName)
      embedSuccess.setDescription(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`)
      await m.edit(embedSuccess);
    }
    if(command === "end.mp3")
    {
        if(message.member.id !== "245992052603486209"){
            embedWarn.setFooter(message.member.displayName)
            embedWarn.setDescription("You may not do this.")
            return await message.reply(embedWarn);
        }
        await message.channel.send("AGHHH NO!");
        client.user.setStatus('invisible');
        return process.exit(0);
    }
    if(command === "p"){
      const link = args.join(" ");
      const voiceChannel = message.member.voiceChannel;
      if(!voiceChannel){ 
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription('Sorry but you need to be in a channel to play music!')
        return await message.channel.send(embedWarn)
      } 
      if(!ytdl.validateURL(link)){
        songInfo = await ytsr(link); 
        song = {
          title: songInfo.items[0].title,
          url: songInfo.items[0].link,
          duration: songInfo.items[0].duration,
          thumbnail: songInfo.items[0].thumbnail
        };
      }else {
        try {
          songInfo = await ytdl.getInfo(link)
          songInfo2 = await ytsr(songInfo.title);
          song = {
            title: songInfo.title,
            url: songInfo.video_url,
            duration: songInfo2.items[0].duration,
            thumbnail: songInfo2.items[0].thumbnail
          }
        }catch(err){
          console.log(`There's been an error trying to search! Here it is: ${err}`)
          embedError.setFooter(message.member.displayName)
          embedError.setDescription(`There's been an error trying to search, please try again.`)
          await message.channel.send(embedError)
        }
      }
      if(song.url.includes('channel') || song.url.includes('user')){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription('The search result returned a channel/user, please try again.')
        return message.channel.send(embedWarn)
      }
      if(!serverQueue){
        const QueueConstruct = {
          textChannel: message.channel,
          voiceChannel: voiceChannel,
          connection: null,
          songs: [],
          volume: 5,
          playing: true,
          skips: 0,
          skipping: [],
          loop: false
        }
        QueueConstruct.songs.push(song);
        queue.set(message.guild.id, QueueConstruct)
        try {
          embedInform.setTitle(`Creating queue and playing...`)
          embedInform.setFooter(message.member.displayName)
          embedInform.setDescription(`**${queue.get(message.guild.id).songs[0].title}** starting to play now!`)
          await message.channel.send(embedInform)
          var connection = await voiceChannel.join();
          QueueConstruct.connection = connection;
          play(message.guild, queue.get(message.guild.id).songs[0].url);
        } catch(error) {
          queue.delete(message.guild.id);
          console.error(`I could not join this voice channel: ${error}`)
          embedError.setFooter(message.member.displayName)
          embedError.setDescription('I could not join this voice channel, please make sure my permissions are correctly adjusted before trying again.')
          return await message.channel.send(embedError);
        }
      } else {
        serverQueue.songs.push(song);
        embedInform.setTitle(`Adding a song to the queue...`)
        embedInform.setFooter(message.member.displayName)
        embedInform.setDescription(`**${song.title}** has been added to the queue!`)
        return await message.channel.send(embedInform)
      }
    }
    if(command === "stop"){
      if(queue.get(message.guild.id).voiceChannel !== message.member.voiceChannel || !message.member.voiceChannel){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription("You need to be in the same voice channel to stop the queue!")
        return message.channel.send(embedWarn);
      }
      if(!serverQueue){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription("There's nothing playing.")
        return message.channel.send(embedWarn);
      }
      if(!message.member.roles.find(role => role.name === "DJ")){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription('You need the DJ role to stop the queue!')
        return message.channel.send(embedWarn)
      }
      embedInform.setTitle('Deleting the queue...')
      embedInform.setFooter(message.member.displayName)
      embedInform.setDescription('Stopped and deleted the queue!')
      await message.channel.send(embedInform)
      serverQueue.songs = [];
      return serverQueue.connection.dispatcher.end();
    }
    if(command === "skip"){
      if(!serverQueue){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription("There's nothing playing.")
        return await message.channel.send(embedWarn);
      }
      if(queue.get(message.guild.id).voiceChannel !== message.member.voiceChannel || !message.member.voiceChannel){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription("You need to be in the same voice channel to stop the queue!")
        return await message.channel.send(embedWarn);
      }
      if(message.member.roles.find(role => role.name === "DJ") || message.member.voiceChannel.members.size === '1'){
        embedInform.setTitle('Skipping')
        embedInform.setFooter(message.member.displayName)
        embedInform.setDescription(`Skipped **${serverQueue.songs[0].title}**`)
        await message.channel.send(embedInform)
        return serverQueue.connection.dispatcher.end();
      }else {
        if(serverQueue.skipping.includes(message.author.id)){
          embedWarn.setFooter(message.member.displayName)
          embedWarn.setDescription('You already voted to skip!')
          return await message.channel.send(embedWarn)
        }
        let skipTotal = (Math.round(message.member.voiceChannel.members.size / 2) - 1)
        if(serverQueue.skips >= skipTotal){
          embedInform.setTitle('Skipping!')
          embedInform.setFooter(message.member.displayName)
          embedInform.setDescription(`Skipped **${serverQueue.songs[0].title}**`)
          await message.channel.send(embedInform)
          serverQueue.skipping = [];
          serverQueue.skips = 0;
          return serverQueue.connection.dispatcher.end();
        }else {
          if(skipTotal == 1)skipTotal++
          serverQueue.skips++
          serverQueue.skipping.push(message.author.id)
          embedInform.setTitle('Skipping in Progress!')
          embedInform.setFooter(message.member.displayName)
          embedInform.setDescription(`You must have a role called 'DJ' or skip this through a voting process, currently ${serverQueue.skips}/${skipTotal}`)
          return await message.channel.send(embedInform)
        }
      }
    }
    if(command === "np"){
      if(!serverQueue){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription("There's nothing playing!")
        return await message.channel.send(embedWarn);
      }
      embedInform.setTitle('Now playing!')
      embedInform.setFooter(message.member.displayName)
      embedInform.setDescription(`Now playing: **${serverQueue.songs[0].title}**`)
      return await message.channel.send(embedInform);
    }
    if(command === "vol"){
      if(!((message.member.roles.find(role => role.name === "DJ") || message.member.voiceChannel.members.size === '1'))){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription(`You must have a role called 'DJ' or be alone in voice channel to change the volume!`)
        return await message.channel.send(embedWarn);
      }
      if(!serverQueue){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription("There's nothing playing!")
        return await message.channel.send(embedWarn);
      }
      if(args[0] === undefined){
        embedInform.setTitle('Song Volume!')
        embedInform.setFooter(message.member.displayName)
        embedInform.setDescription(`Current volume: **${serverQueue.volume}**`)
        return await message.channel.send(embedInform)
      }
      if(args[0] > 25){
        serverQueue.volume = 25;
      }else if(args[0] < 1){
        serverQueue.volume = 1;
      }else{
        serverQueue.volume = args[0];
      }
      serverQueue.connection.dispatcher.setVolumeLogarithmic(args[0] / 5);
      embedInform.setTitle('Volume Change!')
      embedInform.setFooter(message.member.displayName)
      embedInform.setDescription(`Volume has been set to ${serverQueue.volume} by ${message.author}.`)
      return await message.channel.send(embedInform)
    }
    if(command === "queue"){
      if(!serverQueue){ 
        embedWarn.setDescription("There's nothing playing.")
        embedWarn.setFooter(message.member.displayName)
        return await message.channel.send(embedWarn);
      }
      const embedQ = new Discord.RichEmbed()
        .setTitle("Queue!")
        .setColor('PURPLE')
      if(serverQueue.loop == true){
        embedQ.setTitle("Queue"+`, Loop is on!`)
      }
      if(serverQueue.loop == false){
        embedQ.setTitle("Queue"+`, Loop is off!`)
      }
      embedQ.setDescription(`Now playing: **[` + serverQueue.songs[0].title + '](' + serverQueue.songs[0].url + `)**!\nTotal Duration: ${serverQueue.songs[0].duration} \n`)
      if(!serverQueue.songs[1]) return await message.channel.send(embedQ);
      await message.channel.send(embedQ)
      embedQ.setTitle('Up Next:')
      for(var x = 1; x <= 5 && x <= serverQueue.songs.length; x++){
        if(serverQueue.songs[x]){
          embedQ.setDescription(`${x}. **[` + serverQueue.songs[x].title + '](' + serverQueue.songs[x].url + ')**' + `\nTotal Duration: ${serverQueue.songs[x].duration}`)
          if(x !== 5 || x !== serverQueue.songs.length) await message.channel.send(embedQ);
          embedQ.setTitle('')
        }
        embedQ.setDescription(`${(serverQueue.songs.length) - 1}. **[` + serverQueue.songs[(serverQueue.songs.length) - 1].title + '](' + serverQueue.songs[(serverQueue.songs.length) - 1].url + ')**' + `\nTotal Duration: ${serverQueue.songs[(serverQueue.songs.length) - 1].duration}`)
        embedQ.setFooter(message.member.displayName)
        embedQ.setTimestamp(new Date())
        return await message.channel.send(embedQ)
    }
    if(command === "pause"){
      if(!serverQueue){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription("There's nothing playing.")
        return await message.channel.send(embedWarn);
      }
      if(queue.get(message.guild.id).voiceChannel !== message.member.voiceChannel || !message.member.voiceChannel){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription("You need to be in the same voice channel to pause the queue!")
        return await message.channel.send(embedWarn);
      }
      if(message.member.roles.find(role => role.name === "DJ") || message.member.voiceChannel.members.size === '1'){
        embedInform.setFooter(message.member.displayName)
        embedInform.setTitle('Pausing the queue')
        embedInform.setDescription(`The queue has been paused!`)
        await message.channel.send(embedInform)
        return serverQueue.connection.dispatcher.pause();
      }
    }
    if(command === "resume"){
      if(!serverQueue){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription("There's nothing playing.")
        return await message.channel.send(embedWarn);
      }
      if(queue.get(message.guild.id).voiceChannel !== message.member.voiceChannel || !message.member.voiceChannel){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription("You need to be in the same voice channel to resume the queue!")
        return await message.channel.send(embedWarn);
      }
      if(message.member.roles.find(role => role.name === "DJ") || message.member.voiceChannel.members.size === '1'){
        embedInform.setFooter(message.member.displayName)
        embedInform.setTitle('Resuming the queue')
        embedInform.setDescription(`The queue has been resumed!`)
        await message.channel.send(embedInform)
        return serverQueue.connection.dispatcher.resume();
      }
    }
    }
    if(command === "help"){
      embed.setFooter(message.member.displayName)
      return await message.channel.send(embed);
    }
    if(command === "loop"){
      if(!serverQueue){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription("There's nothing playing!")
      return await message.channel.send(embedWarn);
      }
      if(message.member.roles.find(role => role.name === "DJ") || message.member.voiceChannel.members.size === '1'){
        serverQueue.loop = !serverQueue.loop;
        embedInform.setTitle("Looping!")
        embedInform.setDescription(`Looping has been toggled to ${serverQueue.loop}!`)
        return message.channel.send(embedInform)
      }else{
        embedInform.setTitle("Looping!")
        embedInform.setDescription("You must have the DJ role to toggle looping!")
        return message.channel.send(embedInform)
      }
    }
})
client.on("guildCreate", guild => {
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
});
client.on("guildDelete", guild => {
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
});
client.on('warn', info => {
  console.log(info)
})
client.on('error', info => {
  console.log(info)
})
async function play(guild, song) {
   const serverQueue = queue.get(guild.id);
   if(!song) {
     serverQueue.voiceChannel.leave();
     queue.delete(guild.id)
     return;
   }
   const dispatcher = serverQueue.connection.playStream(ytdl(serverQueue.songs[0].url,{filter:'audioonly', quality:'highestaudio', highWaterMark: 1<<25}))
      .on('end', () => {
        if(serverQueue.loop === false){
          serverQueue.songs.shift();
        }else if(serverQueue.loop === true){
          serverQueue.songs.push(serverQueue.songs.shift())
        }
        play(guild, serverQueue.songs[0])
      })
      .on('error', error => {console.error(error)})
    dispatcher.setVolumeLogarithmic(5 / 5);
};
const embed = new Discord.RichEmbed()

const embedError = new Discord.RichEmbed()
    .setTitle("There's been an error!")
    .setColor('RED')
const embedWarn = new Discord.RichEmbed()
    .setTitle("Something went wrong!")
    .setColor('#FFFF00')
const embedSuccess = new Discord.RichEmbed()
    .setTitle("Success!")
    .setColor("GREEN")
const embedInform = new Discord.RichEmbed()
    .setColor('BLUE')
client.login(process.env.token);
