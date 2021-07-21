const MAX_CACHE_ABCS = 4;

const ABCS = new Map<number, Uint8Array>();

function get_abc(b62: number, b63: number)
{	const abc = new Uint8Array(256 + 64); // 256-byte decode table + 64-byte encode table

	// 1. Decode table
	abc.fill(0xFF, 0, 256);
	let value = 0;
	for (let i='A'.charCodeAt(0); i<='Z'.charCodeAt(0); i++)
	{	abc[i] = value++;
	}
	for (let i='a'.charCodeAt(0); i<='z'.charCodeAt(0); i++)
	{	abc[i] = value++;
	}
	for (let i='0'.charCodeAt(0); i<='9'.charCodeAt(0); i++)
	{	abc[i] = value++;
	}
	abc[b62] = value++;
	abc[b63] = value++;

	let pos = 256;
	// 2. Encode table
	for (let i='A'.charCodeAt(0); i<='Z'.charCodeAt(0); i++)
	{	abc[pos++] = i;
	}
	for (let i='a'.charCodeAt(0); i<='z'.charCodeAt(0); i++)
	{	abc[pos++] = i;
	}
	for (let i='0'.charCodeAt(0); i<='9'.charCodeAt(0); i++)
	{	abc[pos++] = i;
	}
	abc[pos++] = b62;
	abc[pos++] = b63;

	return abc;
}

export function get_cached_abc(c62='+', c63='/')
{	if (c62.length != 1)
	{	throw new Error('Invalid c62 char');
	}
	if (c63.length != 1)
	{	throw new Error('Invalid c63 char');
	}

	let b62 = c62.charCodeAt(0);
	let b63 = c63.charCodeAt(0);

	let key = b62 | (b63 << 16);
	let abc = ABCS.get(key);
	if (!abc)
	{	abc = get_abc(b62, b63);
		if (ABCS.size >= MAX_CACHE_ABCS)
		{	ABCS.clear();
		}
		ABCS.set(key, abc);
	}

	return abc;
}
