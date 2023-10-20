import {readFile, stat, writeFile} from "fs/promises";
import {existsSync} from "fs";
import fetch from "node-fetch";
import {fileURLToPath} from "url";


const __dirname = fileURLToPath(new URL(".", import.meta.url));
const CACHE_MINUTES = 60 * 24 * 7; // minutes * hours * days
const CACHE_FILE = __dirname + "/../.proton-version";

export const DEBUG = true;

export const FULL_VERSION_LIST = [
	{
		brand: "Chromium",
		version: "118.0.5993.88",
	},
	{
		brand: "Google Chrome",
		version: "118.0.5993.88",
	},
	{
		brand: "Not=A?Brand",
		version: "99.0.0.0",
	},
];
export const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";
export const USER_AGENT_CH = FULL_VERSION_LIST.map(item => {
	return `"${item.brand}";v="${item.version.split(".")[0]}"`;
}).join(", ");
export const VERSION_BRANDS = JSON.parse(JSON.stringify(FULL_VERSION_LIST)).map((item) => {
	item.version = item.version.split(".")[0];
	return item;
});
export const APP_VERSION = `web-account@${await getAppVersion()}`;


/**
 * If `APP_VERSION` is out of date the API will return "This web page is out of date, please refresh the page to continue using it".
 * @returns {Promise<string>}
 */
async function getAppVersion() {
	if(!existsSync(CACHE_FILE) || Date.now() - (await stat(CACHE_FILE)).mtime.getTime() > CACHE_MINUTES * 60 * 1000) {
		console.warn(`File older than cache of ${CACHE_MINUTES} minutes. Fetching new...`);
		const versionResp = await fetch("https://account.proton.me/assets/version.json", {
			headers: {
				"user-agent": USER_AGENT,
			},
		});
		const {version: appVersion, date: deployDate} = await versionResp.json();

		console.info(`Updated APP_VERSION (${deployDate}): ${appVersion}`);
		await writeFile(CACHE_FILE, appVersion, "utf8");
		return appVersion;
	}
	else {
		return readFile(CACHE_FILE, "utf8");
	}
}