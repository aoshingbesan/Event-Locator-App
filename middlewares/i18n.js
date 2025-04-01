const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const fs = require('fs');
const path = require('path');

// Initialize i18n
const initI18n = () => {
  // Get supported languages by reading directory
  const localesPath = path.join(__dirname, '../locales');
  const supportedLanguages = fs.readdirSync(localesPath).filter(file => {
    return fs.statSync(path.join(localesPath, file)).isDirectory();
  });
  
  i18next
    .use(i18nextMiddleware.LanguageDetector)
    .init({
      fallbackLng: 'en',
      supportedLngs: supportedLanguages,
      preload: supportedLanguages,
      ns: ['common', 'errors', 'events', 'auth'],
      defaultNS: 'common',
      backend: {
        loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json')
      },
      detection: {
        // Order of language detection
        order: ['header', 'querystring', 'cookie'],
        // Header key to look for
        lookupHeader: 'accept-language',
        // Query parameter to look for
        lookupQuerystring: 'lang',
        // Cookie to look for
        lookupCookie: 'lang',
        // Cache language in cookie
        caches: ['cookie']
      }
    });
  
  return {
    i18next,
    i18nextMiddleware: i18nextMiddleware.handle(i18next)
  };
};

module.exports = initI18n;