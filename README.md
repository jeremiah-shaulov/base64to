# base64to

This library provides replacement functions to `btoa()` and `atob()`, that work faster for large input strings in the current virtual machine version, that i used in the time of writing this document (v8 9.1.269.35, Deno 1.11.5, Chrome 91.0.4472.114).

Bonus features:

- Custom characters for `+`, `/` and `=`.
- Padding char (`=`) can be disabled in encoding, and it's optional in decoding (any non-ABC char at the end will be ignored by the base64 decoder).
- Convert `string|Uint8Array` -> `string|Uint8Array`.
- Convert into existing `Uint8Array` buffer.
- Convert `Uint8Array` inplace within the same memory block (for encoding there must be extra space at the end).
- Convert `Deno.Reader` -> `Deno.Reader`.

## The replacement functions for `btoa()` and `atob()`

`btoa` = `encode64`

`atob` = `decode64ToString`

```ts
encode64(data: string|Uint8Array, cPlus='+', cSlash='/', padding='='): string
decode64ToString(ascii: string|Uint8Array, cPlus='+', cSlash='/'): string
```

- `cPlus` is the custom char for code `62` (default '+').
- `cSlash` is the custom char for code `63` (default '/').
- `padding` is the custom char for padding (default '='). This can be empty string, to disable the padding.

Example:

```ts
import {encode64, decode64ToString} from './mod.ts';

console.log(btoa('Data string'));     // prints: RGF0YSBzdHJpbmc=
console.log(encode64('Data string')); // prints: RGF0YSBzdHJpbmc=

console.log(atob('RGF0YSBzdHJpbmc='));             // prints: Data string
console.log(decode64ToString('RGF0YSBzdHJpbmc=')); // prints: Data string

console.log(encode64('Data string', '-', '_', '#')); // prints: RGF0YSBzdHJpbmc#
console.log(decode64ToString('RGF0YSBzdHJpbmc#####!!')); // prints: Data string
```
`decode64ToString()` ignores non-ABC characters at the end (treats them as padding chars).

## Base64 encoding and decoding Uint8Array

```ts
encode64(data: string|Uint8Array, cPlus='+', cSlash='/', padding='='): string
decode64(ascii: string|Uint8Array, into?: Uint8Array, cPlus='+', cSlash='/'): Uint8Array

encode64ToBytes(data: string|Uint8Array, into?: Uint8Array, cPlus='+', cSlash='/', padding='='): Uint8Array
decode64ToString(ascii: string|Uint8Array, cPlus='+', cSlash='/'): string
```
The most common use is:

- `encode64()`: `Uint8Array` -> `string`
- `decode64()`: `string` -> back to `Uint8Array`

Basicly, these 4 functions allow to base64-encode and base64-decode `string|Uint8Array` <-> `string|Uint8Array` in all directions.

Functions that return `Uint8Array` by default create a new `Uint8Array` buffer for the result.
But they also can receive an existing buffer (through the argument called `into`), and if the provided object is big enough, it will be used for the result.
In this case these functions return the `into` object.
If `into` was not big enough for the result, a new object will be created and returned.

It's possible to pass the same object to both `data` (`ascii`) and `into`, or they can be subarrays of the same underlying buffer.
In this case the base64 encoding/decoding will occure inplace, overwriting the original data.

Because decoding process produces shorter result (each 4 input bytes are converted to 3 output bytes), for `decode64(ascii, into)` the `ascii` and the `into` can be the same object.

```ts
import {decode64} from './mod.ts';

let encoded = new TextEncoder().encode('RGF0YSBzdHJpbmc=');

// decode inplace
let decoded = decode64(encoded, encoded);

console.log(decoded.buffer == encoded.buffer); // prints: true
console.log(String.fromCharCode(...decoded));     // prints: Data string
```

For `encode64ToBytes(data, into)` you need to care, that the `into` object is at least `Math.ceil(data.length * 4/3) + 2` long (there can be up to 2 padding characters) for inplace encoding.

