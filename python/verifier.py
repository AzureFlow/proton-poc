import base64
import json
import sys

import gnupg
from proton.constants import SRP_MODULUS_KEY
from proton.srp import User

response = json.loads(sys.argv[1])

__gnupg = gnupg.GPG()
__gnupg.import_keys(SRP_MODULUS_KEY)
verified = __gnupg.decrypt(response["Modulus"])
modulus = base64.b64decode(verified.data.strip())

usr = User(response["Password"], modulus)
generated_salt, generated_v = usr.compute_v()

sys.stdout.write(json.dumps({
    "salt": base64.b64encode(generated_salt).decode("utf8"),
    "verifier": base64.b64encode(generated_v).decode("utf8"),
}))
