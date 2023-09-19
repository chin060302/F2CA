import { convertX509PublicKeyToCOSE } from '../helpers/convertX509PublicKeyToCOSE';
import { isoBase64URL, isoUint8Array } from '../helpers/iso';
import { COSEALG, COSEKEYS, isCOSEPublicKeyEC2, isCOSEPublicKeyRSA } from '../helpers/cose';
import { verifyEC2 } from '../helpers/iso/isoCrypto/verifyEC2';
import { verifyRSA } from '../helpers/iso/isoCrypto/verifyRSA';

/**
 * Lightweight verification for FIDO MDS JWTs. Supports use of EC2 and RSA.
 *
 * If this ever needs to support more JWS algorithms, here's the list of them:
 *
 * https://www.rfc-editor.org/rfc/rfc7518.html#section-3.1
 *
 * (Pulled from https://www.rfc-editor.org/rfc/rfc7515#section-4.1.1)
 */
export async function verifyJWT(jwt: string, leafCert: Uint8Array): Promise<boolean> {
  const [header, payload, signature] = jwt.split('.');

  const certCOSE = convertX509PublicKeyToCOSE(leafCert);
  const data = isoUint8Array.fromUTF8String(`${header}.${payload}`);
  const signatureBytes = isoBase64URL.toBuffer(signature);

  if (isCOSEPublicKeyEC2(certCOSE)) {
    return verifyEC2({
      data,
      signature: signatureBytes,
      cosePublicKey: certCOSE,
      shaHashOverride: COSEALG.ES256,
    });
  } else if (isCOSEPublicKeyRSA(certCOSE)) {
    return verifyRSA({
      data,
      signature: signatureBytes,
      cosePublicKey: certCOSE,
    })
  }

  const kty = certCOSE.get(COSEKEYS.kty);
  throw new Error(
    `JWT verification with public key of kty ${kty} is not supported by this method`,
  );
}
