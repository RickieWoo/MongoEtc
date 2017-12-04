/**
 * Created by Ruozi on 8/24/17.
 */

'use strict';

let config = require('config');

let mailgun = require('mailgun-js')({apiKey: config.get('MailgunApiKey'), domain: config.get('MailgunDomain')});
let logger = require('winston').loggers.get('MailLogger');

exports.sendGiftCardEmail = function(email, value, codes) {

    return new Promise((resolve, reject) => {
        if (process.env.NODE_ENV !== 'production') {
            email = "gift_code_test@163.com";
        }
        let data = {
            from: 'Gift Team <support@histitch.com>',
            to: email,
            subject: 'Amazon Gift Card from Gift Team',
            html: _getEmailHtml(value, codes),
            "o:tag": ["amazon gift card", (new Date()).toISOString()],
            "o:tracking": true,
            "o:tracking-clicks": true,
            "o:tracking-opens": true,
            "v:my-var": Date.now()
        };

        mailgun.messages().send(data, (err, body) => {
            if (err) {
                logger.error(`[giftcard] error => ${err.stack}`);
                reject(err);
            } else {
                resolve(body);
            }
        });
    });
};

function _getEmailHtml(price, codes) {
    let leftPart = [
        '<!DOCTYPE html>'
        ,'<html>'
        ,'<head lang="en">'
        ,'<meta charset="UTF-8">'
        ,'<title>email-tpl</title>'
        ,'<style>'
        ,'</style>'
        ,'</head>'
        ,'<body style="margin: 0px;padding: 0px; font-family: Arial;border: 0px;">'
        ,'<nav style="width: 100%;height: 80px; margin-top: 40px;background: #f97964;">'
        ,'<h1 style="font-size: 36px;line-height: 80px;color: #ffffff;padding-left: 20px;font-weight: 700;">Boom Gift</h1>'
        ,'</nav>'
        ,'<article style="padding: 0 20px;margin-top: 40px;">'
        ,'<section>'
        ,'<h1 style="color: #646464;font-size: 24px;font-weight: 700;">Dear User</h1>'
        ,'<h2 style="color: #646464;font-size: 14px;font-weight: 700;padding-top: 15px;">Congratulations!</h2>'
        ,'<p style="margin-top: 15px;color: rgb(130,130,130);font-size: 14px;">You have just received a $'+price+' Amazon Gift Card! Thank you for using our application!</p>'
        ,'</section>'
        ,'<header class="reply-header" style="margin-top: 40px;">'];
    let rightPart = [
        '</header>'
        ,'<section style=" margin: 40px 0;">'
        ,'<div>'
        ,'<p style=" padding-bottom: 15px;font-size: 14px;">We hope by using our app you earn many more Gift Cards!</p><p style=" padding-bottom: 15px;font-size: 14px;">Please SHARE our app with your friends and family and invite them to get unlimited coins. We will highly appreciate if you give us a 5 star on the App Store!</p>'
        ,'<p style=" padding-bottom: 15px;font-size: 14px;">We highly recommend you to join our facebook page (<a href="https://www.facebook.com/freetheapp" style="color: #395a8d;" onmouseover="this.style.color=\"#FF9933\"" onmouseout="this.style.color=\"#395a8d\"">https://www.facebook.com/freetheapp</a>) to earn more gift cards and money, as we constantly have a lot of contests and chances to win money! Do join us! We are sure that you wont be disappointed!</p>'
        ,'<p style=" padding-bottom: 15px;font-size: 14px;">For any further questions or inquiries, please write us an email at: <a href="#" style="color: #395a8d;" onmouseover="this.style.color=\"#FF9933\"" onmouseout="this.style.color=\"#395a8d\"">support@histitch.com</a></p>'
        ,'<a href="http://freetheapp.com" style="display: block;text-align: center; margin-left: auto;margin-right: auto;margin-top: 16px;color: #f97964 !important;font-size: 18px;font-weight: 700;">Try our new app with more offers!!!</a>'
        ,'</div>'
        ,'<div style=" margin-top: 40px; padding: 20px; background: #FAFAFA;line-height: 20px;color: #969696;font-size: 12px;">'
        ,'<p style="padding-bottom: 10px;">To redeem your gift card, follow these steps:'
        ,'<ol style="padding-left: 30px;">'
        ,'<li>Visit <a href="www.amazon.com/gc" style="color: #395a8d;" onmouseover="this.style.color=\"#FF9933\"" onmouseout="this.style.color=\"#395a8d\">www.amazon.com/gc</a></li>'
        ,'<li>Click Apply to Account and enter the Claim Code when prompted.</li>'
        ,'<li>Gift card funds will be applied automatically to eligible orders during the checkout process.</li>'
        ,'<li>You must pay for any remaining balance on your order with another payment method.</li>'
        ,'</ol>'
        ,'</p>'
        ,'<p style="padding-bottom: 10px;">Your gift card claim code may also be entered when prompted during checkout. To redeem your gift card using the Amazon.com 1-Click service, first add the gift card funds to Your Account.</p>'
        ,'<p style="padding-bottom: 10px;">If you have questions about redeeming your gift card, please visit <a href="www.amazon.com/gc-redeem" style="color: #395a8d;" onmouseover="this.style.color=\"#FF9933\"" onmouseout="this.style.color=\"#395a8d\"">www.amazon.com/gc-redeem</a>. If you have questions regarding the MyCompany Introductory offer, please contact MyCompany.</p>'
        ,'<p style="padding-bottom: 10px;padding-top: 30px;">*Amazon.com is not a sponsor of this promotion. Except as required by law, Amazon.com Gift Cards ("GCs") cannot be transferred for value or redeemed for cash. GCs may be used only for purchases of eligible goods on Amazon.com or certain of its affiliated websites. GCs cannot be redeemed for purchases of gift cards. Purchases are deducted from the GC balance. To redeem or view a GC balance, visit "Your Account" on Amazon.com. Amazon is not responsible if a GC is lost, stolen, destroyed or used without permission. For complete terms and conditions, see'
        ,'<a href="www.amazon.com/gc-legal" style="color: #395a8d;" onmouseover="this.style.color=\"#FF9933\"" onmouseout="this.style.color=\"#395a8d\"">www.amazon.com/gc-legal</a>. GCs are issued by ACI Gift Cards, Inc., a Washington corporation. All Amazon ®, ™ & © are IP of Amazon.com, Inc. or its affiliates. No expiration date or service fees.'
        ,'</p>'
        ,'</div>'
        ,'<h3 style="margin-top: 30px;text-align: right;margin-right: 40px;">Gift Team</h3></section><footer style="border-top: 1px solid #DCDCDC;">'
        ,'<a href="%unsubscribe_url%" style=" display: block;text-align: right;padding: 10px 0;color: #969696;font-size: 12px;">|&nbsp;Unsubscibe instantly&nbsp;|</a>'
        ,'</footer></article></body></html>'];
    let codePart;
    if (codes.length > 1) {
        codePart = [
            '<table border="2px" cellspacing="0px" bordercolor="#f97964" cellpadding="10px" style="text-align: center;margin-bottom: 30px;color:#f97964;font-size: 36px;font-weight: 800;letter-spacing: 2px; margin-left: auto;margin-right: auto;">'
            ,'<tr><th>Amount</th><th>Code</th></tr>'
            ,Array.apply(null, new Array(codes.length - 1)).map(function(item, i) {
                return '<tr><td style="text-align: center;margin-bottom: 30px;color:#f97964;font-size: 36px;font-weight: 800;letter-spacing: 2px; margin-left: auto;margin-right: auto;">10 USD</td><td style="text-align: center;margin-bottom: 30px;color:#f97964;font-size: 36px;font-weight: 800;letter-spacing: 2px;">' + codes[i] + '</td></tr>';
            }).join('')
            ,'<tr>'
            ,'<td style="text-align: center;margin-bottom: 30px;color:#f97964;font-size: 36px;font-weight: 800;letter-spacing: 2px; margin-left: auto;margin-right: auto;">' + Math.round(price % 10 * 100) / 100 + ' USD</td>'
            ,'<td style="text-align: center;margin-bottom: 30px;color:#f97964;font-size: 36px;font-weight: 800;letter-spacing: 2px;">' + codes[codes.length - 1] + '</td>'
            ,'</tr>'
            ,'</table>'
        ];
    } else {
        codePart = [
            '<h1 style="text-align: center;margin-bottom: 30px;color:#f97964;font-size: 36px;font-weight: 800;letter-spacing: 2px;">'+codes[0]+'</h1>'
            ,'<a href="https://www.amazon.com/gp/css/gc/payment/view-gc-balance?claimCode='+codes[0]+'" style="display: block;width: 180px;height: 40px;text-decoration: none;text-align: center;color: #ffffff;font-size: 18px;line-height: 40px;font-weight: 700;background: #f97964;border-radius: 6px;margin-left: auto;margin-right: auto;">Redeem Now</a>'
            ,'<div class="reply-link" style=" width: 200px;margin-left: auto;margin-right: auto;text-align: center;">'
            ,'<a href="https://www.amazon.com/gp/css/gc/payment/view-gc-balance?claimCode='+codes[0]+'" style="display: inline-block;text-align: center; margin-top: 8px;padding: 0 10px; color: #969696;font-size: 12px;">Apply to Account</a>'
            ,'<a href="http://www.amazon.com/gc-redeem" style="display: inline-block;text-align: center;margin-top: 8px;padding: 0 10px;color: #969696;font-size: 12px;">How to Use</a>'
            ,'</div>'
        ];
    }
    return leftPart.concat(codePart).concat(rightPart).join('');
}

/* =========================== Main Start ========================== */
if (typeof require !== 'undefined' && require.main === module) {
    this.sendGiftCardEmail('yong_shan@pinssible.com', 33.35, ['haha1', 'haha2', 'haha3', 'haha4'])
        .then(body => {
            console.log(`success => ${JSON.stringify(body, null, 2)}`);
        })
        .catch(err => {
            console.log(`fail => ${err.stack}`);
        })
}
/* =========================== Main End ========================== */

