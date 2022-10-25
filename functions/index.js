const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");
admin.initializeApp();

const json2csv = require("json2csv").parse;
const nodemailer = require("nodemailer");
const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET
    },
  },
});

const client = new PlaidApi(configuration);

exports.create_token = functions.https.onRequest(async function(req, res) {
  functions.logger.log("Starting plaid stuff");
  try{
    const request = {
      user: {
        client_user_id: 'user-id',
      },
      client_name: 'Plaid Test App',
      products: ['transactions'],
      language: 'en',
      webhook: 'https://webhook.example.com',
      redirect_uri: 'https://domainname.com/oauth-page.html',
      country_codes: ['US'],
    };

    const createTokenResponse = await client.post(request);
    // res.json(createTokenResponse.data);
    functions.logger.log("token res:", createTokenResponse);
    res.status(200);
    res.send(createTokenResponse.data);
  } catch (error) {
    functions.logger.log("token error:", error);
    res.send(error);
  }
});

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
