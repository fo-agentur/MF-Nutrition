/* ============================================================
   Barcode scanning via ZXing + getUserMedia (works in iOS
   Safari / installed PWA over HTTPS). Prefers the back camera.
   ============================================================ */
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';

let controls = null;

function makeReader() {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 250 });
}

async function startBarcodeScan(videoEl, onDetected) {
  stopBarcodeScan();
  if (!videoEl) throw new Error('no video element');
  const reader = makeReader();
  const constraints = { audio: false, video: { facingMode: { ideal: 'environment' } } };
  controls = await reader.decodeFromConstraints(constraints, videoEl, (result) => {
    if (result) {
      const text = result.getText ? result.getText() : String(result);
      if (text) onDetected(text);
    }
  });
  return controls;
}

function stopBarcodeScan() {
  try { if (controls && controls.stop) controls.stop(); } catch (e) { /* ignore */ }
  controls = null;
}

Object.assign(window, { startBarcodeScan, stopBarcodeScan });
export { startBarcodeScan, stopBarcodeScan };
