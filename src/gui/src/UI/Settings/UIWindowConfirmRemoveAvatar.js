import UIWindow from '../UIWindow.js'

async function UIWindowConfirmRemoveAvatar(options){
    return new Promise(async (resolve) => {
        options = options ?? {};

        let h = '';
        h += `<div style="padding: 20px;">`;
            h += `<div class="generic-close-window-button disable-user-select"> &times; </div>`;
            h += `<img src="${window.icons['warning.svg']}" class="account-deletion-confirmation-icon">`;
            h += `<p class="account-deletion-confirmation-prompt">${i18n('account.avatar.removeConfirm') || i18n('confirm_remove_profile_picture') || 'Are you sure you want to remove your profile picture? This will restore your default avatar.'}</p>`;
            h += `<button class="button button-block button-danger proceed-with-remove-avatar" aria-label="${i18n('account.avatar.removeButton') || i18n('remove') || 'Remove'}">${i18n('remove') || i18n('account.avatar.removeButton') || 'Remove'}</button>`;
            h += `<button class="button button-block button-secondary cancel-remove-avatar" aria-label="${i18n('cancel') || 'Cancel'}">${i18n('cancel') || 'Cancel'}</button>`;
        h += `</div>`;

        const el_window = await UIWindow({
            title: i18n('confirm_remove_profile_picture_title') || 'Confirm remove profile picture',
            icon: null,
            uid: null,
            is_dir: false,
            body_content: h,
            has_head: false,
            selectable_body: false,
            draggable_body: false,
            allow_context_menu: false,
            is_draggable: true,
            is_resizable: false,
            is_droppable: false,
            init_center: true,
            allow_native_ctxmenu: true,
            allow_user_select: true,
            backdrop: true,
            onAppend: function(el_window){
            },
            width: 500,
            dominant: true,
            window_css: {
                height: 'initial',
                padding: '0',
                border: 'none',
                boxShadow: '0 0 10px rgba(0,0,0,.2)',
                borderRadius: '5px',
                backgroundColor: 'white',
                color: 'black',
            },
            ...options.window_options,
        });

        $(el_window).find('.generic-close-window-button').on('click', function(){
            $(el_window).close();
        });

        $(el_window).find('.cancel-remove-avatar').on('click', function(){
            $(el_window).close();
        });

        $(el_window).find('.proceed-with-remove-avatar').on('click', function(){
            if(typeof options.onConfirm === 'function'){
                options.onConfirm();
            }
            $(el_window).close();
        });
    })
}

export default UIWindowConfirmRemoveAvatar;
