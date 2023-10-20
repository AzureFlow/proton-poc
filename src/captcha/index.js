"use strict";
import fetch from "node-fetch";
import * as constants from "../constants.js";
import {CookieJar} from "tough-cookie";
import {writeFile} from "fs/promises";
import extractKey from "./extractKey.js";
import solvePuzzle1d from "./solvePuzzle1d.js";
import getEvents from "./getEvents.js";
import computePOW from "./computePOW.js";
import {getFingerprint} from "./fingerprint.js";
import {randomFloat} from "../utils.js";
import {fileURLToPath} from "url";


const __dirname = fileURLToPath(new URL(".", import.meta.url));


/**
 * @param {Object}
 * @param {ProtonFrame} frame
 * @param {CookieJar} cookieJar
 * @param {Agent} [proxyAgent]
 * @returns {Promise<{challengeId: string, encryptedFingerprint: string, aesKey: Uint8Array}>}
 */
export async function initChallenges({
										 frame,
										 cookieJar,
									 }, proxyAgent = undefined) {
	const {challengeId, aesKey} = await getChallengeFrame(cookieJar, proxyAgent);
	const cipherText = getFingerprint(aesKey, frame);
	console.log("cipherText:", cipherText); // Sent as Payload.RANDOM_ID in /api/core/v4/auth

	return {
		challengeId,
		encryptedFingerprint: cipherText,
		aesKey,
	};
}

/**
 * @param {Object}
 * @param {string} challengeToken
 * @param {ProtonFrame} frame
 * @param {CookieJar} cookieJar
 * @param {Agent} [proxyAgent]
 * @returns {Promise<string>}
 */
