import fetch from "node-fetch";
import * as constants from "./constants.js";
import API_ERRORS from "./errors.js";
import {initChallenges, solveCaptcha} from "./captcha/index.js";
import startSession from "./startSession.js";
import {getSrp} from "./srp.js";
import {mergeOptionalCaptchaHeaders} from "./utils.js";


/**
 * @param {{username: string, password: string}} credentials
 * @param {Agent} [proxyAgent]
 * @param {string} [captchaToken]
 * @param {number} [maxAttempts]
 * @returns {User}
 */
export default async function protonLogin(credentials, proxyAgent = undefined, captchaToken, maxAttempts = 5) {
	console.log("credentials:", credentials);
	const {sessionsContent, cookieJar} = await startSession(proxyAgent);

	const {challengeId, encryptedFingerprint} = await initChallenges({
		frame: "login",
		cookieJar,
	});

	// const sessionsPayloadResp = await fetch("https://account.proton.me/api/auth/v4/sessions/payload", {
	// 	method: "POST",
	// 	compress: true,
	// 	body: JSON.stringify({
	// 		Payload: {
	// 			[challengeId]: encryptPayload(aesKey, {}),
	// 		},
	// 	}),
	// 	headers: {
	// 		"accept": "application/vnd.protonmail.v1+json",
	// 		"accept-encoding": "gzip, deflate, br",
	// 		"accept-language": "en-US,en;q=0.9",
	// 		"content-type": "application/json",
	// 		"cookie": cookieJar.getCookieStringSync("https://account.proton.me/api/auth/v4/sessions/payload"),
	// 		"origin": "https://account.proton.me",
	// 		"referer": "https://account.proton.me/login",
	// 		"sec-ch-ua": constants.USER_AGENT_CH,
	// 		"sec-ch-ua-mobile": "?0",
	// 		"sec-ch-ua-platform": "\"Windows\"",
	// 		"sec-fetch-dest": "empty",
	// 		"sec-fetch-mode": "cors",
	// 		"sec-fetch-site": "same-origin",
	// 		"sec-gpc": "1",
	// 		"user-agent": constants.USER_AGENT,
	// 		"x-pm-appversion": constants.APP_VERSION,
	// 		"x-pm-locale": "en_US",
	// 		"x-pm-uid": sessionsContent.UID,
	// 	},
	// 	agent: proxyAgent,
	// });
	// const sessionsPayloadContent = await sessionsPayloadResp.json();
	// console.log("sessionsPayloadContent:", sessionsPayloadContent);

	const infoResp = await fetch("https://account.proton.me/api/core/v4/auth/info", {
		method: "POST",
		compress: true,
		body: JSON.stringify({
			Username: credentials.username,
		}),
		headers: {
			"accept": "application/vnd.protonmail.v1+json",
			"accept-encoding": "gzip, deflate, br",
			"accept-language": "en-US,en;q=0.9",
			"content-type": "application/json",
			"cookie": cookieJar.getCookieStringSync("https://account.proton.me/api/core/v4/auth/info"),
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

	if(!infoResp.ok) {
		throw new Error(`Auth info error (${infoResp.status}): ${await infoResp.text()}`);
	}

	/** @type {InfoResponse} */
	const infoContent = await infoResp.json();
	console.log("infoContent:", infoContent);

	// ==================== //
	const {clientProof, clientEphemeral} = await getSrp(infoContent, credentials, infoContent.Version);
	const authData = {
		ClientProof: clientProof,
		ClientEphemeral: clientEphemeral,
		SRPSession: infoContent.SRPSession,
	};

	const authPayload = {
		...authData, ...{
			Username: credentials.username,
			Payload: {
				[challengeId]: encryptedFingerprint,
			},
			PersistentCookies: 1,
		},
	};
	console.log("AUTH PAYLOAD:", authPayload);
	// ==================== //

	const authResp = await fetch("https://account.proton.me/api/core/v4/auth", {
		method: "POST",
		compress: true,
		body: JSON.stringify(authPayload),
		headers: mergeOptionalCaptchaHeaders({
			"accept": "application/vnd.protonmail.v1+json",
			"accept-encoding": "gzip, deflate, br",
			"accept-language": "en-US,en;q=0.9",
			"content-type": "application/json",
			"cookie": cookieJar.getCookieStringSync("https://account.proton.me/api/core/v4/auth"),
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
		}, captchaToken),
		agent: proxyAgent,
	});

	// if(!authResp.ok) {
	// 	throw new Error(`Auth login error (${authResp.status}): ${await authResp.text()}`);
	// }

	/** @type {AuthResponse} */
	const authContent = await authResp.json();
	console.log("authContent:", authContent);

	// Set any potential refresh cookies
	for(const cookieString of authResp.headers.raw()["set-cookie"]) {
		cookieJar.setCookie(cookieString, authResp.url);
	}

	if(authContent.Code === API_ERRORS.SINGLE_SUCCESS) {
		const usersResp = await fetch("https://account.proton.me/api/core/v4/users", {
			method: "GET",
			compress: true,
			headers: {
				"accept": "application/vnd.protonmail.v1+json",
				"accept-encoding": "gzip, deflate, br",
				"accept-language": "en-US,en;q=0.9",
				"cookie": cookieJar.getCookieStringSync("https://account.proton.me/api/core/v4/users"),
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

		if(!usersResp.ok) {
			throw new Error(`User info error (${usersResp.status}): ${await usersResp.text()}`);
		}

		/** @type {UsersResponse} */
		const usersContent = await usersResp.json();
		console.log("usersContent:", usersContent.User);

		return usersContent.User;
		// throw new Error("Successful login: " + JSON.stringify(authContent));
	}

	if(authContent.Code === API_ERRORS.TOKEN_INVALID) {
		throw new Error("Failed captcha: " + JSON.stringify(authContent));
	}

	// if(authContent.Code !== API_ERRORS.HUMAN_VERIFICATION_REQUIRED) {
	// 	throw new Error("No captcha error: " + JSON.stringify(authContent));
	// }

	if(authContent.Code === API_ERRORS.PASSWORD_WRONG_ERROR) {
		throw new Error(authContent.Error);
	}

	if(authContent.Code === API_ERRORS.HUMAN_VERIFICATION_REQUIRED && !authContent.Details.HumanVerificationMethods.includes("captcha")) {
		throw new Error("No supported captcha options: " + authContent.Details.HumanVerificationMethods.join(", "));
	}

	const humanVerificationToken = await solveCaptcha({
		challengeToken: authContent.Details.HumanVerificationToken,
		frame: "login",
		cookieJar: cookieJar,
	}, proxyAgent);
	console.log("humanVerificationToken:", humanVerificationToken);

	// Try again recursively until max attempts is exhausted
	if(maxAttempts > 0) {
		maxAttempts--;
		return protonLogin(credentials, proxyAgent, humanVerificationToken, maxAttempts);
	}

	throw new Error("Max attempted reached!");
}


/**
 * @typedef InfoResponse
 * @type {object}
 * @property {number} Code
 * @property {string} Modulus
 * @property {string} ServerEphemeral
 * @property {number} Version
 * @property {string} Salt
 * @property {string} SRPSession
 * @property {string} [Username]
 */

/**
 * @typedef AuthResponse
 * @type {object}
 * @property {number} Code
 * @property {string} [Error]
 * @property {HumanVerificationDetails} [Details]
 */

/**
 * @typedef HumanVerificationDetails
 * @type {object}
 * @property {string} HumanVerificationToken
 * @property {("captcha"|"payment"|"sms"|"email"|"invite"|"coupon")[]} HumanVerificationMethods
 * @property {number} Direct
 * @property {string} Description
 * @property {string} Title
 */

/**
 * @typedef UsersResponse
 * @type {object}
 * @property {number} Code
 * @property {User} User
 */

/**
 * @typedef User
 * @type {object}
 * @property {string} ID
 * @property {string} Name
 * @property {string} Currency
 * @property {number} Credit
 * @property {number} Type
 * @property {number} CreateTime
 * @property {number} MaxSpace
 * @property {number} MaxUpload
 * @property {number} UsedSpace
 * @property {{Calendar: number, Contact: number, Drive: number, Mail: number, Pass: number}} ProductUsedSpace
 * @property {number} Subscribed
 * @property {number} Services
 * @property {number} MnemonicStatus
 * @property {number} Role
 * @property {number} Private
 * @property {number} Delinquent
 * @property {UserKey[]} Keys
 * @property {number} ToMigrate
 * @property {string} Email
 * @property {string} DisplayName
 * @property {string|null} AccountRecovery
 */

/**
 * @typedef UserKey
 * @type {object}
 * @property {string} ID
 * @property {number} Version
 * @property {number} Primary
 * @property {null} RecoverySecret
 * @property {null} RecoverySecretSignature
 * @property {string} PrivateKey
 * @property {string} Fingerprint
 * @property {number} Active
 */
