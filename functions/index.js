const functions = require("firebase-functions");
const admin = require("firebase-admin");
const json2csv = require("json2csv").parse;
const nodemailer = require("nodemailer");
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");
admin.initializeApp();

const configuration = new Configuration({
  basePath: PlaidEnvironments.development,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET
    },
  },
});

const client = new PlaidApi(configuration);
const app = require('express')();

// We'll enable CORS support to allow the function to be invoked from our app client-side.
app.use(require('cors')({origin: true}));

const params = {
  user: {
    // This should correspond to a unique id for the current user.
    client_user_id: 'clientUserId',
  },
  client_id: process.env.PLAID_CLIENT_ID,
  secret: process.env.PLAID_SECRET,
  client_name: 'Trckfi',
  products: ['auth', 'transactions'],
  language: 'en',
  country_codes: ['US']
};

// Add a route handler to the app to generate the secured key
app.post('https://development.plaid.com/link/token/create', params, (req, res) => {
  functions.logger.log("req:", req);
  functions.logger.log("res:", res);
  res.status(200);
});

// Finally, pass our ExpressJS app to Cloud Functions as a function
exports.create_plaid_token = functions.https.onRequest(app);

exports.email_csv = functions.https.onRequest(async function(req, res) {
  const uid = req.query.uid;
  const email = req.query.email;
  functions.logger.log("UID:", uid);
  functions.logger.log("Email:", email);
  
  let transaction_data = await admin.firestore().collection("users").doc(uid).collection("transactions").get().then(snapshot => {
    let arr = [];
    snapshot.forEach(doc => {
      let data = doc.data()
      arr = arr.concat({
        'Place': data.place.main_text,
        'Amount': data.amount,
        'Category': data.icon.title,
        'Tag': data.chips[0],
        'Type': data.type,
        'Recurring': data.recurring,
        'Transaction Date': data.created_dt
      });
    });
    return arr;
  });
  functions.logger.log("Transactions Data:", transaction_data);

  let recurring_data = await admin.firestore().collection("users").doc(uid).collection("recurring").get().then(snapshot => {
    let arr = [];
    snapshot.forEach(doc => {
      let data = doc.data()
      arr = arr.concat({
        'Place': data.place.main_text,
        'Amount': data.amount,
        'Category': data.icon.title,
        'Tag': data.chips[0],
        'Type': data.type,
        'Recurring': data.recurring,
        'Transaction Date': data.created_dt
      });
    });
    return arr;
  });
  functions.logger.log("Recurring Data:", recurring_data);

  let csv = json2csv(transaction_data.concat(recurring_data))
  const mailTransport = nodemailer.createTransport({
    host: "mail.privateemail.com",
    port: 465,
    secure: true,
    auth: {
      user: "tim@trckfi.com",
      pass: process.env.EMAIL_PASSWORD,
    }
  });

  const mailOptions = {
    from: '"Trckfi" <tim@trckfi.com>',
    to: email,
    subject: "Your Trckfi data is ready for download",
    attachments: [{   
      filename: 'trckfi-report.csv',
      content: csv 
    }]
  };
  mailTransport.sendMail(mailOptions);
  res.status(200);
  res.send("Success");
});


exports.send_email = functions.https.onRequest(async function(req, res) {
  const uid = req.query.uid;
  const email = req.query.email;
  const data = req.query.data;
  functions.logger.log("UID:", uid);
  functions.logger.log("Email:", email);

  let csv = json2csv(data)
  const mailTransport = nodemailer.createTransport({
    host: "mail.privateemail.com",
    port: 465,
    secure: true,
    auth: {
      user: "tim@trckfi.com",
      pass: process.env.EMAIL_PASSWORD,
    }
  });

  const mailOptions = {
    from: '"Trckfi" <tim@trckfi.com>',
    to: email,
    subject: "Your Trckfi data is ready for download",
    attachments: [{   
      filename: 'trckfi-report.csv',
      content: csv 
    }]
  };
  mailTransport.sendMail(mailOptions);
  res.status(200);
  res.send("Success");
});