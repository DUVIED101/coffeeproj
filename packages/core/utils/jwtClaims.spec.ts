import { describe, it, expect } from '@jest/globals';
import { readJwtClaims } from './jwtClaims';

const b64url = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');

const token = (header: object, payload: object): string =>
  `${b64url(header)}.${b64url(payload)}.c2lnbmF0dXJl`;

const SUB = 'b7e1c2d4-0000-4000-8000-000000000001';
const EXP = 1_800_000_000;

describe(readJwtClaims, () => {
  it('reads sub, exp, alg and kid without verifying the signature', () => {
    expect(
      readJwtClaims(token({ alg: 'ES256', kid: 'k1', typ: 'JWT' }, { sub: SUB, exp: EXP }))
    ).toEqual({ sub: SUB, exp: EXP, alg: 'ES256', kid: 'k1' });
  });

  it('reports a missing kid as null (legacy HS256 tokens carry none)', () => {
    expect(readJwtClaims(token({ alg: 'HS256' }, { sub: SUB, exp: EXP }))).toEqual({
      sub: SUB,
      exp: EXP,
      alg: 'HS256',
      kid: null,
    });
  });

  it.each([
    ['not a jwt', 'garbage'],
    ['two segments', 'a.b'],
    ['payload without sub', token({ alg: 'ES256' }, { exp: EXP })],
    ['payload without exp', token({ alg: 'ES256' }, { sub: SUB })],
    ['undecodable payload', `${b64url({ alg: 'ES256' })}.%%%.sig`],
    ['empty string', ''],
  ])('returns null for %s', (_label, value) => {
    expect(readJwtClaims(value)).toBeNull();
  });
});