export async function solveCaptcha({
									   challengeToken,
									   frame,
									   cookieJar,
								   }, proxyAgent = undefined) {
	const {part1, part2, parentURL} = await getCaptchaFrame(challengeToken, cookieJar);

	const initResp = await fetch("https://account-api.proton.me/captcha/v1/api/init?" + new URLSearchParams({
		challengeType: "1D",
		parentURL: parentURL,
		displayedLang: "en",
		supportedLangs: "en-US,en-US,en,en-US,en",
		purpose: frame,
	}), {
		method: "GET",
		compress: true,
		headers: {
			"accept": "*/*",
			"accept-encoding": "gzip, deflate, br",
			"accept-language": "en-US,en;q=0.9",
			"cache-control": "max-age=0",
			"content-type": "application/json",
			"cookie": cookieJar.getCookieStringSync("https://account-api.proton.me/captcha/v1/api/init"),
			"referer": "https://account-api.proton.me/captcha/v1/assets/?purpose=" + frame,
			"sec-ch-ua": constants.USER_AGENT_CH,
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": "\"Windows\"",
			"sec-fetch-dest": "empty",
			"sec-fetch-mode": "cors",
			"sec-fetch-site": "same-origin",
			"sec-gpc": "1",
			"user-agent": constants.USER_AGENT,
		},
		agent: proxyAgent,
	});
	if(!initResp.ok) {
		throw new Error("An error occurred while fetching captcha background: " + await initResp.text());
	}
	/** @type {InitResponse} */
	const initContent = await initResp.json();
	console.log("initContent:", initContent);

	// Set init cookies
	for(const cookieString of initResp.headers.raw()["set-cookie"]) {
		cookieJar.setCookie(cookieString, initResp.url);
	}

	// x-pm-human-verification-token
	const humanVerificationToken = `${challengeToken}:${part1}${part2}${initContent.token}`;
	console.log("humanVerificationToken:", humanVerificationToken);

	// Download 1D background
	const imgBgResp = await fetch("https://account-api.proton.me/captcha/v1/api/bg?token=" + initContent.token, {
		method: "GET",
		compress: true,
		headers: {
			"accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
			"accept-encoding": "gzip, deflate, br",
			"accept-language": "en-US,en;q=0.9",
			// Session doesn't matter, you just need the token
			// "cookie": cookieJar.getCookieStringSync("https://account-api.proton.me/captcha/v1/api/bg"),
			"origin": "https://account-api.proton.me",
			"referer": "https://account-api.proton.me/captcha/v1/assets/?purpose=" + frame,
			"sec-ch-ua": constants.USER_AGENT_CH,
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": "\"Windows\"",
			"sec-fetch-dest": "image",
			"sec-fetch-mode": "cors",
			"sec-fetch-site": "same-origin",
			"sec-gpc": "1",
			"user-agent": constants.USER_AGENT,
		},
		// Don't download via the proxy to save bandwidth, also Proton doesn't care
		// agent: proxyAgent,
	});
	if(!imgBgResp.ok) {
		throw new Error("An error occurred while fetching captcha background: " + await imgBgResp.text());
	}
	const imgBgContent = Buffer.from(await imgBgResp.arrayBuffer());
	if(constants.DEBUG) {
		await writeFile(__dirname + "/../../research/bg-debug.png", imgBgContent);
	}
	const dResult = await solvePuzzle1d(imgBgContent);
	console.log("dResult:", dResult);

	// Timings are performance.now()
	// Ultimately, these don't matter and aren't checked. You can send zeros and it'll still pass.
	const loadMs = randomFloat(200.00000000000001, 600);
	const solveMs = randomFloat(2000.00000000000001, 3000);
	const powMs = solveMs + randomFloat(1000.00000000000001, 2000);
	/** @type {PCaptcha} */
	const pCaptcha = {
		y: dResult.y,
		answers: await computePOW(initContent.challenges, initContent.nLeadingZerosRequired),
		clientData: getEvents(),
		bgLoadElapsedMs: loadMs,
		challengeLoadElapsedMs: loadMs,
		solveChallengeMs: solveMs,
		powElapsedMs: powMs,
	};
	console.log("pCaptcha:", pCaptcha);

	const validateResp = await fetch("https://account-api.proton.me/captcha/v1/api/validate?" + new URLSearchParams({
		token: initContent.token,
		contestId: initContent.contestId,
		purpose: frame,
	}), {
		method: "GET",
		compress: true,
		body: null,
		headers: {
			"accept": "*/*",
			"accept-encoding": "gzip, deflate, br",
			"accept-language": "en-US,en;q=0.9",
			"cache-control": "max-age=0",
			"cookie": cookieJar.getCookieStringSync("https://account-api.proton.me/captcha/v1/api/validate"),
			"pcaptcha": JSON.stringify(pCaptcha),
			"referer": "https://account-api.proton.me/captcha/v1/assets/?purpose=" + frame,
			"sec-ch-ua": constants.USER_AGENT_CH,
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": "\"Windows\"",
			"sec-fetch-dest": "empty",
			"sec-fetch-mode": "cors",
			"sec-fetch-site": "same-origin",
			"sec-gpc": "1",
			"user-agent": constants.USER_AGENT,
		},
		agent: proxyAgent,
	});
	const validateContent = await validateResp.text();
	console.log("validateContent:", validateContent);

	if(!validateResp.ok) {
		throw new Error(`Validation error (${validateResp.status}): ${validateContent}`);
	}

	// const finalizeResp = await fetch("https://account-api.proton.me/captcha/v1/api/finalize?" + new URLSearchParams({
	// 	contestId: initContent.contestId,
	// 	purpose: frame,
	// }), {
	// 	method: "GET",
	// 	compress: true,
	// 	body: null,
	// 	headers: {
	// 		"accept": "*/*",
	// 		"accept-encoding": "gzip, deflate, br",
	// 		"accept-language": "en-US,en;q=0.9",
	// 		"cache-control": "max-age=0",
	// 		"content-type": "application/json",
	// 		"cookie": cookieJar.getCookieStringSync("https://account-api.proton.me/captcha/v1/api/finalize"),
	// 		"referer": "https://account-api.proton.me/captcha/v1/assets/?purpose=" + frame,
	// 		"sec-ch-ua": constants.USER_AGENT_CH,
	// 		"sec-ch-ua-mobile": "?0",
	// 		"sec-ch-ua-platform": "\"Windows\"",
	// 		"sec-fetch-dest": "empty",
	// 		"sec-fetch-mode": "cors",
	// 		"sec-fetch-site": "same-origin",
	// 		"sec-gpc": "1",
	// 		"user-agent": constants.USER_AGENT,
	// 	},
	// 	agent: proxyAgent,
	// });
	// const finalizeContent = await finalizeResp.text();
	// console.log("finalizeContent:", finalizeContent);
	//
	// if(!finalizeResp.ok) {
	// 	throw new Error(`Finalize error (${finalizeResp.status}): ${finalizeContent}`);
	// }

	return humanVerificationToken;
}

