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
  admin.firestore().collection("users").doc(uid).collection("transactions").get().then(transactions => {
    var recurring = [];
    functions.logger.log("Transactions Data:", transactions);
    transactions.forEach(transaction => {
      let data = transaction.data()
      recurring = recurring.concat({
        'Place': data.place.main_text,
        'Amount': data.amount,
        'Category': data.icon.title,
        'Tags': JSON.stringify(data.chips),
        'Type': data.type,
        'Recurring': data.recurring,
        'Transaction Date': new Date(data.created_dt)
      });
    });
    admin.firestore().collection("users").doc(uid).collection("recurring").get().then(snapshot => {
      functions.logger.log("Recurring Data:", snapshot);
      snapshot.forEach(doc => {
        let recurring_data = doc.data()
        recurring = recurring.concat({
          'Place': recurring_data.place.main_text,
          'Amount': recurring_data.amount,
          'Category': recurring_data.icon.title,
          'Tags': JSON.stringify(recurring_data.chips),
          'Type': recurring_data.type,
          'Recurring': recurring_data.recurring,
          'Transaction Date': recurring_data.created_dt
        });
      });
    })
    return json2csv(recurring);
  }).then((csv) => {
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
  }).catch((error) => {
    console.error(error);
  });
});
