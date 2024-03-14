import fetch from "node-fetch";
import {CookieJar} from "tough-cookie";
import {getRandomString} from "./utils.js";
import * as constants from "./constants.js";


/**
 * @param {Agent} [proxyAgent]
 */
export default async function startSession(proxyAgent = undefined) {
	const cookieJar = new CookieJar(undefined);

	const sessionsResp = await fetch("https://account.proton.me/api/auth/v4/sessions", {
		method: "POST",
		compress: true,
		headers: {
			"accept": "application/vnd.protonmail.v1+json",
			"accept-encoding": "gzip, deflate, br",
			"accept-language": "en-US,en;q=0.9",
			"origin": "https://account.proton.me",
			"referer": "https://account.proton.me/login",
			"sec-ch-ua": constants.USER_AGENT_CH,
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": "\"Windows\"",
			"sec-fetch-dest": "empty",
			"sec-fetch-mode": "cors",
			"sec-fetch-site": "same-origin",
			"sec-gpc": "1",
			"user-agent": constants.USER_AGENT,
			"x-enforce-unauthsession": "true",
			"x-pm-appversion": constants.APP_VERSION,
			"x-pm-locale": "en_US",
		},
		agent: proxyAgent,
	});

	if(!sessionsResp.ok) {
		throw new Error(`sessionsResp (${sessionsResp.status}): ${await sessionsResp.text()}`);
	}

	/** @type {SessionsResponse} */
	const sessionsContent = await sessionsResp.json();
	console.log("sessionsContent:", sessionsContent);

	for(const cookieString of sessionsResp.headers.raw()["set-cookie"]) {
		cookieJar.setCookie(cookieString, sessionsResp.url);
	}

	const cookiesResp = await fetch("https://account.proton.me/api/core/v4/auth/cookies", {
		method: "POST",
		compress: true,
		body: JSON.stringify({
			UID: sessionsContent.UID,
			ResponseType: "token",
			GrantType: "refresh_token",
			RefreshToken: sessionsContent.RefreshToken,
			RedirectURI: "https://protonmail.com",
			Persistent: 0,
			State: getRandomString(24),
		}),
		headers: {
			"accept": "application/vnd.protonmail.v1+json",
			"accept-encoding": "gzip, deflate, br",
			"accept-language": "en-US,en;q=0.9",
			"authorization": "Bearer " + sessionsContent.AccessToken,
			"content-type": "application/json",
			"cookie": cookieJar.getCookieStringSync("https://account.proton.me"),
			"origin": "https://account.proton.me",
			"referer": "https://account.proton.me/login",
			"sec-ch-ua": constants.USER_AGENT_CH,
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": "\"Windows\"",
			"sec-fetch-dest": "empty",
			"sec-fetch-mode": "cors",
			"sec-fetch-site": "same-origin",
			"sec-gpc": "1",
			"user-agent": constants.USER_AGENT,
			"x-pm-appversion": constants.APP_VERSION,
			"x-pm-locale": "en_US",
			"x-pm-uid": sessionsContent.UID,
		},
		agent: proxyAgent,
	});

	if(!cookiesResp.ok) {
		throw new Error(`sessionsResp (${cookiesResp.status}): ${await cookiesResp.text()}`);
	}

	/** @type {CookiesResponse} */
	const cookiesContent = await cookiesResp.json();
	console.log("cookiesContent:", cookiesContent);

	for(const cookieString of cookiesResp.headers.raw()["set-cookie"]) {
		cookieJar.setCookie(cookieString, cookiesResp.url);
	}

	return {
		sessionsContent,
		cookieJar,
	};
}

/**
 * @typedef SessionsResponse
 * @type {object}
 * @property {number} Code
 * @property {string} AccessToken
 * @property {string} RefreshToken
 * @property {string} TokenType
 * @property {string[]} Scopes
 * @property {string} UID
 * @property {number} LocalID
 */

/**
 * @typedef CookiesResponse
 * @type {object}
 * @property {number} Code
 * @property {string} UID
 * @property {number} LocalID
 */