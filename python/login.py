import base64
import json
import sys

import gnupg
from proton.constants import SRP_MODULUS_KEY
from proton.srp import User

info_response = json.loads(sys.argv[1])
username = info_response["Username"]
password = info_response["Password"]

__gnupg = gnupg.GPG()
__gnupg.import_keys(SRP_MODULUS_KEY)
verified = __gnupg.decrypt(info_response["Modulus"])

modulus = base64.b64decode(verified.data.strip())
server_challenge = base64.b64decode(info_response["ServerEphemeral"])
salt = base64.b64decode(info_response["Salt"])
version = info_response["Version"]

usr = User(password, modulus)

client_challenge = usr.get_challenge()
client_proof = usr.process_challenge(salt, server_challenge, version)

if client_proof is None:
    raise ValueError("Invalid challenge")

payload = {
    "Username": username,
    "clientEphemeral": base64.b64encode(client_challenge).decode(
        "utf8"
    ),
    "clientProof": base64.b64encode(client_proof).decode("utf8"),
    "sharedSession": info_response["SRPSession"],
}

sys.stdout.write(json.dumps(payload))
