// Small color contrast helper
// Exports getReadableTextColor(backgroundColor) -> 'black' or 'white'
// Supports hex (#rgb, #rrggbb), rgb(), rgba(), hsl(), hsla()

function clamp01(v){ return Math.max(0, Math.min(1, v)); }

function srgbToLinear(c){
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance({r,g,b}){
    // r,g,b in 0..255
    const R = srgbToLinear(r);
    const G = srgbToLinear(g);
    const B = srgbToLinear(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(l1, l2){
    const L1 = Math.max(l1, l2);
    const L2 = Math.min(l1, l2);
    return (L1 + 0.05) / (L2 + 0.05);
}

function parseHex(hex){
    hex = hex.replace('#','');
    if(hex.length === 3){
        hex = hex.split('').map(c => c + c).join('');
    }
    if(hex.length !== 6) return null;
    const r = parseInt(hex.substring(0,2),16);
    const g = parseInt(hex.substring(2,4),16);
    const b = parseInt(hex.substring(4,6),16);
    return {r,g,b};
}

function parseRgb(input){
    // rgb(a)?(r,g,b[,a])
    const m = input.match(/rgba?\(([^)]+)\)/i);
    if(!m) return null;
    const parts = m[1].split(',').map(s=>s.trim());
    if(parts.length < 3) return null;
    const parseComp = (s, idx) => {
        if(s.endsWith('%')){
            return Math.round(parseFloat(s) * 2.55);
        }
        return Math.round(parseFloat(s));
    }
    const r = parseComp(parts[0],0);
    const g = parseComp(parts[1],1);
    const b = parseComp(parts[2],2);
    return {r: clamp01(r/255)*255, g: clamp01(g/255)*255, b: clamp01(b/255)*255};
}

function hslToRgb(h,s,l){
    h = h % 360;
    if(h < 0) h += 360;
    s = clamp01(s/100);
    l = clamp01(l/100);
    if(s === 0){
        const v = Math.round(l * 255);
        return {r:v,g:v,b:v};
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hk = h / 360;
    const t = (n) => {
        let tc = hk + n;
        if(tc < 0) tc += 1;
        if(tc > 1) tc -= 1;
        if(tc < 1/6) return p + (q - p) * 6 * tc;
        if(tc < 1/2) return q;
        if(tc < 2/3) return p + (q - p) * (2/3 - tc) * 6;
        return p;
    }
    const r = Math.round(t(1/3) * 255);
    const g = Math.round(t(0) * 255);
    const b = Math.round(t(-1/3) * 255);
    return {r,g,b};
}

function parseHsl(input){
    const m = input.match(/hsla?\(([^)]+)\)/i);
    if(!m) return null;
    const parts = m[1].split(',').map(s=>s.trim());
    if(parts.length < 3) return null;
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1].replace('%',''));
    const l = parseFloat(parts[2].replace('%',''));
    return hslToRgb(h,s,l);
}

function parseColor(input){
    if(!input || typeof input !== 'string') return null;
    input = input.trim();
    if(input.startsWith('#')) return parseHex(input);
    if(input.toLowerCase().startsWith('rgb')) return parseRgb(input);
    if(input.toLowerCase().startsWith('hsl')) return parseHsl(input);
    return null;
}

export function getReadableTextColor(background){
    const px = parseColor(background);
    if(!px) {
        // fallback to black
        return 'black';
    }
    const Lbg = relativeLuminance(px);
    const Lwhite = relativeLuminance({r:255,g:255,b:255});
    const Lblack = relativeLuminance({r:0,g:0,b:0});
    const contrastWhite = contrastRatio(Lbg, Lwhite);
    const contrastBlack = contrastRatio(Lbg, Lblack);
    // prefer the higher contrast
    return (contrastWhite >= contrastBlack) ? 'white' : 'black';
}

// default export
export default { getReadableTextColor };
