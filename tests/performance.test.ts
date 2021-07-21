import {encode64, encode64ToBytes, decode64, decode64ToString} from '../mod.ts';
import {assert, assertEquals} from "https://deno.land/std@0.97.0/testing/asserts.ts";

Deno.test
(	'Performance comparision',
	() =>
	{	const N_ITERS = 10_000;
		const decoder = new TextDecoder;
		const fmt = new Intl.NumberFormat;

		function persec(since: number)
		{	return fmt.format(Math.round(N_ITERS / (Date.now()-since) * 1000));
		}

		for (let sample_max_length of [16, 100, 1000, 10000])
		{	let data = [];
			let data_str = [];
			for (let i=0; i<N_ITERS; i++)
			{	let random_bytes = new Uint8Array(sample_max_length);
				for (let j=0; j<sample_max_length; j++)
				{	random_bytes[j] = Math.floor(Math.random()*256);
				}
				data[i] = random_bytes;
				data_str[i] = String.fromCharCode(...random_bytes);
			}

			// Test btoa()
			let enc_btoa = [];
			let since = Date.now();
			for (let i=0; i<N_ITERS; i++)
			{	enc_btoa[i] = btoa(data_str[i]);
			}
			console.log(`%cbtoa sample size ${sample_max_length}:%c ${persec(since)} ops/sec`, 'color:orange', 'color:inherit');

			// Test encode64(string)
			let enc_encode64ss = [];
			since = Date.now();
			for (let i=0; i<N_ITERS; i++)
			{	enc_encode64ss[i] = encode64(data_str[i]);
			}
			console.log(`%cencode64(string) sample size ${sample_max_length}:%c ${persec(since)} ops/sec`, 'color:orange', 'color:inherit');
			for (let i=0; i<N_ITERS; i++)
			{	assertEquals(enc_btoa[i], enc_encode64ss[i]);
			}

			// Test encode64(Uint8Array)
			let enc_encode64bs = [];
			since = Date.now();
			for (let i=0; i<N_ITERS; i++)
			{	enc_encode64bs[i] = encode64(data[i]);
			}
			console.log(`%cencode64(Uint8Array) sample size ${sample_max_length}:%c ${persec(since)} ops/sec`, 'color:orange', 'color:inherit');
			for (let i=0; i<N_ITERS; i++)
			{	assertEquals(enc_btoa[i], enc_encode64bs[i]);
			}

			// Test encode64ToBytes(string)
			let enc_encode64sb = [];
			since = Date.now();
			for (let i=0; i<N_ITERS; i++)
			{	enc_encode64sb[i] = encode64ToBytes(data_str[i]);
			}
			console.log(`%cencode64ToBytes(string) sample size ${sample_max_length}:%c ${persec(since)} ops/sec`, 'color:orange', 'color:inherit');
			for (let i=0; i<N_ITERS; i++)
			{	assertEquals(decoder.decode(enc_encode64sb[i]), enc_encode64ss[i]);
			}

			// Test encode64ToBytes(Uint8Array)
			let enc_encode64bb = [];
			since = Date.now();
			for (let i=0; i<N_ITERS; i++)
			{	enc_encode64bb[i] = encode64ToBytes(data[i]);
			}
			console.log(`%cencode64ToBytes(Uint8Array) sample size ${sample_max_length}:%c ${persec(since)} ops/sec`, 'color:orange', 'color:inherit');
			for (let i=0; i<N_ITERS; i++)
			{	assertEquals(decoder.decode(enc_encode64bb[i]), enc_encode64ss[i]);
			}

			// Test atob()
			let dec_atob = [];
			since = Date.now();
			for (let i=0; i<N_ITERS; i++)
			{	dec_atob[i] = atob(enc_encode64bs[i]);
			}
			console.log(`%catob sample size ${sample_max_length}:%c ${persec(since)} ops/sec`, 'color:orange', 'color:inherit');
			for (let i=0; i<N_ITERS; i++)
			{	assertEquals(dec_atob[i], String.fromCharCode(...data[i]));
			}

			// Test decode64ToString(string)
			let dec_decode64ss = [];
			since = Date.now();
			for (let i=0; i<N_ITERS; i++)
			{	dec_decode64ss[i] = decode64ToString(enc_encode64bs[i]);
			}
			console.log(`%cdecode64ToString(string) sample size ${sample_max_length}:%c ${persec(since)} ops/sec`, 'color:orange', 'color:inherit');
			for (let i=0; i<N_ITERS; i++)
			{	assertEquals(dec_decode64ss[i], String.fromCharCode(...data[i]));
			}

			// Test decode64ToString(Uint8Array)
			let dec_decode64bs = [];
			since = Date.now();
			for (let i=0; i<N_ITERS; i++)
			{	dec_decode64bs[i] = decode64ToString(enc_encode64sb[i]);
			}
			console.log(`%cdecode64ToString(Uint8Array) sample size ${sample_max_length}:%c ${persec(since)} ops/sec`, 'color:orange', 'color:inherit');
			for (let i=0; i<N_ITERS; i++)
			{	assertEquals(dec_decode64bs[i], String.fromCharCode(...data[i]));
			}

			// Test decode64(string)
			let dec_decode64sb = [];
			since = Date.now();
			for (let i=0; i<N_ITERS; i++)
			{	dec_decode64sb[i] = decode64(enc_encode64bs[i]);
			}
			console.log(`%cdecode64(string) sample size ${sample_max_length}:%c ${persec(since)} ops/sec`, 'color:orange', 'color:inherit');
			for (let i=0; i<N_ITERS; i++)
			{	assertEquals(String.fromCharCode(...dec_decode64sb[i]), String.fromCharCode(...data[i]));
			}

			// Test decode64(Uint8Array)
			let dec_decode64bb = [];
			since = Date.now();
			for (let i=0; i<N_ITERS; i++)
			{	dec_decode64bb[i] = decode64(enc_encode64sb[i]);
			}
			console.log(`%cdecode64(Uint8Array) sample size ${sample_max_length}:%c ${persec(since)} ops/sec`, 'color:orange', 'color:inherit');
			for (let i=0; i<N_ITERS; i++)
			{	assertEquals(String.fromCharCode(...dec_decode64bb[i]), String.fromCharCode(...data[i]));
			}
		}
	}
);
