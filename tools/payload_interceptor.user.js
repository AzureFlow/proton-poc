// ==UserScript==
// @name         Proton Payload Interceptor
// @version      1.0
// @description  Intercept Proton fingerprint JSON
// @author       AzureFlow
// @match        https://account-api.proton.me/challenge/*
// @icon         https://account.proton.me/assets/favicon.ico
// @grant        unsafeWindow
// @sandbox      JavaScript
// @run-at       document-body
// ==/UserScript==

(function() {
	"use strict";

	replaceWithProxy(JSON, "stringify", {
		apply: function(target, thisArg, argumentsList) {
			const trace = new Error();
			const result = Reflect.apply(target, thisArg, argumentsList);
			const text = result ?? "";
			if(text.includes("visitorId") && text.includes("frame") && text.includes("\"v\"")) {
				console.group("%c🤖 PAYLOAD INTERCEPTOR", "background: #222; padding: 12px; color: #6351e1; font-weight: bold; font-size: 24px");
				console.log(JSON.parse(text));
				console.log(trace.stack.replace("Error\n    ", "Payload At:\n    "));
				console.groupEnd();
			}

			return result;
		},
	});

	// Credit:
	// https://github.com/berstend/puppeteer-extra/blob/39248f1f5deeb21b1e7eb6ae07b8ef73f1231ab9/packages/puppeteer-extra-plugin-stealth/evasions/_utils/index.js#L318
	function replaceWithProxy(obj, propName, handler) {
		const proxyObj = new Proxy(obj[propName], handler);

		replaceProperty(obj, propName, {value: proxyObj});
	}

	function replaceProperty(obj, propName, descriptorOverrides = {}) {
		return Object.defineProperty(obj, propName, {
			// Copy over the existing descriptors (writable, enumerable, configurable, etc)
			...(Object.getOwnPropertyDescriptor(obj, propName) || {}),
			// Add our overrides (e.g. value, get())
			...descriptorOverrides,
		});
	}
})();