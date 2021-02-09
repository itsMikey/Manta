// Node Libs
const appConfig = require('electron').remote.require('electron-settings');
import sounds from '../../libs/sounds';
const ipc = require('electron').ipcRenderer;
import i18n from '../../i18n/i18n';

// Actions Verbs
import * as ACTION_TYPES from '../constants/actions.jsx';

// Helper
import { validateTax, validateCurrency } from '../helpers/form';

const SettingsMW = ({ dispatch }) => next => action => {
  switch (action.type) {
    case ACTION_TYPES.SETTINGS_GET_INITIAL: {
      const savedSettings = {
        profile: appConfig.getSync('profile'),
        invoice: appConfig.getSync('invoice'),
        general: appConfig.getSync('general'),
      };
      return next(
        Object.assign({}, action, {
          payload: {
            current: savedSettings,
            saved: savedSettings,
          },
        })
      );
    }

    case ACTION_TYPES.SETTINGS_SAVE: {
      // Validation 
      const requiredFields = action.payload?.invoice?.required_fields || null;
      const {tax: taxIsRequired, currency: currencyIsRequired} = requiredFields || {tax: true, currency: true};

      if (!validateTax(taxIsRequired, action.payload.invoice.tax)) break;
      if (!validateCurrency(currencyIsRequired, action.payload.invoice.currency)) break;
      // Change Preview Profile
      const profile = appConfig.getSync('profile');
      const newProfile = action.payload.profile;
      if (profile !== newProfile) {
        ipc.send('change-preview-window-profile', newProfile);
      }
      // Change UI language
      const { language } = appConfig.getSync('general');
      const newLang = action.payload.general.language;
      if (language !== newLang) {
        // Change the language
        i18n.changeLanguage(newLang);
        // Notify previewWindow to update
        ipc.send('change-preview-window-language', newLang);
      }
      // Save Settings
      appConfig.setSync('profile', action.payload.profile);
      appConfig.setSync('invoice', action.payload.invoice);
      appConfig.setSync('general', action.payload.general);
      // Reload Sounds Cache
      sounds.preload();
      // Continue
      next(action);
      // Create Notification
      dispatch({
        type: ACTION_TYPES.UI_NOTIFICATION_NEW,
        payload: {
          type: 'success',
          message: i18n.t('messages:settings:saved'),
        },
      });
      break;
    }

    default: {
      return next(action);
    }
  }
};

export default SettingsMW;