```ts
import {encode64ToBytes} from './mod.ts';

let data = new TextEncoder().encode('Data string');

let buffer = new Uint8Array(Math.ceil(data.length * 4 / 3) + 2);
buffer.set(data);

// now buffer[0 .. data.length] is the 'Data string' string, but there's enough extra space for encoding

// encode inplace
let encoded = encode64ToBytes(buffer.subarray(0, data.length), buffer);

console.log(encoded.buffer == buffer.buffer); // prints: true
console.log(String.fromCharCode(...encoded));     // prints: RGF0YSBzdHJpbmc=
```

## Base64 encoding and decoding Deno.Reader streams

```ts
encode64Reader(reader: Deno.Reader, cPlus='+', cSlash='/', padding='='): Deno.Reader
decode64Reader(reader: Deno.Reader, cPlus='+', cSlash='/'): Deno.Reader
```

The following example base64-encodes the `/etc/passwd` file, and prints to the `Deno.stdout`:

```ts
import {encode64Reader} from './mod.ts';

let fh = await Deno.open('/etc/passwd');
await Deno.copy(encode64Reader(fh), Deno.stdout);
fh.close();
```

The following example chains `/etc/passwd` -> `encode64Reader` -> `decode64Reader` -> `Deno.stdout`.

```ts
import {encode64Reader, decode64Reader} from './mod.ts';

let fh = await Deno.open('/etc/passwd');
await Deno.copy(decode64Reader(encode64Reader(fh)), Deno.stdout);
fh.close();
```

## Performance compared to `btoa()` and `atob()`

The benchmark code can be found in this file: `tests/performance.test.ts`.

In brief, the functions that this library provides are slower than the navive functions, when operating on 16-byte data samples.

```
btoa: 434,783 ops/sec
encode64(string): 178,571 ops/sec
encode64(Uint8Array): 192,308 ops/sec
encode64ToBytes(string): 1,000,000 ops/sec
encode64ToBytes(Uint8Array): 909,091 ops/sec

atob: 250,000 ops/sec
decode64ToString(string): 151,515 ops/sec
decode64ToString(Uint8Array): 200,000 ops/sec
decode64(string): 833,333 ops/sec
decode64(Uint8Array): 714,286 ops/sec
```

Another conclusion is that converting from/to Uint8Array can be faster than the native functions do.

For 100-byte samples:

```
btoa: 454,545 ops/sec
encode64(string): 250,000 ops/sec
encode64(Uint8Array): 172,414 ops/sec
encode64ToBytes(string): 1,250,000 ops/sec
encode64ToBytes(Uint8Array): 769,231 ops/sec

atob: 99,010 ops/sec
decode64ToString(string): 181,818 ops/sec
decode64ToString(Uint8Array): 75,188 ops/sec
decode64(string): 909,091 ops/sec
decode64(Uint8Array): 1,111,111 ops/sec
```

`encode64()` is still slower than `btoa()`, but `decode64ToString()` is faster than `atob()`.

For 1000-byte:

```
btoa: 78,125 ops/sec
encode64(string): 103,093 ops/sec
encode64(Uint8Array): 116,279 ops/sec
encode64ToBytes(string): 212,766 ops/sec
encode64ToBytes(Uint8Array): 357,143 ops/sec

atob: 15,873 ops/sec
decode64ToString(string): 36,630 ops/sec
decode64ToString(Uint8Array): 38,023 ops/sec
decode64(string): 208,333 ops/sec
decode64(Uint8Array): 344,828 ops/sec
```

For 10_000-byte:

```
btoa: 8,403 ops/sec
encode64(string): 21,186 ops/sec
encode64(Uint8Array): 28,249 ops/sec
encode64ToBytes(string): 28,169 ops/sec
encode64ToBytes(Uint8Array): 40,000 ops/sec

atob: 1,618 ops/sec
decode64ToString(string): 4,257 ops/sec
decode64ToString(Uint8Array): 4,502 ops/sec
decode64(string): 22,676 ops/sec
decode64(Uint8Array): 37,453 ops/sec
```
