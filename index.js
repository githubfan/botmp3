const Discord = require('discord.js');
const client = new Discord.Client();
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const PREFIX = 'bot';
const queue = new Map;
var songInfo, songInfo2, song = new Object;
const getInfo = require('ytdl-getinfo')

client.on('ready', () =>{
    console.log('Locked and loaded. I am bot.mp3');
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
    if(command === ""){
      embedWarn.setDescription("This is an invalid command argument, use **'bot help'** to find out what commands this bot provides!")
      return await message.channel.send(embedWarn)
    } 
    if(command === "ping")
    {
      const m = await message.channel.send("Ping?");
      embedSuccess.setDescription(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`)
      await m.edit(embedSuccess);
    }
    if(command === "end.mp3")
    {
        if(message.member.id !== "245992052603486209"){
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
        embedWarn.setDescription('Sorry but you need to be in a channel to play music!')
        return await message.channel.send(embedWarn)
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
          skipping: []
        }
      if(queue.get(message.guild.id).voiceChannel !== message.member.voiceChannel){
        embedWarn.setDescription("You need to be in the same voice channel to add to the queue!")
        return await message.channel.send(embedWarn);
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
          embedError.setDescription(`There's been an error trying to search, please try again.`)
          await message.channel.send(embedError)
        }
        song = {
          title: songInfo.title,
          url: songInfo.video_url,
          duration: songInfo2.items[0].duration,
          thumbnail: songInfo2.items[0].thumbnail
        }
      }
      console.log(song.url)
        QueueConstruct.songs.push(song);
        queue.set(message.guild.id, QueueConstruct)
        try {
          embedInform.setTitle(`Creating queue and playing...`)
          embedSuccess.setDescription(`**${queue.get(message.guild.id).songs[0].title}** starting to play now!`)
          await message.channel.send(embedSuccess)
          var connection = await voiceChannel.join();
          QueueConstruct.connection = connection;
          play(message.guild, queue.get(message.guild.id).songs[0].url);
        } catch(error) {
          queue.delete(message.guild.id);
          console.error(`I could not join this voice channel: ${error}`)
          embedError.setDescription('I could not join this voice channel, please make sure my permissions are correctly adjusted before trying again.')
          return await message.channel.send(embedError);
        }
      } else {
        serverQueue.songs.push(song);
        embedInform.setTitle(`Adding a song to the queue...`)
        embedSuccess.setDescription(`**${song.title}** has been added to the queue!`)
        return await message.channel.send(embedSuccess)
      }
    }
    if(command === "stop"){
      if(queue.get(message.guild.id).voiceChannel !== message.member.voiceChannel || !message.member.voiceChannel){
        embedWarn.setDescription("You need to be in the same voice channel to stop the queue!")
        return message.channel.send(embedWarn);
      }
      if(!serverQueue){
        embedWarn.setDescription("There's nothing playing.")
        return message.channel.send(embedWarn);
      }
      if(message.member.roles.find(role => role.name !== "DJ")){
        embedWarn.setDescription('You need the DJ role to stop the queue!')
        return message.channel.send(embedWarn)
      }
      embedSuccess.setDescription('Stopped and deleted the queue!')
      await message.channel.send(embedSuccess)
      serverQueue.songs = [];
      return serverQueue.connection.dispatcher.end();
    }
    if(command === "skip"){
      if(!serverQueue){
        embedWarn.setDescription("There's nothing playing.")
        return await message.channel.send(embedWarn);
      }
      if(queue.get(message.guild.id).voiceChannel !== message.member.voiceChannel || !message.member.voiceChannel){
        embedWarn.setDescription("You need to be in the same voice channel to stop the queue!")
        return await message.channel.send(embedWarn);
      }
      if(message.member.roles.find(role => role.name === "DJ") || message.member.voiceChannel.members.size === '1'){
        embedInform.setTitle('Skipping')
        embedInform.setDescription(`Skipped **${serverQueue.songs[0].title}**`)
        await message.channel.send(embedInform)
        return serverQueue.connection.dispatcher.end();
      }else {
        if(serverQueue.skips >= (message.member.voiceChannel.members.size / 2)){
          embedInform.setTitle('Skipping!')
          embedInform.setDescription(`Skipped **${serverQueue.songs[0].title}**`)
          await message.channel.send(embedSuccess)
          return serverQueue.connection.dispatcher.end();
        }else {
          let skipTotal = Math.round(message.member.voiceChannel.members.size / 2)
          if(skipTotal == 1)skipTotal++
          serverQueue.skips++
          serverQueue.skipping.push(message.author)
          embedInform.setTitle('Skipping in Progress!')
          embedInform.setDescription(`You must have a role called 'DJ' or skip this through a voting process, currently ${serverQueue.skips}/${skipTotal}`)
          return await message.channel.send(embedInform)
        }
      }
    }
    if(command === "np"){
      if(!serverQueue){
        embedWarn.setDescription("There's nothing playing!")
        return await message.channel.send(embedWarn);
      }
      embedInform.setTitle('Now playing!')
      embedInform.setDescription(`Now playing: **${serverQueue.songs[0].title}**`)
      return await message.channel.send(embedInform);
    }
    if(command === "volume"){
      if(!serverQueue){
        embedWarn.setDescription("There's nothing playing!")
        return await message.channel.send(embedWarn);
      }
      if(args[0] === undefined){
        embedInform.setTitle('Song Volume!')
        embedInform.setDescription(`Current volume: **${serverQueue.volume}**`)
        return await message.channel.send(embedInform)
      }
      serverQueue.volume = args[0];
      serverQueue.connection.dispatcher.setVolumeLogarithmic(args[0] / 5);
      embedInform.setTitle('Volume Change!')
      embedInform.setDescription(`Volume has been set to ${serverQueue.volume} by ${message.author}.`)
      return await message.channel.send(embedInform)
    }
    if(command === "queue"){
      if(!serverQueue){ 
        embedWarn.setDescription("There's nothing playing.")
        return await message.channel.send(embedWarn);
      }
      const embedQ = new Discord.RichEmbed()
      embedQ.setColor('PURPLE')
      embedQ.setTitle("Queue!")
      embedQ.addField(`Now playing: **[${serverQueue.songs[0].title}](${serverQueue.songs[0].url})**!`,`Total Duration: ${serverQueue.songs[0].duration} \n`)
      if(!serverQueue.songs[1]) return message.channel.send(embedQ);
      embedQ.addField('Up next:','\a')
      for(var x = 1; x <= 5; x++){
        if(serverQueue.songs[x]){
          embedQ.addField(`${x}.**[${serverQueue.songs[x].title}](${serverQueue.songs[x].url})**`,`${serverQueue.songs[x].duration}`)
        }else {
          return await message.channel.send(embedQ);
        }
    }
    if(command === "pause"){
      if(!serverQueue){
        embedWarn.setDescription("There's nothing playing.")
        return await message.channel.send(embedWarn);
      }
      if(queue.get(message.guild.id).voiceChannel !== message.member.voiceChannel || !message.member.voiceChannel){
        embedWarn.setDescription("You need to be in the same voice channel to pause the queue!")
        return await message.channel.send(embedWarn);
      }
      if(message.member.roles.find(role => role.name === "DJ") || message.member.voiceChannel.members.size === '1'){
        embedInform.setTitle('Pausing the queue')
        embedInform.setDescription(`The queue has been paused!`)
        await message.channel.send(embedInform)
        return serverQueue.connection.dispatcher.pause();
      }
    }
    if(command === "resume"){
      if(!serverQueue){
        embedWarn.setDescription("There's nothing playing.")
        return await message.channel.send(embedWarn);
      }
      if(queue.get(message.guild.id).voiceChannel !== message.member.voiceChannel || !message.member.voiceChannel){
        embedWarn.setDescription("You need to be in the same voice channel to resume the queue!")
        return await message.channel.send(embedWarn);
      }
      if(message.member.roles.find(role => role.name === "DJ") || message.member.voiceChannel.members.size === '1'){
        embedInform.setTitle('Resuming the queue')
        embedInform.setDescription(`The queue has been resumed!`)
        await message.channel.send(embedInform)
        return serverQueue.connection.dispatcher.resume();
      }
    }
    }
    if(command === "help"){
      return await message.channel.send(embed);
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
    .setFooter('bot.mp4', 'https://cdn.discordapp.com/embed/avatars/2.png')
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
