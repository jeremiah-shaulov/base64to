import {get_cached_abc} from './abc.ts';

const decoder = new TextDecoder('latin1');

function do_encode_64_to_bytes(data: string|Uint8Array, into: Uint8Array|undefined, abc: Uint8Array, c_padding: number, n_padding_3: number, result_len: number)
{	let len = data.length;
	let result;
	let j;

	// 1. Deal with last 1 or 2 bytes
	if (n_padding_3 == 1)
	{	result_len += c_padding>=256 ? 2 : 4; // >=256 means no padding char
		result = into && into.length>=result_len ? into : new Uint8Array(result_len);
		j = result_len;

		let b0 = typeof(data)!='string' ? data[--len] : data.charCodeAt(--len);

		let c1 = b0 >> 2; // 6 bits of b0
		let c0 = (b0 << 4) & 0x3F;

		if (c_padding >= 256)
		{	result[--j] = abc[c0];
			result[--j] = abc[c1];
		}
		else
		{	result[--j] = c_padding;
			result[--j] = c_padding;
			result[--j] = abc[c0];
			result[--j] = abc[c1];
		}
	}
	else if (n_padding_3 == 2)
	{	result_len += c_padding>=256 ? 3 : 4; // >=256 means no padding char
		result = into && into.length>=result_len ? into : new Uint8Array(result_len);
		j = result_len;

		let b0 = typeof(data)!='string' ? data[--len] : data.charCodeAt(--len);
		let b1 = typeof(data)!='string' ? data[--len] : data.charCodeAt(--len);

		let c2 = b1 >> 2; // 6 bits of b1
		let c1 = ((b1 << 4) & 0x3F) | (b0 >> 4); // 2 bits of b1 | 4 bits of b0
		let c0 = (b0 << 2) & 0x3F;

		if (c_padding >= 256)
		{	result[--j] = abc[c0];
			result[--j] = abc[c1];
			result[--j] = abc[c2];
		}
		else
		{	result[--j] = c_padding;
			result[--j] = abc[c0];
			result[--j] = abc[c1];
			result[--j] = abc[c2];
		}
	}
	else
	{	result = into && into.length>=result_len ? into : new Uint8Array(result_len);
		j = result_len;
	}

	// assume: len%3 == 0

	// 2. Deal with last 1..=9 bytes
	if (typeof(data) == 'string')
	{	while (len > 0)
		{	let b0 = data.charCodeAt(--len);
			let b1 = data.charCodeAt(--len);
			let b2 = data.charCodeAt(--len);

			let c3 = b2 >> 2; // 6 bits of b2
			let c2 = ((b2 << 4) & 0x3F) | (b1 >> 4); // 2 bits of b2 | 4 bits of b1
			let c1 = (b1 << 2) & 0x3F | (b0 >> 6); // 4 bits of b1 | 2 bits of b0
			let c0 = b0 & 0x3F; // 6 bits of b0

			result[--j] = abc[c0];
			result[--j] = abc[c1];
			result[--j] = abc[c2];
			result[--j] = abc[c3];
		}
	}
	else
	{	// 2. Deal with last 1..=9 bytes
		let to = len - len%12;
		while (len > to)
		{	let b0 = data[--len];
			let b1 = data[--len];
			let b2 = data[--len];

			let c3 = b2 >> 2; // 6 bits of b2
			let c2 = ((b2 << 4) & 0x3F) | (b1 >> 4); // 2 bits of b2 | 4 bits of b1
			let c1 = (b1 << 2) & 0x3F | (b0 >> 6); // 4 bits of b1 | 2 bits of b0
			let c0 = b0 & 0x3F; // 6 bits of b0

			result[--j] = abc[c0];
			result[--j] = abc[c1];
			result[--j] = abc[c2];
			result[--j] = abc[c3];
		}

		let v = new DataView(data.buffer, data.byteOffset);

		// 3. Run by 12-byte parts
		while (len > 0)
		{	len -= 4;
			let q0 = v.getUint32(len);
			len -= 4;
			let q1 = v.getUint32(len);
			len -= 4;
			let q2 = v.getUint32(len);

			// q2 has 30 bits of c0..=c4, and 2 bits of c5
			// q1 has 4 bits of c5, and 24 bits of c6..=c9, and 4 bits of c10
			// q0 has 2 bits of c10, and 30 bits of c11..=c15

			let c5 = (q2 & 0x3) << 4; // 2 bits from q2, will add 4 bits from q1 later
			q2 >>= 2; // 30 bits remaining
			let c4 = q2 & 0x3F;
			q2 >>= 6; // 24 bits remaining
			let c3 = q2 & 0x3F;
			q2 >>= 6; // 18 bits remaining
			let c2 = q2 & 0x3F;
			q2 >>= 6; // 12 bits remaining
			let c1 = q2 & 0x3F;
			q2 >>= 6; // 6 bits remaining
			let c0 = q2 & 0x3F;

			let c10 = (q1 & 0xF) << 2; // 4 bits from q1, will add 2 bits from q0 later
			q1 >>= 4; // 28 bits remaining
			let c9 = q1 & 0x3F;
			q1 >>= 6; // 22 bits remaining
			let c8 = q1 & 0x3F;
			q1 >>= 6; // 16 bits remaining
			let c7 = q1 & 0x3F;
			q1 >>= 6; // 10 bits remaining
			let c6 = q1 & 0x3F;
			q1 >>= 6; // 4 bits remaining
			c5 |= q1 & 0xF; // add 4 bits from q1

			let c15 = q0 & 0x3F;
			q0 >>= 6; // 26 bits remaining
			let c14 = q0 & 0x3F;
			q0 >>= 6; // 20 bits remaining
			let c13 = q0 & 0x3F;
			q0 >>= 6; // 14 bits remaining
			let c12 = q0 & 0x3F;
			q0 >>= 6; // 8 bits remaining
			let c11 = q0 & 0x3F;
			q0 >>= 6; // 2 bits remaining
			c10 |= q0 & 0x3;

			result[--j] = abc[c15];
			result[--j] = abc[c14];
			result[--j] = abc[c13];
			result[--j] = abc[c12];
			result[--j] = abc[c11];
			result[--j] = abc[c10];
			result[--j] = abc[c9];
			result[--j] = abc[c8];
			result[--j] = abc[c7];
			result[--j] = abc[c6];
			result[--j] = abc[c5];
			result[--j] = abc[c4];
			result[--j] = abc[c3];
			result[--j] = abc[c2];
			result[--j] = abc[c1];
			result[--j] = abc[c0];
		}
	}

	// 4. Done
	return result.subarray(0, result_len);
}

