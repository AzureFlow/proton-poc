import vm from "vm";


/**
 * Smaller is faster but less reliable
 */
export const LOOKAHEAD_CHARACTERS = 1500;


/**
 * @see Credit {@link https://github.com/post04}
 * @param {string} content HTML content
 * @returns {Uint8Array} AES key
 */
export default function extractKey(content) {
    const startIndex = /\([0-9]+\)\.toString\(36\)\.toLowerCase\(\)/g.exec(content).index;
    const output = [];

    // To get start position, we want to follow these rules:
    // - Firstly, we need to check for `=`
    // - Then check the chars 1 and 2 behind and check if both of them are [A-z0-9]
    // - FirstCharIndex will be the '=' index + 1
    for(let i = startIndex; i > startIndex - LOOKAHEAD_CHARACTERS; i--) {
        if(content[i] === "=") {
            if(!/[A-z0-9]{2}/g.test(content[i - 2] + content[i - 1])) {
                output.push(content[i]);
                continue;
            }

            break;
        }

        output.push(content[i]);
    }
    output.reverse();

    // To get final index, we need to check a few things.
    // So we go from the startIndex and keep going until we hit one of two conditions:
    // - First condition is `;`, we need to validate that the next 2 characters are both [A-z0-9]
    // - Second condition is `,`, we need to validate that the next 2 characters are both [A-z0-9]
    // - We also need to validate that the i + 3 doesn't match [A-z0-9] or `)` or `,` or `{}`
    for(let i = startIndex + 1; i < startIndex + LOOKAHEAD_CHARACTERS; i++) {
        if(content[i] === ";" || content[i] === ",") {
            if(!/[A-z0-9]{2}/g.test(content[i + 1] + content[i + 2]) || /[A-z0-9),{}]/g.test(content[i + 3])) {
                output.push(content[i]);
                continue;
            }

            break;
        }

        output.push(content[i]);
    }

    const outputString = output.join("");
    const aesKeyString = vm.runInNewContext(outputString);

    // console.log("startIndex:", startIndex);
    // console.log("outputString:", outputString);
    // console.log("aesKeyString:", aesKeyString);

    const aesKey = new Uint8Array(aesKeyString.length);
    for(let i = 0; i < aesKeyString.length; ++i) {
        aesKey[i] = aesKeyString.charCodeAt(i);
    }

    return aesKey;
}

// Slow but more reliable
// pnpm install shift-codegen shift-parser shift-query
// import vm from "vm";
// import query from 'shift-query';
// import { codeGen } from "shift-codegen";
// import { parseScript } from 'shift-parser';
//
//
// /**
//  * @param {string} content HTML content
//  * @returns {Uint8Array} AES key
//  */
// export default function getKeyFromContent(content) {
//     const ast = parseScript(content);
//     const binding = query(ast, 'VariableDeclaration[kind="var"] > !VariableDeclarator > BinaryExpression CallExpression[callee.property="call"]');
//     const aesKeyString = vm.runInNewContext(`const ${codeGen(binding[1])}; ${binding[1].binding.name}`);
//
//     const aesKey = new Uint8Array(aesKeyString.length);
//     for(let i = 0; i < aesKeyString.length; ++i) {
//         aesKey[i] = aesKeyString.charCodeAt(i);
//     }
//
//     return aesKey;
// }