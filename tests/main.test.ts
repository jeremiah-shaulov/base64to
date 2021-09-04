import {encode64, encode64ToBytes, encode64Reader, decode64, decode64ToString, decode64Reader} from '../mod.ts';
import {assert, assertEquals} from "https://deno.land/std@0.106.0/testing/asserts.ts";
import {readAll} from 'https://deno.land/std@0.106.0/io/util.ts';

Deno.test
(	'Basic',
	() =>
	{	const N_ITERS = 1000;
		const encoder = new TextEncoder;

		for (let i=1; i<N_ITERS; i++)
		{	let data = [];
			for (let j=0; j<i; j++)
			{	data[j] = Math.floor(Math.random()*256);
			}

			let data_1 = encode64(new Uint8Array(data));
			let data_2 = btoa(String.fromCharCode.apply(null, data));
			assertEquals(data_1, data_2);
			assertEquals(decode64(encoder.encode(data_1)), new Uint8Array(data));

			data_1 = encode64(new Uint8Array(data), '-', '_', '');
			data_2 = btoa(String.fromCharCode.apply(null, data));
			data_2 = data_2.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
			assertEquals(data_1, data_2);
			assertEquals(decode64(encoder.encode(data_1), undefined, '-', '_'), new Uint8Array(data));
		}
	}
);

Deno.test
(	'Convert inplace',
	() =>
	{	const N_ITERS = 10_000;
		const encoder = new TextEncoder;
		const decoder = new TextDecoder;

		let data_str = [];
		for (let i=0; i<N_ITERS; i++)
		{	let random_bytes = new Uint8Array(i+1);
			for (let j=0; j<i+1; j++)
			{	random_bytes[j] = Math.floor(Math.random()*256);
			}
			data_str[i] = String.fromCharCode(...random_bytes);
		}

		for (let i=0; i<N_ITERS; i++)
		{	let str = data_str[i];
			let data = new Uint8Array(str.length*4);
			let {read, written} = encoder.encodeInto(str, data);
			assertEquals(read, str.length);
			let data_2 = encode64ToBytes(data.subarray(0, written), data);
			assert(data_2.buffer == data.buffer);
			let data_3 = decode64(data_2, data);
			assert(data_3.buffer == data.buffer);
			assertEquals(decoder.decode(data_3), str);
		}
	}
);

Deno.test
(	'Basic',
	async () =>
	{	for (let data_len of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 100, 1000])
		{	let data = new Uint8Array(data_len);
			for (let i=0; i<data.length; i++)
			{	data[i] = i % 256;
			}
			for (let chunk_len_inc of [0, 1, 100])
			{	for (let padding of ['=', '?', ''])
				{	let data_enc = encode64ToBytes(data, undefined, '+', '/', padding);
					let chunk_len = 1;

					class Reader
					{	private pos = 0;

						async read(buffer: Uint8Array)
						{	if (this.pos >= data_enc.length)
							{	return null;
							}
							let n = Math.min(chunk_len, buffer.length, data_enc.length-this.pos);
							buffer.set(data_enc.subarray(this.pos, this.pos+n));
							this.pos += n;
							chunk_len += chunk_len_inc;
							return n;
						}
					}

					let data_back = await readAll(decode64Reader(new Reader));
					assertEquals(String.fromCharCode(...data_back), String.fromCharCode(...data));
					let data_back_front = await readAll(encode64Reader(decode64Reader(new Reader), '+', '/', padding));
					assertEquals(String.fromCharCode(...data_back_front), String.fromCharCode(...data_enc));
				}
			}
		}
	}
);

Deno.test
(	'Invalid',
	async () =>
	{	let error;
		try
		{	encode64('', '+', '/', 'Junk');
		}
		catch (e)
		{	error = e;
		}
		assertEquals(error?.message, 'Invalid padding char');

		error = undefined;
		try
		{	encode64ToBytes('', undefined, '+', '/', 'Junk');
		}
		catch (e)
		{	error = e;
		}
		assertEquals(error?.message, 'Invalid padding char');

		error = undefined;
		try
		{	encode64Reader({async read() {return null}}, '+', '/', 'Junk');
		}
		catch (e)
		{	error = e;
		}
		assertEquals(error?.message, 'Invalid padding char');
	}
);
