import { StringDecoder } from 'node:string_decoder';

export class BootstrapError extends Error {}

export function readPassword(input = process.stdin, output = process.stdout) {
  return new Promise((resolve, reject) => {
    const previousRaw = input.isRaw ?? false;
    const wasPaused = input.isPaused();
    const decoder = new StringDecoder('utf8');
    const maxLength = 256;
    const values = [[], []];
    let field = 0;
    let skipLineFeed = false;
    let escape = '';

    function finish(error, password) {
      input.off('data', onData);
      input.off('error', onError);
      input.off('end', onEnd);
      try {
        input.setRawMode(previousRaw);
      } catch (restoreError) {
        error ??= restoreError;
      } finally {
        if (wasPaused) input.pause();
      }
      if (error) reject(error);
      else resolve(password);
    }

    function onError(error) {
      finish(error);
    }

    function onEnd() {
      finish(new BootstrapError('Password input ended before confirmation.'));
    }

    function onData(chunk) {
      const data = typeof chunk === 'string' ? chunk : decoder.write(chunk);
      if (data.includes('\x03')) {
        output.write('\n');
        finish(new BootstrapError('Cancelled.'));
        return;
      }

      for (const character of data) {
        const ignoreLineFeed = skipLineFeed && character === '\n';
        skipLineFeed = false;
        if (ignoreLineFeed) continue;

        // Ignore terminal key sequences, including bracketed paste markers.
        if (character === '\x1b') {
          escape = character;
          continue;
        }
        if (escape === '\x1b' && (character === '[' || character === 'O')) {
          escape = character;
          continue;
        }
        if (escape && escape !== '\x1b' && character >= ' ' && character <= '~') {
          if (character >= '@') escape = '';
          continue;
        }
        escape = '';

        const value = values[field];
        if (character === '\r' || character === '\n') {
          output.write('\n');
          if (field === 0) {
            field = 1;
            skipLineFeed = character === '\r';
            output.write('Repeat password (hidden): ');
            continue;
          }

          const password = values[0].join('');
          if (password.length < 12 || password.length > maxLength || password !== value.join('')) {
            finish(new BootstrapError('Passwords differ or do not meet length requirements.'));
          } else {
            finish(null, password);
          }
          return;
        }

        if (character === '\x7f' || character === '\b') {
          value.pop();
        } else if (!/\p{Cc}/u.test(character)) {
          value.push(character);
        }
      }
    }

    output.write('Admin password (hidden, 12-256 characters): ');
    input.setRawMode(true);
    input.on('data', onData);
    input.once('error', onError);
    input.once('end', onEnd);
    input.resume();
  });
}
