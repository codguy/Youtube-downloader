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

/**
 * Fetches video information, filters and categorizes formats,
 * and then prompts the user to select a format for download.
 * @param {string} url - The YouTube video URL.
 */
async function download(url) {
	const spinner = ora(`Fetching info for video: ${chalk.green(url)}`).start();
	try {
		const videID = ytdl.getURLVideoID(url);
		// Get video information
		const info = await ytdl.getInfo(videID);
		spinner.succeed(
			`Info fetched for: ${chalk.cyan(info.videoDetails.title)}`
		);

		console.log('Uploaded by:', info.videoDetails.author.name, '\n');

		// Filter out duplicate formats based on itag
		const uniqueFormats = [];
		const seenItags = new Set();
		info.formats.forEach(format => {
			if (!seenItags.has(format.itag)) {
				uniqueFormats.push(format);
				seenItags.add(format.itag);
			}
		});

		// Categorize formats
		const audioOnlyFormats = uniqueFormats.filter(
			format => format.hasAudio && !format.hasVideo
		);
		const videoWithAudioFormats = uniqueFormats.filter(
			format => format.hasAudio && format.hasVideo
		);
		// Note: Video-only formats (format.hasVideo && !format.hasAudio) are intentionally excluded.

		/**
		 * Prints a single format line to the console.
		 * @param {object} format - The format object from ytdl-core.
		 */
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

/**
 * Prompts the user to select a format by its Itag and proceeds to configure and download.
 * @param {object} info - The video info object, expected to contain a `formats` array
 *                        that has been filtered and categorized.
 * @param {string} url - The YouTube video URL.
 */
async function selectFormat(info, url) {
	readline.question('\nEnter Itag for Quality : ', itag_id => {
		// Find the selected format from the (already filtered) list
		let quality_format = info.formats.filter(format => {
			return format.itag == itag_id;
		});

		if (quality_format.length > 0) {
			console.log(chalk.gray('\nProcessing ...\n'));
			// Proceed to configure and download with the chosen format
			configureFormat(info, quality_format[0], itag_id, url);
		} else {
			console.log(chalk.red('\nPlease enter a valid itag from the list above.'));
			selectFormat(info, url); // Re-prompt with the same filtered list
		}
	});
}

/**
 * Configures file path and name, then initiates the file creation and download process.
 * @param {object} info - The general video info object.
 * @param {object} format_data - The specific format object selected by the user.
 * @param {string} itag_id - The Itag ID of the selected format (used for ytdl filtering).
 * @param {string} url - The YouTube video URL.
 */
function configureFormat(info, format_data, itag_id, url) {
	let mimeType = format_data.mimeType.split('/'); // e.g., ['video', 'mp4'] or ['audio', 'webm']
	// Sanitize video title for use in filename
	let file_title = info.videoDetails.title.replace(/[^a-zA-Z0-9\w\s.-]/g, '_').replace(/\s+/g, ' ');

	// Determine download path based on environment variables or a default
	// Default path structure: C:/Users/satna/Downloads/[video_or_audio]/
	// TODO: Consider making the default path more generic or user-configurable.
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
		(format_data.qualityLabel || 'audio') + // Use 'audio' if qualityLabel is null (e.g. for some audio formats)
		'.' +
		format_data.container;

	// Ensure download directory exists, then create the file
	fs.access(path, error => {
		if (error) { // Directory does not exist
			fs.mkdir(path, { recursive: true }, error => { // Create directory recursively
				if (error) {
					console.error(chalk.red(`Error creating directory: ${error.message}`));
					getVideoLink(); // Or some other error handling / retry logic
				} else {
					createFile(file_name, itag_id, url);
				}
			});
		} else { // Directory already exists
			createFile(file_name, itag_id, url);
		}
	});
}

/**
 * Creates the file stream and starts the download process using ytdl.
 * @param {string} file_name - The full path and name of the file to be created.
 * @param {string} itag_id - The Itag ID of the selected format.
 * @param {string} url - The YouTube video URL.
 */
function createFile(file_name, itag_id, url) {
	let outputFilePath = path.resolve(file_name);
	// Create a write stream to save the video/audio file
	const outputStream = fs.createWriteStream(outputFilePath);

	// Download the video/audio file
	const stream = ytdl(url, {
		filter: format => format.itag == itag_id
	});
	stream.pipe(outputStream);
	processDownload(stream); // Pass the ytdl stream to processDownload
}

/**
 * Sets up progress bar and handles events for the download stream.
 * @param {ReadableStream} stream - The ytdl download stream.
 */
function processDownload(stream) {
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