export function encode64ToBytes(data: string|Uint8Array, into?: Uint8Array, c_plus='+', c_slash='/', padding='=')
{	if (padding.length > 1)
	{	throw new Error('Invalid padding char');
	}
	let c_padding = padding.length==0 ? 256 : padding.charCodeAt(0);
	const abc = get_cached_abc(c_plus, c_slash).subarray(256);
	let n_padding_3 = data.length % 3;
	let result_len = Math.floor(data.length / 3) << 2; // the result length is 4/3

	return do_encode_64_to_bytes(data, into, abc, c_padding, n_padding_3, result_len);
}

export function encode64(data: string|Uint8Array, c_plus='+', c_slash='/', padding='=')
{	if (padding.length > 1)
	{	throw new Error('Invalid padding char');
	}
	let c_padding = padding.length==0 ? 256 : padding.charCodeAt(0);
	const abc = get_cached_abc(c_plus, c_slash).subarray(256);
	let n_padding_3 = data.length % 3;
	let result_len = Math.floor(data.length / 3) << 2; // the result length is 4/3

	return decoder.decode(do_encode_64_to_bytes(data, undefined, abc, c_padding, n_padding_3, result_len));
}

export function encode64Reader(reader: Deno.Reader, c_plus='+', c_slash='/', padding='='): Deno.Reader
{	if (padding.length > 1)
	{	throw new Error('Invalid padding char');
	}
	let c_padding = padding.length==0 ? 256 : padding.charCodeAt(0);
	const abc = get_cached_abc(c_plus, c_slash).subarray(256);
	const tail = new Uint8Array(2);
	let tail_len = 0; // -1 means done reading from underlying reader

	async function read(buffer: Uint8Array)
	{	if (tail_len)
		{	if (tail_len == -1)
			{	return null;
			}
			buffer.set(tail.subarray(0, tail_len));
		}
		let len = ((tail_len + buffer.length) * 3) >> 2;
		while (true)
		{	let n_read = await reader.read(buffer.subarray(tail_len, len));
			if (n_read == null)
			{	break;
			}
			n_read += tail_len;
			tail_len = n_read % 3;
			let result_len = Math.floor(n_read / 3) << 2; // the result length is 4/3
			let n_full = n_read - tail_len;
			if (n_full != 0)
			{	if (tail_len)
				{	tail.set(buffer.subarray(n_full, n_read));
				}
				do_encode_64_to_bytes(buffer.subarray(0, n_full), buffer, abc, c_padding, 0, result_len).length;
				return result_len;
			}
		}
		let prev_tail_len = tail_len;
		tail_len = -1;
		if (prev_tail_len)
		{	return do_encode_64_to_bytes(buffer.subarray(0, prev_tail_len), buffer, abc, c_padding, prev_tail_len, 0).length;
		}
		return null;
	}

	return {read};
}
