const Discord = require('discord.js');
const client = new Discord.Client();
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const token = process.env.token; 
const PREFIX = 'bot';
const queue = new Map;
var songInfo = new Object;
var songInfo2 = new Object;
const { getInfo } = require('ytdl-getinfo')
var queueTitleSelector = [];
var queueUrlSelector = [];
var queueDurationSelector = [];
var song = new Object;
client.on('ready', () =>{
    console.log('Locked and loaded. I am bot.mp3');
    client.user.setActivity(`Playing in ${client.guilds.size} servers`);
    client.user.setStatus('online');
});
client.on('message', async message => {
  const serverQueue = queue.get(message.guild.id)
    if (!message.guild) return;
    if(message.author.bot) return;
    if(message.content.indexOf(PREFIX) !== 0) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    if(command === "") return message.channel.send("This is an invalid command argument, use 'bot help' to find out what commands this bot provides!")
    if(command === "ping")
    {
      const m = await message.channel.send("Ping?");
      m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
    }
    if(command === "end.mp3")
    {
        if(message.member.id !== "245992052603486209"){
            return message.reply("You may not do this.");
        }
        await message.channel.send("AGHHH NO!");
        client.user.setStatus('invisible');
        return process.exit(0);
    }
    if(command === "p"){
      const link = args.join(" ");
      const voiceChannel = message.member.voiceChannel;
      if(!voiceChannel){
        message.delete().catch(err=>{}); 
        return message.channel.send('Sorry but you need to be in a channel to play music!')
      }  
      if(!ytdl.validateURL(link)){
        const songInfo = await ytsr(link);
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
        }catch(err){
          console.log(`There's been an error trying to search! Here it is: ${err}`)
          message.channel.send(`There's been an error trying to search, please try again.`)
        }
        song = {
          title: songInfo.title,
          url: songInfo.video_url,
          duration: songInfo2.items[0].duration,
          thumbnail: songInfo2.items[0].thumbnail
        }
      }
      console.log(song.url)
      if(!serverQueue){
        const QueueConstruct = {
          textChannel: message.channel,
          voiceChannel: voiceChannel,
          connection: null,
          songs: [],
          volume: 5,
          playing: true,
          skips: 0
        }
        QueueConstruct.songs.push(song);
        queue.set(message.guild.id, QueueConstruct)
        try {
          message.delete().catch(err=>{}); 
          message.channel.send(`**${queue.get(message.guild.id).songs[0].title}** has been added to the queue and is playing now!`)
          var connection = await voiceChannel.join();
          QueueConstruct.connection = connection;
          play(message.guild, queue.get(message.guild.id).songs[0].url);
        } catch(error) {
          queue.delete(message.guild.id);
          console.error(`I could not join this voice channel: ${error}`)
          return message.channel.send('I could not join this voice channel, please make sure my permissions are correctly adjusted before trying again.')
        }
      } else {
        serverQueue.songs.push(song);
        message.delete().catch(err=>{}); 
        return message.channel.send(`**${serverQueue.songs[0].title}** has been added to the queue!`)
      }
    }
    if(command === "stop"){
      if(queue.get(message.guild.id).voiceChannel !== message.member.voiceChannel || !message.member.voiceChannel){
        message.delete().catch(err=>{}); 
        return message.channel.send("You need to be in the same voice channel to stop the queue!");
      }
      if(!serverQueue){
        message.delete().catch(err=>{}); 
        return message.channel.send("There's nothing playing.");
      }
      if(message.member.roles.find(role => role.name !== "DJ")) return message.channel.send('You need the DJ role to stop the queue!')
      serverQueue.songs = [];
      return serverQueue.connection.dispatcher.end();
    }
    if(command === "skip"){
      if(!serverQueue){
        message.delete().catch(err=>{}); 
        return message.channel.send("There's nothing playing.");
      }
      if(queue.get(message.guild.id).voiceChannel !== message.member.voiceChannel || !message.member.voiceChannel){
        message.delete().catch(err=>{}); 
        return message.channel.send("You need to be in the same voice channel to stop the queue!");
      }
      if(message.member.roles.find(role => role.name === "DJ") || message.member.voiceChannel.members.size === '1'){
        return serverQueue.connection.dispatcher.end();
      }else {
        if(serverQueue.skips >= (message.member.voiceChannel.members.size / 2)){
          message.channel.send(`Skipped **${serverQueue.songs[0].title}**`)
          return serverQueue.connection.dispatcher.end();
        }else {
          let skipTotal = Math.round(message.member.voiceChannel.members.size / 2)
          if(skipTotal == 1)skipTotal++
          serverQueue.skips++
          return message.channel.send(`You must have a role called 'DJ' or skip this through a voting process, currently ${serverQueue.skips}/${skipTotal}`)
        }
      }
    }
    if(command === "np"){
      if(!serverQueue){
        message.delete().catch(err=>{}); 
        return message.channel.send("There's nothing playing!");
      }
      message.delete().catch(err=>{}); 
      return message.channel.send(`Now playing: **${serverQueue.songs[0].title}**`);
    }
    if(command === "volume"){
      if(message.member.roles)
      if(!serverQueue){
        message.delete().catch(err=>{}); 
        return message.channel.send("There's nothing playing!");
      }
      if(args[0] === undefined){
        message.delete().catch(err=>{}); 
        return message.channel.send(`Current volume: **${serverQueue.volume}**`)
      }
      serverQueue.volume = args[0];
      serverQueue.connection.dispatcher.setVolumeLogarithmic(args[0] / 5);
      message.delete().catch(err=>{}); 
      return message.channel.send(`Volume has been set to ${serverQueue.volume} by ${message.author}.`)
    }
    if(command === "queue"){
      message.delete().catch(err=>{}); 
      if(!serverQueue){ 
        return message.channel.send("There's nothing playing.");
      }
      const embedQ = new Discord.RichEmbed()
      embedQ.setTitle("Queue!")
      embedQ.addField(`Now playing: **[${serverQueue.songs[0].title}](${serverQueue.songs[0].url})**!`,`Total Duration: ${serverQueue.songs[0].duration} \n`)
      if(!serverQueue.songs[1]) return message.channel.send(embedQ);
      embedQ.addField('Up next:','\a')
      for(var x = 1; x <= 5; x++){
        if(serverQueue.songs[x]){
          embedQ.addField(`${x}.**[${serverQueue.songs[x].title}](${serverQueue.songs[x].url})**`,`${serverQueue.songs[x].duration}`)
        }else {
          return message.channel.send(embedQ);
        }
      }
    }
    if(command === "help"){
      return message.channel.send(embed);
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
async function play(guild, song) {
   const serverQueue = queue.get(guild.id);
   if(!song) {
     serverQueue.voiceChannel.leave();
     queue.delete(guild.id)
     return;
   }
   console.log(`Song is playing! ${song}, ${serverQueue.songs[0].title}`)
   const dispatcher = serverQueue.connection.playStream(ytdl(serverQueue.songs[0].url,{filter:'audioonly', quality:'highestaudio', highWaterMark: 1<<25}))
      .on('end', () => {
        console.log("Song has ended!");
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0])
      })
      .on('error', error => {console.error(error)})
    dispatcher.setVolumeLogarithmic(5 / 5);
};
const embed = new Discord.RichEmbed()
    .setTitle("Queue Commands!")
    .setColor('#0099ff')
    .addField('P','```This is the play command, add a following url/keyword to add a song to queue and start playing! \nSyntax: "bot p <url/keyword here!>"```', true)
    .addField('Qstop','```This is the stop command, this will make the bot empty the queue and leave the channel! \nSyntax: "bot stop"```', true)
    .addField('\u200b','\u200b')
    .addField('Qskip','```This is the skip command, this will skip the current playing song and start playing the next! \nSyntax: "bot skip"```', true)
    .addField('Volume','```This command changes the volume for the whole queue, be warey of earrape! \nSyntax: "bot volume <volume here!>"```', true)
    .addField('\u200b','\u200b')
    .addField('Qnp','```This command tells you what is currently playing! \nSyntax: "bot np"```', true)
    .setFooter('bot.mp4', 'https://cdn.discordapp.com/embed/avatars/2.png');

client.login(process.env.token);
