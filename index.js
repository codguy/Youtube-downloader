#!/usr/bin/env node

/**
 * Youtube-downloader
 * This will download the youtube videos Just by entering the url
 *
 * @author Satnam dass (codguy) <https://codguy.github.io/portfolio/>
 */

const init = require('./utils/init');
const cli = require('./utils/cli');
const log = require('./utils/log');

const path = require('path');
const ytdl = require('ytdl-core');
const chalk = require('chalk');
const fs = require('fs');
const cliProgress = require('cli-progress');
const readlineEX = require('readline');

require('dotenv').config()

const input = cli.input;
const flags = cli.flags;
const { clear, debug } = flags;

let audioFilter = (process.env.AUDIO_FILTER == 'false') ? true : false;

let readline = readlineEX.createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
	init({ clear });
	input.includes(`help`) && cli.showHelp(0);

	debug && log(flags);

    getVideoLink();
})();


function getVideoLink() {
    readline.question('Enter video Link to download : ', async url => {
        console.log(`Fetching info for video : ` + chalk.green(url));
        await download(url);
    });
}


async function download(url) {
    let videID = ytdl.getURLVideoID(url);

    // Get Info
    ytdl.getInfo(videID).then(async (info) => {
        // Showing all the formats of the video
        console.log('\ntitle:', chalk.cyan(info.videoDetails.title));
        console.log('uploaded by:', info.videoDetails.author.name, "\n");

        console.log("Itag" + "\t" + " Type" + "\t" + "Format" + "\t" + "Quality" + "\t" + "Audio" + "\t" + "Video");
        info.formats.forEach(format => {
            if ((process.env.ONLY_AUDIO == 'true') && format.hasAudio && !format.hasVideo) {
                
                let mimeType = format.mimeType.split("/");
                console.log(format.itag + "\t" + mimeType[0] + "\t" + format.container + "\t" + chalk.green(format.qualityLabel) + "\t" + chalk.grey(format.hasAudio) + "\t" + chalk.grey(format.hasVideo));
            } else if (audioFilter || format.hasAudio) {

                let mimeType = format.mimeType.split("/");
                console.log(format.itag + "\t" + mimeType[0] + "\t" + format.container + "\t" + chalk.green(format.qualityLabel) + "\t" + chalk.grey(format.hasAudio) + "\t" + chalk.grey(format.hasVideo));
            }
        });
        await selectFormat(info, url);

    });

}

async function selectFormat(info, url) {
    readline.question('\nEnter Itag for Quality : ', itag_id => {

        let quality_format = info.formats.filter(format => {
            return format.itag == itag_id;
        });

        if (quality_format.length > 0) {
            console.log(chalk.gray("\nProcessing ...\n"));
            configureFormat(info, quality_format[0], itag_id, url);
        } else {
            console.log(chalk.red("\nPlease enter a valid itag for Quality"));
            selectFormat(info, url);
        }
    });
}

function configureFormat(info, format_data, itag_id, url) {
    let mimeType = format_data.mimeType.split("/");
    let file_title = info.videoDetails.title.replace(/[^a-zA-Z0-9\w\s]/g, '');

    let path = `C:/Users/satna/Downloads/${mimeType[0]}/`;
    if (mimeType[0] == "audio") {
        path = process.env.AUDIO_DOWNLOAD_DESTINATION ?? path;
    } else {
        path = process.env.VIDEO_DOWNLOAD_DESTINATION ?? path;
    }

    let file_name = path + file_title + "_" + format_data.qualityLabel + "." + format_data.container;
    fs.access(path, (error) => {
        if (error) {
            fs.mkdir(path, (error) => {
                if (error) {
                    console.err(error);
                } else {
                    createFile(file_name, itag_id, url);
                }
            });
        } else {
            createFile(file_name, itag_id, url);
        }
    });
}

function createFile(file_name, itag_id, url) {
    let outputFilePath = path.resolve(file_name);
    // Create a write stream to save the video file
    const outputStream = fs.createWriteStream(outputFilePath);
    // Download the video file
    const video = ytdl(url, {
        filter: function (format) {
            return format.itag == itag_id;
        }
    });
    video.pipe(outputStream);
    processDownload(video);
}

function processDownload(video) {
    let starttime;
    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    video.once('response', () => {
        starttime = Date.now();

        bar1.start(100, 0);
    });

    video.on('progress', (chunkLength, downloaded, total) => {

        const percent = downloaded / total;
        const downloadedSeconds = (Date.now() - starttime) / 1000;
        const downloadedMinutes = downloadedSeconds / 60;
        const estimatedDownloadTime = (downloadedMinutes / percent) - downloadedMinutes;

        bar1.update(parseInt(percent * 100));
        readlineEX.cursorTo(process.stdout, 0);
        process.stdout.write(`\n${(percent * 100).toFixed(2)}% downloaded `);
        process.stdout.write(`(${(downloaded / 1024 / 1024).toFixed(2)}MB of ${(total / 1024 / 1024).toFixed(2)}MB)\n`);
        process.stdout.write(`running for: ${parseInt(downloadedMinutes)} min ${parseInt(downloadedSeconds % 60)} sec`);
        process.stdout.write(`, estimated time left: ${parseInt(estimatedDownloadTime)} min ${parseInt((estimatedDownloadTime * 60) % 60)} sec`);
        readlineEX.moveCursor(process.stdout, 0, -2);

    });

    video.on('end', () => {
        bar1.stop();
        console.log(chalk.green("\n\nDownload Completed!"));
        process.exit(0);
    });
}
