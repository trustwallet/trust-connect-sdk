import { describe, it, expect } from 'vitest'
import {
	bytesToHex,
	hexToBytes,
	bytesToBase64,
	base64ToBytes,
	bytesToBase64Url,
	base64UrlToBytes,
	stringToBytes,
	bytesToString,
	base64ToHex,
	hexToBase64,
	bytesToBase58,
	base58ToBytes,
} from '../index.js'

describe('Hex encoding', () => {
	it('should correctly convert a valid lowercase hex string to bytes', () => {
		const hex = '48656c6c6f'
		const bytes = hexToBytes(hex)
		expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111])
	})

	it('should correctly convert a valid uppercase hex string to bytes', () => {
		const hex = '48656C6C6F'
		const bytes = hexToBytes(hex)
		expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111])
	})

	it('should correctly convert a hex string with 0x prefix to bytes', () => {
		const hex = '0x48656c6c6f'
		const bytes = hexToBytes(hex)
		expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111])
	})

	it('should correctly convert a Uint8Array to a lowercase hexadecimal string', () => {
		const bytes = new Uint8Array([72, 101, 108, 108, 111])
		const hex = bytesToHex(bytes)
		expect(hex).toBe('48656c6c6f')
		expect(hex).toMatch(/^[0-9a-f]*$/)
	})

	it('should correctly round-trip bytes → hex → bytes without data loss', () => {
		const original = new Uint8Array([1, 2, 3, 255, 0, 128, 64])
		const hex = bytesToHex(original)
		const restored = hexToBytes(hex)
		expect(Array.from(restored)).toEqual(Array.from(original))
	})
})

describe('Base64 encoding', () => {
	it('should correctly convert a base64 string to bytes', () => {
		const base64 = 'SGVsbG8='
		const bytes = base64ToBytes(base64)
		expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111])
	})

	it('should correctly convert bytes to a base64 string', () => {
		const bytes = new Uint8Array([72, 101, 108, 108, 111])
		const base64 = bytesToBase64(bytes)
		expect(base64).toBe('SGVsbG8=')
	})

	it('should correctly round-trip bytes → base64 → bytes without data loss', () => {
		const original = new Uint8Array([1, 2, 3, 255, 0, 128, 64])
		const base64 = bytesToBase64(original)
		const restored = base64ToBytes(base64)
		expect(Array.from(restored)).toEqual(Array.from(original))
	})
})

describe('Base64url encoding', () => {
	it('should correctly convert a base64url string (no padding) to bytes', () => {
		const base64url = 'SGVsbG8'
		const bytes = base64UrlToBytes(base64url)
		expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111])
	})

	it('should correctly convert bytes to a base64url string without padding', () => {
		const bytes = new Uint8Array([72, 101, 108, 108, 111])
		const base64url = bytesToBase64Url(bytes)
		expect(base64url).toBe('SGVsbG8')
		expect(base64url).not.toContain('=')
		expect(base64url).not.toMatch(/[+/]/)
	})

	it('should correctly round-trip bytes → base64url → bytes without data loss', () => {
		const original = new Uint8Array([251, 255, 254, 62, 63])
		const base64url = bytesToBase64Url(original)
		const restored = base64UrlToBytes(base64url)
		expect(Array.from(restored)).toEqual(Array.from(original))
	})
})

describe('Base64/Hex conversion', () => {
	it('should correctly convert base64 to hex by decoding to bytes first', () => {
		const base64 = 'SGVsbG8='
		const hex = base64ToHex(base64)
		expect(hex).toBe('48656c6c6f')
	})

	it('should correctly convert hex to base64 by encoding bytes', () => {
		const hex = '48656c6c6f'
		const base64 = hexToBase64(hex)
		expect(base64).toBe('SGVsbG8=')
	})
})

describe('Empty inputs', () => {
	it('should correctly handle empty hex', () => {
		expect(Array.from(hexToBytes(''))).toEqual([])
		expect(bytesToHex(new Uint8Array([]))).toBe('')
	})

	it('should correctly handle empty base64', () => {
		expect(Array.from(base64ToBytes(''))).toEqual([])
		expect(bytesToBase64(new Uint8Array([]))).toBe('')
	})

	it('should correctly handle empty base64url', () => {
		expect(Array.from(base64UrlToBytes(''))).toEqual([])
		expect(bytesToBase64Url(new Uint8Array([]))).toBe('')
	})
})

describe('UTF-8 string encoding', () => {
	it('should correctly encode a UTF-8 string into bytes', () => {
		const str = 'Hello'
		const bytes = stringToBytes(str)
		expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111])
	})

	it('should correctly decode UTF-8 bytes back into the original string', () => {
		const bytes = new Uint8Array([72, 101, 108, 108, 111])
		const str = bytesToString(bytes)
		expect(str).toBe('Hello')
	})

	it('should correctly round-trip UTF-8 string → bytes → string for ASCII text', () => {
		const original = 'Hello World! 123'
		const bytes = stringToBytes(original)
		const restored = bytesToString(bytes)
		expect(restored).toBe(original)
	})

	it('should correctly round-trip UTF-8 string → bytes → string for multi-byte Unicode characters', () => {
		const original = 'Hello 世界 🌍 Привет'
		const bytes = stringToBytes(original)
		const restored = bytesToString(bytes)
		expect(restored).toBe(original)
	})

	it('should handle empty string', () => {
		expect(Array.from(stringToBytes(''))).toEqual([])
		expect(bytesToString(new Uint8Array([]))).toBe('')
	})
})

