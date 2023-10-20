# Proton CAPTCHA (PoC)

This is a proof of concept project to automatically solve [Proton's new CAPTCHA](https://proton.me/blog/proton-CAPTCHA) via requests. This project takes advantage of many basic and fundamental flaws with their new CAPTCHA.

Proton is constantly updating 

## Installation

```sh
git clone https://github.com/AzureFlow/proton-poc.git
pnpm install

cd python
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
# install GnuPG and add it to path:
# https://gnupg.org/ftp/gcrypt/binary/gnupg-w32cli-1.4.23.exe

pnpm run start -- login username password

# optional: use Tor as a proxy
# docker run --rm --name torproxy -it -p 127.0.0.1:8118:8118 -p 127.0.0.1:9050:9050 -d dperson/torproxy
# Use --proxy socks5://127.0.0.1:9050
```

## How it Works

TL;DR: It searches the 1D CAPTCHA image for the `#7f8c8d` color and generates other challenges including:

- [x] Solves image CAPTCHA
- [x] [Proof of work](https://en.wikipedia.org/wiki/Proof_of_work)
- [x] Fingerprint collection
- [x] (_kinda_) User event collection
- [x] Dynamic challenge extraction

## Future Ideas

- The AES key can likely be reused, so it doesn't have to be dynamically extracted each time.
- There's many existing projects on GitHub for solving 2D puzzles. Look into those.

## Suggestions for Improvement

This is not a comprehensive list but a few things that would help.

- Immediately remove the keylogger (`copy`, `blur`, `keydown`, `focus`) contained inside the device fingerprint. Instead, only try the timestamps at which keys were pressed, like other commercial anti-bots. In my opinion, this defeats their use of [SRP](https://en.wikipedia.org/wiki/Secure_Remote_Password_protocol). If Proton plans make this [publicly available](https://twitter.com/ProtonPrivacy/status/1705242869110640845) it likely won't pass an audit. This will also taint the machine learning Proton claims to perform.
- Show a CAPTCHA challenge even if the credentials provided are correct. Currently, you can just ignore the CAPTCHA and try again.
- [Remove API support](https://github.com/ProtonMail/proton-python-client) (😭) since it defeats the point of preventing bots. Mainly since you likely won't get a challenge due to the previous point.
- Detect inconsistent and out of order headers.
- Detect more fingerprint inconsistencies (e.g. `timezoneOffset` not matching `timezone` and match with the geolocation of the IP address, invalid , etc)
  - Allow [FingerprintJS](https://dev.fingerprint.com/docs) to collect more unique info like canvas / WebGL and [correlate](https://research.google/pubs/pub45581/) it to `webglVendorAndRenderer`.
  - Actually validate the `visitorId` fingerprint hash equals the computed components.
- [TLS Fingerprinting](https://engineering.salesforce.com/tls-fingerprinting-with-ja3-and-ja3s-247362855967/). This can be used to block non-browser clients such as cURL.
- ~~IP addresses and their reputation should be scrutinized more, especially ones used in recent [botnet attacks](https://iplists.firehol.org/). However, this is unlikely since ProtonMail natively supports [Tor](https://www.torproject.org/).~~ Update: I can't seem to find any proxies (including residential) that allow a CAPTCHA challenge.
- Completely remove the "1D Puzzle." The flaws are too numerous to count. Even if the whole purpose is to distract the user while collecting mouse events.
- Use a commercial obfuscator like [Jscrambler](https://jscrambler.com/) instead of [Obfuscator.io](https://obfuscator.io/) (see: [deobfuscator](https://webcrack.netlify.app/)). Or a [custom Virtual Machine](https://craftinginterpreters.com/contents.html).
- Detect headless browsers like it's used [here](https://github.com/justinkalland/protonmail-api/blob/9d28a785faeb96d72d70434b311615e4277c2888/lib/proton-mail.js#L50) (e.g. if the viewport is smaller because "Chrome is being controlled by automated test software.", missing APIs, etc).
- Use the collected timing data to perform [timing attacks](https://www.usenix.org/system/files/conference/woot14/woot14-ho.pdf) (e.g. if client pretends to be netbook but has the power of a server farm).
- Don't do detections on the client (e.g. `webdriver`). Instead, send the raw collected data to the server and let it determine if the client should be trusted.
- Prevent replaying fingerprints or events by requiring a [cryptographic nonce](https://en.wikipedia.org/wiki/Cryptographic_nonce).
- [See more](https://dev-pages.bravesoftware.com/fingerprinting/farbling.html).
