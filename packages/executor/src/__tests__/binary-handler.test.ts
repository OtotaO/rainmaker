import { describe, expect, test as it } from 'bun:test';
import { convertToBinary, createBinaryOutput, MAX_BINARY_SIZE } from '../binary-handler';

describe('Binary Handler', () => {
  describe('convertToBinary', () => {
    describe('Buffer handling', () => {
      it('handles Buffer input directly', () => {
        const buffer = Buffer.from('Hello, World!', 'utf8');
        const result = convertToBinary(buffer);
        
        expect(result.buffer).toBe(buffer);
        expect(result.base64).toBe(buffer.toString('base64'));
        expect(result.size).toBe(buffer.length);
        expect(result.error).toBeUndefined();
      });
    });

    describe('ArrayBuffer handling', () => {
      it('converts ArrayBuffer to Buffer', () => {
        const text = 'Test ArrayBuffer';
        const encoder = new TextEncoder();
        const arrayBuffer = encoder.encode(text).buffer;
        
        const result = convertToBinary(arrayBuffer);
        
        expect(result.buffer.toString()).toBe(text);
        expect(result.size).toBe(text.length);
        expect(result.error).toBeUndefined();
      });
    });

    describe('TypedArray handling', () => {
      it('converts Uint8Array to Buffer', () => {
        const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
        const result = convertToBinary(data);
        
        expect(result.buffer.toString()).toBe('Hello');
        expect(result.size).toBe(5);
        expect(result.error).toBeUndefined();
      });

      it('converts Int8Array to Buffer', () => {
        const data = new Int8Array([65, 66, 67]); // "ABC"
        const result = convertToBinary(data);
        
        expect(result.buffer.toString()).toBe('ABC');
        expect(result.size).toBe(3);
      });

      it('converts Uint16Array to Buffer', () => {
        const data = new Uint16Array([0x4548, 0x4C4C, 0x4F]); // "HELLO" in little-endian
        const result = convertToBinary(data);
        
        expect(result.size).toBe(6); // 3 * 2 bytes
        expect(result.base64).toBeDefined();
      });

      it('converts Float32Array to Buffer', () => {
        const data = new Float32Array([1.5, 2.5, 3.5]);
        const result = convertToBinary(data);
        
        expect(result.size).toBe(12); // 3 * 4 bytes
        expect(result.base64).toBeDefined();
      });
    });

    describe('String handling', () => {
      it('detects and decodes base64 strings', () => {
        const originalText = 'This is base64 encoded';
        const base64 = Buffer.from(originalText).toString('base64');
        
        const result = convertToBinary(base64);
        
        expect(result.buffer.toString()).toBe(originalText);
        expect(result.error).toBeUndefined();
      });

      it('handles base64 with whitespace', () => {
        const originalText = 'Base64 with spaces';
        const base64 = Buffer.from(originalText).toString('base64');
        const base64WithSpaces = base64.match(/.{1,4}/g)!.join(' ');
        
        const result = convertToBinary(base64WithSpaces);
        
        expect(result.buffer.toString()).toBe(originalText);
      });

      it('handles binary strings', () => {
        const binaryString = '\x00\x01\x02\xFF\xFE\xFD';
        const result = convertToBinary(binaryString);
        
        expect(result.buffer[0]).toBe(0);
        expect(result.buffer[1]).toBe(1);
        expect(result.buffer[2]).toBe(2);
        expect(result.buffer[3]).toBe(255);
        expect(result.buffer[4]).toBe(254);
        expect(result.buffer[5]).toBe(253);
      });

      it('handles regular text strings', () => {
        const text = 'Not base64! Has invalid chars @#$%';
        const result = convertToBinary(text);
        
        // Should be treated as binary string, not base64
        expect(result.buffer.toString('binary')).toBe(text);
      });

      it('handles empty strings', () => {
        const result = convertToBinary('');
        
        expect(result.size).toBe(0);
        expect(result.base64).toBe('');
      });
    });

    describe('Object handling', () => {
      it('stringifies objects to JSON', () => {
        const obj = { name: 'test', value: 123, nested: { data: true } };
        const result = convertToBinary(obj);
        
        const decoded = JSON.parse(result.buffer.toString());
        expect(decoded).toEqual(obj);
        expect(result.error).toBeUndefined();
      });

      it('handles objects with toJSON method', () => {
        const obj = {
          data: 'secret',
          toJSON() {
            return { data: 'public' };
          },
        };
        
        const result = convertToBinary(obj);
        const decoded = JSON.parse(result.buffer.toString());
        
        expect(decoded.data).toBe('public');
      });

      it('handles circular references gracefully', () => {
        const obj: any = { name: 'circular' };
        obj.self = obj;
        
        const result = convertToBinary(obj);
        
        expect(result.error).toContain('JSON stringify failed');
        // Should still produce a buffer
        expect(result.buffer.length).toBeGreaterThan(0);
      });

      it('handles objects that throw on stringify', () => {
        const obj = {
          toJSON() {
            throw new Error('Cannot serialize');
          },
        };
        
        const result = convertToBinary(obj);
        
        expect(result.error).toContain('Cannot serialize');
        expect(result.buffer.toString()).toContain('[object Object]');
      });
    });

    describe('Edge cases', () => {
      it('handles null', () => {
        const result = convertToBinary(null);
        
        expect(result.size).toBe(0);
        expect(result.base64).toBe('');
      });

      it('handles undefined', () => {
        const result = convertToBinary(undefined);
        
        expect(result.size).toBe(0);
        expect(result.base64).toBe('');
      });

      it('handles numbers', () => {
        const result = convertToBinary(12345);
        
        expect(result.buffer.toString()).toBe('12345');
      });

      it('handles booleans', () => {
        const resultTrue = convertToBinary(true);
        const resultFalse = convertToBinary(false);
        
        expect(resultTrue.buffer.toString()).toBe('true');
        expect(resultFalse.buffer.toString()).toBe('false');
      });

      it('handles symbols', () => {
        const sym = Symbol('test');
        const result = convertToBinary(sym);
        
        expect(result.buffer.toString()).toBe('Symbol(test)');
      });
    });

    describe('Size limits', () => {
      it('rejects buffers exceeding size limit', () => {
        const largeBuffer = Buffer.alloc(MAX_BINARY_SIZE + 1);
        
        expect(() => convertToBinary(largeBuffer)).toThrow('Binary response too large');
      });

      it('accepts buffers at size limit', () => {
        const maxBuffer = Buffer.alloc(MAX_BINARY_SIZE);
        const result = convertToBinary(maxBuffer);
        
        expect(result.size).toBe(MAX_BINARY_SIZE);
      });
    });

    describe('Error handling', () => {
      it('handles conversion errors gracefully', () => {
        // Create a proxy that throws on any property access
        const problematicData = new Proxy({}, {
          get() {
            throw new Error('Property access error');
          },
        });
        
        const result = convertToBinary(problematicData);
        
        expect(result.error).toContain('Property access error');
        expect(result.buffer.length).toBeGreaterThan(0);
      });
    });
  });

  describe('createBinaryOutput', () => {
    it('creates proper output format', () => {
      const buffer = Buffer.from('test data');
      const contentType = 'application/octet-stream';
      
      const output = createBinaryOutput(buffer, contentType);
      
      expect(output).toEqual({
        binary: buffer.toString('base64'),
        contentType: 'application/octet-stream',
        size: buffer.length,
      });
    });

    it('handles empty buffers', () => {
      const buffer = Buffer.alloc(0);
      const output = createBinaryOutput(buffer, 'application/x-empty');
      
      expect(output.binary).toBe('');
      expect(output.size).toBe(0);
    });
  });
});