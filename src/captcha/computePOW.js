"use strict";
import crypto from "crypto";
import {isMainThread, parentPort, Worker, workerData} from "worker_threads";
import {fileURLToPath} from "url";


// From: /captcha/v1/api/init
if(!isMainThread) {
	/** @type {PowInput} */
	const input = workerData;

	const n = Math.ceil(input.nLeadingZerosRequired / 4);
	for(let i = 0; true; i++) {
		const hash = crypto.createHash("sha256").update(i + input.challengeText).digest("hex");
		const result = parseInt("0x" + hash.substring(0, n), 16);

		if(result < Math.pow(2, n * 4 - input.nLeadingZerosRequired)) {
			parentPort.postMessage({
				result: i,
				index: input.index,
			});
			break;
		}
	}
}


/**
 * @param {string[]} challenges
 * @param {number} nLeadingZerosRequired
 * @returns {Promise<number[]>}
 */
export default async function computePOW(challenges, nLeadingZerosRequired) {
	const __filename = fileURLToPath(import.meta.url);

	return new Promise((resolve, reject) => {
		/** @type {Map<number, number>} */
		// const results = new Map();

		/** @type {Object<number, number>} */
		const results = {};

		let i = 0;
		for(const challengeText of challenges) {
			/**
			 * @type {PowInput}
			 */
			const input = {
				challengeText: challengeText,
				nLeadingZerosRequired: nLeadingZerosRequired,
				index: i,
			};

			// Create a new worker thread for each challenge
			const worker = new Worker(__filename, {
				workerData: input,
			});

			worker.on("message",
				/**
				 * @param {{result: number, index: number}} ret
				 */
				(ret) => {
					// Results come in unordered so put it in an ordered map
					results[ret.index] = ret.result;

					// All values have been computed
					if(Object.keys(results).length === challenges.length) {
						resolve(Object.values(results));
					}
				},
			);

			worker.on("error", err => {
				reject(err);
			});

			i++;
		}
	});
}

// Synchronous
// export default async function calculatePOW(challenges, nLeadingZerosRequired) {
//     return new Promise((resolve) => {
//         const results = [];
//
//         const n = Math.ceil(nLeadingZerosRequired / 4);
//         for(const challengeText of challenges) {
//             for(let i = 0; true; i++) {
//                 const hash = crypto.createHash("sha256").update(i + challengeText).digest("hex");
//                 const result = parseInt("0x" + hash.substring(0, n), 16);
//
//                 if(result < Math.pow(2, n * 4 - nLeadingZerosRequired)) {
//                     results.push(i);
//                     break;
//                 }
//             }
//         }
//
//         resolve(results);
//     });
// }


/**
 * @typedef PowInput
 * @type {object}
 * @property {string} challengeText
 * @property {number} nLeadingZerosRequired
 * @property {number} index
 */