describe('Large data handling', () => {
	it('should correctly handle large byte arrays when converting to base64 without crashing', () => {
		const largeArray = new Uint8Array(10000)
		for (let i = 0; i < largeArray.length; i++) {
			largeArray[i] = i % 256
		}

		const base64 = bytesToBase64(largeArray)
		expect(base64.length).toBeGreaterThan(0)

		const restored = base64ToBytes(base64)
		expect(Array.from(restored)).toEqual(Array.from(largeArray))
	})
})

describe('Base64 and Base64url equivalence', () => {
	it('should produce identical bytes when decoding equivalent base64 and base64url representations', () => {
		const bytes = new Uint8Array([251, 255, 254, 62, 63])

		const base64 = bytesToBase64(bytes)
		const base64url = bytesToBase64Url(bytes)

		expect(base64).not.toBe(base64url)

		const fromBase64 = base64ToBytes(base64)
		const fromBase64Url = base64UrlToBytes(base64url)

		expect(Array.from(fromBase64)).toEqual(Array.from(bytes))
		expect(Array.from(fromBase64Url)).toEqual(Array.from(bytes))
		expect(Array.from(fromBase64)).toEqual(Array.from(fromBase64Url))
	})
})

describe('Base58 encoding', () => {
	it('should convert bytes to base58', () => {
		const bytes = new Uint8Array([0, 1, 2, 3])
		const base58 = bytesToBase58(bytes)
		expect(base58).toBe('1Ldp')
		expect(typeof base58).toBe('string')
	})

	it('should convert base58 to bytes', () => {
		const base58 = '1Ldp'
		const bytes = base58ToBytes(base58)
		expect(Array.from(bytes)).toEqual([0, 1, 2, 3])
	})

	it('should handle leading zeros', () => {
		const bytes = new Uint8Array([0, 0, 1, 2])
		const base58 = bytesToBase58(bytes)
		expect(base58.startsWith('11')).toBe(true)
		const restored = base58ToBytes(base58)
		expect(Array.from(restored)).toEqual(Array.from(bytes))
	})

	it('should handle empty input', () => {
		expect(bytesToBase58(new Uint8Array([]))).toBe('')
		expect(Array.from(base58ToBytes(''))).toEqual([])
	})

	it('should be reversible', () => {
		const original = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100])
		const base58 = bytesToBase58(original)
		const restored = base58ToBytes(base58)
		expect(Array.from(restored)).toEqual(Array.from(original))
	})

	it('should throw on invalid base58 character', () => {
		expect(() => base58ToBytes('Invalid0')).toThrow('Invalid base58 character')
	})
})

describe('Error handling and validation', () => {
	it('should throw on invalid hex string with odd length', () => {
		expect(() => hexToBytes('abc')).toThrow('Invalid hex string: odd length')
	})

	it('should throw on invalid hex string with non-hex characters', () => {
		expect(() => hexToBytes('zz')).toThrow('Invalid hex string: invalid chars')
		expect(() => hexToBytes('0xzz')).toThrow('Invalid hex string: invalid chars')
	})

	it('should throw on invalid base64url string with invalid length', () => {
		expect(() => base64UrlToBytes('A')).toThrow('Invalid base64url: invalid length')
	})

	it('should throw on invalid base64url string with invalid characters', () => {
		expect(() => base64UrlToBytes('ABC@#$')).toThrow('Invalid base64url: invalid chars')
	})

	it('should reject base64url with whitespace', () => {
		const base64url = '  SGVsbG8  '
		expect(() => base64UrlToBytes(base64url)).toThrow('Invalid base64url: contains whitespace')
	})

	it('should reject base64url with padding in the middle', () => {
		expect(() => base64UrlToBytes('ab=cd')).toThrow('Invalid base64url: invalid chars')
	})

	it('should handle very large arrays without crashing', () => {
		const largeArray = new Uint8Array(200_000)
		for (let i = 0; i < largeArray.length; i++) {
			largeArray[i] = i % 256
		}

		const base64 = bytesToBase64(largeArray)
		expect(base64.length).toBeGreaterThan(0)

		const base64url = bytesToBase64Url(largeArray)
		expect(base64url.length).toBeGreaterThan(0)

		const restored = base64ToBytes(base64)
		expect(Array.from(restored)).toEqual(Array.from(largeArray))
	})

	it('should handle hexToBase64 with 0x prefix', () => {
		const hex = '0xdeadbeef'
		const base64 = hexToBase64(hex)
		expect(base64).toBeTruthy()

		const bytes = hexToBytes(hex)
		const expectedBase64 = bytesToBase64(bytes)
		expect(base64).toBe(expectedBase64)
	})

	it('should handle hexToBase64 with large hex strings', () => {
		const largeHex = 'aa'.repeat(100_000)
		const base64 = hexToBase64(largeHex)
		expect(base64.length).toBeGreaterThan(0)
	})
})
