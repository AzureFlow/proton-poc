import crypto from "crypto";
import {readFile} from "fs/promises";
import {randomInt, randomItem} from "../utils.js";
import {fileURLToPath} from "url";
import * as constants from "../constants.js";
import {DateTime} from "luxon";


const __dirname = fileURLToPath(new URL(".", import.meta.url));

const gpus = (await readFile(__dirname + "/../../resources/gpus.txt", "utf8")).replaceAll("\r\n", "\n").split("\n");

const timezones = [
	"America/New_York",
	"America/Chicago",
	"America/Los_Angeles",
];

const screenResolutions = [
	[1920, 1080],
	[1366, 768],
	[1440, 900],
	[1280, 720],
	[1280, 1024],
];

const FINGERPRINT_VERSION = "2.2.5";


/**
 * @param {Uint8Array} aesKey
 * @param {ProtonFrame} frame
 * @returns {string} Resulting encrypted payload using the provided AES key
 */
export function getFingerprint(aesKey, frame = "login") {
	if(aesKey.length !== 16) {
		throw new Error("Invalid AES key length, key must be 16bytes (128bit)");
	}

	const res = randomItem(screenResolutions);
	const tzName = randomItem(timezones);
	const tzOffset = -DateTime.local({zone: tzName}).offset;

	const typeString = "password123";
	const payloadRaw = {
		adBlock: false,
		addBehavior: false,
		ancestorOrigin: "https://account.proton.me",
		blur: {
			"#email.input-element w100 email-input-field": [
				{
					"1169": "",
				},
				{
					"113330": "",
				},
				{
					"116449": typeString,
				},
			],
		},
		chrome: true,
		click: {
			"113433": [
				130,
				19,
			],
			"113712": [
				116,
				46,
			],
		},
		colorDepth: 24,
		copy: [
			// {
			// 	paste: "",
			// 	path: typeString,
			// 	time: 116119,
			// },
		],
		cpuClass: "not available",
		deviceMemory: randomItem([2, 4, 6, 8]),
		doNotTrack: "not available", // "1" when enabled
		duration: [
			429,
			2,
			3015,
		],
		focus: {
			// Timestamps when the field was focused
			"#email.input-element w100 email-input-field": [
				{
					"740": "",
				},
				{
					"113328": "",
				},
				{
					"113434": "",
				},
			],
		},
		fontPreferences: {
			"default": 149.3125,
			apple: 149.3125,
			serif: 149.3125,
			sans: 144.015625,
			mono: 121.515625,
			min: 9.34375,
			system: 147.859375,
		},
		fonts: [
			// Default Windows font list
			"Agency FB",
			"Calibri",
			"Century",
			"Century Gothic",
			"Franklin Gothic",
			"Haettenschweiler",
			"Lucida Bright",
			"Lucida Sans",
			"MS Outlook",
			"MS Reference Specialty",
			"MS UI Gothic",
			"MT Extra",
			"Marlett",
			"Monotype Corsiva",
			"Pristina",
			"Segoe UI Light",
		],
		frame: {
			name: "username",
			// name: frame,
		},
		hardwareConcurrency: randomItem([2, 4, 6, 8]),
		hasLiedBrowser: false,
		hasLiedLanguages: false,
		hasLiedOs: false,
		hasLiedResolution: false,
		indexedDB: true,
		keydown: typeString.split(""),
		language: "en-US",
		languages: [
			"en-US",
			"en",
		],
		localStorage: true,
		monochrome: 0,
		mousemove: randomInt(200, 400),
		openDatabase: true,
		permissions: false,
		pixelRatio: 1,
		platform: "Win32",
		plugins: [
			{
				name: "PDF Viewer",
				description: "Portable Document Format",
				mimeTypes: [
					{
						type: "application/pdf",
						suffixes: "pdf",
					},
					{
						type: "text/pdf",
						suffixes: "pdf",
					},
				],
			},
			{
				name: "Chrome PDF Viewer",
				description: "Portable Document Format",
				mimeTypes: [
					{
						type: "application/pdf",
						suffixes: "pdf",
					},
					{
						type: "text/pdf",
						suffixes: "pdf",
					},
				],
			},
			{
				name: "Chromium PDF Viewer",
				description: "Portable Document Format",
				mimeTypes: [
					{
						type: "application/pdf",
						suffixes: "pdf",
					},
					{
						type: "text/pdf",
						suffixes: "pdf",
					},
				],
			},
			{
				name: "Microsoft Edge PDF Viewer",
				description: "Portable Document Format",
				mimeTypes: [
					{
						type: "application/pdf",
						suffixes: "pdf",
					},
					{
						type: "text/pdf",
						suffixes: "pdf",
					},
				],
			},
			{
				name: "WebKit built-in PDF",
				description: "Portable Document Format",
				mimeTypes: [
					{
						type: "application/pdf",
						suffixes: "pdf",
					},
					{
						type: "text/pdf",
						suffixes: "pdf",
					},
				],
			},
		],
		screenResolution: [
			res[0],
			res[1],
		],
		sessionStorage: true,
		timezone: tzName,
		timezoneOffset: tzOffset,
		touchSupport: {
			maxTouchPoints: 0,
			touchEvent: false,
			touchStart: false,
		},
		userAgentData: {
			model: "",
			platform: "Windows",
			platformVersion: "10.0.0",
			brands: constants.VERSION_BRANDS,
			fullVersionList: constants.FULL_VERSION_LIST,
		},
		v: FINGERPRINT_VERSION,
		vendor: "Google Inc.",
		vendorFlavors: [
			"chrome",
		],
		visitorId: crypto.randomBytes(16).toString("hex"), // This should use x64hash128 on all the components, but it likely doesn't matter
		webdriver: false,
		webglVendorAndRenderer: randomItem(gpus),
	};

	return encryptPayload(aesKey, payloadRaw);
}

/**
 * @param {Uint8Array} aesKey
 * @param {object} payload
 * @returns {string}
 */
export function encryptPayload(aesKey, payload = {}) {
	// - Serialize to JSON
	// - Split into an array of characters
	// - Convert each character into its corresponding character code
	const payloadChars = JSON.stringify(payload)
		.split("")
		.map(x => x.charCodeAt(0));
	const cipher = crypto.createCipheriv("aes-128-cbc", aesKey, new Uint8Array(16));

	// AES 128 CBC encrypt the payload using an empty (0) IV and the provided key
	return cipher.update(new Uint8Array(payloadChars)).toString("base64") + cipher.final("base64");
}