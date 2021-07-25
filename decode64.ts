import {get_cached_abc} from './abc.ts';

const is_big_endian = new Uint8Array(new Uint16Array([1]).buffer)[0] == 0;
const decoder_16 = new TextDecoder(is_big_endian ? 'utf-16be' : 'utf-16');

function do_decode_64(ascii: string|Uint8Array, len: number, result: Uint8Array|Uint16Array, abc: Uint8Array)
{	let i = 0;
	let i_end = len - 4;
	let j = 0;

	// Run by 4-byte parts
	if (typeof(ascii) == 'string')
	{	while (i <= i_end)
		{	let c3 = abc[ascii.charCodeAt(i++)];
			let c2 = abc[ascii.charCodeAt(i++)];
			let c1 = abc[ascii.charCodeAt(i++)];
			let c0 = abc[ascii.charCodeAt(i++)];

			let b0 = c0 | ((c1 & 0x3) << 6); // 6 bits from c0 | 2 bits from c1
			let b1 = (c1 >> 2) | ((c2 << 4) & 0xFF); // 4 bits from c1 | 4 bits from c2
			let b2 = (c2 >> 4) | (c3 << 2); // 2 bits from c2 | 6 bits from c3

			result[j++] = b2;
			result[j++] = b1;
			result[j++] = b0;
		}
	}
	else
	{	while (i <= i_end)
		{	let c3 = abc[ascii[i++]];
			let c2 = abc[ascii[i++]];
			let c1 = abc[ascii[i++]];
			let c0 = abc[ascii[i++]];

			let b0 = c0 | ((c1 & 0x3) << 6); // 6 bits from c0 | 2 bits from c1
			let b1 = (c1 >> 2) | ((c2 << 4) & 0xFF); // 4 bits from c1 | 4 bits from c2
			let b2 = (c2 >> 4) | (c3 << 2); // 2 bits from c2 | 6 bits from c3

			result[j++] = b2;
			result[j++] = b1;
			result[j++] = b0;
		}
	}

	i_end = len;
	if (i+2 == i_end)
	{	let c1 = abc[typeof(ascii)=='string' ? ascii.charCodeAt(i++) : ascii[i++]];
		let c0 = abc[typeof(ascii)=='string' ? ascii.charCodeAt(i++) : ascii[i++]];

		let b1 = (c1 << 2) | (c0 >> 4); // 6 bits from c1 | 2 bits from c0
		// remaining 4 bits from c0 are not needed

		result[j++] = b1;
	}
	else if (i+3 == i_end)
	{	let c2 = abc[typeof(ascii)=='string' ? ascii.charCodeAt(i++) : ascii[i++]];
		let c1 = abc[typeof(ascii)=='string' ? ascii.charCodeAt(i++) : ascii[i++]];
		let c0 = abc[typeof(ascii)=='string' ? ascii.charCodeAt(i++) : ascii[i++]];

		let b2 = (c2 << 2) | (c1 >> 4); // 6 bits from c2 | 2 bits from c1
		let b1 = ((c1 & 0xF) << 4) | (c0 >> 2); // 4 bits from c1 | 4 bits from c0
		// remaining 2 bits from c0 are not needed

		result[j++] = b2;
		result[j++] = b1;
	}

	return j;
}

export function decode64(ascii: string|Uint8Array, into?: Uint8Array, c_plus='+', c_slash='/'): Uint8Array
{	const abc = get_cached_abc(c_plus, c_slash);
	let len = ascii.length;

	// Cut padding chars
	if (typeof(ascii) == 'string')
	{	while (len > 0 && abc[ascii.charCodeAt(len-1)] == 0xFF)
		{	len--;
		}
	}
	else
	{	while (len > 0 && abc[ascii[len-1]] == 0xFF)
		{	len--;
		}
	}

	let result_len = (len >> 2) * 3;
	let n_padding = len & 0x3;
	if (n_padding == 2)
	{	result_len++;
	}
	else if (n_padding == 3)
	{	result_len += 2;
	}

	let result = into && into.length>=result_len ? into : new Uint8Array(result_len);
	do_decode_64(ascii, len, result, abc) as any;
	return result.subarray(0, result_len);
}

export function decode64ToString(ascii: string|Uint8Array, c_plus='+', c_slash='/')
{	const abc = get_cached_abc(c_plus, c_slash);

	let len = ascii.length;

	// Cut padding chars
	if (typeof(ascii) == 'string')
	{	while (len > 0 && abc[ascii.charCodeAt(len-1)] == 0xFF)
		{	len--;
		}
	}
	else
	{	while (len > 0 && abc[ascii[len-1]] == 0xFF)
		{	len--;
		}
	}

	let result_len = (len >> 2) * 3;
	let n_padding = len & 0x3;
	if (n_padding == 2)
	{	result_len++;
	}
	else if (n_padding == 3)
	{	result_len += 2;
	}

	let result = new Uint16Array(result_len);
	do_decode_64(ascii, len, result, abc);
	return decoder_16.decode(result);
}

export function decode64Reader(reader: Deno.Reader, c_plus='+', c_slash='/'): Deno.Reader
{	const abc = get_cached_abc(c_plus, c_slash);
	const tail = new Uint8Array(3);
	let tail_len = 0; // -1 means done reading from underlying reader

	async function read(buffer: Uint8Array)
	{	if (tail_len)
		{	if (tail_len == -1)
			{	return null;
			}
			buffer.set(tail.subarray(0, tail_len));
		}
		while (true)
		{	let n_read = await reader.read(buffer.subarray(tail_len));
			if (n_read == null)
			{	break;
			}
			n_read += tail_len;
			if (abc[buffer[n_read-1]] == 0xFF) // if is padding char
			{	while (n_read > 0 && abc[buffer[n_read-1]] == 0xFF)
				{	n_read--;
				}
				tail_len = -1;
				return do_decode_64(buffer, n_read, buffer, abc) || null; // null will not be returned with valid base64 encoding, because padding must be added only if there's an incomplete 4-byte series, and i already have read all the complete series
			}
			let n_full = n_read & ~0x3;
			if (n_full != 0)
			{	let result_len = do_decode_64(buffer, n_full, buffer, abc);
				tail_len = n_read - n_full;
				if (tail_len)
				{	tail.set(buffer.subarray(n_full, n_read));
				}
				return result_len;
			}
			tail_len = n_read;
		}
		let prev_tail_len = tail_len;
		tail_len = -1;
		if (prev_tail_len)
		{	return do_decode_64(buffer, prev_tail_len, buffer, abc);
		}
		return null;
	}

	return {read};
}
