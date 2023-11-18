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

Now you can enter the youtube link and select the desired quality and the download will begin, it will download the video on downloads folder.


## ⚙ Customization

Although you can download the youtube video directly without having to customize the project properties, but you can still cusotmize project to your own preferences. Here is how you can do this :


Create a `.env` file in the root of your project and paste the following line:

```bash
# Only audio formats will appear
ONLY_AUDIO=true
# Only video formats with audio
AUDIO_FILTER=false
# Download directories for different file types
AUDIO_DOWNLOAD_DESTINATION="C:/Users/satna/Downloads/audio"
VIDEO_DOWNLOAD_DESTINATION="C:/Users/satna/Downloads/video"
```

These are the enviroment variables that are used to configure the application, you can change the following variables and the project will work on the configured variables.
