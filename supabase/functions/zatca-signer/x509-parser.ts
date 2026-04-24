/**
 * X.509 DER parser — extract IssuerName, SerialNumber, and SubjectPublicKeyInfo
 * lightweight ASN.1 reader (no external lib needed)
 */

interface Tlv {
  tag: number;
  length: number;
  valueOffset: number;
  totalLength: number;
}

/** قراءة TLV من بيانات DER */
function readTlv(data: Uint8Array, offset: number): Tlv {
  if (offset >= data.length) throw new Error("EOF");
  const tag = data[offset];
  const lenOffset = offset + 1;
  let length = data[lenOffset];
  let valueOffset: number;

  if (length & 0x80) {
    const numBytes = length & 0x7f;
    length = 0;
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | data[lenOffset + 1 + i];
    }
    valueOffset = lenOffset + 1 + numBytes;
  } else {
    valueOffset = lenOffset + 1;
  }

  return { tag, length, valueOffset, totalLength: valueOffset - offset + length };
}

/**
 * Parse a base64-encoded X.509 certificate to extract Issuer DN and Serial Number.
 */
export function parseX509IssuerSerial(certBase64: string): { issuerName: string; serialNumber: string } {
  const defaultResult = { issuerName: "CN=ZATCA-SubCA", serialNumber: "0" };

  try {
    const certDer = Uint8Array.from(atob(certBase64), c => c.charCodeAt(0));

    // Navigate: SEQUENCE (Certificate) → SEQUENCE (TBSCertificate)
    const cert = readTlv(certDer, 0);
    if (cert.tag !== 0x30) return defaultResult;

    const tbs = readTlv(certDer, cert.valueOffset);
    if (tbs.tag !== 0x30) return defaultResult;

    let pos = tbs.valueOffset;

    // Skip version if present (context tag [0])
    let field = readTlv(certDer, pos);
    if (field.tag === 0xa0) {
      pos += field.totalLength;
      field = readTlv(certDer, pos);
    }

    // Serial Number (INTEGER)
    if (field.tag !== 0x02) return defaultResult;
    const serialBytes = certDer.slice(field.valueOffset, field.valueOffset + field.length);
    let serialBigInt = 0n;
    for (let i = 0; i < serialBytes.length; i++) {
      serialBigInt = (serialBigInt << 8n) | BigInt(serialBytes[i]);
    }
    const serialNumber = serialBigInt.toString();
    pos += field.totalLength;

    // Skip Algorithm Identifier (SEQUENCE)
    field = readTlv(certDer, pos);
    pos += field.totalLength;

    // Issuer (SEQUENCE of SETs of SEQUENCE of OID + value)
    field = readTlv(certDer, pos);
    if (field.tag !== 0x30) return { issuerName: defaultResult.issuerName, serialNumber };

    const issuerEnd = field.valueOffset + field.length;
    let issuerPos = field.valueOffset;
    const rdns: string[] = [];

    const oidNames: Record<string, string> = {
      "2.5.4.3": "CN",
      "2.5.4.6": "C",
      "2.5.4.7": "L",
      "2.5.4.8": "ST",
      "2.5.4.10": "O",
      "2.5.4.11": "OU",
      "2.5.4.5": "SERIALNUMBER",
      "1.2.840.113549.1.9.1": "E",
    };

    while (issuerPos < issuerEnd) {
      const set = readTlv(certDer, issuerPos);
      if (set.tag !== 0x31) break;

      const seq = readTlv(certDer, set.valueOffset);
      if (seq.tag !== 0x30) { issuerPos += set.totalLength; continue; }

      const oid = readTlv(certDer, seq.valueOffset);
      if (oid.tag !== 0x06) { issuerPos += set.totalLength; continue; }

      const oidBytes = certDer.slice(oid.valueOffset, oid.valueOffset + oid.length);
      const oidParts: number[] = [Math.floor(oidBytes[0] / 40), oidBytes[0] % 40];
      let val = 0;
      for (let i = 1; i < oidBytes.length; i++) {
        val = (val << 7) | (oidBytes[i] & 0x7f);
        if (!(oidBytes[i] & 0x80)) { oidParts.push(val); val = 0; }
      }
      const oidStr = oidParts.join(".");

      const valField = readTlv(certDer, oid.valueOffset + oid.totalLength);
      const decoder = new TextDecoder();
      const valStr = decoder.decode(certDer.slice(valField.valueOffset, valField.valueOffset + valField.length));

      const name = oidNames[oidStr] || oidStr;
      rdns.push(`${name}=${valStr}`);

      issuerPos += set.totalLength;
    }

    const issuerName = rdns.join(", ");
    return { issuerName: issuerName || defaultResult.issuerName, serialNumber };

  } catch (e) {
    console.error("X.509 parse error (using defaults):", e);
    return defaultResult;
  }
}

/**
 * Extract the signatureValue and subjectPublicKeyInfo from an X.509 DER certificate.
 * - Tag 8 (certSignature): The raw signature bytes (last BitString in cert)
 * - Tag 9 (certPublicKey): The SubjectPublicKeyInfo bytes from tbsCertificate
 */
export function extractCertSignatureAndPublicKey(certDer: Uint8Array): { signature: Uint8Array; publicKey: Uint8Array } {
  try {
    // Certificate = SEQUENCE { tbsCertificate, signatureAlgorithm, signatureValue }
    const cert = readTlv(certDer, 0);
    let pos = cert.valueOffset;

    // tbsCertificate (SEQUENCE)
    const tbs = readTlv(certDer, pos);
    pos += tbs.totalLength;

    // signatureAlgorithm (SEQUENCE) — skip
    const sigAlg = readTlv(certDer, pos);
    pos += sigAlg.totalLength;

    // signatureValue (BIT STRING)
    const sigBitString = readTlv(certDer, pos);
    const signatureBytes = certDer.slice(sigBitString.valueOffset + 1, sigBitString.valueOffset + sigBitString.length);

    // Now extract SubjectPublicKeyInfo from tbsCertificate
    let tbsPos = tbs.valueOffset;

    // Skip version [0] if present
    let field = readTlv(certDer, tbsPos);
    if (field.tag === 0xa0) { tbsPos += field.totalLength; field = readTlv(certDer, tbsPos); }

    // Skip serialNumber (INTEGER)
    tbsPos += field.totalLength;

    // Skip signature algorithm (SEQUENCE)
    field = readTlv(certDer, tbsPos);
    tbsPos += field.totalLength;

    // Skip issuer (SEQUENCE)
    field = readTlv(certDer, tbsPos);
    tbsPos += field.totalLength;

    // Skip validity (SEQUENCE)
    field = readTlv(certDer, tbsPos);
    tbsPos += field.totalLength;

    // Skip subject (SEQUENCE)
    field = readTlv(certDer, tbsPos);
    tbsPos += field.totalLength;

    // SubjectPublicKeyInfo (SEQUENCE) — this is what we need for Tag 9
    field = readTlv(certDer, tbsPos);
    const publicKeyInfoBytes = certDer.slice(tbsPos, tbsPos + field.totalLength);

    return { signature: signatureBytes, publicKey: publicKeyInfoBytes };
  } catch (e) {
    console.error("extractCertSignatureAndPublicKey error:", e);
    return { signature: new Uint8Array(0), publicKey: new Uint8Array(0) };
  }
}
