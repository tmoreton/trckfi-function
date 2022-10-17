const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const json2csv = require("json2csv").parse;
const nodemailer = require("nodemailer");

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
      pass: "xw08LJw2fODBjAdSc19V",
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
