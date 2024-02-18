"use strict";
import crypto from "crypto";


/**
 * @template T
 * @param {T[]} items
 * @returns {T}
 */
export function randomItem(items) {
	return items[Math.floor(Math.random() * items.length)];
}

/**
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomFloat(min, max) {
	return Math.random() * (max - min + 1) + min;
}

const DEFAULT_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * @see https://github.com/ProtonMail/WebClients/blob/3926f03f2575751df2bce97ec295a545480f1c94/packages/utils/getRandomString.ts
 * @param {number} length
 * @returns {string}
 */
export function getRandomString(length) {
	const values = crypto.getRandomValues(new Uint32Array(length));

	let result = "";
	for(let i = 0; i < length; i++) {
		result += DEFAULT_CHARSET[values[i] % DEFAULT_CHARSET.length];
	}

	return result;
}

/**
 * @param {object} param
 * @param {string} [captchaToken]
 * @param {"captcha"|"email"} captchaTokenType
 * @returns {object}
 */
export function mergeOptionalCaptchaHeaders(param, captchaToken = undefined, captchaTokenType = "captcha") {
	if(captchaToken && captchaToken !== "") {
		return {
			...param, ...{
				"x-pm-human-verification-token": captchaToken,
				"x-pm-human-verification-token-type": captchaTokenType,
			},
		};
	}

	return param;
}