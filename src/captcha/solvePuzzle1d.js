import {PNG} from "pngjs";
import ndarray from "ndarray";
import {readFile} from "fs/promises";


const GAP_PIXELS = Math.floor(15 / 2);


/**
 * @param {string | Buffer} input
 * @returns {Promise<{x: number, y: number}>} (X, Y) coordinates of 1D puzzle
 */
export default async function solvePuzzle1d(input) {
	let imgBgContent;
	if(Buffer.isBuffer(input)) {
		imgBgContent = input;
	}
	else {
		imgBgContent = await readFile(input);
	}

	return new Promise((resolve, reject) => {
		const png = new PNG();
		png.parse(imgBgContent, (err, imgData) => {
			if(err) {
				reject(err);
				return;
			}

			const pixels = ndarray(new Uint8Array(imgData.data),
				[imgData.width | 0, imgData.height | 0, 4],
				[4, 4 * imgData.width | 0, 1],
				0,
			);

			// noinspection JSUnusedLocalSymbols
			const [sizeX, sizeY, colorDepth] = pixels.shape;

			// Only search a 4th of the image because the particle accelerator is always on the left
			// for(let x = 0; x < Math.floor(sizeX / 4); x++) {

			// Only search a thin 1pixel slice
			const x = 64;
			for(let y = 0; y < sizeY; y++) {
				const r = pixels.get(x, y, 0);
				const g = pixels.get(x, y, 1);
				const b = pixels.get(x, y, 2);
				const a = pixels.get(x, y, 3);

				// #7f8c8d
				if(r === 127 && g === 140 && b === 141 && a === 255) {
					resolve({
						x: x,
						// Put it in the middle between the lines
						y: y + GAP_PIXELS,
					});
				}
			}

			reject("Pixels not found");
		});
	});
}
