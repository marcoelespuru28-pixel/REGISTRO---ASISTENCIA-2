const admin = require('firebase-admin');
const serviceAccount = require('./firebase-config.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://registro-asistenciaqr-default-rtdb.firebaseio.com'
  });
}

const db = admin.database();

module.exports = { admin, db };