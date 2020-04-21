const Discord = require('discord.js');
const client = new Discord.Client();
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const queue = new Map;
var songInfo, songInfo2, song = new Object;
let lock = false;
const getInfo = require('ytdl-getinfo')
let filter, a;
client.on('ready', () =>{
    console.log('Locked and loaded.');
    client.user.setActivity(`Pipe~ || . help`);
    client.user.setStatus('online');
});
client.on('message', async message => {
  const serverQueue = queue.get(message.guild.id)
  let beginTime = 0;
    if(!message.guild) return;
    if(message.author.bot) return;
    if(message.author.id !== "245992052603486209" && lock === true) return;
    if(message.content.toLowerCase().indexOf('.') !== 0) return;
    const args = message.content.slice(1).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    message.delete().catch(err=>{}); 
    embedInform.setTimestamp(new Date())
    embedWarn.setTimestamp(new Date())
    embedError.setTimestamp(new Date())
    embed.setTimestamp(new Date())
    if(command === "ping")
    {
      const m = await message.channel.send("Ping?");
      embedSuccess.setFooter(message.member.displayName)
      embedSuccess.setFooter(message.member.displayName)
      embedSuccess.setDescription(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`)
      await m.edit(embedSuccess);
    }
    else if(command === "end.mp3" || command === "end")
    {
        if(message.member.id !== "245992052603486209"){
            embedWarn.setFooter(message.member.displayName)
            embedWarn.setDescription("You may not do this.")
            return await message.reply(embedWarn);
        }
        await message.channel.send("Shutting down..");
        client.user.setStatus('invisible');
        return process.exit(0);
    }
    else if(command === "p" || command === "play"){
      const link = args.join(" ");
      const voiceChannel = message.member.voiceChannel;
      if(!voiceChannel){ 
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription('Sorry but you need to be in a channel to play music!')
        return await message.channel.send(embedWarn)
      }
      if(args[1]){
        beginTime = args[1];
      }
      if(!ytdl.validateURL(link)){
        songInfo = await ytsr(link); 
        song = {
          title: songInfo.items[0].title,
          url: songInfo.items[0].link,
          duration: songInfo.items[0].duration,
          thumbnail: songInfo.items[0].thumbnail,
          begin: beginTime
        };
      }else {
        try {
          songInfo = await ytdl.getInfo(link)
          songInfo2 = await ytsr(songInfo.title);
          song = {
            title: songInfo.title,
            url: songInfo.video_url,
            duration: songInfo2.items[0].duration,
            thumbnail: songInfo2.items[0].thumbnail,
            begin: beginTime
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
          volume: 1,
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
          play(message.guild, queue.get(message.guild.id).songs[0].url, voiceChannel, message);
        } catch(error) {
          queue.delete(message.guild.id);
          console.error(`I could not join this voice channel: ${error}`)
          embedError.setFooter(message.member.displayName)
          embedError.setDescription('I could not join this voice channel, please make sure my permissions are correctly adjusted before trying again.')
          return await message.channel.send(embedError);
        }
      } else {
        try{
          serverQueue.songs.push(song);
          embedInform.setTitle(`Adding a song to the queue...`)
          embedInform.setFooter(message.member.displayName)
          embedInform.setDescription(`**${song.title}** has been added to the queue!`)
          return await message.channel.send(embedInform)
        }catch(err){
          try{
            await voiceChannel.join();
            console.log(`Error trying to append song to queue ln.130 : ${err}`)
          }catch(err){
            console.log(`error trying to self fix error ln.132 : ${err}`)
            try{
              queue.delete(message.guild.id);
              voiceChannel.leave();
            }catch(err){
              console.log(`error trying to leave voice channel and delete queue ln.137 : ${err}`)
            }   
          }
        }
      }
    }
    else if(command === "stop" || command === 'stp'){
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
    else if(command === "skip" || command === "skp"){
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
      if(args[0] === undefined){
        if(message.member.roles.find(role => role.name === "DJ") || message.member.voiceChannel.members.size === '1'){
          serverQueue.skipping = [];
          serverQueue.skips = 0;
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
      serverQueue.songs[0].begin === args[0]
      embedInform.setTitle('Skipping!')
      embedInform.setFooter(message.member.displayName)
      embedInform.setDescription(`Skipping ${args[0]}s ahead!`)
      serverQueue.connection.dispatcher.end();
    }
    else if(command === "vol" || command === "volume"){
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
      var a = parseInt(args[0]);
      if(a !== parseInt(a, 10)){
        embedWarn.setDescription('This is not an integer!')
        embedWarn.setFooter(message.member.displayName)
        return await message.channel.send(embedWarn)
      }
      if(a > 15){
        a = 15;
      }else if(a < 1){
        a = 1;
      }
      serverQueue.volume = a
      serverQueue.connection.dispatcher.setVolumeLogarithmic(a / 5);
      embedInform.setTitle('Volume Change!')
      embedInform.setFooter(message.member.displayName)
      embedInform.setDescription(`Volume has been set to ${serverQueue.volume} by ${message.author}.`)
      return await message.channel.send(embedInform)
    }
    else if(command === "pause" || command === "pse"){
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
      if(serverQueue.playing === false){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription(`The queue is already paused!`)
        return await message.channel.send(embedInform)
      }
      if(message.member.roles.find(role => role.name === "DJ") || message.member.voiceChannel.members.size === '1'){
        embedInform.setFooter(message.member.displayName)
        embedInform.setTitle('Pausing the queue')
        embedInform.setDescription(`The queue has been paused!`)
        serverQueue.playing = !serverQueue.playing
        await message.channel.send(embedInform)
        return serverQueue.connection.dispatcher.pause();
      }
    }
    else if(command === "resume" || command === 'rme'){
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
      if(serverQueue.playing === true){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription(`The queue is already playing!`)
        return await message.channel.send(embedInform)
      }
      if(message.member.roles.find(role => role.name === "DJ") || message.member.voiceChannel.members.size === '1'){
        embedInform.setFooter(message.member.displayName)
        embedInform.setTitle('Resuming the queue')
        embedInform.setDescription(`The queue has been resumed!`)
        serverQueue.playing = !serverQueue.playing
        await message.channel.send(embedInform)
        return serverQueue.connection.dispatcher.resume();
      }
    }
    else if(command === "queue" || command === "q"){
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
        }
        embedQ.setDescription('')
        embedQ.setFooter(message.member.displayName)
        embedQ.setTimestamp(new Date())
        return await message.channel.send(embedQ);

    }
    else if(command === 'shuffle' || command === "sle"){
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
        shuffle(serverQueue.songs)
        var a = serverQueue.loop
        serverQueue.loop = true; serverQueue.connection.dispatcher.end(); serverQueue.loop = a;
        embedInform.setDescription('Shuffled the queue!')
        embedInform.setTitle('Shuffling the queue.')
        embedInform.setFooter(message.member.displayName)
        return await message.channel.send(embedInform)
      }
    }
    else if(command === "help"){
      embed.setFooter(message.member.displayName)
      await message.author.send(embed)
      embedInform.setFooter(message.member.displayName)
      embedInform.setTitle("Sent to your DM's!")
      embedInform.setDescription("I've sent the command list to your DM's!")
      return await message.channel.send(embedInform)
    }
    else if(command === "loop" || command === 'lp'){
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
    else if(command === 'lock'){
      if(message.member.id !== "245992052603486209") return;
      embedInform.setFooter(message.member.displayName)
      embedInform.setTitle('Lockdown!')
      lock = !lock
      embedInform.setDescription(`Lockdown has been toggled to ${lock}!`)
      await message.channel.send(embedInform)
    }
    else if(command === "join"){
      const voiceChannel = message.member.voiceChannel;
      connection = await voiceChannel.join();
    }else if(command === "remove"){
      if(!serverQueue){
        embedWarn.setFooter(message.member.displayName)
        embedWarn.setDescription("There's nothing playing!")
      return await message.channel.send(embedWarn);
      }
      if(message.member.roles.find(role => role.name === "DJ") || message.member.voiceChannel.members.size === '1'){
        var a = serverQueue.loop
        serverQueue.loop = false; serverQueue.connection.dispatcher.end(); serverQueue.loop = a;
        embedInform.setDescription('Removing song...')
        embedInform.setTitle('Song removed!')
        embedInform.setFooter(message.member.displayName)
        return await message.channel.send(embedInform)
      }
    }
    else{
      embedWarn.setFooter(message.member.displayName)
      embedWarn.setDescription("This is an invalid command, use **'. help'** to find out what commands this bot provides!")
      return await message.channel.send(embedWarn)
    }
})
client.on("guildCreate", guild => {
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    //client.user.setActivity(`Serving ${client.guilds.size} servers, use ". help"`);
});
client.on("guildDelete", guild => {
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    //client.user.setActivity(`Serving ${client.guilds.size} servers, use ". help"`);
});
client.on('warn', info => {
  console.log(info)
})
client.on('error', info => {
  console.log(info)
})
async function play(guild, song, vc, message) {
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
        play(guild, serverQueue.songs[0], vc, message)
      })
      .on('error', error => {
        try{
          serverQueue.voiceChannel.leave();
          queue.delete(guild.id);
          console.error(`error event in dispatcher : ${error}`)
          embedError.setDescription('Error in Dispatcher, leaving voice channel and deleting the queue!')
          return message.serverQueue.textChannel.send(embedError)
        }catch(err){
          console.log(`error trying to self fix error in dispatcher : ${err}`)
        }
      })
    dispatcher.setVolumeLogarithmic(serverQueue.volume);
};
async function shuffle(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
}
}
const embed = new Discord.RichEmbed()
    .setTitle('Commands list for Pipe')
    .setColor('RED')
    .setDescription("Some commands require DJ, it is a role simply called 'DJ' and does not require any special permissions, otherwise the command may be operated if there's one person in a voice channel alone or by a voting process.")
    .addField('play/p', "Plays any youtube url/search term. \nSYNTAX: ('. play https://www.youtube.com/video/this!') or ('. p youtube is cool')")
    .addField('queue/q', "Shows the currently playing stream and up coming youtube videos. \nSYNTAX: ('. queue') or ('. q')")
    .addField('stop/stp', "Stops the currently playing stream while deleting the whole queue. Requires to be a DJ or have maximum 1 person in a voice channel.  \nSYNTAX: ('. stop') or ('. stp')")
    .addField('skip/skp', "Skips the currently playing stream. Requires to be a DJ or have maximum 1 person in a voice channel, else voting. \nSYNTAX: ('. skip') or ('. skp')")
    .addField('pause/pse', "Pauses the currently playing stream and the queue. Requires to be a DJ or have maximum 1 person in a voice channel. \nSYNXTAX: ('. pause') or ('. pse')")
    .addField('resume/rme',"Resumes the currently paused stream and the queue. Requires to be a DJ or have maximum 1 person in a voice channel. \nSYNXTAX: ('. resume') or ('. rme')")
    .addField('volume/vol', "Displays or changes the volume for the rest of time the whole queue plays. Requires to be a DJ or have maximum 1 person in a voice channel to change volume. \nDEFAULT: 5, SYNTAX: ('. volume') or ('. vol')")
    .addField('shuffle/sle', "Shuffles the whole queue then restarts the song first in the queue. Requires to be a DJ or have maximum 1 person in a voice channel.  \nSYNTAX: ('. shuffle') or ('. sle')")
    .addField('loop/lp', "Loops the whole queue instead of removing a song when it ends. \nSYNTAX: ('. loop') or ('. lp')")
    .addField('ping', "Gets the bot's and Discord Api's latency. \nSYNTAX: ('. ping')")
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
