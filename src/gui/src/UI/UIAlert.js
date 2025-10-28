/**
 * Copyright (C) 2024 Puter Technologies Inc.
 *
 * This file is part of Puter.
 *
 * Puter is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import UIWindow from './UIWindow.js'
import normalizeButtons from '../helpers/normalizeButtons.js'

function UIAlert(options){
    // set sensible defaults
    if(arguments.length > 0){
        // if first argument is a string, then assume it is the message
        if(window.isString(arguments[0])){
            options = {};
            options.message = arguments[0];
        }
        // if second argument is an array, then assume it is the buttons
        if(arguments[1] && Array.isArray(arguments[1])){
            options.buttons = arguments[1];
        }
    }

    return new Promise(async (resolve) => {
        // track if we've already resolved to avoid double-resolve
        let _resolved = false;
        const _doResolve = (v) => {
            if(_resolved) return;
            _resolved = true;
            resolve(v);
        }

        // normalize buttons (accept strings or objects); provides default OK
        options.buttons = normalizeButtons(options.buttons);

        // set body icon with precedence: explicit icon / body_icon -> type map -> default warning
        const TYPE_ICON_MAP = {
            success: window.icons['c-check.svg'],
            warning: window.icons['warning-sign.svg'],
            info: window.icons['reminder.svg'] ?? window.icons['warning-sign.svg'],
            error: window.icons['shield.svg'] ?? window.icons['warning-sign.svg'],
            question: window.icons['reminder.svg'] ?? window.icons['warning-sign.svg'],
        };

        options.body_icon = options.icon ?? options.body_icon ?? TYPE_ICON_MAP[options.type] ?? window.icons['warning-sign.svg'];

        let santized_message = html_encode(options.message);

        // replace sanitized <strong> with <strong>
        santized_message = santized_message.replace(/&lt;strong&gt;/g, '<strong>');
        santized_message = santized_message.replace(/&lt;\/strong&gt;/g, '</strong>');

        // replace sanitized <p> with <p>
        santized_message = santized_message.replace(/&lt;p&gt;/g, '<p>');
        santized_message = santized_message.replace(/&lt;\/p&gt;/g, '</p>');

        // prepare type-specific CSS class and body styles
        const typeClass = options.type ? `window-alert--${options.type}` : '';

        const TYPE_BACKGROUND = {
            success: 'rgba(232, 249, 236, 0.95)', // soft green
            info: 'rgba(230, 242, 255, 0.95)', // soft blue
            warning: 'rgba(255, 249, 230, 0.95)', // soft yellow
            error: 'rgba(255, 235, 235, 0.95)', // soft red
            question: 'rgba(245, 240, 255, 0.95)', // soft purple
        };

        const bodyBackground = TYPE_BACKGROUND[options.type] ?? 'rgba(231, 238, 245, .95)';

        // build body container so we can optionally inject custom UI
        let h = '';
        h += `<div class="window-alert-body-inner">`;
    // icon + message container (stacked and centered by default)
    h += `<div class="window-alert-main" style="display:flex; flex-direction:column; gap:12px; align-items:center; text-align:center;">`;
    h += `<img class="window-alert-icon" src="${html_encode(options.body_icon)}" style="margin:6px 0;">`;
    h += `<div class="window-alert-message" style="max-width:100%;">${santized_message}</div>`;
    h += `</div>`;

        // placeholder for custom UI (or default button area)
        h += `<div class="window-alert-custom-body" style="margin-top:16px;"></div>`;

        // buttons - render later into the custom-body if not hidden
        if(!options.hide_buttons && options.buttons && options.buttons.length > 0){
            let btns_html = `<div style="overflow:hidden; margin-top:20px; text-align:right;">`;
            for(let y=0; y<options.buttons.length; y++){
                btns_html += `<button class="button button-block button-${html_encode(options.buttons[y].type)} alert-resp-button" ` +
                                `data-label="${html_encode(options.buttons[y].label)}" ` +
                                `data-value="${html_encode(options.buttons[y].value ?? options.buttons[y].label)}" ` +
                                `${options.buttons[y].type === 'primary' ? 'autofocus' : ''}` +
                                `>${html_encode(options.buttons[y].label)}</button>`;
            }
            btns_html += `</div>`;
            // place buttons_html as data so we can inject it during onAppend where customUI may run
            options._buttons_html = btns_html;
        }

        h += `</div>`;

        // preserve any user callbacks so we can call them from our wrappers
        const _user_onAppend = options.onAppend;
        const _user_on_close = options.on_close;

    const el_window = await UIWindow({
            title: null,
            icon: null,
            uid: null,
            is_dir: false,
            message: options.message,
            body_icon: options.body_icon,
            backdrop: options.backdrop ?? false,
            is_resizable: false,
            is_droppable: false,
            has_head: false,
            stay_on_top: options.stay_on_top ?? false,
            selectable_body: false,
            draggable_body: options.draggable_body ?? true,
            allow_context_menu: false,
            show_in_taskbar: false,
            window_class: `window-alert ${typeClass}`,
            dominant: true,
            body_content: h,
            width: 350,
            parent_uuid: options.parent_uuid,
            ...options.window_options,
            // our onAppend will inject custom UI / buttons and wire escape handling
            onAppend: function(this_window){
                const $w = $(this_window);
                const $custom = $w.find('.window-alert-custom-body');

                // inject customUI if provided
                try{
                    if(options.customUI !== undefined && options.customUI !== null){
                        if(window.isString(options.customUI)){
                            $custom.html(options.customUI);
                        }else if(options.customUI instanceof HTMLElement){
                            $custom.empty().append(options.customUI);
                        }else if(typeof options.customUI === 'function'){
                            // pass the container element for the function to populate
                            options.customUI($custom.get(0));
                        }else{
                            // fallback, stringify
                            $custom.html(String(options.customUI));
                        }
                    }
                }catch(err){
                    console.error('UIAlert: error rendering customUI', err);
                }

                // inject buttons if we prepared them and buttons are not hidden
                if(!options.hide_buttons && options._buttons_html){
                    $custom.append(options._buttons_html);
                }

                // focus primary button if present
                setTimeout(function(){
                    $w.find('.button-primary').focus();
                }, 10);

                // attach keyup handler for Escape -> close & resolve null
                $(document).on('keyup.uialert', function(e){
                    if(e.key === 'Escape'){
                        try{ $(this_window).close(); }catch(_){}
                    }
                });

                // wire button clicks
                $w.find('.alert-resp-button').on('click.uialert', function(ev){
                    ev.preventDefault(); ev.stopPropagation();
                    const v = $(this).attr('data-value');
                    _doResolve(v);
                    // remove key handler before close
                    $(document).off('keyup.uialert');
                    try{ $(this_window).close(); }catch(_){}
                    return false;
                });

                // call user-provided onAppend if present
                if(_user_onAppend && typeof _user_onAppend === 'function'){
                    try{ _user_onAppend(this_window); }catch(err){ console.error(err); }
                }
            },
            // our on_close will resolve to null if the window was closed without selecting a button
            on_close: function(){
                // remove key handler
                $(document).off('keyup.uialert');
                // if not resolved yet, resolve with null
                _doResolve(null);
                // call user-provided on_close if present
                if(_user_on_close && typeof _user_on_close === 'function'){
                    try{ _user_on_close(); }catch(err){ console.error(err); }
                }
            },
            window_css:{
                height: 'initial',
            },
            body_css: {
                width: 'initial',
                padding: '20px',
                'background-color': bodyBackground,
                'backdrop-filter': 'blur(3px)',
            }
        });
        // all wiring (buttons, ESC, customUI) was handled in our onAppend / on_close wrappers
    })
}

def(UIAlert, 'ui.window.UIAlert');

export default UIAlert;
