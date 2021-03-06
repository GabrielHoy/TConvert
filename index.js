/*
	Gabriel Hoy
	2/20/2022
*/
const fs = require("fs");
const Eris = require("eris");
const request = require('request');
const ffmpeg = require('ffmpeg');
const path = require('path');

let token = fs.readFileSync("token.txt").toString().trim();

const bot = new Eris(token);

bot.on("ready", () => {
	console.log("Bot started");
});

bot.on("error", (err) => {
	console.log(err);
});

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

let supportedContentTypes = {
	"video/x-ms-wmv": true,
	"video/quicktime":true,
	"video/x-matroska":true,
}

function ReplaceAnyMedia(msg) {
	for (let i = 0; i < msg.attachments.length; i++) {
		for (let [contentType,_] of Object.entries(supportedContentTypes)) {
			if (msg.attachments[i].content_type == contentType) {
				let file = fs.createWriteStream(msg.attachments[i].filename);

				const sendReq = request.get(msg.attachments[i].url);
				sendReq.on('response', (response) => {
					if (response.statusCode !== 200) {
						console.log(`Problem downloading file: ${response.statusCode}`);
						fs.unlink(file.path, () => {console.log("deleted");});
						return;
					}
					response.pipe(file);
				});

				sendReq.on("error", (err) => {
					fs.unlink(file, () => {console.log("deleted2");});
					console.log("ERR: " + err.message);
				});
				try {
					sendReq.on("complete", () => {

						try { 
							new ffmpeg(file.path, (err,video) => {
								if (!err) {
									video.setVideoFormat("mp4").save(path.parse(file.path).name + ".mp4", (err,ffmpegfile) => {
										if (!err) {
											fs.readFile(ffmpegfile, null, (err,data) => {
												if (err) {
													console.log("error reading file");
													return;
												}
												bot.createMessage(msg.channel.id, `\`\`\`${msg.content}\`\`\` Hey <@${msg.author.id}>,\nIt seems like you posted a file that moderators can't look at properly, so we've converted it to a better format for you automatically:`,  {name: ffmpegfile, file: data}).then(() => {
													msg.delete();
												});
												fs.unlink(file.path, () => {});
												fs.unlink(ffmpegfile, () => {});
											});
										} else {
											console.log("Error:");
											console.log(err);
										}
									});
								} else {
									console.log("Error from new ffmpeg: " + err);
								}
							});
						} catch (e) {
							console.log(e.code);
							console.log(e.msg);
							console.log("ConversionERROR^");
						}

						
					});
				} catch (err) {
					console.log(err);
					console.log("CMER ^");
				}

				file.on('error', (err) => {
					fs.unlink(file, () => {console.log("ERRFCL: " + err.message);});
				});
				break;
			}
			
		}
	}
	return false;
}


bot.on("messageCreate", async (msg) => {
	if (msg.author.id == bot.user.id) return;
		try {
			ReplaceAnyMedia(msg);
		} catch (err) {
			console.log(err);
		}
})

bot.connect();