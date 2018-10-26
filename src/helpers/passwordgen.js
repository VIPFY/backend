/* wordlist generated from en_US dictionary from http://wordlist.aspell.net/other-dicts/
 using
 cat en_US.dic | sed -r 's/^(.*?)\//\1/' |  grep -P "^[a-z]{3,}$" | tr '[: upper:]' '[: lower:]' | sort | uniq > wordlist5a.txt
 for word in $(cat wordlist5a.txt); do echo "\"$word\"," >> wordlist5.json; done
*/
// wordlist is licenced BSD/MIT-Like
const randomNumber = require("random-number-csprng");

let wordlist = null;

function capitalizeFirstLetter(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function randomWord() {
  // lazy loading to improve loadtime
  if (wordlist === null) {
    wordlist = require("./wordlist5a.json");
  }
  return wordlist[await randomNumber(0, wordlist.length - 1)];
}

export async function randomPassword(words = 3, digits = 0) {
  let r = "";
  for (let i = 0; i < words; i++) {
    r += capitalizeFirstLetter(await randomWord());
  }
  for (let i = 0; i < digits; i++) {
    r += await randomNumber(0, 9);
  }
  return r;
}
