export const captureRef = async () => {
  throw new Error('captureRef is not implemented natively on web. Use html2canvas.');
};

export const releaseCapture = () => {};

export default {
  captureRef,
  releaseCapture,
};
