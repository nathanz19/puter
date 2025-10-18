// Computes contrast of an hsla color and sets CSS variable --window-sidebar-title-color
// so browsers without color-contrast() get the same behavior.

(function(){
    // Parse hsla(...) or rgb/hex that the sidebar uses. We'll compute luminance.
    function getComputedSidebarColor() {
        const sidebar = document.querySelector('.window-sidebar');
        if (!sidebar) return null;
        const style = getComputedStyle(sidebar).backgroundColor;
        return style; // e.g. 'rgba(23, 34, 45, 0.8)'
    }

    function rgbaToRgbComponents(rgba) {
        // rgba or rgb
        const m = rgba.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const parts = m[1].split(',').map(p=>p.trim());
        const r = parseFloat(parts[0]);
        const g = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);
        // alpha may be present, but we ignore as background behind it matters less
        return {r,g,b};
    }

    function relativeLuminance({r,g,b}){
        // sRGB -> linear
        const srgb = [r,g,b].map(v => v / 255);
        const lin = srgb.map(c => (c <= 0.03928) ? (c/12.92) : Math.pow((c+0.055)/1.055, 2.4));
        return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    }

    function pickForeground(bgRgb){
        const L = relativeLuminance(bgRgb);
        const whiteContrast = (Math.max(L, 1) + 0.05) / (Math.min(L, 1) + 0.05); // simplified
        // simpler: if bg is dark (L < 0.5) pick white else dark
        return L < 0.5 ? '#ffffff' : '#000000';
    }

    function invertHex(hex){
        // invert #rrggbb
        if(!hex || hex[0] !== '#') return hex;
        const r = 255 - parseInt(hex.substr(1,2),16);
        const g = 255 - parseInt(hex.substr(3,2),16);
        const b = 255 - parseInt(hex.substr(5,2),16);
        return `#${[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}`;
    }

    function setSidebarContrastVar() {
        const bg = getComputedSidebarColor();
        if (!bg) return;
        const comps = rgbaToRgbComponents(bg);
        if (!comps) return;
        const titleFg = pickForeground(comps);
        // item color should be opposite for visual hierarchy
        const itemFg = (titleFg === '#ffffff') ? '#000000' : '#ffffff';
    document.documentElement.style.setProperty('--window-sidebar-title-color', titleFg);
    document.documentElement.style.setProperty('--window-sidebar-item-color', itemFg);
    // Choose an active background that contrasts with the title color.
    // If title is light, pick a darker active bg; otherwise pick a light bg.
    const activeBg = (titleFg === '#ffffff') ? '#2b2b2b' : '#ffffff';
    document.documentElement.style.setProperty('--window-sidebar-active-bg', activeBg);
    // hover bg: light overlay when title is dark, darker overlay when title is light
    const hoverBg = (titleFg === '#ffffff') ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    document.documentElement.style.setProperty('--window-sidebar-hover-bg', hoverBg);
    // drag background: darker when title is light, lighter when title is dark
    const dragBg = (titleFg === '#ffffff') ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.92)';
    const dragHelperBg = (titleFg === '#ffffff') ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,1)';
    document.documentElement.style.setProperty('--window-sidebar-drag-bg', dragBg);
    document.documentElement.style.setProperty('--window-sidebar-drag-helper-bg', dragHelperBg);
        // debug
        if(window.__PUTER_DEBUG_SIDEBAR_CONTRAST)
            console.info('sidebar-contrast:', {bg, titleFg, itemFg});
    }

    // Run on DOMContentLoaded and also observe mutations to update on dynamic theme changes
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setSidebarContrastVar);
    } else {
        setSidebarContrastVar();
    }

    // Observe style changes on documentElement (CSS variable changes or theme changes)
    const observer = new MutationObserver(function(mutations){
        // debounce
        clearTimeout(window.__sidebarContrastTimer);
        window.__sidebarContrastTimer = setTimeout(setSidebarContrastVar, 80);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });

})();
