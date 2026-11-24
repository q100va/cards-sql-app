import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PassThrough } from 'node:stream';
import { readHiddenFields, readPassword } from '../../scripts/bootstrap-password.mjs';

function terminal(initialRaw = false) {
  const input = new PassThrough();
  input.pause();
  input.isRaw = initialRaw;
  input.setRawMode = (raw) => { input.isRaw = raw; };
  const output = new PassThrough();
  let transcript = '';
  output.on('data', (chunk) => { transcript += chunk; });

  return {
    input,
    output,
    checkRestored(expectedTranscript = /^Admin password \(hidden, 12-256 characters\): (?:\n(?:Repeat password \(hidden\): (?:\n)?)?)?$/) {
      assert.equal(input.isRaw, initialRaw);
      assert.equal(input.isPaused(), true);
      for (const event of ['data', 'end', 'error']) {
        assert.equal(input.listenerCount(event), 0);
      }
      assert.match(transcript, expectedTranscript);
    },
  };
}

test('reads four hidden fields and preserves a blank field for validation', async () => {
  const tty = terminal();
  const result = readHiddenFields(['Email: ', 'Phone: ', 'Telegram ID: ', 'Telegram phone: '],
    tty.input, tty.output);
  tty.input.write('first\r\n\r\nthirdx\x7f\r\nfourth\r\n');
  assert.deepEqual(await result, ['first', '', 'third', 'fourth']);
  tty.checkRestored(/^Email: \nPhone: \nTelegram ID: \nTelegram phone: \n$/);
});

const valid = 'a'.repeat(12);
for (const [label, chunks, expected] of [
  ['ordinary entry', [...valid, '\r', ...valid, '\r'], valid],
  ['batched CRLF', [valid + '\r', '\n' + valid + '\r\n'], valid],
  ['paste and backspace', ['\x1b[20', '0~' + valid + 'x\x7f\x1b[201~\n' + valid + 'x\b\n'], valid],
  ['split UTF-8 character', [Buffer.from([0xc3]), Buffer.from([0xa9]), valid + '\n\u00e9' + valid + '\n'], '\u00e9' + valid],
  ['maximum length', ['b'.repeat(256) + '\n' + 'b'.repeat(256) + '\n'], 'b'.repeat(256)],
  ['too short', ['a'.repeat(11) + '\n' + 'a'.repeat(11) + '\n'], /length requirements/],
  ['too long', ['b'.repeat(257) + '\n' + 'b'.repeat(257) + '\n'], /length requirements/],
  ['mismatch', [valid + '\n' + valid + 'b\n'], /Passwords differ/],
  ['cancel a pasted chunk', [valid + '\x03\n'], /Cancelled/],
]) {
  test(label, async () => {
    const tty = terminal(label === 'maximum length');
    const result = readPassword(tty.input, tty.output);
    const checked = typeof expected === 'string'
      ? result.then((actual) => assert.equal(actual === expected, true))
      : assert.rejects(result, expected);
    for (const chunk of chunks) tty.input.write(chunk);
    await checked;
    tty.checkRestored();
  });
}

for (const event of ['end', 'error']) {
  test(`restores terminal on ${event}`, async () => {
    const tty = terminal();
    const result = assert.rejects(readPassword(tty.input, tty.output), /ended|stream failure/);
    if (event === 'end') tty.input.end();
    else tty.input.emit('error', new Error('stream failure'));
    await result;
    tty.checkRestored();
  });
}
