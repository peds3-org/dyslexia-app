// Base64 polyfill for React Native
// React Native doesn't have atob/btoa built-in

export function setupBase64Polyfill() {
  // React Native環境でglobalオブジェクトの存在を確認
  const globalObj = typeof global !== 'undefined' ? global : window;
  
  if (!globalObj) {
    console.warn('[base64Polyfill] Global object not found, skipping polyfill setup');
    return;
  }
  
  try {
    if (typeof globalObj.btoa === 'undefined') {
      globalObj.btoa = (str: string): string => {
        return base64Encode(str);
      };
    }

    if (typeof globalObj.atob === 'undefined') {
      globalObj.atob = (str: string): string => {
        return base64Decode(str);
      };
    }
  } catch (error) {
    console.error('[base64Polyfill] Error setting up polyfill:', error);
  }
}

// Alternative implementation without Buffer (for iOS)
export function base64Encode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let result = '';
  let i = 0;
  
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
    result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
  }
  
  return result;
}

export function base64Decode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let result = '';
  let i = 0;
  
  str = str.replace(/[^A-Za-z0-9+/]/g, '');
  
  while (i < str.length) {
    const encoded1 = chars.indexOf(str.charAt(i++));
    const encoded2 = chars.indexOf(str.charAt(i++));
    const encoded3 = chars.indexOf(str.charAt(i++));
    const encoded4 = chars.indexOf(str.charAt(i++));
    
    const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
    
    result += String.fromCharCode((bitmap >> 16) & 255);
    if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
    if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
  }
  
  return result;
}