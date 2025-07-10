# Youtube Downloader using nodeJS CLI

This project can download any youtube video using the link of the video. Let me show you how to install and make it work.

* [📝 Requirments](#-requirements)
* [🌱 Install](#-install)
* [💻 Usage](#-usage)
* [⚙️ Customization](#-customization)


## 📝 Requirements

It is a node JS project so it is important to have node js installed on your system.

 >***Node js and npm*** should be installed on your system to make this work.




## 🌱 Install

Download the project into you system either by git or download as a zip file and then extract the zip file. Once the project is downloaded, go to the project directory and open a terminal window and hit the following command:

```
npm install -g
```
This will install all the dependencies required for the project to run.


Or installing with yarn? `yarn add dotenv`

## 💻 Usage

Now that the installation is done, you can start using the application to download any youtube video. Also as you have globally installed the project you can access it globally by running the commnand:

```
youtube-grabber
```

But if some problem have occured or the above command fails. you can just go to project directory and run the following command:
```
node ./index.js
```

Now you can enter the youtube link. The application will then display available download options, categorized into "Audio Only" and "Video with Audio".

**Key features of format selection:**
*   **No Duplicates:** Each format option listed is unique (based on its `itag`).
*   **Categorized Options:**
    *   **Audio Only:** Lists formats that are audio-only.
    *   **Video with Audio:** Lists formats that include both video and audio tracks.
*   **No Video-Only Streams:** Formats that are video-only (i.e., have no audio track) are not displayed, as they usually require merging with a separate audio track.

Select your desired quality/format by entering its `itag` when prompted. The download will begin, and the file will be saved to a default "Downloads" folder (organized by type, e.g., `Downloads/audio` or `Downloads/video`), or to a custom location if configured (see Customization).


## ⚙ Customization

While the application works out-of-the-box, you can customize some aspects of its behavior using a `.env` file. Create this file in the root of your project directory.


Here's an example of variables you can set in your `.env` file:

```bash
# AUDIO_FILTER: This variable is no longer used as of recent updates.
# The application now automatically shows "Audio Only" and "Video with Audio" if available.
# It also filters out video-only streams by default.

# ONLY_AUDIO: If set to true, the application will ONLY list "Audio Only" formats.
# If set to false or omitted, it will list both "Audio Only" and "Video with Audio" formats.
# ONLY_AUDIO=false

# Download directories for different file types
# You can specify custom paths where your downloads should be saved.
# If not specified, a default path within your user's "Downloads" directory will be used.
# Example:
# AUDIO_DOWNLOAD_DESTINATION="D:/My Music/YouTube Audio"
# VIDEO_DOWNLOAD_DESTINATION="D:/My Videos/YouTube Videos"
AUDIO_DOWNLOAD_DESTINATION="C:/Users/satna/Downloads/audio"
VIDEO_DOWNLOAD_DESTINATION="C:/Users/satna/Downloads/video"
```

These environment variables allow you to tailor the downloader's behavior and storage locations to your preferences.
