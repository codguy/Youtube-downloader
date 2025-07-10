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
const ora = require('ora'); // Added ora

require('dotenv').config();

const input = cli.input;
const flags = cli.flags;
const { clear, debug } = flags;

let audioFilter = process.env.AUDIO_FILTER == 'false' ? true : false;

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
		await download(url);
	});
}

async function download(url) {
	const spinner = ora(`Fetching info for video: ${chalk.green(url)}`).start();
	try {
		let videID = ytdl.getURLVideoID(url);
		// Get Info
		const info = await ytdl.getInfo(videID);
		spinner.succeed(
			`Info fetched for: ${chalk.cyan(info.videoDetails.title)}`
		);

		// Showing all the formats of the video
		console.log('uploaded by:', info.videoDetails.author.name, '\n');

		const uniqueFormats = [];
		const seenItags = new Set();
		info.formats.forEach(format => {
			if (!seenItags.has(format.itag)) {
				uniqueFormats.push(format);
				seenItags.add(format.itag);
			}
		});

		const audioOnlyFormats = uniqueFormats.filter(
			format => format.hasAudio && !format.hasVideo
		);
		const videoWithAudioFormats = uniqueFormats.filter(
			format => format.hasAudio && format.hasVideo
		);

		const printFormatLine = format => {
			let mimeType = format.mimeType.split('/');
			console.log(
				format.itag +
					'\t' +
					mimeType[0] +
					'\t' +
					format.container +
					'\t' +
					chalk.green(format.qualityLabel || 'N/A') +
					'\t' +
					chalk.grey(format.hasAudio) +
					'\t' +
					chalk.grey(format.hasVideo)
			);
		};

		const tableHeader =
			'Itag' +
			'\t' +
			' Type' +
			'\t' +
			'Format' +
			'\t' +
			'Quality' +
			'\t' +
			'Audio' +
			'\t' +
			'Video';

		if (audioOnlyFormats.length > 0) {
			console.log(chalk.bold.yellow('\n--- Audio Only ---'));
			console.log(tableHeader);
			audioOnlyFormats.forEach(printFormatLine);
		}

		if (videoWithAudioFormats.length > 0) {
			console.log(chalk.bold.yellow('\n--- Video with Audio ---'));
			console.log(tableHeader);
			videoWithAudioFormats.forEach(printFormatLine);
		}

		// Pass the unique formats to selectFormat
		const allSelectableFormats = [...audioOnlyFormats, ...videoWithAudioFormats];
		if (allSelectableFormats.length === 0) {
			console.log(chalk.red('No suitable audio or video with audio formats found.'));
			getVideoLink(); // Or handle error appropriately
			return;
		}

		// Create a new info object with only the unique, selectable formats for selectFormat
		const filteredInfo = { ...info, formats: allSelectableFormats };

		await selectFormat(filteredInfo, url);
	} catch (error) {
		spinner.fail('Error fetching video info.');
		console.error(chalk.red(`\nError: ${error.message}`));

		if (process.stdin.isTTY) {
			// Optionally, prompt to try again or exit if running in an interactive terminal
			readline.question(
				'Would you like to try another URL? (y/n): ',
				answer => {
					if (answer.toLowerCase() === 'y') {
						getVideoLink();
					} else {
						console.log(chalk.blue('Exiting.'));
						readline.close(); // Close readline before exiting
						process.exit(0);
					}
				}
			);
		} else {
			// If not a TTY (e.g., piped input), just exit after error
			console.log(
				chalk.blue('Exiting due to error in non-interactive mode.')
			);
			process.exit(1); // Exit with error code 1
		}
	}
}

async function selectFormat(info, url) {
	readline.question('\nEnter Itag for Quality : ', itag_id => {
		let quality_format = info.formats.filter(format => {
			return format.itag == itag_id;
		});

		if (quality_format.length > 0) {
			console.log(chalk.gray('\nProcessing ...\n'));
			configureFormat(info, quality_format[0], itag_id, url);
		} else {
			console.log(chalk.red('\nPlease enter a valid itag for Quality'));
			selectFormat(info, url);
		}
	});
}

function configureFormat(info, format_data, itag_id, url) {
	let mimeType = format_data.mimeType.split('/');
	let file_title = info.videoDetails.title.replace(/[^a-zA-Z0-9\w\s]/g, '');

	let path = `C:/Users/satna/Downloads/${mimeType[0]}/`;
	if (mimeType[0] == 'audio') {
		path = process.env.AUDIO_DOWNLOAD_DESTINATION ?? path;
	} else {
		path = process.env.VIDEO_DOWNLOAD_DESTINATION ?? path;
	}

	let file_name =
		path +
		file_title +
		'_' +
		format_data.qualityLabel +
		'.' +
		format_data.container;
	fs.access(path, error => {
		if (error) {
			fs.mkdir(path, error => {
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
	const bar1 = new cliProgress.SingleBar(
		{
			format: `Downloading | ${chalk.cyan(
				'{bar}'
			)} | {percentage}% || {downloadedMb}MB / {totalMb}MB || ETA: {etaFormatted} || Duration: {durationFormatted}`,
			barCompleteChar: '\u2588',
			barIncompleteChar: '\u2591',
			hideCursor: true
		},
		cliProgress.Presets.shades_classic
	);

	video.once('response', res => {
		starttime = Date.now();
		// totalBytes will be available in res.headers['content-length']
		// However, ytdl 'progress' event already provides total, so we use that.
		// For this bar, we set total to 100 (for percentage)
		bar1.start(100, 0, {
			downloadedMb: '0.00',
			totalMb: '0.00',
			etaFormatted: '0s',
			durationFormatted: '0s'
		});
	});

	video.on('progress', (chunkLength, downloaded, total) => {
		const percent = downloaded / total;
		const downloadedMb = (downloaded / 1024 / 1024).toFixed(2);
		const totalMb = (total / 1024 / 1024).toFixed(2);

		const elapsedSeconds = (Date.now() - starttime) / 1000;
		const elapsedMinutes = Math.floor(elapsedSeconds / 60);
		const elapsedSecs = Math.floor(elapsedSeconds % 60);
		const durationFormatted = `${elapsedMinutes}m ${elapsedSecs}s`;

		let etaFormatted = 'N/A';
		if (percent > 0 && percent < 1) {
			const etaTotalSeconds = elapsedSeconds / percent - elapsedSeconds;
			const etaMinutes = Math.floor(etaTotalSeconds / 60);
			const etaSecs = Math.floor(etaTotalSeconds % 60);
			etaFormatted = `${etaMinutes}m ${etaSecs}s`;
		} else if (percent === 1) {
			etaFormatted = '0s';
		}

		bar1.update(Math.floor(percent * 100), {
			downloadedMb,
			totalMb,
			etaFormatted,
			durationFormatted
		});
	});

	video.on('end', () => {
		bar1.update(100); // Ensure bar is full on completion
		bar1.stop();
		console.log(chalk.green('\nDownload Completed!'));
		process.exit(0);
	});
}
