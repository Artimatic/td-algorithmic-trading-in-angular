import * as configurations from '../../config/environment';
import * as twilio from 'twilio';

const authToken = configurations.twilio.key;
const accountSid = configurations.twilio.id;
const twilioNumber = configurations.twilio.num;

class ServerSmsService {

  sendSms(phoneNumber: string, buy: boolean, stock: string, price: number, quantity: number, message: string = '') {
    const client = twilio(accountSid, authToken);
    client.messages.create({
      body: (buy ? 'Buy ' : 'Sell ') + `${quantity} of ${stock} @ ${price}, ${message}`,
      to: '' + phoneNumber,  // Text this number
      from: twilioNumber // From a valid Twilio number
    }).then((message) => console.log('sent sms: ', message))
    .catch((error) => console.log('error sending sms: ', error));
  }

  sendBuySms(phoneNumber: string, stock: string, price: number, quantity: number, message: string = '') {
    this.sendSms(phoneNumber, true, stock, price, quantity, message);
  }

  sendSellSms(phoneNumber: string, stock: string, price: number, quantity: number, message: string = '') {
    this.sendSms(phoneNumber, false, stock, price, quantity, message);
  }
}

export default new ServerSmsService();