/**
 * @param {string} challengeToken
 * @param {CookieJar} cookieJar
 * @param {Agent} [proxyAgent]
 * @returns Promise<{part1: string, part2: string, parentURL: string}>
 */
async function getCaptchaFrame(challengeToken, cookieJar, proxyAgent = undefined) {
	const iframeResp = await fetch(`https://account-api.proton.me/core/v4/captcha?Token=${challengeToken}&ForceWebMessaging=1`, {
		method: "GET",
		compress: true,
		headers: {
			"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
			"accept-encoding": "gzip, deflate, br",
			"accept-language": "en-US,en;q=0.9",
			"cookie": cookieJar.getCookieStringSync("https://account-api.proton.me/core/v4/captcha"),
			"referer": "https://account.proton.me/",
			"sec-ch-ua": constants.USER_AGENT_CH,
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": "\"Windows\"",
			"sec-fetch-dest": "iframe",
			"sec-fetch-mode": "navigate",
			"sec-fetch-site": "same-site",
			"sec-fetch-user": "?1",
			"sec-gpc": "1",
			"upgrade-insecure-requests": "1",
			"user-agent": constants.USER_AGENT,
		},
		agent: proxyAgent,
	});
	const iframeContent = await iframeResp.text();
	if(!iframeResp.ok) {
		throw new Error("An error occurred while fetching the challenge iframe: " + iframeContent);
	}

	const reTkn = iframeContent.match(/sendToken\('(?<part1>[a-zA-Z0-9+/=]{24})'\+'(?<part2>[a-zA-Z0-9+/=]{24})'\+response\);/);
	if(reTkn === null) {
		throw new Error("No matches for captcha token regex");
	}

	const {part1, part2} = reTkn.groups;
	return {
		part1,
		part2,
		parentURL: iframeResp.url,
	};
}

/**
 * @param {CookieJar} cookieJar
 * @param {Agent} [proxyAgent]
 * @returns Promise<{challengeId: string, aesKey: Uint8Array}>
 */
async function getChallengeFrame(cookieJar, proxyAgent = undefined) {
	const challengeResp = await fetch("https://account-api.proton.me/challenge/v4/html?Type=0&Name=unauth", {
		method: "GET",
		compress: true,
		headers: {
			"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
			"accept-encoding": "gzip, deflate, br",
			"accept-language": "en-US,en;q=0.9",
			"cookie": cookieJar.getCookieStringSync("https://account-api.proton.me/challenge/v4/html"),
			"referer": "https://account.proton.me/",
			"sec-ch-ua": constants.USER_AGENT_CH,
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": "\"Windows\"",
			"sec-fetch-dest": "iframe",
			"sec-fetch-mode": "navigate",
			"sec-fetch-site": "same-site",
			"sec-gpc": "1",
			"upgrade-insecure-requests": "1",
			"user-agent": constants.USER_AGENT,
		},
		agent: proxyAgent,
	});
	const challengeContent = await challengeResp.text();
	if(constants.DEBUG) {
		await writeFile(__dirname + "/../../research/challenge_check/v4.html", challengeContent, "utf8");
	}
	const reChallengeId = challengeContent.match(/postMessage\({type:'child\.message\.data',data:{id:'(?<challengeId>[a-zA-Z0-9_\-.]+)'/);
	if(reChallengeId === null) {
		throw new Error("Challenge ID not found");
	}
	const {challengeId} = reChallengeId.groups;
	console.log("challengeId:", challengeId);

	const aesKey = extractKey(challengeContent);
	console.log("aesKey:", aesKey);

	return {
		challengeId,
		aesKey,
	};
}


/**
 * @typedef InitResponse
 * @type {object}
 * @property {string} status
 * @property {string} contestId
 * @property {string} token
 * @property {string[]} challenges
 * @property {number} nLeadingZerosRequired
 */

/**
 * @typedef PCaptcha
 * @type {object}
 * @property {number} [x]
 * @property {number} y
 * @property {number} [pieceLoadElapsedMs]
 * @property {number[]} answers
 * @property {string} clientData
 * @property {number} bgLoadElapsedMs
 * @property {number} challengeLoadElapsedMs
 * @property {number} solveChallengeMs
 * @property {number} powElapsedMs
 */

/**
 * @typedef ProtonFrame
 * @type {"login"|"signup"|"username"}
 */