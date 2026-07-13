const GROUPS = ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz", "0123456789", "!@#$%^&*"];
const PASSWORD_CHARS = GROUPS.join("");

function randomIndex(max: number) {
  const range = 0x1_0000_0000;
  const limit = range - (range % max);
  const value = new Uint32Array(1);
  do globalThis.crypto.getRandomValues(value); while (value[0] >= limit);
  return value[0] % max;
}

export function generateSecurePassword(length = 16) {
  if (!globalThis.crypto?.getRandomValues) throw new Error("Gerador criptográfico indisponível");
  if (length < GROUPS.length) throw new Error("Senha curta demais");
  const password = GROUPS.map((group) => group[randomIndex(group.length)]);
  while (password.length < length) password.push(PASSWORD_CHARS[randomIndex(PASSWORD_CHARS.length)]);
  for (let index = password.length - 1; index > 0; index--) {
    const swapWith = randomIndex(index + 1);
    [password[index], password[swapWith]] = [password[swapWith], password[index]];
  }
  return password.join("");
}
