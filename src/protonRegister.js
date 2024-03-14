import fetch from "node-fetch";
import * as constants from "./constants.js";
import API_ERRORS from "./errors.js";
import {initChallenges, solveCaptcha} from "./captcha/index.js";
import startSession from "./startSession.js";
import {getRandomSrpVerifier} from "./srp.js";
import {mergeOptionalCaptchaHeaders} from "./utils.js";


/**
 * @param {{username: string, password: string}} credentials
 * @param {Agent} [proxyAgent]
 * @param {string} [captchaToken]
 * @param {number} [maxAttempts]
 * @returns {Promise<boolean>}
 */
export default async function protonRegister(credentials, proxyAgent = undefined, captchaToken, maxAttempts = 5) {
	console.log("credentials:", credentials);
	const {sessionsContent, cookieJar} = await startSession(proxyAgent);

	// https://account.proton.me/api/core/v4/auth/modulus
	// {
	// 	Code: 1000,
	// 	Modulus: "-----BEGIN PGP SIGNED MESSAGE-----\nHash: SHA256\n\ni3R3vxdGFzII3wQ9AmpKKib3g6y/gqHtB2rzEep6akBVyS91kIW8zy57pxLqlKtUWxCxvbdfa4XfIC2FX9euldG1Am5jpQpOvEFN5fQeMv5/FiWf5J/i76Na68Y2tT6ZpSMuk/J0GgdhpvClB5Dctzwe46T8pkrtFcfnt/dylaVXVNUW0W627PWYWyqqj45Xo81xcIw+NrIYp7xwBRkrHBiZx4Jv0QGX4inBLA6spE1Bdds3Eh+ghXbnqUZQtqTg7xXApsvy7TKqhVvRBtd41g7e0PQdGuAlnWHa0Q+83gJaIPsTgDtxI6T8Wqzb4YMJXGTLJPAvg+c3E6e24tBomg==\n-----BEGIN PGP SIGNATURE-----\nVersion: ProtonMail\nComment: https://protonmail.com\n\nwl4EARYIABAFAlwB1jwJEDUFhcTpUY8mAAAAHQD/SQYkVKlp0tNDO+iwTccE\nlkbiIqkBKeQ/NYOJWnH6wg8A+weOxJ/YhNC82mZI6Jva5IeY48vOg1IWF7lz\nskZLjU4B\n=KepV\n-----END PGP SIGNATURE-----\n",
	// 	ModulusID: "q6fRrEIn0nyJBE_-YSIiVf80M2VZhOuUHW5In4heCyOdV_nGibV38tK76fPKm7lTHQLcDiZtEblk0t55wbuw4w==",
	// };
	const authModulusResp = await fetch("https://account.proton.me/api/core/v4/auth/modulus", {
		method: "GET",
		compress: true,
		headers: {
			"accept": "application/vnd.protonmail.v1+json",
			"accept-encoding": "gzip, deflate, br",
			"accept-language": "en-US,en;q=0.9",
			"cookie": cookieJar.getCookieStringSync("https://account.proton.me/api/core/v4/auth/modulus"),
			"referer": "https://account.proton.me/mail/signup",
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

	if(!authModulusResp.ok) {
		throw new Error(`Auth info error (${authModulusResp.status}): ${await authModulusResp.text()}`);
	}

	const authModulusContent = await authModulusResp.json();
	console.log("authModulusContent:", authModulusContent);

	const srp = await getRandomSrpVerifier(authModulusContent, credentials);
	console.log("srp:", srp);

	const {challengeId, encryptedFingerprint} = await initChallenges({
		frame: "signup",
		cookieJar,
	});

	const usersPayload = {
		Type: 1,
		Username: credentials.username,
		Payload: {
			[challengeId]: encryptedFingerprint,
			// "Mwp-u4YynOjeRyBJ": "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",
			// "UUYD4.a9ZIM1Ybxv": "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",
		},
		Domain: "proton.me",
		Auth: {
			ModulusID: authModulusContent.ModulusID,
			Version: srp.version,
			Salt: srp.salt,
			Verifier: srp.verifier,
		},
	};
	console.log("usersPayload:", usersPayload);

	await new Promise(resolve => setTimeout(resolve, 3 * 1000));

	const usersResp = await fetch("https://account.proton.me/api/core/v4/users", {
		method: "POST",
		compress: true,
		body: JSON.stringify(usersPayload),
		headers: mergeOptionalCaptchaHeaders({
			"accept": "application/vnd.protonmail.v1+json",
			"accept-encoding": "gzip, deflate, br",
			"accept-language": "en-US,en;q=0.9",
			"content-type": "application/json",
			"cookie": cookieJar.getCookieStringSync("https://account.proton.me/api/core/v4/users"),
			"origin": "https://account.proton.me",
			"referer": "https://account.proton.me/mail/signup",
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
			"x-pm-product": "mail",
			"x-pm-uid": sessionsContent.UID,
		}, captchaToken),
		agent: proxyAgent,
	});

	// if(!usersResp.ok) {
	// 	throw new Error(`Register error (${usersResp.status}): ${await usersResp.text()}`);
	// }

	/** @type {RegisterResponse} */
	const usersContent = await usersResp.json();
	console.log("usersContent:", usersContent);

	if(usersContent.Code === API_ERRORS.SINGLE_SUCCESS) {
		return true;
	}

	if(usersContent.Code === API_ERRORS.TOKEN_INVALID) {
		throw new Error("Failed captcha: " + JSON.stringify(usersContent.Error));
	}

	if(usersContent.Code !== API_ERRORS.HUMAN_VERIFICATION_REQUIRED) {
		throw new Error("No captcha error: " + JSON.stringify(usersContent));
	}

	if(usersContent.Code === API_ERRORS.HUMAN_VERIFICATION_REQUIRED && !usersContent.Details.HumanVerificationMethods.includes("captcha")) {
		throw new Error("No supported captcha options: " + usersContent.Details.HumanVerificationMethods.join(", "));
	}

	const humanVerificationToken = await solveCaptcha({
		challengeToken: usersContent.Details.HumanVerificationToken,
		frame: "signup",
		cookieJar: cookieJar,
	}, proxyAgent);
	console.log("humanVerificationToken:", humanVerificationToken);

	// Try again recursively until max attempts is exhausted
	if(maxAttempts > 0) {
		maxAttempts--;
		return protonRegister(credentials, proxyAgent, humanVerificationToken, maxAttempts);
	}

	throw new Error("Max attempted reached!");
}


/**
 * @typedef RegisterResponse
 * @type {object}
 * @property {number} Code
 * @property {string} [Error]
 * @property {HumanVerificationDetails} [Details]
 */