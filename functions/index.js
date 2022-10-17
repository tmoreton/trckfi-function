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
  admin.firestore().collection("users").doc(uid).collection("recurring").get().then(snapshot => {
    var recurring = [];
    snapshot.forEach(doc => {
      recurring = recurring.concat(doc.data());
    });
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
      subject: "Your Trckfi Data Is Ready For Download",
      attachments: [{   
        filename: 'report.csv',
        content: csv 
      }]
    };
    mailTransport.sendMail(mailOptions);
    res.status(200);

    res.setHeader(
      "Content-disposition",
      "attachment; filename=report.csv"
    );
    res.set("Content-Type", "text/csv");
    res.send(csv);
  }).catch((error) => {
    console.error(error);
  });
});
