import {spawn} from "child_process";
import {fileURLToPath} from "url";
import * as path from "path";

// I spent too much time trying to copy Proton's SRP protocol, and it refused to working.
// Instead, I just open a child process with a Python script that does it.
// https://github.com/ProtonMail/WebClients/blob/fe9879dd7663e92260ad9561bf850e8014fc22c9/packages/srp/lib/srp.ts#L169

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const PYTHON_CWD = path.resolve(__dirname + "/../python");
const PYTHON_BINARY = PYTHON_CWD + "/venv/Scripts/python.exe";
const PYTHON_LOGIN_SCRIPT = "login.py";
const PYTHON_VERIFIER_SCRIPT = "verifier.py";


export const getSrp = async({
								Version
								, Modulus: serverModulus,
								ServerEphemeral,
								Username,
								Salt,
								SRPSession,
							}, {username, password}, authVersion = Version) => {
	/** @type {string} */
	const srpInfo = await new Promise((resolve, reject) => {
		let result = "";

		const cmd = spawn(PYTHON_BINARY, [
			PYTHON_LOGIN_SCRIPT,
			JSON.stringify({
				Code: 1000,
				Modulus: serverModulus,
				ServerEphemeral: ServerEphemeral,
				Version: authVersion,
				Salt: Salt,
				SRPSession: SRPSession,
				Username: username,
				Password: password,
			}),
		], {
			cwd: PYTHON_CWD,
		});

		cmd.stdout.on("data", (data) => {
			result += data;
		});

		cmd.stderr.on("data", (data) => {
			console.error("srp error:", data.toString());
		});

		cmd.on("close", (code) => {
			if(code !== 0) {
				reject();
			}

			resolve(result);
		});
	});

	const {clientEphemeral, clientProof, expectedServerProof, sharedSession} = JSON.parse(srpInfo);

	return {
		clientEphemeral: clientEphemeral,
		clientProof: clientProof,
		expectedServerProof: expectedServerProof,
		sharedSession,
	};
};

export const getRandomSrpVerifier = async({Modulus: serverModulus}, {username, password}, version = 4) => {
	/** @type {string} */
	const srpInfo = await new Promise((resolve, reject) => {
		let result = "";

		const cmd = spawn(PYTHON_BINARY, [
			PYTHON_VERIFIER_SCRIPT,
			JSON.stringify({
				Modulus: serverModulus,
				Password: password,
			}),
		], {
			cwd: PYTHON_CWD,
		});

		cmd.stdout.on("data", (data) => {
			result += data;
		});

		cmd.stderr.on("data", (data) => {
			console.error("srp error:", data.toString());
		});

		cmd.on("close", (code) => {
			if(code !== 0) {
				reject("Exit code: " + code);
			}

			resolve(result);
		});
	});
	console.log("srpInfo:", srpInfo);

	const verifier = JSON.parse(srpInfo);

	return {
		version,
		salt: verifier.salt,
		verifier: verifier.verifier,
	};
};
