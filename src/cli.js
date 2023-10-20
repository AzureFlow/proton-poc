import {Command} from "commander";
import {readFile} from "fs/promises";
import chalk from "chalk";
import {fileURLToPath} from "url";
import {HttpsProxyAgent} from "https-proxy-agent";
import {SocksProxyAgent} from "socks-proxy-agent";
import protonLogin from "./protonLogin.js";
import protonRegister from "./protonRegister.js";
import {existsSync, readFileSync} from "fs";
import {randomItem} from "./utils.js";


const __dirname = fileURLToPath(new URL(".", import.meta.url));


// Create command line arguments
class RootCommand extends Command {
	createCommand(name) {
		return new Command(name)
			.option("--proxy <proxy string>", "Proxy in the format of \"http://user:pass@ip:port\" or a file in the same format. Supports HTTP(S) & SOCKS.");
	}
}

const program = new RootCommand()
	.name("pcaptcha")
	.description("Proton CAPTCHA PoC")
	.version(await getPackageVersion());

program.command("login")
	.description("Login to an existing Proton account. Accounts requiring OTP/FIDO aren't supported.")
	.argument("<username>", "Account username")
	.argument("<password>", "Account password")
	.action(async(username, password, options) => {
		const proxyAgent = getProxy(options);

		console.log(chalk.cyan(`Login ${username}:${password}...`) + "\n");
		try {
			const loginResult = await protonLogin({
				username: username,
				password: password,
			}, proxyAgent);
			console.log("\n" + chalk.greenBright(chalk.bold("loginResult")), loginResult);
		}
		catch(err) {
			console.error(err, chalk.red(err));
		}

		// TODO: Loading spinner
		// const spinner = ora({
		// 	spinner: "simpleDotsScrolling",
		// 	color: "cyan",
		// 	interval: 90,
		// });
		// spinner.start("Logging-in...");
		//
		// setTimeout(() => {
		// 	spinner.text = "Done!";
		// 	spinner.stopAndPersist();
		// }, 2000);
	});

program.command("register")
	.description("Register a new Proton account.")
	.argument("<username>", "Account username")
	.argument("<password>", "Account password")
	.action(async(username, password, options) => {
		const proxyAgent = getProxy(options);

		console.log(chalk.cyan(`Register ${username}:${password}`) + "\n");
		try {
			await protonRegister({
				username: username.toLowerCase(),
				password: password,
			}, proxyAgent);
		}
		catch(err) {
			console.error(err, chalk.red(err));
		}
	});

program.parse(process.argv);


async function getPackageVersion() {
	const packageJson = JSON.parse(await readFile(__dirname + "/../package.json", "utf8"));
	return packageJson.version;
}

/**
 * @param {object} options
 * @returns {Agent|undefined}
 */
function getProxy(options) {
	if(options.proxy) {
		if(existsSync(options.proxy)) {
			const file = readFileSync(options.proxy, "utf8").trim().replaceAll("\r\n", "\n").split("\n");
			options.proxy = randomItem(file);
		}

		let url;
		try {
			url = new URL(options.proxy);
		}
		catch(err) {
			throw new Error("Invalid proxy format!");
		}

		// For some reason `rejectUnauthorized` doesn't work so set this env variable.
		// Allow local mitm proxy for debugging
		// process.env["NODE_OPTIONS"] = (process.env["NODE_OPTIONS"] ? " " : "") + "--no-warnings";
		process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

		if(url.protocol === "http:" || url.protocol === "https:") {
			return new HttpsProxyAgent(options.proxy, {
				rejectUnauthorized: false,
			});
		}
		else if(url.protocol === "socks:" || url.protocol === "socks4:" || url.protocol === "socks5:") {
			return new SocksProxyAgent(options.proxy);
		}
		else {
			throw new Error("Invalid proxy type!");
		}
	}

	return undefined;
}