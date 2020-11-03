import * as configurations from '../../config/environment';
import * as twilio from 'twilio';

const authToken = configurations.twilio.key;
const accountSid = configurations.twilio.id;

class ServerSmsService {

  sendSms(phoneNumber: string, buy: boolean, stock: string, price: number, quantity: number) {
    const client = twilio(accountSid, authToken);
    client.messages.create({
      body: (buy ? 'Buy ' : 'Sell ') + `${quantity} of ${stock} @ ${price}`,
      to: '' + phoneNumber,  // Text this number
      from: '+17479004684' // From a valid Twilio number
    }).then((message) => console.log('sent sms: ', message))
    .catch((error) => console.log('error sending sms: ', error));
  }

  sendBuySms(phoneNumber: string, stock: string, price: number, quantity: number) {
    this.sendSms(phoneNumber, true, stock, price, quantity);
  }

  sendSellSms(phoneNumber: string, stock: string, price: number, quantity: number) {
    this.sendSms(phoneNumber, false, stock, price, quantity);
  }
}

export default new ServerSmsService();
